import { z } from 'zod';
import { AuditScope, ClaimType, claimEvidence, Evidence, ExternalEvidenceReference, HumanEvidenceReference, HumanAssessmentTrust, ResultLabel, MarsProvenance, SharedCaseWork, SharedWorkContext, SharedWorkId, evidenceUtcDay, validateAssessmentSemantics, type CaseWorkDraft } from './index';
import { evidenceEventsAppendOnly } from './evidence-lifecycle';
import { InvestigationDigest } from './investigation-links';
import { PlanJournal, planJournalHash, verifyPlanJournal } from './plan-journal';
import { plannerCanonical } from './investigation-planner';
import { SnapshotTransition, transitionIntegrityValid } from './snapshot-transition';

export const DOSSIER_POLICY = 'connected-investigation/1';
const Assessment = z.object({ bundleHash: InvestigationDigest, bundle: z.record(z.string(), z.unknown()) }).strict();
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const Publication = z.object({ status: z.enum(['private','public']), authorConsent: z.boolean(), publishedAt: z.iso.datetime().optional() }).passthrough();
const HumanAssessment = z.object({ kind: z.literal('human_evidence_assessment'), reviewerId: z.string().min(3), reviewedAt: z.iso.datetime(), sourceInspected: z.literal(true),
  claimText: z.string().min(1), publication: z.literal('private'), submittedEvidence: z.array(HumanEvidenceReference),
  baseline: z.object({ result: ResultLabel, reason: z.string(), evidenceIds: z.array(z.string()) }).passthrough(),
  nextEvidenceRequest: z.string().optional(), parentBundleHash: InvestigationDigest.optional(), trust: HumanAssessmentTrust.optional(),
}).passthrough();
const Intelligence = z.object({ kind: z.literal('llm_document_assessment'), modelVersion: z.string().min(1), promptVersion: z.string().min(1),
  reviewStatus: z.enum(['unreviewed','approved','rejected','needs_more_evidence']), generatedFromUserExcerpts: z.literal(true),
  review: z.object({ reviewerId: z.string().min(3), reviewedAt: z.iso.datetime(), note: z.string(), parentBundleHash: InvestigationDigest, sourceInspected: z.boolean().optional() }).passthrough().optional(),
  citationPublication: Publication.optional(), claimPublication: Publication.optional(), claimText: z.string().optional(), claimTextSha256: Sha256.optional(), assessmentInputSha256: Sha256.optional(),
  documentDigests: z.array(z.object({ id: z.string().min(1), title: z.string(), sha256: Sha256, sourceUrl: z.string().optional(), originalFileSha256: Sha256.optional(),
    rightsDeclared: z.enum(['owned','explicit_permission','open_license']).optional(), licenseName: z.string().optional(), licenseUrl: z.string().optional(), attribution: z.string().optional(), licenseScopeConfirmed: z.literal(true).optional(),
    selectedPages: z.array(z.object({ page: z.number().int().positive(), textSha256: Sha256 })).optional(),
  }).passthrough()), quotations: z.array(z.object({ documentId: z.string(), quote: z.string().min(1), quoteSha256: Sha256 }).passthrough()), limitations: z.array(z.string()),
  investigationSnapshotSha256: Sha256.optional(), investigationPriority: z.number().finite().optional(), investigationModelVersion: z.string().optional(), datasetSnapshotId: z.string().optional(), datasetInputSha256: Sha256.optional(),
  observationTimeline: z.array(z.object({ id: z.string(), observedAt: z.string() })).optional(), observationIds: z.array(z.string()).optional(),
}).passthrough();
// Validate without replacing committed bytes: legacy optional semantics and unknown extension fields retain their original hashes.
const BundleContext = z.object({ schemaVersion: z.union([z.literal(2), z.literal(3), z.literal(4)]), auditId: z.string().min(1).max(128), caseId: z.string().min(1), revision: z.number().int().positive(), generatedAt: z.iso.datetime(),
  sourceId: z.string().min(1), synthetic: z.boolean(), claimType: ClaimType, result: ResultLabel, reason: z.string(), citedEvidence: z.array(Evidence), externalEvidence: z.array(ExternalEvidenceReference), limitations: z.array(z.string()),
  scope: AuditScope.optional(), provenance: MarsProvenance.optional(), humanAssessment: HumanAssessment.optional(), intelligence: Intelligence.optional(),
}).passthrough().refine(b => b.schemaVersion === 2 ? !b.humanAssessment && !b.intelligence : b.schemaVersion === 3 ? Boolean(b.intelligence) && !b.humanAssessment : Boolean(b.humanAssessment) && !b.intelligence);
async function assessmentShapeValid(raw: Record<string,unknown>) {
  const parsed = BundleContext.safeParse(raw); if (!parsed.success || validateAssessmentSemantics(raw)) return false;
  const b = parsed.data;
  if (new Set(b.citedEvidence.map(e => e.id)).size !== b.citedEvidence.length || b.citedEvidence.some(e => e.synthetic !== b.synthetic)) return false;
  if (!b.intelligence) {
    const evidence = b.humanAssessment ? b.humanAssessment.submittedEvidence.map(e => ({ ...e, claimType: b.claimType, synthetic: b.synthetic })) : b.citedEvidence;
    const { supporting, contradictions } = claimEvidence(evidence, b.claimType, b.scope);
    const ids = [...new Set([...supporting, ...contradictions].map(e => e.id))].sort();
    const baseline = supporting.length && !contradictions.length ? 'supported' : contradictions.length && !supporting.length ? 'contradicted' : 'insufficient_evidence';
    if (plannerCanonical(ids) !== plannerCanonical(b.citedEvidence.map(e => e.id).sort())) return false;
    if (!b.humanAssessment && b.result !== baseline || b.humanAssessment && b.humanAssessment.baseline.result !== baseline) return false;
    if (b.result === 'supported' && !supporting.length || b.result === 'contradicted' && !contradictions.length) return false;
  }
  if (b.humanAssessment) {
    const human = b.humanAssessment, submitted = new Map(human.submittedEvidence.map(e => [e.id, e]));
    if (!b.scope || submitted.size !== human.submittedEvidence.length || human.submittedEvidence.some(e => e.sourceId !== b.sourceId)) return false;
    if (plannerCanonical([...human.baseline.evidenceIds].sort()) !== plannerCanonical(b.citedEvidence.map(e => e.id).sort())) return false;
    for (const citation of b.citedEvidence) {
      const reference = submitted.get(citation.id);
      if (!reference || plannerCanonical(Evidence.parse({ ...reference, claimType: b.claimType, synthetic: b.synthetic })) !== plannerCanonical(citation)) return false;
    }
  }
  if (b.intelligence) {
    const model = b.intelligence, ids = new Set(model.documentDigests.map(d => d.id));
    if (ids.size !== model.documentDigests.length || (model.reviewStatus === 'unreviewed') === Boolean(model.review)) return false;
    if (model.reviewStatus === 'approved' && (model.review?.sourceInspected !== true || !model.quotations.length)) return false;
    if (['rejected','needs_more_evidence'].includes(model.reviewStatus) && b.result !== 'insufficient_evidence') return false;
    if (b.result !== 'insufficient_evidence' && !model.quotations.length || b.citedEvidence.length !== model.quotations.length) return false;
    for (const [index, q] of model.quotations.entries()) {
      if (!ids.has(q.documentId)) return false;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(q.quote));
      if (Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('') !== q.quoteSha256) return false;
      const citation = b.citedEvidence[index];
      if (citation.kind !== 'document_excerpt' || citation.id !== `${q.documentId}:${index}:${q.quoteSha256.slice(0,12)}`) return false;
    }
  }
  return true;
}
export const InvestigationMaterials = z.object({ plans: z.array(PlanJournal).max(20), transitions: z.array(SnapshotTransition).max(2), assessments: z.array(Assessment).max(100) }).strict();
export type InvestigationMaterials = z.infer<typeof InvestigationMaterials>;
export const InvestigationDossier = InvestigationMaterials.extend({ schemaVersion: z.literal(1), policyVersion: z.literal(DOSSIER_POLICY),
  context: SharedWorkContext, workId: SharedWorkId, history: z.array(SharedCaseWork).min(1).max(100),
  physicalOutcomeEstablished: z.literal(false), chainAnchored: z.literal(false),
  limitations: z.array(z.string().max(2000)).max(20), digest: InvestigationDigest,
}).strict();
export type InvestigationDossier = z.infer<typeof InvestigationDossier>;
export const investigationDigest = planJournalHash;
export { InvestigationChangeCheckData, type InvestigationChangeCheck } from './investigation-change';

