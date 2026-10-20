import { buildInvestigationDossier, investigationDigest } from '@methane/shared/investigation-dossier';
import { buildInvestigationDecision } from '@methane/shared/investigation-decision';
export async function decisionFixture() {
  const context = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO' }, scope = { startDate: '2026-01-01', endDate: '2026-01-02' };
  const bundle = { schemaVersion: 2, auditId: 'DEMO-audit', caseId: 'DEMO-case', revision: 1, generatedAt: '2026-01-03T00:00:00.000Z', sourceId: context.sourceId, synthetic: true,
    claimType: 'mitigation_confirmed', result: 'insufficient_evidence', reason: 'DEMO no eligible reference.', citedEvidence: [], externalEvidence: [], limitations: ['DEMO software fixture'], scope };
  const bundleHash = await investigationDigest(bundle);
  const dossier = await buildInvestigationDossier(context, 'DEMO-work', [{ context, scope, workId: 'DEMO-work', revision: 1, ownerId: 'DEMO-reviewer', updatedBy: 'DEMO-reviewer', createdAt: bundle.generatedAt, updatedAt: bundle.generatedAt, status: 'review_recorded', claimType: 'mitigation_confirmed', question: 'DEMO investigation', notes: '', evidenceRequest: '', nextAction: '', assessmentLink: { auditId: bundle.auditId, bundleHash } }], { plans: [], transitions: [], assessments: [{ bundleHash, bundle }] });
  return buildInvestigationDecision(dossier, { expectedDossierDigest: dossier.digest, expectedRevision: 1, expectedDecisionDigest: null, disposition: 'request_more_evidence', rationale: 'DEMO source-specific follow-up is missing; request attributable measurements.', sourceInspected: true }, 'DEMO-reviewer');
}
