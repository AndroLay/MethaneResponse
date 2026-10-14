import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync, gzipSync } from 'node:zlib';
import { expect, test } from 'bun:test';
import {
  filterPlumeFootprints,
  decoratePlumeFootprintsForMap,
  getFluxFootprintColor,
  geometrySnapshotMatches,
  loadEvidencePlumeFootprint,
  loadMonthlyPlumeGeometry,
  PINNED_MARS_GEOMETRY_MANIFEST_SHA256,
  shouldLoadPlumeFootprints,
  toPlumeFootprintLocations,
  toPlumeObservationLocations,
  type PlumeGeometryManifest,
  type PlumeFootprintCollection,
} from './plume-geometries';
import { orderCasePublisherObservations } from './case-publisher-evidence';

const sourceArchiveSha256 = 'a'.repeat(64);
const geometryArchiveSha256 = 'b'.repeat(64);
const datasetId = `unep-mars-${sourceArchiveSha256.slice(0, 12)}`;
const footprint: PlumeFootprintCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature', id: 'plume-a',
    geometry: { type: 'MultiPolygon', coordinates: [[[[52, 43], [52.1, 43], [52.1, 43.1], [52, 43.1], [52, 43]]]] },
    properties: {
      plumeId: 'plume-a', sourceId: 'KAZ_S_159', observedAt: '2025-10-12T10:00:00',
      latitude: 43, longitude: 52, reportedFluxKgHr: 2400, reportedUncertaintyKgHr: 180,
      satellite: 'Sentinel-2', sector: 'Oil and Gas', country: 'Kazakhstan', notified: false, actionable: 'No',
    },
  }],
};
const compressed = gzipSync(Buffer.from(JSON.stringify(footprint)));
const shardSha256 = createHash('sha256').update(compressed).digest('hex');
const manifest: PlumeGeometryManifest = {
  schemaVersion: 1, datasetId, sourceArchiveSha256, geometryArchiveSha256,
  sourceRetrievedAt: '2026-10-12T10:20:45+00:00',
  retrievedAt: '2026-10-12T18:23:01.756954+00:00',
  upstreamLastModifiedAt: '2026-10-12T03:01:29+00:00',
  catalogUrl: 'https://methanedata.unep.org/download-dataset',
  downloadUrl: 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_geojson.zip',
  license: 'CC BY-NC-SA 4.0', attribution: 'UNEP IMEO Eye on Methane / MARS',
  geometryLimitation: 'Publisher GeoJSON shape; not a concentration surface.',
  inputPlumeCount: 1, geometryFeatureCount: 1, withoutGeometryCount: 0,
  observationMonths: ['2025-10', '2025-11'],
  months: {
    '2025-10': { file: '2025-10.geojson.gz', sha256: shardSha256, featureCount: 1, plumeRecordCount: 1, withoutGeometryCount: 0, compressedBytes: compressed.byteLength },
    '2025-11': { file: null, sha256: null, featureCount: 0, plumeRecordCount: 1, withoutGeometryCount: 1, compressedBytes: 0 },
  },
};
const fixtureManifestSha256 = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');

function createFetcher(index = manifest, shard = compressed) {
  return async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/index.json')) return new Response(JSON.stringify(index), { status: 200 });
    if (url.split('?')[0]?.endsWith('/2025-10.geojson.gz')) return new Response(shard, { status: 200 });
    return new Response('', { status: 404 });
  };
}

test('flux footprint colors use exact reported kg/h intervals and neutralize missing values', () => {
  expect(getFluxFootprintColor(null)).toBe('#91a9b2');
  expect(getFluxFootprintColor(Number.NaN)).toBe('#91a9b2');
  expect(getFluxFootprintColor(0)).toBe('#3978eb');
  expect(getFluxFootprintColor(99.99)).toBe('#3978eb');
  expect(getFluxFootprintColor(100)).toBe('#20d2d2');
  expect(getFluxFootprintColor(500)).toBe('#f3d14b');
  expect(getFluxFootprintColor(2000)).toBe('#f58b38');
  expect(getFluxFootprintColor(5000)).toBe('#ed4b43');
});

