import { expect, test } from 'bun:test';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from '../../api/src/audit';
import { getClaimCoverage, getInvestigationPlan } from './investigation-plan';
import type { MarsSource } from './mars';

const noticeScope = { startDate: '2026-09-01', endDate: '2026-09-30', recipient: 'DEMO facility operator' };

test('observation context uses the same UTC day as the evidence evaluator', () => {
  const source = fixture(); source.evidence = [];
  source.observations = [{ id: 'offset-event', date: '2026-09-30T23:30:00-12:00', fluxKgHr: null, notified: false }];
  expect(getClaimCoverage(source, { startDate: '2026-09-30', endDate: '2026-09-30' })[0].status).toBe('missing');
  expect(getClaimCoverage(source, { startDate: '2026-10-01', endDate: '2026-10-01' })[0].status).toBe('observation_context');
});

function fixture(): MarsSource { return { ...structuredClone(DEMO_SOURCES[0]!), observations: [] }; }

test('metadata flags and linked reports never satisfy notification or mitigation requirements', () => {
  const source = fixture();
  source.evidence = [{ id: 'notified', kind: 'metadata_notification', title: 'Notified Yes', reference: 'https://example.org', synthetic: true }];
  source.notified = 'Yes'; source.feedback = 'Yes';
  source.observations = [{ id: 'p1', date: '2026-01-01', fluxKgHr: null, notified: true }];
  source.externalEvidence = [{ title: 'Report', url: 'https://example.org/report', license: 'Link only', contentIncluded: false }];
  const coverage = getClaimCoverage(source);
  expect(coverage.find(item => item.claimType === 'operator_notified')).toMatchObject({ supportingCount: 0, status: 'missing' });
  expect(coverage.find(item => item.claimType === 'mitigation_confirmed')).toMatchObject({ supportingCount: 0, status: 'missing' });
  expect(coverage.find(item => item.claimType === 'source_detected')).toMatchObject({ supportingCount: 0, status: 'observation_context' });
  expect(getInvestigationPlan(source, 'mitigation_confirmed').detail).toContain('does not mean that no action occurred');
});

test('coverage keeps contrary records scoped to their exact claim and deduplicates IDs', () => {
  const source = fixture();
  source.evidence = [
    { id: 'n1', kind: 'notification', title: 'Notice', reference: 'https://example.org', synthetic: true, date: '2026-09-10', recipient: noticeScope.recipient },
    { id: 'n1', kind: 'notification', title: 'Notice', reference: 'https://example.org', synthetic: true, date: '2026-09-10', recipient: noticeScope.recipient },
    { id: 'c1', kind: 'contradiction', claimType: 'operator_notified', title: 'Contrary notice', reference: 'https://example.org', synthetic: true, date: '2026-09-10', recipient: noticeScope.recipient },
  ];
  expect(getClaimCoverage(source, noticeScope).find(item => item.claimType === 'operator_notified')).toMatchObject({ supportingCount: 1, contraryCount: 1, status: 'conflicting_records' });
  expect(getClaimCoverage(source).find(item => item.claimType === 'mitigation_confirmed')?.contraryCount).toBe(0);
});

test('an available required-type reference leads to inspection and saving the baseline', () => {
  const source = fixture();
  source.evidence = [{ id: 'n1', kind: 'notification', title: 'Notice', reference: 'https://example.org', synthetic: true, date: '2026-09-10', recipient: noticeScope.recipient }];
  const plan = getInvestigationPlan(source, 'operator_notified', undefined, noticeScope);
  expect(plan.title).toBe('Inspect the required-type references');
  expect(plan.steps.some(step => step.title === 'Run the rules baseline')).toBe(true);
});

