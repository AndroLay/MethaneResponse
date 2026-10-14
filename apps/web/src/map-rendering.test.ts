import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import * as mapPanel from './MapPanel';
import type { MarsObservation, MarsSource } from './mars';

const rendering = mapPanel as unknown as {
  getRasterSaturation?: (theme: string, grayPercent: number, look?: 'natural' | 'cinematic') => number;
  getRasterContrast?: (look: 'natural' | 'cinematic') => number;
  getFluxMarkerColor?: (flux: number | null) => string;
  getProjectionSpec?: (mode: string) => { type: string };
  getStatusAfterMapError?: (status: string) => string;
  getMapInitializationFallbackMessage?: (error: unknown) => string;
  getMapErrorNotice?: (error: unknown) => string | null;
  isGlobeRendererFailure?: (mode: string, message: string) => boolean;
  isGlobeProjectionSupported?: (contextAvailable: boolean, renderer: string | null) => boolean;
  getInitialRenderTierForRenderer?: (renderer: string | null, preferredTier: 'low' | 'medium' | 'high') => 'low' | 'medium' | 'high';
  shouldUseCompactAttribution?: (mapWidth: number) => boolean;
  isSoftwareWebGLRenderer?: (renderer: string | null) => boolean;
  getGlobeOverview?: (sources: Array<Pick<MarsSource, 'lat' | 'lon'>>, viewportWidth?: number, viewportHeight?: number) => { center: [number, number]; zoom: number };
  toObservationGeoJSON?: (observations: MarsObservation[]) => { features: Array<{ id: string; geometry: { coordinates: number[] }; properties: { flux: number | null; sourceId: string | null; date: string; linked: number } }> };
  getFluxOverlayWeight?: (flux: number | null) => number;
  toFluxOverlayGeoJSON?: (observations: MarsObservation[]) => { features: Array<{ id: string; properties: { flux: number | null; fluxWeight: number; uncertainty: number | null } }> };
  toFluxGridGeoJSON?: (observations: MarsObservation[], gridDegrees?: number) => { features: Array<{ geometry: { coordinates: number[] }; properties: { medianFlux: number; sampleCount: number; medianUncertainty: number | null; gridDegrees: number } }> };
  toPriorityOverlayGeoJSON?: (sources: MarsSource[], rankings: Array<{ sourceId: string; priorityScore: number; priorityBand: 'low' | 'medium' | 'high'; priorityType: 'heuristic_not_probability'; lastObserved?: string | null }>) => { features: Array<{ id: string; properties: { priorityScore: number; priorityBand: string; priorityType: string } }> };
  runWhenStyleReady?: (map: { isStyleLoaded: () => boolean; once: (event: 'idle', callback: () => void) => unknown }, queued: { current: boolean }, work: () => void) => boolean;
  getFootprintOutlineLineWidthExpression?: () => unknown[];
};

test('globe projection opens on a centered Earth overview of the casebook', () => {
  const getGlobeOverview = rendering.getGlobeOverview;
  expect(typeof getGlobeOverview).toBe('function');
  if (!getGlobeOverview) return;

  const view = getGlobeOverview([
    { lat: 46.06, lon: 66.23 },
    { lat: 27.9, lon: 14.4 },
    { lat: -35.6, lon: -67.2 },
  ], 895, 338);

  expect(view.center[0]).toBeGreaterThan(-5);
  expect(view.center[0]).toBeLessThan(10);
  expect(view.center[1]).toBeGreaterThan(10);
  expect(view.center[1]).toBeLessThan(20);
  expect(view.zoom).toBeGreaterThan(1.2);
  expect(view.zoom).toBeLessThan(1.4);
});

test('globe overview handles coordinates across the antimeridian and invalid points', () => {
  const getGlobeOverview = rendering.getGlobeOverview;
  expect(typeof getGlobeOverview).toBe('function');
  if (!getGlobeOverview) return;

  const view = getGlobeOverview([
    { lat: 10, lon: 179 },
    { lat: 12, lon: -179 },
    { lat: 95, lon: 0 },
    { lat: 0, lon: 181 },
  ], 895, 338);

  expect(Math.abs(view.center[0])).toBeGreaterThan(170);
  expect(view.center[1]).toBe(11);
  expect(view.zoom).toBeGreaterThan(1.2);
});