/** Check exact relationships; matching a source name or a caller-supplied self-checksum is insufficient. */
export async function investigationMaterialsValid(context: SharedWorkContext, drafts: CaseWorkDraft[], raw: InvestigationMaterials): Promise<boolean> {
  try {
    const materials = InvestigationMaterials.parse({ plans: raw.plans, transitions: raw.transitions, assessments: raw.assessments });
    const plans = new Map(materials.plans.map(p => [p.planId, p]));
    const transitions = new Map(materials.transitions.map(t => [t.digest, t]));
    const assessments = new Map(materials.assessments.map(a => [a.bundleHash, a]));
    if (plans.size !== materials.plans.length || transitions.size !== materials.transitions.length || assessments.size !== materials.assessments.length) return false;
    for (const plan of plans.values()) if (!await verifyPlanJournal(plan, plan.revisions.at(-1)!.hash)) return false;
    for (const transition of transitions.values()) if (!await transitionIntegrityValid(transition)) return false;
    for (const assessment of assessments.values()) if (!await assessmentShapeValid(assessment.bundle) || await investigationDigest(assessment.bundle) !== assessment.bundleHash) return false;
    const usedPlans = new Set<string>(), usedChanges = new Set<string>(), usedAssessments = new Set<string>();
    for (const draft of drafts) {
      const link = draft.planLink;
      if (link) {
        const journal = plans.get(link.planId), revision = journal?.revisions[link.revision - 1];
        const report = journal?.reports.find(r => r.digest === link.reportDigest), dataset = report?.input.dataset;
        if (!revision || revision.hash !== link.revisionHash || revision.reportDigest !== link.reportDigest || revision.strategy !== link.strategy || revision.decision !== 'accept'
          || !dataset || dataset.synthetic !== context.synthetic || dataset.datasetSnapshotId !== context.datasetSnapshotId || dataset.archiveSha256 !== context.archiveSha256
          || !report!.portfolios.find(p => p.strategy === link.strategy)?.selectedIds.includes(context.sourceId)) return false;
        usedPlans.add(link.planId);
      }
      if (draft.changeReportDigest) {
        const transition = transitions.get(draft.changeReportDigest), after = transition?.after;
        if (context.synthetic || !after || after.datasetSnapshotId !== context.datasetSnapshotId || after.provenance.archiveSha256 !== context.archiveSha256) return false;
        if (link) {
          const report = plans.get(link.planId)!.reports.find(r => r.digest === link.reportDigest)!;
          if (report.input.dataset.inputFileSha256 !== after.inputFileSha256) return false;
        }
        usedChanges.add(draft.changeReportDigest);
      }
      if (draft.assessmentLink) {
        const assessment = assessments.get(draft.assessmentLink.bundleHash), bundle = assessment && BundleContext.parse(assessment.bundle);
        if (!bundle || bundle.auditId !== draft.assessmentLink.auditId || bundle.sourceId !== context.sourceId || bundle.synthetic !== context.synthetic || bundle.claimType !== draft.claimType
          || plannerCanonical(bundle.scope || null) !== plannerCanonical(draft.scope || null)
          || (!context.synthetic && (bundle.provenance?.snapshotId !== context.datasetSnapshotId || bundle.provenance?.archiveSha256 !== context.archiveSha256))) return false;
        usedAssessments.add(draft.assessmentLink.bundleHash);
      }
    }
    return usedPlans.size === plans.size && usedChanges.size === transitions.size && usedAssessments.size === assessments.size;
  } catch { return false; }
}