test('map context distinguishes the selected source from other linked and source-unlinked plume shapes', () => {
  const selected = footprint.features[0]!;
  const otherLinked = {
    ...selected,
    id: 'plume-other-linked',
    properties: { ...selected.properties, plumeId: 'plume-other-linked', sourceId: 'ARG_S_055' },
  };
  const sourceUnlinked = {
    ...selected,
    id: 'plume-source-unlinked',
    properties: { ...selected.properties, plumeId: 'plume-source-unlinked', sourceId: null },
  };
  const input: PlumeFootprintCollection = { ...footprint, features: [selected, otherLinked, sourceUnlinked] };

  const mapped = decoratePlumeFootprintsForMap(input, 'KAZ_S_159');

  expect(mapped.features.map(feature => [feature.properties.mapSourceLinked, feature.properties.mapSourceSelected])).toEqual([
    [1, 1], [1, 0], [0, 0],
  ]);
  expect(mapped.features[0]?.geometry).toBe(selected.geometry);
  expect('mapSourceLinked' in input.features[0]!.properties).toBe(false);
});

test('geometry artifacts must match both the exact MARS snapshot ID and CSV archive hash', () => {
  expect(geometrySnapshotMatches(manifest, datasetId, sourceArchiveSha256)).toBe(true);
  expect(geometrySnapshotMatches(manifest, 'unep-mars-other', sourceArchiveSha256)).toBe(false);
  expect(geometrySnapshotMatches(manifest, datasetId, 'c'.repeat(64))).toBe(false);
});

test('tracked full-archive index and the latest real geometry month verify in the browser loader', async () => {
  const basePath = new URL('../public/data/mars-plume-geometries/', import.meta.url);
  const indexBytes = await readFile(new URL('index.json', basePath));
  expect(createHash('sha256').update(indexBytes).digest('hex')).toBe(PINNED_MARS_GEOMETRY_MANIFEST_SHA256);
  const latestShard = await readFile(new URL('2026-09.geojson.gz', basePath));
  const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/index.json')
    ? new Response(indexBytes)
    : new Response(latestShard);
  const loaded = await loadMonthlyPlumeGeometry({
    month: '2026-09',
    expectedSnapshotId: 'unep-mars-675417694883',
    expectedSourceArchiveSha256: '675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43',
    fetchImpl,
  });

  expect(loaded.collection.features).toHaveLength(408);
  expect(loaded.collection.features[0]?.properties.observedAt.slice(0, 7)).toBe('2026-09');
});

test('loads a real source-selected MARS footprint and checks it against the exact plume record', async () => {
  const snapshotBytes = await readFile(new URL('../public/data/mars-snapshot.json.gz', import.meta.url));
  const snapshot = JSON.parse(gunzipSync(snapshotBytes).toString('utf8')) as {
    sources: Array<{ sourceId: string; observations: Array<{ id: string; date: string; lat?: number; lon?: number; fluxKgHr: number | null; uncertaintyKgHr?: number | null }> }>;
  };
  const source = snapshot.sources.find(item => item.sourceId === 'KAZ_S_159')!;
  const observation = source.observations.at(-1)!;
  const shardBytes = await readFile(new URL('../public/data/mars-plume-geometries/2026-07.geojson.gz', import.meta.url));
  const indexBytes = await readFile(new URL('../public/data/mars-plume-geometries/index.json', import.meta.url));
  const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/index.json')
    ? new Response(indexBytes)
    : new Response(shardBytes);

  const options = {
    month: observation.date.slice(0, 7), plumeId: observation.id, sourceId: source.sourceId,
    observedAt: observation.date, latitude: observation.lat, longitude: observation.lon,
    reportedFluxKgHr: observation.fluxKgHr, reportedUncertaintyKgHr: observation.uncertaintyKgHr ?? null,
    expectedSnapshotId: 'unep-mars-675417694883',
    expectedSourceArchiveSha256: '675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43',
    fetchImpl,
  };
  const result = await loadEvidencePlumeFootprint(options);

  expect(result?.properties).toMatchObject({
    plumeId: observation.id, sourceId: 'KAZ_S_159', observedAt: observation.date,
    latitude: observation.lat, longitude: observation.lon,
    reportedFluxKgHr: observation.fluxKgHr, reportedUncertaintyKgHr: observation.uncertaintyKgHr,
  });
  await expect(loadEvidencePlumeFootprint({ ...options, reportedFluxKgHr: (observation.fluxKgHr || 0) + 1 }))
    .rejects.toThrow('does not match the selected MARS observation record');
});

