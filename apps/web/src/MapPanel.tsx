import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type MapLayerMouseEvent, type ProjectionSpecification, type StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { MarsSource } from './mars';

const DARK = 'https://tiles.openfreemap.org/styles/fiord';
const STREET = 'https://tiles.openfreemap.org/styles/liberty';
function satelliteStyle(saturation: number): StyleSpecification {
  return {
  version: 8,
  sources: { imagery: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community' } },
  layers: [{ id: 'satellite-imagery', type: 'raster', source: 'imagery', paint: { 'raster-saturation': saturation, 'raster-contrast': 0.08, 'raster-fade-duration': 200 } }],
  };
}
export type MapTheme = 'dark' | 'satellite' | 'grayscale' | 'street';
export type MapProjection = 'flat' | 'globe';
type MapStatus = 'loading' | 'ready' | 'error';

export function getRasterSaturation(theme: MapTheme, grayPercent: number): number {
  if (theme !== 'grayscale') return 0;
  const boundedPercent = Number.isFinite(grayPercent) ? Math.max(0, Math.min(100, grayPercent)) : 100;
  return boundedPercent === 0 ? 0 : -boundedPercent / 100;
}

export function getProjectionSpec(mode: MapProjection): ProjectionSpecification {
  return { type: mode === 'globe' ? 'globe' : 'mercator' };
}

export function isGlobeRendererFailure(mode: MapProjection, message: string): boolean {
  return mode === 'globe' && /webgl|shader|context lost|out of memory/i.test(message);
}

export function isSoftwareWebGLRenderer(renderer: string | null): boolean {
  return renderer !== null && /swiftshader|llvmpipe|software\s+rasterizer/i.test(renderer);
}

export function isInteractiveMapSupported(contextAvailable: boolean, renderer: string | null): boolean {
  return contextAvailable && !isSoftwareWebGLRenderer(renderer);
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

function styleForTheme(theme: MapTheme, grayPercent: number): string | StyleSpecification {
  if (theme === 'dark') return DARK;
  if (theme === 'street') return STREET;
  return satelliteStyle(getRasterSaturation(theme, grayPercent));
}

type Props = { sources: MarsSource[]; selectedId: string | null; onSelect: (id: string) => void; onProjectionFallback: () => void; onGlobeSupportChange: (supported: boolean) => void; theme: MapTheme; grayPercent: number; projection: MapProjection; focusOnly: boolean; expanded?: boolean };
const validSources = (sources: MarsSource[]) => sources.filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon) && Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180);
function toGeoJSON(sources: MarsSource[], selectedId: string | null): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: validSources(sources).map(s => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    properties: { id: s.sourceId, label: s.name, region: s.region, flux: s.maxFluxKgHr ?? null, observations: s.plumeCount ?? s.observations?.length ?? 0, selected: s.sourceId === selectedId ? 1 : 0, synthetic: s.synthetic ? 1 : 0 },
  })) };
}

