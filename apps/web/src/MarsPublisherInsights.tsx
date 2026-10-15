import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  formatResponseCount,
  getCountryResponseHistory,
  loadMarsPublisherIndicators,
  toResponseRateHistoryLabel,
  wasInPreviousTop50,
  type MarsPublisherIndicators,
  type MarsResponseRateRow,
  type MarsResponseRateSnapshot,
  type MarsTop50Row,
} from './mars-publisher-indicators';
import './MarsPublisherInsights.css';

type Props = { availableMapSourceIds: readonly string[]; onOpenSource: (sourceId: string) => void };
type View = 'top50' | 'responses';
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function formatMonth(period: string) {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : period;
}

function slicePage<T>(rows: readonly T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pageCount };
}

function Pagination({ page, pageCount, pageSize, rowCount, onPage, onPageSize }: {
  page: number; pageCount: number; pageSize: number; rowCount: number;
  onPage: (value: number) => void; onPageSize: (value: number) => void;
}) {
  const start = rowCount ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, rowCount);
  return <div className="mpi-pagination">
    <span>{start.toLocaleString()}–{end.toLocaleString()} of {rowCount.toLocaleString()}</span>
    <label>Rows <select aria-label="Rows per page" value={pageSize} onChange={event => { onPageSize(Number(event.target.value)); onPage(1); }}>
      {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
    </select></label>
    <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span aria-live="polite">Page {page} of {pageCount}</span>
    <button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
  </div>;
}

function SummaryCards({ data }: { data: MarsPublisherIndicators }) {
  const top = data.top50Snapshots.at(-1);
  const responses = data.responseRateSnapshots.at(-1);
  return <div className="mpi-summary-grid">
    <div><span>MONTHLY TOP 50</span><strong>{data.top50Snapshots.length}</strong><small>publisher releases · {data.top50Snapshots.reduce((sum, item) => sum + item.rowCount, 0)} source rows</small></div>
    <div><span>COUNTRY RESPONSE HISTORY</span><strong>{data.responseRateSnapshots.length}</strong><small>rolling periods · latest ends {responses?.periodEnd || 'not available'}</small></div>
    <div><span>LATEST TOP 50 RELEASE</span><strong>{top?.period || '—'}</strong><small>{top?.matchedSourceCount ?? 0} exact IDs in active map snapshot</small></div>
    <div><span>ACTIVE MARS SNAPSHOT</span><strong>{data.marsSnapshotId}</strong><small>{data.marsSourceCount.toLocaleString()} source records · historical</small></div>
  </div>;
}

function fluxText(value: number | null, deviation: number | null) {
  if (value === null) return 'Not reported';
  return deviation === null ? `${number.format(value)} t/h` : `${number.format(value)} ± ${number.format(deviation)} t/h`;
}

