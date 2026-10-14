import { gzipSync } from 'node:zlib';
import { expect, test } from 'bun:test';
import type { MarsSnapshotManifest } from './mars-snapshot-integrity';
import { loadVerifiedObservationBucket, loadVerifiedProgressiveCatalog, type ProgressiveMarsManifest } from './progressive-mars-loader';

const snapshotId = 'unep-mars-progressive1234';
const basePath = 'https://test.local/data';
const archiveSha256 = 'a'.repeat(64);
const inputFileSha256 = 'b'.repeat(64);
const decodedContentSha256 = 'c'.repeat(64);
const bytes = new TextEncoder();

type Artifact = { decoded: Uint8Array; compressed: Uint8Array; compressedSha256: string; decodedSha256: string };

async function sha256(value: Uint8Array): Promise<string> {
  const data = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), item => item.toString(16).padStart(2, '0')).join('');
}

async function artifact(value: unknown): Promise<Artifact> {
  const decoded = bytes.encode(JSON.stringify(value));
  const compressed = new Uint8Array(gzipSync(decoded, { mtime: 0 }));
  return { decoded, compressed, compressedSha256: await sha256(compressed), decodedSha256: await sha256(decoded) };
}

function sourceBucket(sourceId: string, bucketCount: number) {
  return crypto.subtle.digest('SHA-256', bytes.encode(sourceId)).then(digest => `${new Uint8Array(digest)[0]! % bucketCount}`.padStart(3, '0'));
}

