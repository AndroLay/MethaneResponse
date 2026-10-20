import { expect, test } from 'bun:test';
import { acceptPlanArtifact } from './plan-operations';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import { appendPlanDecision } from '@methane/shared/plan-journal';
test('import requires a separately supplied matching digest for both reports and reviewer histories', async () => {
  const report = await buildInvestigationPortfolio({ dataset: { datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 0, archiveStartDate: '2020-01-01', archiveEndDate: '2026-01-01' }, candidates: [], parameters: { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] } });
  expect((await acceptPlanArtifact(report, report.digest)).report.digest).toBe(report.digest);
  await expect(acceptPlanArtifact(report, '')).rejects.toThrow();
  await expect(acceptPlanArtifact(report, '0x'+'f'.repeat(64))).rejects.toThrow();
  const journal = await appendPlanDecision(null, 'demo-plan', report, { decision: 'defer', strategy: 'flux', rationale: 'DEMO request more historical evidence before authorizing an investigation.' }, 0, null, 'demo-reviewer');
  const imported = await acceptPlanArtifact(journal, journal.revisions[0].hash);
  expect(imported.strategy).toBe('flux'); expect(imported.journal?.revisions[0].decision).toBe('defer');
  await expect(acceptPlanArtifact({ ...journal, planId: 'other' }, journal.revisions[0].hash)).rejects.toThrow();
});
