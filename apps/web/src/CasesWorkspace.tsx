import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { MarsSource } from './mars';
import { formatCaseLocation, pageForSelectedCase, paginateCases, resolveSelectedCase, type CasePageSize } from './case-table';
import CaseDetailsDialog, { type CaseDetailsTab } from './CaseDetailsDialog';

type Props = {
  sources: MarsSource[];
  selectedSourceId: string;
  countryFilter: string;
  sectorFilter: string;
  regions: string[];
  sectors: string[];
  datasetLabel: string;
  datasetSnapshotId?: string;
  archiveSha256?: string;
  observationChart: (source: MarsSource) => ReactNode;
  onCountryFilterChange: (value: string) => void;
  onSectorFilterChange: (value: string) => void;
  onSelectSource: (sourceId: string) => void;
  onOpenMap: (source: MarsSource) => void;
  onReviewEvidence: () => void;
  historyLoading?: boolean;
  historyError?: string;
  onRetryHistory?: () => void;
};

const tabs: { id: CaseDetailsTab; label: string }[] = [
  { id: 'Summary', label: 'Overview' },
  { id: 'Observations', label: 'Observations' },
  { id: 'Evidence', label: 'Evidence' },
  { id: 'Timeline', label: 'Timeline' },
];

function coordinatesAvailable(source: MarsSource): boolean {
  return Number.isFinite(source.lat) && Number.isFinite(source.lon)
    && Math.abs(source.lat) <= 90 && Math.abs(source.lon) <= 180;
}

function plumeRecordCount(source: MarsSource): number {
  return source.plumeCount ?? source.observations?.length ?? 0;
}

function ObservationList({ source, historyLoading = false, historyError }: { source: MarsSource; historyLoading?: boolean; historyError?: string }) {
  const ordered = [...(source.observations || [])]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);

  return <div className="case-event-list">
    {ordered.map(event => <div className="case-event" key={event.id}>
      <span className="case-event-dot" aria-hidden="true" />
      <div><strong>{event.date.slice(0, 10)}</strong><small>Satellite plume observation · {event.id}</small></div>
      <span>{event.fluxKgHr == null ? 'Flux not reported' : `${event.fluxKgHr.toLocaleString()} kg/h`}</span>
    </div>)}
    {!ordered.length && historyLoading && <p className="case-muted" role="status">Loading this source’s dated observation history…</p>}
    {!ordered.length && historyError && <p className="case-muted" role="alert">History unavailable: {historyError}</p>}
    {!ordered.length && !historyLoading && !historyError && <p className="case-muted">No linked plume observations are recorded for this source in this snapshot.</p>}
  </div>;
}

