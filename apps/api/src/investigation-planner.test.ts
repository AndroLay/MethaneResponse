import { expect, test } from 'bun:test';
import { buildInvestigationPortfolio, plannerDisposition, plannerCanonical, verifyInvestigationPortfolio, PlannerRequest } from '@methane/shared/investigation-planner';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { getIntelligenceSnapshot } from './intelligence-data';
import { createHash } from 'node:crypto';

const candidate = (sourceId: string, country: string | null, sector: string | null, medianFluxKgHr: number | null, distinctDates: number) => ({
  sourceId, country, sector, medianFluxKgHr, medianUncertaintyKgHr: null, distinctDates, observationCount: distinctDates,
  missingFluxCount: medianFluxKgHr === null ? distinctDates : 0, lastObserved: distinctDates ? '2026-09-01T00:00:00' : null,
});
export const plannerFixture = {
  dataset: { datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 5, archiveStartDate: '2020-01-01', archiveEndDate: '2026-09-11' },
  parameters: { capacity: 2, maxPerCountry: 1, countries: [], sectors: [], recurrenceWeight: 50 },
  candidates: [candidate('DEMO-A', 'A', 'Oil', 1000, 2), candidate('DEMO-B', 'A', 'Waste', 900, 10), candidate('DEMO-C', 'B', 'Oil', 100, 8), candidate('DEMO-D', 'C', 'Waste', null, 1), candidate('DEMO-E', 'D', 'Waste', null, 0)],
};

test('capacity planner allocates across quotas and compares genuinely different portfolios', async () => {
  const result = await buildInvestigationPortfolio(plannerFixture);
  expect(result.eligibleCount).toBe(4);
  expect(result.portfolios.map(p => [p.strategy, p.selectedIds])).toEqual([
    ['weighted', ['DEMO-B', 'DEMO-C']], ['flux', ['DEMO-A', 'DEMO-C']],
    ['recurrence', ['DEMO-B', 'DEMO-C']], ['breadth', ['DEMO-B', 'DEMO-C']],
  ]);
  expect(result.portfolios[0].unfilledSlots).toBe(0);
  expect(result.portfolios[0].countryCount).toBe(2);
  expect(result.portfolios[0].medianSourceFluxKgHr).toBe(500);
  expect(result.portfolios[0].medianObservedDates).toBe(9);
  expect(result.portfolios[1].medianSourceFluxKgHr).toBe(550);
  expect(result.sensitivity.find(s => s.key === 'country_cap_plus_one')!.addedIds).toEqual(['DEMO-A']);
  expect(result.sensitivity.find(s => s.key === 'country_cap_plus_one')!.removedIds).toEqual(['DEMO-C']);
  expect(result.physicalBenefitEstimated).toBe(false);
});

test('planner does not fabricate slots or numeric flux when data or quotas are insufficient', async () => {
  const result = await buildInvestigationPortfolio({ ...plannerFixture, parameters: { ...plannerFixture.parameters, capacity: 5, countries: ['A'] } });
  expect(result.eligibleCount).toBe(2);
  // In this two-source pool the two 50/50 percentile blends tie; source ID breaks the tie.
  expect(result.portfolios[0].selectedIds).toEqual(['DEMO-A']);
  expect(result.portfolios[0].unfilledSlots).toBe(4);
  const missing = await buildInvestigationPortfolio({ ...plannerFixture, parameters: { ...plannerFixture.parameters, countries: ['C'] } });
  expect(missing.input.candidates.find(s => s.sourceId === 'DEMO-D')!.medianFluxKgHr).toBeNull();
  expect(missing.portfolios[0].missingFluxSelected).toBe(1);
  const empty = await buildInvestigationPortfolio({ ...plannerFixture, parameters: { ...plannerFixture.parameters, sectors: ['Unknown'] } });
  expect(empty.eligibleCount).toBe(0);
  expect(empty.portfolios.every(p => p.selectedIds.length === 0 && p.unfilledSlots === 2)).toBe(true);
});

