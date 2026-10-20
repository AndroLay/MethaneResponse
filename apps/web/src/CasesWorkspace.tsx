import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { MarsSource } from './mars';
import type { AuditScope, ClaimType } from '@methane/shared';
import { useQuery } from '@tanstack/react-query';
import CaseWorkPanel from './CaseWorkPanel';
import { confirmDraftNavigation } from './use-session-draft';
import { CASE_WORK_CHANGED, listCaseWork, workStatusLabels, type CaseWork } from './case-work';
import { getTeamSession, subscribeTeamSession, TEAM_WORK_CHANGED } from './team-session';
import { formatCaseLocation, pageForSelectedCase, paginateCases, resolveSelectedCase, type CasePageSize } from './case-table';
import CaseDetailsDialog, { type CaseDetailsTab } from './CaseDetailsDialog';
const InvestigationPlanner = lazy(() => import('./InvestigationPlanner'));
import { getActivePlan } from './plan-session';

type Props = {
  sources: MarsSource[];
  plannerSources?: MarsSource[];
  selectedSourceId: string;
  countryFilter: string;
  sectorFilter: string;
  regions: string[];
  sectors: string[];
  datasetLabel: string;
  datasetSnapshotId?: string;
  archiveSha256?: string;
  inputFileSha256?: string;
  observationChart: (source: MarsSource) => ReactNode;
  onCountryFilterChange: (value: string) => void;
  onSectorFilterChange: (value: string) => void;
  onSelectSource: (sourceId: string) => void | boolean;
  onOpenMap: (source: MarsSource) => void;
  onReviewEvidence: () => void;
  onPlannerOpenSource: (sourceId: string, target: 'case' | 'map' | 'audit') => void | boolean;
  activeWork?: { sourceId: string; workId: string; claimType: ClaimType; scope?: AuditScope };
  onResumeWork: (claim: ClaimType, scope?: AuditScope, sourceId?: string, workId?: string) => void;
  workReady?: boolean;
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

export default function CasesWorkspace({ sources, plannerSources = sources, selectedSourceId, countryFilter, sectorFilter, regions, sectors, datasetLabel, datasetSnapshotId, archiveSha256, inputFileSha256, observationChart, onCountryFilterChange, onSectorFilterChange, onSelectSource, onOpenMap, onReviewEvidence, onPlannerOpenSource, onResumeWork, activeWork, workReady = true, historyLoading = false, historyError, onRetryHistory }: Props) {
  const [plannerOpen, setPlannerOpen] = useState(() => Boolean(getActivePlan()));
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState<CasePageSize>(25);
  const [requestedPage, setRequestedPage] = useState(1);
  const [dialogSourceId, setDialogSourceId] = useState<string | null>(null);
  const [dialogInitialTab, setDialogInitialTab] = useState<CaseDetailsTab>('Summary');
  const [workStatus, setWorkStatus] = useState('all');
  const [sort, setSort] = useState('source');
  const [workVersion, setWorkVersion] = useState(0);
  const teamSession = useSyncExternalStore(subscribeTeamSession, getTeamSession);
  const [sharedQueue, setSharedQueue] = useState<{ key: string; records: CaseWork[]; error: string; loading: boolean }>({ key: '', records: [], error: '', loading: false });
  const synthetic = sources[0]?.synthetic || false;
  const workContext = { sourceId: selectedSourceId, datasetSnapshotId: synthetic ? 'DEMO' : datasetSnapshotId, archiveSha256, synthetic };
  const sharedQueueKey = JSON.stringify([teamSession?.reviewerId, datasetSnapshotId, synthetic ? undefined : archiveSha256, synthetic]);
  useEffect(() => {
    let active = true;
    if (!teamSession || !workContext.datasetSnapshotId || (!synthetic && !archiveSha256)) return;
    setSharedQueue(previous => ({ key: sharedQueueKey, records: previous.key === sharedQueueKey ? previous.records : [], error: '', loading: true }));
    void import('./shared-work-api').then(api => api.listSharedWork({ sourceId: selectedSourceId, synthetic, datasetSnapshotId: workContext.datasetSnapshotId!, ...(!synthetic ? { archiveSha256 } : {}) })).then(works => {
      if (active) setSharedQueue({ key: sharedQueueKey, records: works.map(work => ({ ...work, ...work.context, version: 2 })), error: '', loading: false });
    }).catch(() => { if (active) setSharedQueue({ key: sharedQueueKey, records: [], error: 'Shared queue could not be refreshed. Check team access and retry.', loading: false }); });
    return () => { active = false; };
  }, [teamSession, sharedQueueKey, workVersion]);
  const workRecords = useMemo(() => teamSession ? sharedQueue.key === sharedQueueKey ? sharedQueue.records : [] : listCaseWork(workContext), [teamSession, sharedQueue, sharedQueueKey, datasetSnapshotId, archiveSha256, synthetic, workVersion]);
  const workBySource = useMemo(() => new Map([...workRecords].reverse().map(item => [item.sourceId, item])), [workRecords]);
  useEffect(() => {
    const changed = () => setWorkVersion(value => value + 1);
    window.addEventListener('storage', changed); window.addEventListener(CASE_WORK_CHANGED, changed); window.addEventListener(TEAM_WORK_CHANGED, changed);
    return () => { window.removeEventListener('storage', changed); window.removeEventListener(CASE_WORK_CHANGED, changed); window.removeEventListener(TEAM_WORK_CHANGED, changed); };
  }, []);
  const priorities = useQuery({
    queryKey: ['case-priorities', datasetSnapshotId, archiveSha256],
    enabled: !synthetic && Boolean(datasetSnapshotId && archiveSha256),
    queryFn: async ({ signal }) => {
      const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/intelligence/rankings`, { signal });
      if (!response.ok) throw new Error('Investigation priorities unavailable');
      const payload = await response.json() as { snapshot: { datasetSnapshotId?: string; upstreamArchiveSha256?: string }; rankings: { sourceId: string; priorityScore: number; priorityBand: string }[] };
      if (payload.snapshot.datasetSnapshotId !== datasetSnapshotId || payload.snapshot.upstreamArchiveSha256 !== archiveSha256) throw new Error('Priority snapshot does not match this dataset');
      return new Map(payload.rankings.map(item => [item.sourceId, item]));
    }, retry: false,
  });

  const matchingSources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return sources.filter(source => {
      const work = workBySource.get(source.sourceId);
      if (workStatus === 'unsaved' && work) return false;
      if (workStatus !== 'all' && workStatus !== 'unsaved' && !workRecords.some(item => item.sourceId === source.sourceId && item.status === workStatus)) return false;
      if (!normalizedQuery) return true;
      const location = formatCaseLocation(source);
      return [source.sourceId, source.name, source.country, source.region, source.sector,
        source.lastObserved, location.area, location.coordinates]
        .filter(Boolean)
        .some(value => String(value).toLocaleLowerCase().includes(normalizedQuery));
    }).sort((left, right) => (sort === 'priority' ? (priorities.data?.get(right.sourceId)?.priorityScore ?? -1) - (priorities.data?.get(left.sourceId)?.priorityScore ?? -1) : 0)
      || left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true, sensitivity: 'base' }));
  }, [query, sources, workBySource, workRecords, workStatus, sort, priorities.data]);
  const page = useMemo(() => paginateCases(matchingSources, requestedPage, pageSize), [matchingSources, requestedPage, pageSize]);
  const selected = resolveSelectedCase(matchingSources, selectedSourceId);
  const dialogSource = plannerSources.find(source => source.sourceId === dialogSourceId) || null;
  const selectedLocation = selected ? formatCaseLocation(selected) : null;
  const pageAnchor = useRef('');

  useEffect(() => {
    const anchor = JSON.stringify([selected?.sourceId, pageSize, datasetSnapshotId, archiveSha256]);
    // Keep external selection handoffs visible; sorting the queue should open its first page.
    if (pageAnchor.current === anchor) return;
    pageAnchor.current = anchor;
    if (selected) setRequestedPage(pageForSelectedCase(matchingSources, selected.sourceId, pageSize));
  }, [matchingSources, pageSize, selected?.sourceId, datasetSnapshotId, archiveSha256]);

  function selectSource(source: MarsSource) {
    onSelectSource(source.sourceId);
  }

  function openDetails(source: MarsSource, tab: CaseDetailsTab = 'Summary') {
    if (onSelectSource(source.sourceId) === false) return;
    setDialogInitialTab(tab);
    setDialogSourceId(source.sourceId);
  }

  function openMap(source: MarsSource) {
    if (coordinatesAvailable(source)) onOpenMap(source);
  }

  return <>
    {!synthetic && datasetSnapshotId && archiveSha256 && inputFileSha256 && <>
      <div className="panel planner-launch" style={{ padding: 18, marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}><div><strong>Plan your team’s investigation capacity</strong><p>Compare source selections, country coverage and sensitivity under the same constraints.</p></div><button type="button" className="outline-btn" aria-expanded={plannerOpen} onClick={() => setPlannerOpen(value => !value)}>{plannerOpen ? 'Close investigation planner' : 'Plan investigation capacity'}</button></div>
      {plannerOpen && <Suspense fallback={<p role="status">Loading the investigation planner…</p>}><InvestigationPlanner
        datasetSnapshotId={datasetSnapshotId} archiveSha256={archiveSha256} inputFileSha256={inputFileSha256}
        country={countryFilter} sector={sectorFilter} countries={regions} sectors={sectors}
        onCountry={value => { if (confirmDraftNavigation()) onCountryFilterChange(value); }} onSector={value => { if (confirmDraftNavigation()) onSectorFilterChange(value); }}
        onOpenSource={(sourceId, target) => {
          if (onPlannerOpenSource(sourceId, target) === false) return;
          if (target === 'case') {
            setQuery('');
            setWorkStatus('all');
            setRequestedPage(1);
            setDialogInitialTab('Summary');
            setDialogSourceId(sourceId);
          }
        }}
      /></Suspense>}
    </>}
    <div className="cases-split-layout">
      <section className="panel cases-directory" aria-label="Searchable methane source records">
        <div className="panel-head"><div><div className="panel-title">Source investigations <span className="case-count-pill">{matchingSources.length.toLocaleString()}</span></div><div className="panel-subtitle">{datasetLabel} · historical records, not live alerts</div></div></div>
        <div className="cases-search-area">
          <label className="cases-table-search"><span className="sr-only">Search cases</span><span aria-hidden="true">⌕</span><input value={query} onChange={event => { if (!confirmDraftNavigation()) return; setQuery(event.target.value); setRequestedPage(1); }} placeholder="Search source, location, sector or date…" /></label>
          <div className="cases-filter-row">
            <label>Region<select value={countryFilter} onChange={event => { if (!confirmDraftNavigation()) return; onCountryFilterChange(event.target.value); setRequestedPage(1); }}><option>All regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select></label>
            <label>Sector<select value={sectorFilter} onChange={event => { if (!confirmDraftNavigation()) return; onSectorFilterChange(event.target.value); setRequestedPage(1); }}><option>All sectors</option>{sectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
          </div>
          <div className="cases-filter-row">
            <label>Work queue<select aria-label="Filter by work status" value={workStatus} onChange={event => { if (!confirmDraftNavigation()) return; setWorkStatus(event.target.value); setRequestedPage(1); }}><option value="all">All sources</option><option value="unsaved">No saved work</option>{Object.entries(workStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Sort<select aria-label="Case queue order" value={sort} onChange={event => { setSort(event.target.value); setRequestedPage(1); }}><option value="source">Source ID</option><option value="priority" disabled={!priorities.data}>Investigation priority</option></select></label>
          </div>
        </div>
        <p className="cases-directory-note">{teamSession ? `Shared team queue for ${teamSession.reviewerId}.` : 'Work status is saved in this browser.'} Priority is a reference-based heuristic, not a probability or proof of mitigation. {priorities.isError ? 'Priorities are unavailable for this dataset.' : priorities.isLoading ? 'Loading priorities…' : ''} Location labels and coordinates are shown as recorded.</p>
        {teamSession && <div className="case-tool-actions"><button className="outline-btn" type="button" disabled={sharedQueue.loading} onClick={() => setWorkVersion(value => value + 1)}>Refresh shared investigations</button>{sharedQueue.loading && <p role="status">Loading shared queue…</p>}{sharedQueue.error && <p role="alert">{sharedQueue.error}</p>}</div>}
        <div className="cases-directory-scroll">
          <table className="cases-directory-table" data-testid="cases-table">
            <thead><tr><th scope="col">Source ID</th><th scope="col">Reported location</th><th scope="col" className="case-plume-heading">Plumes</th><th scope="col"><span className="sr-only">Details</span></th></tr></thead>
            <tbody>
              {page.items.map(item => {
                const location = formatCaseLocation(item);
                const selectedRow = item.sourceId === selected?.sourceId;
                return <tr key={item.sourceId} className={selectedRow ? 'selected' : undefined} aria-selected={selectedRow}>
                  <td><button className="case-directory-source" onClick={() => selectSource(item)} aria-label={`Select ${item.sourceId} for investigation`} aria-pressed={selectedRow}><strong>{item.sourceId}</strong><small>{item.sector || 'Sector not reported'}</small><small>{workRecords.filter(work => work.sourceId === item.sourceId).length} saved investigations</small><small>{[...new Set(workRecords.filter(work => work.sourceId === item.sourceId).map(work => workStatusLabels[work.status]))].join(' · ') || 'No saved work'}</small>{priorities.data?.has(item.sourceId) && <small>Priority {priorities.data.get(item.sourceId)!.priorityScore}/80 · {priorities.data.get(item.sourceId)!.priorityBand}</small>}</button></td>
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
            {workReady ? <CaseWorkPanel key={JSON.stringify({ ...workContext, sourceId: selected.sourceId })} context={{ ...workContext, sourceId: selected.sourceId, ...(activeWork?.sourceId === selected.sourceId ? { workId: activeWork.workId } : {}) }} claimType={activeWork?.sourceId === selected.sourceId ? activeWork.claimType : workBySource.get(selected.sourceId)?.claimType || 'mitigation_confirmed'} scope={activeWork?.sourceId === selected.sourceId ? activeWork.scope : workBySource.get(selected.sourceId)?.scope} onResume={(claim, scope, sourceId, workId) => onResumeWork(claim, scope, sourceId || selected.sourceId, workId)}/> : <p role="status">Load the selected dataset before saving investigation work.</p>}
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
