import { expect, test } from 'bun:test';
import { isValidMapSnapshotManifest, mapBenchmarkBrowserOptions, median, parseMapPerformanceServerMode, readMapPerformanceOption, summarizeMapRuns, type MapPerformanceSample } from './map-performance-utils';

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
  expect(options.chromiumSandbox).toBe(true);
  expect(options.executablePath).toBe('/usr/bin/chromium');
  expect(options.args).not.toContain('--no-sandbox');
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
