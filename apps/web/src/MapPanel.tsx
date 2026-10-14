import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent, type ProjectionSpecification, type StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { MarsObservation, MarsSource } from './mars';
import { filterObservationsForMonth, filterObservationsThroughMonth, getLatestObservationMonthForSource, getObservationDateRange, getObservationHistoryBuckets } from './observation-history';
import { decoratePlumeFootprintsForMap, filterPlumeFootprints, getFluxFootprintColorExpression, loadMonthlyPlumeGeometry, shouldLoadPlumeFootprints, toPlumeObservationLocations, type PlumeFootprintCollection, type PlumeGeometryManifest } from './plume-geometries';
import { shouldAnalyzeObservationHistory, shouldBuildObservationPoints, shouldBuildSourcePoints } from './map-panel-load';
import { getReportedFluxColor, REPORTED_FLUX_PALETTE } from './map-marker-style';
import { getObservationMarkerDetails, getSourceMarkerDetails, type MapMarkerDetail } from './map-marker-details';
import { getSourceMapFocusView, SOURCE_MARKER_CLUSTER_MAX_ZOOM, type MapFocusRequest } from './map-focus';
import { getMapToplineLabel } from './map-surface-copy';
import { watchMapReadiness } from './map-readiness';
import { ESRI_WORLD_IMAGERY_TILE_TEMPLATE } from './map-imagery';
import 'maplibre-gl/dist/maplibre-gl.css';
export { getFluxFootprintColor } from './plume-geometries';
import {
  boundedOpacity,
  DEFAULT_NIGHT_SHADING,
  degradeTier,
  getContextLayerTiles,
  getEarthSky,
  getMapterhornTerrainSource,
  getMapterhornHillshadeSource,
  getNightSideOpacity,
  getRenderPixelRatio,
  getSatelliteImageryOpacity,
  getStableEarthLight,
  getStableHillshadePaint,
  NASA_BLUE_MARBLE_TILE_TEMPLATE,
  NASA_BLUE_MARBLE_TILE_MAX_ZOOM,
  NASA_BLUE_MARBLE_LAYER_MAX_ZOOM,
  resolveRenderTier,
  shouldEnableTerrain,
  solarNightGeometry,
  solarTerminatorCenter,
  type ContextLayer,
  type EarthLook,
  type RenderPreference,
  type RenderTier,
  type TerrainPreference,
} from './earth-rendering';

const DARK = 'https://tiles.openfreemap.org/styles/fiord';
const STREET = 'https://tiles.openfreemap.org/styles/liberty';
const MARS_DATASET_URL = 'https://methanedata.unep.org/download-dataset';
export function shouldUseCompactAttribution(mapWidth: number): boolean {
  return !Number.isFinite(mapWidth) || mapWidth < 900;
}

function satelliteStyle(saturation: number, look: EarthLook = 'natural'): StyleSpecification {
  const start = getSatelliteImageryOpacity(2);
  const end = getSatelliteImageryOpacity(NASA_BLUE_MARBLE_LAYER_MAX_ZOOM);
  return {
  version: 8,
  sources: {
    'blue-marble': { type: 'raster', tiles: [NASA_BLUE_MARBLE_TILE_TEMPLATE], tileSize: 256, maxzoom: NASA_BLUE_MARBLE_TILE_MAX_ZOOM, attribution: 'NASA Blue Marble · NASA Global Imagery Browse Services (GIBS)' },
    imagery: { type: 'raster', tiles: [ESRI_WORLD_IMAGERY_TILE_TEMPLATE], tileSize: 256, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community' },
  },
  layers: [
    { id: 'satellite-imagery', type: 'raster', source: 'imagery', minzoom: 0, paint: {
      'raster-saturation': saturation, 'raster-contrast': getRasterContrast(look),
      'raster-opacity': start.detail, 'raster-fade-duration': 240,
    } },
    { id: 'blue-marble-overview', type: 'raster', source: 'blue-marble', maxzoom: NASA_BLUE_MARBLE_LAYER_MAX_ZOOM, paint: {
      'raster-saturation': saturation, 'raster-contrast': getRasterContrast(look),
      'raster-opacity': ['interpolate', ['linear'], ['zoom'], 2, start.overview, NASA_BLUE_MARBLE_LAYER_MAX_ZOOM, end.overview], 'raster-fade-duration': 240,
    } },
  ],
  };
}
export type MapTheme = 'dark' | 'satellite' | 'grayscale' | 'street';
export type MapProjection = 'flat' | 'globe';
export type MapDataLayer = 'source-density' | 'observed-flux' | 'plume-footprints' | 'investigation-priority';
type MapStatus = 'loading' | 'ready' | 'error';
type PriorityRanking = { sourceId: string; priorityScore: number; priorityBand: 'low' | 'medium' | 'high'; priorityType: 'heuristic_not_probability'; lastObserved?: string | null; dataSufficiency?: string };
type RankingState = 'idle' | 'loading' | 'ready' | 'unavailable';
type FootprintState = 'idle' | 'loading' | 'ready' | 'paused-low-power' | 'unavailable';
const emptyPoints: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };
const emptyFootprints: PlumeFootprintCollection = { type: 'FeatureCollection', features: [] };
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getFluxOverlayWeight(flux: number | null): number {
  if (flux === null || !Number.isFinite(flux) || flux <= 0) return 0;
  return Math.min(Math.log1p(flux) / Math.log1p(5000), 1);
}

export function toFluxOverlayGeoJSON(observations: MarsObservation[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: observations.filter(observation => Number.isFinite(observation.lat) && Number.isFinite(observation.lon)
      && Math.abs(observation.lat!) <= 90 && Math.abs(observation.lon!) <= 180).map(observation => ({
      type: 'Feature',
      id: observation.id,
      geometry: { type: 'Point', coordinates: [observation.lon!, observation.lat!] },
      properties: {
        id: observation.id,
        sourceId: observation.sourceId || null,
        date: observation.date,
        flux: observation.fluxKgHr,
        fluxWeight: getFluxOverlayWeight(observation.fluxKgHr),
        uncertainty: observation.uncertaintyKgHr ?? null,
        linked: observation.linkStatus === 'linked' && Boolean(observation.sourceId) ? 1 : 0,
      },
    })),
  };
}

export function toFluxGridGeoJSON(observations: MarsObservation[], gridDegrees = 1): FeatureCollection<Point> {
  const step = Number.isFinite(gridDegrees) && gridDegrees >= 0.25 && gridDegrees <= 10 ? gridDegrees : 1;
  const bins = new Map<string, { latIndex: number; lonIndex: number; fluxes: number[]; uncertainties: number[]; dates: string[]; sources: Set<string> }>();
  for (const observation of observations) {
    const { lat, lon, fluxKgHr } = observation;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat!) > 90 || Math.abs(lon!) > 180
      || fluxKgHr === null || !Number.isFinite(fluxKgHr) || fluxKgHr <= 0) continue;
    const latIndex = Math.floor(lat! / step);
    const lonIndex = Math.floor(lon! / step);
    const key = `${latIndex}:${lonIndex}`;
    let bin = bins.get(key);
    if (!bin) {
      bin = { latIndex, lonIndex, fluxes: [], uncertainties: [], dates: [], sources: new Set() };
      bins.set(key, bin);
    }
    bin.fluxes.push(fluxKgHr);
    if (observation.uncertaintyKgHr !== null && observation.uncertaintyKgHr !== undefined
      && Number.isFinite(observation.uncertaintyKgHr) && observation.uncertaintyKgHr >= 0) bin.uncertainties.push(observation.uncertaintyKgHr);
    const date = observation.date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) bin.dates.push(date);
    if (observation.sourceId) bin.sources.add(observation.sourceId);
  }
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  };
  return {
    type: 'FeatureCollection',
    features: [...bins.entries()].map(([key, bin]) => {
      const dates = bin.dates.sort();
      return {
        type: 'Feature' as const,
        id: `flux-cell-${key}`,
        geometry: {
          type: 'Point' as const,
          coordinates: [Math.max(-180, Math.min(180, (bin.lonIndex + 0.5) * step)), Math.max(-90, Math.min(90, (bin.latIndex + 0.5) * step))] as [number, number],
        },
        properties: {
          medianFlux: median(bin.fluxes),
          sampleCount: bin.fluxes.length,
          medianUncertainty: bin.uncertainties.length ? median(bin.uncertainties) : null,
          gridDegrees: step,
          sourceCount: bin.sources.size,
          periodStart: dates[0] || null,
          periodEnd: dates[dates.length - 1] || null,
        },
      };
    }),
  };
}

export function toPriorityOverlayGeoJSON(sources: MarsSource[], rankings: PriorityRanking[]): FeatureCollection<Point> {
  const rankingBySource = new Map(rankings.map(row => [row.sourceId, row]));
  return {
    type: 'FeatureCollection',
    features: validSources(sources).filter(source => source.synthetic === false && rankingBySource.has(source.sourceId)).map(source => {
      const ranking = rankingBySource.get(source.sourceId)!;
      return {
        type: 'Feature' as const,
        id: source.sourceId,
        geometry: { type: 'Point' as const, coordinates: [source.lon, source.lat] as [number, number] },
        properties: {
          id: source.sourceId,
          priorityScore: ranking.priorityScore,
          priorityBand: ranking.priorityBand,
          priorityType: ranking.priorityType,
          lastObserved: ranking.lastObserved || null,
          dataSufficiency: ranking.dataSufficiency || 'unknown',
        },
      };
    }),
  };
}

export function getRasterSaturation(theme: MapTheme, grayPercent: number, look: EarthLook = 'natural'): number {
  if (theme === 'satellite') return look === 'cinematic' ? 0.14 : 0.07;
  if (theme !== 'grayscale') return 0;
  const boundedPercent = Number.isFinite(grayPercent) ? Math.max(0, Math.min(100, grayPercent)) : 100;
  return boundedPercent === 0 ? 0 : -boundedPercent / 100;
}

export function getRasterContrast(look: EarthLook): number {
  return look === 'cinematic' ? 0.16 : 0.08;
}

export function getFluxMarkerColor(flux: number | null): string {
  return getReportedFluxColor(flux);
}

export function getProjectionSpec(mode: MapProjection): ProjectionSpecification {
  return { type: mode === 'globe' ? 'globe' : 'mercator' };
}

export function getGlobeOverview(sources: Array<Pick<MarsSource, 'lat' | 'lon'>>, viewportWidth = 895, viewportHeight = 338): { center: [number, number]; zoom: number } {
  const points = sources.filter(source => Number.isFinite(source.lat) && Number.isFinite(source.lon) && Math.abs(source.lat) <= 90 && Math.abs(source.lon) <= 180);
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? Math.max(320, Math.min(viewportWidth, 2400)) : 895;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? Math.max(180, Math.min(viewportHeight, 1600)) : 338;
  const targetDiameter = Math.min(width, height) * 0.92;
  const zoom = Math.min(2.5, Math.max(0, Math.log2(targetDiameter / 135)));
  if (!points.length) return { center: [0, 18], zoom };

  const longitudes = points.map(source => source.lon * Math.PI / 180);
  const meanSin = longitudes.reduce((sum, longitude) => sum + Math.sin(longitude), 0);
  const meanCos = longitudes.reduce((sum, longitude) => sum + Math.cos(longitude), 0);
  const longitude = Math.atan2(meanSin, meanCos) * 180 / Math.PI;
  const latitude = points.reduce((sum, source) => sum + source.lat, 0) / points.length;

  return { center: [Math.abs(longitude) < 1e-10 ? 0 : longitude, latitude], zoom };
}

export function isGlobeRendererFailure(mode: MapProjection, message: string): boolean {
  return mode === 'globe' && /webgl|shader|context lost|out of memory/i.test(message);
}

export function isSoftwareWebGLRenderer(renderer: string | null): boolean {
  return renderer !== null && /swiftshader|llvmpipe|software\s+rasterizer/i.test(renderer);
}

export function isGlobeProjectionSupported(contextAvailable: boolean, renderer: string | null): boolean {
  void renderer;
  return contextAvailable;
}

