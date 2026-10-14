import { expect, test } from 'bun:test';
import * as earthRendering from './earth-rendering';

type RenderTier = 'low' | 'medium' | 'high';
type MapProjection = 'flat' | 'globe';
type TerrainPreference = 'auto' | 'off' | 'on';
type RenderPreference = 'auto' | 'eco' | 'balanced' | 'quality';
type ContextLayer = 'off' | 'natural' | 'cloud-fraction' | 'airs-methane-400hpa';
type EarthRenderingApi = {
  resolveRenderTier?: (mode: RenderPreference, device: { deviceMemoryGB?: number; cores?: number; screenWidth?: number; pixelRatio?: number }) => RenderTier;
  getRenderPixelRatio?: (tier: RenderTier, nativeRatio: number) => number;
  degradeTier?: (tier: RenderTier, penalty: number) => RenderTier;
  getEarthSky?: (look: 'natural' | 'cinematic', tier: RenderTier, globe: boolean) => Record<string, unknown>;
  getStableEarthLight?: () => { anchor: string; position: [number, number, number]; color: string; intensity: number };
  getNightSideOpacity?: (tier: RenderTier) => number;
  getSatelliteImageryOpacity?: (zoom: number) => { overview: number; detail: number };
  DEFAULT_NIGHT_SHADING?: boolean;
  NASA_BLUE_MARBLE_TILE_TEMPLATE?: string;
  NASA_BLUE_MARBLE_TILE_MAX_ZOOM?: number;
  NASA_BLUE_MARBLE_LAYER_MAX_ZOOM?: number;
  shouldEnableTerrain?: (preference: TerrainPreference, tier: RenderTier, zoom: number, projection: MapProjection) => boolean;
  getMapterhornTerrainSource?: () => { encoding: string; url: string };
  solarSubpoint?: (date: Date) => { latitude: number; longitude: number };
  solarTerminatorCenter?: (date: Date, offsetDegrees?: number) => [number, number];
  solarLightPosition?: (date: Date, latitude: number, longitude: number) => [number, number, number];
  solarNightGeometry?: (date: Date) => GeoJSON.FeatureCollection;
  getContextLayerTiles?: (layer: ContextLayer, date: string) => { url: string; maxzoom: number } | null;
  boundedOpacity?: (percentage: number) => number;
};
const earth = earthRendering as unknown as EarthRenderingApi;

test('Auto keeps globe controls usable while capping small-device rendering', () => {
  expect(typeof earth.resolveRenderTier).toBe('function');
  expect(typeof earth.getRenderPixelRatio).toBe('function');
  if (!earth.resolveRenderTier || !earth.getRenderPixelRatio) return;

  expect(earth.resolveRenderTier('auto', { deviceMemoryGB: 2, cores: 8, screenWidth: 390 })).toBe('low');
  expect(earth.resolveRenderTier('auto', { cores: 8, screenWidth: 390 })).toBe('medium');
  expect(earth.resolveRenderTier('auto', { deviceMemoryGB: 8, cores: 8, screenWidth: 390 })).toBe('medium');
  expect(earth.resolveRenderTier('auto', { deviceMemoryGB: 16, cores: 8, screenWidth: 1440 })).toBe('high');
  expect(earth.getRenderPixelRatio('low', 3)).toBe(1);
  expect(earth.getRenderPixelRatio('medium', 3)).toBe(1.5);
  expect(earth.getRenderPixelRatio('high', 3)).toBe(2);
});

test('Earth look adds tier-aware atmospheric scattering and UTC night shading at every tier', () => {
  expect(typeof earth.getEarthSky).toBe('function');
  expect(typeof earth.getStableEarthLight).toBe('function');
  expect(typeof earth.getNightSideOpacity).toBe('function');
  if (!earth.getEarthSky || !earth.getStableEarthLight || !earth.getNightSideOpacity) return;

  const natural = earth.getEarthSky('natural', 'low', true);
  const cinematic = earth.getEarthSky('cinematic', 'low', true);
  const cinematicHigh = earth.getEarthSky('cinematic', 'high', true);
  expect(natural['sky-color']).toBe('#030914');
  expect(natural['horizon-color']).toBe('#1f4b67');
  expect(natural['atmosphere-blend']).toEqual(['interpolate', ['linear'], ['zoom'], 0, 0.76, 1.5, 0.88, 3, 0.82, 5, 0.48, 7, 0]);
  expect(cinematic['atmosphere-blend']).toEqual(['interpolate', ['linear'], ['zoom'], 0, 0.82, 1.5, 0.92, 3, 0.86, 5, 0.52, 7, 0]);
  expect(cinematic['sky-color']).not.toBe(natural['sky-color']);
  expect(cinematicHigh['atmosphere-blend']).toEqual(['interpolate', ['linear'], ['zoom'], 0, 0.98, 1.5, 1, 3, 0.96, 5, 0.66, 7, 0]);
  expect(earth.getStableEarthLight()).toEqual({ anchor: 'map', position: [1.4, 225, 68], color: '#f2f6fb', intensity: 0.27 });
  expect(earth.getNightSideOpacity('high')).toBe(0.2);
  expect(earth.getNightSideOpacity('medium')).toBe(0.16);
  expect(earth.getNightSideOpacity('low')).toBe(0.12);
});