test('globe overview falls back to a neutral Earth view when there are no valid points', () => {
  const getGlobeOverview = rendering.getGlobeOverview;
  expect(typeof getGlobeOverview).toBe('function');
  if (!getGlobeOverview) return;

  const defaultView = getGlobeOverview([], 895, 338);
  expect(defaultView.center).toEqual([0, 18]);
  expect(getGlobeOverview([{ lat: Number.NaN, lon: 0 }], 895, 338)).toEqual(defaultView);
});

test('globe overview fills wide, desktop, fullscreen, and portrait viewports without clipping', () => {
  const getGlobeOverview = rendering.getGlobeOverview;
  expect(typeof getGlobeOverview).toBe('function');
  if (!getGlobeOverview) return;

  const dashboard = getGlobeOverview([], 895, 338);
  const portrait = getGlobeOverview([], 390, 340);
  const fullscreen = getGlobeOverview([], 1390, 880);

  expect(portrait.zoom).toBeGreaterThan(1.2);
  expect(portrait.zoom).toBeLessThan(1.5);
  expect(fullscreen.zoom).toBeGreaterThan(dashboard.zoom);
  expect(fullscreen.zoom).toBe(2.5);
  expect(getGlobeOverview([], Number.NaN, 338)).toEqual(dashboard);
});

test('grayscale percentage changes satellite saturation without muting natural color', () => {
  const getSaturation = rendering.getRasterSaturation;
  expect(typeof getSaturation).toBe('function');
  if (!getSaturation) return;

  expect(getSaturation('satellite', 100, 'natural')).toBe(0.07);
  expect(getSaturation('satellite', 100, 'cinematic')).toBe(0.14);
  expect(getSaturation('grayscale', 0)).toBe(0);
  expect(getSaturation('grayscale', 50)).toBe(-0.5);
  expect(getSaturation('grayscale', 100)).toBe(-1);
  expect(getSaturation('grayscale', -20)).toBe(0);
  expect(getSaturation('grayscale', 120)).toBe(-1);
});

test('natural and cinematic imagery have a visible color treatment without changing data', () => {
  expect(rendering.getRasterContrast?.('natural')).toBe(0.08);
  expect(rendering.getRasterContrast?.('cinematic')).toBe(0.16);
  expect(rendering.getFluxMarkerColor?.(null)).toBe('#91a9b2');
  expect(rendering.getFluxMarkerColor?.(0)).toBe('#3978eb');
  expect(rendering.getFluxMarkerColor?.(500)).toBe('#f3d14b');
  expect(rendering.getFluxMarkerColor?.(2500)).toBe('#f58b38');
  expect(rendering.getFluxMarkerColor?.(6000)).toBe('#ed4b43');
});

test('flat and globe choices map to the matching MapLibre projection', () => {
  const getProjectionSpec = rendering.getProjectionSpec;
  expect(typeof getProjectionSpec).toBe('function');
  if (!getProjectionSpec) return;

  expect(getProjectionSpec('flat')).toEqual({ type: 'mercator' });
  expect(getProjectionSpec('globe')).toEqual({ type: 'globe' });
});

test('a late tile error does not mark an already rendered basemap unavailable', () => {
  const getStatus = rendering.getStatusAfterMapError;
  expect(typeof getStatus).toBe('function');
  if (!getStatus) return;

  expect(getStatus('loading')).toBe('error');
  expect(getStatus('ready')).toBe('ready');
});

test('map initialization failures produce a safe, useful fallback message', () => {
  const getFallback = rendering.getMapInitializationFallbackMessage;
  expect(typeof getFallback).toBe('function');
  if (!getFallback) return;

  expect(getFallback(new Error('Failed to initialize WebGL'))).toContain('could not initialize WebGL');
  expect(getFallback(new Error('unexpected map error'))).toContain('inspect the selected case and evidence');
});

test('map errors expose an accurate recoverable notice but ignore optional font errors', () => {
  expect(rendering.getMapErrorNotice?.(new Error('Failed to load raster tile'))).toBe(
    'Map tiles failed; source markers remain visible.',
  );
  expect(rendering.getMapErrorNotice?.(new Error('Request failed (503) https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/10/10'))).toBe(
    'Map tiles failed; source markers remain visible.',
  );
  const genericNotice = 'Map rendering reported an error; some layers may be unavailable.';
  expect(rendering.getMapErrorNotice?.(new Error('Failed to load /fonts/example.pbf'))).toBeNull();
  expect(rendering.getMapErrorNotice?.(new Error('layers.mars-plume-footprint-outline.paint.line-width: Only one zoom-based "step" or "interpolate" subexpression may be used in an expression.'))).toBe(genericNotice);
  expect(rendering.getMapErrorNotice?.(new Error('unexpected map error'))).toBe(genericNotice);
  expect(rendering.getMapErrorNotice?.(null)).toBeNull();
});

