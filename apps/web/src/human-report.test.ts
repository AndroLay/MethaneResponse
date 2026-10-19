import { expect, test } from 'bun:test';
import { DEMO_SOURCES, HumanAssessmentInput, isAuditPublic } from '@methane/shared';
import { createHumanAssessment } from '../../api/src/human-assessment';
import { buildReportExportPayload } from './report-export';
import { verifyImportedAuditReport } from './imported-audit-verifier';
import { buildInvestigationBrief } from './investigation-brief';
import { compareAuditRevisions } from './audit-comparison';
import { auditReviewLabel } from './audit-history';
import { createAudit } from '../../api/src/audit';

function fixture() {
  const input = HumanAssessmentInput.parse({ sourceId: 'DEMO-001', claimType: 'source_detected', datasetSnapshotId: 'DEMO',
    scope: { startDate: '2026-09-01', endDate: '2026-09-30' }, claimText: 'CONFIDENTIAL claim wording for this source and period.',
    result: 'insufficient_evidence', rationale: 'CONFIDENTIAL reviewer rationale explaining the missing evidence.', sourceInspected: true,
    evidence: [{ id: 'private-ref', sourceId: 'DEMO-001', kind: 'detection', reference: 'https://example.org/private-evidence', locator: 'CONFIDENTIAL locator', title: 'CONFIDENTIAL document', date: '2026-09-01' }],
    nextEvidenceRequest: 'CONFIDENTIAL evidence request',
  });
  const resolved = { source: DEMO_SOURCES[0], caseId: 'DEMO-001:scope:test', metadata: {} };
  return { input, resolved, audit: createHumanAssessment(input, resolved, 'reviewer-alice', 1) };
}

test('schema 4 human assessment remains digest-verifiable and explicitly human/private', async () => {
  const { audit } = fixture();
  expect((await verifyImportedAuditReport(audit)).localDigest).toBe('valid');
  expect(isAuditPublic(audit)).toBe(false);
  expect(auditReviewLabel(audit)).toBe('Human determination · private');
  const changed = structuredClone(audit);
  changed.bundle.scope!.endDate = '2026-10-01';
  expect((await verifyImportedAuditReport(changed)).localDigest).toBe('invalid');
});

test('readable brief identifies the human method without leaking private reference metadata or scope recipient', () => {
  const { audit } = fixture();
  audit.bundle.scope!.recipient = 'CONFIDENTIAL recipient';
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit, claim: audit.claimType, source: DEMO_SOURCES[0], snapshot: null, realMode: false, generatedAt: '2026-10-17T00:00:00.000Z' }));
  expect(brief).toContain('PRIVATE REVIEW DRAFT');
  expect(brief).toContain('Human evidence assessment');
  expect(brief).not.toContain('CONFIDENTIAL');
  expect(brief).not.toContain('private-evidence');
});

test('comparison shows human decisions, scope, reference metadata and parent linkage', () => {
  const { input, resolved, audit } = fixture();
  const after = createHumanAssessment({ ...input, scope: { ...input.scope, endDate: '2026-10-01' }, evidence: [{ ...input.evidence[0], locator: 'Page 3' }] }, resolved, 'reviewer-bob', 2, audit);
  const comparison = compareAuditRevisions(audit, after);
  expect(comparison.recordedParent).toBe(true);
  expect(comparison.differences.some(item => item.field === 'Event / period scope')).toBe(true);
  expect(comparison.differences.some(item => item.field === 'Reviewer identity')).toBe(true);
  expect(comparison.changed).toHaveLength(1);
});

test('a scoped baseline with a private named recipient is not exposed in a shareable brief', () => {
  const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'operator_notified', scope: { startDate: '2026-09-01', endDate: '2026-09-30', recipient: 'CONFIDENTIAL recipient' } });
  expect(isAuditPublic(audit)).toBe(false);
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit, claim: audit.claimType, source: DEMO_SOURCES[0], snapshot: null, realMode: false, generatedAt: '2026-10-17T00:00:00.000Z' }));
  expect(brief).not.toContain('CONFIDENTIAL');
});