function ResponseHistory({ snapshots, country }: { snapshots: readonly MarsResponseRateSnapshot[]; country: string }) {
  const history = getCountryResponseHistory(snapshots, country);
  const width = 640, height = 168, left = 40, right = 12, top = 12, bottom = 32;
  const x = (i: number) => history.length <= 1 ? (left + width - right) / 2 : left + i * (width - left - right) / (history.length - 1);
  const y = (rate: number) => top + (100 - rate) * (height - top - bottom) / 100;
  const segments: string[] = [];
  let segment: string[] = [];
  for (const [index, point] of history.entries()) {
    if (point.responseRatePercent === null) {
      if (segment.length > 1) segments.push(segment.join(' '));
      segment = [];
    } else segment.push(`${x(index)},${y(point.responseRatePercent)}`);
  }
  if (segment.length > 1) segments.push(segment.join(' '));
  const numeric = history.filter(item => item.responseRatePercent !== null);
  return <div className="mpi-history">
    <div className="mpi-history-heading"><strong>{country || 'Country history'}</strong><span>Rolling publisher periods</span></div>
    {!country ? <p className="mpi-empty-small">Choose a country to inspect its retained history.</p> : numeric.length === 0
      ? <p className="mpi-empty-small">No numeric response rate is published for this country in the retained periods.</p>
      : <svg className="mpi-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Country response-rate history for ${country}; rolling publisher periods, not mitigation outcomes.`}>
        <title>{country} reported response rate by period</title><desc>{history.map(toResponseRateHistoryLabel).join('. ')}</desc>
        {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1={left} y1={y(value)} x2={width - right} y2={y(value)} className="mpi-chart-gridline"/><text x={left - 7} y={y(value) + 4} textAnchor="end" className="mpi-chart-label">{value}%</text></g>)}
        {segments.map((points, index) => <polyline key={index} points={points} className="mpi-chart-line"/>)}
        {history.map((point, index) => point.responseRatePercent === null
          ? <circle key={point.periodStart} cx={x(index)} cy={height - bottom + 5} r="4" className="mpi-chart-missing"><title>{toResponseRateHistoryLabel(point)}</title></circle>
          : <circle key={point.periodStart} cx={x(index)} cy={y(point.responseRatePercent)} r="4.5" className="mpi-chart-point"><title>{toResponseRateHistoryLabel(point)}</title></circle>)}
        {history.map((point, index) => <text key={`period-${point.periodStart}`} x={x(index)} y={height - 8} textAnchor="middle" className="mpi-chart-label">{point.periodStart.slice(0, 7)}</text>)}
      </svg>}
    <details className="mpi-history-details"><summary>Show all reporting periods and denominators ({history.length})</summary>
      <div className="mpi-history-list">{history.map(point => <div key={point.periodStart}><span>{point.periodStart} – {point.periodEnd}</span><strong>{point.responseRatePercent === null ? 'Rate not reported' : `${point.responseRatePercent}%`}</strong><small>{formatResponseCount(point.notifiedWithFeedbackCount)} with feedback / {formatResponseCount(point.notifiedSourceCount)} notified</small></div>)}</div>
    </details>
  </div>;
}

function ResponseRow({ row, selected, onSelect }: { row: MarsResponseRateRow; selected: boolean; onSelect: () => void }) {
  return <tr className={selected ? 'selected' : ''}>
    <th scope="row"><strong>{row.country}</strong></th>
    <td><strong>{formatResponseCount(row.notifiedWithFeedbackCount)} / {formatResponseCount(row.notifiedSourceCount)}</strong><small>with feedback / notified</small></td>
    <td><strong>{row.publishedResponseRatePercent === null ? 'Not reported' : `${number.format(row.publishedResponseRatePercent)}%`}</strong><small>publisher-reported · period above</small></td>
    <td><button type="button" className="mpi-map-button" aria-label={`View response history for ${row.country}`} onClick={onSelect}>{selected ? 'Selected' : 'View history'}</button></td>
  </tr>;
}

