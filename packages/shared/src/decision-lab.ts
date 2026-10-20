import { z } from 'zod';
import { AuditScope, ClaimType, Evidence, MarsProvenance, CLAIM_SUPPORT_KIND, claimEvidence, evidenceUtcDay, hasEvidencePointer } from './index';

const outcome = z.enum(['supported', 'contradicted', 'insufficient_evidence']);
export const DECISION_POLICY_VERSION = 'reference-coverage-stress-test/1';
export const DecisionPlanInput = z.object({
  sourceId: z.string().min(1).max(128), synthetic: z.boolean(),
  datasetSnapshotId: z.string().min(1).max(160), archiveSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  claimType: ClaimType, scope: AuditScope.optional(), evidence: z.array(Evidence).max(5000),
  provenance: MarsProvenance.optional(), sourceLimitations: z.array(z.string()).max(100).default([]),
}).strict();
export type DecisionPlanInput = z.infer<typeof DecisionPlanInput>;

export const reasonLabels = {
  wrong_reference_type: 'This reference type cannot establish the selected claim.',
  different_claim: 'The reference is explicitly assigned to a different claim.',
  invalid_reference: 'A permitted attributable reference pointer is missing.',
  invalid_date: 'The reference has no valid calendar date.',
  scope_required: 'This claim requires an explicit assessment period.',
  outside_period: 'The reference date is outside the selected period.',
  different_observation: 'The reference does not match the selected observation event.',
  recipient_required: 'The intended notification recipient is not specified.',
  different_recipient: 'The notice does not identify the selected recipient.',
  action_missing: 'The mitigation record does not describe the action.',
  follow_up_reference_missing: 'A permitted follow-up reference is missing.',
  follow_up_date_missing: 'The follow-up has no valid calendar date.',
  follow_up_before_action: 'The follow-up date precedes the action record.',
  follow_up_outside_period: 'The follow-up date is outside the selected period.',
} as const;
const Reason = z.enum(Object.keys(reasonLabels) as [keyof typeof reasonLabels, ...(keyof typeof reasonLabels)[]]);
const payloadSchema = z.object({
  schemaVersion: z.literal(1), policyVersion: z.literal(DECISION_POLICY_VERSION),
  sourceId: z.string(), synthetic: z.boolean(), datasetSnapshotId: z.string(),
  input: DecisionPlanInput,
  result: outcome,
  summary: z.object({ total: z.number().int().nonnegative(), supporting: z.number().int().nonnegative(), contrary: z.number().int().nonnegative(), excluded: z.number().int().nonnegative() }),
  trace: z.array(z.object({ evidenceId: z.string(), kind: Evidence.shape.kind, date: z.string().optional(), disposition: z.enum(['supporting', 'contrary', 'excluded']), reasons: z.array(Reason) })).max(5000),
  sensitivity: z.array(z.object({ removedEvidenceIds: z.array(z.string()), result: outcome })).max(9),
  sensitivityOmitted: z.number().int().nonnegative(),
  nextChecks: z.array(z.object({ title: z.string(), acceptance: z.string() })).max(8),
  limitations: z.array(z.string()),
}).strict();
export const DecisionPlan = payloadSchema.extend({ digest: z.string().regex(/^0x[a-f0-9]{64}$/) }).strict();
export type DecisionPlan = z.infer<typeof DecisionPlan>;

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).filter(key => record[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}
async function digest(value: unknown): Promise<`0x${string}`> {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return `0x${Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
function resultFor(evidence: Evidence[], claim: ClaimType, scope?: AuditScope): z.infer<typeof outcome> {
  const refs = claimEvidence(evidence, claim, scope);
  return refs.supporting.length && refs.contradictions.length ? 'insufficient_evidence'
    : refs.contradictions.length ? 'contradicted' : refs.supporting.length ? 'supported' : 'insufficient_evidence';
}

function exclusionReasons(e: Evidence, claim: ClaimType, scope?: AuditScope): (keyof typeof reasonLabels)[] {
  const reasons: (keyof typeof reasonLabels)[] = [];
  if (e.kind !== CLAIM_SUPPORT_KIND[claim] && e.kind !== 'contradiction') reasons.push('wrong_reference_type');
  if ((e.claimType && e.claimType !== claim) || (e.kind === 'contradiction' && !e.claimType)) reasons.push('different_claim');
  if (!hasEvidencePointer(e.reference, e.synthetic)) reasons.push('invalid_reference');
  const day = evidenceUtcDay(e.date);
  if (!day) reasons.push('invalid_date');
  if (claim !== 'source_detected' && !scope) reasons.push('scope_required');
  if (scope && day && (day < scope.startDate || day > scope.endDate)) reasons.push('outside_period');
  if (scope?.observationId && (e.observationId || (e.kind === 'detection' ? e.id : undefined)) !== scope.observationId) reasons.push('different_observation');
  if (claim === 'operator_notified') {
    if (!scope?.recipient) reasons.push('recipient_required');
    else if (e.recipient?.trim().toLowerCase() !== scope.recipient.trim().toLowerCase()) reasons.push('different_recipient');
  }
  if (e.kind === 'mitigation_confirmation') {
    const followUp = evidenceUtcDay(e.followUpDate);
    if (!e.action?.trim()) reasons.push('action_missing');
    if (!hasEvidencePointer(e.followUpReference, e.synthetic)) reasons.push('follow_up_reference_missing');
    if (!followUp) reasons.push('follow_up_date_missing');
    if (followUp && day && followUp < day) reasons.push('follow_up_before_action');
    if (followUp && scope && followUp > scope.endDate) reasons.push('follow_up_outside_period');
  }
  return reasons;
}

/** Same eligibility policy as the saved rules baseline. Counterfactuals remove metadata, never invent observations. */
export async function buildDecisionPlan(raw: z.input<typeof DecisionPlanInput>): Promise<DecisionPlan> {
  const parsed = DecisionPlanInput.parse(raw);
  const input = { ...parsed, evidence: [...parsed.evidence].sort((a, b) => canonical(a) < canonical(b) ? -1 : canonical(a) > canonical(b) ? 1 : 0) };
  if (!input.synthetic && (!input.archiveSha256 || input.evidence.some(item => item.synthetic)
    || input.provenance?.snapshotId !== input.datasetSnapshotId || input.provenance?.archiveSha256 !== input.archiveSha256)) throw new Error('Real investigations require consistent publisher provenance, a pinned archive and non-synthetic evidence');
  const { supporting, contradictions } = claimEvidence(input.evidence, input.claimType, input.scope);
  const supportingSet = new Set(supporting), contrarySet = new Set(contradictions);
  const trace: DecisionPlan['trace'] = input.evidence.map(e => ({ evidenceId: e.id, kind: e.kind, ...(e.date ? { date: e.date } : {}),
    disposition: supportingSet.has(e) ? 'supporting' : contrarySet.has(e) ? 'contrary' : 'excluded',
    reasons: supportingSet.has(e) || contrarySet.has(e) ? [] : exclusionReasons(e, input.claimType, input.scope),
  }));
  const ids = [...new Set([...supporting, ...contradictions].map(item => item.id))].sort();
  const eligibleIds = new Set(ids);
  const sensitivity = ids.slice(0, 8).map(id => ({ removedEvidenceIds: [id], result: resultFor(input.evidence.filter(e => e.id !== id), input.claimType, input.scope) }));
  if (ids.length > 1) sensitivity.push({ removedEvidenceIds: ids, result: resultFor(input.evidence.filter(e => !eligibleIds.has(e.id)), input.claimType, input.scope) });
  const nextChecks: DecisionPlan['nextChecks'] = [];
  if (input.claimType !== 'source_detected' && !input.scope) nextChecks.push({ title: 'Define the assessment period', acceptance: 'Record explicit start and end calendar days in UTC for this claim.' });
  if (input.claimType === 'source_detected') nextChecks.push({ title: 'Inspect the original observation', acceptance: 'Match source ID, observation ID, timestamp, satellite, reported flux units and uncertainty to the pinned publisher dataset.' });
  if (input.claimType === 'operator_notified') nextChecks.push({ title: 'Obtain the attributable notice', acceptance: 'Identify the intended recipient, delivery date within the selected period, source/event, publisher and inspectable reference. Administrative feedback alone is insufficient.' });
  if (input.claimType === 'mitigation_confirmed') {
    nextChecks.push({ title: 'Obtain the dated action record', acceptance: 'Identify the facility/source, action, responsible party, action date and inspectable attributable reference within the selected period.' });
    nextChecks.push({ title: 'Obtain the follow-up measurement and method', acceptance: 'Provide an attributable follow-up dated on or after the action and within the scope, measurement method, observation opportunities, units and uncertainty. Same-day records require finer timing before inferring an order. Missing detections are not zero emissions.' });
  }
  if (supporting.length && contradictions.length) nextChecks.push({ title: 'Adjudicate conflicting evidence', acceptance: 'An authorized reviewer must inspect both sets of references, establish whether they concern the same action/time, and record a reasoned decision without deleting either record.' });
  nextChecks.push({ title: 'Inspect contents and record the human decision', acceptance: 'Check authenticity, attribution, exact citations and document rights. Save an authorized human assessment separately from this metadata-coverage analysis.' });
  const payload: z.infer<typeof payloadSchema> = { schemaVersion: 1, policyVersion: DECISION_POLICY_VERSION,
    sourceId: input.sourceId, synthetic: input.synthetic, datasetSnapshotId: input.datasetSnapshotId, input,
    result: resultFor(input.evidence, input.claimType, input.scope),
    summary: { total: trace.length, supporting: supporting.length, contrary: contradictions.length, excluded: trace.length - supporting.length - contradictions.length },
    trace, sensitivity, sensitivityOmitted: Math.max(0, ids.length - 8), nextChecks,
    limitations: [
      'Reference eligibility and sensitivity are decision support, not document authentication or physical mitigation verification.',
      'Removing a reference tests decision dependence; it is not a probability, uncertainty estimate, or forecast.',
      'The digest is an unsigned checksum. Independently check the publisher snapshot and a trusted commitment before inferring authenticity.',
      'Same-day action and follow-up dates meet the metadata rule but do not establish the order of physical events.',
    ],
  };
  return { ...payload, digest: await digest(payload) };
}

export async function verifyDecisionPlan(value: unknown): Promise<boolean> {
  const parsed = DecisionPlan.safeParse(value);
  if (!parsed.success) return false;
  const { digest: actual, ...payload } = parsed.data;
  if (actual !== await digest(payload)) return false;
  try { return canonical(await buildDecisionPlan(payload.input)) === canonical(parsed.data); } catch { return false; }
}

/** Authored fixtures kept separate from every MARS record and saved investigation. */
export async function decisionChallenges() {
  const action: Evidence = { id: 'DEMO-action', kind: 'mitigation_confirmation', claimType: 'mitigation_confirmed', title: 'DEMO action and follow-up metadata', reference: 'fixture://decision-lab/action', date: '2026-06-10', synthetic: true, action: 'DEMO valve replacement', followUpDate: '2026-06-12', followUpReference: 'fixture://decision-lab/follow-up' };
  const contrary: Evidence = { id: 'DEMO-contrary', kind: 'contradiction', claimType: 'mitigation_confirmed', title: 'DEMO explicit contrary record', reference: 'fixture://decision-lab/contrary', date: '2026-06-13', synthetic: true };
  const definitions = [
    { id: 'complete', title: 'Complete reference metadata', evidence: [action] },
    { id: 'missing-follow-up', title: 'Follow-up reference missing', evidence: [{ ...action, followUpReference: undefined }] },
    { id: 'outside-period', title: 'Action outside the period', evidence: [{ ...action, date: '2026-05-20' }] },
    { id: 'contrary', title: 'Explicit contrary reference', evidence: [contrary] },
    { id: 'conflict', title: 'Supporting and contrary references', evidence: [action, contrary] },
  ];
  return Promise.all(definitions.map(async item => ({ id: item.id, title: item.title, plan: await buildDecisionPlan({ sourceId: 'DEMO_DECISION_LAB', synthetic: true, datasetSnapshotId: 'DEMO-authored-reference-challenge-v1', claimType: 'mitigation_confirmed', scope: { startDate: '2026-06-01', endDate: '2026-06-30' }, evidence: item.evidence }) })));
}
