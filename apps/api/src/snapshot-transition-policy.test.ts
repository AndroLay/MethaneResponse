import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { buildSnapshotTransition, normalizeTransitionSnapshot, transitionIntegrityValid, transitionPage } from '@methane/shared/snapshot-transition';

const provenance = JSON.parse(await readFile(new URL('../../../data/real/mars_casebook_2026-10-14.json', import.meta.url), 'utf8')).provenance;
function observation(id: string, sourceId: string | null, date = '2025-01-01', flux: number | null = 100) {
  return { id, sourceId, synthetic: false, linkStatus: sourceId ? 'linked' : 'source_id_missing', date, fluxKgHr: flux, uncertaintyKgHr: 10, fluxUnit: 'kg/h' };
}
function fixture(next = false) {
  const sources = [{ sourceId: 'DEMO_A', synthetic: false, feedback: next ? 'Yes' : 'No', observations: next
    ? [observation('DEMO-a', 'DEMO_A', '2025-01-01', null), observation('DEMO-b', 'DEMO_A'), observation('DEMO-backfill', 'DEMO_A')]
    : [observation('DEMO-a', 'DEMO_A'), observation('DEMO-remove', 'DEMO_A')] },
  { sourceId: next ? 'DEMO_C' : 'DEMO_B', synthetic: false, observations: [observation(next ? 'DEMO-later' : 'DEMO-b', next ? 'DEMO_C' : 'DEMO_B', next ? '2025-02-01' : '2025-01-01')] }];
  return { schemaVersion: 1, snapshotId: next ? 'DEMO-after' : 'DEMO-before', provenance: { ...provenance, snapshotId: next ? 'DEMO-after' : 'DEMO-before', archiveSha256: (next ? 'b' : 'a').repeat(64), retrievedAt: next ? '2026-10-14T00:00:00Z' : '2026-10-12T00:00:00Z' },
    truncated: false, originalSourceCount: 2, plumeCount: next ? 5 : 4, plumeObservationDateRange: { start: '2025-01-01', end: next ? '2025-02-01' : '2025-01-01' }, sources, unmappedSources: [], unlinkedObservations: [observation('DEMO-unlinked', null)] };
}
function normalized(next = false) { return normalizeTransitionSnapshot(fixture(next), (next ? 'd' : 'c').repeat(64)); }
test('record delta preserves correction, historical backfill, later dates, relinking and removals separately', async () => {
  const report = await buildSnapshotTransition(normalized(), normalized(true));
  expect(report.summary).toEqual({ addedSources: 1, removedSources: 1, changedSources: 1, addedObservations: 2, removedObservations: 1, changedObservations: 2, laterDatedAdditions: 1, historicalBackfillAdditions: 1, reassignedObservations: 1 });
  expect(report.affectedSourceIds).toEqual(['DEMO_A', 'DEMO_B', 'DEMO_C']);
  expect(report.observationChanges.find(row => row.id === 'DEMO-a')!.after!.fluxKgHr).toBeNull();
  expect(report.observationChanges.find(row => row.id === 'DEMO-remove')!.kind).toBe('removed');
  expect(report.sourceChanges.find(row => row.id === 'DEMO_A')!.changedFields).toEqual(['feedback']);
  expect(report.physicalOutcomeEstablished).toBe(false);
  expect(await transitionIntegrityValid(report)).toBe(true);
});
test('delta is independent of source and observation input order', async () => {
  const original = await buildSnapshotTransition(normalized(), normalized(true)), shuffled = fixture(true);
  shuffled.sources.reverse(); shuffled.sources.forEach(source => source.observations.reverse());
  expect(await buildSnapshotTransition(normalized(), normalizeTransitionSnapshot(shuffled, 'd'.repeat(64)))).toEqual(original);
});
test('both sides of a relink are reviewable and source pagination preserves exact identities', async () => {
  const report = await buildSnapshotTransition(normalized(), normalized(true));
  const page = transitionPage(report, { datasetSnapshotId: 'DEMO-after', inputFileSha256: 'd'.repeat(64), sourceIds: ['DEMO_B'], offset: 0, limit: 1 });
  expect(page.items.map(row => row.sourceId)).toEqual(['DEMO_B']);
  expect(page.items[0].observationChanges.map(row => row.id)).toEqual(['DEMO-b']);
  expect(page.total).toBe(1);
  expect(transitionPage(report, { datasetSnapshotId: 'DEMO-after', inputFileSha256: 'd'.repeat(64), sourceIds: [], offset: 1, limit: 1 }).items[0].sourceId).toBe('DEMO_B');
});
test('normalizer rejects duplicate IDs, incomplete inventories, invalid units and false linkage', () => {
  const duplicate = fixture(); duplicate.sources[1].observations[0].id = 'DEMO-a';
  expect(() => normalizeTransitionSnapshot(duplicate, 'c'.repeat(64))).toThrow();
  const missing = fixture(); missing.plumeCount++;
  expect(() => normalizeTransitionSnapshot(missing, 'c'.repeat(64))).toThrow();
  const unit = fixture(); unit.sources[0].observations[0].fluxUnit = 'tonnes/year';
  expect(() => normalizeTransitionSnapshot(unit, 'c'.repeat(64))).toThrow();
  const wrongSource = fixture(); wrongSource.sources[0].observations[0].sourceId = 'DEMO_B';
  expect(() => normalizeTransitionSnapshot(wrongSource, 'c'.repeat(64))).toThrow();
});
test('comparison rejects reversed chronology, repeated archive identity and different publishers', async () => {
  await expect(buildSnapshotTransition(normalized(true), normalized())).rejects.toThrow();
  const b = normalized(true); b.descriptor.provenance.archiveSha256 = 'a'.repeat(64);
  await expect(buildSnapshotTransition(normalized(), b)).rejects.toThrow();
  const other = normalized(true); other.descriptor.provenance.provider = 'DEMO other publisher';
  await expect(buildSnapshotTransition(normalized(), other)).rejects.toThrow();
});
test('editing a record changes integrity even if counts remain the same', async () => {
  const report = await buildSnapshotTransition(normalized(), normalized(true));
  report.observationChanges[0].after!.fluxKgHr = 999;
  expect(await transitionIntegrityValid(report)).toBe(false);
});