test('every exclusion is explained and unknown geography cannot increase coverage', async () => {
  const result = await buildInvestigationPortfolio(plannerFixture);
  expect(plannerDisposition(result, 'DEMO-A', 'weighted')).toBe('country_quota_filled');
  expect(plannerDisposition(result, 'DEMO-D', 'weighted')).toBe('capacity_filled');
  expect(plannerDisposition(result, 'DEMO-E', 'weighted')).toBe('no_linked_observations');
  const filtered = await buildInvestigationPortfolio({ ...plannerFixture, parameters: { ...plannerFixture.parameters, countries: ['A'], sectors: ['Waste'] } });
  expect(plannerDisposition(filtered, 'DEMO-C', 'weighted')).toBe('outside_country_scope');
  expect(plannerDisposition(filtered, 'DEMO-A', 'weighted')).toBe('outside_sector_scope');
  const unknown = await buildInvestigationPortfolio({ ...plannerFixture, candidates: plannerFixture.candidates.map(row => ({ ...row, country: null, sector: null })) });
  expect(unknown.portfolios.every(p => p.selectedIds.length === 1 && p.countryCount === 0 && p.sectorCount === 0)).toBe(true);
});

test('canonical replay binds constraints and candidates independently of input ordering', async () => {
  const result = await buildInvestigationPortfolio(plannerFixture);
  expect(await buildInvestigationPortfolio({ ...plannerFixture, candidates: [...plannerFixture.candidates].reverse() })).toEqual(result);
  const { digest, ...payload } = result;
  expect(digest).toBe('0x' + createHash('sha256').update(plannerCanonical(payload)).digest('hex'));
  expect(await verifyInvestigationPortfolio(result, digest)).toBe(true);
  const tampered = structuredClone(result); tampered.portfolios[0].selectedIds.reverse();
  expect(await verifyInvestigationPortfolio(tampered)).toBe(false);
  const { digest: _old, ...edited } = tampered;
  tampered.digest = '0x' + createHash('sha256').update(plannerCanonical(edited)).digest('hex');
  expect(await verifyInvestigationPortfolio(tampered)).toBe(false);
  const validButDifferent = await buildInvestigationPortfolio({ ...plannerFixture, parameters: { ...plannerFixture.parameters, capacity: 1 } });
  expect(await verifyInvestigationPortfolio(validButDifferent, digest)).toBe(false);
});

test('planner refuses malformed counts, duplicate IDs, false provenance and unbounded constraints', async () => {
  for (const parameters of [{ ...plannerFixture.parameters, capacity: 0 }, { ...plannerFixture.parameters, capacity: 51 }, { ...plannerFixture.parameters, maxPerCountry: 0 }, { ...plannerFixture.parameters, recurrenceWeight: 101 }]) {
    expect(PlannerRequest.safeParse({ ...plannerFixture.dataset, parameters }).success).toBe(false);
    await expect(buildInvestigationPortfolio({ ...plannerFixture, parameters })).rejects.toThrow();
  }
  for (const candidates of [[...plannerFixture.candidates, plannerFixture.candidates[0]], plannerFixture.candidates.map(row => ({ ...row, missingFluxCount: 10000 }))]) await expect(buildInvestigationPortfolio({ ...plannerFixture, candidates })).rejects.toThrow();
  await expect(buildInvestigationPortfolio({ ...plannerFixture, dataset: { ...plannerFixture.dataset, synthetic: false } })).rejects.toThrow();
  await expect(buildInvestigationPortfolio({ ...plannerFixture, candidates: plannerFixture.candidates.map(row => ({ ...row, lastObserved: 'garbage' })) })).rejects.toThrow();
});

