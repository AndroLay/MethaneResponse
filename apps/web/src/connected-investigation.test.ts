import { expect, test } from 'bun:test';
import { acceptedInvestigationPlanLink, acceptInvestigationChangeCheck } from './connected-investigation';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import { appendPlanDecision } from '@methane/shared/plan-journal';

const context = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64) };
async function journal() {
  const report = await buildInvestigationPortfolio({ dataset: { datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64), inputFileSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 1, archiveStartDate: '2026-01-01', archiveEndDate: '2026-01-02' }, parameters: { capacity: 1, maxPerCountry: 1, recurrenceWeight: 50, countries: [], sectors: [] }, candidates: [{ sourceId: context.sourceId, country: 'DEMO', sector: 'DEMO', observationCount: 1, distinctDates: 1, missingFluxCount: 0, medianFluxKgHr: 10, medianUncertaintyKgHr: 2, lastObserved: '2026-01-02' }] });
  return appendPlanDecision(null, 'DEMO-plan', report, { strategy: 'weighted', decision: 'accept', rationale: 'DEMO accepted allocation for software regression only.' }, 0, null, 'DEMO-reviewer');
}
test('plan attachment requires an accepted replay-valid allocation for this exact source and dataset', async () => {
  const value = await journal(), link = await acceptedInvestigationPlanLink(value, context);
  expect(link.revisionHash).toBe(value.revisions[0].hash);
  await expect(acceptedInvestigationPlanLink(value, { ...context, sourceId: 'DEMO_OTHER' })).rejects.toThrow();
  await expect(acceptedInvestigationPlanLink(value, { ...context, datasetSnapshotId: 'DEMO_STALE' })).rejects.toThrow();
  const deferred = await appendPlanDecision(value, value.planId, value.reports[0], { strategy: 'weighted', decision: 'defer', rationale: 'DEMO defer pending additional source evidence.' }, 1, value.revisions[0].hash, 'DEMO-reviewer');
  await expect(acceptedInvestigationPlanLink(deferred, context)).rejects.toThrow();
});
test('late change responses cannot attach to a different investigation revision or source', () => {
  const value = { workRevision: 2, sourceId: context.sourceId, datasetSnapshotId: 'DEMO', changeReportDigest: '0x'+'d'.repeat(64), beforeSnapshotId: 'DEMO-before', afterSnapshotId: 'DEMO', signal: { state: 'review_recommended', metadataFields: ['persistency'], observationIds: [], physicalOutcomeEstablished: false } };
  expect(acceptInvestigationChangeCheck(value, context, 2).signal.metadataFields).toEqual(['persistency']);
  expect(() => acceptInvestigationChangeCheck(value, context, 1)).toThrow();
  expect(() => acceptInvestigationChangeCheck(value, { ...context, sourceId: 'DEMO_OTHER' }, 2)).toThrow();
  expect(() => acceptInvestigationChangeCheck({ ...value, signal: { ...value.signal, physicalOutcomeEstablished: true } }, context, 2)).toThrow();
});
