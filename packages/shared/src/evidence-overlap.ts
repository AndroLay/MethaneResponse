import { z } from 'zod';
import { SharedCaseWork, SharedWorkContext, AuditScope, ClaimType } from './index';
import { planJournalHash } from './plan-journal';
import { plannerCanonical } from './investigation-planner';

const Digest = z.string().regex(/^0x[a-f0-9]{64}$/);
const Summary = z.object({ context: SharedWorkContext, workId: z.string().min(1).max(128), revision: z.number().int().positive(), claimType: ClaimType,
  scope: AuditScope.optional(), documentHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(40), referenceDigests: z.array(Digest).max(40), assessmentDigest: Digest.optional() }).strict();
const Reason = z.enum(['same_source_overlapping_period','shared_document_bytes','shared_reference_pointer','shared_assessment_bundle']);
export const EvidenceOverlapReport = z.object({ schemaVersion: z.literal(1), policyVersion: z.literal('evidence-overlap/1'), target: Summary,
  input: z.array(Summary).min(1).max(500), candidates: z.array(z.object({ id: Digest, work: Summary, reasons: z.array(Reason).min(1).max(4) }).strict()).max(499),
  duplicateMitigationEstablished: z.literal(false), limitations: z.array(z.string()).max(10), digest: Digest }).strict();
export type EvidenceOverlapReport = z.infer<typeof EvidenceOverlapReport>;
const key = (work: z.infer<typeof Summary>) => plannerCanonical([work.context, work.workId]);
const sameDataset = (a: SharedWorkContext, b: SharedWorkContext) => a.datasetSnapshotId === b.datasetSnapshotId && a.archiveSha256 === b.archiveSha256 && a.synthetic === b.synthetic;
const unique = (values: string[]) => [...new Set(values)].sort();
const intersects = (a: string[], b: string[]) => a.some(value => b.includes(value));
async function summarize(work: SharedCaseWork): Promise<z.infer<typeof Summary>> {
  const responses = (work.requestEvents || []).filter(e => e.type === 'response_received');
  return Summary.parse({ context: work.context, workId: work.workId, revision: work.revision, claimType: work.claimType, ...(work.scope ? { scope: work.scope } : {}),
    documentHashes: unique(responses.map(e => e.sha256)), referenceDigests: unique(await Promise.all(responses.map(e => planJournalHash([e.reference, e.locator])))),
    ...(work.assessmentLink ? { assessmentDigest: work.assessmentLink.bundleHash } : {}) });
}
async function fromSummaries(target: z.infer<typeof Summary>, input: z.infer<typeof Summary>[]): Promise<EvidenceOverlapReport> {
  const keys = input.map(key);
  if (new Set(keys).size !== keys.length || !input.some(row => plannerCanonical(row) === plannerCanonical(target)) || input.some(row => !sameDataset(row.context, target.context))) throw new Error('Overlap input has duplicate, missing or incompatible identities');
  input = [...input].sort((a,b) => key(a)<key(b)?-1:key(a)>key(b)?1:0);
  const candidates: EvidenceOverlapReport['candidates'] = [];
  for (const work of input) {
    if (key(work) === key(target)) continue;
    const reasons: z.infer<typeof Reason>[] = [];
    if (work.context.sourceId === target.context.sourceId && work.claimType === target.claimType && work.scope && target.scope
      && work.scope.startDate <= target.scope.endDate && target.scope.startDate <= work.scope.endDate) reasons.push('same_source_overlapping_period');
    if (intersects(work.documentHashes, target.documentHashes)) reasons.push('shared_document_bytes');
    if (intersects(work.referenceDigests, target.referenceDigests)) reasons.push('shared_reference_pointer');
    if (work.assessmentDigest && work.assessmentDigest === target.assessmentDigest) reasons.push('shared_assessment_bundle');
    if (reasons.length) candidates.push({ id: await planJournalHash({ target, work, reasons }), work, reasons });
  }
  const payload = { schemaVersion: 1 as const, policyVersion: 'evidence-overlap/1' as const, target, input, candidates, duplicateMitigationEstablished: false as const,
    limitations: ['Candidates require human review. Reusing one report for several questions can be legitimate.',
      'Only current work visible to this reviewer in this snapshot is compared. Absence of a candidate does not exclude duplicate claims.',
      'Source identifiers do not establish facility identity across datasets. Scope overlap does not establish the same repair or avoided emissions.',
      'Document hashes and rights are recorded declarations until inspected; this check downloads no documents and changes no verdict.'] };
  return EvidenceOverlapReport.parse({ ...payload, digest: await planJournalHash(payload) });
}
export async function buildEvidenceOverlapReport(rawTarget: SharedCaseWork, rawWorks: SharedCaseWork[]) {
  const target = SharedCaseWork.parse(rawTarget), works = z.array(SharedCaseWork).max(500).parse(rawWorks);
  if (!works.some(row => plannerCanonical(row) === plannerCanonical(target))) throw new Error('Current target revision is missing');
  return fromSummaries(await summarize(target), await Promise.all(works.filter(row => sameDataset(row.context, target.context)).map(summarize)));
}
/** Verifies replay and a separately trusted digest; not a claim that all private work was disclosed. */
export async function verifyEvidenceOverlapReport(raw: unknown, expectedDigest: string) {
  try {
    const report = EvidenceOverlapReport.parse(raw);
    if (!Digest.safeParse(expectedDigest).success || report.digest !== expectedDigest || plannerCanonical(raw) !== plannerCanonical(report)) return false;
    return plannerCanonical(await fromSummaries(report.target, report.input)) === plannerCanonical(report);
  } catch { return false; }
}
