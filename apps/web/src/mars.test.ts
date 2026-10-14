import { describe, expect, it } from 'bun:test';
import { filterObservationsToArchiveWindow, getMarsDashboardSummary, mergeCuratedCasebookEvidence, parseMarsGeoJSON, parseMarsGzip, type MarsSource } from './mars';

describe('MARS GeoJSON importer', () => {
  it('anchors relative observation windows to the pinned archive date, not the wall clock', () => {
    const observations = [
      { id: 'outside-30d', date: '2026-08-13', fluxKgHr: 900 },
      { id: 'inside-30d', date: '2026-08-15', fluxKgHr: null },
      { id: 'archive-end', date: '2026-09-13T18:40:00Z', fluxKgHr: 1200 },
      { id: 'after-archive', date: '2026-09-14', fluxKgHr: 3000 },
    ];

    expect(filterObservationsToArchiveWindow(observations, '30 days', '2026-09-13')).toEqual([
      observations[1], observations[2],
    ]);
    expect(filterObservationsToArchiveWindow(observations, '1 year', '2026-09-13')).toEqual([
      observations[0], observations[1], observations[2],
    ]);
    expect(filterObservationsToArchiveWindow(observations, 'All observations', '2026-09-13')).toBe(observations);
  });

  it('uses the latest valid observation when archive metadata has no end date', () => {
    const observations = [
      { id: 'old', date: '2024-01-01', fluxKgHr: 800 },
      { id: 'latest', date: '2026-09-13', fluxKgHr: null },
      { id: 'invalid', date: 'not-a-date', fluxKgHr: 500 },
    ];

    expect(filterObservationsToArchiveWindow(observations, '30 days')).toEqual([observations[1]]);
  });

  it('groups real-format plume observations per source without claiming mitigation', () => {
    // Synthetic test fixture designed in the shape of real MARS records.
    const snapshot = parseMarsGeoJSON({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', lat: 50.01, lon: 67.04, country: 'Kazakhstan', id_plume: 'test-1', tile_date: '2026-03-01', ch4_fluxrate: 2500, feedback: 'Yes' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', lat: 50.01, lon: 67.04, id_plume: 'test-2', tile_date: '2026-04-01', ch4_fluxrate: 2000 } },
    ] });
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.sources[0].plumeCount).toBe(2);
    expect(snapshot.sources[0].feedback).toBe('Yes');
    expect(snapshot.sources[0].maxFluxKgHr).toBe(2500);
    expect(snapshot.sources[0].evidence.every(e => e.kind === 'detection')).toBe(true);
    expect(snapshot.sources[0].synthetic).toBe(false);
    const summary = getMarsDashboardSummary(snapshot.sources);
    expect(summary).toMatchObject({ sourceCount: 1, observationCount: 2, sourcesWithResponseMetadata: 1 });
    expect(summary.observationsByYear).toEqual({ '2026': 2 });
  });
  it('rejects unrelated FeatureCollections', () => {
    expect(() => parseMarsGeoJSON({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { source_name: 'unrelated', lat: 91, lon: 500 } }] })).toThrow();
  });

  it('keeps complete normalized history, unresolved plumes, and original timestamp metadata', () => {
    const observations = Array.from({ length: 72 }, (_, index) => ({
      plumeId: `plume-${index}`, sourceId: 'KAZ_S_136', linkStatus: 'linked',
      tileDate: `2024-${String(Math.floor(index / 6) + 1).padStart(2, '0')}-${String(index % 28 + 1).padStart(2, '0')}`,
      lat: 50.01, lon: 67.04, fluxKgHr: 1200 + index, fluxStdKgHr: 120,
      satellite: 'Sentinel-2', actionable: 'yes', notified: true, tile: '32RNR',
      windU: 1.5, windV: -2.5, windSpeed: 2.9,
      totalEmissionTonnes: 1.2, totalEmissionStdTonnes: 0.2,
      lastUpdate: '2024-12-31T00:00:00Z', insertDate: '2025-01-01T00:00:00Z',
      tileBackground: 'S2B_MSIL1C_scene-id', fluxUnit: 'kg/h', synthetic: false,
      raw: { ch4_fluxrate_std: '120' },
    }));
    observations.push({
      plumeId: 'unlinked-plume', sourceId: null, linkStatus: 'source_id_missing',
      tileDate: '2025-01-02', lat: 48, lon: 69, fluxKgHr: 800, fluxStdKgHr: null,
      synthetic: false, raw: { source_name: '' },
    });
    const snapshot = parseMarsGeoJSON({
      schemaVersion: 1, snapshotId: 'unep-mars-test1234567890',
      provenance: { dataset: 'Eye on Methane / MARS detected sources and plumes', retrievedAt: '2026-10-12T10:20:45+00:00', archiveSha256: 'a'.repeat(64), license: 'CC BY-NC-SA 4.0' },
      sources: [{ sourceId: 'KAZ_S_136', lon: 67.04, lat: 50.01, country: 'Kazakhstan', sector: 'Oil and gas', sourceType: 'Oil field', detectedPlumeCount: 80, feedback: 'Yes', synthetic: false }],
      plumes: observations,
    });
    expect(snapshot.sources[0].observations).toHaveLength(72);
    expect(snapshot.sources[0].observations?.[0].date).toBe('2024-01-01');
    expect(snapshot.sources[0].observations?.[71].raw?.ch4_fluxrate_std).toBe('120');
    expect(snapshot.unlinkedObservations).toHaveLength(1);
    expect(snapshot.unlinkedObservations?.[0].id).toBe('unlinked-plume');
    expect(snapshot.snapshotId).toBe('unep-mars-test1234567890');
    expect(snapshot.sources[0].detectedPlumeCount).toBe(80);
    expect(getMarsDashboardSummary(snapshot.sources, snapshot.unlinkedObservations)).toMatchObject({
      sourceCount: 1, linkedObservationCount: 72, unlinkedObservationCount: 1, observationCount: 73,
    });
  });

  it('loads the deterministic compressed static snapshot format', async () => {
    const payload = {
      dataset: 'UNEP MARS', sourceUrl: 'https://methanedata.unep.org/download-dataset',
      license: 'CC BY-NC-SA 4.0', importedAt: '2026-10-12T10:20:45+00:00',
      snapshotId: 'unep-mars-test1234567890', originalSourceCount: 1, plumeCount: 0,
      sources: [{ sourceId: 'KAZ_S_136', name: 'KAZ_S_136', region: 'Kazakhstan', lat: 50.01, lon: 67.04, synthetic: false, evidence: [], observations: [] }],
      unlinkedObservations: [],
    };
    const compressedStream = new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = await new Response(compressedStream).arrayBuffer();
    const parsed = await parseMarsGzip(bytes);
    expect(parsed.snapshotId).toBe('unep-mars-test1234567890');
    expect(parsed.sources).toHaveLength(1);
  });
  it('accepts browser-auto-decoded gzip responses as well as raw gzip files', async () => {
    const payload = {
      dataset: 'UNEP MARS', sourceUrl: 'https://methanedata.unep.org/download-dataset',
      license: 'CC BY-NC-SA 4.0', importedAt: '2026-10-12T10:20:45+00:00',
      snapshotId: 'unep-mars-decoded12345', originalSourceCount: 1, plumeCount: 0,
      sources: [{ sourceId: 'KAZ_S_136', name: 'KAZ_S_136', region: 'Kazakhstan', lat: 50.01, lon: 67.04, synthetic: false, evidence: [], observations: [] }],
      unlinkedObservations: [],
    };
    const alreadyDecoded = new TextEncoder().encode(JSON.stringify(payload));
    const parsed = await parseMarsGzip(alreadyDecoded);
    expect(parsed.snapshotId).toBe('unep-mars-decoded12345');
  });
  it('adds only curated casebook evidence to matching full-snapshot sources', () => {
    const snapshot = parseMarsGeoJSON({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', id_plume: 'full-1', tile_date: '2026-01-01', ch4_fluxrate: 1200 } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [70, 40] }, properties: { source_name: 'KAZ_S_999', id_plume: 'full-2', tile_date: '2026-01-02' } },
    ] });
    const curated = {
      ...snapshot.sources[0], caseId: 'MARS-CASE-KAZ-136',
      evidence: [{ id: 'full-1', kind: 'detection' as const, title: 'Curated source record', reference: 'https://example.org/source', synthetic: false }],
      externalEvidence: [{ title: 'Official report link', url: 'https://example.org/report', publisher: 'UNEP', license: 'CC BY-NC-ND 3.0 IGO', contentIncluded: false as const }],
    } as MarsSource;
    const merged = mergeCuratedCasebookEvidence(snapshot.sources, [curated]);
    expect(merged[0]).toMatchObject({ caseId: curated.caseId, evidence: curated.evidence, externalEvidence: curated.externalEvidence });
    expect(merged[0].observations).toEqual(snapshot.sources[0].observations);
    expect(merged[1].evidence).toEqual(snapshot.sources[1].evidence);
  });
  it('does not merge curated report links when their observation IDs are absent from the active snapshot', () => {
    const current = parseMarsGeoJSON({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', id_plume: 'current-plume', tile_date: '2026-09-01' } },
    ] });
    const olderCase = {
      ...current.sources[0], caseId: 'MARS-OLD-KAZ-136',
      evidence: [{ id: 'older-plume', kind: 'detection' as const, title: 'Older source record', reference: 'https://example.org/old', synthetic: false }],
      externalEvidence: [{ title: 'Older report', url: 'https://example.org/report', license: 'CC BY-NC-ND 3.0 IGO', contentIncluded: false as const }],
    } as MarsSource;

    const merged = mergeCuratedCasebookEvidence(current.sources, [olderCase]);

    expect(merged[0].caseId).toBeUndefined();
    expect(merged[0].evidence).toEqual(current.sources[0].evidence);
    expect(merged[0].externalEvidence).toBeUndefined();
  });

  it('loads every source and plume in the checked-in UNEP snapshot without inferring links', async () => {
    const compressed = await Bun.file(new URL('../public/data/mars-snapshot.json.gz', import.meta.url)).arrayBuffer();
    const parsed = await parseMarsGzip(compressed);
    expect(parsed.snapshotId).toBe('unep-mars-675417694883');
    expect(parsed.sources).toHaveLength(4218);
    expect(parsed.plumeCount).toBe(30414);
    expect(parsed.unlinkedObservations).toHaveLength(6553);
    expect(getMarsDashboardSummary(parsed.sources, parsed.unlinkedObservations)).toMatchObject({
      sourceCount: 4218,
      linkedObservationCount: 23861,
      unlinkedObservationCount: 6553,
      observationCount: 30414,
    });
    expect(parsed.plumeObservationDateRange).toEqual({ start: '2020-10-29', end: '2026-09-13' });
    expect(parsed.sources.find(source => source.sourceId === 'KAZ_S_159')?.observations?.length).toBeGreaterThan(0);
    const history = JSON.parse(await Bun.file(new URL('../public/data/mars-snapshot-history.json', import.meta.url)).text()) as {snapshots:Array<{snapshotId:string;archiveSha256:string}>};
    expect(history.snapshots).toHaveLength(4);
    expect(history.snapshots[history.snapshots.length - 1]).toMatchObject({ snapshotId: parsed.snapshotId, archiveSha256: parsed.provenance?.archiveSha256 });
  }, 30000);
});
