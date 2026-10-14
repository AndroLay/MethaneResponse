import { expect, test } from 'bun:test';
import { parseVerifiedMarsSnapshot, type MarsSnapshotManifest } from './mars-snapshot-integrity';
import { loadVerifiedMarsSnapshot, type SnapshotWorkerLike } from './mars-snapshot-loader';

const archiveSha256 = 'a'.repeat(64);
const snapshotInput = {
  dataset: 'UNEP MARS', schemaVersion: 1, snapshotId: 'unep-mars-worker123456',
  sourceUrl: 'https://methanedata.unep.org/download-dataset', license: 'CC BY-NC-SA 4.0', importedAt: '2026-10-12T00:00:00Z',
  counts: { sources: 1, mappedSources: 1, plumes: 0, linkedPlumes: 0, unlinkedPlumes: 0 },
  plumeCount: 0, provenance: { archiveSha256, snapshotId: 'unep-mars-worker123456' }, sources: [
    { sourceId: 'KAZ_S_159', name: 'KAZ_S_159', region: 'Kazakhstan', lat: 43.41, lon: 52.92, synthetic: false, observations: [], evidence: [] },
  ], unlinkedObservations: [],
};
const snapshotBytes = new TextEncoder().encode(JSON.stringify(snapshotInput));
const bytes = snapshotBytes.buffer.slice(snapshotBytes.byteOffset, snapshotBytes.byteOffset + snapshotBytes.byteLength);
const snapshotDigest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
const manifest: MarsSnapshotManifest = {
  schemaVersion: 1,
  datasetSnapshotId: snapshotInput.snapshotId,
  sourceArchiveSha256: archiveSha256,
  inputFileSha256: snapshotDigest,
  decodedContentSha256: snapshotDigest,
  sourceCount: 1,
  plumeCount: 0,
};
class ReplyingWorker implements SnapshotWorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  terminated = false;
  transferred: Transferable[] = [];
  constructor(private readonly reply: 'valid' | 'invalid' | 'crash' | 'gap') {}
  postMessage(message: unknown, transfer: Transferable[] = []) {
    this.transferred = transfer;
    const request = message as { bytes: ArrayBuffer; manifest: unknown };
    if (this.reply === 'crash') {
      queueMicrotask(() => this.onerror?.({ message: 'worker crashed' } as ErrorEvent));
      return;
    }
    if (this.reply === 'invalid') {
      queueMicrotask(() => this.onmessage?.({ data: { type: 'error', error: 'snapshot content hash does not match' } } as MessageEvent));
      return;
    }
    queueMicrotask(async () => {
      try {
        const snapshot = await parseVerifiedMarsSnapshot(request.bytes, request.manifest);
        const { sources, unlinkedObservations = [], ...metadata } = snapshot;
        this.onmessage?.({ data: { type: 'start', metadata } } as MessageEvent);
        if (this.reply === 'gap') {
          this.onmessage?.({ data: { type: 'sources', offset: 1, sources } } as MessageEvent);
          return;
        }
        for (let offset = 0; offset < sources.length; offset += 64) {
          this.onmessage?.({ data: { type: 'sources', offset, sources: sources.slice(offset, offset + 64) } } as MessageEvent);
        }
        for (let offset = 0; offset < unlinkedObservations.length; offset += 512) {
          this.onmessage?.({ data: { type: 'unlinked', offset, observations: unlinkedObservations.slice(offset, offset + 512) } } as MessageEvent);
        }
        this.onmessage?.({ data: { type: 'complete' } } as MessageEvent);
      } catch (error) {
        this.onmessage?.({ data: { type: 'error', error: error instanceof Error ? error.message : 'parse failed' } } as MessageEvent);
      }
    });
  }
  terminate() { this.terminated = true; }
}

test('uses a transferable byte copy so worker parsing preserves fallback bytes and all dataset rows', async () => {
  const worker = new ReplyingWorker('valid');
  const before = bytes.slice(0);
  const snapshot = await loadVerifiedMarsSnapshot(bytes, manifest, { createWorker: () => worker });

  expect(worker.transferred).toHaveLength(1);
  expect(worker.transferred[0]).toBeInstanceOf(ArrayBuffer);
  expect(bytes.byteLength).toBe(before.byteLength);
  expect(new Uint8Array(bytes)).toEqual(new Uint8Array(before));
  expect(worker.terminated).toBe(true);
  expect(snapshot.sources.map(source => source.sourceId)).toEqual(['KAZ_S_159']);
  expect(snapshot.provenance?.webSnapshotInputSha256).toBe(manifest.inputFileSha256);
});

test('falls back to the verified main-thread parser when the worker crashes', async () => {
  const worker = new ReplyingWorker('crash');
  const snapshot = await loadVerifiedMarsSnapshot(bytes, manifest, { createWorker: () => worker });

  expect(worker.terminated).toBe(true);
  expect(snapshot.snapshotId).toBe(snapshotInput.snapshotId);
});

test('falls back to the verified parser rather than accepting missing or out-of-order source chunks', async () => {
  const worker = new ReplyingWorker('gap');
  const snapshot = await loadVerifiedMarsSnapshot(bytes, manifest, { createWorker: () => worker });

  expect(worker.terminated).toBe(true);
  expect(snapshot.sources).toHaveLength(1);
  expect(snapshot.sources[0]?.sourceId).toBe('KAZ_S_159');
});

test('does not mask a worker-reported integrity rejection with a successful fallback', async () => {
  const worker = new ReplyingWorker('invalid');

  await expect(loadVerifiedMarsSnapshot(bytes, manifest, { createWorker: () => worker })).rejects.toThrow('content hash');
  expect(worker.terminated).toBe(true);
});

test('terminates worker work when the loading effect is cancelled', async () => {
  const worker = new ReplyingWorker('valid');
  const controller = new AbortController();
  const pending = loadVerifiedMarsSnapshot(bytes, manifest, { createWorker: () => worker, signal: controller.signal });
  controller.abort();

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(worker.terminated).toBe(true);
});
