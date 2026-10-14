import { expect, test } from 'bun:test';
import { isSoftwareWebGLRenderer, isValidMapSnapshotManifest, mapBenchmarkBrowserEnvironment, mapBenchmarkBrowserOptions, median, parseMapPerformanceServerMode, parseMapPerformanceWebglRendererMode, readMapPerformanceOption, summarizeMapRuns, summarizeWebglRendererObservations, type MapPerformanceSample } from './map-performance-utils';

test('median ignores unavailable values and averages even-sized samples', () => {
  expect(median([9, Number.NaN, 1, 5])).toBe(5);
  expect(median([null, 4, 2, null])).toBe(3);
  expect(median([null, Number.POSITIVE_INFINITY])).toBeNull();
});

test('map summary keeps unavailable metrics separate and reports worst observed stalls', () => {
  const samples: MapPerformanceSample[] = [
    { readinessMs: 900, transferBytes: 1_000, decodedBytes: 1_500, encodedResponseBytesByHost: { '127.0.0.1': 100, 'tiles.example': 500 }, longTasksMs: [50, 150], horizontalOverflow: false, pageErrors: [], failedRequests: ['tile timeout'] },
    { readinessMs: 1_000, transferBytes: null, decodedBytes: 1_000, encodedResponseBytesByHost: { '127.0.0.1': 150 }, longTasksMs: [], horizontalOverflow: true, pageErrors: ['page error'], failedRequests: [] },
    { readinessMs: 1_100, transferBytes: 3_000, decodedBytes: 2_500, encodedResponseBytesByHost: { '127.0.0.1': 200, 'tiles.example': 800 }, longTasksMs: null, horizontalOverflow: false, pageErrors: [], failedRequests: ['request failed'] },
  ];

  expect(summarizeMapRuns(samples)).toEqual({
    runCount: 3,
    medianReadinessMs: 1_000,
    medianTransferBytes: 2_000,
    medianDecodedBytes: 1_500,
    medianEncodedResponseBytesByHost: { '127.0.0.1': 150, 'tiles.example': 500 },
    observedLongTaskCount: 2,
    maximumLongTaskMs: 150,
    horizontalOverflowRuns: 1,
    pageErrorCount: 1,
    failedRequestCount: 2,
  });
});

test('map summary rejects an empty sample set', () => {
  expect(() => summarizeMapRuns([])).toThrow('At least one map run is required.');
});

test('benchmark browser options keep Chromium sandbox enabled', () => {
  const options = mapBenchmarkBrowserOptions('/usr/bin/chromium');
  expect(options.headless).toBe(true);
  expect(options.chromiumSandbox).toBe(true);
  expect(options.executablePath).toBe('/usr/bin/chromium');
  expect(options.args).toContain('--use-angle=swiftshader');
  expect(options.args).not.toContain('--no-sandbox');
});

test('benchmark renderer mode defaults to software and rejects unknown values', () => {
  expect(parseMapPerformanceWebglRendererMode(undefined)).toBe('software');
  expect(parseMapPerformanceWebglRendererMode('system')).toBe('system');
  expect(() => parseMapPerformanceWebglRendererMode('gpu-unrestricted')).toThrow('Unsupported WebGL renderer mode.');
});

test('system renderer mode requests Chromium GPU without forcing software or disabling its sandbox', () => {
  const options = mapBenchmarkBrowserOptions('/usr/bin/chromium', 'system');
  expect(options.headless).toBe(false);
  expect(options.chromiumSandbox).toBe(true);
  expect(options.executablePath).toBe('/usr/bin/chromium');
  expect(options.args).toContain('--enable-gpu');
  expect(options.args).not.toContain('--use-angle=swiftshader');
  expect(options.args).not.toContain('--no-sandbox');
});