test('an unreviewed document assessment leads to human review without closing the evidence gap', () => {
  const source = fixture();
  source.evidence = [];
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'mitigation_confirmed' });
  audit.bundle.schemaVersion = 3;
  audit.bundle.intelligence = { kind: 'llm_document_assessment', modelVersion: 'DEMO', promptVersion: 'DEMO', reviewStatus: 'unreviewed', generatedFromUserExcerpts: true, documentDigests: [], quotations: [], limitations: [] };
  expect(getInvestigationPlan(source, 'mitigation_confirmed', audit).title).toBe('Human review is still required');
  expect(getInvestigationPlan(source, 'operator_notified', audit).title).toBe('Find attributable notification evidence');
  expect(getInvestigationPlan({ ...source, sourceId: 'OTHER' }, 'mitigation_confirmed', audit).title).toBe('Find attributable mitigation confirmation');
});

test('supported baseline guidance does not authenticate references or certify a repair', () => {
  const source = fixture();
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
  const plan = getInvestigationPlan(source, 'source_detected', audit);
  expect(plan.detail).toContain('does not authenticate');
  expect(plan.detail).toContain('certify a repair');
});

test('terminal document reviews require new evidence and a new assessment', () => {
  const source = fixture();
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'mitigation_confirmed' });
  audit.bundle.schemaVersion = 3;
  for (const reviewStatus of ['rejected', 'needs_more_evidence'] as const) {
    audit.bundle.intelligence = { kind: 'llm_document_assessment', modelVersion: 'DEMO', promptVersion: 'DEMO', reviewStatus, generatedFromUserExcerpts: true, documentDigests: [], quotations: [], limitations: [] };
    const plan = getInvestigationPlan(source, 'mitigation_confirmed', audit);
    expect(plan.steps.some(step => step.title === 'Complete the human review')).toBe(false);
    expect(plan.steps.some(step => step.title === 'Add evidence and create a new assessment')).toBe(true);
  }
});

test('inventory and plan calculations do not mutate source evidence', () => {
  const source = fixture(); const before = JSON.stringify(source);
  getClaimCoverage(source); getInvestigationPlan(source, 'mitigation_confirmed');
  expect(JSON.stringify(source)).toBe(before);
});

test('scope coverage excludes other dates, events, recipients and incomplete follow-up', () => {
  const source = fixture();
  const scope = { startDate: '2024-01-01', endDate: '2024-12-31', observationId: 'p1', recipient: 'Operator A' };
  const base = { title: 'Record', reference: 'https://example.org', synthetic: true, date: '2024-03-01', observationId: 'p1' };
  source.evidence = [
    { ...base, id: 'n1', kind: 'notification', recipient: 'Operator A' },
    { ...base, id: 'n2', kind: 'notification', recipient: 'Operator B' },
    { ...base, id: 'n3', kind: 'notification', recipient: 'Operator A', date: '2023-03-01' },
    { ...base, id: 'n4', kind: 'notification', recipient: 'Operator A', observationId: 'p2' },
    { ...base, id: 'm1', kind: 'mitigation_confirmation' },
  ];
  expect(getClaimCoverage(source, scope).find(item => item.claimType === 'operator_notified')).toMatchObject({ supportingCount: 1, excludedCount: 3 });
  expect(getClaimCoverage(source, scope).find(item => item.claimType === 'mitigation_confirmed')).toMatchObject({ supportingCount: 0, excludedCount: 1 });
  expect(getInvestigationPlan(source, 'mitigation_confirmed', null, scope).steps.some(step => step.action === 'human-review')).toBe(true);
  expect(getInvestigationPlan(source, 'mitigation_confirmed', null, scope).steps.some(step => step.action === 'document-review')).toBe(false);
});

test('a saved human determination is described as human and its request remains actionable', () => {
  const source = fixture();
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
  audit.bundle.schemaVersion = 4;
  audit.bundle.humanAssessment = { kind: 'independent_human_assessment', reviewerId: 'reviewer', claimText: 'This source was detected in the period.', sourceInspected: true, submittedEvidence: [], nextEvidenceRequest: 'Obtain a dated follow-up.', baseline: { result: 'supported', reason: 'Coverage only', evidenceIds: [] } } as any;
  const plan = getInvestigationPlan(source, 'source_detected', audit);
  expect(plan.title).toContain('human determination');
  expect(plan.detail).not.toContain('rules baseline found');
  expect(plan.steps.some(step => step.action === 'follow-up')).toBe(true);
});