export default function MapPanel({ sources, selectedId, onSelect, onProjectionFallback, onGlobeSupportChange, theme, grayPercent, projection, focusOnly, expanded = false }: Props) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const sourcesRef = useRef(sources);
  const selectionRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const focusRef = useRef(focusOnly);
  const themeRef = useRef(theme);
  const grayPercentRef = useRef(grayPercent);
  const projectionRef = useRef(projection);
  const projectionFallbackRef = useRef(onProjectionFallback);
  const globeSupportChangeRef = useRef(onGlobeSupportChange);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [coords, setCoords] = useState<[number, number, number] | null>(null);
  onSelectRef.current = onSelect; sourcesRef.current = sources; selectionRef.current = selectedId; focusRef.current = focusOnly;
  themeRef.current = theme; grayPercentRef.current = grayPercent; projectionRef.current = projection; projectionFallbackRef.current = onProjectionFallback; globeSupportChangeRef.current = onGlobeSupportChange;
  const sourceCount = useMemo(() => focusOnly ? sources.filter(s => s.sourceId === selectedId).length : sources.length, [sources, selectedId, focusOnly]);

  useEffect(() => {
    if (!node.current) return;
    let disposed = false;
    let fallbackTriggered = false;
    const webgl = probeWebGLRenderer();
    if (!isInteractiveMapSupported(webgl.contextAvailable, webgl.renderer)) {
      setMapError(webgl.contextAvailable
        ? 'This browser uses software-only WebGL. The selected case and evidence remain available below.'
        : getMapInitializationFallbackMessage(new Error('Could not initialize WebGL')));
      setStatus('error');
      globeSupportChangeRef.current(false);
      return;
    }
    let instance: MapLibreMap;
    try {
      instance = new maplibregl.Map({ container: node.current, style: styleForTheme(theme, grayPercent), center: [17, 18], zoom: 1.5, minZoom: 1, maxZoom: 17, renderWorldCopies: true });
    } catch (error) {
      node.current.replaceChildren();
      setMapError(getMapInitializationFallbackMessage(error));
      setStatus('error');
      globeSupportChangeRef.current(false);
      return;
    }
    map.current = instance;
    const rendererName = getWebGLRendererName(instance.getCanvas());
    const globeSupported = !isSoftwareWebGLRenderer(rendererName);
    globeSupportChangeRef.current(globeSupported);
    const fallbackFromGlobe = () => {
      if (disposed || fallbackTriggered || projectionRef.current !== 'globe') return;
      fallbackTriggered = true;
      projectionFallbackRef.current();
    };
    instance.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
    instance.addControl(new maplibregl.ScaleControl({ maxWidth: 140 }), 'bottom-left');
    const syncSource = () => {
      if (disposed) return;
      setStatus('ready');
      setMapError(null);
      const filtered = focusRef.current ? sourcesRef.current.filter(s => s.sourceId === selectionRef.current) : sourcesRef.current;
      const data = toGeoJSON(filtered, selectionRef.current);
      if (instance.getSource('methane-points')) {
        (instance.getSource('methane-points') as maplibregl.GeoJSONSource).setData(data);
        return;
      }
      instance.addSource('methane-points', { type: 'geojson', data, cluster: true, clusterMaxZoom: 9, clusterRadius: 55 });
      instance.addLayer({ id: 'methane-source-density', type: 'heatmap', source: 'methane-points', maxzoom: 8, paint: { 'heatmap-weight': 1, 'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 1, 0.65, 5, 0.95], 'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 1, 8, 6, 24], 'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.45, 7, 0], 'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.25, '#146974', 0.45, '#2cdac7', 0.65, '#f4be53', 0.9, '#f96c4c'] } });
      instance.addLayer({ id: 'methane-cluster-halo', type: 'circle', source: 'methane-points', filter: ['has', 'point_count'], paint: { 'circle-radius': ['step', ['get', 'point_count'], 20, 50, 28, 300, 36], 'circle-color': '#00c8b2', 'circle-opacity': .13, 'circle-stroke-color': '#00ddc7', 'circle-stroke-opacity': .28, 'circle-stroke-width': 2 } });
      instance.addLayer({ id: 'methane-clusters', type: 'circle', source: 'methane-points', filter: ['has', 'point_count'], paint: { 'circle-color': '#0e5a67', 'circle-radius': ['step', ['get', 'point_count'], 14, 50, 19, 300, 25], 'circle-stroke-width': 2, 'circle-stroke-color': '#3de9d6' } });
      instance.addLayer({ id: 'methane-cluster-count', type: 'symbol', source: 'methane-points', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } });
      instance.addLayer({ id: 'methane-unclustered-glow', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 18, 11], 'circle-color': ['case', ['==', ['get', 'selected'], 1], '#f59c3a', '#21dcc8'], 'circle-opacity': .18, 'circle-blur': .5 } });
      instance.addLayer({ id: 'methane-unclustered', type: 'circle', source: 'methane-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 9, 6], 'circle-color': ['case', ['==', ['get', 'selected'], 1], '#ffb14c', ['>=', ['coalesce', ['get', 'flux'], 0], 2000], '#fa7750', '#16e6c9'], 'circle-stroke-width': 2, 'circle-stroke-color': '#e8fcff', 'circle-opacity': .94 } });
      instance.getCanvas().style.cursor = 'grab';
    };
    const syncSatelliteRendering = () => {
      if (!instance.getLayer('satellite-imagery')) return;
      instance.setPaintProperty('satellite-imagery', 'raster-saturation', getRasterSaturation(themeRef.current, grayPercentRef.current));
    };
    const clickPoint = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === 'string') onSelectRef.current(id);
    };
    const clickCluster = (event: MapLayerMouseEvent) => {
      const f = event.features?.[0];
      const id = f?.properties?.cluster_id;
      const geometry = f?.geometry;
      if (!id || geometry?.type !== 'Point') return;
      const s = instance.getSource('methane-points') as maplibregl.GeoJSONSource;
      s.getClusterExpansionZoom(id).then(zoom => instance.easeTo({ center: geometry.coordinates as [number, number], zoom: Math.min(zoom, 13), duration: 600 })).catch(() => {});
    };
    instance.on('style.load', () => {
      if (disposed) return;
      syncSatelliteRendering();
      if (projectionRef.current === 'globe' && isSoftwareWebGLRenderer(rendererName)) {
        projectionFallbackRef.current();
        return;
      }
      const desiredProjection = getProjectionSpec(projectionRef.current);
      if (instance.getProjection()?.type !== desiredProjection.type) instance.setProjection(desiredProjection);
      syncSource();
    });
    instance.on('click', 'methane-unclustered', clickPoint);
    instance.on('click', 'methane-clusters', clickCluster);
    instance.on('mousemove', e => { setCoords([e.lngLat.lat, e.lngLat.lng, instance.getZoom()]); });
    instance.on('error', (event) => {
      const message = event.error?.message || '';
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
    return () => { disposed = true; observer.disconnect(); canvas.removeEventListener('webglcontextlost', onWebglContextLost); window.removeEventListener('error', onWindowError); instance.remove(); map.current = null; };
  }, []);
  const appliedTheme = useRef(theme);
  useEffect(() => {
    const instance = map.current;
    if (!instance || appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    setStatus('loading');
    instance.setStyle(styleForTheme(theme, grayPercent));
  }, [theme, grayPercent]);
  useEffect(() => {
    const instance = map.current;
    if (theme !== 'grayscale' || !instance?.isStyleLoaded() || !instance.getLayer('satellite-imagery')) return;
    instance.setPaintProperty('satellite-imagery', 'raster-saturation', getRasterSaturation(theme, grayPercent));
  }, [theme, grayPercent]);
  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    if (projection === 'globe' && isSoftwareWebGLRenderer(getWebGLRendererName(instance.getCanvas()))) {
      projectionFallbackRef.current();
      return;
    }
    const desiredProjection = getProjectionSpec(projection);
    if (instance.getProjection()?.type !== desiredProjection.type) instance.setProjection(desiredProjection);
  }, [projection]);
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const filtered = focusOnly ? sources.filter(s => s.sourceId === selectedId) : sources;
    const geo = instance.getSource('methane-points') as maplibregl.GeoJSONSource | undefined;
    geo?.setData(toGeoJSON(filtered, selectedId));
  }, [sources, selectedId, focusOnly]);
  const lastChosen = useRef<string | null>(selectedId);
  useEffect(() => {
    const instance = map.current;
    if (!instance || !selectedId || selectedId === lastChosen.current) return;
    lastChosen.current = selectedId;
    const s = sources.find(s => s.sourceId === selectedId);
    if (s) instance.flyTo({ center: [s.lon, s.lat], zoom: Math.max(instance.getZoom(), 4.2), speed: 1.35, essential: true });
  }, [selectedId, sources]);
  useEffect(() => { if (expanded) { requestAnimationFrame(() => map.current?.resize()); } }, [expanded]);

  return <div className="geo-map-shell">
    <div ref={node} className="geo-map-canvas" role="application" aria-label="Interactive methane map; drag to pan, scroll to zoom and select a source" />
    <div className="geo-map-topline"><span className="geo-pulse"/> {status === 'ready' ? `${sourceCount.toLocaleString()} source locations` : status === 'loading' ? 'Loading basemap...' : 'Map could not be loaded — check connection or graphics support'}</div>
    {status === 'error' && <div className="geo-map-fallback" role="status"><strong>Interactive map unavailable</strong><span>{mapError || 'You can still inspect the selected case and evidence below.'}</span></div>}
    <div className="geo-map-hint">Drag to pan · scroll to zoom · click a source</div>
    <div className="geo-map-legend"><strong>MAP LEGEND</strong><span><i className="geo-dot geo-teal"/>Detected methane source</span><span><i className="geo-dot geo-orange"/>Selected / high flux</span><span><i className="geo-dot geo-ring"/>Cluster (click to expand)</span></div>
    {coords && <div className="geo-map-coordinates">{coords[0].toFixed(3)}°, {coords[1].toFixed(3)}° · z{coords[2].toFixed(1)}</div>}
  </div>;
}