export function getInitialRenderTierForRenderer(renderer: string | null, preferredTier: RenderTier): RenderTier {
  return isSoftwareWebGLRenderer(renderer) ? 'low' : preferredTier;
}

function probeWebGLRenderer(): { contextAvailable: boolean; renderer: string | null } {
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return { contextAvailable: false, renderer: null };
    const debugInfo = context.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
    const renderer = debugInfo ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : null;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return { contextAvailable: true, renderer };
  } catch {
    return { contextAvailable: false, renderer: null };
  }
}

function getWebGLRendererName(canvas: HTMLCanvasElement): string | null {
  const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  const debugInfo = context?.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
  return context && debugInfo ? String(context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : null;
}

export function getStatusAfterMapError(status: MapStatus): MapStatus {
  return status === 'loading' ? 'error' : status;
}

export function getMapInitializationFallbackMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/webgl|shader|context|graphics/i.test(message)) {
    return 'This browser could not initialize WebGL. You can still inspect the selected case and evidence below.';
  }
  return 'The interactive map could not be initialized. You can still inspect the selected case and evidence below.';
}

export function getMapErrorNotice(error: unknown): string | null {
  if (error === null || error === undefined) return null;
  const message = error instanceof Error ? error.message : String(error);
  if (!message.trim() || /\/fonts\//i.test(message)) return null;
  const tileResource = /\btiles?\b|\/(?:tiles?|tile)\//i.test(message);
  const requestFailure = /\b(?:failed?|failure|error|unavailable|request|load|fetch|timeout)\b/i.test(message);
  if (tileResource && requestFailure) return 'Map tiles failed; source markers remain visible.';
  return 'Map rendering reported an error; some layers may be unavailable.';
}

export function isRecoverableMapTileError(error: unknown): boolean {
  return getMapErrorNotice(error) === 'Map tiles failed; source markers remain visible.';
}

export function getFootprintOutlineLineWidthExpression(): unknown[] {
  const isSelected = ['==', ['get', 'mapSourceSelected'], 1];
  return ['interpolate', ['linear'], ['zoom'],
    4, ['case', isSelected, 1.6, 0.45],
    10, ['case', isSelected, 2.8, 0.85],
    15, ['case', isSelected, 4, 1.4],
  ];
}

export function runWhenStyleReady(
  map: { isStyleLoaded: () => boolean | void; once: (event: 'idle', callback: () => void) => unknown },
  queued: { current: boolean },
  work: () => void,
): boolean {
  if (map.isStyleLoaded() === true) return true;
  if (queued.current) return false;
  queued.current = true;
  map.once('idle', () => {
    queued.current = false;
    if (map.isStyleLoaded() === true) work();
  });
  return false;
}

function styleForTheme(theme: MapTheme, grayPercent: number, look: EarthLook): string | StyleSpecification {
  if (theme === 'dark') return DARK;
  if (theme === 'street') return STREET;
  return satelliteStyle(getRasterSaturation(theme, grayPercent, look), look);
}

type Props = { sources: MarsSource[]; sourcesReady?: boolean; observations?: MarsObservation[]; recordMode?: 'sources' | 'plumes'; dataLayer?: MapDataLayer; latestObservationDate?: string | null; datasetSnapshotId?: string | null; sourceArchiveSha256?: string | null; selectedId: string | null; focusRequest?: MapFocusRequest | null; onFocusRequestHandled?: (requestId: number) => void; onSelect: (id: string) => void; onSelectUnlinked?: (plumeId: string) => void; onProjectionFallback: () => void; onGlobeSupportChange: (supported: boolean) => void; theme: MapTheme; grayPercent: number; projection: MapProjection; focusOnly: boolean; expanded?: boolean; initialRenderPreference?: RenderPreference; onRenderPreferenceChange?: (preference: RenderPreference) => void };
const validSources = (sources: MarsSource[]) => sources.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180);
function getUtcDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}
function deviceHints(screenWidth: number) {
  const browserNavigator = typeof navigator === 'undefined' ? undefined : navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemoryGB: browserNavigator?.deviceMemory,
    cores: browserNavigator?.hardwareConcurrency,
    screenWidth,
    pixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  };
}
const contextLayerName: Record<ContextLayer, string> = {
  off: 'Off',
  natural: 'NASA MODIS true color',
  'cloud-fraction': 'NASA cloud fraction',
  'airs-methane-400hpa': 'AIRS methane · 400 hPa',
};
function toGeoJSON(sources: MarsSource[], selectedId: string | null): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: validSources(sources).map(s => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    properties: { id: s.sourceId, label: s.name, region: s.region, flux: s.maxFluxKgHr ?? null, fluxColor: getReportedFluxColor(s.maxFluxKgHr), observations: s.plumeCount ?? s.observations?.length ?? 0, selected: s.sourceId === selectedId ? 1 : 0, synthetic: s.synthetic ? 1 : 0 },
  })) };
}

export function toObservationGeoJSON(observations: MarsObservation[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: observations.filter(observation => Number.isFinite(observation.lat) && Number.isFinite(observation.lon)
      && Math.abs(observation.lat!) <= 90 && Math.abs(observation.lon!) <= 180).map(observation => ({
      type: 'Feature',
      id: observation.id,
      geometry: { type: 'Point', coordinates: [observation.lon!, observation.lat!] },
      properties: {
        id: observation.id,
        sourceId: observation.sourceId || null,
        date: observation.date,
        flux: observation.fluxKgHr,
        uncertainty: observation.uncertaintyKgHr ?? null,
        satellite: observation.satellite || '',
        linked: observation.linkStatus === 'linked' && Boolean(observation.sourceId) ? 1 : 0,
        linkStatus: observation.linkStatus || (observation.sourceId ? 'source_record_missing' : 'source_id_missing'),
      },
    })),
  };
}

function createMarkerPopupContent(title: string, details: MapMarkerDetail[], note: string): HTMLElement {
  const content = document.createElement('section');
  content.className = 'geo-marker-popup';
  content.setAttribute('aria-label', title);
  const heading = document.createElement('h2');
  heading.textContent = title;
  content.append(heading);

  const list = document.createElement('dl');
  for (const detail of details) {
    const term = document.createElement('dt');
    term.textContent = detail.label;
    const value = document.createElement('dd');
    value.textContent = detail.value;
    list.append(term, value);
  }
  content.append(list);

  const noteNode = document.createElement('p');
  noteNode.textContent = note;
  content.append(noteNode);

  const sourceLink = document.createElement('a');
  sourceLink.href = MARS_DATASET_URL;
  sourceLink.target = '_blank';
  sourceLink.rel = 'noopener noreferrer';
  sourceLink.textContent = 'Open official UNEP MARS dataset';
  content.append(sourceLink);
  return content;
}

