import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent, type ProjectionSpecification, type StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { MarsObservation, MarsSource } from './mars';
import { filterObservationsForMonth, filterObservationsThroughMonth, getObservationHistoryBuckets } from './observation-history';
import { filterPlumeFootprints, getFluxFootprintColorExpression, loadMonthlyPlumeGeometry, shouldLoadPlumeFootprints, toPlumeObservationLocations, type PlumeFootprintCollection, type PlumeGeometryManifest } from './plume-geometries';
export { getFluxFootprintColor } from './plume-geometries';
import {
  boundedOpacity,
  degradeTier,
  getContextLayerTiles,
  getEarthSky,
  getMapterhornTerrainSource,
  getNightSideOpacity,
  getRenderPixelRatio,
  getStableEarthLight,
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
function satelliteStyle(saturation: number, look: EarthLook = 'natural'): StyleSpecification {
  return {
  version: 8,
  sources: { imagery: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community' } },
  layers: [{ id: 'satellite-imagery', type: 'raster', source: 'imagery', paint: { 'raster-saturation': saturation, 'raster-contrast': getRasterContrast(look), 'raster-fade-duration': 160 } }],
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
  if (flux === null || !Number.isFinite(flux)) return '#91a9b2';
  return flux >= 2000 ? '#fa7750' : '#16e6c9';
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

type Props = { sources: MarsSource[]; observations?: MarsObservation[]; recordMode?: 'sources' | 'plumes'; dataLayer?: MapDataLayer; latestObservationDate?: string | null; datasetSnapshotId?: string | null; sourceArchiveSha256?: string | null; selectedId: string | null; onSelect: (id: string) => void; onSelectUnlinked?: (plumeId: string) => void; onProjectionFallback: () => void; onGlobeSupportChange: (supported: boolean) => void; theme: MapTheme; grayPercent: number; projection: MapProjection; focusOnly: boolean; expanded?: boolean };
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
    properties: { id: s.sourceId, label: s.name, region: s.region, flux: s.maxFluxKgHr ?? null, observations: s.plumeCount ?? s.observations?.length ?? 0, selected: s.sourceId === selectedId ? 1 : 0, synthetic: s.synthetic ? 1 : 0 },
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
      },
    })),
  };
}