test('NASA overview tint fades over a fully opaque Esri base across zoom', () => {
  expect(typeof earth.getSatelliteImageryOpacity).toBe('function');
  if (!earth.getSatelliteImageryOpacity) return;

  expect(earth.getSatelliteImageryOpacity(0)).toEqual({ overview: 0.28, detail: 1 });
  expect(earth.getSatelliteImageryOpacity(2)).toEqual({ overview: 0.28, detail: 1 });
  expect(earth.getSatelliteImageryOpacity(3)).toEqual({ overview: 0.14, detail: 1 });
  expect(earth.getSatelliteImageryOpacity(4)).toEqual({ overview: 0, detail: 1 });
  expect(earth.getSatelliteImageryOpacity(6)).toEqual({ overview: 0, detail: 1 });
  expect(earth.getSatelliteImageryOpacity(Number.NaN)).toEqual({ overview: 0.28, detail: 1 });
  expect(earth.NASA_BLUE_MARBLE_TILE_TEMPLATE).toBe('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg');
  expect(earth.NASA_BLUE_MARBLE_TILE_MAX_ZOOM).toBe(8);
  expect(earth.NASA_BLUE_MARBLE_LAYER_MAX_ZOOM).toBe(4);
});

test('Night shading is opt-in and remains subtle when selected', () => {
  expect(earth.DEFAULT_NIGHT_SHADING).toBe(false);
  expect(earth.getNightSideOpacity?.('high')).toBeLessThanOrEqual(0.2);
  expect(earth.getNightSideOpacity?.('medium')).toBeLessThanOrEqual(0.16);
  expect(earth.getNightSideOpacity?.('low')).toBeLessThanOrEqual(0.12);
});

test('automatic rendering degrades gradually after measured slow movement frames', () => {
  expect(earth.degradeTier?.('high', 0)).toBe('high');
  expect(earth.degradeTier?.('high', 1)).toBe('medium');
  expect(earth.degradeTier?.('medium', 2)).toBe('low');
});

test('Terrain waits for a close view and decodes Mapterhorn Terrarium elevation correctly', () => {
  expect(typeof earth.shouldEnableTerrain).toBe('function');
  expect(typeof earth.getMapterhornTerrainSource).toBe('function');
  if (!earth.shouldEnableTerrain || !earth.getMapterhornTerrainSource) return;

  expect(earth.shouldEnableTerrain('auto', 'high', 1.5, 'globe')).toBe(false);
  expect(earth.shouldEnableTerrain('auto', 'medium', 6, 'flat')).toBe(false);
  expect(earth.shouldEnableTerrain('auto', 'medium', 8, 'flat')).toBe(true);
  expect(earth.shouldEnableTerrain('on', 'high', 6, 'globe')).toBe(true);
  expect(earth.shouldEnableTerrain('on', 'low', 12, 'globe')).toBe(false);
  expect(earth.shouldEnableTerrain('off', 'high', 12, 'flat')).toBe(false);
  expect(earth.getMapterhornTerrainSource()).toMatchObject({ encoding: 'terrarium', url: 'https://tiles.mapterhorn.com/tilejson.json' });
});