test('the pinned MARS geometry archive covers every linked observation in every global source case', async () => {
  const dataRoot = new URL('../public/data/', import.meta.url);
  const snapshotCompressed = await readFile(new URL('mars-snapshot.json.gz', dataRoot));
  const snapshot = JSON.parse(gunzipSync(snapshotCompressed).toString('utf8')) as {
    snapshotId: string; provenance?: { archiveSha256?: string };
    sources: Array<{ sourceId: string; observations: Array<{ id: string; date: string; fluxKgHr: number | null; uncertaintyKgHr?: number | null }> }>;
  };
  const indexBytes = await readFile(new URL('mars-plume-geometries/index.json', dataRoot));
  expect(createHash('sha256').update(indexBytes).digest('hex')).toBe(PINNED_MARS_GEOMETRY_MANIFEST_SHA256);
  const index = JSON.parse(indexBytes.toString('utf8')) as PlumeGeometryManifest;
  expect(geometrySnapshotMatches(index, snapshot.snapshotId, snapshot.provenance?.archiveSha256 || '')).toBe(true);

  const shapeIds = new Set<string>();
  const shapeSources = new Set<string>();
  for (const [month, entry] of Object.entries(index.months)) {
    if (!entry.file) {
      expect(entry.featureCount).toBe(0);
      continue;
    }
    const compressedMonth = await readFile(new URL(`mars-plume-geometries/${entry.file}`, dataRoot));
    expect(createHash('sha256').update(compressedMonth).digest('hex')).toBe(entry.sha256);
    const shard = JSON.parse(gunzipSync(compressedMonth).toString('utf8')) as PlumeFootprintCollection;
    expect(shard.features).toHaveLength(entry.featureCount);
    for (const feature of shard.features) {
      expect(feature.properties.observedAt.slice(0, 7)).toBe(month);
      expect(shapeIds.has(feature.properties.plumeId)).toBe(false);
      shapeIds.add(feature.properties.plumeId);
      if (feature.properties.sourceId) shapeSources.add(feature.properties.sourceId);
    }
  }

  const linked = snapshot.sources.flatMap(source => source.observations.map(observation => observation.id));
  expect(snapshot.sources).toHaveLength(4218);
  expect(linked).toHaveLength(23861);
  expect(snapshot.sources.every(source => source.observations.some(observation => shapeIds.has(observation.id)))).toBe(true);
  expect(snapshot.sources.every(source => {
    const latest = orderCasePublisherObservations(source.observations)[0];
    return latest !== undefined && shapeIds.has(latest.id);
  })).toBe(true);
  expect(linked.every(id => shapeIds.has(id))).toBe(true);
  expect(shapeSources.size).toBeGreaterThanOrEqual(snapshot.sources.length);
});

test('reports a publisher record without geometry as missing instead of creating a footprint', async () => {
  const feature = await loadEvidencePlumeFootprint({
    month: '2025-11', plumeId: 'plume-no-shape', sourceId: 'KAZ_S_159', observedAt: '2025-11-02T12:00:00Z',
    reportedFluxKgHr: null, reportedUncertaintyKgHr: null,
    expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl: createFetcher(),
  });
  expect(feature).toBeNull();
});

test('publisher geometry shards stay unloaded on the adaptive low-power rendering tier', () => {
  expect(shouldLoadPlumeFootprints('low')).toBe(false);
  expect(shouldLoadPlumeFootprints('medium')).toBe(true);
  expect(shouldLoadPlumeFootprints('high')).toBe(true);
});

test('monthly footprint loader verifies the gzip bytes before parsing publisher geometry', async () => {
  const result = await loadMonthlyPlumeGeometry({
    month: '2025-10', expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl: createFetcher(),
  });

  expect(result.collection.features).toHaveLength(1);
  expect(result.collection.features[0]).toMatchObject({ id: 'plume-a', geometry: footprint.features[0]?.geometry });
  expect(result.manifest.geometryArchiveSha256).toBe(geometryArchiveSha256);
});

test('monthly footprint loader accepts a browser-decoded representation only when its manifest digest matches', async () => {
  const decoded = Buffer.from(JSON.stringify(footprint));
  const decodedManifest = {
    ...manifest,
    months: {
      ...manifest.months,
      '2025-10': {
        ...manifest.months['2025-10']!,
        uncompressedBytes: decoded.byteLength,
        uncompressedSha256: createHash('sha256').update(decoded).digest('hex'),
      },
    },
  };
  const indexBytes = Buffer.from(JSON.stringify(decodedManifest));
  const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/index.json')
    ? new Response(indexBytes)
    : new Response(decoded, { headers: { 'content-encoding': 'gzip' } });

  const result = await loadMonthlyPlumeGeometry({
    month: '2025-10', expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: createHash('sha256').update(indexBytes).digest('hex'), fetchImpl,
  });

  expect(result.collection.features).toHaveLength(1);
  expect(result.collection.features[0]?.properties.plumeId).toBe('plume-a');
});

