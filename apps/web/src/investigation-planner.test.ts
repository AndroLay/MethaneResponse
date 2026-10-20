import { expect, test } from 'bun:test';
import { acceptInvestigationPortfolio } from './investigation-planner';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import { readFile } from 'node:fs/promises';

test('browser refuses DEMO plans even when their replay is valid', async () => {
  const parameters = { capacity: 2, maxPerCountry: 1, countries: [], sectors: [], recurrenceWeight: 50 };
  // Real provenance requirements are tested server-side; DEMO is never accepted in the real-data workspace.
  const report = await buildInvestigationPortfolio({ parameters, candidates: [], dataset: { synthetic: true, datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), scope: 'full_snapshot', totalSourceCount: 0, archiveStartDate: '2020-01-01', archiveEndDate: '2026-09-11', provenance: null } });
  await expect(acceptInvestigationPortfolio(report, { datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), parameters })).rejects.toThrow('different constraints or dataset');
});

test('browser binds real snapshot, archive, normalized input and constraints before accepting replay', async () => {
  const archive = JSON.parse(await readFile(new URL('../../../data/real/mars_casebook_2026-10-14.json', import.meta.url), 'utf8'));
  const parameters = { capacity: 2, maxPerCountry: 1, countries: [], sectors: [], recurrenceWeight: 50 };
  const report = await buildInvestigationPortfolio({ parameters, candidates: [], dataset: { synthetic: false, datasetSnapshotId: archive.provenance.snapshotId, inputFileSha256: 'a'.repeat(64), archiveSha256: archive.provenance.archiveSha256, intelligenceSha256: 'c'.repeat(64), scope: 'full_snapshot', totalSourceCount: 0, archiveStartDate: '2020-01-01', archiveEndDate: '2026-09-11', provenance: archive.provenance } });
  const context = { datasetSnapshotId: report.input.dataset.datasetSnapshotId, inputFileSha256: 'a'.repeat(64), archiveSha256: report.input.dataset.archiveSha256, parameters };
  expect((await acceptInvestigationPortfolio(report, context)).digest).toBe(report.digest);
  for (const change of [{ datasetSnapshotId: 'stale' }, { inputFileSha256: 'c'.repeat(64) }, { archiveSha256: 'c'.repeat(64) }, { parameters: { ...parameters, capacity: 3 } }]) await expect(acceptInvestigationPortfolio(report, { ...context, ...change })).rejects.toThrow();
  await expect(acceptInvestigationPortfolio({ ...report, eligibleCount: 9 }, context)).rejects.toThrow('checksum or policy replay');
});
