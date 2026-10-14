import { useEffect, useMemo, useState } from 'react';
import type { MarsObservation, MarsSource } from './mars';
import { layoutEvidenceObservations, summarizeEvidenceObservations } from './evidence-observations';
import { getNextSatelliteContextViewIndex, getSatelliteContextViews, isSatelliteContextLoading } from './map-imagery';
import PublisherReferenceNotice from './PublisherReferenceNotice';
import PublisherFootprintCard from './PublisherFootprintCard';

type Props = {
  source: MarsSource;
  observations: MarsObservation[];
  datasetUrl: string;
  datasetSnapshotId?: string;
  datasetRetrievedAt?: string;
  datasetLicense?: string;
  archiveSha256?: string;
  onOpenGlobe: () => void;
  historyLoading?: boolean;
  historyError?: string;
  onRetryHistory?: () => void;
};

const fluxFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

function formatUtc(value: string) {
  const utcValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(utcValue);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  }).format(date);
}

function coordinateText(value: number | undefined, positive: string, negative: string) {
  if (value === undefined || !Number.isFinite(value)) return 'Coordinate unavailable';
  return `${Math.abs(value).toFixed(5)}° ${value < 0 ? negative : positive}`;
}

function formatObservationLabel(observation: MarsObservation) {
  const flux = observation.fluxKgHr === null || !Number.isFinite(observation.fluxKgHr)
    ? 'flux not reported'
    : `${fluxFormatter.format(observation.fluxKgHr)} kilograms per hour`;
  const uncertainty = observation.uncertaintyKgHr !== null && observation.uncertaintyKgHr !== undefined
    && Number.isFinite(observation.uncertaintyKgHr) && observation.uncertaintyKgHr >= 0
    ? `, standard deviation ${fluxFormatter.format(observation.uncertaintyKgHr)} kilograms per hour`
    : '';
  return `${formatUtc(observation.date)}, ${flux}${uncertainty}`;
}