test('monthly footprint loader rejects a changed compressed artifact before JSON is trusted', async () => {
  await expect(loadMonthlyPlumeGeometry({
    month: '2025-10', expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl: createFetcher(manifest, gzipSync(Buffer.from('{"tampered":true}'))),
  })).rejects.toThrow(/integrity/i);
});

test('monthly footprint loader abstains when its archive does not match the active dataset', async () => {
  await expect(loadMonthlyPlumeGeometry({
    month: '2025-10', expectedSnapshotId: 'unep-mars-other', expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl: createFetcher(),
  })).rejects.toThrow(/does not match/i);
});

test('a month with no published polygons stays empty and does not fetch a missing file', async () => {
  let shardRequests = 0;
  const fetchImpl = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/index.json')) return new Response(JSON.stringify(manifest), { status: 200 });
    shardRequests += 1;
    return new Response('', { status: 404 });
  };

  const result = await loadMonthlyPlumeGeometry({
    month: '2025-11', expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl,
  });

  expect(result.collection.features).toEqual([]);
  expect(shardRequests).toBe(0);
});

test('monthly loader rejects an altered index before trusting its shard hashes', async () => {
  const changedManifest = { ...manifest, attribution: 'altered attribution' };
  let shardRequests = 0;
  const fetchImpl = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/index.json')) return new Response(JSON.stringify(changedManifest), { status: 200 });
    shardRequests += 1;
    return new Response(compressed, { status: 200 });
  };

  await expect(loadMonthlyPlumeGeometry({
    month: '2025-10', expectedSnapshotId: datasetId, expectedSourceArchiveSha256: sourceArchiveSha256,
    expectedManifestSha256: fixtureManifestSha256,
    fetchImpl,
  })).rejects.toThrow(/pinned SHA-256/i);
  expect(shardRequests).toBe(0);
});

test('visible footprint filtering follows observation IDs without changing raw geometry or flux', () => {
  const result = filterPlumeFootprints(footprint, [{ id: 'plume-a' }, { id: 'other-plume' }]);

  expect(result.features).toHaveLength(1);
  expect(result.features[0]?.geometry).toEqual(footprint.features[0]?.geometry);
  expect(result.features[0]?.properties.reportedFluxKgHr).toBe(2400);
});

test('global zoom markers use the publisher-reported coordinate, not a derived source assignment', () => {
  const result = toPlumeFootprintLocations(footprint);

  expect(result.features).toHaveLength(1);
  expect(result.features[0]?.geometry).toEqual({ type: 'Point', coordinates: [52, 43] });
  expect(result.features[0]?.properties).toMatchObject({ plumeId: 'plume-a', sourceId: 'KAZ_S_159' });
});

test('monthly observation locations include records without polygon geometry and preserve unknown versus zero flux', () => {
  const observations = [
    { id: 'plume-a', sourceId: 'KAZ_S_159', date: '2025-10-12', fluxKgHr: 2400, uncertaintyKgHr: 180, lat: 43, lon: 52 },
    { id: 'plume-no-shape', sourceId: null, date: '2025-10-15', fluxKgHr: null, lat: 44, lon: 53 },
    { id: 'plume-zero', sourceId: null, date: '2025-10-18', fluxKgHr: 0, lat: 45, lon: 54 },
    { id: 'other-month', date: '2025-11-01', fluxKgHr: 900, lat: 46, lon: 55 },
    { id: 'invalid-coordinate', date: '2025-10-20', fluxKgHr: 900, lat: 95, lon: 55 },
  ];
  const result = toPlumeObservationLocations(observations, footprint, '2025-10');

  expect(result.features).toHaveLength(3);
  expect(result.features[0]).toMatchObject({
    id: 'plume-a', geometry: { type: 'Point', coordinates: [52, 43] },
    properties: { plumeId: 'plume-a', hasGeometry: 1, reportedFluxKgHr: 2400, reportedUncertaintyKgHr: 180, sourceId: 'KAZ_S_159' },
  });
  expect(result.features[1]?.properties).toMatchObject({ plumeId: 'plume-no-shape', hasGeometry: 0, reportedFluxKgHr: null, sourceId: null });
  expect(result.features[2]?.properties).toMatchObject({ plumeId: 'plume-zero', hasGeometry: 0, reportedFluxKgHr: 0 });
  expect(toPlumeObservationLocations(observations, { type: 'FeatureCollection', features: [] }, '2025-10', false)
    .features[0]?.properties.hasGeometry).toBeNull();
});
