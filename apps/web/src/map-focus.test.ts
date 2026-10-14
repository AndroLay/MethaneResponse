import { expect, test } from 'bun:test';
import { getInitialMapFocusRequest, getSourceMapFocusView, SOURCE_MARKER_CLUSTER_MAX_ZOOM, SOURCE_INSPECTION_MIN_ZOOM } from './map-focus';

test('initial map deep links request a source zoom while other workspaces do not', () => {
  expect(getInitialMapFocusRequest('/dashboard/map', '?sourceId=KAZ_S_159')).toEqual({ sourceId: 'KAZ_S_159', requestId: 1 });
  expect(getInitialMapFocusRequest('/dashboard/map/', '?sourceId=KAZ_S_159', 4)).toEqual({ sourceId: 'KAZ_S_159', requestId: 4 });
  expect(getInitialMapFocusRequest('/dashboard/audit', '?sourceId=KAZ_S_159')).toBeNull();
  expect(getInitialMapFocusRequest('/dashboard/map', '?sourceId=%20%20')).toBeNull();
  expect(getInitialMapFocusRequest('/dashboard/map', '?sourceId=KAZ_S_159', 0)).toBeNull();
});

test('map focus preserves the source coordinates and starts above source-marker clustering', () => {
  expect(getSourceMapFocusView({ lat: 43.41337, lon: 52.91829 })).toEqual({
    center: [52.91829, 43.41337],
    zoom: 11,
  });
  expect(SOURCE_INSPECTION_MIN_ZOOM).toBeGreaterThan(SOURCE_MARKER_CLUSTER_MAX_ZOOM);
});

test('source refocus reaches the inspection zoom without zooming out from a closer view', () => {
  const source = { lat: 43.41337, lon: 52.91829 };
  expect(getSourceMapFocusView(source, 4)?.zoom).toBe(SOURCE_INSPECTION_MIN_ZOOM);
  expect(getSourceMapFocusView(source, 14)?.zoom).toBe(14);
});

test('map focus rejects invalid source coordinates instead of navigating to a false location', () => {
  expect(getSourceMapFocusView({ lat: 91, lon: 52 })).toBeNull();
  expect(getSourceMapFocusView({ lat: 43, lon: Number.NaN })).toBeNull();
});
