import { expect, test } from 'bun:test';
import * as planner from '@methane/shared/investigation-planner';
import type { InvestigationPortfolio, PlannerInput } from '@methane/shared/investigation-planner';
import { readFile } from 'node:fs/promises';

function input(): PlannerInput {
  return { dataset: { datasetSnapshotId: 'DEMO-one', archiveSha256: 'a'.repeat(64), inputFileSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 3, archiveStartDate: '2020-01-01', archiveEndDate: '2026-01-01' }, parameters: { capacity: 1, maxPerCountry: 3, recurrenceWeight: 50, countries: [], sectors: [] }, candidates: ['A','B','C'].map((sourceId, i) => ({ sourceId, country: 'DEMO country', sector: 'DEMO sector', observationCount: i + 1, distinctDates: i + 1, missingFluxCount: 0, medianFluxKgHr: 100 * (i + 1), medianUncertaintyKgHr: 10, lastObserved: '2025-01-01' })) };
}
async function compare(before: InvestigationPortfolio, after: InvestigationPortfolio) {
  const fn = (planner as unknown as { compareInvestigationPortfolios?: (a: InvestigationPortfolio, b: InvestigationPortfolio, x: string, y: string) => Promise<any> }).compareInvestigationPortfolios;
  expect(fn, 'deterministic verified plan comparison exists').toBeFunction();
  return fn!(before, after, 'weighted', 'weighted');
}
test('capacity changes expose added/removed membership without pretending the snapshot changed', async () => {
  const first = input(), second = structuredClone(first); second.parameters.capacity = 2;
  const delta = await compare(await planner.buildInvestigationPortfolio(first), await planner.buildInvestigationPortfolio(second));
  expect(delta.datasetChanged).toBe(false); expect(delta.assumptionsChanged).toBe(true);
  expect(delta.addedIds).toEqual(['B']); expect(delta.removedIds).toEqual([]); expect(delta.reviewSources).toEqual([]);
});
test('a different snapshot flags changed selected summaries without inventing repair or zero emissions', async () => {
  const first = input(), second = structuredClone(first);
  second.dataset.datasetSnapshotId = 'DEMO-two'; second.dataset.archiveSha256 = 'd'.repeat(64); second.dataset.inputFileSha256 = 'e'.repeat(64);
  second.candidates[2].medianFluxKgHr = null; second.candidates[2].missingFluxCount = 3;
  const delta = await compare(await planner.buildInvestigationPortfolio(first), await planner.buildInvestigationPortfolio(second));
  expect(delta.datasetChanged).toBe(true); expect(delta.assumptionsChanged).toBe(false);
  expect(delta.reviewSources.find((s: any) => s.sourceId === 'C')?.changedFields).toContain('medianFluxKgHr');
  expect(delta.physicalOutcomeEstablished).toBe(false);
});
test('plan comparison rejects edited replay and mixed catalog visibility', async () => {
  const a = await planner.buildInvestigationPortfolio(input()), changed = structuredClone(a); changed.portfolios[0].selectedIds = ['A'];
  await expect(compare(a, changed)).rejects.toThrow();
  const other = input(); other.dataset.scope = 'public_preview';
  await expect(compare(a, await planner.buildInvestigationPortfolio(other))).rejects.toThrow();
});
test('different archive contents cannot retain the same snapshot identity in a comparison', async () => {
  const a = input(), b = structuredClone(a); b.dataset.archiveSha256 = 'd'.repeat(64);
  await expect(compare(await planner.buildInvestigationPortfolio(a), await planner.buildInvestigationPortfolio(b))).rejects.toThrow();
});
test('different publishers cannot be passed off as a change in the same dataset series', async () => {
  const provenance = JSON.parse(await readFile(new URL('../../../data/real/mars_casebook_2026-10-14.json', import.meta.url), 'utf8')).provenance;
  const a = input(); a.dataset.synthetic = false; a.dataset.provenance = { ...provenance, archiveSha256: a.dataset.archiveSha256, snapshotId: a.dataset.datasetSnapshotId };
  const b = structuredClone(a); b.dataset.datasetSnapshotId = 'DEMO-next'; b.dataset.archiveSha256 = 'd'.repeat(64); b.dataset.inputFileSha256 = 'e'.repeat(64);
  b.dataset.provenance = { ...a.dataset.provenance!, archiveSha256: b.dataset.archiveSha256, snapshotId: b.dataset.datasetSnapshotId, provider: 'DEMO different provider', catalogUrl: 'https://example.org/different-catalog' };
  await expect(compare(await planner.buildInvestigationPortfolio(a), await planner.buildInvestigationPortfolio(b))).rejects.toThrow();
});