export default function MapPanel({ sources, observations = [], recordMode = 'sources', dataLayer = 'source-density', latestObservationDate = null, datasetSnapshotId = null, sourceArchiveSha256 = null, selectedId, onSelect, onSelectUnlinked, onProjectionFallback, onGlobeSupportChange, theme, grayPercent, projection, focusOnly, expanded = false }: Props) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const sourcesRef = useRef(sources);
  const observationsRef = useRef(observations);
  const fluxOverlayRef = useRef(emptyPoints);
  const priorityRowsRef = useRef<PriorityRanking[]>([]);
  const selectionRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const onSelectUnlinkedRef = useRef(onSelectUnlinked);
  const recordModeRef = useRef(recordMode);
  const dataLayerRef = useRef(dataLayer);
  const focusRef = useRef(focusOnly);
  const themeRef = useRef(theme);
  const grayPercentRef = useRef(grayPercent);
  const projectionRef = useRef(projection);
  const projectionFallbackRef = useRef(onProjectionFallback);
  const globeSupportChangeRef = useRef(onGlobeSupportChange);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [coords, setCoords] = useState<[number, number, number] | null>(null);
  const [renderPreference, setRenderPreference] = useState<RenderPreference>('auto');
  const [renderPenalty, setRenderPenalty] = useState(0);
  const [earthLook, setEarthLook] = useState<EarthLook>('natural');
  const [terrainPreference, setTerrainPreference] = useState<TerrainPreference>('auto');
  const [nightShading, setNightShading] = useState(true);
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
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);
  const [historyPlayback, setHistoryPlayback] = useState(false);
  const historyBuckets = useMemo(() => getObservationHistoryBuckets(observations), [observations]);
  const latestHistoryMonth = historyBuckets.at(-1)?.month || null;
  const selectedHistoryMonthResolved = selectedHistoryMonth && historyBuckets.some(bucket => bucket.month === selectedHistoryMonth)
    ? selectedHistoryMonth
    : latestHistoryMonth;
  const selectedHistoryIndex = selectedHistoryMonthResolved ? historyBuckets.findIndex(bucket => bucket.month === selectedHistoryMonthResolved) : -1;
  const selectedHistoryBucket = selectedHistoryIndex >= 0 ? historyBuckets[selectedHistoryIndex] : null;
  const historicalObservations = useMemo(() => filterObservationsThroughMonth(observations, selectedHistoryMonthResolved), [observations, selectedHistoryMonthResolved]);
  const visibleObservations = useMemo(() => focusOnly ? historicalObservations.filter(item => item.sourceId === selectedId) : historicalObservations, [focusOnly, historicalObservations, selectedId]);
  const selectedMonthObservations = useMemo(() => selectedHistoryMonthResolved
    ? filterObservationsForMonth(visibleObservations, selectedHistoryMonthResolved)
    : [], [visibleObservations, selectedHistoryMonthResolved]);
  const visibleFootprints = useMemo(() => footprintState === 'ready'
    ? filterPlumeFootprints(footprintData, selectedMonthObservations)
    : emptyFootprints, [footprintState, footprintData, selectedMonthObservations]);
  const footprintLocations = useMemo(() => toPlumeObservationLocations(
    selectedMonthObservations,
    visibleFootprints,
    selectedHistoryMonthResolved || '',
    footprintState === 'ready',
  ), [selectedMonthObservations, visibleFootprints, selectedHistoryMonthResolved, footprintState]);
  const preferredTier = useMemo(() => resolveRenderTier(renderPreference, deviceHints(viewportWidth)), [renderPreference, viewportWidth]);
  const renderTier: RenderTier = renderPreference === 'auto' ? degradeTier(preferredTier, renderPenalty) : preferredTier;
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
  onSelectRef.current = onSelect; onSelectUnlinkedRef.current = onSelectUnlinked; recordModeRef.current = recordMode;
  dataLayerRef.current = dataLayer;
  sourcesRef.current = sources; observationsRef.current = historicalObservations; selectionRef.current = selectedId; focusRef.current = focusOnly;
  priorityRowsRef.current = priorityRows;
  themeRef.current = theme; grayPercentRef.current = grayPercent; projectionRef.current = projection; projectionFallbackRef.current = onProjectionFallback; globeSupportChangeRef.current = onGlobeSupportChange;
  renderPreferenceRef.current = renderPreference; earthLookRef.current = earthLook;
  earthSettingsRef.current = { renderTier, terrainPreference, nightShading, contextLayer, contextDate, contextOpacity, projection, earthLook };
  const sourceCount = useMemo(() => recordMode === 'plumes'
    ? toObservationGeoJSON(visibleObservations).features.length
    : focusOnly ? sources.filter(s => s.sourceId === selectedId).length : sources.length,
  [recordMode, visibleObservations, sources, selectedId, focusOnly]);
  const positiveFluxLocationCount = useMemo(() => visibleObservations.filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lon)
    && Math.abs(item.lat!) <= 90 && Math.abs(item.lon!) <= 180 && item.fluxKgHr !== null && Number.isFinite(item.fluxKgHr) && item.fluxKgHr > 0).length, [visibleObservations]);
  const lowPowerCellCount = useMemo(() => dataLayer === 'observed-flux' && renderTier === 'low' ? toFluxGridGeoJSON(visibleObservations).features.length : 0, [dataLayer, renderTier, visibleObservations]);
  const observationPeriod = useMemo(() => {
    const dates = visibleObservations.map(item => item.date.slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return dates.length ? `${dates[0]} – ${dates[dates.length - 1]}` : 'date unavailable';
  }, [visibleObservations]);
  const historyTimelineVisible = historyBuckets.length > 0 && (dataLayer === 'observed-flux' || dataLayer === 'plume-footprints' || recordMode === 'plumes');
  const maxMonthlyObservationCount = Math.max(1, ...historyBuckets.map(bucket => bucket.count));
  const historyCutoffDate = observationPeriod === 'date unavailable' ? null : observationPeriod.split(' – ').at(-1) || null;
  const priorityPointCount = useMemo(() => toPriorityOverlayGeoJSON(sources, priorityRows).features.length, [sources, priorityRows]);
  const footprintPolygonCount = visibleFootprints.features.length;
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
      setSelectedHistoryMonth(historyBuckets[nextIndex].month);
      if (nextIndex >= historyBuckets.length - 1) setHistoryPlayback(false);
    }, renderTier === 'low' ? 1_200 : 750);
    return () => window.clearInterval(timer);
  }, [historyPlayback, historyBuckets, selectedHistoryMonthResolved, renderTier]);

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
    try {
      const initialTier = getInitialRenderTierForRenderer(webgl.renderer, renderTier);
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      instance = new maplibregl.Map({
        container: node.current,
        style: styleForTheme(theme, grayPercent, earthLook),
        center: [17, 18],
        zoom: 1.5,
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
        return;
      }
      try {
        if (!instance.getSource('mapterhorn-dem')) instance.addSource('mapterhorn-dem', getMapterhornTerrainSource());
        instance.setTerrain({ source: 'mapterhorn-dem', exaggeration: settings.renderTier === 'high' ? 0.9 : 0.72 });
        if (settings.renderTier === 'high' && instance.getZoom() >= 7 && !instance.getLayer('earth-hillshade')) {
          const beforeId = instance.getLayer('methane-source-density') ? 'methane-source-density' : undefined;
          instance.addLayer({ id: 'earth-hillshade', type: 'hillshade', source: 'mapterhorn-dem', paint: {
            'hillshade-illumination-anchor': 'viewport', 'hillshade-illumination-direction': 225,
            'hillshade-exaggeration': 0.12, 'hillshade-shadow-color': '#102431', 'hillshade-highlight-color': '#d5d2c5',
          } }, beforeId);
        } else if ((settings.renderTier !== 'high' || instance.getZoom() < 7) && instance.getLayer('earth-hillshade')) {
          instance.removeLayer('earth-hillshade');
        }
        setTerrainError(null);
      } catch {
        failedTerrainRef.current = true;
        if (instance.getTerrain()) instance.setTerrain(null);
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
      for (const id of ['methane-cluster-halo', 'methane-clusters', 'methane-cluster-count', 'methane-unclustered-glow', 'methane-unclustered']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', sourceVisibility);
      }
      for (const id of ['mars-observation-cluster-halo', 'mars-observation-clusters', 'mars-observation-cluster-count', 'mars-observation-unclustered']) {
        if (instance.getLayer(id)) instance.setLayoutProperty(id, 'visibility', plumeVisibility);
      }
      if (instance.getLayer('methane-flux-heatmap')) instance.setLayoutProperty('methane-flux-heatmap', 'visibility', selectedLayer === 'observed-flux' && !lowPowerFluxGrid ? 'visible' : 'none');
      if (instance.getLayer('mars-selected-month-flux-heatmap')) instance.setLayoutProperty('mars-selected-month-flux-heatmap', 'visibility', footprintsSelected && earthSettingsRef.current.renderTier !== 'low' ? 'visible' : 'none');
      if (instance.getLayer('methane-flux-grid-cells')) instance.setLayoutProperty('methane-flux-grid-cells', 'visibility', lowPowerFluxGrid ? 'visible' : 'none');
      if (instance.getLayer('methane-priority-points')) instance.setLayoutProperty('methane-priority-points', 'visibility', selectedLayer === 'investigation-priority' && priorityRowsRef.current.length > 0 ? 'visible' : 'none');
      if (instance.getLayer('mars-plume-footprints')) instance.setLayoutProperty('mars-plume-footprints', 'visibility', footprintsSelected && footprintsReady ? 'visible' : 'none');
      if (instance.getLayer('mars-plume-footprint-outline')) instance.setLayoutProperty('mars-plume-footprint-outline', 'visibility', footprintsSelected && footprintsReady ? 'visible' : 'none');
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
      setStatus('ready');
      setMapError(null);
      const filtered = focusRef.current ? sourcesRef.current.filter(s => s.sourceId === selectionRef.current) : sourcesRef.current;
      const data = toGeoJSON(filtered, selectionRef.current);
      const visibleObservations = focusRef.current
        ? observationsRef.current.filter(item => item.sourceId === selectionRef.current)
        : observationsRef.current;
      if (instance.getSource('methane-points')) {
        (instance.getSource('methane-points') as maplibregl.GeoJSONSource).setData(data);
        (instance.getSource('mars-observations') as maplibregl.GeoJSONSource | undefined)?.setData(toObservationGeoJSON(visibleObservations));
        (instance.getSource('mars-flux-observations') as maplibregl.GeoJSONSource | undefined)?.setData(fluxOverlayRef.current);
        (instance.getSource('mars-flux-cells') as maplibregl.GeoJSONSource | undefined)?.setData(dataLayerRef.current === 'observed-flux' && earthSettingsRef.current.renderTier === 'low' ? toFluxGridGeoJSON(visibleObservations) : emptyPoints);
        (instance.getSource('methane-priority-source') as maplibregl.GeoJSONSource | undefined)?.setData(toPriorityOverlayGeoJSON(filtered, priorityRowsRef.current));
        (instance.getSource('mars-plume-footprints') as maplibregl.GeoJSONSource | undefined)?.setData(footprintDataRef.current);
        (instance.getSource('mars-plume-record-locations') as maplibregl.GeoJSONSource | undefined)?.setData(footprintLocationsRef.current);
        syncRecordMode();
        syncEarthRef.current();
        return;
      }
      instance.addSource('methane-points', { type: 'geojson', data, cluster: true, clusterMaxZoom: 9, clusterRadius: 55 });
      instance.addLayer({ id: 'methane-source-density', type: 'heatmap', source: 'methane-points', maxzoom: 8, paint: { 'heatmap-weight': 1, 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1, 0.65, 5, 0.95], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 8, 6, 24], 'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.45, 7, 0], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.25, '#146974', 0.45, '#2cdac7', 0.65, '#f4be53', 0.9, '#f96c4c'] } });
      const lowPowerFluxGrid = earthSettingsRef.current.renderTier === 'low';
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
      instance.addSource('mars-flux-cells', { type: 'geojson', data: dataLayerRef.current === 'observed-flux' && lowPowerFluxGrid ? toFluxGridGeoJSON(visibleObservations) : emptyPoints });
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
      instance.addLayer({ id: 'mars-plume-footprints', type: 'fill', source: 'mars-plume-footprints', minzoom: 4, layout: { visibility: 'none' }, paint: {
        'fill-color': getFluxFootprintColorExpression() as never,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.54, 8, 0.66, 13, 0.72],
        'fill-outline-color': '#f2fbff',
      } });
      instance.addLayer({ id: 'mars-plume-footprint-outline', type: 'line', source: 'mars-plume-footprints', minzoom: 4, layout: { visibility: 'none' }, paint: {
        'line-color': getFluxFootprintColorExpression() as never,
        'line-opacity': 0.96,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 10, 1.35, 15, 2.1],
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
      instance.addLayer({ id: 'methane-unclustered-glow', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 18, 11], 'circle-color': ['case', ['==', ['get', 'selected'], 1], '#f59c3a', '#21dcc8'], 'circle-opacity': .18, 'circle-blur': .5 } });
      instance.addLayer({ id: 'methane-unclustered', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 6], 'circle-color': ['case', ['==', ['get', 'selected'], 1], '#ffb14c', ['==', ['get', 'flux'], null], '#91a9b2', ['>=', ['get', 'flux'], 2000], '#fa7750', '#16e6c9'], 'circle-stroke-width': 2, 'circle-stroke-color': '#e8fcff', 'circle-opacity': .94 } });
      instance.addSource('methane-priority-source', { type: 'geojson', data: toPriorityOverlayGeoJSON(filtered, priorityRowsRef.current) });
      instance.addLayer({ id: 'methane-priority-points', type: 'circle', source: 'methane-priority-source', layout: { visibility: 'none' }, paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 11, 4, 18, 8, 26],
        'circle-color': ['match', ['get', 'priorityBand'], 'low', '#42b9ed', 'medium', '#f4c653', 'high', '#f07164', '#95aab1'],
        'circle-opacity': 0.63,
        'circle-blur': 0.55,
        'circle-stroke-color': ['match', ['get', 'priorityBand'], 'low', '#86dcff', 'medium', '#ffe39a', 'high', '#ffb1a8', '#d2e0e3'],
        'circle-stroke-width': 2,
      } });
      instance.addSource('mars-observations', { type: 'geojson', data: toObservationGeoJSON(visibleObservations), cluster: true, clusterMaxZoom: 9, clusterRadius: 46 });
      instance.addLayer({ id: 'mars-observation-cluster-halo', type: 'circle', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: { 'circle-radius': ['step', ['get', 'point_count'], 19, 50, 27, 300, 35], 'circle-color': '#648cdb', 'circle-opacity': .15, 'circle-stroke-color': '#91b4ff', 'circle-stroke-opacity': .32, 'circle-stroke-width': 2 } });
      instance.addLayer({ id: 'mars-observation-clusters', type: 'circle', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none' }, paint: { 'circle-color': '#304f86', 'circle-radius': ['step', ['get', 'point_count'], 14, 50, 19, 300, 25], 'circle-stroke-width': 2, 'circle-stroke-color': '#91b4ff' } });
      instance.addLayer({ id: 'mars-observation-cluster-count', type: 'symbol', source: 'mars-observations', filter: ['has', 'point_count'], layout: { visibility: 'none', 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      instance.addLayer({ id: 'mars-observation-unclustered', type: 'circle', source: 'mars-observations', filter: ['!', ['has', 'point_count']], layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3.5, 9, 5.5, 13, 7], 'circle-color': ['case', ['==', ['get', 'linked'], 0], '#aab3bd', ['==', ['get', 'flux'], null], '#91a9b2', ['step', ['get', 'flux'], '#3978eb', 100, '#20d2d2', 500, '#f3d14b', 2000, '#f58b38', 5000, '#ed4b43']], 'circle-stroke-width': 1.5, 'circle-stroke-color': '#f3f7ff', 'circle-opacity': .92 } });
      syncRecordMode();
      syncEarthRef.current();
      instance.getCanvas().style.cursor = 'grab';
    };
    const syncSatelliteRendering = () => {
      if (!instance.getLayer('satellite-imagery')) return;
      instance.setPaintProperty('satellite-imagery', 'raster-saturation', getRasterSaturation(themeRef.current, grayPercentRef.current, earthLookRef.current));
      instance.setPaintProperty('satellite-imagery', 'raster-contrast', getRasterContrast(earthLookRef.current));
    };
    const clickPoint = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === 'string') onSelectRef.current(id);
    };
    const clickObservationPoint = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      if (!properties || typeof properties.id !== 'string') return;
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
      contextSignatureRef.current = null;
      failedTerrainRef.current = false;
      setContextError(null);
      setTerrainError(null);
      syncSatelliteRendering();
      const desiredProjection = getProjectionSpec(projectionRef.current);
      if (instance.getProjection()?.type !== desiredProjection.type) instance.setProjection(desiredProjection);
      if (!firstStyleLoaded && projectionRef.current === 'globe') {
        const overview = getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight);
        instance.jumpTo({ ...overview, bearing: 0, pitch: 0 });
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
      if (sourceId === 'mapterhorn-dem') {
        failedTerrainRef.current = true;
        if (instance.getTerrain()) instance.setTerrain(null);
        setTerrainError('Terrain tiles are unavailable; the map has returned to a flat surface.');
        return;
      }
      if (sourceId === 'earth-context') {
        setContextError('This dated NASA context layer could not be loaded. Check the selected date or connection.');
        removeContextOverlay();
        return;
      }
      if (isGlobeRendererFailure(projectionRef.current, message)) {
        fallbackFromGlobe();
        return;
      }
      // Missing optional glyph ranges should not mark the whole basemap offline.
      // A late tile failure is partial degradation if the style already rendered.
      if (event.error && !message.includes('/fonts/')) {
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
    instance.setStyle(styleForTheme(theme, grayPercent, earthLook));
  }, [theme, grayPercent, earthLook]);
  useEffect(() => {
    const instance = map.current;
    if (theme !== 'grayscale' || !instance?.isStyleLoaded() || !instance.getLayer('satellite-imagery')) return;
    instance.setPaintProperty('satellite-imagery', 'raster-saturation', getRasterSaturation(theme, grayPercent, earthLook));
  }, [theme, grayPercent, earthLook]);
  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    const desiredProjection = getProjectionSpec(projection);
    if (instance.getProjection()?.type !== desiredProjection.type) {
      instance.setProjection(desiredProjection);
      if (projection === 'globe') {
        const overview = getGlobeOverview(sourcesRef.current, node.current?.clientWidth, node.current?.clientHeight);
        instance.flyTo({ center: overview.center, zoom: overview.zoom, duration: 1100, essential: true });
      }
    }
  }, [projection]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const filtered = focusOnly ? sources.filter(s => s.sourceId === selectedId) : sources;
    const geo = instance.getSource('methane-points') as maplibregl.GeoJSONSource | undefined;
    geo?.setData(toGeoJSON(filtered, selectedId));
    const visibleObservations = focusOnly ? historicalObservations.filter(item => item.sourceId === selectedId) : historicalObservations;
    const plumeGeo = instance.getSource('mars-observations') as maplibregl.GeoJSONSource | undefined;
    plumeGeo?.setData(toObservationGeoJSON(visibleObservations));
    const fluxGeo = instance.getSource('mars-flux-observations') as maplibregl.GeoJSONSource | undefined;
    fluxGeo?.setData(fluxOverlay);
    const fluxCells = instance.getSource('mars-flux-cells') as maplibregl.GeoJSONSource | undefined;
    fluxCells?.setData(dataLayer === 'observed-flux' && renderTier === 'low' ? toFluxGridGeoJSON(visibleObservations) : emptyPoints);
    const priorityGeo = instance.getSource('methane-priority-source') as maplibregl.GeoJSONSource | undefined;
    priorityGeo?.setData(toPriorityOverlayGeoJSON(filtered, priorityRows));
    const footprintGeo = instance.getSource('mars-plume-footprints') as maplibregl.GeoJSONSource | undefined;
    footprintGeo?.setData(visibleFootprints);
    const footprintLocationGeo = instance.getSource('mars-plume-record-locations') as maplibregl.GeoJSONSource | undefined;
    footprintLocationGeo?.setData(footprintLocations);
    syncEarthRef.current();
  }, [sources, historicalObservations, selectedId, focusOnly, dataLayer, renderTier, priorityRows, visibleFootprints, footprintLocations, fluxOverlay]);
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
    if (s) instance.flyTo({ center: [s.lon, s.lat], zoom: Math.max(instance.getZoom(), 4.2), speed: 1.35, essential: true });
  }, [selectedId, sources]);
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
    setSelectedHistoryMonth(historyBuckets[0].month);
    setHistoryPlayback(true);
  };

  return <div className={`geo-map-shell${projection === 'globe' ? ' geo-map-globe' : ''}`}>
    <div ref={node} className="geo-map-canvas" role="application" aria-label="Interactive methane map; drag to pan, scroll to zoom and select a source" />
    <div className="geo-map-topline"><span className="geo-pulse"/> {status === 'ready' ? dataLayer === 'observed-flux' ? `${positiveFluxLocationCount.toLocaleString()} located positive-flux observations` : dataLayer === 'plume-footprints' ? `${footprintPolygonCount.toLocaleString()} publisher geometries · ${selectedHistoryMonthResolved || 'no month selected'}` : dataLayer === 'investigation-priority' && priorityState === 'ready' ? `${priorityPointCount.toLocaleString()} ranked source locations` : recordMode === 'plumes' ? `${sourceCount.toLocaleString()} historical MARS observation locations` : `${sourceCount.toLocaleString()} source locations` : status === 'loading' ? 'Loading basemap...' : 'Map could not be loaded — check connection or graphics support'}</div>
    <div className="geo-map-live-status" role="status"><span><i/>LIVE FEED OFF</span><small>{historyTimelineVisible && selectedHistoryMonthResolved ? `Viewing through ${selectedHistoryMonthResolved} · archive through ${latestObservationDate || 'date unavailable'} UTC` : `Historical observations through ${latestObservationDate || 'date unavailable'} UTC`}</small></div>
    {status === 'error' && <div className="geo-map-fallback" role="status"><strong>Interactive map unavailable</strong><span>{mapError || 'You can still inspect the selected case and evidence below.'}</span></div>}
    <div className="geo-map-hint">Drag to pan · scroll to zoom · {recordMode === 'plumes' ? 'click an observation record' : 'click a source'} · historical, not live</div>
    {status === 'ready' && <details className="earth-rendering-panel">
      <summary aria-label="Open Earth rendering settings"><span aria-hidden="true">◎</span> Earth rendering <b>{renderPreference.toUpperCase()} · {renderTier}</b></summary>
      <div className="earth-rendering-content">
        <label className="earth-control-row"><span>Rendering quality</span><select value={renderPreference} onChange={event => { setRenderPenalty(0); setRenderPreference(event.target.value as RenderPreference); }}>
          <option value="auto">Auto</option><option value="eco">Eco</option><option value="balanced">Balanced</option><option value="quality">Quality</option>
        </select></label>
        <label className="earth-control-row"><span>Earth appearance</span><select value={earthLook} onChange={event => setEarthLook(event.target.value as EarthLook)}>
          <option value="natural">Natural</option><option value="cinematic">Cinematic</option>
        </select></label>
        {theme === 'satellite' && <p className="earth-rendering-note">Esri World Imagery is a mosaic; capture date and resolution vary by area. It provides geographic context, not methane evidence.</p>}
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
        <p className="earth-rendering-note">The line shows an approximate UTC solar terminator. This visualization is not an emissions signal or nighttime satellite imagery.</p>
        {renderTier === 'low' && <p className="earth-rendering-note">Low-power mode pauses terrain and NASA context tiles; solar shading remains enabled.</p>}
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
    {historyTimelineVisible && selectedHistoryBucket && <section className="geo-map-history" aria-label="Historical methane observation timeline">
      <div className="geo-map-history-head"><strong>{dataLayer === 'plume-footprints' ? 'PUBLISHER GEOMETRY BY MONTH · HISTORICAL' : 'OBSERVATION HISTORY · NOT LIVE'}</strong>
        <button type="button" onClick={() => { setHistoryPlayback(false); setSelectedHistoryMonth(null); }} aria-pressed={selectedHistoryMonth === null}>{dataLayer === 'plume-footprints' ? 'Latest month' : 'Full archive'}</button>
        <button type="button" onClick={toggleHistoryPlayback} disabled={historyBuckets.length < 2 || dataLayer === 'plume-footprints'} aria-label={historyPlayback ? 'Pause archive playback' : 'Play archive playback'}>{historyPlayback ? 'Pause' : 'Play'}</button>
      </div>
      <div className="geo-map-history-bars" aria-hidden="true">{historyBuckets.map((bucket, index) => <span key={bucket.month} title={`${bucket.month}: ${bucket.count.toLocaleString()} MARS rows`} style={{
        height: `${Math.max(3, Math.round(bucket.count / maxMonthlyObservationCount * 22))}px`,
        opacity: selectedHistoryIndex < 0 || index <= selectedHistoryIndex ? 0.95 : 0.28,
      }}/>)}</div>
      <input type="range" min="0" max={Math.max(0, historyBuckets.length - 1)} step="1" value={Math.max(0, selectedHistoryIndex)} aria-label={dataLayer === 'plume-footprints' ? 'Select one month of publisher plume geometry' : 'Browse the cumulative methane observation archive by month'} aria-valuetext={`${selectedHistoryBucket.month} · ${selectedHistoryBucket.count} rows in this month`} onChange={event => {
        setHistoryPlayback(false);
        setSelectedHistoryMonth(historyBuckets[Number(event.target.value)]?.month || null);
      }}/>
      <div className="geo-map-history-summary"><span>{selectedHistoryBucket.month} · {selectedHistoryBucket.count.toLocaleString()} rows this month</span><strong>{visibleObservations.length.toLocaleString()} cumulative rows · through {historyCutoffDate || 'no earlier rows'} UTC</strong></div>
      <small>{dataLayer === 'plume-footprints' ? 'Only the selected month’s compressed geometry shard is requested. Playback is paused to avoid loading many months automatically. Empty months or missing shapes are not zero emissions.' : 'Bars count archive rows, not methane concentration. Empty months mean no row in this snapshot, not zero emissions.'}</small>
    </section>}
    <div className="geo-map-legend" role="region" tabIndex={0} aria-label="Map layer legend">
      {dataLayer === 'source-density' && <><strong>SOURCE LOCATION DENSITY</strong><span><i className="geo-dot geo-teal"/>MARS source location</span><span><i className="geo-dot geo-orange"/>Selected / higher reported source flux</span><span><i className="geo-dot geo-ring"/>Cluster count · source records</span><small>Heat color shows source-location density, not methane concentration. {recordMode === 'plumes' ? 'Observation symbols are also shown.' : ''}</small></>}
      {dataLayer === 'observed-flux' && <><strong>HISTORICAL REPORTED-FLUX OVERLAY</strong>{renderTier === 'low' ? <div className="geo-flux-bins"><span><i style={{ background: '#3978eb' }}/>&lt;100</span><span><i style={{ background: '#20d2d2' }}/>100–499</span><span><i style={{ background: '#f3d14b' }}/>500–1,999</span><span><i style={{ background: '#f58b38' }}/>2,000–4,999</span><span><i style={{ background: '#ed4b43' }}> </i>≥5,000 kg/h</span></div> : <div className="geo-flux-gradient"><span>lower weighted density</span><i/><span>higher</span></div>}<span><i className="geo-dot" style={{ background: '#3978eb' }}/>Input values are reported per-observation flux in kg/h</span><small>{renderTier === 'low' ? `${lowPowerCellCount.toLocaleString()} low-power grid cells summarize ${positiveFluxLocationCount.toLocaleString()} positive observations` : `${positiveFluxLocationCount.toLocaleString()} positive, located records`} · {observationPeriod}.</small>{renderTier === 'low' ? <small>Color is the median reported flux within an approximately 1° grid cell. These are historical summaries, not continuous concentration or measured plume boundaries; circle size is cartographic only.</small> : <small>Heat colors blend overlapping historical detections; they do not show a continuous surface concentration or a measured plume boundary. Zero and missing values add no heat.</small>}{recordMode === 'plumes' && <small>Point markers remain available for inspecting individual MARS observation records.</small>}</>}
      {dataLayer === 'plume-footprints' && <><strong>UNEP MARS · PUBLISHER-SUPPLIED GEOMETRY</strong>
        <div className="geo-flux-bins"><span><i style={{ background: '#3978eb' }}/>&lt;100</span><span><i style={{ background: '#20d2d2' }}/>100–499</span><span><i style={{ background: '#f3d14b' }}/>500–1,999</span><span><i style={{ background: '#f58b38' }}/>2,000–4,999</span><span><i style={{ background: '#ed4b43' }}/>≥5,000 kg/h</span></div>
        <span><i className="geo-dot" style={{ background: '#fff' }}/>Polygon / outlined point color follows record flux (kg/h)</span>
        {renderTier !== 'low' && <div className="geo-flux-gradient"><span>lower weighted density</span><i/><span>higher</span></div>}
        {footprintState === 'loading' && <small role="status">Verifying and loading only {selectedHistoryMonthResolved}…</small>}
        {footprintState === 'paused-low-power' && <small role="status">Eco / low-power: detailed polygons and blended heat are paused. Flux-colored historical observation points remain available; switch to Balanced or Quality to load this month.</small>}
        {footprintState === 'unavailable' && <><small role="status">{footprintError || 'Publisher geometry is unavailable. Reported observation points may still be shown at global scale.'}</small><button className="geo-footprint-retry" type="button" onClick={() => setFootprintRetry(value => value + 1)}>Retry verification</button></>}
        {footprintState === 'ready' && selectedHistoryMonthResolved && (() => { const month = footprintManifest?.months[selectedHistoryMonthResolved]; return <small>{month?.plumeRecordCount.toLocaleString() || 0} MARS rows in month · {month?.featureCount.toLocaleString() || 0} publisher polygons total · {footprintPolygonCount.toLocaleString()} polygons match current filters · {footprintMissingShapeCount.toLocaleString()} visible rows without a polygon.</small>; })()}
        {footprintState === 'ready' && footprintPolygonCount === 0 && <small>No polygon matches this month and current filters. This does not mean emissions are zero.</small>}
        <small>At global zoom, the blend is selected-month observation density weighted by reported flux; it is not concentration. Outlined points mean no polygon is currently visible. Gray is reserved for missing flux. These publisher shapes are not defined as concentration surfaces or verified physical boundaries.</small>
        {footprintManifest && <small>{footprintManifest.attribution} · {footprintManifest.license} · geometry archive {footprintManifest.geometryArchiveSha256.slice(0, 12)}…</small>}
      </>}
      {dataLayer === 'investigation-priority' && <><strong>INVESTIGATION PRIORITY · HEURISTIC</strong>
        {priorityState === 'loading' && <small role="status">Loading the hash-checked ranking snapshot…</small>}
        {priorityState === 'unavailable' && <small role="status">Ranking snapshot unavailable. The base map remains usable; check the API and pinned dataset.</small>}
        {priorityState === 'idle' && <small role="status">Select this layer to load the validated ranking snapshot.</small>}
        {priorityState === 'ready' && priorityPointCount > 0 && <><span><i className="geo-dot" style={{ background: '#42b9ed' }}/>Low</span><span><i className="geo-dot" style={{ background: '#f4c653' }}/>Medium</span><span><i className="geo-dot" style={{ background: '#f07164' }}/>High</span><small>{priorityPointCount} ranked source(s) · {prioritySnapshot?.modelVersion} · {prioritySnapshot?.generatedAt.slice(0, 10)} · snapshot {prioritySnapshot?.snapshotSha256.slice(0, 12)}…</small><small>Heuristic investigation aid, not leak likelihood. No independently validated future forecast is available.</small></>}
        {priorityState === 'ready' && priorityPointCount === 0 && <small>No source in the current map selection has a ranking row. No score is inferred for unranked sources.</small>}
      </>}
      {recordMode === 'plumes' && dataLayer !== 'observed-flux' && <><span><i className="geo-dot" style={{ background: '#91b4ff' }}/>Linked observation · reported flux</span><span><i className="geo-dot" style={{ background: '#aab3bd' }}/>MARS row has no source ID</span><span><i className="geo-dot" style={{ background: '#91a9b2' }}/>Flux not reported</span><span><i className="geo-dot geo-ring"/>Cluster count · observation records</span></>}
    </div>
    {coords && <div className="geo-map-coordinates">{coords[0].toFixed(3)}°, {coords[1].toFixed(3)}° · z{coords[2].toFixed(1)}</div>}
  </div>;
}
