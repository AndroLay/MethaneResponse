import { parseVerifiedMarsSnapshot } from './mars-snapshot-integrity';
import type { MarsSnapshot } from './mars';

type SnapshotWorkerRequest = { bytes: ArrayBuffer; manifest: unknown };
type SnapshotMetadata = Omit<MarsSnapshot, 'sources' | 'unlinkedObservations'>;
type SnapshotWorkerMessage =
  | { type: 'start'; metadata: SnapshotMetadata }
  | { type: 'sources'; offset: number; sources: MarsSnapshot['sources'] }
  | { type: 'unlinked'; offset: number; observations: NonNullable<MarsSnapshot['unlinkedObservations']> }
  | { type: 'complete' }
  | { type: 'error'; error: string };
type WorkerScope = {
  onmessage: ((event: MessageEvent<SnapshotWorkerRequest>) => void) | null;
  postMessage(message: SnapshotWorkerMessage): void;
};

const workerScope = self as unknown as WorkerScope;
const MAX_SOURCE_CHUNK = 64;
const MAX_LINKED_OBSERVATIONS_PER_CHUNK = 512;
const MAX_UNLINKED_CHUNK = 512;

function postSourceChunks(sources: MarsSnapshot['sources']) {
  let chunk: MarsSnapshot['sources'] = [];
  let observationCount = 0;
  let offset = 0;
  const flush = () => {
    if (!chunk.length) return;
    workerScope.postMessage({ type: 'sources', offset, sources: chunk });
    offset += chunk.length;
    chunk = [];
    observationCount = 0;
  };
  for (const source of sources) {
    const sourceObservationCount = source.observations?.length || 0;
    if (chunk.length && (chunk.length >= MAX_SOURCE_CHUNK || observationCount + sourceObservationCount > MAX_LINKED_OBSERVATIONS_PER_CHUNK)) flush();
    chunk.push(source);
    observationCount += sourceObservationCount;
  }
  flush();
}

function postUnlinkedChunks(observations: NonNullable<MarsSnapshot['unlinkedObservations']>) {
  for (let offset = 0; offset < observations.length; offset += MAX_UNLINKED_CHUNK) {
    workerScope.postMessage({ type: 'unlinked', offset, observations: observations.slice(offset, offset + MAX_UNLINKED_CHUNK) });
  }
}

workerScope.onmessage = async event => {
  try {
    const snapshot = await parseVerifiedMarsSnapshot(event.data.bytes, event.data.manifest);
    const { sources, unlinkedObservations = [], ...metadata } = snapshot;
    workerScope.postMessage({ type: 'start', metadata });
    postSourceChunks(sources);
    postUnlinkedChunks(unlinkedObservations);
    workerScope.postMessage({ type: 'complete' });
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'The MARS snapshot could not be validated.',
    });
  }
};
