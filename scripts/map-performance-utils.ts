export type MapPerformanceSample = {
  readinessMs: number;
  transferBytes: number | null;
  decodedBytes: number | null;
  encodedResponseBytesByHost: Readonly<Record<string, number>>;
  longTasksMs: readonly number[] | null;
  horizontalOverflow: boolean;
  pageErrors: readonly string[];
  failedRequests: readonly string[];
};

export type MapBenchmarkBrowserOptions = {
  headless: boolean;
  chromiumSandbox: true;
  args: string[];
  executablePath?: string;
};

export type MapPerformanceServerMode = 'development' | 'production-preview';
export type MapPerformanceWebglRendererMode = 'software' | 'system';
export type MapPerformanceBrowserMode = 'headless' | 'windowed';
export type MapWebglRendererObservation = { available: boolean; vendor: string | null; renderer: string | null };

export type MapSnapshotManifest = {
  datasetSnapshotId: string;
  sourceCount: number;
  plumeCount: number;
  sourceArchiveSha256: string;
};

export function isValidMapSnapshotManifest(value: unknown): value is MapSnapshotManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const manifest = value as Partial<MapSnapshotManifest>;
  return typeof manifest.datasetSnapshotId === 'string' && manifest.datasetSnapshotId.length > 0
    && Number.isInteger(manifest.sourceCount) && (manifest.sourceCount ?? 0) > 0
    && Number.isInteger(manifest.plumeCount) && (manifest.plumeCount ?? 0) > 0
    && typeof manifest.sourceArchiveSha256 === 'string' && /^[a-f0-9]{64}$/i.test(manifest.sourceArchiveSha256);
}

export function readMapPerformanceOption(arguments_: readonly string[], name: string, fallback: string): string {
  const prefix = `--${name}=`;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    if (argument.startsWith(prefix)) return argument.slice(prefix.length) || fallback;
    if (argument === `--${name}` && arguments_[index + 1] && !arguments_[index + 1]!.startsWith('--')) {
      return arguments_[index + 1]!;
    }
  }
  return fallback;
}

export function parseMapPerformanceServerMode(value: string | undefined): MapPerformanceServerMode {
  if (value === undefined || value === 'production-preview') return 'production-preview';
  if (value === 'development') return 'development';
  throw new Error('Unsupported map benchmark server mode.');
}

export function parseMapPerformanceWebglRendererMode(value: string | undefined): MapPerformanceWebglRendererMode {
  if (value === undefined || value === 'software') return 'software';
  if (value === 'system') return 'system';
  throw new Error('Unsupported WebGL renderer mode.');
}

export function parseMapPerformanceBrowserMode(value: string | undefined): MapPerformanceBrowserMode {
  if (value === undefined || value === 'headless') return 'headless';
  if (value === 'windowed') return 'windowed';
  throw new Error('Unsupported map benchmark browser mode.');
}

export function mapBenchmarkBrowserEnvironment(
  safeEnvironment: Readonly<Record<string, string>>,
  hostEnvironment: Readonly<Record<string, string | undefined>>,
  browserMode: MapPerformanceBrowserMode,
): Record<string, string> {
  const environment = { ...safeEnvironment };
  if (browserMode === 'windowed') {
    if (hostEnvironment.DISPLAY !== undefined) {
      environment.DISPLAY = hostEnvironment.DISPLAY;
      if (hostEnvironment.XAUTHORITY !== undefined) environment.XAUTHORITY = hostEnvironment.XAUTHORITY;
    } else if (hostEnvironment.WAYLAND_DISPLAY !== undefined) {
      environment.WAYLAND_DISPLAY = hostEnvironment.WAYLAND_DISPLAY;
      if (hostEnvironment.XDG_RUNTIME_DIR !== undefined) environment.XDG_RUNTIME_DIR = hostEnvironment.XDG_RUNTIME_DIR;
    }
  }
  return environment;
}

export function isSoftwareWebGLRenderer(renderer: string | null): boolean {
  return renderer !== null && /swiftshader|llvmpipe|software\s+rasterizer/i.test(renderer);
}

export function summarizeWebglRendererObservations(observations: readonly MapWebglRendererObservation[]) {
  const grouped = new Map<string, MapWebglRendererObservation & { sampleCount: number }>();
  for (const observation of observations) {
    const key = JSON.stringify([observation.available, observation.vendor, observation.renderer]);
    const existing = grouped.get(key);
    if (existing) existing.sampleCount += 1;
    else grouped.set(key, { ...observation, sampleCount: 1 });
  }
  return [...grouped.values()]
    .map(observation => ({
      ...observation,
      software: observation.renderer === null ? null : isSoftwareWebGLRenderer(observation.renderer),
    }))
    .sort((left, right) => `${left.renderer ?? ''}\u0000${left.vendor ?? ''}`.localeCompare(`${right.renderer ?? ''}\u0000${right.vendor ?? ''}`));
}

export function mapBenchmarkBrowserOptions(
  executablePath?: string,
  rendererMode: MapPerformanceWebglRendererMode = 'software',
  browserMode: MapPerformanceBrowserMode = 'headless',
): MapBenchmarkBrowserOptions {
  return {
    headless: browserMode === 'headless',
    chromiumSandbox: true,
    args: rendererMode === 'software'
      ? ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader']
      : ['--enable-webgl', '--enable-gpu', ...(browserMode === 'headless' ? ['--headless=new'] : [])],
    ...(executablePath ? { executablePath } : {}),
  };
}

function finiteNonNegative(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function median(values: readonly (number | null | undefined)[]): number | null {
  const ordered = values.filter(finiteNonNegative).sort((left, right) => left - right);
  if (ordered.length === 0) return null;

  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle]!;
  return (ordered[middle - 1]! + ordered[middle]!) / 2;
}

export function summarizeMapRuns(samples: readonly MapPerformanceSample[]) {
  if (samples.length === 0) throw new Error('At least one map run is required.');

  const longTasks = samples.flatMap(sample => sample.longTasksMs ?? []).filter(finiteNonNegative);
  const hosts = new Set(samples.flatMap(sample => Object.keys(sample.encodedResponseBytesByHost)));
  return {
    runCount: samples.length,
    medianReadinessMs: median(samples.map(sample => sample.readinessMs)),
    medianTransferBytes: median(samples.map(sample => sample.transferBytes)),
    medianDecodedBytes: median(samples.map(sample => sample.decodedBytes)),
    medianEncodedResponseBytesByHost: Object.fromEntries([...hosts].sort().map(host => [
      host,
      median(samples.map(sample => sample.encodedResponseBytesByHost[host] ?? 0)),
    ])),
    observedLongTaskCount: longTasks.length,
    maximumLongTaskMs: longTasks.length ? Math.max(...longTasks) : null,
    horizontalOverflowRuns: samples.filter(sample => sample.horizontalOverflow).length,
    pageErrorCount: samples.reduce((sum, sample) => sum + sample.pageErrors.length, 0),
    failedRequestCount: samples.reduce((sum, sample) => sum + sample.failedRequests.length, 0),
  };
}
