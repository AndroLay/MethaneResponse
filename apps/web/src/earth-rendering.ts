import type { FeatureCollection } from 'geojson';

export type RenderPreference = 'auto' | 'eco' | 'balanced' | 'quality';
export type TerrainPreference = 'auto' | 'off' | 'on';
export type RenderTier = 'low' | 'medium' | 'high';
export type MapProjection = 'flat' | 'globe';
export type ContextLayer = 'off' | 'natural' | 'cloud-fraction' | 'airs-methane-400hpa';
export type EarthLook = 'natural' | 'cinematic';

export const DEFAULT_NIGHT_SHADING = false;
export const NASA_BLUE_MARBLE_TILE_TEMPLATE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export const NASA_BLUE_MARBLE_TILE_MAX_ZOOM = 8;
export const NASA_BLUE_MARBLE_LAYER_MAX_ZOOM = 4;

export function getSatelliteImageryOpacity(zoom: number): { overview: number; detail: number } {
  const finiteZoom = Number.isFinite(zoom) ? zoom : 0;
  const transition = Math.max(0, Math.min(1, (finiteZoom - 2) / (NASA_BLUE_MARBLE_LAYER_MAX_ZOOM - 2)));
  const overview = 0.28 * (1 - transition);
  return { overview, detail: 1 };
}

export type DeviceHints = {
  deviceMemoryGB?: number;
  cores?: number;
  screenWidth?: number;
  pixelRatio?: number;
};

export function resolveRenderTier(mode: RenderPreference, device: DeviceHints): RenderTier {
  if (mode === 'eco') return 'low';
  if (mode === 'balanced') return 'medium';
  if (mode === 'quality') return 'high';

  const memory = Number.isFinite(device.deviceMemoryGB) ? device.deviceMemoryGB : undefined;
  const cores = Number.isFinite(device.cores) ? device.cores : undefined;
  const width = Number.isFinite(device.screenWidth) ? device.screenWidth : undefined;
  const pixelRatio = Number.isFinite(device.pixelRatio) ? device.pixelRatio : undefined;

  if ((memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4)) return 'low';
  if (width !== undefined && width < 700 && memory !== undefined && memory <= 6) return 'low';
  if ((width !== undefined && width < 700) || (memory !== undefined && memory <= 8) || (pixelRatio !== undefined && pixelRatio > 2.5)) return 'medium';
  return 'high';
}

export function degradeTier(tier: RenderTier, penalty: number): RenderTier {
  const levels: RenderTier[] = ['low', 'medium', 'high'];
  const current = levels.indexOf(tier);
  const steps = Number.isFinite(penalty) ? Math.max(0, Math.min(2, Math.floor(penalty))) : 0;
  return levels[Math.max(0, current - steps)];
}

export function getEarthSky(look: EarthLook, tier: RenderTier, globe: boolean): Record<string, unknown> {
  const base = look === 'cinematic'
    ? { 'sky-color': '#02050b', 'horizon-color': '#23465d', 'horizon-fog-blend': 0.24 }
    : { 'sky-color': '#030914', 'horizon-color': '#1f4b67', 'horizon-fog-blend': 0.22 };
  const blendByLook: Record<EarthLook, Record<RenderTier, [number, number, number, number]>> = {
    natural: {
      low: [0.76, 0.88, 0.82, 0.48],
      medium: [0.84, 0.94, 0.89, 0.52],
      high: [0.92, 0.98, 0.94, 0.58],
    },
    cinematic: {
      low: [0.82, 0.92, 0.86, 0.52],
      medium: [0.9, 0.97, 0.92, 0.58],
      high: [0.98, 1, 0.96, 0.66],
    },
  };
  const [atZero, atOneAndHalf, atThree, atFive] = blendByLook[look][tier];
  return {
    ...base,
    'sky-horizon-blend': tier === 'low' ? 0.32 : tier === 'medium' ? 0.4 : 0.48,
    'atmosphere-blend': globe
      ? ['interpolate', ['linear'], ['zoom'], 0, atZero, 1.5, atOneAndHalf, 3, atThree, 5, atFive, 7, 0]
      : 0,
  };
}

export function getStableEarthLight() {
  return { anchor: 'map' as const, position: [1.4, 225, 68] as [number, number, number], color: '#f2f6fb', intensity: 0.27 };
}

export function getNightSideOpacity(tier: RenderTier): number {
  return tier === 'high' ? 0.2 : tier === 'medium' ? 0.16 : 0.12;
}

export function getRenderPixelRatio(tier: RenderTier, nativeRatio: number): number {
  const ratio = Number.isFinite(nativeRatio) && nativeRatio > 0 ? nativeRatio : 1;
  return Math.min(ratio, tier === 'low' ? 1 : tier === 'medium' ? 1.5 : 2);
}

export function shouldEnableTerrain(preference: TerrainPreference, tier: RenderTier, zoom: number, projection: MapProjection): boolean {
  if (preference === 'off' || tier === 'low' || !Number.isFinite(zoom)) return false;
  const threshold = preference === 'on'
    ? (projection === 'globe' ? 5.8 : 4.7)
    : (tier === 'high' ? 6.2 : 7.5);
  return zoom >= threshold;
}