const post = (app: ReturnType<typeof createApp>, body: unknown) => app.request('/api/investigations/portfolios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('real portfolio API binds all 4218 original sources, compares plans and does not save an audit', async () => {
  const snapshot = await getIntelligenceSnapshot(), app = createApp(new MemoryAuditStore());
  const response = await post(app, { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters: { ...plannerFixture.parameters, capacity: 10, maxPerCountry: 2 } });
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  const report = await response.json();
  expect(report.input.candidates.length).toBe(4218);
  expect(report.input.dataset.synthetic).toBe(false);
  expect(report.input.dataset.provenance.archiveSha256).toBe(snapshot.upstreamArchiveSha256);
  expect(report.portfolios.map((p: { countryCount: number; sectorCount: number }) => [p.countryCount, p.sectorCount])).toEqual([[7, 1], [6, 1], [6, 1], [10, 7]]);
  expect(report.portfolios[0].selectedIds[0]).toBe('MEX_S_003');
  expect(report.portfolios[1].selectedIds[0]).toBe('RUS_S_042');
  expect(await verifyInvestigationPortfolio(report)).toBe(true);
  expect((await (await app.request('/api/audits')).json()).audits).toEqual([]);
});

test('portfolio API rejects stale, oversized, forged candidate and unavailable dataset requests', async () => {
  const app = createApp(new MemoryAuditStore()), snapshot = await getIntelligenceSnapshot();
  const body = { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters: plannerFixture.parameters };
  expect((await post(app, { ...body, datasetSnapshotId: 'stale' })).status).toBe(409);
  expect((await post(app, { ...body, inputFileSha256: 'e'.repeat(64) })).status).toBe(409);
  expect((await post(app, { ...body, candidates: [] })).status).toBe(400);
  expect((await post(app, { oversized: 'x'.repeat(9000) })).status).toBe(413);
  const unavailable = createApp(new MemoryAuditStore(), undefined, { getIntelligenceSnapshot: async () => { throw new Error('missing'); } });
  expect((await post(unavailable, body)).status).toBe(503);
});

test('public preview restricts every plan and exported candidate to the three curated sources', async () => {
  const app = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true }), snapshot = await getIntelligenceSnapshot();
  const response = await post(app, { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters: { ...plannerFixture.parameters, capacity: 10 } });
  const report = await response.json();
  expect(response.status).toBe(200); expect(report.input.dataset.scope).toBe('public_preview');
  expect(report.input.candidates.map((row: { sourceId: string }) => row.sourceId)).toEqual(['CAN_S_002', 'KAZ_S_159', 'LBY_S_143']);
  expect(report.portfolios.every((p: { selectedIds: string[]; unfilledSlots: number }) => p.selectedIds.length === 3 && p.unfilledSlots === 7)).toBe(true);
});

test('planner maintains hard constraints at capacity and weight boundaries with shuffled source order', async () => {
  const candidates = Array.from({ length: 24 }, (_, i) => candidate('DEMO-' + i.toString().padStart(2, '0'), i % 5 ? 'country-' + i % 5 : null, 'sector-' + i % 3, i % 4 ? i * 100 : null, i % 7 + 1));
  for (const capacity of [1, 10, 50]) for (const recurrenceWeight of [0, 100]) {
    const input = { ...plannerFixture, dataset: { ...plannerFixture.dataset, totalSourceCount: candidates.length }, candidates,
      parameters: { capacity, recurrenceWeight, maxPerCountry: 2, countries: [], sectors: [] } };
    const report = await buildInvestigationPortfolio(input);
    expect(await buildInvestigationPortfolio({ ...input, candidates: [...candidates].reverse() })).toEqual(report);
    for (const plan of report.portfolios) {
      expect(plan.selectedIds.length).toBe(Math.min(capacity, 10));
      expect(new Set(plan.selectedIds).size).toBe(plan.selectedIds.length);
      for (const country of new Set(candidates.map(row => row.country))) expect(plan.selectedIds.filter(id => candidates.find(row => row.sourceId === id)!.country === country).length).toBeLessThanOrEqual(2);
    }
  }
});

test('planner endpoint bounds abusive requests without writing audits', async () => {
  const app = createApp(new MemoryAuditStore());
  for (let i = 0; i < 20; i++) expect((await post(app, {})).status).toBe(400);
  const limited = await post(app, {});
  expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
});