test('publisher footprint outline width uses one MapLibre zoom interpolation', () => {
  const expression = rendering.getFootprintOutlineLineWidthExpression?.();
  expect(typeof rendering.getFootprintOutlineLineWidthExpression).toBe('function');
  if (!expression) return;

  const countZoomOperators = (value: unknown): number => {
    if (!Array.isArray(value)) return 0;
    return (value[0] === 'zoom' ? 1 : 0) + value.reduce<number>((total, child) => total + countZoomOperators(child), 0);
  };

  expect(expression).toEqual([
    'interpolate', ['linear'], ['zoom'],
    4, ['case', ['==', ['get', 'mapSourceSelected'], 1], 1.6, 0.45],
    10, ['case', ['==', ['get', 'mapSourceSelected'], 1], 2.8, 0.85],
    15, ['case', ['==', ['get', 'mapSourceSelected'], 1], 4, 1.4],
  ]);
  expect(countZoomOperators(expression)).toBe(1);
});

test('map tile failure notice stays at the map edge instead of covering its center', () => {
  const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const desktopRule = css.match(/\.geo-map-degraded-notice\s*\{([^}]*)\}/)?.[1] ?? '';
  const mobileRule = css.match(/@media\(max-width:620px\)\{\.geo-map-degraded-notice\s*\{([^}]*)\}/)?.[1] ?? '';

  expect(desktopRule).toContain('right:12px');
  expect(desktopRule).toContain('left:auto');
  expect(desktopRule).toContain('width:min(250px');
  expect(desktopRule).not.toContain('left:50%');
  expect(desktopRule).not.toContain('translateX(-50%)');
  expect(mobileRule).toContain('right:8px');
  expect(mobileRule).toContain('top:12px');
  expect(mobileRule).toContain('width:min(150px');
});

test('solar rendering waits for a MapLibre idle event when style.load fires too early', () => {
  const runWhenStyleReady = rendering.runWhenStyleReady;
  expect(typeof runWhenStyleReady).toBe('function');
  if (!runWhenStyleReady) return;

  let loaded = false;
  let idleCallback: (() => void) | undefined;
  let workCalls = 0;
  const queued = { current: false };
  const map = {
    isStyleLoaded: () => loaded,
    once: (_event: 'idle', callback: () => void) => { idleCallback = callback; },
  };

  expect(runWhenStyleReady(map, queued, () => { workCalls += 1; })).toBe(false);
  expect(queued.current).toBe(true);
  expect(workCalls).toBe(0);
  loaded = true;
  idleCallback?.();
  expect(queued.current).toBe(false);
  expect(workCalls).toBe(1);
  const styleReady = runWhenStyleReady(map, queued, () => { workCalls += 1; });
  expect(styleReady).toBe(true);
  if (styleReady) workCalls += 1;
  expect(workCalls).toBe(2);
});

test('fatal WebGL failures are identified only while using the globe projection', () => {
  const isGlobeFailure = rendering.isGlobeRendererFailure;
  expect(typeof isGlobeFailure).toBe('function');
  if (!isGlobeFailure) return;

  expect(isGlobeFailure('globe', 'Could not compile fragment shader')).toBe(true);
  expect(isGlobeFailure('globe', 'WebGL context lost')).toBe(true);
  expect(isGlobeFailure('globe', 'Failed to load raster tile')).toBe(false);
  expect(isGlobeFailure('flat', 'Could not compile fragment shader')).toBe(false);
});