test('system renderer gets only the minimal display environment while software mode remains isolated', () => {
  const safeEnvironment = { PATH: '/usr/bin', HOME: '/home/demo' };
  const hostEnvironment = {
    DISPLAY: ':0',
    WAYLAND_DISPLAY: 'wayland-0',
    XAUTHORITY: '/run/user/1000/xauth',
    XDG_RUNTIME_DIR: '/run/user/1000',
    AI_API_KEY: 'never-forward-this',
  };
  expect(mapBenchmarkBrowserEnvironment(safeEnvironment, hostEnvironment, 'system')).toEqual({
    ...safeEnvironment,
    DISPLAY: ':0',
    XAUTHORITY: '/run/user/1000/xauth',
  });
  expect(mapBenchmarkBrowserEnvironment(safeEnvironment, {
    WAYLAND_DISPLAY: 'wayland-0',
    XDG_RUNTIME_DIR: '/run/user/1000',
    XAUTHORITY: '/run/user/1000/xauth',
    AI_API_KEY: 'never-forward-this',
  }, 'system')).toEqual({
    ...safeEnvironment,
    WAYLAND_DISPLAY: 'wayland-0',
    XDG_RUNTIME_DIR: '/run/user/1000',
  });
  expect(mapBenchmarkBrowserEnvironment(safeEnvironment, hostEnvironment, 'software')).toEqual(safeEnvironment);
});

test('software renderer classification distinguishes SwiftShader from AMD WebGL', () => {
  expect(isSoftwareWebGLRenderer('ANGLE (Google, Vulkan 1.3.0, SwiftShader Device)')).toBe(true);
  expect(isSoftwareWebGLRenderer('llvmpipe (LLVM 18.1.0, 256 bits)')).toBe(true);
  expect(isSoftwareWebGLRenderer('ANGLE (AMD, AMD Radeon 680M, OpenGL ES 3.2)')).toBe(false);
  expect(isSoftwareWebGLRenderer(null)).toBe(false);
});

test('renderer observations are grouped deterministically without hiding software fallback', () => {
  expect(summarizeWebglRendererObservations([
    { available: true, vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, Radeon 680M)' },
    { available: true, vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, Radeon 680M)' },
    { available: true, vendor: 'Google Inc. (Google)', renderer: 'ANGLE (Google, SwiftShader Device)' },
    { available: false, vendor: null, renderer: null },
  ])).toEqual([
    { available: false, vendor: null, renderer: null, software: null, sampleCount: 1 },
    { available: true, vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, Radeon 680M)', software: false, sampleCount: 2 },
    { available: true, vendor: 'Google Inc. (Google)', renderer: 'ANGLE (Google, SwiftShader Device)', software: true, sampleCount: 1 },
  ]);
});

test('benchmark defaults to production preview and rejects unknown server modes', () => {
  expect(parseMapPerformanceServerMode(undefined)).toBe('production-preview');
  expect(parseMapPerformanceServerMode('development')).toBe('development');
  expect(() => parseMapPerformanceServerMode('remote')).toThrow('Unsupported map benchmark server mode.');
});

test('benchmark option parsing accepts equals and separate value forms', () => {
  expect(readMapPerformanceOption(['--output=report.json'], 'output', 'default.json')).toBe('report.json');
  expect(readMapPerformanceOption(['--output', 'report.json'], 'output', 'default.json')).toBe('report.json');
  expect(readMapPerformanceOption([], 'output', 'default.json')).toBe('default.json');
});

test('snapshot validation binds benchmark outputs to a valid dynamic dataset manifest', () => {
  expect(isValidMapSnapshotManifest({
    datasetSnapshotId: 'unep-mars-next-release',
    sourceCount: 5,
    plumeCount: 12,
    sourceArchiveSha256: 'a'.repeat(64),
  })).toBe(true);
  expect(isValidMapSnapshotManifest({
    datasetSnapshotId: 'unep-mars-next-release',
    sourceCount: 5,
    plumeCount: 12,
    sourceArchiveSha256: 'not-a-sha256',
  })).toBe(false);
});
