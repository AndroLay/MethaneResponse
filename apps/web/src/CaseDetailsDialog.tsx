import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { MarsSource } from './mars';
import type { MarsObservation } from './mars';
import { formatCaseLocation, paginateCases } from './case-table';
import SatelliteLocationContext from './SatelliteLocationContext';
import PublisherFootprintCard from './PublisherFootprintCard';
import { orderCasePublisherObservations } from './case-publisher-evidence';

export type CaseDetailsTab = 'Summary' | 'Observations' | 'Evidence' | 'Timeline';

type Props = {
  source: MarsSource | null;
  observationChart: ReactNode;
  initialTab?: CaseDetailsTab;
  onClose: () => void;
  onOpenMap: (source: MarsSource) => void;
  onReviewEvidence: () => void;
  datasetSnapshotId?: string;
  archiveSha256?: string;
  historyLoading?: boolean;
  historyError?: string;
  onRetryHistory?: () => void;
};

function hasUsableCoordinates(source: MarsSource) {
  return Number.isFinite(source.lat) && Number.isFinite(source.lon)
    && Math.abs(source.lat) <= 90 && Math.abs(source.lon) <= 180;
}

export default function CaseDetailsDialog({ source, observationChart, initialTab = 'Summary', onClose, onOpenMap, onReviewEvidence, datasetSnapshotId, archiveSha256, historyLoading = false, historyError, onRetryHistory }: Props) {
  const [activeTab, setActiveTab] = useState<CaseDetailsTab>(initialTab);
  const [observationPageNumber, setObservationPageNumber] = useState(1);
  const [publisherObservationId, setPublisherObservationId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const observations = source?.observations || [];
  const publisherObservations = useMemo(() => orderCasePublisherObservations(observations), [observations]);
  const selectedPublisherObservation: MarsObservation | undefined = publisherObservations.find(item => item.id === publisherObservationId) || publisherObservations[0];
  const observationPage = useMemo(() => paginateCases(observations, observationPageNumber, 25), [observations, observationPageNumber]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (source && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!source && dialog.open) {
      dialog.close();
    }
  }, [source]);

  useEffect(() => {
    setActiveTab(initialTab);
    setObservationPageNumber(1);
    setPublisherObservationId(null);
  }, [source?.sourceId, initialTab]);

  function openSourceMap(selectedSource: MarsSource) {
    onClose();
    onOpenMap(selectedSource);
  }

  return <dialog
    ref={dialogRef}
    className="case-details-dialog"
    aria-labelledby="case-dialog-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    {source && <>
      <header className="case-dialog-header">
        <div><span className="case-dialog-kicker">{source.synthetic ? 'SYNTHETIC DEMONSTRATION' : 'SOURCE CASE · HISTORICAL RECORD'}</span><h2 id="case-dialog-title">{source.sourceId}</h2><p>{formatCaseLocation(source).area} · {formatCaseLocation(source).coordinates}</p></div>
        <button ref={closeButtonRef} className="case-dialog-close" onClick={onClose} aria-label="Close case details">×</button>
      </header>
      <nav className="case-dialog-tabs" role="tablist" aria-label="Case details">
        {(['Summary', 'Observations', 'Evidence', 'Timeline'] as const).map(tab => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>
      <div className="case-dialog-content" role="tabpanel">
        {activeTab === 'Summary' && <>
          <dl className="case-summary-grid">
            <div><dt>Reported location</dt><dd>{formatCaseLocation(source).area}</dd></div>
            <div><dt>Coordinates</dt><dd>{formatCaseLocation(source).coordinates}</dd></div>
            <div><dt>Sector</dt><dd>{source.sector || 'Not reported'}</dd></div>
            <div><dt>Last observed</dt><dd>{source.lastObserved?.slice(0, 10) || 'Not reported'}</dd></div>
            <div><dt>Linked plume records</dt><dd>{(source.plumeCount ?? observations.length).toLocaleString()}</dd></div>
            <div><dt>Highest historical reported flux</dt><dd>{source.maxFluxKgHr == null ? 'Not reported' : `${source.maxFluxKgHr.toLocaleString()} kg/h`}</dd></div>
            <div><dt>MARS notification field</dt><dd>{source.notified?.trim() || 'Not reported'}</dd></div>
            <div><dt>MARS feedback field</dt><dd>{source.feedback?.trim() || 'Not reported'}</dd></div>
          </dl>
          <SatelliteLocationContext source={source} onOpenMap={openSourceMap}/>
          <p className="case-dialog-limit">These are dated MARS records, not live measurements. Notification and feedback fields are publisher metadata; they do not independently confirm receipt, repair, or reduced emissions.</p>
        </>}
        {activeTab === 'Observations' && <>
          {historyLoading ? <div role="status" className="case-history-state">Verifying {source?.plumeCount?.toLocaleString() || 'source'} linked observation records from this versioned snapshot…</div>
            : historyError ? <div role="alert" className="case-history-state case-history-error"><span>{historyError}</span>{onRetryHistory && <button className="outline-btn" onClick={onRetryHistory}>Retry history</button>}</div>
              : <>{observations.length <= 250 ? observationChart : <p className="case-dialog-limit">Chart omitted because this source has {observations.length.toLocaleString()} observation rows. Browse the paginated records below.</p>}
                <div className="cases-table-scroll case-observations-scroll"><table className="workspace-table case-observations-table"><thead><tr><th>Date</th><th>Plume ID</th><th>Estimated flux</th><th>Satellite</th></tr></thead><tbody>{observationPage.items.map(item => <tr key={item.id}><td>{item.date.slice(0, 10)}</td><td>{item.id}</td><td>{item.fluxKgHr == null ? 'Not reported' : `${item.fluxKgHr.toLocaleString()} kg/h${item.uncertaintyKgHr == null ? '' : ` ± ${item.uncertaintyKgHr.toLocaleString()}`}`}</td><td>{item.satellite || 'Not reported'}</td></tr>)}{!observations.length && <tr><td colSpan={4}>No linked plume rows are recorded for this source in the selected snapshot.</td></tr>}</tbody></table></div>
                {observations.length > 25 && <div className="case-detail-pagination"><span>Showing {observationPage.firstItem}–{observationPage.lastItem} of {observations.length.toLocaleString()} observations</span><button disabled={observationPage.currentPage <= 1} onClick={() => setObservationPageNumber(observationPage.currentPage - 1)}>Previous</button><span>Page {observationPage.currentPage} of {observationPage.pageCount}</span><button disabled={observationPage.currentPage >= observationPage.pageCount} onClick={() => setObservationPageNumber(observationPage.currentPage + 1)}>Next</button></div>}
              </>}
        </>}
        {activeTab === 'Evidence' && <div className="case-dialog-evidence-workspace">
          <SatelliteLocationContext source={source} onOpenMap={openSourceMap}/>
          <PublisherFootprintCard
            source={source}
            observations={observations}
            selectedObservationId={selectedPublisherObservation?.id || null}
            onSelectedObservationChange={setPublisherObservationId}
            datasetSnapshotId={datasetSnapshotId}
            archiveSha256={archiveSha256}
            historyLoading={historyLoading}
            historyError={historyError}
            onRetryHistory={onRetryHistory}
          />
          <section className="case-dialog-document-list" aria-label="Linked source documents">
            <h3>Source documents and references</h3>
            {source.externalEvidence?.map(evidence => <div key={evidence.url}><span><strong>{evidence.title}</strong><small>External reference · {evidence.publisher || 'Publisher not specified'} · content not copied</small></span><a href={evidence.url} target="_blank" rel="noreferrer">Open publisher ↗</a></div>)}
            {source.evidence.map(evidence => <div key={evidence.id}><span><strong>{evidence.title}</strong><small>{evidence.kind.replaceAll('_', ' ')} · {evidence.date || 'Date not supplied'}</small></span><a href={evidence.reference} target="_blank" rel="noreferrer">Open source ↗</a></div>)}
            {!source.externalEvidence?.length && !source.evidence.length && <p>No operator or mitigation documents are linked to this source. The publisher geometry verifies only a dated detection record; it cannot establish notification, repair or reduced emissions.</p>}
          </section>
        </div>}
        {activeTab === 'Timeline' && (historyLoading ? <div role="status" className="case-history-state">Verifying source history…</div>
          : historyError ? <div role="alert" className="case-history-state case-history-error"><span>{historyError}</span>{onRetryHistory && <button className="outline-btn" onClick={onRetryHistory}>Retry history</button>}</div>
            : <div className="case-dialog-timeline">{[...observations].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 50).map(item => <div key={item.id}><time>{item.date.slice(0, 10)}</time><span><strong>Satellite observation recorded</strong><small>{item.fluxKgHr == null ? 'Flux not reported' : `${item.fluxKgHr.toLocaleString()} kg/h`} · {item.id}</small></span></div>)}{!observations.length && <p>No dated plume observations are recorded for this source in the selected snapshot.</p>}</div>)}
      </div>
      <footer className="case-dialog-actions"><button className="outline-btn" disabled={!hasUsableCoordinates(source)} onClick={() => openSourceMap(source)}>Open in Map Explorer</button><button className="primary-btn" onClick={() => { onClose(); onReviewEvidence(); }}>Review evidence</button></footer>
    </>}
  </dialog>;
}