test('known software WebGL renderers use a low-cost tier without disabling globe projection', () => {
  const isSoftwareRenderer = rendering.isSoftwareWebGLRenderer;
  const isGlobeSupported = rendering.isGlobeProjectionSupported;
  const getInitialTier = rendering.getInitialRenderTierForRenderer;
  expect(typeof isSoftwareRenderer).toBe('function');
  expect(typeof isGlobeSupported).toBe('function');
  expect(typeof getInitialTier).toBe('function');
  if (!isSoftwareRenderer) return;

  expect(isSoftwareRenderer('ANGLE (SwiftShader Device)')).toBe(true);
  expect(isSoftwareRenderer('llvmpipe (LLVM 18.1, 256 bits)')).toBe(true);
  expect(isSoftwareRenderer('NVIDIA GeForce RTX')).toBe(false);
  expect(isSoftwareRenderer(null)).toBe(false);
  expect(isGlobeSupported?.(true, 'ANGLE (SwiftShader Device)')).toBe(true);
  expect(isGlobeSupported?.(false, 'NVIDIA GeForce RTX')).toBe(false);
  expect(getInitialTier?.('ANGLE (SwiftShader Device)', 'high')).toBe('low');
  expect(getInitialTier?.('NVIDIA GeForce RTX', 'medium')).toBe('medium');
});

test('map attribution collapses only when the map container is too narrow for the full control', () => {
  const shouldUseCompactAttribution = rendering.shouldUseCompactAttribution;
  expect(typeof shouldUseCompactAttribution).toBe('function');
  if (!shouldUseCompactAttribution) return;

  expect(shouldUseCompactAttribution(717)).toBe(true);
  expect(shouldUseCompactAttribution(900)).toBe(false);
  expect(shouldUseCompactAttribution(1280)).toBe(false);
  expect(shouldUseCompactAttribution(Number.NaN)).toBe(true);
});

test('WebGL availability gates globe projection while renderer name does not', () => {
  const isGlobeSupported = rendering.isGlobeProjectionSupported;
  expect(typeof isGlobeSupported).toBe('function');
  if (!isGlobeSupported) return;

  expect(isGlobeSupported(false, 'NVIDIA GeForce RTX')).toBe(false);
  expect(isGlobeSupported(true, 'ANGLE (SwiftShader Device)')).toBe(true);
  expect(isGlobeSupported(true, 'NVIDIA GeForce RTX')).toBe(true);
  expect(isGlobeSupported(true, null)).toBe(true);
});

test('plume map records keep unresolved IDs and unknown flux distinct from zero', () => {
  const toObservationGeoJSON = rendering.toObservationGeoJSON;
  expect(typeof toObservationGeoJSON).toBe('function');
  if (!toObservationGeoJSON) return;

  const features = toObservationGeoJSON([
    { id: 'linked-1', sourceId: 'KAZ_S_136', linkStatus: 'linked', date: '2026-01-01', fluxKgHr: null, uncertaintyKgHr: null, lat: 50, lon: 67 },
    { id: 'unlinked-1', sourceId: null, linkStatus: 'source_id_missing', date: '2026-01-02', fluxKgHr: 0, uncertaintyKgHr: null, lat: 51, lon: 68 },
    { id: 'no-coordinates', date: '2026-01-03', fluxKgHr: 10, lat: 95, lon: 0 },
  ]);

  expect(features.features).toHaveLength(2);
  expect(features.features[0]).toMatchObject({
    id: 'linked-1', geometry: { coordinates: [67, 50] },
    properties: { sourceId: 'KAZ_S_136', date: '2026-01-01', flux: null, linked: 1 },
  });
  expect(features.features[1]?.properties).toMatchObject({ sourceId: null, flux: 0, linked: 0 });
});

test('flux overlay normalizes reported values monotonically without turning missing or zero into emissions', () => {
  const weight = rendering.getFluxOverlayWeight;
  expect(typeof weight).toBe('function');
  if (!weight) return;

  expect(weight(null)).toBe(0);
  expect(weight(Number.NaN)).toBe(0);
  expect(weight(-1)).toBe(0);
  expect(weight(0)).toBe(0);
  expect(weight(100)).toBeGreaterThan(0);
  expect(weight(500)).toBeGreaterThan(weight(100));
  expect(weight(5000)).toBe(1);
  expect(weight(10000)).toBe(1);
});

