import { useEffect, useMemo, useState } from 'react';
import type { MarsObservation, MarsSource } from './mars';
import { getPublisherFootprintPreview } from './map-imagery';
import type { PlumeFootprintFeature } from './plume-geometries';
import { orderCasePublisherObservations } from './case-publisher-evidence';

type Props = {
  source: MarsSource;
  observations: readonly MarsObservation[];
  selectedObservationId: string | null;
  onSelectedObservationChange: (id: string) => void;
  datasetSnapshotId?: string;
  archiveSha256?: string;
  historyLoading?: boolean;
  historyError?: string;
  onRetryHistory?: () => void;
  compact?: boolean;
};

type FootprintState =
  | { status: 'loading'; plumeId: string }
  | { status: 'ready'; plumeId: string; feature: PlumeFootprintFeature; color: string }
  | { status: 'missing'; plumeId: string }
  | { status: 'unavailable'; plumeId?: string; message: string };

const fluxFormatter = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

function formatUtc(value: string) {
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(withZone);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  }).format(date);
}

function optionLabel(observation: MarsObservation) {
  const flux = observation.fluxKgHr === null || !Number.isFinite(observation.fluxKgHr)
    ? 'flux not reported' : `${fluxFormatter.format(observation.fluxKgHr)} kg/h`;
  return `${formatUtc(observation.date)} · ${observation.id} · ${flux}`;
}

