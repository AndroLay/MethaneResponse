import { z } from 'zod';
import { InvestigationDossier, investigationDigest, verifyInvestigationDossier } from './investigation-dossier';
import { InvestigationDigest } from './investigation-links';
import { plannerCanonical } from './investigation-planner';
export const InvestigationDecisionInput = z.object({ expectedDossierDigest: InvestigationDigest, expectedRevision: z.number().int().min(1).max(100), expectedDecisionDigest: InvestigationDigest.nullable(), disposition: z.enum(['accept_assessment','request_more_evidence','reject_assessment']), rationale: z.string().trim().min(20).max(2000), sourceInspected: z.literal(true) }).strict();
export const InvestigationDecision = z.object({ schemaVersion: z.literal(1), policyVersion: z.literal('investigation-decision/1'), revision: z.number().int().min(1).max(100), previousDigest: InvestigationDigest.nullable(),
  reviewerId: z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/), reviewedAt: z.iso.datetime(), disposition: InvestigationDecisionInput.shape.disposition, rationale: InvestigationDecisionInput.shape.rationale,
  sourceInspected: z.literal(true), dossier: InvestigationDossier, physicalOutcomeEstablished: z.literal(false), digest: InvestigationDigest,
}).strict();
export type InvestigationDecision = z.infer<typeof InvestigationDecision>;
export async function verifyInvestigationDecision(raw: unknown, expectedDigest: string) {
  try {
    const decision = InvestigationDecision.parse(raw), { digest, ...payload } = decision;
    if (plannerCanonical(raw) !== plannerCanonical(decision) || digest !== expectedDigest || await investigationDigest(payload) !== digest
      || (decision.revision === 1) !== (decision.previousDigest === null) || !await verifyInvestigationDossier(decision.dossier, decision.dossier.digest)) return false;
    const work = decision.dossier.history.at(-1)!;
    if (!work.scope || !work.assessmentLink) return false;
    const bundle = decision.dossier.assessments.find(a => a.bundleHash === work.assessmentLink!.bundleHash)?.bundle;
    if (!bundle || (bundle.intelligence as { reviewStatus?: string } | undefined)?.reviewStatus === 'unreviewed') return false;
    return true;
  } catch { return false; }
}
export async function buildInvestigationDecision(dossier: InvestigationDossier, input: z.infer<typeof InvestigationDecisionInput>, reviewerId: string, previous?: InvestigationDecision) {
  if (input.expectedDossierDigest !== dossier.digest || input.expectedRevision !== dossier.history.at(-1)!.revision || input.expectedDecisionDigest !== (previous?.digest || null)) throw new Error('Decision changed; inspect the current revision.');
  const payload = { schemaVersion: 1 as const, policyVersion: 'investigation-decision/1' as const, revision: (previous?.revision || 0) + 1, previousDigest: previous?.digest || null,
    reviewerId, reviewedAt: new Date().toISOString(), disposition: input.disposition, rationale: input.rationale, sourceInspected: true as const, dossier, physicalOutcomeEstablished: false as const };
  const value = InvestigationDecision.parse({ ...payload, digest: await investigationDigest(payload) });
  if (!await verifyInvestigationDecision(value, value.digest)) throw new Error('A saved scoped assessment with completed human review is required.');
  return value;
}
