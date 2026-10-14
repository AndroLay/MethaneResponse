import { useEffect, useMemo, useState } from 'react';
import type { MarsSource } from './mars';
import { getNextSatelliteContextViewIndex, getSatelliteContextViews, isSatelliteContextLoading } from './map-imagery';

type Props = { source: MarsSource; onOpenMap: (source: MarsSource) => void };

/** Provider imagery is geographic context for a case, never the MARS observation image itself. */
export default function SatelliteLocationContext({ source, onOpenMap }: Props) {
  const [viewIndex, setViewIndex] = useState(0);
  const [loadedCenterTile, setLoadedCenterTile] = useState<string | null>(null);
  const views = useMemo(() => Number.isFinite(source.lat) && Number.isFinite(source.lon)
    ? getSatelliteContextViews(source.lat!, source.lon!)
    : [], [source.lat, source.lon]);
  const tiles = views[viewIndex] || [];
  const failed = viewIndex >= views.length;
  const loading = !source.synthetic && !failed && isSatelliteContextLoading(tiles, loadedCenterTile);
  const centerTile = tiles.find(tile => tile.sourcePoint);

  useEffect(() => {
    setViewIndex(0);
    setLoadedCenterTile(null);
  }, [source.sourceId, source.lat, source.lon]);

  if (source.synthetic) return <div className="case-location-imagery case-location-imagery-empty"><strong>Synthetic case · no real satellite imagery</strong><span>This sample has no real geographic evidence.</span></div>;
  if (!tiles.length || failed) return <div className="case-location-imagery case-location-imagery-empty"><strong>Satellite context unavailable</strong><span>Provider tiles could not be loaded for these coordinates. Source metadata and the globe remain available.</span><button type="button" className="outline-btn" onClick={() => onOpenMap(source)}>Open source in globe ↗</button></div>;

  return <section className="case-location-imagery" aria-label={`Satellite map context for ${source.sourceId}`}>
    <div className="case-location-imagery-grid" role="img" aria-label={`Esri World Imagery context centered on ${source.sourceId}; not a dated methane observation image.`}>
      {tiles.map(tile => <img key={tile.url} src={tile.url} alt="" loading="lazy" decoding="async"
        onLoad={() => { if (tile.sourcePoint) setLoadedCenterTile(tile.url); }}
        onError={() => setViewIndex(current => current === viewIndex
          ? getNextSatelliteContextViewIndex(current, viewIndex, views.length)
          : current)} />)}
      {centerTile?.sourcePoint && <span className="case-location-imagery-marker" style={{ left: `${centerTile.sourcePoint.leftPercent}%`, top: `${centerTile.sourcePoint.topPercent}%` }} aria-hidden="true"><i/></span>}
      {loading && <span className="case-location-imagery-loading" role="status">Loading satellite map tiles…</span>}
      <div className="case-location-imagery-label"><span>ESRI WORLD IMAGERY · ZOOM {tiles[0]!.z}</span><strong>{source.sourceId}</strong><small>{source.lat!.toFixed(5)}°, {source.lon!.toFixed(5)}°</small></div>
    </div>
    <div className="case-location-imagery-footer"><small>Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community · imagery dates vary · location context only, not MARS plume evidence.</small><button type="button" className="text-link" onClick={() => onOpenMap(source)}>Zoom to source in globe ↗</button></div>
  </section>;
}