export default function MarsPublisherInsights({ availableMapSourceIds, onOpenSource }: Props) {
  const query = useQuery({ queryKey: ['mars-publisher-indicators', 'local-v1'], queryFn: ({ signal }) => loadMarsPublisherIndicators(fetch, signal), staleTime: Infinity, retry: 1 });
  const data = query.data;
  const [view, setView] = useState<View>('top50');
  const [topPeriod, setTopPeriod] = useState('');
  const [topSearch, setTopSearch] = useState('');
  const [topPage, setTopPage] = useState(1);
  const [topPageSize, setTopPageSize] = useState(10);
  const [responsePeriod, setResponsePeriod] = useState('');
  const [responseSearch, setResponseSearch] = useState('');
  const [responsePage, setResponsePage] = useState(1);
  const [responsePageSize, setResponsePageSize] = useState(10);
  const [selectedCountry, setSelectedCountry] = useState('');
  const mapIds = useMemo(() => new Set(availableMapSourceIds), [availableMapSourceIds]);
  const topSnapshot = data?.top50Snapshots.find(item => item.period === topPeriod) || data?.top50Snapshots.at(-1);
  const topIndex = topSnapshot && data ? data.top50Snapshots.findIndex(item => item.period === topSnapshot.period) : -1;
  const priorRows = topIndex > 0 ? data?.top50Snapshots[topIndex - 1].rows || [] : [];
  const filteredTop = useMemo(() => (topSnapshot?.rows || []).filter(row => `${row.sourceId} ${row.country} ${row.sector || ''} ${row.potentialSourceType || ''}`.toLowerCase().includes(topSearch.toLowerCase())), [topSnapshot?.rows, topSearch]);
  const visibleTop = slicePage(filteredTop, topPage, topPageSize);
  const responseSnapshot = data?.responseRateSnapshots.find(item => `${item.periodStart}:${item.periodEnd}` === responsePeriod) || data?.responseRateSnapshots.at(-1);
  const countryNames = useMemo(() => [...new Set(data?.responseRateSnapshots.flatMap(snapshot => snapshot.rows.map(row => row.country)) || [])].sort(), [data]);
  const country = selectedCountry || countryNames[0] || '';
  const filteredResponses = useMemo(() => (responseSnapshot?.rows || []).filter(row => row.country.toLowerCase().includes(responseSearch.toLowerCase())), [responseSnapshot?.rows, responseSearch]);
  const visibleResponses = slicePage(filteredResponses, responsePage, responsePageSize);

  if (query.isPending) return <section className="panel mpi-state" role="status"><span className="mpi-loader"/> Verifying the pinned UNEP MARS publisher-indicator files…</section>;
  if (query.isError || !data) return <section className="panel mpi-state mpi-state-error" role="alert"><strong>Publisher indicators unavailable</strong><span>{query.error instanceof Error ? query.error.message : 'The local snapshot could not be verified.'}</span><button type="button" className="outline-btn" onClick={() => void query.refetch()}>Retry local snapshot check</button></section>;

  return <section className="mpi-workspace" aria-label="UNEP MARS publisher indicators">
    <SummaryCards data={data}/>
    <div className="mpi-period-banner"><span className="mpi-archive-dot"/><span><strong>DATED PUBLISHER SNAPSHOTS · NOT LIVE</strong><small>Retrieved {data.retrievedAt.replace('T', ' ').replace('Z', ' UTC')} · dataset snapshot {data.marsSnapshotId}</small></span><span className="mpi-license">{data.license}</span></div>
    <div className="mpi-tabs" role="tablist" aria-label="MARS indicator datasets"><button type="button" role="tab" aria-selected={view === 'top50'} className={view === 'top50' ? 'active' : ''} onClick={() => setView('top50')}>Monthly Top 50 <span>{data.top50Snapshots.length}</span></button><button type="button" role="tab" aria-selected={view === 'responses'} className={view === 'responses' ? 'active' : ''} onClick={() => setView('responses')}>Country response history <span>{data.responseRateSnapshots.length}</span></button></div>

    {view === 'top50' && <section className="panel mpi-panel" role="tabpanel" aria-label="Monthly Top 50 sources">
      <header className="mpi-panel-heading"><div><span>UNEP PUBLISHER LIST · SOURCE IDS PRESERVED</span><h2>Top 50 methane sources</h2><p>Select a release to compare membership with the preceding retained publisher month.</p></div><label>Release month<select aria-label="Top 50 publisher release month" value={topSnapshot?.period || ''} onChange={event => { setTopPeriod(event.target.value); setTopPage(1); }}>{data.top50Snapshots.map(item => <option key={item.period} value={item.period}>{formatMonth(item.period)} · {item.rowCount} sources</option>)}</select></label></header>
      <div className="mpi-facts-strip"><span><strong>{topSnapshot?.rowCount ?? 0}</strong> listed source locations</span><span><strong>{topSnapshot?.matchedSourceCount ?? 0}</strong> exact IDs in active map snapshot</span><span><strong>{topSnapshot?.unmatchedSourceIds.length ?? 0}</strong> absent from active map snapshot</span></div>
      <div className="mpi-method-note">UNEP describes the list as flux-ranked among sources meeting its persistency/uncertainty criteria, using the latest six months of observations. The downloadable CSV has no explicit rank field; MethaneResponse compares monthly membership and does not assign ranks from row order. Seasonal and satellite-observation availability affect inclusion.</div>
      <div className="mpi-toolbar"><label className="mpi-search">Search source, country or sector<input value={topSearch} onChange={event => { setTopSearch(event.target.value); setTopPage(1); }} placeholder="e.g. MEX_S_003, Mexico, oil and gas"/></label><span>{filteredTop.length} matches</span></div>
      {!!topSnapshot?.unmatchedSourceIds.length && <details className="mpi-unmatched"><summary>Source IDs absent from the active map snapshot ({topSnapshot.unmatchedSourceIds.length})</summary><p>{topSnapshot.unmatchedSourceIds.join(', ')}</p></details>}
      <p className="mpi-mobile-table-hint" id="mpi-top-table-scroll-hint">Swipe or scroll the table horizontally to view all columns</p>
      <div className="mpi-table-wrap" role="region" tabIndex={0} aria-label="Monthly UNEP MARS Top 50 source table" aria-describedby="mpi-top-table-scroll-hint"><table className="mpi-table"><thead><tr><th scope="col">Previous release</th><th scope="col">Source</th><th scope="col">Sector / type</th><th scope="col">Six-month average flux</th><th scope="col">Annual persistency</th><th scope="col">Last detection</th><th scope="col">Map</th></tr></thead><tbody>{visibleTop.rows.map(row => {
        const wasPreviouslyListed = wasInPreviousTop50(row.sourceId, priorRows);
        const membership = topIndex <= 0 ? 'Earliest retained month' : wasPreviouslyListed ? 'Also listed before' : 'Not in prior month';
        return <tr key={row.sourceId}><td><strong className="mpi-membership">{topIndex <= 0 ? 'First retained release' : wasPreviouslyListed ? 'Repeated listing' : 'Not listed before'}</strong><small className="mpi-rank-change">{membership}</small></td>
          <th scope="row"><strong>{row.sourceId}</strong><small>{row.country}</small></th><td>{row.sector || 'Not reported'}<small>{row.potentialSourceType || 'Source type not reported'}</small></td>
          <td><strong>{fluxText(row.averageHalfYearFluxRateTHr, row.averageHalfYearFluxStdDevTHr)}</strong><small>t/h · six-month publisher average ± standard deviation</small></td>
          <td><strong>{row.annualPersistencyCategory ? row.annualPersistencyCategory.replace(/\b\w/g, letter => letter.toUpperCase()) : 'Not reported'}</strong><small>{row.annualEmissionPersistency === null ? 'Numeric value unavailable' : `${number.format(row.annualEmissionPersistency)} · publisher-reported`}</small></td>
          <td>{row.lastPlumeDate || 'Not reported'}<small>{row.plumesDetectedSince2024 === null ? 'Plume count not reported' : `${row.plumesDetectedSince2024.toLocaleString()} records since 2024`}</small></td>
          <td>{mapIds.has(row.sourceId) ? <button type="button" className="mpi-map-button" aria-label={`Open ${row.sourceId} in Map Explorer`} onClick={() => onOpenSource(row.sourceId)}>Explore ↗</button> : <span className="mpi-map-unavailable" title="No exact source ID match in the active map snapshot">Unavailable</span>}</td></tr>;
      })}</tbody></table>{!filteredTop.length && <p className="mpi-empty-small">No publisher source matches this search.</p>}</div>
      <Pagination page={visibleTop.page} pageCount={visibleTop.pageCount} pageSize={topPageSize} rowCount={filteredTop.length} onPage={setTopPage} onPageSize={setTopPageSize}/>
      <p className="mpi-caveat">This is the publisher’s dated Top 50 list, not a MethaneResponse score. Six-month flux is an averaged publisher estimate in t/h, not a current reading; the standard deviation is shown only as published. Notification and feedback metadata do not prove receipt, repair, or methane reduction.</p>
    </section>}

    {view === 'responses' && <section className="panel mpi-panel" role="tabpanel" aria-label="Country response history">
      <header className="mpi-panel-heading"><div><span>AGGREGATE ADMINISTRATIVE ENGAGEMENT</span><h2>MARS response rates by country</h2><p>The numerator is sources with feedback; the denominator is sources notified within the rolling period.</p></div><label>Reporting period<select aria-label="Country response reporting period" value={`${responseSnapshot?.periodStart}:${responseSnapshot?.periodEnd}`} onChange={event => { setResponsePeriod(event.target.value); setResponsePage(1); }}>{data.responseRateSnapshots.map(item => <option key={`${item.periodStart}:${item.periodEnd}`} value={`${item.periodStart}:${item.periodEnd}`}>{item.periodStart} – {item.periodEnd} · {item.rowCount} countries</option>)}</select></label></header>
      <div className="mpi-facts-strip"><span><strong>{responseSnapshot?.rowCount ?? 0}</strong> countries in this release</span><span><strong>{countryNames.length}</strong> distinct country names retained</span><span><strong>{responseSnapshot?.periodStart || '—'} → {responseSnapshot?.periodEnd || '—'}</strong> reporting window</span></div>
      <div className="mpi-response-layout"><div className="mpi-response-table-card"><div className="mpi-toolbar"><label className="mpi-search">Search country<input value={responseSearch} onChange={event => { setResponseSearch(event.target.value); setResponsePage(1); }} placeholder="Country name"/></label><span>{filteredResponses.length} matches</span></div>
        <p className="mpi-mobile-table-hint" id="mpi-response-table-scroll-hint">Swipe or scroll the table horizontally to view all columns</p>
        <div className="mpi-table-wrap" role="region" tabIndex={0} aria-label="Country MARS response-rate table" aria-describedby="mpi-response-table-scroll-hint"><table className="mpi-table mpi-response-table"><thead><tr><th scope="col">Country</th><th scope="col">With feedback / notified</th><th scope="col">Published response rate</th><th scope="col">History</th></tr></thead><tbody>{visibleResponses.rows.map(row => <ResponseRow key={row.country} row={row} selected={row.country === country} onSelect={() => setSelectedCountry(row.country)}/>)}</tbody></table>{!filteredResponses.length && <p className="mpi-empty-small">No country matches this search.</p>}</div>
        <Pagination page={visibleResponses.page} pageCount={visibleResponses.pageCount} pageSize={responsePageSize} rowCount={filteredResponses.length} onPage={setResponsePage} onPageSize={setResponsePageSize}/></div>
        <ResponseHistory snapshots={data.responseRateSnapshots} country={country}/></div>
      <p className="mpi-caveat">This metric describes aggregate administrative engagement for the displayed country and period. It does not identify which source was repaired, establish physical mitigation, or prove that emissions fell. A missing rate is unavailable, not zero.</p>
    </section>}

    <section className="mpi-mitigation-reference" role="note" aria-label="Official MARS mitigation snapshot reference"><div><span>OFFICIAL MITIGATION SNAPSHOT · LINK ONLY</span><strong>{data.mitigationSnapshotReference.title}</strong><small>Reporting period {data.mitigationSnapshotReference.period} · {data.mitigationSnapshotReference.license}</small></div><a href={data.mitigationSnapshotReference.publisherUrl} target="_blank" rel="noopener noreferrer">Open on UNEP WeDocs ↗</a><p>The report remains on the publisher’s site. MethaneResponse stores its title, date, source link and item-level license only; the report was not copied or machine-extracted. Any mitigation claim still needs attributable evidence and human review in its own case.</p></section>
    <section className="mpi-provenance" aria-label="Publisher data provenance"><div><strong>Publisher provenance</strong><span>UNEP MARS catalog and dictionaries · retrieved {data.retrievedAt}</span></div><a href="https://methanedata.unep.org/download-dataset" target="_blank" rel="noreferrer">Dataset catalog ↗</a><a href="https://methanedata.unep.org/dict-top-emitters" target="_blank" rel="noreferrer">Top 50 dictionary ↗</a><a href="https://methanedata.unep.org/dict-mars-response-rates" target="_blank" rel="noreferrer">Response-rate dictionary ↗</a><a href="/data/mars-publisher-indicators.manifest.json" target="_blank" rel="noreferrer">Integrity manifest ↗</a></section>
    <p className="mpi-attribution">{data.attribution} · {data.license}. These are local dated files, not live telemetry. The archive SHA-256 values and normalized file hash are recorded with the release.</p>
  </section>;
}
