export type MapReadinessOutcome = 'ready' | 'delayed' | 'ready-after-delay';

export type MapReadinessTarget = {
  once: (event: 'idle', listener: () => void) => unknown;
  off?: (event: 'idle', listener: () => void) => unknown;
};

export type MapReadinessClock = {
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const systemClock: MapReadinessClock = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Wait until MapLibre has finished its initial tile/render work. A bounded
 * fallback keeps source interactions available when a remote basemap is slow.
 */
export function watchMapReadiness(
  map: MapReadinessTarget,
  onChange: (outcome: MapReadinessOutcome) => void,
  timeoutMs = 10_000,
  clock: MapReadinessClock = systemClock,
): () => void {
  let cancelled = false;
  let initialIdle = false;
  let delayed = false;
  const timer = clock.setTimeout(() => {
    if (cancelled || initialIdle) return;
    delayed = true;
    onChange('delayed');
  }, timeoutMs);

  const handleIdle = () => {
    if (cancelled || initialIdle) return;
    initialIdle = true;
    clock.clearTimeout(timer);
    onChange(delayed ? 'ready-after-delay' : 'ready');
  };

  map.once('idle', handleIdle);

  return () => {
    if (cancelled) return;
    cancelled = true;
    clock.clearTimeout(timer);
    map.off?.('idle', handleIdle);
  };
}
