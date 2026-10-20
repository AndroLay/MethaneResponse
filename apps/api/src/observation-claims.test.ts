import { expect, test } from 'bun:test';
import { buildObservationCheck, verifyObservationCheck } from '@methane/shared/observation-claims';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical';
import { getIntelligenceSnapshot } from './intelligence-data';
import { getObservationSource } from './observation-archive';

const input = {
  sourceId: 'DEMO-QUERY', synthetic: true, datasetSnapshotId: 'DEMO', archiveSha256: 'a'.repeat(64), inputFileSha256: 'b'.repeat(64),
  archiveEndDate: '2026-06-30', sourceLimitations: [],
  query: { kind: 'no_linked_detections' as const, startDate: '2026-06-01', endDate: '2026-06-30' },
  observations: [{ id: 'DEMO-record', sourceId: 'DEMO-QUERY', linkStatus: 'linked' as const, date: '2026-06-10T12:00:00', fluxKgHr: 120, uncertaintyKgHr: 80, fluxUnit: 'kg/h' as const, satellite: 'DEMO satellite' }],
};

test('an exact archived witness refutes a no-linked-record claim without claiming repair failed', async () => {
  const check = await buildObservationCheck(input);
  expect(check.status).toBe('counterexample_found');
  expect(check.counterexampleIds).toEqual(['DEMO-record']);
  expect(check.physicalMitigationEstablished).toBe(false);
  expect(check.trace[0].record.date).toBe(input.observations[0].date);
  expect(await verifyObservationCheck(check)).toBe(true);
});

test('reported point estimates and their uncertainty are not converted to physical exceedance probabilities', async () => {
  const check = await buildObservationCheck({ ...input, query: { ...input.query, kind: 'reported_flux_at_most', thresholdKgHr: 100 } });
  expect(check.status).toBe('counterexample_found');
  expect(check.trace[0].uncertaintyRelation).toBe('straddles_threshold');
  expect(check).not.toHaveProperty('probability');
  const equal = await buildObservationCheck({ ...input, query: { ...input.query, kind: 'reported_flux_at_most', thresholdKgHr: 120 } });
  expect(equal.status).toBe('no_counterexample_in_archive');
});

test('no observations and missing flux stay unknown, including partial windows beyond the archive', async () => {
  const absent = await buildObservationCheck({ ...input, observations: [] });
  expect(absent.status).toBe('no_observations');
  const missing = await buildObservationCheck({ ...input, observations: [{ ...input.observations[0], fluxKgHr: null }], query: { ...input.query, kind: 'reported_flux_at_most', thresholdKgHr: 100 } });
  expect(missing.status).toBe('incomplete_flux');
  const future = await buildObservationCheck({ ...input, query: { ...input.query, kind: 'reported_flux_at_most', thresholdKgHr: 1000, endDate: '2026-07-10' } });
  expect(future.status).toBe('incomplete_window');
  const zero = await buildObservationCheck({ ...input, observations: [{ ...input.observations[0], fluxKgHr: 0 }] });
  expect(zero.status).toBe('counterexample_found'); // A detection record exists even if its reported numeric value is zero.
});

test('physical mitigation cannot be determined from either present or absent satellite records', async () => {
  for (const observations of [input.observations, []]) {
    const check = await buildObservationCheck({ ...input, observations, query: { ...input.query, kind: 'physical_mitigation' } });
    expect(check.status).toBe('requires_document_review');
    expect(check.counterexampleIds).toEqual([]);
    expect(check.physicalMitigationEstablished).toBe(false);
  }
});

test('UTC day boundaries include the full period and retain excluded observations', async () => {
  const check = await buildObservationCheck({ ...input, query: { ...input.query, startDate: '2026-06-10', endDate: '2026-06-10' }, observations: [
    { ...input.observations[0], id: 'a', date: '2026-06-09T23:00:00-02:00' },
    { ...input.observations[0], id: 'b', date: '2026-06-11T01:00:00+02:00' },
    { ...input.observations[0], id: 'c', date: '2026-06-11T00:00:00Z' },
  ] });
  expect(check.counterexampleIds).toEqual(['a', 'b']);
  expect(check.summary.outsideWindow).toBe(1);
});