export function investigationReviewSignal(work: Pick<CaseWorkDraft, 'scope'> & { context: SharedWorkContext }, transition: SnapshotTransition) {
  const sourceId = work.context.sourceId;
  const metadataFields = transition.sourceChanges.find(row => row.id === sourceId)?.changedFields || [];
  // Check both sides: a correction can move a record into OR out of the claim's scope.
  const observationIds = transition.observationChanges.filter(change => [change.before, change.after].some(row => {
    if (row?.sourceId !== sourceId) return false;
    const day = evidenceUtcDay(String(row.date || ''));
    return !work.scope || Boolean(day && day >= work.scope.startDate && day <= work.scope.endDate && (!work.scope.observationId || change.id === work.scope.observationId));
  })).map(row => row.id);
  return { state: metadataFields.length || observationIds.length ? 'review_recommended' as const : 'no_compared_changes' as const,
    metadataFields, observationIds, physicalOutcomeEstablished: false as const };
}

export async function buildInvestigationDossier(context: SharedWorkContext, workId: string, history: SharedCaseWork[], materials: InvestigationMaterials): Promise<InvestigationDossier> {
  const payload = { schemaVersion: 1 as const, policyVersion: DOSSIER_POLICY, context, workId, history, ...materials,
    physicalOutcomeEstablished: false as const, chainAnchored: false as const,
    limitations: ['Private team export: contains notes, reviewer identities and linked assessment content. Share only with authorization.',
      'Plan links record historical allocation approval, not current assignment authority or a verified repair.',
      'Snapshot changes recommend record review. Missing records are not zero emissions; metadata changes are not physical outcomes.',
      'Verification checks commitments and relationships. Replaying snapshot differences against both original normalized inputs requires verify:snapshot-transition.',
      'The expected digest must come from a separately trusted channel. This unsigned dossier is not a blockchain receipt or independent identity certification.'],
  };
  const result = InvestigationDossier.parse({ ...payload, digest: await investigationDigest(payload) });
  if (!await verifyInvestigationDossier(result, result.digest)) throw new Error('Invalid investigation relationships');
  return result;
}

/** The caller supplies the trusted commitment separately, never only from the submitted export. */
export async function verifyInvestigationDossier(raw: unknown, expectedDigest: string): Promise<boolean> {
  try {
    const dossier = InvestigationDossier.parse(raw);
    // Schema validation must not normalize an edited string back to the committed value.
    if (plannerCanonical(raw) !== plannerCanonical(dossier)) return false;
    if (!InvestigationDigest.safeParse(expectedDigest).success || dossier.digest !== expectedDigest) return false;
    const { digest, ...payload } = dossier;
    if (await investigationDigest(payload) !== digest) return false;
    const first = dossier.history[0];
    for (const [index, work] of dossier.history.entries()) {
      if (!evidenceEventsAppendOnly(dossier.history[index - 1]?.requestEvents, work.requestEvents)) return false;
      if (work.revision !== index + 1 || work.workId !== dossier.workId || plannerCanonical(work.context) !== plannerCanonical(dossier.context)
        || work.ownerId !== first.ownerId || work.createdAt !== first.createdAt || work.claimType !== first.claimType || plannerCanonical(work.scope || null) !== plannerCanonical(first.scope || null)) return false;
    }
    return await investigationMaterialsValid(dossier.context, dossier.history, dossier);
  } catch { return false; }
}