export default function CasesWorkspace({ sources, selectedSourceId, countryFilter, sectorFilter, regions, sectors, datasetLabel, datasetSnapshotId, archiveSha256, observationChart, onCountryFilterChange, onSectorFilterChange, onSelectSource, onOpenMap, onReviewEvidence, historyLoading = false, historyError, onRetryHistory }: Props) {
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<CasePageSize>(25);
  const [requestedPage, setRequestedPage] = useState(1);
  const [dialogSourceId, setDialogSourceId] = useState<string | null>(null);
  const [dialogInitialTab, setDialogInitialTab] = useState<CaseDetailsTab>('Summary');

  const matchingSources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return sources.filter(source => {
      if (!normalizedQuery) return true;
      const location = formatCaseLocation(source);
      return [source.sourceId, source.name, source.country, source.region, source.sector,
        source.lastObserved, location.area, location.coordinates]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase().includes(normalizedQuery));
    }).sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true, sensitivity: 'base' }));
  }, [query, sources]);
  const page = useMemo(() => paginateCases(matchingSources, requestedPage, pageSize), [matchingSources, requestedPage, pageSize]);
  const selected = resolveSelectedCase(matchingSources, selectedSourceId);
  const dialogSource = sources.find(source => source.sourceId === dialogSourceId) || null;
  const selectedLocation = selected ? formatCaseLocation(selected) : null;

  useEffect(() => {
    if (selected) setRequestedPage(pageForSelectedCase(matchingSources, selected.sourceId, pageSize));
  }, [matchingSources, pageSize, selected?.sourceId]);

  function selectSource(source: MarsSource) {
    onSelectSource(source.sourceId);
  }

  function openDetails(source: MarsSource, tab: CaseDetailsTab = 'Summary') {
    onSelectSource(source.sourceId);
    setDialogInitialTab(tab);
    setDialogSourceId(source.sourceId);
  }

  function openMap(source: MarsSource) {
    if (coordinatesAvailable(source)) onOpenMap(source);
  }

  return <>
    <div className="cases-split-layout">
      <section className="panel cases-directory" aria-label="Searchable methane source records">
        <div className="panel-head"><div><div className="panel-title">Source investigations <span className="case-count-pill">{matchingSources.length.toLocaleString()}</span></div><div className="panel-subtitle">{datasetLabel} · historical records, not live alerts</div></div></div>
        <div className="cases-search-area">
          <label className="cases-table-search"><span className="sr-only">Search cases</span><span aria-hidden="true">⌕</span><input value={query} onChange={event => { setQuery(event.target.value); setRequestedPage(1); }} placeholder="Search source, location, sector or date…" /></label>
          <div className="cases-filter-row">
            <label>Region<select value={countryFilter} onChange={event => { onCountryFilterChange(event.target.value); setRequestedPage(1); }}><option>All regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select></label>
            <label>Sector<select value={sectorFilter} onChange={event => { onSectorFilterChange(event.target.value); setRequestedPage(1); }}><option>All sectors</option>{sectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
          </div>
        </div>
        <p className="cases-directory-note">Location labels and coordinates are shown as recorded. No city or street address is inferred.</p>
        <div className="cases-directory-scroll">
          <table className="cases-directory-table" data-testid="cases-table">
            <thead><tr><th scope="col">Source ID</th><th scope="col">Reported location</th><th scope="col" className="case-plume-heading">Plumes</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
            <tbody>
              {page.items.map(item => {
                const location = formatCaseLocation(item);
                const selectedRow = item.sourceId === selected?.sourceId;
                return <tr key={item.sourceId} className={selectedRow ? 'selected' : undefined} aria-selected={selectedRow}>
                  <td><button className="case-directory-source" onClick={() => selectSource(item)} aria-label={`Select ${item.sourceId} for investigation`} aria-pressed={selectedRow}><strong>{item.sourceId}</strong><small>{item.sector || 'Sector not reported'}</small></button></td>
                  <td className="cases-directory-location"><div><span>{location.area}</span><button disabled={!coordinatesAvailable(item)} onClick={() => openMap(item)} aria-label={`Open ${location.area}, ${location.coordinates} in Map Explorer`}><span aria-hidden="true">⌖</span>{location.coordinates}<span aria-hidden="true">↗</span></button></div></td>
                  <td><span className="case-plume-count">{plumeRecordCount(item).toLocaleString()}</span></td>
                  <td><button className="case-directory-details" onClick={() => openDetails(item)} aria-label={`Open full case for ${item.sourceId}`}>View</button></td>
                </tr>;
              })}
              {!page.items.length && <tr><td colSpan={4}><div className="cases-empty-state"><strong>No matching source records</strong><span>Change the search or region/sector filters to see more historical cases.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="cases-pagination cases-directory-pagination">
          <label>Rows <select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(Number(event.target.value) as CasePageSize); setRequestedPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          <span>{page.firstItem.toLocaleString()}–{page.lastItem.toLocaleString()} of {matchingSources.length.toLocaleString()}</span>
          <div className="cases-page-buttons"><button aria-label="Previous page" disabled={page.currentPage <= 1} onClick={() => setRequestedPage(page.currentPage - 1)}>‹</button><span>Page {page.currentPage.toLocaleString()} / {page.pageCount.toLocaleString()}</span><button aria-label="Next page" disabled={page.currentPage >= page.pageCount} onClick={() => setRequestedPage(page.currentPage + 1)}>›</button></div>
        </div>
      </section>

      <section className="panel case-research-detail" aria-label="Selected source investigation">
        {selected && selectedLocation ? <>
          <div className="case-research-banner"><div className="case-research-kicker">{selected.synthetic ? 'SYNTHETIC DEMONSTRATION' : `SELECTED INVESTIGATION · ${datasetLabel.toUpperCase()}`}</div><div className="case-research-heading"><div><h2>{selected.sourceId}</h2><p>{selectedLocation.area} · {selected.sector || 'Sector not reported'}</p></div><span className="case-status-unverified">Mitigation not independently verified</span></div></div>
          <div className="case-research-tabs" role="group" aria-label="Open case detail section">{tabs.map(tab => <button key={tab.id} onClick={() => openDetails(selected, tab.id)}>{tab.label}</button>)}</div>
          <div className="case-research-body">
            <div className="case-research-insights">
              <div className="case-research-card case-research-summary"><h3>Investigation summary</h3><p>{datasetLabel} links {plumeRecordCount(selected).toLocaleString()} historical plume observation(s) to this source. These records do not independently establish whether a repair or mitigation occurred.</p><div className="case-inline-actions"><button onClick={() => openDetails(selected)}>View full record ↗</button><button disabled={!coordinatesAvailable(selected)} onClick={() => openMap(selected)}>Open on map ↗</button></div></div>
              <div className="case-research-card case-research-facts"><h3>Source details</h3><dl><div><dt>Reported location</dt><dd>{selectedLocation.area}</dd></div><div><dt>Coordinates</dt><dd>{selectedLocation.coordinates}</dd></div><div><dt>Last observed</dt><dd>{selected.lastObserved?.slice(0, 10) || 'Not reported'}</dd></div><div><dt>Notification field</dt><dd>{selected.notified?.trim() || 'Not reported'}</dd></div><div><dt>Feedback field</dt><dd>{selected.feedback?.trim() || 'Not reported'}</dd></div></dl></div>
            </div>
            <div className="case-research-kpis"><div><span>Linked plume records</span><strong>{plumeRecordCount(selected).toLocaleString()}</strong><small>Historical satellite observations</small></div><div><span>Maximum reported flux</span><strong>{selected.maxFluxKgHr == null ? '—' : `${selected.maxFluxKgHr.toLocaleString()} kg/h`}</strong><small>Not a continuous emission rate</small></div><div><span>Evidence references</span><strong>{(selected.evidence.length + (selected.externalEvidence?.length || 0)).toLocaleString()}</strong><small>References available in this source record</small></div></div>
              <div className="case-research-insights"><div className="case-research-card case-research-chart"><h3>Observed methane flux</h3>{observationChart(selected)}</div><div className="case-research-card"><h3>Observation timeline</h3><ObservationList source={selected} historyLoading={historyLoading} historyError={historyError}/></div></div>
          </div>
          <div className="case-research-footer"><button className="primary-btn" onClick={() => { onSelectSource(selected.sourceId); onReviewEvidence(); }}>Examine source evidence →</button><button className="outline-btn" onClick={() => openDetails(selected)}>Open full case →</button></div>
        </> : <div className="cases-empty-state"><strong>No source selected</strong><span>Adjust the filters or search to find a historical source.</span></div>}
      </section>
    </div>
    <p className="cases-source-disclaimer">MARS notification and feedback fields describe source metadata; they do not confirm receipt, repair or reduced emissions. Missing plume observations do not imply zero emissions.</p>
    <CaseDetailsDialog source={dialogSource} observationChart={dialogSource ? observationChart(dialogSource) : null} initialTab={dialogInitialTab} onClose={() => setDialogSourceId(null)} onOpenMap={onOpenMap} onReviewEvidence={() => { if (dialogSource) onSelectSource(dialogSource.sourceId); onReviewEvidence(); }} datasetSnapshotId={datasetSnapshotId} archiveSha256={archiveSha256} historyLoading={historyLoading} historyError={historyError} onRetryHistory={onRetryHistory}/>
  </>;
}