test('rejects wrong source links, duplicate identifiers, unsupported units and impossible dates', async () => {
  for (const observations of [
    [{ ...input.observations[0], sourceId: 'OTHER' }],
    [{ ...input.observations[0], linkStatus: 'source_id_missing' }],
    [input.observations[0], input.observations[0]],
    [{ ...input.observations[0], fluxUnit: 't/h' }],
    [{ ...input.observations[0], date: '2026-02-30T12:00:00' }],
  ]) await expect(buildObservationCheck({ ...input, observations } as never)).rejects.toThrow();
});

test('the same input is deterministic and replay rejects a forged result even after rehashing', async () => {
  const first = await buildObservationCheck(input);
  expect(await buildObservationCheck(input)).toEqual(first);
  expect(await verifyObservationCheck({ ...first, status: 'no_observations' })).toBe(false);
  const { digest: _, ...changed } = { ...first, status: 'no_observations' };
  const rehashed = { ...changed, digest: '0x' + createHash('sha256').update(canonicalJson(changed)).digest('hex') };
  expect(await verifyObservationCheck(rehashed)).toBe(false);
  await expect(buildObservationCheck({ ...input, query: { ...input.query, startDate: '2026-06-31' } })).rejects.toThrow();
});

const request = (app: ReturnType<typeof createApp>, body: unknown) => app.request('/api/investigations/observation-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const realQuery = { sourceId: 'KAZ_S_159', datasetSnapshotId: 'unep-mars-675417694883', query: { kind: 'no_linked_detections', startDate: '2024-06-08', endDate: '2026-09-13' } };
test('actual MARS history produces exact later-record witnesses and creates no audit revision', async () => {
  const app = createApp(new MemoryAuditStore());
  const response = await request(app, realQuery);
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toContain('no-store');
  const result = await response.json();
  expect(result.input.synthetic).toBe(false);
  expect(result.summary.counterexamples).toBe(2);
  expect(result.summary.outsideWindow).toBe(1);
  expect(result.input.provenance.license).toContain('CC BY-NC-SA');
  expect(await verifyObservationCheck(result)).toBe(true);
  expect((await (await app.request('/api/audits')).json()).audits).toHaveLength(0);
});
test('query API fails closed for injected observations, invalid fields, stale snapshots and unknown sources', async () => {
  const app = createApp(new MemoryAuditStore());
  expect((await request(app, { ...realQuery, observations: [] })).status).toBe(400);
  expect((await request(app, { ...realQuery, datasetSnapshotId: 'stale' })).status).toBe(409);
  expect((await request(app, { ...realQuery, inputFileSha256: '0'.repeat(64) })).status).toBe(409);
  expect((await request(app, { ...realQuery, sourceId: 'MISSING' })).status).toBe(404);
  expect((await request(app, { ...realQuery, query: { ...realQuery.query, endDate: '2026-02-30' } })).status).toBe(400);
  expect((await request(app, { extra: 'x'.repeat(17000) })).status).toBe(413);
  const preview = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true });
  expect((await request(preview, { ...realQuery, sourceId: 'OMN_S_002' })).status).toBe(403);
});
test('archive cache cannot serve validated records under a changed provenance identity', async () => {
  const snapshot = await getIntelligenceSnapshot();
  expect((await getObservationSource('KAZ_S_159', snapshot)).observations).toHaveLength(3);
  await expect(getObservationSource('KAZ_S_159', { ...snapshot, datasetSnapshotId: 'stale' })).rejects.toThrow();
  await expect(getObservationSource('KAZ_S_159', { ...snapshot, inputFileSha256: '0'.repeat(64) })).rejects.toThrow();
});
test('query rate limit is separate from saved baseline audits and errors do not leak local paths', async () => {
  const app = createApp(new MemoryAuditStore(), undefined, { getObservationSource: async () => { throw new Error('/private/server/path'); } });
  for (let i = 0; i < 20; i++) {
    const response = await request(app, realQuery);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('/private/server/path');
  }
  expect((await request(app, realQuery)).status).toBe(429);
  const baseline = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }) });
  expect(baseline.status).toBe(201);
});
