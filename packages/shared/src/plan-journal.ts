import { z } from 'zod';
import { InvestigationPortfolio, PlannerRequest, plannerCanonical, plannerStrategies, verifyInvestigationPortfolio } from './investigation-planner';

export const PlanId = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const Digest = z.string().regex(/^0x[a-f0-9]{64}$/);
export const PlanDecision = z.object({ strategy: z.enum(plannerStrategies), decision: z.enum(['accept', 'defer', 'reject']), rationale: z.string().trim().min(20).max(4000) }).strict();
export type PlanDecision = z.infer<typeof PlanDecision>;
export const PlanReviewDraft = z.object({ decision: z.enum(['accept', 'defer', 'reject']), rationale: z.string().max(4000) });
export const PlanSaveInput = PlanDecision.extend({ request: PlannerRequest, reportDigest: Digest, expectedRevision: z.number().int().min(0).max(99), expectedHead: Digest.nullable() }).strict();
const Revision = PlanDecision.extend({ planId: PlanId, revision: z.number().int().min(1).max(100), reportDigest: Digest,
  reviewerId: z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/), reviewedAt: z.iso.datetime({ offset: true }), previousHash: Digest.nullable(), hash: Digest }).strict();
export const PlanJournal = z.object({ schemaVersion: z.literal(1), planId: PlanId, reports: z.array(InvestigationPortfolio).min(1).max(20), revisions: z.array(Revision).min(1).max(100) }).strict();
export type PlanJournal = z.infer<typeof PlanJournal>;
export async function planJournalHash(value: unknown) {
  return '0x' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plannerCanonical(value)))), b => b.toString(16).padStart(2, '0')).join('');
}
/** Expected head MUST come from a separate trusted channel, not the supplied file. */
export async function verifyPlanJournal(raw: unknown, expectedHead: string): Promise<boolean> {
  const parsed = PlanJournal.safeParse(raw);
  if (!parsed.success || !Digest.safeParse(expectedHead).success) return false;
  const journal = parsed.data;
  if (journal.revisions.at(-1)!.hash !== expectedHead) return false;
  const reports = new Map(journal.reports.map(r => [r.digest, r]));
  if (reports.size !== journal.reports.length) return false;
  const used = new Set<string>();
  for (const report of reports.values()) if (!await verifyInvestigationPortfolio(report)) return false;
  for (const [index, revision] of journal.revisions.entries()) {
    const { hash, ...payload } = revision;
    if (revision.planId !== journal.planId || revision.revision !== index + 1 || !reports.has(revision.reportDigest)
      || revision.previousHash !== (index ? journal.revisions[index - 1].hash : null) || await planJournalHash(payload) !== hash) return false;
    used.add(revision.reportDigest);
  }
  return used.size === reports.size;
}
export async function appendPlanDecision(previous: PlanJournal | null, planId: string, report: InvestigationPortfolio, decision: PlanDecision,
  expectedRevision: number, expectedHead: string | null, reviewerId: string): Promise<PlanJournal> {
  PlanId.parse(planId); const cleaned = PlanDecision.parse(decision);
  const head = previous?.revisions.at(-1);
  if ((head?.revision || 0) !== expectedRevision || (head?.hash || null) !== expectedHead || previous && previous.planId !== planId) throw new Error('conflict');
  if (previous && !await verifyPlanJournal(previous, head!.hash) || !await verifyInvestigationPortfolio(report)) throw new Error('invalid');
  const payload = { ...cleaned, planId, revision: expectedRevision + 1, reportDigest: report.digest, reviewerId, reviewedAt: new Date().toISOString(), previousHash: expectedHead };
  const revision = { ...payload, hash: await planJournalHash(payload) };
  return PlanJournal.parse({ schemaVersion: 1, planId, reports: previous?.reports.some(r => r.digest === report.digest) ? previous.reports : [...previous?.reports || [], report], revisions: [...previous?.revisions || [], revision] });
}
