import type { MarsObservation, MarsSnapshot, MarsSource } from './mars';

export type SnapshotWorkerLike = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
};

type SnapshotMetadata = Omit<MarsSnapshot, 'sources' | 'unlinkedObservations'>;
type SnapshotWorkerMessage =
  | { type: 'start'; metadata: SnapshotMetadata }
  | { type: 'sources'; offset: number; sources: MarsSource[] }
  | { type: 'unlinked'; offset: number; observations: MarsObservation[] }
  | { type: 'complete' }
  | { type: 'error'; error: string };
type LoadOptions = { createWorker?: () => SnapshotWorkerLike; signal?: AbortSignal; timeoutMs?: number };

function abortError(): DOMException {
  return new DOMException('MARS snapshot loading was cancelled.', 'AbortError');
}

function isWorkerMessage(value: unknown): value is SnapshotWorkerMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (message.type === 'start') return !!message.metadata && typeof message.metadata === 'object';
  if (message.type === 'sources') return Number.isSafeInteger(message.offset) && Array.isArray(message.sources);
  if (message.type === 'unlinked') return Number.isSafeInteger(message.offset) && Array.isArray(message.observations);
  if (message.type === 'error') return typeof message.error === 'string';
  return message.type === 'complete';
}

async function parseOnMain(bytes: ArrayBuffer, manifest: unknown): Promise<MarsSnapshot> {
  const { parseVerifiedMarsSnapshot } = await import('./mars-snapshot-integrity');
  return parseVerifiedMarsSnapshot(bytes, manifest);
}

function createBrowserWorker(): SnapshotWorkerLike {
  return new Worker(new URL('./mars-snapshot.worker.ts', import.meta.url), { type: 'module' });
}

/**
 * Validate/decode the pinned MARS snapshot away from the UI thread. Worker failures
 * fall back to the same deterministic verifier; a worker-reported validation error
 * remains a hard failure and cannot be converted into an accepted snapshot.
 */
export async function loadVerifiedMarsSnapshot(
  bytes: ArrayBuffer,
  manifest: unknown,
  options: LoadOptions = {},
): Promise<MarsSnapshot> {
  if (options.signal?.aborted) throw abortError();

  let worker: SnapshotWorkerLike;
  try {
    worker = (options.createWorker || createBrowserWorker)();
  } catch {
    return parseOnMain(bytes, manifest);
  }

  return new Promise<MarsSnapshot>((resolve, reject) => {
    let settled = false;
    let fallbackStarted = false;
    let metadata: SnapshotMetadata | undefined;
    const sources: MarsSource[] = [];
    const unlinkedObservations: MarsObservation[] = [];
    const timeout = setTimeout(() => { void fallBack(); }, options.timeoutMs ?? 45_000);

    const cleanup = () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', onAbort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
    };
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };
    const onAbort = () => finish(() => reject(abortError()));
    const fallBack = async () => {
      if (settled || fallbackStarted) return;
      fallbackStarted = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      if (options.signal?.aborted) return finish(() => reject(abortError()));
      try {
        const snapshot = await parseOnMain(bytes, manifest);
        finish(() => resolve(snapshot));
      } catch (error) {
        finish(() => reject(error));
      }
    };

    options.signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = event => {
      if (!isWorkerMessage(event.data)) {
        void fallBack();
        return;
      }
      const message = event.data;
      if (message.type === 'error') {
        finish(() => reject(new Error(message.error)));
        return;
      }
      if (message.type === 'start') {
        if (metadata) { void fallBack(); return; }
        metadata = message.metadata;
        return;
      }
      if (!metadata) { void fallBack(); return; }
      if (message.type === 'sources') {
        if (message.offset !== sources.length) { void fallBack(); return; }
        sources.push(...message.sources);
        return;
      }
      if (message.type === 'unlinked') {
        if (message.offset !== unlinkedObservations.length) { void fallBack(); return; }
        unlinkedObservations.push(...message.observations);
        return;
      }
      const completedMetadata = metadata;
      if (!completedMetadata) { void fallBack(); return; }
      const expectedSources = completedMetadata.originalSourceCount ?? completedMetadata.counts?.sources;
      const observedCount = sources.reduce((total, source) => total + (source.observations?.length || 0), unlinkedObservations.length);
      if ((expectedSources !== undefined && expectedSources !== sources.length)
        || (completedMetadata.plumeCount !== undefined && observedCount !== completedMetadata.plumeCount)) {
        void fallBack();
        return;
      }
      finish(() => resolve({ ...completedMetadata, sources, unlinkedObservations }));
    };
    worker.onerror = event => {
      event.preventDefault?.();
      void fallBack();
    };
    worker.onmessageerror = () => { void fallBack(); };

    try {
      const transferableBytes = bytes.slice(0);
      worker.postMessage({ bytes: transferableBytes, manifest }, [transferableBytes]);
    } catch {
      void fallBack();
    }
  });
}
