import type { AuditScope, ClaimType } from '@methane/shared';
import { DecisionPlan, verifyDecisionPlan } from '@methane/shared/decision-lab';
import { canonicalJson } from './report-export';

export type DecisionContext = { sourceId: string; claimType: ClaimType; scope?: AuditScope; synthetic: boolean; datasetSnapshotId?: string; archiveSha256?: string; inputFileSha256?: string };

export async function acceptDecisionPlan(value: unknown, context: DecisionContext): Promise<DecisionPlan> {
  const parsed = DecisionPlan.safeParse(value);
  if (!parsed.success) throw new Error('The server returned an invalid decision analysis. Retry after reloading the dataset.');
  const plan = parsed.data;
  if (plan.sourceId !== context.sourceId || plan.input.sourceId !== context.sourceId
    || plan.synthetic !== context.synthetic || plan.input.synthetic !== context.synthetic
    || plan.input.claimType !== context.claimType || canonicalJson(plan.input.scope ?? null) !== canonicalJson(context.scope ?? null)
    || (context.datasetSnapshotId && (plan.datasetSnapshotId !== context.datasetSnapshotId || plan.input.datasetSnapshotId !== context.datasetSnapshotId))
    || (context.archiveSha256 && plan.input.archiveSha256 !== context.archiveSha256)) throw new Error('The analysis belongs to a different source, scope or dataset. Reload and run it again.');
  if (!await verifyDecisionPlan(plan)) throw new Error('The analysis checksum or decision replay does not match. Run it again.');
  return plan;
}

export const decisionOutcomeLabels = {
  supported: 'Required references present', contradicted: 'Contrary reference present', insufficient_evidence: 'Insufficient reference coverage',
} as const;

export function evidenceRequestMarkdown(plan: DecisionPlan): string {
  const scope = plan.input.scope;
  return [
    '# Evidence request — investigation draft', '',
    ...(plan.synthetic ? ['**SYNTHETIC DEMO — no real operator or repair is represented.**', ''] : []),
    `Source: ${plan.sourceId}`, `Claim category: ${plan.input.claimType}`,
    `Period UTC: ${scope ? `${scope.startDate} to ${scope.endDate}` : 'Not specified; define it before event-specific assessment.'}`,
    ...(scope?.observationId ? [`Observation: ${scope.observationId}`] : []),
    ...(scope?.recipient ? [`Intended recipient: ${scope.recipient}`] : []),
    `Dataset snapshot: ${plan.datasetSnapshotId}`, `Archive SHA-256: ${plan.input.archiveSha256 || 'DEMO; not a MARS archive'}`,
    `Decision plan digest: ${plan.digest}`, `Policy: ${plan.policyVersion}`, '',
    ...(plan.input.provenance ? [
      '## Dataset attribution', '', plan.input.provenance.attribution,
      `License: ${plan.input.provenance.license}`, `Publisher catalogue: ${plan.input.provenance.catalogUrl}`,
      `Retrieved: ${plan.input.provenance.retrievedAt}`, '',
    ] : []),
    `Reference coverage: ${decisionOutcomeLabels[plan.result]}`, '',
    ...plan.nextChecks.flatMap((item, index) => [`## ${index + 1}. ${item.title}`, '', item.acceptance, '']),
    'Draft only; not sent. Review the recipient, source and permission before sharing.', '',
    ...plan.input.sourceLimitations.map(item => `Dataset limitation: ${item}`), '',
    'No physical repair, avoided emissions, forecast or funding approval is certified. An unsigned checksum does not authenticate an issuer.', '',
  ].join('\n');
}

export function downloadDecisionFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
