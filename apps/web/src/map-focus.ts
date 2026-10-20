export type MapFocusRequest = { sourceId: string; requestId: number };
/** MapLibre can dispatch one DOM click to overlapping historical/planned layers. */
export function sourceSelectionClickGuard() {
  const handled = new WeakSet<object>();
  return (event: object) => { if (handled.has(event)) return false; handled.add(event); return true; };
}
/** One hit decision per physical click, in explicit handler priority order. */
export function createLayerClickDispatcher<Event extends { originalEvent: object }, Feature extends { layer: { id: string } }>(
  handlers: readonly { layers: readonly string[]; handle: (event: Event & { features: Feature[] }) => void }[],
) {
  const claim = sourceSelectionClickGuard();
  return (event: Event, features: Feature[]) => {
    for (const handler of handlers) {
      const feature = features.find(hit => handler.layers.includes(hit.layer.id));
      if (!feature) continue;
      if (claim(event.originalEvent)) handler.handle({ ...event, features: [feature] });
      return;
    }
  };
}
export const SOURCE_MARKER_CLUSTER_MAX_ZOOM = 9;
export const SOURCE_INSPECTION_MIN_ZOOM = SOURCE_MARKER_CLUSTER_MAX_ZOOM + 2;
export type SourceMapFocusView = { center: [longitude: number, latitude: number]; zoom: number };

export function getInitialMapFocusRequest(pathname: string, search: string, requestId = 1): MapFocusRequest | null {
  if (pathname.split('/')[2] !== 'map') return null;
  const sourceId = new URLSearchParams(search).get('sourceId')?.trim();
  if (!sourceId || !Number.isSafeInteger(requestId) || requestId < 1) return null;
  return { sourceId, requestId };
}

export function getSourceMapFocusView(source: { lat: number; lon: number }, currentZoom?: number): SourceMapFocusView | null {
  if (!Number.isFinite(source.lat) || !Number.isFinite(source.lon)
    || source.lat < -90 || source.lat > 90 || source.lon < -180 || source.lon > 180) return null;
  const zoom = Number.isFinite(currentZoom)
    ? Math.max(SOURCE_INSPECTION_MIN_ZOOM, currentZoom!)
    : SOURCE_INSPECTION_MIN_ZOOM;
  return { center: [source.lon, source.lat], zoom };
}