test('terrain and hillshade use separate DEM sources with map-anchored stable illumination', () => {
  expect(typeof earth.getMapterhornHillshadeSource).toBe('function');
  expect(typeof earth.getStableHillshadePaint).toBe('function');
  if (!earth.getMapterhornHillshadeSource || !earth.getStableHillshadePaint || !earth.getMapterhornTerrainSource) return;

  const terrainSource = earth.getMapterhornTerrainSource();
  const hillshadeSource = earth.getMapterhornHillshadeSource();
  expect(hillshadeSource).not.toBe(terrainSource);
  expect(hillshadeSource).toMatchObject({ type: 'raster-dem', encoding: 'terrarium', url: terrainSource.url });
  expect(earth.getStableHillshadePaint()).toEqual({
    'hillshade-illumination-anchor': 'map',
    'hillshade-illumination-direction': 225,
    'hillshade-exaggeration': 0.1,
    'hillshade-shadow-color': '#102431',
    'hillshade-highlight-color': '#d5d2c5',
  });
});

test('Solar shading follows UTC and produces a closed polygon within geographic bounds', () => {
  expect(typeof earth.solarSubpoint).toBe('function');
  expect(typeof earth.solarLightPosition).toBe('function');
  expect(typeof earth.solarNightGeometry).toBe('function');
  if (!earth.solarSubpoint || !earth.solarLightPosition || !earth.solarNightGeometry) return;

  const equinox = earth.solarSubpoint(new Date('2026-03-20T12:00:00Z'));
  expect(typeof earth.solarTerminatorCenter).toBe('function');
  const terminatorFocus = earth.solarTerminatorCenter?.(new Date('2026-03-20T12:00:00Z'));
  expect(terminatorFocus?.[0]).toBeCloseTo(equinox.longitude + 50, 1);
  expect(terminatorFocus?.[1]).toBe(0);
  const juneSolstice = earth.solarSubpoint(new Date('2026-06-21T12:00:00Z'));
  expect(Math.abs(equinox.latitude)).toBeLessThan(2);
  expect(juneSolstice.latitude).toBeGreaterThan(22);
  expect(juneSolstice.latitude).toBeLessThan(25);
  expect(Math.abs(juneSolstice.longitude)).toBeLessThan(5);
  const overheadLight = earth.solarLightPosition(new Date('2026-03-20T12:00:00Z'), equinox.latitude, equinox.longitude);
  expect(overheadLight[0]).toBe(1.15);
  expect(overheadLight[1]).toBeGreaterThanOrEqual(0);
  expect(overheadLight[1]).toBeLessThan(360);
  expect(overheadLight[2]).toBeLessThan(2);

  const geometry = earth.solarNightGeometry(new Date('2026-10-12T12:00:00Z'));
  expect(geometry.features).toHaveLength(2);
  const night = geometry.features.find(feature => feature.properties?.kind === 'approximate-night-side');
  const terminator = geometry.features.find(feature => feature.properties?.kind === 'approximate-solar-terminator');
  expect(night).toBeDefined();
  expect(terminator).toBeDefined();
  const coordinates = (night?.geometry as GeoJSON.Polygon).coordinates[0];
  expect(coordinates.length).toBeGreaterThan(350);
  expect(coordinates.every(([longitude, latitude]) => longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90)).toBe(true);
  expect(coordinates[0]).toEqual(coordinates[coordinates.length - 1]);
  const boundary = (terminator?.geometry as GeoJSON.LineString).coordinates;
  expect(boundary.length).toBeGreaterThan(350);
  expect(boundary.every(([longitude, latitude]) => longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90)).toBe(true);
});

test('NASA daily context layers use dated tiles and reject invalid calendar dates', () => {
  expect(typeof earth.getContextLayerTiles).toBe('function');
  expect(typeof earth.boundedOpacity).toBe('function');
  if (!earth.getContextLayerTiles || !earth.boundedOpacity) return;

  expect(earth.getContextLayerTiles('natural', '2026-10-07')?.url).toContain('MODIS_Terra_CorrectedReflectance_TrueColor/default/2026-10-07/');
  expect(earth.getContextLayerTiles('cloud-fraction', '2026-10-07')?.url).toContain('MODIS_Terra_Cloud_Fraction_Day/default/2026-10-07/');
  expect(earth.getContextLayerTiles('airs-methane-400hpa', '2026-10-07')?.url).toContain('AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day/default/2026-10-07/');
  expect(earth.getContextLayerTiles('off', '2026-10-07')).toBeNull();
  expect(earth.getContextLayerTiles('cloud-fraction', '2026-02-30')).toBeNull();
  expect(earth.boundedOpacity(60)).toBe(0.6);
  expect(earth.boundedOpacity(-20)).toBe(0);
  expect(earth.boundedOpacity(120)).toBe(1);
});