export default function MapPanel({ sources, sourcesReady = true, observations = [], recordMode = 'sources', dataLayer = 'source-density', latestObservationDate = null, datasetSnapshotId = null, sourceArchiveSha256 = null, selectedId, focusRequest = null, onFocusRequestHandled, onSelect, onSelectUnlinked, onProjectionFallback, onGlobeSupportChange, theme, grayPercent, projection, focusOnly, expanded = false, initialRenderPreference = 'auto', onRenderPreferenceChange }: Props) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const sourcesRef = useRef(sources);
  const focusRequestRef = useRef(focusRequest);
  const focusRequestHandledRef = useRef<number | null>(null);
  const skipGlobeOverviewAfterFocusRef = useRef(false);
  const onFocusRequestHandledRef = useRef(onFocusRequestHandled);
  const fluxOverlayRef = useRef(emptyPoints);
  const priorityRowsRef = useRef<PriorityRanking[]>([]);
  const onSelectRef = useRef(onSelect);
  const onSelectUnlinkedRef = useRef(onSelectUnlinked);
  const recordModeRef = useRef(recordMode);
  const dataLayerRef = useRef(dataLayer);
  const themeRef = useRef(theme);
  const grayPercentRef = useRef(grayPercent);
  const projectionRef = useRef(projection);
  const projectionFallbackRef = useRef(onProjectionFallback);
  const globeSupportChangeRef = useRef(onGlobeSupportChange);
  const markerProvenanceRef = useRef({ snapshotId: datasetSnapshotId, archiveSha256: sourceArchiveSha256 });
  focusRequestRef.current = focusRequest;
  onFocusRequestHandledRef.current = onFocusRequestHandled;
  const [status, setStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapRuntimeNotice, setMapRuntimeNotice] = useState<string | null>(null);
  const [coords, setCoords] = useState<[number, number, number] | null>(null);
  const [renderPreference, setRenderPreference] = useState<RenderPreference>(initialRenderPreference);
  const [renderPenalty, setRenderPenalty] = useState(0);
  const [earthLook, setEarthLook] = useState<EarthLook>('natural');
  const [terrainPreference, setTerrainPreference] = useState<TerrainPreference>('auto');
  const [nightShading, setNightShading] = useState(DEFAULT_NIGHT_SHADING);
  const [overviewFallback, setOverviewFallback] = useState(false);
  const [contextLayer, setContextLayer] = useState<ContextLayer>('off');
  const [contextDate, setContextDate] = useState(() => getUtcDateDaysAgo(7));
  const [contextOpacity, setContextOpacity] = useState(38);
  const [contextError, setContextError] = useState<string | null>(null);
  const [terrainError, setTerrainError] = useState<string | null>(null);
  const [priorityState, setPriorityState] = useState<RankingState>('idle');
  const [priorityRows, setPriorityRows] = useState<PriorityRanking[]>([]);
  const [prioritySnapshot, setPrioritySnapshot] = useState<{ modelVersion: string; snapshotSha256: string; generatedAt: string } | null>(null);
  const [footprintState, setFootprintState] = useState<FootprintState>('idle');
  const [footprintData, setFootprintData] = useState<PlumeFootprintCollection>(emptyFootprints);
  const [footprintManifest, setFootprintManifest] = useState<PlumeGeometryManifest | null>(null);
  const [footprintError, setFootprintError] = useState<string | null>(null);
  const [footprintRetry, setFootprintRetry] = useState(0);
  const footprintDataRef = useRef<PlumeFootprintCollection>(emptyFootprints);
  const footprintLocationsRef = useRef<FeatureCollection<Point>>(emptyPoints);
  const footprintStateRef = useRef<FootprintState>('idle');
  const rankingsLoaded = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1024 : window.innerWidth);
  const [isTilted, setIsTilted] = useState(false);
  const [historySelection, setHistorySelection] = useState<{ sourceId: string | null; month: string | null }>(() => ({ sourceId: selectedId, month: null }));
  const [historyPlayback, setHistoryPlayback] = useState(false);
  const historyLayersActive = shouldAnalyzeObservationHistory(recordMode, dataLayer);
  const historyBuckets = useMemo(() => historyLayersActive ? getObservationHistoryBuckets(observations) : [], [historyLayersActive, observations]);
  const latestHistoryMonth = historyBuckets.at(-1)?.month || null;
  const selectedSourceHistoryMonth = useMemo(() => getLatestObservationMonthForSource(observations, selectedId), [observations, selectedId]);
  const selectedHistoryMonth = historySelection.sourceId === selectedId ? historySelection.month : null;
  const selectedHistoryMonthResolved = selectedHistoryMonth && historyBuckets.some(bucket => bucket.month === selectedHistoryMonth)
    ? selectedHistoryMonth
    : dataLayer === 'plume-footprints' && selectedSourceHistoryMonth && historyBuckets.some(bucket => bucket.month === selectedSourceHistoryMonth)
      ? selectedSourceHistoryMonth
      : latestHistoryMonth;
  const selectedHistoryIndex = selectedHistoryMonthResolved ? historyBuckets.findIndex(bucket => bucket.month === selectedHistoryMonthResolved) : -1;
  const selectedHistoryBucket = selectedHistoryIndex >= 0 ? historyBuckets[selectedHistoryIndex] : null;
  const historicalObservations = useMemo(() => filterObservationsThroughMonth(observations, selectedHistoryMonthResolved), [observations, selectedHistoryMonthResolved]);
  const visibleObservations = useMemo(() => focusOnly ? historicalObservations.filter(item => item.sourceId === selectedId) : historicalObservations, [focusOnly, historicalObservations, selectedId]);
  const selectedMonthObservations = useMemo(() => selectedHistoryMonthResolved
    ? filterObservationsForMonth(visibleObservations, selectedHistoryMonthResolved)
    : [], [visibleObservations, selectedHistoryMonthResolved]);
  const renderSources = useMemo(() => focusOnly ? sources.filter(source => source.sourceId === selectedId) : sources, [focusOnly, sources, selectedId]);
  const sourceGeoJSON = useMemo(() => shouldBuildSourcePoints(recordMode, dataLayer, priorityRows.length > 0)
    ? toGeoJSON(renderSources, selectedId)
    : emptyPoints, [recordMode, dataLayer, priorityRows.length, renderSources, selectedId]);
  const observationGeoJSON = useMemo(() => shouldBuildObservationPoints(recordMode, dataLayer === 'plume-footprints')
    ? toObservationGeoJSON(visibleObservations)
    : emptyPoints, [recordMode, dataLayer, visibleObservations]);
  const visibleFootprints = useMemo(() => footprintState === 'ready'
    ? decoratePlumeFootprintsForMap(filterPlumeFootprints(footprintData, selectedMonthObservations), selectedId)
    : emptyFootprints, [footprintState, footprintData, selectedMonthObservations, selectedId]);
  const footprintLocations = useMemo(() => toPlumeObservationLocations(
    selectedMonthObservations,
    visibleFootprints,
    selectedHistoryMonthResolved || '',
    footprintState === 'ready',
  ), [selectedMonthObservations, visibleFootprints, selectedHistoryMonthResolved, footprintState]);
  const preferredTier = useMemo(() => resolveRenderTier(renderPreference, deviceHints(viewportWidth)), [renderPreference, viewportWidth]);
  const renderTier: RenderTier = renderPreference === 'auto' ? degradeTier(preferredTier, renderPenalty) : preferredTier;
  const lowPowerFluxGrid = useMemo(() => dataLayer === 'observed-flux' && renderTier === 'low'
    ? toFluxGridGeoJSON(visibleObservations)
    : emptyPoints, [dataLayer, renderTier, visibleObservations]);
  const priorityOverlay = useMemo(() => dataLayer === 'investigation-priority'
    ? toPriorityOverlayGeoJSON(renderSources, priorityRows)
    : emptyPoints, [dataLayer, renderSources, priorityRows]);
  const fluxOverlay = useMemo(() => {
    if (renderTier === 'low') return emptyPoints;
    if (dataLayer === 'observed-flux') return toFluxOverlayGeoJSON(visibleObservations);
    if (dataLayer === 'plume-footprints') return toFluxOverlayGeoJSON(selectedMonthObservations);
    return emptyPoints;
  }, [renderTier, dataLayer, visibleObservations, selectedMonthObservations]);
  const renderPreferenceRef = useRef(renderPreference);
  const earthLookRef = useRef(earthLook);
  const earthSettingsRef = useRef({ renderTier, terrainPreference, nightShading, contextLayer, contextDate, contextOpacity, projection, earthLook });
  const syncEarthRef = useRef<() => void>(() => {});
  const contextSignatureRef = useRef<string | null>(null);
  const failedTerrainRef = useRef(false);
  const failedOverviewRef = useRef(false);
  const sourceGeoJSONRef = useRef(sourceGeoJSON);
  const observationGeoJSONRef = useRef(observationGeoJSON);
  const lowPowerFluxGridRef = useRef(lowPowerFluxGrid);
  const priorityOverlayRef = useRef(priorityOverlay);
  onSelectRef.current = onSelect; onSelectUnlinkedRef.current = onSelectUnlinked; recordModeRef.current = recordMode;
  dataLayerRef.current = dataLayer;
  sourcesRef.current = sources;
  markerProvenanceRef.current = { snapshotId: datasetSnapshotId, archiveSha256: sourceArchiveSha256 };
  sourceGeoJSONRef.current = sourceGeoJSON;
  observationGeoJSONRef.current = observationGeoJSON;
  lowPowerFluxGridRef.current = lowPowerFluxGrid;
  priorityOverlayRef.current = priorityOverlay;
  priorityRowsRef.current = priorityRows;
  themeRef.current = theme; grayPercentRef.current = grayPercent; projectionRef.current = projection; projectionFallbackRef.current = onProjectionFallback; globeSupportChangeRef.current = onGlobeSupportChange;
  renderPreferenceRef.current = renderPreference; earthLookRef.current = earthLook;
  earthSettingsRef.current = { renderTier, terrainPreference, nightShading, contextLayer, contextDate, contextOpacity, projection, earthLook };
  const sourceCount = recordMode === 'plumes' ? observationGeoJSON.features.length : renderSources.length;
  const positiveFluxLocationCount = useMemo(() => dataLayer === 'observed-flux'
    ? visibleObservations.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon)
      && Math.abs(item.lat!) <= 90 && Math.abs(item.lon!) <= 180 && item.fluxKgHr !== null && Number.isFinite(item.fluxKgHr) && item.fluxKgHr > 0).length
    : 0, [dataLayer, visibleObservations]);
  const lowPowerCellCount = lowPowerFluxGrid.features.length;
  const observationDateRange = useMemo(() => historyLayersActive ? getObservationDateRange(visibleObservations) : null, [historyLayersActive, visibleObservations]);
  const observationPeriod = observationDateRange ? `${observationDateRange.start} – ${observationDateRange.end}` : 'date unavailable';
  const historyTimelineVisible = historyBuckets.length > 0 && (dataLayer === 'observed-flux' || dataLayer === 'plume-footprints' || recordMode === 'plumes');
  const maxMonthlyObservationCount = Math.max(1, ...historyBuckets.map(bucket => bucket.count));
  const historyCutoffDate = observationDateRange?.end || null;
  const priorityPointCount = priorityOverlay.features.length;
  const footprintPolygonCount = visibleFootprints.features.length;
  const footprintUnlinkedCount = visibleFootprints.features.filter(feature => feature.properties.mapSourceLinked === 0).length;
  const footprintMissingShapeCount = footprintLocations.features.filter(feature => feature.properties.hasGeometry === 0).length;
  footprintDataRef.current = visibleFootprints;
  footprintLocationsRef.current = footprintLocations;
  footprintStateRef.current = footprintState;
  fluxOverlayRef.current = fluxOverlay;

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', updateViewportWidth, { passive: true });
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (!historyPlayback || historyBuckets.length < 2 || !selectedHistoryMonthResolved) return;
    const index = historyBuckets.findIndex(bucket => bucket.month === selectedHistoryMonthResolved);
    if (index < 0) return;
    const timer = window.setInterval(() => {
      const nextIndex = Math.min(index + 1, historyBuckets.length - 1);
      setHistorySelection({ sourceId: selectedId, month: historyBuckets[nextIndex].month });
      if (nextIndex >= historyBuckets.length - 1) setHistoryPlayback(false);
    }, renderTier === 'low' ? 1_200 : 750);
    return () => window.clearInterval(timer);
  }, [historyPlayback, historyBuckets, selectedHistoryMonthResolved, renderTier, selectedId]);

  useEffect(() => {
    if (dataLayer === 'plume-footprints' || (dataLayer !== 'observed-flux' && recordMode !== 'plumes')) setHistoryPlayback(false);
  }, [dataLayer, recordMode]);

  useEffect(() => {
    if (dataLayer !== 'investigation-priority' || rankingsLoaded.current) return;
    let cancelled = false;
    setPriorityState('loading');
    fetch(`${apiBase}/api/intelligence/rankings`)
      .then(async response => {
        if (!response.ok) throw new Error('Validated priority snapshot unavailable');
        return response.json() as Promise<{ snapshot: { modelVersion: string; snapshotSha256: string; generatedAt: string }; rankings: PriorityRanking[] }>;
      })
      .then(payload => {
        if (cancelled) return;
        if (!payload.snapshot?.modelVersion || !/^[a-f0-9]{64}$/.test(payload.snapshot.snapshotSha256) || !Array.isArray(payload.rankings)) {
          throw new Error('Priority snapshot metadata is invalid');
        }
        setPriorityRows(payload.rankings.filter(row => row.priorityType === 'heuristic_not_probability'));
        setPrioritySnapshot(payload.snapshot);
        rankingsLoaded.current = true;
        setPriorityState('ready');
      })
      .catch(() => { if (!cancelled) setPriorityState('unavailable'); });
    return () => { cancelled = true; };
  }, [dataLayer]);

  useEffect(() => {
    if (dataLayer !== 'plume-footprints') {
      setFootprintState('idle');
      setFootprintError(null);
      return;
    }
    if (!shouldLoadPlumeFootprints(renderTier)) {
      setFootprintData(emptyFootprints);
      setFootprintManifest(null);
      setFootprintError(null);
      setFootprintState('paused-low-power');
      return;
    }
    if (!datasetSnapshotId || !sourceArchiveSha256 || !/^[a-f0-9]{64}$/.test(sourceArchiveSha256)) {
      setFootprintData(emptyFootprints);
      setFootprintManifest(null);
      setFootprintError('Publisher geometry is available only for an identified, hash-pinned UNEP MARS snapshot.');
      setFootprintState('unavailable');
      return;
    }
    if (!selectedHistoryMonthResolved) {
      setFootprintData(emptyFootprints);
      setFootprintManifest(null);
      setFootprintError('No dated observations are available in the current map selection.');
      setFootprintState('unavailable');
      return;
    }

    const controller = new AbortController();
    let active = true;
    setFootprintData(emptyFootprints);
    setFootprintManifest(null);
    setFootprintError(null);
    setFootprintState('loading');
    loadMonthlyPlumeGeometry({
      month: selectedHistoryMonthResolved,
      expectedSnapshotId: datasetSnapshotId,
      expectedSourceArchiveSha256: sourceArchiveSha256,
      signal: controller.signal,
    }).then(result => {
      if (!active) return;
      setFootprintData(result.collection);
      setFootprintManifest(result.manifest);
      setFootprintState('ready');
    }).catch(error => {
      if (!active || controller.signal.aborted) return;
      setFootprintError(error instanceof Error ? error.message : 'Publisher geometry could not be verified.');
      setFootprintState('unavailable');
    });
    return () => { active = false; controller.abort(); };
  }, [dataLayer, renderTier, selectedHistoryMonthResolved, datasetSnapshotId, sourceArchiveSha256, footprintRetry]);

  useEffect(() => {
    if (!node.current) return;
    let disposed = false;
    let fallbackTriggered = false;
    const webgl = probeWebGLRenderer();
    if (!isGlobeProjectionSupported(webgl.contextAvailable, webgl.renderer)) {
      setMapError(getMapInitializationFallbackMessage(new Error('Could not initialize WebGL')));
      setStatus('error');
      globeSupportChangeRef.current(false);
      return;
    }
    let instance: MapLibreMap;
    let initialFocusRequest: MapFocusRequest | null = null;
    let initialFocusView: ReturnType<typeof getSourceMapFocusView> = null;
    try {
      const compactAttribution = shouldUseCompactAttribution(node.current.clientWidth);
      const initialTier = getInitialRenderTierForRenderer(webgl.renderer, renderTier);
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      const requestedFocus = focusRequestRef.current;
      initialFocusRequest = requestedFocus;
      const initialFocusSource = requestedFocus
        ? sourcesRef.current.find(source => source.sourceId === requestedFocus.sourceId)
        : undefined;
      initialFocusView = initialFocusSource ? getSourceMapFocusView(initialFocusSource) : null;
      instance = new maplibregl.Map({
        container: node.current,
        style: styleForTheme(theme, grayPercent, earthLook),
        attributionControl: { compact: compactAttribution },
        center: initialFocusView?.center || [17, 18],
        zoom: initialFocusView?.zoom || 1.5,
        minZoom: 0,
        maxZoom: 17,
        renderWorldCopies: true,
        pixelRatio: getRenderPixelRatio(initialTier, window.devicePixelRatio || 1),
        maxCanvasSize: initialTier === 'low' ? [2048, 2048] : initialTier === 'medium' ? [3072, 3072] : [4096, 4096],
        maxTileCacheZoomLevels: initialTier === 'low' ? 1 : initialTier === 'medium' ? 3 : 5,
        fadeDuration: initialTier === 'low' ? 0 : 180,
        reduceMotion: reducedMotion,
      });
    } catch (error) {
      node.current.replaceChildren();
      setMapError(getMapInitializationFallbackMessage(error));
      setStatus('error');
      globeSupportChangeRef.current(false);
      return;
    }
    map.current = instance;
    let cancelMapReadiness: (() => void) | null = null;
    const delayedMapNotice = 'Map imagery is taking longer than expected; source markers and case data remain available.';
    const waitForMapReadiness = () => {
      cancelMapReadiness?.();
      cancelMapReadiness = watchMapReadiness(instance, outcome => {
        if (disposed) return;
        setStatus(current => current === 'error' ? current : 'ready');
        if (outcome === 'delayed') {
          setMapRuntimeNotice(current => current ?? delayedMapNotice);
        } else if (outcome === 'ready-after-delay') {
          setMapRuntimeNotice(current => current === delayedMapNotice ? null : current);
        }
      });
    };
    if (initialFocusView && initialFocusRequest) {
      skipGlobeOverviewAfterFocusRef.current = true;
      focusRequestHandledRef.current = initialFocusRequest.requestId;
      onFocusRequestHandledRef.current?.(initialFocusRequest.requestId);
    }
    const rendererName = getWebGLRendererName(instance.getCanvas());
    const globeSupported = isGlobeProjectionSupported(true, rendererName);
    if (isSoftwareWebGLRenderer(rendererName)) setRenderPenalty(2);
    globeSupportChangeRef.current(globeSupported);
    const fallbackFromGlobe = () => {
      if (disposed || fallbackTriggered || projectionRef.current !== 'globe') return;
      fallbackTriggered = true;
      projectionFallbackRef.current();
    };
    let firstStyleLoaded = false;
    instance.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
    instance.addControl(new maplibregl.ScaleControl({ maxWidth: 140 }), 'bottom-left');
    if (shouldUseCompactAttribution(node.current.clientWidth)) {
      instance.once('idle', () => {
        const attribution = instance.getContainer().querySelector<HTMLElement>('.maplibregl-ctrl-attrib');
        if (!attribution?.classList.contains('maplibregl-compact-show')) return;
        attribution.querySelector<HTMLElement>('.maplibregl-ctrl-attrib-button')?.click();
      });
    }
    const removeContextOverlay = () => {
      if (instance.getLayer('earth-context-layer')) instance.removeLayer('earth-context-layer');
      if (instance.getSource('earth-context')) instance.removeSource('earth-context');
      contextSignatureRef.current = null;
    };
    const syncTerrain = () => {
      if (!instance.isStyleLoaded()) return;
      const settings = earthSettingsRef.current;
      const enabled = shouldEnableTerrain(settings.terrainPreference, settings.renderTier, instance.getZoom(), settings.projection);
      if (!enabled || failedTerrainRef.current) {
        if (instance.getTerrain()) instance.setTerrain(null);
        if (instance.getLayer('earth-hillshade')) instance.removeLayer('earth-hillshade');
        if (instance.getSource('mapterhorn-hillshade-dem')) instance.removeSource('mapterhorn-hillshade-dem');
        if (instance.getSource('mapterhorn-dem')) instance.removeSource('mapterhorn-dem');
        return;
      }
      try {
        if (!instance.getSource('mapterhorn-dem')) instance.addSource('mapterhorn-dem', getMapterhornTerrainSource());
        instance.setTerrain({ source: 'mapterhorn-dem', exaggeration: settings.renderTier === 'high' ? 0.9 : 0.72 });
        if (settings.renderTier === 'high' && instance.getZoom() >= 7 && !instance.getLayer('earth-hillshade')) {
          if (!instance.getSource('mapterhorn-hillshade-dem')) instance.addSource('mapterhorn-hillshade-dem', getMapterhornHillshadeSource());
          const beforeId = instance.getLayer('methane-source-density') ? 'methane-source-density' : undefined;
          instance.addLayer({ id: 'earth-hillshade', type: 'hillshade', source: 'mapterhorn-hillshade-dem', paint: getStableHillshadePaint() }, beforeId);
        } else if (settings.renderTier !== 'high' || instance.getZoom() < 7) {
          if (instance.getLayer('earth-hillshade')) instance.removeLayer('earth-hillshade');
          if (instance.getSource('mapterhorn-hillshade-dem')) instance.removeSource('mapterhorn-hillshade-dem');
        }
        setTerrainError(null);
      } catch {
        failedTerrainRef.current = true;
        if (instance.getTerrain()) instance.setTerrain(null);
        if (instance.getLayer('earth-hillshade')) instance.removeLayer('earth-hillshade');
        if (instance.getSource('mapterhorn-hillshade-dem')) instance.removeSource('mapterhorn-hillshade-dem');
        if (instance.getSource('mapterhorn-dem')) instance.removeSource('mapterhorn-dem');
        setTerrainError('Terrain could not be initialized. The flat map is still available.');
      }
    };
    const syncNightOverlay = () => {
      if (!instance.isStyleLoaded()) return;
      const settings = earthSettingsRef.current;
      if (!settings.nightShading) {
        for (const layerId of ['solar-terminator', 'solar-terminator-glow', 'solar-night-side']) {
          if (instance.getLayer(layerId)) instance.removeLayer(layerId);
        }
        if (instance.getSource('solar-terminator-line')) instance.removeSource('solar-terminator-line');
        if (instance.getSource('solar-night-side')) instance.removeSource('solar-night-side');
        return;
      }
      const data = solarNightGeometry(new Date());
      const existing = instance.getSource('solar-night-side') as maplibregl.GeoJSONSource | undefined;
      const terminatorFeature = data.features.find(feature => feature.properties?.kind === 'approximate-solar-terminator');
      const terminatorData: FeatureCollection = { type: 'FeatureCollection', features: terminatorFeature ? [terminatorFeature] : [] };
      const existingTerminator = instance.getSource('solar-terminator-line') as maplibregl.GeoJSONSource | undefined;
      if (existing) existing.setData(data);
      else instance.addSource('solar-night-side', { type: 'geojson', data });
      if (existingTerminator) existingTerminator.setData(terminatorData);
      else instance.addSource('solar-terminator-line', { type: 'geojson', data: terminatorData });
      const beforeId = instance.getLayer('methane-source-density') ? 'methane-source-density' : undefined;
      if (!instance.getLayer('solar-night-side')) instance.addLayer({
        id: 'solar-night-side',
        type: 'fill',
        source: 'solar-night-side',
        paint: { 'fill-color': '#091326', 'fill-opacity': getNightSideOpacity(settings.renderTier), 'fill-outline-color': '#18243a' },
      }, beforeId);
      else instance.setPaintProperty('solar-night-side', 'fill-opacity', getNightSideOpacity(settings.renderTier));
      if (!instance.getLayer('solar-terminator-glow')) instance.addLayer({
        id: 'solar-terminator-glow',
        type: 'line',
        source: 'solar-terminator-line',
        paint: { 'line-color': '#73b9ff', 'line-opacity': 0.3, 'line-width': 8, 'line-blur': 3 },
      }, beforeId);
      if (!instance.getLayer('solar-terminator')) instance.addLayer({
        id: 'solar-terminator',
        type: 'line',
        source: 'solar-terminator-line',
        paint: { 'line-color': '#e5f5ff', 'line-opacity': 0.94, 'line-width': 1.8 },
      }, beforeId);
    };
    const syncContextOverlay = () => {
      if (!instance.isStyleLoaded()) return;
      const settings = earthSettingsRef.current;
      const tiles = settings.renderTier === 'low' ? null : getContextLayerTiles(settings.contextLayer, settings.contextDate);
      if (!tiles) {
        removeContextOverlay();
        return;
      }
      const signature = `${tiles.url}|${tiles.maxzoom}`;
      if (contextSignatureRef.current !== signature || !instance.getSource('earth-context')) {
        removeContextOverlay();
        instance.addSource('earth-context', {
          type: 'raster',
          tiles: [tiles.url],
          tileSize: 256,
          maxzoom: tiles.maxzoom,
          attribution: tiles.attribution,
        });
        const beforeId = instance.getLayer('methane-source-density') ? 'methane-source-density' : undefined;
        instance.addLayer({
          id: 'earth-context-layer',
          type: 'raster',
          source: 'earth-context',
          paint: { 'raster-opacity': boundedOpacity(settings.contextOpacity), 'raster-fade-duration': 160 },
        }, beforeId);
        contextSignatureRef.current = signature;
      } else if (instance.getLayer('earth-context-layer')) {
        instance.setPaintProperty('earth-context-layer', 'raster-opacity', boundedOpacity(settings.contextOpacity));
      }
    };
    const syncSkyAndLight = () => {
      if (!instance.isStyleLoaded()) return;
      const settings = earthSettingsRef.current;
      try {
        instance.setSky(getEarthSky(settings.earthLook, settings.renderTier, settings.projection === 'globe'));
      } catch {
        // The map remains usable if this MapLibre build cannot apply globe sky styling.
      }
      try {
        instance.setLight(getStableEarthLight());
      } catch {
        // Global light only affects compatible extruded layers; raster imagery remains unchanged.
      }
    };
    const syncRecordMode = () => {
      const selectedLayer = dataLayerRef.current;
      const sourceMode = recordModeRef.current === 'sources';
      const lowPowerFluxGrid = selectedLayer === 'observed-flux' && earthSettingsRef.current.renderTier === 'low';
      const priorityAvailable = priorityRowsRef.current.length > 0;
      const footprintsSelected = selectedLayer === 'plume-footprints';
      const footprintsReady = footprintStateRef.current === 'ready' && earthSettingsRef.current.renderTier !== 'low';
      const sourceVisibility = sourceMode && (selectedLayer === 'source-density' || (selectedLayer === 'investigation-priority' && !priorityAvailable)) ? 'visible' : 'none';
      const densityActive = selectedLayer === 'source-density' || (selectedLayer === 'investigation-priority' && !priorityAvailable);
      const densityVisibility = sourceMode && densityActive && earthSettingsRef.current.renderTier !== 'low' ? 'visible' : 'none';
      const plumeVisibility = recordModeRef.current === 'plumes' && !footprintsSelected ? 'visible' : 'none';
      if (instance.getLayer('methane-source-density')) instance.setLayoutProperty('methane-source-density', 'visibility', densityVisibility);
      for (const id of ['methane-cluster-halo', 'methane-clusters', 'methane-cluster-count', 'methane-unclustered-glow', 'methane-unclustered-outline', 'methane-unclustered']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', sourceVisibility);
      }
      for (const id of ['mars-observation-cluster-halo', 'mars-observation-clusters', 'mars-observation-cluster-count', 'mars-observation-unclustered']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', plumeVisibility);
      }
      if (instance.getLayer('methane-flux-heatmap')) instance.setLayoutProperty('methane-flux-heatmap', 'visibility', selectedLayer === 'observed-flux' && !lowPowerFluxGrid ? 'visible' : 'none');
      if (instance.getLayer('mars-selected-month-flux-heatmap')) instance.setLayoutProperty('mars-selected-month-flux-heatmap', 'visibility', footprintsSelected && earthSettingsRef.current.renderTier !== 'low' ? 'visible' : 'none');
      if (instance.getLayer('methane-flux-grid-cells')) instance.setLayoutProperty('methane-flux-grid-cells', 'visibility', lowPowerFluxGrid ? 'visible' : 'none');
      if (instance.getLayer('methane-priority-points')) instance.setLayoutProperty('methane-priority-points', 'visibility', selectedLayer === 'investigation-priority' && priorityRowsRef.current.length > 0 ? 'visible' : 'none');
      for (const id of ['mars-plume-footprints-unlinked', 'mars-plume-footprints', 'mars-plume-footprint-outline', 'mars-plume-footprint-unlinked-outline', 'mars-plume-footprint-selected-outline']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', footprintsSelected && footprintsReady ? 'visible' : 'none');
      }
      const footprintPointVisibility = footprintsSelected && earthSettingsRef.current.renderTier === 'low' ? 'visible' : 'none';
      for (const id of ['mars-plume-record-clusters', 'mars-plume-record-cluster-count', 'mars-plume-record-locations']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', footprintPointVisibility);
      }
      if (instance.getLayer('mars-plume-records-without-visible-geometry')) instance.setLayoutProperty('mars-plume-records-without-visible-geometry', 'visibility', footprintsSelected ? 'visible' : 'none');
    };
    const earthSyncQueued = { current: false };
    const syncEarthRendering = () => {
      if (!runWhenStyleReady(instance, earthSyncQueued, syncEarthRendering)) return;
      syncRecordMode();
      syncTerrain();
      syncContextOverlay();
      syncNightOverlay();
      syncSkyAndLight();
    };
    syncEarthRef.current = syncEarthRendering;
    const syncSource = () => {
      if (disposed) return;
      const data = sourceGeoJSONRef.current;
      if (instance.getSource('methane-points')) {
        (instance.getSource('methane-points') as maplibregl.GeoJSONSource).setData(data);
        (instance.getSource('mars-observations') as maplibregl.GeoJSONSource | undefined)?.setData(observationGeoJSONRef.current);
        (instance.getSource('mars-flux-observations') as maplibregl.GeoJSONSource | undefined)?.setData(fluxOverlayRef.current);
        (instance.getSource('mars-flux-cells') as maplibregl.GeoJSONSource | undefined)?.setData(lowPowerFluxGridRef.current);
        (instance.getSource('methane-priority-source') as maplibregl.GeoJSONSource | undefined)?.setData(priorityOverlayRef.current);
        (instance.getSource('mars-plume-footprints') as maplibregl.GeoJSONSource | undefined)?.setData(footprintDataRef.current);
        (instance.getSource('mars-plume-record-locations') as maplibregl.GeoJSONSource | undefined)?.setData(footprintLocationsRef.current);
        syncRecordMode();
        syncEarthRef.current();
        waitForMapReadiness();
        return;
      }
      instance.addSource('methane-points', { type: 'geojson', data, cluster: true, clusterMaxZoom: SOURCE_MARKER_CLUSTER_MAX_ZOOM, clusterRadius: 55 });
      instance.addLayer({ id: 'methane-source-density', type: 'heatmap', source: 'methane-points', maxzoom: 8, paint: { 'heatmap-weight': 1, 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1, 0.65, 5, 0.95], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 8, 6, 24], 'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.45, 7, 0], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.25, '#146974', 0.45, '#2cdac7', 0.65, '#f4be53', 0.9, '#f96c4c'] } });
      instance.addSource('mars-flux-observations', { type: 'geojson', data: fluxOverlayRef.current });
      instance.addLayer({ id: 'methane-flux-heatmap', type: 'heatmap', source: 'mars-flux-observations', filter: ['>', ['get', 'fluxWeight'], 0], layout: { visibility: 'none' }, paint: {
        'heatmap-weight': ['get', 'fluxWeight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.65, 5, 1.05, 8, 1.3],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 10, 4, 18, 8, 30],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 6, 0.58, 9, 0.3],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(43,94,170,0)', 0.12, '#3978eb', 0.3, '#20d2d2', 0.52, '#f3d14b', 0.74, '#f58b38', 1, '#ed4b43'],
      } });
      instance.addLayer({ id: 'mars-selected-month-flux-heatmap', type: 'heatmap', source: 'mars-flux-observations', filter: ['>', ['get', 'fluxWeight'], 0], maxzoom: 4, layout: { visibility: 'none' }, paint: {
        'heatmap-weight': ['get', 'fluxWeight'],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.72, 2, 1.05, 4, 1.22],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 2, 22, 4, 30],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.52, 3, 0.64, 4, 0.56],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(43,94,170,0)', 0.12, '#3978eb', 0.3, '#20d2d2', 0.52, '#f3d14b', 0.74, '#f58b38', 1, '#ed4b43'],
      } });
      instance.addSource('mars-flux-cells', { type: 'geojson', data: lowPowerFluxGridRef.current });
      instance.addLayer({ id: 'methane-flux-grid-cells', type: 'circle', source: 'mars-flux-cells', filter: ['>', ['get', 'medianFlux'], 0], layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 4, 7, 8, 13],
        'circle-color': ['step', ['get', 'medianFlux'], '#3978eb', 100, '#20d2d2', 500, '#f3d14b', 2000, '#f58b38', 5000, '#ed4b43'],
        'circle-opacity': 0.78,
        'circle-blur': 0.28,
        'circle-stroke-color': '#f6fbff',
        'circle-stroke-opacity': 0.32,
        'circle-stroke-width': 0.7,
      } });
      instance.addSource('mars-plume-footprints', { type: 'geojson', data: footprintDataRef.current });
      instance.addLayer({ id: 'mars-plume-footprints-unlinked', type: 'fill', source: 'mars-plume-footprints', filter: ['==', ['get', 'mapSourceLinked'], 0], minzoom: 4, layout: { visibility: 'none' }, paint: {
        'fill-color': '#718494',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.035, 8, 0.055, 13, 0.085],
        'fill-outline-color': '#82939f',
      } });
      instance.addLayer({ id: 'mars-plume-footprints', type: 'fill', source: 'mars-plume-footprints', filter: ['==', ['get', 'mapSourceLinked'], 1], minzoom: 4, layout: { visibility: 'none' }, paint: {
        'fill-color': getFluxFootprintColorExpression() as never,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'],
          4, ['case', ['==', ['get', 'mapSourceSelected'], 1], 0.62, 0.24],
          8, ['case', ['==', ['get', 'mapSourceSelected'], 1], 0.7, 0.34],
          13, ['case', ['==', ['get', 'mapSourceSelected'], 1], 0.76, 0.44],
        ],
        'fill-outline-color': getFluxFootprintColorExpression() as never,
      } });
      instance.addLayer({ id: 'mars-plume-footprint-outline', type: 'line', source: 'mars-plume-footprints', filter: ['==', ['get', 'mapSourceLinked'], 1], minzoom: 4, layout: { visibility: 'none' }, paint: {
        'line-color': getFluxFootprintColorExpression() as never,
        'line-opacity': ['case', ['==', ['get', 'mapSourceSelected'], 1], 0.98, 0.58],
        'line-width': getFootprintOutlineLineWidthExpression() as never,
      } });
      instance.addLayer({ id: 'mars-plume-footprint-unlinked-outline', type: 'line', source: 'mars-plume-footprints', filter: ['==', ['get', 'mapSourceLinked'], 0], minzoom: 4, layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': '#aab8c1', 'line-opacity': 0.42,
        'line-dasharray': [2, 1],
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.45, 10, 0.7, 15, 1],
      } });
      instance.addLayer({ id: 'mars-plume-footprint-selected-outline', type: 'line', source: 'mars-plume-footprints', filter: ['==', ['get', 'mapSourceSelected'], 1], minzoom: 4, layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: {
        'line-color': '#f2fffc', 'line-opacity': 1,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2, 10, 3.2, 15, 4.6],
      } });
      instance.addSource('mars-plume-record-locations', { type: 'geojson', data: footprintLocationsRef.current, cluster: true, clusterMaxZoom: 3, clusterRadius: 42 });
      instance.addLayer({ id: 'mars-plume-record-clusters', type: 'circle', source: 'mars-plume-record-locations', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: {
        'circle-color': '#176e79', 'circle-radius': ['step', ['get', 'point_count'], 13, 40, 18, 160, 24],
        'circle-opacity': 0.92, 'circle-stroke-color': '#61e5d4', 'circle-stroke-width': 1.8,
      } });
      instance.addLayer({ id: 'mars-plume-record-cluster-count', type: 'symbol', source: 'mars-plume-record-locations', filter: ['has', 'point_count'], layout: { visibility: 'none', 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11 }, paint: { 'text-color': '#ffffff' } });
      instance.addLayer({ id: 'mars-plume-record-locations', type: 'circle', source: 'mars-plume-record-locations', filter: ['!', ['has', 'point_count']], maxzoom: 4, layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.3, 3, 5.2],
        'circle-color': getFluxFootprintColorExpression() as never,
        'circle-opacity': 0.92, 'circle-stroke-color': '#f2fbff', 'circle-stroke-opacity': 0.7, 'circle-stroke-width': 0.8,
      } });
      instance.addLayer({ id: 'mars-plume-records-without-visible-geometry', type: 'circle', source: 'mars-plume-record-locations', filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'hasGeometry'], 1]], minzoom: 4, layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3.7, 10, 5.4, 14, 7],
        'circle-color': getFluxFootprintColorExpression() as never, 'circle-opacity': 0.92,
        'circle-stroke-color': '#fff3cf', 'circle-stroke-width': 1.6,
      } });
      instance.addLayer({ id: 'methane-cluster-halo', type: 'circle', source: 'methane-points', filter: ['has', 'point_count'], paint: { 'circle-radius': ['step', ['get', 'point_count'], 20, 50, 28, 300, 36], 'circle-color': '#00c8b2', 'circle-opacity': .13, 'circle-stroke-color': '#00ddc7', 'circle-stroke-opacity': .28, 'circle-stroke-width': 2 } });
      instance.addLayer({ id: 'methane-clusters', type: 'circle', source: 'methane-points', filter: ['has', 'point_count'], paint: { 'circle-color': '#0e5a67', 'circle-radius': ['step', ['get', 'point_count'], 14, 50, 19, 300, 25], 'circle-stroke-width': 2, 'circle-stroke-color': '#3de9d6' } });
      instance.addLayer({ id: 'methane-cluster-count', type: 'symbol', source: 'methane-points', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      instance.addLayer({ id: 'methane-unclustered-glow', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 17, 11], 'circle-color': ['case', ['==', ['get', 'selected'], 1], '#ffd383', ['get', 'fluxColor']], 'circle-opacity': .17, 'circle-blur': .45 } });
      instance.addLayer({ id: 'methane-unclustered-outline', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], 1], 8.5, 7], 'circle-color': '#071c28', 'circle-opacity': 0,
        'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 2.8, 2.2], 'circle-stroke-color': ['get', 'fluxColor'], 'circle-stroke-opacity': .96,
      } });
      instance.addLayer({ id: 'methane-unclustered', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: {
        'circle-radius': ['case', ['==', ['get', 'selected'], 1], 5.7, 4.8], 'circle-color': ['get', 'fluxColor'],
        'circle-stroke-width': 1.4, 'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], '#fff1cf', '#f3fbff'], 'circle-opacity': .98,
      } });
      instance.addSource('methane-priority-source', { type: 'geojson', data: priorityOverlayRef.current });
      instance.addLayer({ id: 'methane-priority-points', type: 'circle', source: 'methane-priority-source', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 11, 4, 18, 8, 26],
        'circle-color': ['match', ['get', 'priorityBand'], 'low', '#42b9ed', 'medium', '#f4c653', 'high', '#f07164', '#95aab1'],
        'circle-opacity': 0.63,
        'circle-blur': 0.55,
        'circle-stroke-color': ['match', ['get', 'priorityBand'], 'low', '#86dcff', 'medium', '#ffe39a', 'high', '#ffb1a8', '#d2e0e3'],
        'circle-stroke-width': 2,
      } });
      instance.addSource('mars-observations', { type: 'geojson', data: observationGeoJSONRef.current, cluster: true, clusterMaxZoom: 9, clusterRadius: 46 });
      instance.addLayer({ id: 'mars-observation-cluster-halo', type: 'circle', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: { 'circle-radius': ['step', ['get', 'point_count'], 19, 50, 27, 300, 35], 'circle-color': '#648cdb', 'circle-opacity': .15, 'circle-stroke-color': '#91b4ff', 'circle-stroke-opacity': .32, 'circle-stroke-width': 2 } });
      instance.addLayer({ id: 'mars-observation-clusters', type: 'circle', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: { 'circle-color': '#304f86', 'circle-radius': ['step', ['get', 'point_count'], 14, 50, 19, 300, 25], 'circle-stroke-width': 2, 'circle-stroke-color': '#91b4ff' } });
      instance.addLayer({ id: 'mars-observation-cluster-count', type: 'symbol', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none', 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      instance.addLayer({ id: 'mars-observation-unclustered', type: 'circle', source: 'mars-observations', filter: ['!', ['has', 'point_count']], layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3.5, 9, 5.5, 13, 7], 'circle-color': ['case', ['==', ['get', 'linked'], 0], '#aab3bd', ['==', ['get', 'flux'], null], '#91a9b2', ['step', ['get', 'flux'], '#3978eb', 100, '#20d2d2', 500, '#f3d14b', 2000, '#f58b38', 5000, '#ed4b43']], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#f3f7ff', 'circle-opacity': .92 } });
      syncRecordMode();
      syncEarthRef.current();
      instance.getCanvas().style.cursor = 'grab';
      waitForMapReadiness();
    };
    const syncSatelliteRendering = () => {
      if (!instance.getLayer('satellite-imagery')) return;
      for (const id of ['blue-marble-overview', 'satellite-imagery']) {
        if (!instance.getLayer(id)) continue;
        instance.setPaintProperty(id, 'raster-saturation', getRasterSaturation(themeRef.current, grayPercentRef.current, earthLookRef.current));
        instance.setPaintProperty(id, 'raster-contrast', getRasterContrast(earthLookRef.current));
      }
      if (failedOverviewRef.current) {
        if (instance.getLayer('blue-marble-overview')) instance.setLayoutProperty('blue-marble-overview', 'visibility', 'none');
        if (instance.getLayer('satellite-imagery')) instance.setPaintProperty('satellite-imagery', 'raster-opacity', 1);
      }
    };
    const openMarkerPopup = (event: MapLayerMouseEvent, title: string, details: MapMarkerDetail[], note: string) => {
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '320px', className: 'geo-map-marker-popup' })
        .setLngLat(event.lngLat)
        .setDOMContent(createMarkerPopupContent(title, details, note))
        .addTo(instance);
    };
    const clickPoint = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const properties = feature?.properties;
      const id = properties?.id;
      if (typeof id !== 'string') return;
      onSelectRef.current(id);
      const source = sourcesRef.current.find(candidate => candidate.sourceId === id);
      if (!source) return;
      const details = getSourceMarkerDetails(source, markerProvenanceRef.current);
      const isPriority = properties?.priorityType === 'heuristic_not_probability';
      if (isPriority) {
        details.push({
          label: 'Investigation priority · heuristic, not probability',
          value: `${String(properties.priorityBand || 'unranked')} · score ${String(properties.priorityScore ?? 'not available')}`,
        });
      }
      openMarkerPopup(
        event,
        `${isPriority ? 'Priority · ' : 'MARS source · '}${id}`,
        details,
        source.synthetic
          ? 'DEMO fixture. This synthetic map record is not a real MARS source.'
          : isPriority
            ? 'Historical source record and decision-support score. This does not establish current leakage, future leak likelihood, response, or mitigation.'
            : 'Historical source record. The marker does not establish current leakage, response, or mitigation.',
      );
    };
    const clickObservationPoint = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const properties = feature?.properties;
      if (!properties || typeof properties.id !== 'string') return;
      const coordinates = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : [event.lngLat.lng, event.lngLat.lat];
      const linked = typeof properties.sourceId === 'string' && properties.sourceId.length > 0;
      const details = getObservationMarkerDetails({
        id: properties.id,
        sourceId: linked ? properties.sourceId : null,
        linkStatus: properties.linkStatus === 'linked' || properties.linkStatus === 'source_record_missing' ? properties.linkStatus : 'source_id_missing',
        date: typeof properties.date === 'string' ? properties.date : null,
        fluxKgHr: typeof properties.flux === 'number' ? properties.flux : null,
        uncertaintyKgHr: typeof properties.uncertainty === 'number' ? properties.uncertainty : null,
        satellite: typeof properties.satellite === 'string' ? properties.satellite : null,
        lon: coordinates[0], lat: coordinates[1],
      }, markerProvenanceRef.current);
      openMarkerPopup(event, `MARS observation · ${properties.id}`, details, 'Historical satellite observation, not live telemetry. Missing later records do not establish zero emissions.');
      if (typeof properties.sourceId === 'string' && properties.sourceId.length) onSelectRef.current(properties.sourceId);
      else onSelectUnlinkedRef.current?.(properties.id);
    };
    const clickFootprintRecord = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (!properties || typeof properties.plumeId !== 'string') return;
      if (typeof properties.sourceId === 'string' && properties.sourceId.length) onSelectRef.current(properties.sourceId);
      else onSelectUnlinkedRef.current?.(properties.plumeId);
    };
    const clickCluster = (event: MapLayerMouseEvent) => {
      const f = event.features?.[0];
      const id = f?.properties?.cluster_id;
      const geometry = f?.geometry;
      if (!id || geometry?.type !== 'Point') return;
      const s = instance.getSource('methane-points') as maplibregl.GeoJSONSource;
      s.getClusterExpansionZoom(id).then(zoom => instance.easeTo({ center: geometry.coordinates as [number, number], zoom: Math.min(zoom, 13), duration: 600 })).catch(() => {});
    };
    const clickObservationCluster = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const geometry = feature?.geometry;
      if (!clusterId || geometry?.type !== 'Point') return;
      const source = instance.getSource('mars-observations') as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId)
        .then(zoom => instance.easeTo({ center: geometry.coordinates as [number, number], zoom: Math.min(zoom, 13), duration: 600 }))
        .catch(() => {});
    };
    const clickFootprintCluster = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const geometry = feature?.geometry;
      if (!clusterId || geometry?.type !== 'Point') return;
      const source = instance.getSource('mars-plume-record-locations') as maplibregl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId)
        .then(zoom => instance.easeTo({ center: geometry.coordinates as [number, number], zoom: Math.min(zoom, 13), duration: 600 }))
        .catch(() => {});
    };
    instance.on('style.load', () => {
      if (disposed) return;
      cancelMapReadiness?.();
      cancelMapReadiness = null;
      setMapRuntimeNotice(null);
      setMapError(null);
      contextSignatureRef.current = null;
      failedTerrainRef.current = false;
      setContextError(null);
      setTerrainError(null);
      syncSatelliteRendering();
      const desiredProjection = getProjectionSpec(projectionRef.current);
      if (instance.getProjection()?.type !== desiredProjection.type) instance.setProjection(desiredProjection);
      if (!firstStyleLoaded && projectionRef.current === 'globe') {
        if (skipGlobeOverviewAfterFocusRef.current) {
          skipGlobeOverviewAfterFocusRef.current = false;
        } else {
          const overview = getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight);
          instance.jumpTo({ ...overview, bearing: 0, pitch: 0 });
        }
      }
      firstStyleLoaded = true;
      syncSource();
    });
    instance.on('click', 'methane-unclustered', clickPoint);
    instance.on('click', 'methane-priority-points', clickPoint);
    instance.on('click', 'methane-clusters', clickCluster);
    instance.on('click', 'mars-observation-unclustered', clickObservationPoint);
    instance.on('click', 'mars-observation-clusters', clickObservationCluster);
    instance.on('click', 'mars-plume-footprints', clickFootprintRecord);
    instance.on('click', 'mars-plume-record-locations', clickFootprintRecord);
    instance.on('click', 'mars-plume-records-without-visible-geometry', clickFootprintRecord);
    instance.on('click', 'mars-plume-record-clusters', clickFootprintCluster);
    instance.on('mousemove', e => { setCoords([e.lngLat.lat, e.lngLat.lng, instance.getZoom()]); });
    instance.on('error', (event) => {
      const message = event.error?.message || '';
      const sourceId = (event as typeof event & { sourceId?: string }).sourceId;
      if (sourceId === 'mapterhorn-hillshade-dem') {
        if (instance.getLayer('earth-hillshade')) instance.removeLayer('earth-hillshade');
        if (instance.getSource('mapterhorn-hillshade-dem')) instance.removeSource('mapterhorn-hillshade-dem');
        setTerrainError('Hillshade tiles are unavailable; the base imagery and 3D elevation remain available.');
        return;
      }
      if (sourceId === 'mapterhorn-dem') {
        failedTerrainRef.current = true;
        if (instance.getTerrain()) instance.setTerrain(null);
        if (instance.getLayer('earth-hillshade')) instance.removeLayer('earth-hillshade');
        if (instance.getSource('mapterhorn-hillshade-dem')) instance.removeSource('mapterhorn-hillshade-dem');
        if (instance.getSource('mapterhorn-dem')) instance.removeSource('mapterhorn-dem');
        setTerrainError('Terrain tiles are unavailable; the map has returned to a flat surface.');
        return;
      }
      if (sourceId === 'earth-context') {
        setContextError('This dated NASA context layer could not be loaded. Check the selected date or connection.');
        removeContextOverlay();
        return;
      }
      if (sourceId === 'blue-marble' && (themeRef.current === 'satellite' || themeRef.current === 'grayscale')) {
        failedOverviewRef.current = true;
        setOverviewFallback(true);
        syncSatelliteRendering();
        return;
      }
      if (isGlobeRendererFailure(projectionRef.current, message)) {
        fallbackFromGlobe();
        return;
      }
      // Missing optional glyph ranges should not mark the whole basemap offline.
      // Only tile-request errors are called tile failures; other renderer errors stay generic.
      const runtimeNotice = getMapErrorNotice(event.error);
      if (runtimeNotice) setMapRuntimeNotice(runtimeNotice);
      if (event.error && !message.includes('/fonts/') && !isRecoverableMapTileError(event.error)) {
        setMapError(getMapInitializationFallbackMessage(event.error));
        setStatus(current => getStatusAfterMapError(current));
      }
    });
    const canvas = instance.getCanvas();
    const onWebglContextLost = () => {
      if (projectionRef.current === 'globe') fallbackFromGlobe();
      else setStatus('error');
    };
    const onWindowError = (event: ErrorEvent) => {
      if (isGlobeRendererFailure(projectionRef.current, event.message)) fallbackFromGlobe();
    };
    canvas.addEventListener('webglcontextlost', onWebglContextLost);
    window.addEventListener('error', onWindowError);
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(node.current);
    let previousFrameAt = 0;
    let movementFrames = 0;
    let slowFrames = 0;
    let lastTierAdjustmentAt = -30_000;
    const resetMovementSample = () => { previousFrameAt = 0; movementFrames = 0; slowFrames = 0; };
    const sampleMovementPerformance = () => {
      const now = performance.now();
      if (!instance.isMoving()) { previousFrameAt = now; return; }
      if (previousFrameAt) {
        movementFrames += 1;
        if (now - previousFrameAt > 34) slowFrames += 1;
      }
      previousFrameAt = now;
      if (movementFrames >= 24) {
        const slowRatio = slowFrames / movementFrames;
        if (renderPreferenceRef.current === 'auto' && now - lastTierAdjustmentAt >= 30_000) {
          if (slowRatio >= 0.35) {
            setRenderPenalty(previous => Math.min(2, previous + 1));
            lastTierAdjustmentAt = now;
          } else if (slowRatio <= 0.1) {
            setRenderPenalty(previous => Math.max(0, previous - 1));
            lastTierAdjustmentAt = now;
          }
        }
        resetMovementSample();
      }
    };
    const refreshSolar = () => {
      if (document.hidden) return;
      syncNightOverlay();
    };
    const onVisibilityChange = () => { if (!document.hidden) refreshSolar(); };
    const solarInterval = window.setInterval(refreshSolar, 300_000);
    instance.on('zoomend', syncTerrain);
    instance.on('movestart', resetMovementSample);
    instance.on('moveend', resetMovementSample);
    instance.on('render', sampleMovementPerformance);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(solarInterval);
      instance.off('movestart', resetMovementSample);
      instance.off('moveend', resetMovementSample);
      instance.off('render', sampleMovementPerformance);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('webglcontextlost', onWebglContextLost);
      window.removeEventListener('error', onWindowError);
      cancelMapReadiness?.();
      popupRef.current?.remove();
      popupRef.current = null;
      syncEarthRef.current = () => {};
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    instance.setPixelRatio(getRenderPixelRatio(renderTier, window.devicePixelRatio || 1));
    instance.resize();
    syncEarthRef.current();
  }, [renderTier, terrainPreference, nightShading, contextLayer, contextDate, contextOpacity, projection, earthLook]);
  const appliedTheme = useRef(theme);
  const appliedLook = useRef(earthLook);
  useEffect(() => {
    const instance = map.current;
    if (!instance || (appliedTheme.current === theme && appliedLook.current === earthLook)) return;
    appliedTheme.current = theme;
    appliedLook.current = earthLook;
    setStatus('loading');
    failedOverviewRef.current = false;
    setOverviewFallback(false);
    popupRef.current?.remove();
    popupRef.current = null;
    instance.setStyle(styleForTheme(theme, grayPercent, earthLook));
  }, [theme, grayPercent, earthLook]);
  useEffect(() => {
    const instance = map.current;
    if (theme !== 'grayscale' || !instance?.isStyleLoaded() || !instance.getLayer('satellite-imagery')) return;
    for (const id of ['blue-marble-overview', 'satellite-imagery']) {
      if (!instance.getLayer(id)) continue;
      instance.setPaintProperty(id, 'raster-saturation', getRasterSaturation(theme, grayPercent, earthLook));
      instance.setPaintProperty(id, 'raster-contrast', getRasterContrast(earthLook));
    }
  }, [theme, grayPercent, earthLook]);
  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    const desiredProjection = getProjectionSpec(projection);
    if (instance.getProjection()?.type !== desiredProjection.type) {
      instance.setProjection(desiredProjection);
      if (projection === 'globe') {
        if (!skipGlobeOverviewAfterFocusRef.current) {
          const overview = getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight);
          instance.flyTo({ center: overview.center, zoom: overview.zoom, duration: 1100, essential: true });
        }
      }
    }
  }, [projection]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const geo = instance.getSource('methane-points') as maplibregl.GeoJSONSource | undefined;
    geo?.setData(sourceGeoJSON);
    const plumeGeo = instance.getSource('mars-observations') as maplibregl.GeoJSONSource | undefined;
    plumeGeo?.setData(observationGeoJSON);
    const fluxGeo = instance.getSource('mars-flux-observations') as maplibregl.GeoJSONSource | undefined;
    fluxGeo?.setData(fluxOverlay);
    const fluxCells = instance.getSource('mars-flux-cells') as maplibregl.GeoJSONSource | undefined;
    fluxCells?.setData(lowPowerFluxGrid);
    const priorityGeo = instance.getSource('methane-priority-source') as maplibregl.GeoJSONSource | undefined;
    priorityGeo?.setData(priorityOverlay);
    const footprintGeo = instance.getSource('mars-plume-footprints') as maplibregl.GeoJSONSource | undefined;
    footprintGeo?.setData(visibleFootprints);
    const footprintLocationGeo = instance.getSource('mars-plume-record-locations') as maplibregl.GeoJSONSource | undefined;
    footprintLocationGeo?.setData(footprintLocations);
    syncEarthRef.current();
  }, [sourceGeoJSON, observationGeoJSON, dataLayer, renderTier, priorityOverlay, visibleFootprints, footprintLocations, fluxOverlay, lowPowerFluxGrid]);
  useEffect(() => {
    syncEarthRef.current();
  }, [recordMode, dataLayer, renderTier, priorityRows, footprintState]);
  const lastChosen = useRef<string | null>(selectedId);
  const hasInitialSelection = useRef(Boolean(selectedId));
  useEffect(() => {
    const instance = map.current;
    if (!instance || !selectedId) return;
    if (!hasInitialSelection.current) {
      hasInitialSelection.current = true;
      lastChosen.current = selectedId;
      return;
    }
    if (selectedId === lastChosen.current) return;
    lastChosen.current = selectedId;
    const s = sources.find(s => s.sourceId === selectedId);
    if (s) {
      const view = getSourceMapFocusView(s, instance.getZoom());
      if (view) instance.flyTo({ ...view, speed: 1.35, essential: true });
    }
  }, [selectedId, sources]);
  useEffect(() => {
    if (!focusRequest || focusRequestHandledRef.current === focusRequest.requestId) return;
    const instance = map.current;
    if (!instance) return;
    const source = sources.find(item => item.sourceId === focusRequest.sourceId);
    const view = source ? getSourceMapFocusView(source) : null;
    if (!view) {
      if (!sourcesReady) return;
      focusRequestHandledRef.current = focusRequest.requestId;
      onFocusRequestHandledRef.current?.(focusRequest.requestId);
      return;
    }
    const focus = () => {
      if (map.current !== instance) return;
      if (projection === 'globe' && instance.getProjection()?.type !== 'globe') skipGlobeOverviewAfterFocusRef.current = true;
      instance.flyTo({ ...view, duration: 950, essential: true });
    };
    if (instance.isStyleLoaded()) focus();
    else instance.once('load', focus);
    focusRequestHandledRef.current = focusRequest.requestId;
    onFocusRequestHandledRef.current?.(focusRequest.requestId);
    return () => { instance.off('load', focus); };
  }, [focusRequest, sources, sourcesReady]);
  useEffect(() => {
    requestAnimationFrame(() => {
      const instance = map.current;
      if (!instance || !node.current) return;
      instance.resize();
      if (projectionRef.current !== 'globe' || instance.getZoom() > 2.2) return;
      const overview = getGlobeOverview(sourcesRef.current, node.current.clientWidth, node.current.clientHeight);
      instance.flyTo({ center: overview.center, zoom: overview.zoom, duration: 750, essential: true });
    });
  }, [expanded]);

  const toggleTilt = () => {
    const instance = map.current;
    if (!instance) return;
    const tilted = instance.getPitch() < 20;
    instance.easeTo({ pitch: tilted ? 48 : 0, bearing: tilted ? -12 : 0, duration: renderTier === 'low' ? 0 : 650, essential: true });
    setIsTilted(tilted);
  };
  const resetEarthView = () => {
    const instance = map.current;
    if (!instance) return;
    const overview = projection === 'globe' ? getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight) : { center: [17, 18] as [number, number], zoom: 1.5 };
    instance.flyTo({ ...overview, bearing: 0, pitch: 0, duration: renderTier === 'low' ? 0 : 650, essential: true });
    setIsTilted(false);
  };
  const focusSolarTerminator = () => {
    const instance = map.current;
    if (!instance || projection !== 'globe') return;
    const overview = getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight);
    instance.flyTo({ center: solarTerminatorCenter(new Date()), zoom: overview.zoom, bearing: 0, pitch: 0, duration: renderTier === 'low' ? 0 : 650, essential: true });
    setIsTilted(false);
  };
  const toggleHistoryPlayback = () => {
    if (historyPlayback) {
      setHistoryPlayback(false);
      return;
    }
    if (historyBuckets.length < 2) return;
    setHistorySelection({ sourceId: selectedId, month: historyBuckets[0].month });
    setHistoryPlayback(true);
  };

  return <div className={`geo-map-shell${projection === 'globe' ? ' geo-map-globe' : ''}`}>
    <div ref={node} className="geo-map-canvas" role="application" aria-label="Interactive methane map; drag to pan, scroll to zoom and select a source" />
    <div className="geo-map-topline" role="status" aria-live="polite"><span className="geo-pulse" aria-hidden="true"/> {getMapToplineLabel({ status, dataLayer, recordMode, sourceCount, positiveFluxLocationCount, footprintPolygonCount, selectedHistoryMonth: selectedHistoryMonthResolved, priorityPointCount, priorityReady: priorityState === 'ready' })}</div>
    {status === 'error' && <div className="geo-map-fallback" role="status"><strong>Interactive map unavailable</strong><span>{mapError || 'You can still inspect the selected case and evidence below.'}</span></div>}
    {status === 'ready' && mapRuntimeNotice && <div className="geo-map-degraded-notice" role="status">
      <span>{mapRuntimeNotice}</span>
      <button type="button" onClick={() => {
        const instance = map.current;
        if (!instance) return;
        setMapRuntimeNotice(null);
        setStatus('loading');
        instance.setStyle(styleForTheme(theme, grayPercent, earthLook));
      }}>Retry map</button>
    </div>}
    {status === 'ready' && <details className="earth-rendering-panel">
      <summary aria-label="Open Earth rendering settings"><span aria-hidden="true">◎</span> Earth <b>{renderPreference.toUpperCase()} · {renderTier}</b></summary>
      <div className="earth-rendering-content">
        <label className="earth-control-row"><span>Rendering quality</span><select value={renderPreference} onChange={event => { const preference = event.target.value as RenderPreference; setRenderPenalty(0); setRenderPreference(preference); onRenderPreferenceChange?.(preference); }}>
          <option value="auto">Auto</option><option value="eco">Eco</option><option value="balanced">Balanced</option><option value="quality">Quality</option>
        </select></label>
        <label className="earth-control-row"><span>Earth appearance</span><select value={earthLook} onChange={event => setEarthLook(event.target.value as EarthLook)}>
          <option value="natural">Natural</option><option value="cinematic">Cinematic</option>
        </select></label>
        {(theme === 'satellite' || theme === 'grayscale') && <p className="earth-rendering-note">NASA GIBS Blue Marble is a static August 2004 image, softly blended over Esri imagery at global zoom and faded out by zoom 4. Esri stays underneath for natural color and close detail; its capture dates and resolution vary by area. Neither basemap is methane evidence.</p>}
        {overviewFallback && <p className="earth-rendering-error" role="status">NASA Blue Marble tiles are unavailable; Esri imagery is shown at all zoom levels.</p>}
        <label className="earth-control-row"><span>Terrain</span><select value={terrainPreference} onChange={event => { failedTerrainRef.current = false; setTerrainError(null); setTerrainPreference(event.target.value as TerrainPreference); }}>
          <option value="auto">Auto · nearby</option><option value="off">Off</option><option value="on">On · nearby</option>
        </select></label>
        <label className="earth-control-row"><span>Context overlay</span><select value={contextLayer} onChange={event => { setContextError(null); setContextLayer(event.target.value as ContextLayer); }}>
          <option value="off">Off</option><option value="natural">NASA MODIS true color</option><option value="cloud-fraction">NASA cloud fraction</option><option value="airs-methane-400hpa">AIRS methane · 400 hPa</option>
        </select></label>
        {contextLayer !== 'off' && <>
          {contextLayer === 'airs-methane-400hpa' && <p className="earth-rendering-note earth-context-warning">AIRS methane at 400 hPa is an upper-atmosphere context layer. It is not a local surface leak, plume measurement, or MARS case observation.</p>}
          <label className="earth-control-row"><span>Observation date (UTC)</span><input type="date" value={contextDate} max={getUtcDateDaysAgo(0)} onChange={event => { setContextError(null); setContextDate(event.target.value); }} /></label>
          <label className="earth-opacity-row"><span>Overlay opacity <output>{contextOpacity}%</output></span><input type="range" min="15" max="100" step="1" value={contextOpacity} onChange={event => setContextOpacity(Number(event.target.value))} /></label>
          <p className="earth-rendering-note">Dated NASA imagery can arrive with a delay; it is not a live weather feed. If a tile is blank, try an earlier date.</p>
        </>}
        <div className="earth-rendering-actions"><button type="button" onClick={toggleTilt} aria-pressed={isTilted}>{isTilted ? 'Reset tilt' : 'Tilt 3D'}</button><button type="button" onClick={resetEarthView}>Reset view</button></div>
        <button className="earth-terminator-action" type="button" onClick={focusSolarTerminator} disabled={projection !== 'globe' || !nightShading}>Center on UTC day/night line</button>
        <label className="earth-toggle-row"><input type="checkbox" checked={nightShading} onChange={event => setNightShading(event.target.checked)} /><span>Approximate UTC night-side shading</span></label>
        <p className="earth-rendering-note">Night shading starts off to preserve basemap colors. When enabled, it lightly visualizes the approximate UTC solar terminator; it is not nighttime satellite imagery or an emissions signal.</p>
        {renderTier === 'low' && <p className="earth-rendering-note">Low-power mode pauses terrain and NASA context tiles. Night shading remains off unless enabled.</p>}
        {terrainError && <p className="earth-rendering-error" role="status">{terrainError}</p>}
        {contextError && <p className="earth-rendering-error" role="status">{contextError}</p>}
        <p className="earth-rendering-credit">DEM © Mapterhorn · context imagery © NASA GIBS</p>
      </div>
    </details>}
    {contextLayer !== 'off' && renderTier !== 'low' && <div className={`earth-context-badge${contextLayer === 'airs-methane-400hpa' ? ' earth-context-badge-airs' : ''}`} role="status">
      <small>{contextLayer === 'cloud-fraction' ? 'CLOUD CONTEXT · NOT LIVE' : 'NASA CONTEXT · NOT LIVE'} · {contextDate}</small>
      <strong>{contextLayerName[contextLayer]}</strong>
      <span>{contextLayer === 'airs-methane-400hpa' ? 'Upper-atmosphere context · not a local leak observation' : 'Context imagery · not MARS case evidence'}</span>
    </div>}
    {historyTimelineVisible && selectedHistoryBucket && <details className="geo-map-history" aria-label="Historical methane observation timeline">
      <summary className="geo-map-history-toggle"><strong>History</strong><span>{selectedHistoryBucket.month} · {selectedHistoryBucket.count.toLocaleString()} rows</span></summary>
      <div className="geo-map-history-content">
        <div className="geo-map-history-head"><strong>{dataLayer === 'plume-footprints' ? 'PUBLISHER GEOMETRY BY MONTH · HISTORICAL' : 'OBSERVATION HISTORY · NOT LIVE'}</strong>
          <button type="button" onClick={() => { setHistoryPlayback(false); setHistorySelection({ sourceId: selectedId, month: null }); }} aria-pressed={selectedHistoryMonth === null}>{dataLayer === 'plume-footprints' ? 'Latest month' : 'Full archive'}</button>
          <button type="button" onClick={toggleHistoryPlayback} disabled={historyBuckets.length < 2 || dataLayer === 'plume-footprints'} aria-label={historyPlayback ? 'Pause archive playback' : 'Play archive playback'}>{historyPlayback ? 'Pause' : 'Play'}</button>
        </div>
        <div className="geo-map-history-bars" aria-hidden="true">{historyBuckets.map((bucket, index) => <span key={bucket.month} title={`${bucket.month}: ${bucket.count.toLocaleString()} MARS rows`} style={{
          height: `${Math.max(3, Math.round(bucket.count / maxMonthlyObservationCount * 22))}px`,
          opacity: selectedHistoryIndex < 0 || index <= selectedHistoryIndex ? 0.95 : 0.28,
        }}/>)}</div>
        <input type="range" min="0" max={Math.max(0, historyBuckets.length - 1)} step="1" value={Math.max(0, selectedHistoryIndex)} aria-label={dataLayer === 'plume-footprints' ? 'Select one month of publisher plume geometry' : 'Browse the cumulative methane observation archive by month'} aria-valuetext={`${selectedHistoryBucket.month} · ${selectedHistoryBucket.count} rows in this month`} onChange={event => {
          setHistoryPlayback(false);
          setHistorySelection({ sourceId: selectedId, month: historyBuckets[Number(event.target.value)]?.month || null });
        }}/>
        <div className="geo-map-history-summary"><span>{selectedHistoryBucket.month} · {selectedHistoryBucket.count.toLocaleString()} rows this month</span><strong>{visibleObservations.length.toLocaleString()} cumulative rows · through {historyCutoffDate || 'no earlier rows'} UTC</strong></div>
        <small>{dataLayer === 'plume-footprints' ? 'Only the selected month’s compressed geometry shard is requested. Playback is paused to avoid loading many months automatically. Empty months or missing shapes are not zero emissions.' : 'Bars count archive rows, not methane concentration. Empty months mean no row in this snapshot, not zero emissions.'}</small>
      </div>
    </details>}
    <details className="geo-map-legend" aria-label="Map layer legend">
      <summary>Legend</summary>
      <div className="geo-map-legend-content">
      {(theme === 'satellite' || theme === 'grayscale') && <small>Basemap: static NASA GIBS Blue Marble (August 2004) blended over Esri imagery at global scale; Esri remains underneath and supplies full detail by zoom 4. Not a live feed or methane evidence.</small>}
      {dataLayer === 'source-density' && <><strong>HISTORICAL MARS SOURCE RECORDS</strong><div className="geo-flux-bins">{REPORTED_FLUX_PALETTE.map(item => <span key={item.band}><i style={{ background: item.color }}/>{item.label}</span>)}</div><span><i className="geo-dot geo-source-marker-symbol"/>Ringed point · one source record</span><span><i className="geo-dot geo-ring"/>Cluster count · source records</span><span><i className="geo-dot" style={{ background: '#91a9b2', boxShadow: 'none' }}/>Gray · no valid flux reported</span><small>Fill color is the highest reported source flux in this dataset snapshot (kg/h), not current flux. Heat color counts source locations; it is not methane concentration. {recordMode === 'plumes' ? 'Individual observation markers are shown separately.' : ''}</small></>}
      {dataLayer === 'observed-flux' && <><strong>HISTORICAL REPORTED-FLUX OVERLAY</strong>{renderTier === 'low' ? <div className="geo-flux-bins"><span><i style={{ background: '#3978eb' }}/>&lt;100</span><span><i style={{ background: '#20d2d2' }}/>100–499</span><span><i style={{ background: '#f3d14b' }}/>500–1,999</span><span><i style={{ background: '#f58b38' }}/>2,000–4,999</span><span><i style={{ background: '#ed4b43' }}> </i>≥5,000 kg/h</span></div> : <div className="geo-flux-gradient"><span>lower weighted density</span><i/><span>higher</span></div>}<span><i className="geo-dot" style={{ background: '#3978eb' }}/>Input values are reported per-observation flux in kg/h</span><small>{renderTier === 'low' ? `${lowPowerCellCount.toLocaleString()} low-power grid cells summarize ${positiveFluxLocationCount.toLocaleString()} positive observations` : `${positiveFluxLocationCount.toLocaleString()} positive, located records`} · {observationPeriod}.</small>{renderTier === 'low' ? <small>Color is the median reported flux within an approximately 1° grid cell. These are historical summaries, not continuous concentration or measured plume boundaries; circle size is cartographic only.</small> : <small>Heat colors blend overlapping historical detections; they do not show a continuous surface concentration or a measured plume boundary. Zero and missing values add no heat.</small>}{recordMode === 'plumes' && <small>Point markers remain available for inspecting individual MARS observation records.</small>}</>}
      {dataLayer === 'plume-footprints' && <><strong>UNEP MARS · PUBLISHER-SUPPLIED GEOMETRY</strong>
        <div className="geo-flux-bins"><span><i style={{ background: '#3978eb' }}/>&lt;100</span><span><i style={{ background: '#20d2d2' }}/>100–499</span><span><i style={{ background: '#f3d14b' }}/>500–1,999</span><span><i style={{ background: '#f58b38' }}/>2,000–4,999</span><span><i style={{ background: '#ed4b43' }}/>≥5,000 kg/h</span></div>
        <span><i className="geo-dot" style={{ background: '#fff' }}/>Linked polygon / outlined point color follows reported flux (kg/h)</span>
        {selectedId && <span><i className="geo-dot" style={{ background: '#f2fffc', boxShadow: '0 0 0 2px #0b2637' }}/>Bright outline · geometry linked to selected source</span>}
        <span><i className="geo-dot" style={{ background: '#718494', boxShadow: '0 0 0 1px #bac6cf' }}/>Gray fill / dashed outline · record has no source ID</span>
        {footprintUnlinkedCount > 0 && <small>{footprintUnlinkedCount.toLocaleString()} displayed plume shape(s) have no source ID and are not assigned to the selected case.</small>}
        {renderTier !== 'low' && <div className="geo-flux-gradient"><span>lower weighted density</span><i/><span>higher</span></div>}
        {footprintState === 'loading' && <small role="status">Verifying and loading only {selectedHistoryMonthResolved}…</small>}
        {footprintState === 'paused-low-power' && <small role="status">Eco / low-power: detailed polygons and blended heat are paused. Flux-colored historical observation points remain available; switch to Balanced or Quality to load this month.</small>}
        {footprintState === 'unavailable' && <><small role="status">{footprintError || 'Publisher geometry is unavailable. Reported observation points may still be shown at global scale.'}</small><button className="geo-footprint-retry" type="button" onClick={() => setFootprintRetry(value => value + 1)}>Retry verification</button></>}
        {footprintState === 'ready' && selectedHistoryMonthResolved && (() => { const month = footprintManifest?.months[selectedHistoryMonthResolved]; return <small>{month?.plumeRecordCount.toLocaleString() || 0} MARS rows in month · {month?.featureCount.toLocaleString() || 0} publisher polygons total · {footprintPolygonCount.toLocaleString()} polygons match current filters · {footprintMissingShapeCount.toLocaleString()} visible rows without a polygon.</small>; })()}
        {footprintState === 'ready' && footprintPolygonCount === 0 && <small>No polygon matches this month and current filters. This does not mean emissions are zero.</small>}
        <small>At global zoom, the blend is selected-month observation density weighted by reported flux; it is not concentration. Outlined points mean no polygon is currently visible. For linked records, neutral gray means flux was not reported. Gray fill and dashed outline mean the plume row has no source ID; it may still carry a reported flux, but it is not assigned to the selected case. These publisher shapes are not defined as concentration surfaces or verified physical boundaries.</small>
        {footprintManifest && <small>{footprintManifest.attribution} · {footprintManifest.license} · geometry archive {footprintManifest.geometryArchiveSha256.slice(0, 12)}…</small>}
      </>}
      {dataLayer === 'investigation-priority' && <><strong>INVESTIGATION PRIORITY · HEURISTIC</strong>
        {priorityState === 'loading' && <small role="status">Loading the hash-checked ranking snapshot…</small>}
        {priorityState === 'unavailable' && <small role="status">Ranking snapshot unavailable. The base map remains usable; check the API and pinned dataset.</small>}
        {priorityState === 'idle' && <small role="status">Select this layer to load the validated ranking snapshot.</small>}
        {priorityState === 'ready' && priorityPointCount > 0 && <><span><i className="geo-dot" style={{ background: '#42b9ed' }}/>Low</span><span><i className="geo-dot" style={{ background: '#f4c653' }}/>Medium</span><span><i className="geo-dot" style={{ background: '#f07164' }}/>High</span><small>{priorityPointCount} ranked source(s) · {prioritySnapshot?.modelVersion} · {prioritySnapshot?.generatedAt.slice(0, 10)} · snapshot {prioritySnapshot?.snapshotSha256.slice(0, 12)}…</small><small>Heuristic investigation aid, not leak likelihood. No independently validated future physical-emissions forecast is available.</small></>}
        {priorityState === 'ready' && priorityPointCount === 0 && <small>No source in the current map selection has a ranking row. No score is inferred for unranked sources.</small>}
      </>}
      {recordMode === 'plumes' && dataLayer !== 'observed-flux' && <><span><i className="geo-dot" style={{ background: '#91b4ff' }}/>Linked observation · reported flux</span><span><i className="geo-dot" style={{ background: '#aab3bd' }}/>MARS row has no source ID</span><span><i className="geo-dot" style={{ background: '#91a9b2' }}/>Flux not reported</span><span><i className="geo-dot geo-ring"/>Cluster count · observation records</span></>}
      </div>
    </details>
    {coords && <div className="geo-map-coordinates">{coords[0].toFixed(3)}°, {coords[1].toFixed(3)}° · z{coords[2].toFixed(1)}</div>}
  </div>;
}
