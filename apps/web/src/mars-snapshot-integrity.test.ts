import { expect, test } from 'bun:test';
import { gzipSync } from 'node:zlib';
import { parseVerifiedMarsSnapshot, type MarsSnapshotManifest } from './mars-snapshot-integrity';

const archiveSha256 = 'a'.repeat(64);
const snapshotObject = {
  dataset: 'UNEP MARS', schemaVersion: 1, snapshotId: 'unep-mars-test123456',
  sourceUrl: 'https://methanedata.unep.org/download-dataset', license: 'CC BY-NC-SA 4.0', importedAt: '2026-10-12T00:00:00Z',
  counts: { sources: 1, mappedSources: 1, plumes: 0, linkedPlumes: 0, unlinkedPlumes: 0 },
  plumeCount: 0, provenance: { archiveSha256, snapshotId: 'unep-mars-test123456' }, sources: [
    { sourceId: 'KAZ_S_159', name: 'KAZ_S_159', region: 'Kazakhstan', lat: 43.41, lon: 52.92, synthetic: false, observations: [], evidence: [] },
  ], unlinkedObservations: [],
};
const jsonBytes = new TextEncoder().encode(JSON.stringify(snapshotObject));
const toHex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const hash = async (bytes: Uint8Array) => toHex(await crypto.subtle.digest('SHA-256', bytes as BufferSource));

test('verifies browser-decoded snapshot bytes and binds the server input-file hash', async () => {
  const inputFileSha256 = 'b'.repeat(64);
  const manifest: MarsSnapshotManifest = {
    schemaVersion: 1, datasetSnapshotId: snapshotObject.snapshotId, sourceArchiveSha256: archiveSha256,
    inputFileSha256, decodedContentSha256: await hash(jsonBytes), sourceCount: 1, plumeCount: 0,
  };
  const snapshot = await parseVerifiedMarsSnapshot(jsonBytes.buffer, manifest);

  expect(snapshot.snapshotId).toBe(snapshotObject.snapshotId);
  expect(snapshot.provenance?.webSnapshotInputSha256).toBe(inputFileSha256);
  expect(snapshot.sources[0]?.sourceId).toBe('KAZ_S_159');
});

test('verifies compressed bytes when the browser does not transparently decode the asset', async () => {
  const compressedBytes = gzipSync(jsonBytes, { mtime: 0 });
  const manifest: MarsSnapshotManifest = {
    schemaVersion: 1, datasetSnapshotId: snapshotObject.snapshotId, sourceArchiveSha256: archiveSha256,
    inputFileSha256: await hash(compressedBytes), decodedContentSha256: await hash(jsonBytes), sourceCount: 1, plumeCount: 0,
  };
  const snapshot = await parseVerifiedMarsSnapshot(compressedBytes.buffer.slice(compressedBytes.byteOffset, compressedBytes.byteOffset + compressedBytes.byteLength), manifest);

  expect(snapshot.provenance?.webSnapshotInputSha256).toBe(manifest.inputFileSha256);
});

test('rejects changed content and dataset provenance before exposing a snapshot', async () => {
  const manifest: MarsSnapshotManifest = {
    schemaVersion: 1, datasetSnapshotId: snapshotObject.snapshotId, sourceArchiveSha256: archiveSha256,
    inputFileSha256: 'b'.repeat(64), decodedContentSha256: await hash(jsonBytes), sourceCount: 1, plumeCount: 0,
  };
  const changedBytes = new TextEncoder().encode(JSON.stringify({ ...snapshotObject, sources: [] }));
  await expect(parseVerifiedMarsSnapshot(changedBytes.buffer, manifest)).rejects.toThrow('content hash');
  await expect(parseVerifiedMarsSnapshot(jsonBytes.buffer, { ...manifest, datasetSnapshotId: 'unep-mars-other123456' })).rejects.toThrow('snapshot ID');
  await expect(parseVerifiedMarsSnapshot(jsonBytes.buffer, { ...manifest, sourceArchiveSha256: 'c'.repeat(64) })).rejects.toThrow('archive hash');
});