async function fixture() {
  const fullManifest: MarsSnapshotManifest = {
    schemaVersion: 1, datasetSnapshotId: snapshotId, sourceArchiveSha256: archiveSha256,
    inputFileSha256, decodedContentSha256, sourceCount: 2, plumeCount: 4,
  };
  const bucketCount = 4;
  const linked = [
    { id: 'p-1', sourceId: 'KAZ_S_136', linkStatus: 'linked' as const, date: '2024-01-01', fluxKgHr: 10, uncertaintyKgHr: 1 },
    { id: 'p-2', sourceId: 'KAZ_S_136', linkStatus: 'linked' as const, date: '2025-01-01', fluxKgHr: null, uncertaintyKgHr: null },
    { id: 'p-3', sourceId: 'ARG_S_001', linkStatus: 'linked' as const, date: '2026-01-01', fluxKgHr: 0, uncertaintyKgHr: 0 },
  ];
  const unresolved = { id: 'p-4', sourceId: null, linkStatus: 'source_id_missing' as const, date: '2025-06-01', fluxKgHr: 20, uncertaintyKgHr: 2 };
  const catalog = {
    dataset: 'UNEP MARS', schemaVersion: 1, snapshotId, sourceUrl: 'https://methanedata.unep.org/download-dataset',
    license: 'CC BY-NC-SA 4.0', importedAt: '2026-10-12T00:00:00Z',
    provenance: { archiveSha256 }, counts: { sources: 2, mappedSources: 2, plumes: 4, linkedPlumes: 3, unlinkedPlumes: 1 },
    plumeObservationDateRange: { start: '2024-01-01', end: '2026-01-01' }, lastObserved: '2026-01-01',
    plumeCount: 4, originalSourceCount: 2, unlinkedObservations: [], unlinkedObservationCount: 1,
    observationsByYear: { '2024': 1, '2025': 2, '2026': 1 },
    sources: [
      { sourceId: 'ARG_S_001', name: 'ARG_S_001', region: 'Argentina', lat: -38, lon: -69, country: 'Argentina', sector: 'Oil and gas', synthetic: false, evidence: [], plumeCount: 1, maxFluxKgHr: 0, observationDates: ['2026-01-01'], historyBucketId: await sourceBucket('ARG_S_001', bucketCount) },
      { sourceId: 'KAZ_S_136', name: 'KAZ_S_136', region: 'Kazakhstan', lat: 50, lon: 67, country: 'Kazakhstan', sector: 'Oil and gas', synthetic: false, evidence: [], plumeCount: 2, maxFluxKgHr: 10, observationDates: ['2024-01-01', '2025-01-01'], historyBucketId: await sourceBucket('KAZ_S_136', bucketCount) },
    ],
  };
  const catalogArtifact = await artifact(catalog);
  const buckets = new Map<string, { sources: Array<{ sourceId: string; observations: typeof linked }>; unlinkedObservations: typeof unresolved[] }>();
  for (let index = 0; index < bucketCount; index++) buckets.set(`${index}`.padStart(3, '0'), { sources: [], unlinkedObservations: [] });
  for (const sourceId of ['KAZ_S_136', 'ARG_S_001']) {
    const id = await sourceBucket(sourceId, bucketCount);
    const observations = linked.filter(row => row.sourceId === sourceId);
    if (observations.length) buckets.get(id)!.sources.push({ sourceId, observations });
  }
  const unresolvedBucket = await sourceBucket(unresolved.id, bucketCount);
  buckets.get(unresolvedBucket)!.unlinkedObservations.push(unresolved);

  const bucketArtifacts = new Map<string, Artifact>();
  const manifestBuckets: ProgressiveMarsManifest['buckets'] = [];
  for (const [id, payload] of buckets) {
    const fullPayload = {
      dataset: 'UNEP MARS', schemaVersion: 1, snapshotId, sourceArchiveSha256: archiveSha256,
      bucketId: id, sources: payload.sources, unlinkedObservations: payload.unlinkedObservations,
      counts: {
        sources: payload.sources.length,
        linkedPlumes: payload.sources.reduce((total, source) => total + source.observations.length, 0),
        unlinkedPlumes: payload.unlinkedObservations.length,
        plumes: payload.sources.reduce((total, source) => total + source.observations.length, 0) + payload.unlinkedObservations.length,
      },
    };
    const output = await artifact(fullPayload);
    bucketArtifacts.set(id, output);
    manifestBuckets.push({
      id, file: `mars-observation-buckets/${id}.json.gz`, sourceCount: payload.sources.length,
      linkedObservationCount: fullPayload.counts.linkedPlumes, unlinkedObservationCount: payload.unlinkedObservations.length,
      compressedSha256: output.compressedSha256, decodedSha256: output.decodedSha256,
      compressedBytes: output.compressed.length, decodedBytes: output.decoded.length,
    });
  }
  const progressiveManifest: ProgressiveMarsManifest = {
    schemaVersion: 1, datasetSnapshotId: snapshotId, sourceArchiveSha256: archiveSha256,
    inputFileSha256, decodedContentSha256, sourceCount: 2, plumeCount: 4,
    linkedObservationCount: 3, unlinkedObservationCount: 1,
    observationsByYear: { '2024': 1, '2025': 2, '2026': 1 },
    bucketAlgorithm: 'sha256-first-byte-modulo', bucketCount,
    catalog: {
      file: 'mars-source-catalog.json.gz', sourceCount: 2, unlinkedObservationCount: 1,
      compressedSha256: catalogArtifact.compressedSha256, decodedSha256: catalogArtifact.decodedSha256,
      compressedBytes: catalogArtifact.compressed.length, decodedBytes: catalogArtifact.decoded.length,
    },
    buckets: manifestBuckets,
  };
  const fullManifestBytes = bytes.encode(JSON.stringify(fullManifest));
  const progressiveManifestBytes = bytes.encode(JSON.stringify(progressiveManifest));
  const fetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/mars-snapshot-manifest.json')) return new Response(fullManifestBytes, { status: 200 });
    if (url.pathname.endsWith('/mars-progressive-manifest.json')) return new Response(progressiveManifestBytes, { status: 200 });
    if (url.pathname.endsWith('/mars-source-catalog.json.gz')) return new Response(catalogArtifact.compressed, { status: 200 });
    const bucketId = /\/mars-observation-buckets\/(\d{3})\.json\.gz$/.exec(url.pathname)?.[1];
    if (bucketId) {
      const value = bucketArtifacts.get(bucketId);
      if (value) return new Response(value.compressed, { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };
  return { fullManifest, progressiveManifest, catalog, catalogArtifact, bucketArtifacts, fetcher };
}

test('loads a hash-verified catalog and source history bucket without exposing partial records', async () => {
  const data = await fixture();
  const loaded = await loadVerifiedProgressiveCatalog(data.fetcher, basePath, data.fullManifest);
  const bucketId = await sourceBucket('KAZ_S_136', data.progressiveManifest.bucketCount);
  const bucket = await loadVerifiedObservationBucket(data.fetcher, basePath, data.fullManifest, loaded.manifest, loaded.catalog, bucketId);

  expect(loaded.catalog.snapshotId).toBe(snapshotId);
  expect(loaded.catalog.sources).toHaveLength(2);
  expect(loaded.catalog.sources.every(source => !('observations' in source))).toBe(true);
  expect(bucket.sources.get('KAZ_S_136')?.map(row => row.id)).toEqual(['p-1', 'p-2']);
  expect(bucket.sources.has('ARG_S_001')).toBe(
    await sourceBucket('ARG_S_001', loaded.manifest.bucketCount) === bucketId,
  );
  const unresolvedBucket = await sourceBucket('p-4', data.progressiveManifest.bucketCount);
  expect(bucket.unlinkedObservations.map(row => row.id)).toEqual(unresolvedBucket === bucketId ? ['p-4'] : []);
  const expectedLinked = 2 + (await sourceBucket('ARG_S_001', loaded.manifest.bucketCount) === bucketId ? 1 : 0);
  expect(bucket.counts.linkedPlumes).toBe(expectedLinked);
});

test('accepts a server-decoded catalog only when its decoded digest and byte count match', async () => {
  const data = await fixture();
  const decodedFetcher = async (input: RequestInfo | URL) => {
    const response = await data.fetcher(input);
    const url = new URL(String(input));
    if (url.pathname.endsWith('.json.gz') && response.status === 200) {
      const artifactValue = url.pathname.endsWith('mars-source-catalog.json.gz')
        ? data.catalogArtifact
        : data.bucketArtifacts.get(/\/(\d{3})\.json\.gz$/.exec(url.pathname)?.[1] || '');
      if (artifactValue) return new Response(artifactValue.decoded, { status: 200 });
    }
    return response;
  };
  const loaded = await loadVerifiedProgressiveCatalog(decodedFetcher, basePath, data.fullManifest);

  expect(loaded.catalog.sources).toHaveLength(2);
  const id = await sourceBucket('ARG_S_001', loaded.manifest.bucketCount);
  expect((await loadVerifiedObservationBucket(decodedFetcher, basePath, data.fullManifest, loaded.manifest, loaded.catalog, id)).sources.get('ARG_S_001')?.[0]?.fluxKgHr).toBe(0);
});

test('rejects progressive data whose full snapshot binding does not match', async () => {
  const data = await fixture();
  await expect(loadVerifiedProgressiveCatalog(data.fetcher, basePath, { ...data.fullManifest, inputFileSha256: 'd'.repeat(64) }))
    .rejects.toThrow('full snapshot binding');
});

test('propagates cancellation to an in-flight progressive manifest request', async () => {
  const data = await fixture();
  const controller = new AbortController();
  let requestSignal: AbortSignal | undefined;
  const pendingFetcher = (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    requestSignal = init?.signal ?? undefined;
    if (!requestSignal) {
      reject(new Error('progressive manifest request did not receive the cancellation signal'));
      return;
    }
    if (requestSignal.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    requestSignal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')), { once: true });
  });

  const pending = loadVerifiedProgressiveCatalog(pendingFetcher, basePath, data.fullManifest, controller.signal);
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(requestSignal?.aborted).toBe(true);
});

test('rejects tampered bucket bytes and a correctly rehashed bucket that omits catalog rows', async () => {
  const data = await fixture();
  const loaded = await loadVerifiedProgressiveCatalog(data.fetcher, basePath, data.fullManifest);
  const bucketId = await sourceBucket('KAZ_S_136', data.progressiveManifest.bucketCount);
  const tamperedFetcher = async (input: RequestInfo | URL) => {
    const response = await data.fetcher(input);
    const url = new URL(String(input));
    if (url.pathname.endsWith(`/${bucketId}.json.gz`)) return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    return response;
  };
  await expect(loadVerifiedObservationBucket(tamperedFetcher, basePath, data.fullManifest, loaded.manifest, loaded.catalog, bucketId))
    .rejects.toThrow('digest');

  const wrongBucketId = await sourceBucket('KAZ_S_136', data.progressiveManifest.bucketCount);
  const originalEntry = loaded.manifest.buckets.find(item => item.id === wrongBucketId)!;
  const wrongPayload = {
    dataset: 'UNEP MARS', schemaVersion: 1, snapshotId, sourceArchiveSha256: archiveSha256,
    bucketId: wrongBucketId, sources: [{ sourceId: 'KAZ_S_136', observations: [{ id: 'p-1', sourceId: 'KAZ_S_136', linkStatus: 'linked', date: '2024-01-01', fluxKgHr: 10, uncertaintyKgHr: 1 }] }],
    unlinkedObservations: [], counts: { sources: 1, linkedPlumes: 1, unlinkedPlumes: 0, plumes: 1 },
  };
  const wrongArtifact = await artifact(wrongPayload);
  const updatedManifest: ProgressiveMarsManifest = {
    ...loaded.manifest,
    buckets: loaded.manifest.buckets.map(item => item.id === wrongBucketId ? {
      ...item, compressedSha256: wrongArtifact.compressedSha256,
      decodedSha256: wrongArtifact.decodedSha256, compressedBytes: wrongArtifact.compressed.length,
      decodedBytes: wrongArtifact.decoded.length,
    } : item),
  };
  const expectedBucketLinked = 2 + (await sourceBucket('ARG_S_001', loaded.manifest.bucketCount) === wrongBucketId ? 1 : 0);
  expect(originalEntry.linkedObservationCount).toBe(expectedBucketLinked);
  const missingRowFetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith(`/${wrongBucketId}.json.gz`)) return new Response(wrongArtifact.compressed, { status: 200 });
    return data.fetcher(input);
  };
  await expect(loadVerifiedObservationBucket(missingRowFetcher, basePath, data.fullManifest, updatedManifest, loaded.catalog, wrongBucketId))
    .rejects.toThrow('catalog history count');
});