test('flux overlay retains reported flux and uncertainty while excluding coordinate-invalid rows', () => {
  const toFluxOverlayGeoJSON = rendering.toFluxOverlayGeoJSON;
  expect(typeof toFluxOverlayGeoJSON).toBe('function');
  if (!toFluxOverlayGeoJSON) return;

  const data = toFluxOverlayGeoJSON([
    { id: 'measured', sourceId: 'KAZ_S_159', date: '2026-07-11T08:12:14Z', fluxKgHr: 500, uncertaintyKgHr: 120, lat: 43, lon: 52 },
    { id: 'unknown', sourceId: null, date: '2026-07-12', fluxKgHr: null, lat: 44, lon: 53 },
    { id: 'zero', sourceId: 'KAZ_S_159', date: '2026-07-13', fluxKgHr: 0, lat: 45, lon: 54 },
    { id: 'invalid', date: '2026-07-14', fluxKgHr: 900, lat: 95, lon: 54 },
  ]);

  expect(data.features.map(feature => feature.id)).toEqual(['measured', 'unknown', 'zero']);
  expect(data.features[0]?.properties.flux).toBe(500);
  expect(data.features[0]?.properties.uncertainty).toBe(120);
  expect(data.features[1]?.properties).toMatchObject({ flux: null, fluxWeight: 0 });
  expect(data.features[2]?.properties).toMatchObject({ flux: 0, fluxWeight: 0 });
});

test('official plume footprint colors follow the reported kg/h bins and keep missing values neutral', () => {
  const color = rendering.getFluxFootprintColor;

  expect(color?.(null)).toBe('#91a9b2');
  expect(color?.(Number.NaN)).toBe('#91a9b2');
  expect(color?.(0)).toBe('#3978eb');
  expect(color?.(99.99)).toBe('#3978eb');
  expect(color?.(100)).toBe('#20d2d2');
  expect(color?.(500)).toBe('#f3d14b');
  expect(color?.(2000)).toBe('#f58b38');
  expect(color?.(5000)).toBe('#ed4b43');
});

test('low-power flux cells summarize positive observations with medians and keep unknown or zero rows out', () => {
  const toFluxGridGeoJSON = rendering.toFluxGridGeoJSON;
  expect(typeof toFluxGridGeoJSON).toBe('function');
  if (!toFluxGridGeoJSON) return;

  const grid = toFluxGridGeoJSON([
    { id: 'a', date: '2026-07-01', fluxKgHr: 100, uncertaintyKgHr: 20, lat: 43.2, lon: 52.2 },
    { id: 'b', date: '2026-07-02', fluxKgHr: 300, uncertaintyKgHr: 60, lat: 43.8, lon: 52.8 },
    { id: 'zero', date: '2026-07-03', fluxKgHr: 0, lat: 43.4, lon: 52.4 },
    { id: 'unknown', date: '2026-07-04', fluxKgHr: null, lat: 43.5, lon: 52.5 },
    { id: 'invalid', date: '2026-07-05', fluxKgHr: 900, lat: 95, lon: 52 },
  ]);

  expect(grid.features).toHaveLength(1);
  expect(grid.features[0]?.geometry.coordinates).toEqual([52.5, 43.5]);
  expect(grid.features[0]?.properties).toMatchObject({ medianFlux: 200, sampleCount: 2, medianUncertainty: 40, gridDegrees: 1 });
});

test('priority overlay includes only matched real source rows and keeps the score explicitly heuristic', () => {
  const toPriorityOverlayGeoJSON = rendering.toPriorityOverlayGeoJSON;
  expect(typeof toPriorityOverlayGeoJSON).toBe('function');
  if (!toPriorityOverlayGeoJSON) return;

  const data = toPriorityOverlayGeoJSON([
    { sourceId: 'KAZ_S_159', name: 'Kazakh source', region: 'Kazakhstan', lat: 43, lon: 52, synthetic: false } as MarsSource,
    { sourceId: 'DEMO-001', name: 'Demo', region: 'DEMO', lat: 1, lon: 2, synthetic: true } as MarsSource,
  ], [
    { sourceId: 'KAZ_S_159', priorityScore: 45, priorityBand: 'medium', priorityType: 'heuristic_not_probability' },
    { sourceId: 'MISSING', priorityScore: 90, priorityBand: 'high', priorityType: 'heuristic_not_probability' },
    { sourceId: 'DEMO-001', priorityScore: 90, priorityBand: 'high', priorityType: 'heuristic_not_probability' },
  ]);

  expect(data.features).toHaveLength(1);
  expect(data.features[0]).toMatchObject({ id: 'KAZ_S_159', properties: { priorityScore: 45, priorityBand: 'medium', priorityType: 'heuristic_not_probability' } });
});