export default function EvidenceObservationPanel({
  source,
  observations,
  datasetUrl,
  datasetSnapshotId,
  datasetRetrievedAt,
  datasetLicense,
  archiveSha256,
  onOpenGlobe,
  historyLoading = false,
  historyError,
  onRetryHistory,
}: Props) {
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [contextViewIndex, setContextViewIndex] = useState(0);
  const [loadedContextTileUrl, setLoadedContextTileUrl] = useState<string | null>(null);
  const chart = useMemo(() => layoutEvidenceObservations(observations), [observations]);
  const summary = useMemo(() => summarizeEvidenceObservations(observations), [observations]);
  const selectedPoint = chart.points.find(point => point.observation.id === selectedObservationId) || chart.points.at(-1) || null;
  const selectedObservation = selectedPoint?.observation as MarsObservation | undefined;
  const contextViews = useMemo(() => source.lat !== undefined && source.lon !== undefined
    ? getSatelliteContextViews(source.lat, source.lon)
    : [], [source.lat, source.lon]);
  const contextTiles = contextViews[contextViewIndex] || [];
  const contextImageFailed = contextViewIndex >= contextViews.length;
  const canShowRealContext = !source.synthetic && contextViews.length > 0;
  const contextImageLoading = canShowRealContext && !contextImageFailed && isSatelliteContextLoading(contextTiles, loadedContextTileUrl);
  const sourcePoint = contextTiles.find(tile => tile.sourcePoint)?.sourcePoint;

  useEffect(() => {
    setSelectedObservationId(null);
    setContextViewIndex(0);
    setLoadedContextTileUrl(null);
  }, [source.sourceId, source.lat, source.lon]);

  const dateTicks = chart.points.length > 0
    ? [...new Map([
      [chart.points[0]!.observation.date.slice(0, 10), chart.points[0]!],
      [chart.points[Math.floor((chart.points.length - 1) / 2)]!.observation.date.slice(0, 10), chart.points[Math.floor((chart.points.length - 1) / 2)]!],
      [chart.points.at(-1)!.observation.date.slice(0, 10), chart.points.at(-1)!],
    ]).values()]
    : [];

  return <div className="evidence-observation-panel">
    <div className="evidence-visuals-grid">
    <div className="evidence-context-map">
      {canShowRealContext && !contextImageFailed && contextTiles.length > 0
        ? <div className="evidence-context-tiles" role="img" aria-label={`Esri World Imagery location context centered on UNEP MARS source ${source.sourceId}; this is not a methane plume observation image.`}>
          {contextTiles.map(tile => <img key={tile.url} src={tile.url} alt="" loading="lazy" decoding="async" onLoad={() => tile.sourcePoint && setLoadedContextTileUrl(tile.url)} onError={() => setContextViewIndex(current => getNextSatelliteContextViewIndex(current, contextViewIndex, contextViews.length))}/>) }
        </div>
        : <div className="evidence-context-empty" role="img" aria-label={source.synthetic ? 'Synthetic example: no real satellite imagery is shown' : 'Satellite context image is unavailable'}>
          <span className="evidence-context-empty-glyph" aria-hidden="true">◉</span>
          <strong>{source.synthetic ? 'DEMO source — no real imagery' : 'Satellite context is unavailable'}</strong>
          <small>{source.synthetic ? 'A fictional fixture must not be presented over a real satellite scene.' : 'The case coordinates and MARS history remain available; the interactive globe offers other basemap choices when available.'}</small>
        </div>}
      {contextImageLoading && <div className="evidence-context-loading" role="status" aria-live="polite"><span aria-hidden="true"/>Loading satellite location imagery…</div>}
      {canShowRealContext && !contextImageFailed && sourcePoint && <span className="evidence-context-marker" style={{ left: `${sourcePoint.leftPercent}%`, top: `${sourcePoint.topPercent}%` }} aria-hidden="true"><i/><b/></span>}
      <div className="evidence-context-overlay">
        <span>LOCATION CONTEXT · ESRI WORLD IMAGERY{contextTiles[0] ? ` · ZOOM ${contextTiles[0].z}` : ''}</span>
        <strong>{source.sourceId}</strong>
        <small>{coordinateText(source.lat, 'N', 'S')} &nbsp;·&nbsp; {coordinateText(source.lon, 'E', 'W')}</small>
      </div>
      <span className="evidence-context-date-note">Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community · capture dates vary · not a MARS plume image</span>
    </div>

    <PublisherFootprintCard
      source={source}
      observations={observations}
      selectedObservationId={selectedObservation?.id || null}
      onSelectedObservationChange={setSelectedObservationId}
      datasetSnapshotId={datasetSnapshotId}
      archiveSha256={archiveSha256}
      historyLoading={historyLoading}
      historyError={historyError}
      onRetryHistory={onRetryHistory}
    />
    </div>

    <div className="evidence-image-actions">
      <button type="button" className="evidence-open-globe" disabled={source.synthetic || source.lat === undefined || !Number.isFinite(source.lat) || source.lon === undefined || !Number.isFinite(source.lon)} onClick={onOpenGlobe}>
        Inspect source on interactive globe <span aria-hidden="true">↗</span>
      </button>
      <a href="https://methanedata.unep.org/map" target="_blank" rel="noopener noreferrer">Open official MARS map ↗</a>
    </div>

    <section className="evidence-timeline" aria-labelledby="evidence-timeline-title">
      <div className="evidence-timeline-head">
        <div>
          <span className="evidence-section-kicker">UNEP MARS HISTORICAL RECORDS</span>
          <h3 id="evidence-timeline-title">Observation timeline</h3>
        </div>
        <span className="evidence-timeline-count">{historyLoading ? `${Number(source.plumeCount || 0).toLocaleString()} records · verifying` : historyError ? 'History unavailable' : `${summary.total.toLocaleString()} records`}</span>
      </div>
      {historyLoading ? <div className="evidence-no-observations" role="status"><strong>Verifying this source’s MARS history…</strong><span>The versioned record bucket is being checked before any observation is shown.</span></div>
        : historyError ? <div className="evidence-no-observations" role="alert"><strong>Source history could not be verified</strong><span>{historyError}</span>{onRetryHistory && <button type="button" className="outline-btn" onClick={onRetryHistory}>Retry history</button>}</div>
        : chart.points.length ? <>
        <div className="evidence-chart-wrap">
          <svg className="evidence-observation-chart" viewBox="0 0 720 220" role="group" aria-label={`Timeline of ${summary.total} discrete MARS observation records; ${summary.quantified} include reported flux. Points are separate satellite overpasses, not continuous monitoring.`}>
            {[0, 1, 2, 3].map(index => {
              const y = chart.plotTop + index * (chart.plotBottom - chart.plotTop) / 3;
              const value = chart.domainMax - index * (chart.domainMax - chart.domainMin) / 3;
              return <g key={index}>
                <line x1="58" x2="702" y1={y} y2={y} className="evidence-chart-grid"/>
                <text x="49" y={y + 3} textAnchor="end" className="evidence-chart-axis-label">{fluxFormatter.format(value)}</text>
              </g>;
            })}
            <text x="12" y="12" className="evidence-chart-unit">kg/h</text>
            <line x1="58" x2="702" y1={chart.unquantifiedY} y2={chart.unquantifiedY} className="evidence-chart-missing-lane"/>
            <text x="58" y={chart.unquantifiedY + 13} className="evidence-chart-missing-label">FLUX NOT REPORTED</text>
            {chart.points.map(point => {
              const selected = point.observation.id === selectedPoint?.observation.id;
              const observation = point.observation as MarsObservation;
              const activate = () => setSelectedObservationId(observation.id);
              return <g
                key={`${observation.id}-${observation.date}`}
                className={`evidence-chart-point ${selected ? 'selected' : ''} ${point.kind}`}
                role="button"
                tabIndex={0}
                aria-label={`${source.sourceId}, ${formatObservationLabel(observation)}, ${observation.satellite || 'satellite not specified'}`}
                aria-pressed={selected}
                onClick={activate}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                  }
                }}
              >
                {point.uncertaintyTop !== null && point.uncertaintyBottom !== null && <>
                  <line x1={point.x} x2={point.x} y1={point.uncertaintyTop} y2={point.uncertaintyBottom} className="evidence-chart-uncertainty"/>
                  <line x1={point.x - 4} x2={point.x + 4} y1={point.uncertaintyTop} y2={point.uncertaintyTop} className="evidence-chart-uncertainty"/>
                  <line x1={point.x - 4} x2={point.x + 4} y1={point.uncertaintyBottom} y2={point.uncertaintyBottom} className="evidence-chart-uncertainty"/>
                </>}
                <circle cx={point.x} cy={point.y} r="11" className="evidence-chart-hit-area"/>
                <circle cx={point.x} cy={point.y} r={selected ? 5.5 : 4} className="evidence-chart-dot"/>
              </g>;
            })}
            {dateTicks.map(point => <text key={point.observation.id} x={point.x} y="137" textAnchor="middle" className="evidence-chart-date">{point.observation.date.slice(0, 10)}</text>)}
          </svg>
        </div>
        <div className="evidence-chart-legend" aria-label="Chart legend">
          <span><i className="legend-measured"/>Reported flux</span>
          <span><i className="legend-uncertainty"/>Reported standard deviation</span>
          <span><i className="legend-missing"/>Flux not provided</span>
        </div>
        <div className="evidence-selected-record" aria-live="polite">
          {selectedObservation ? <>
            <div className="evidence-selected-record-title">
              <span>SELECTED MARS RECORD</span>
              <time>{formatUtc(selectedObservation.date)}</time>
            </div>
            <div className="evidence-selected-record-facts">
              <div><small>Reported source flux</small><strong>{selectedObservation.fluxKgHr === null || !Number.isFinite(selectedObservation.fluxKgHr) ? 'Not reported' : `${fluxFormatter.format(selectedObservation.fluxKgHr)} kg/h`}</strong></div>
              <div><small>Reported standard deviation</small><strong>{selectedObservation.uncertaintyKgHr == null || !Number.isFinite(selectedObservation.uncertaintyKgHr) ? 'Not supplied' : `± ${fluxFormatter.format(selectedObservation.uncertaintyKgHr)} kg/h`}</strong></div>
              <div><small>Satellite / instrument</small><strong>{selectedObservation.satellite || 'Not specified'}</strong></div>
            </div>
            <div className="evidence-product-id"><span>Satellite product ID</span><code title={selectedObservation.tile || 'No product ID reported'}>{selectedObservation.tile || 'Not supplied in this MARS row'}</code></div>
          </> : <p>No valid timestamped observation records are available for this source.</p>}
        </div>
      </> : <div className="evidence-no-observations"><strong>No linked plume observations</strong><span>The source snapshot contains no timestamped observation rows to display.</span></div>}
    </section>

    <div className="evidence-inventory-meta">
      <div className="evidence-inventory-stats">
        {historyLoading || historyError ? <span>{historyLoading ? `Verifying ${Number(source.plumeCount || 0).toLocaleString()} snapshot rows…` : 'Observation totals unavailable until the source history loads.'}</span> : <>
        <span><strong>{summary.quantified}</strong> with reported flux</span>
        <span><strong>{summary.unquantified}</strong> without flux values</span>
        </>}
        <span><strong>{source.externalEvidence?.length || 0}</strong> linked documents</span>
      </div>
      <p>Each point is a separate satellite overpass. A gap or a missing flux value is not zero emissions; a detection alone does not prove notification or mitigation.</p>
      <div className="evidence-source-status">
        <span>Notification metadata <strong>{source.notified || 'Not provided'}</strong></span>
        <span>Response metadata <strong>{source.feedback || 'Not provided'}</strong></span>
        <small>These are published metadata fields, not proof of an operator response or equipment repair.</small>
      </div>
      <div className="evidence-provenance">
        <div><span>Dataset</span><strong>UNEP MARS · {datasetSnapshotId || 'snapshot ID not supplied'}</strong></div>
        {datasetRetrievedAt && <div><span>Retrieved</span><strong>{formatUtc(datasetRetrievedAt)}</strong></div>}
        {datasetLicense && <div><span>License</span><strong>{datasetLicense}</strong></div>}
        {archiveSha256 && <div><span>Archive SHA-256</span><code title={archiveSha256}>{archiveSha256.slice(0, 16)}…</code></div>}
      </div>
      <div className="evidence-research-links">
        <a className="evidence-dataset-link" href={datasetUrl} target="_blank" rel="noopener noreferrer">Open UNEP MARS dataset and terms ↗</a>
        <a className="evidence-dataset-link" href="https://methanedata.unep.org/dict-mars-plumes" target="_blank" rel="noopener noreferrer">Read MARS data dictionary ↗</a>
      </div>
      <PublisherReferenceNotice documentCount={source.externalEvidence?.length || 0}/>
    </div>
  </div>;
}