test('rejects an oversized manifest before requesting catalog bytes', async () => {
  const data = await fixture();
  let catalogRequested = false;
  const oversizedFetcher = async (input: RequestInfo | URL) => {
    if (String(input).endsWith('mars-progressive-manifest.json')) return new Response(' '.repeat(300_000), { status: 200 });
    if (String(input).endsWith('mars-source-catalog.json.gz')) catalogRequested = true;
    return data.fetcher(input);
  };

  await expect(loadVerifiedProgressiveCatalog(oversizedFetcher, basePath, data.fullManifest)).rejects.toThrow('response exceeds');
  expect(catalogRequested).toBe(false);
});

test('rejects a catalog response larger than either declared artifact representation before reading it', async () => {
  const data = await fixture();
  const oversizedFetcher = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('mars-source-catalog.json.gz')) {
      const oversizedBytes = new Uint8Array(Math.max(data.catalogArtifact.compressed.length, data.catalogArtifact.decoded.length) + 1);
      return new Response(oversizedBytes, { status: 200, headers: { 'content-length': String(oversizedBytes.length) } });
    }
    return data.fetcher(input);
  };

  await expect(loadVerifiedProgressiveCatalog(oversizedFetcher, basePath, data.fullManifest)).rejects.toThrow('response exceeds');
});
