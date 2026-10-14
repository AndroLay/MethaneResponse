export const ESRI_WORLD_IMAGERY_TILE_TEMPLATE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const SATELLITE_CONTEXT_ZOOM_LEVELS = [16, 13, 10, 7] as const;

export type SatelliteContextTile = { z: number; x: number; y: number; url: string; sourcePoint?: { leftPercent: number; topPercent: number } };
export type PublisherFootprintPreview = { path: string; pointCount: number; viewBox: '0 0 768 256' };

/** Normalize the publisher's exact geographic polygon to a shape preview without inventing pixels or emissions. */
export function getPublisherFootprintPreview(coordinates: number[][][][]): PublisherFootprintPreview | null {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
  const allPoints: Array<[number, number]> = [];
  const pathRings: Array<Array<Array<[number, number]>>> = [];
  let longitudeAnchor: number | undefined;
  for (const polygon of coordinates) {
    if (!Array.isArray(polygon)) return null;
    const rings: Array<Array<[number, number]>> = [];
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) return null;
      const points: Array<[number, number]> = [];
      for (const position of ring) {
        if (!Array.isArray(position) || position.length < 2
          || typeof position[0] !== 'number' || !Number.isFinite(position[0])
          || Math.abs(position[0]) > 180 || typeof position[1] !== 'number'
          || !Number.isFinite(position[1]) || Math.abs(position[1]) > 90) return null;
        longitudeAnchor ??= position[0];
        let longitude = position[0];
        while (longitude - longitudeAnchor > 180) longitude -= 360;
        while (longitude - longitudeAnchor < -180) longitude += 360;
        const latitudeRadians = Math.max(-85.05112878, Math.min(85.05112878, position[1])) * Math.PI / 180;
        const y = Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2));
        points.push([longitude * Math.PI / 180, y]);
        allPoints.push([longitude * Math.PI / 180, y]);
      }
      rings.push(points);
    }
    pathRings.push(rings);
  }
  if (!allPoints.length) return null;

  let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
  for (const [x, y] of allPoints) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const width = Math.max(maxX - minX, 1e-9);
  const height = Math.max(maxY - minY, 1e-9);
  const padding = 16;
  const scale = Math.min((768 - padding * 2) / width, (256 - padding * 2) / height);
  const offsetX = (768 - width * scale) / 2;
  const offsetY = (256 - height * scale) / 2;
  const path = pathRings.flatMap(rings => rings.map(ring => ring.map(([x, y], index) => {
    const projectedX = offsetX + (x - minX) * scale;
    const projectedY = 256 - offsetY - (y - minY) * scale;
    return `${index === 0 ? 'M' : 'L'}${projectedX.toFixed(1)},${projectedY.toFixed(1)}`;
  }).join(' ') + ' Z')).join(' ');
  return { path, pointCount: allPoints.length, viewBox: '0 0 768 256' };
}

/** Return the three existing MapLibre imagery tiles centered on a source location; no case image files are stored. */
export function getSatelliteContextTiles(latitude: number, longitude: number, zoom = 16): SatelliteContextTile[] {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];

  const z = Math.max(1, Math.min(20, Math.floor(Number.isFinite(zoom) ? zoom : 16)));
  const tileCount = 2 ** z;
  const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const latitudeRadians = boundedLatitude * Math.PI / 180;
  const fractionalX = ((longitude + 180) / 360) * tileCount;
  const fractionalY = ((1 - Math.asinh(Math.tan(latitudeRadians)) / Math.PI) / 2) * tileCount;
  const centerX = Math.floor(fractionalX);
  const centerY = Math.floor(fractionalY);
  const y = Math.max(0, Math.min(tileCount - 1, centerY));

  return [-1, 0, 1].map(offset => {
    const x = ((centerX + offset) % tileCount + tileCount) % tileCount;
    return {
      z,
      x,
      y,
      url: ESRI_WORLD_IMAGERY_TILE_TEMPLATE.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x)),
      ...(offset === 0 ? { sourcePoint: {
        leftPercent: ((1 + (fractionalX - centerX)) / 3) * 100,
        topPercent: Math.max(0, Math.min(100, (fractionalY - y) * 100)),
      } } : {}),
    };
  });
}

/** Offer progressively broader mosaics so a missing high-resolution tile does not hide usable imagery. */
export function getSatelliteContextViews(latitude: number, longitude: number): SatelliteContextTile[][] {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
  return SATELLITE_CONTEXT_ZOOM_LEVELS.map(zoom => getSatelliteContextTiles(latitude, longitude, zoom));
}

/** Show an explicit loading state until the active view's center tile is usable. */
export function isSatelliteContextLoading(tiles: SatelliteContextTile[], loadedCenterTileUrl: string | null): boolean {
  const centerTile = tiles.find(tile => tile.sourcePoint);
  return Boolean(centerTile && centerTile.url !== loadedCenterTileUrl);
}

/** Move to the next mosaic only for a failure from the currently active zoom. The final index means unavailable. */
export function getNextSatelliteContextViewIndex(currentIndex: number, failedViewIndex: number, totalViews: number): number {
  const count = Number.isFinite(totalViews) ? Math.max(0, Math.floor(totalViews)) : 0;
  const current = Number.isFinite(currentIndex) ? Math.max(0, Math.min(count, Math.floor(currentIndex))) : 0;
  if (current !== failedViewIndex) return current;
  return Math.min(count, current + 1);
}
