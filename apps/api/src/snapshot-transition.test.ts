import { expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { getIntelligenceSnapshot } from './intelligence-data';
import { getSnapshotTransition, historicalTransitionPaths } from './snapshot-transition-data';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const request = { datasetSnapshotId: 'unep-mars-675417694883', inputFileSha256: 'f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7', sourceIds: [] as string[], offset: 0, limit: 20 };
function post(app: ReturnType<typeof createApp>, value: unknown = request, suffix = '') {
  return app.request('/api/investigations/snapshot-transition' + suffix, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) });
}

test('historical change watch returns a real second snapshot and binds the active input', async () => {
  const app = createApp(new MemoryAuditStore());
  const response = await app.request('/api/investigations/snapshot-transition', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ datasetSnapshotId: 'unep-mars-675417694883', inputFileSha256: 'f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7', sourceIds: [], offset: 0, limit: 20 }),
  });
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.before.datasetSnapshotId).toBe('unep-mars-e0721015e925');
  expect(result.after.datasetSnapshotId).toBe('unep-mars-675417694883');
  expect(result.summary.addedSources).toBe(7);
  expect(result.summary.addedObservations).toBe(95);
  expect(result.physicalOutcomeEstablished).toBe(false);
  expect(result.items.length).toBeLessThanOrEqual(20);
});
test('selected source changes retain their exact field values and do not include unrelated records', async () => {
  const app = createApp(new MemoryAuditStore());
  const response = await post(app, { ...request, sourceIds: ['TKM_S_021', 'MEX_S_003'] });
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.coverage).toBe('selected_sources');
  expect(result.total).toBe(1);
  expect(result.items.map((item: { sourceId: string }) => item.sourceId)).toEqual(['TKM_S_021']);
  expect(result.unchangedSourceIds).toEqual(['MEX_S_003']);
  expect(result.items[0].metadataChange.changedFields).toContain('persistency');
});
test('page two is bounded and unknown IDs, duplicate IDs and excessive pages fail validation', async () => {
  const app = createApp(new MemoryAuditStore()), first = await (await post(app, { ...request, limit: 1 })).json();
  const second = await (await post(app, { ...request, limit: 1, offset: 1 })).json();
  expect(first.items[0].sourceId).toBe('ARG_S_069');
  expect(second.items[0].sourceId).toBe('CAN_S_007');
  for (const body of [{ ...request, sourceIds: ['DEMO-not-in-catalog'] }, { ...request, sourceIds: ['TKM_S_021','TKM_S_021'] }, { ...request, limit: 500 }, { ...request, beforePath: '/etc/passwd' }]) expect((await post(app, body)).status).toBe(400);
});
test('stale active input and unavailable artifacts fail closed without a fabricated transition', async () => {
  expect((await post(createApp(new MemoryAuditStore()), { ...request, inputFileSha256: 'f'.repeat(64) })).status).toBe(409);
  const unavailable = createApp(new MemoryAuditStore(), undefined, { getSnapshotTransition: async () => { throw new Error('DEMO internal path must not leak'); } });
  const response = await post(unavailable);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('DEMO internal path');
});
test('restricted public preview cannot enumerate or export complete historical transitions', async () => {
  const app = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true });
  expect((await post(app)).status).toBe(403);
  expect((await post(app, request, '/export')).status).toBe(403);
});
test('export and paged inspection share the same full-report commitment', async () => {
  const app = createApp(new MemoryAuditStore());
  const page = await (await post(app)).json(), exported = await post(app, request, '/export'), report = await exported.json();
  expect(exported.status).toBe(200);
  expect(report.digest).toBe(page.digest);
  expect(report.observationChanges).toHaveLength(98);
  expect(exported.headers.get('cache-control')).toContain('no-store');
});
test('inspection and export reject oversized bodies and share their bounded comparison rate bucket', async () => {
  const bodies = createApp(new MemoryAuditStore());
  for (const suffix of ['', '/export']) {
    const response = await post(bodies, { ...request, sourceIds: ['DEMO-' + 'x'.repeat(17_000)] }, suffix);
    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toContain('no-store');
  }
  const limited = createApp(new MemoryAuditStore(), undefined, { getIntelligenceSnapshot: async () => { throw new Error('DEMO unavailable input'); } });
  for (let i = 0; i < 20; i++) expect((await post(limited, request, i % 2 ? '/export' : '')).status).toBe(503);
  const throttled = await post(limited);
  expect(throttled.status).toBe(429);
  expect(throttled.headers.get('retry-after')).toBe('60');
  expect(throttled.headers.get('cache-control')).toContain('no-store');
});
test('cached artifacts cannot hide a changed retained original input', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'methane-transition-cache-'));
  try {
    const before = join(temporary, 'before.json.gz'); await writeFile(before, await readFile(historicalTransitionPaths.before));
    const paths = { ...historicalTransitionPaths, before }, snapshot = await getIntelligenceSnapshot();
    expect((await getSnapshotTransition(snapshot, paths)).summary.addedSources).toBe(7);
    await writeFile(before, 'DEMO changed retained input');
    await expect(getSnapshotTransition(snapshot, paths)).rejects.toThrow('input changed');
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