export function getMapterhornTerrainSource() {
  return {
    type: 'raster-dem' as const,
    url: 'https://tiles.mapterhorn.com/tilejson.json',
    encoding: 'terrarium' as const,
    attribution: 'Terrain data © Mapterhorn',
  };
}

export function getMapterhornHillshadeSource() {
  return { ...getMapterhornTerrainSource() };
}

export function getStableHillshadePaint() {
  return {
    'hillshade-illumination-anchor': 'map' as const,
    'hillshade-illumination-direction': 225,
    'hillshade-exaggeration': 0.1,
    'hillshade-shadow-color': '#102431',
    'hillshade-highlight-color': '#d5d2c5',
  };
}

export function solarSubpoint(when: Date): { latitude: number; longitude: number } {
  if (!Number.isFinite(when.getTime())) return { latitude: 0, longitude: 0 };
  const yearStart = Date.UTC(when.getUTCFullYear(), 0, 1);
  const day = 1 + (when.getTime() - yearStart) / 86_400_000;
  const minute = when.getUTCHours() * 60 + when.getUTCMinutes() + when.getUTCSeconds() / 60;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (minute / 60 - 12) / 24);
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const rawLongitude = (720 - minute - equationOfTime) / 4;
  const longitude = ((rawLongitude + 180) % 360 + 360) % 360 - 180;
  return { latitude: declination * 180 / Math.PI, longitude };
}

export function solarTerminatorCenter(when: Date, offsetDegrees = 50): [number, number] {
  const sun = solarSubpoint(when);
  const offset = Number.isFinite(offsetDegrees) ? Math.max(30, Math.min(70, offsetDegrees)) : 50;
  const longitude = ((sun.longitude + offset + 180) % 360 + 360) % 360 - 180;
  return [longitude, 0];
}

export function solarLightPosition(when: Date, latitude: number, longitude: number): [number, number, number] {
  const sun = solarSubpoint(when);
  const phi = (Number.isFinite(latitude) ? Math.max(-90, Math.min(90, latitude)) : 0) * Math.PI / 180;
  const delta = sun.latitude * Math.PI / 180;
  const hourAngle = (((Number.isFinite(longitude) ? longitude : 0) - sun.longitude + 540) % 360 - 180) * Math.PI / 180;
  const altitudeSine = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const altitude = Math.asin(Math.max(-1, Math.min(1, altitudeSine)));
  const north = Math.sin(delta) * Math.cos(phi) - Math.cos(delta) * Math.sin(phi) * Math.cos(hourAngle);
  const east = -Math.cos(delta) * Math.sin(hourAngle);
  const azimuth = (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
  const polar = Math.max(0, Math.min(180, 90 - altitude * 180 / Math.PI));
  return [1.15, azimuth, polar];
}

export function solarNightGeometry(when: Date): FeatureCollection {
  const sun = solarSubpoint(when);
  const declinationDegrees = Math.abs(sun.latitude) < 0.00001 ? 0.00001 : sun.latitude;
  const declination = declinationDegrees * Math.PI / 180;
  const northernDay = declination >= 0;
  const boundary: number[][] = [];

  for (let longitude = -180; longitude <= 180; longitude += 1) {
    const hourAngle = (longitude - sun.longitude) * Math.PI / 180;
    const solarAltitude = (latitude: number) => Math.sin(latitude) * Math.sin(declination)
      + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
    let low = -Math.PI / 2 + 1e-8;
    let high = Math.PI / 2 - 1e-8;
    for (let step = 0; step < 22; step += 1) {
      const middle = (low + high) / 2;
      if ((solarAltitude(middle) > 0) === northernDay) high = middle;
      else low = middle;
    }
    boundary.push([longitude, ((low + high) / 2) * 180 / Math.PI]);
  }

  const nightPole = northernDay ? -90 : 90;
  const ring = [[-180, nightPole], ...boundary, [180, nightPole], [-180, nightPole]];
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'approximate-night-side', description: 'UTC solar-position shading; not an emission or nighttime satellite observation' },
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
      {
        type: 'Feature',
        properties: { kind: 'approximate-solar-terminator', description: 'Approximate UTC boundary between day and night; not a methane measurement' },
        geometry: { type: 'LineString', coordinates: boundary },
      },
    ],
  };
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getContextLayerTiles(layer: ContextLayer, date: string): { url: string; maxzoom: number; attribution: string } | null {
  if (layer === 'off' || !isCalendarDate(date)) return null;
  const base = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
  if (layer === 'natural') {
    return {
      url: `${base}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      maxzoom: 9,
      attribution: 'NASA GIBS · MODIS Terra Corrected Reflectance True Color',
    };
  }
  if (layer === 'cloud-fraction') {
    return {
      url: `${base}/MODIS_Terra_Cloud_Fraction_Day/default/${date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
      maxzoom: 7,
      attribution: 'NASA GIBS · MODIS Terra Cloud Fraction Day',
    };
  }
  return {
    url: `${base}/AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
    maxzoom: 6,
    attribution: 'NASA GIBS · AIRS L3 methane at 400 hPa',
  };
}

export function boundedOpacity(percentage: number): number {
  return Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) / 100 : 0.55;
}