export default function PublisherFootprintCard({
  source,
  observations,
  selectedObservationId,
  onSelectedObservationChange,
  datasetSnapshotId,
  archiveSha256,
  historyLoading = false,
  historyError,
  onRetryHistory,
  compact = false,
}: Props) {
  const ordered = useMemo(() => orderCasePublisherObservations(observations), [observations]);
  const selected = ordered.find(item => item.id === selectedObservationId) || ordered[0] || null;
  const [footprintState, setFootprintState] = useState<FootprintState>({
    status: 'unavailable', message: 'No dated observation is available for a footprint lookup.',
  });
  const footprintPreview = footprintState.status === 'ready'
    ? getPublisherFootprintPreview(footprintState.feature.geometry.coordinates as number[][][][])
    : null;

  useEffect(() => {
    if (historyLoading) {
      setFootprintState({ status: 'unavailable', message: 'Verifying this source’s observation history before showing a footprint.' });
      return;
    }
    if (historyError) {
      setFootprintState({ status: 'unavailable', message: 'Source history could not be verified. Retry the history request before inspecting a publisher shape.' });
      return;
    }
    if (!selected) {
      setFootprintState({ status: 'unavailable', message: 'No dated observation is available in this source history.' });
      return;
    }
    if (source.synthetic) {
      setFootprintState({ status: 'unavailable', plumeId: selected.id, message: 'Synthetic examples do not load or display real MARS geometry.' });
      return;
    }
    if (!datasetSnapshotId || !archiveSha256) {
      setFootprintState({ status: 'unavailable', plumeId: selected.id, message: 'The pinned MARS snapshot ID and source archive hash are required before geometry can be shown.' });
      return;
    }

    const controller = new AbortController();
    setFootprintState({ status: 'loading', plumeId: selected.id });
    import('./plume-geometries').then(({ loadEvidencePlumeFootprint, getFluxFootprintColor }) => loadEvidencePlumeFootprint({
      month: selected.date.slice(0, 7),
      plumeId: selected.id,
      sourceId: source.sourceId,
      observedAt: selected.date,
      latitude: selected.lat,
      longitude: selected.lon,
      reportedFluxKgHr: selected.fluxKgHr,
      reportedUncertaintyKgHr: selected.uncertaintyKgHr ?? null,
      expectedSnapshotId: datasetSnapshotId,
      expectedSourceArchiveSha256: archiveSha256,
      signal: controller.signal,
    }).then(feature => ({ feature, color: feature ? getFluxFootprintColor(feature.properties.reportedFluxKgHr) : undefined })))
      .then(({ feature, color }) => {
        if (controller.signal.aborted) return;
        setFootprintState(feature
          ? { status: 'ready', plumeId: selected.id, feature, color: color! }
          : { status: 'missing', plumeId: selected.id });
      })
      .catch(error => {
        if (!controller.signal.aborted) setFootprintState({
          status: 'unavailable', plumeId: selected.id,
          message: error instanceof Error ? error.message : 'The selected publisher footprint is unavailable.',
        });
      });
    return () => controller.abort();
  }, [selected?.id, selected?.date, selected?.fluxKgHr, selected?.uncertaintyKgHr, selected?.lat, selected?.lon,
    source.sourceId, source.synthetic, datasetSnapshotId, archiveSha256, historyLoading, historyError]);

  const status = historyLoading ? 'loading'
    : historyError ? 'unavailable'
      : footprintState.status;

  return <section className={`evidence-footprint-card${compact ? ' compact' : ''}`} aria-live="polite">
    <header className="evidence-footprint-header">
      <div><span>UNEP MARS · SNAPSHOT- AND HASH-VERIFIED</span><strong>Publisher plume geometry</strong></div>
      <span className={`evidence-footprint-state ${status}`}>{historyLoading ? 'LOADING HISTORY' : historyError ? 'HISTORY ERROR' : status === 'ready' ? 'VERIFIED' : status.toUpperCase()}</span>
    </header>

    {ordered.length > 1 && <label className="publisher-footprint-picker">
      <span>OBSERVATION OVERPASS · LATEST FIRST</span>
      <select aria-label={`Choose a dated UNEP MARS observation for ${source.sourceId}`} value={selected?.id || ''} onChange={event => onSelectedObservationChange(event.target.value)}>
        {ordered.map(item => <option key={`${item.id}:${item.date}`} value={item.id}>{optionLabel(item)}</option>)}
      </select>
    </label>}

    {historyLoading && <div className="evidence-footprint-message" role="status"><span className="evidence-footprint-spinner" aria-hidden="true"/><strong>Verifying source observation history</strong><span>The snapshot-bound record must load before its publisher geometry can be shown.</span></div>}
    {!historyLoading && historyError && <div className="evidence-footprint-message" role="alert"><strong>Observation history unavailable</strong><span>{historyError}</span>{onRetryHistory && <button type="button" className="outline-btn" onClick={onRetryHistory}>Retry history</button>}</div>}
    {!historyLoading && !historyError && footprintState.status === 'loading' && <div className="evidence-footprint-message" role="status"><span className="evidence-footprint-spinner" aria-hidden="true"/>Checking {footprintState.plumeId} in its dated MARS geometry shard…</div>}
    {!historyLoading && !historyError && footprintState.status === 'ready' && footprintPreview && <>
      <div className="evidence-footprint-graphic">
        <svg viewBox={footprintPreview.viewBox} role="img" aria-label={`Publisher-supplied MARS geometry for plume record ${footprintState.plumeId}; exact dated outline, not a satellite image or methane concentration surface.`}>
          <path d={footprintPreview.path} fill={footprintState.color} fillOpacity=".3" fillRule="evenodd" stroke={footprintState.color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
        </svg>
      </div>
      <div className="evidence-footprint-facts">
        <span>{formatUtc(footprintState.feature.properties.observedAt)} · {footprintState.plumeId}</span>
        <strong>{footprintState.feature.properties.reportedFluxKgHr === null ? 'Flux not reported' : `${fluxFormatter.format(footprintState.feature.properties.reportedFluxKgHr)} kg/h`}</strong>
        <small>{footprintState.feature.properties.reportedUncertaintyKgHr === null ? 'Uncertainty not supplied' : `± ${fluxFormatter.format(footprintState.feature.properties.reportedUncertaintyKgHr)} kg/h standard deviation`}</small>
      </div>
    </>}
    {!historyLoading && !historyError && footprintState.status === 'missing' && <div className="evidence-footprint-message"><strong>No publisher polygon for this observation</strong><span>The dated MARS observation and source coordinates remain recorded. No footprint is inferred.</span></div>}
    {!historyLoading && !historyError && footprintState.status === 'unavailable' && <div className="evidence-footprint-message"><strong>{source.synthetic ? 'DEMO · no real geometry' : 'Footprint unavailable'}</strong><span>{footprintState.message}</span></div>}
    {!historyLoading && !historyError && footprintState.status === 'ready' && !footprintPreview && <div className="evidence-footprint-message"><strong>Geometry preview unavailable</strong><span>The publisher record verified, but the shape could not be projected safely.</span></div>}
    <p className="evidence-footprint-note">The outline is the publisher-supplied shape for one dated overpass; it is not raw satellite pixels, continuous methane concentration, an operator response, or proof of mitigation.</p>
  </section>;
}
