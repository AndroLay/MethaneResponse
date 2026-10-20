import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { PlannerParameters, plannerCanonical, plannerDisposition, plannerScores, plannerStrategies, plannerStrategyLabels,
  type InvestigationPortfolio, type PlannerStrategy } from '@methane/shared/investigation-planner';
import { acceptInvestigationPortfolio, dispositionLabels, downloadPlannerReplay } from './investigation-planner';
import './investigation-planner.css';
import { activatePlan, getActivePlan, matchingActivePlan, subscribeActivePlan } from './plan-session';
import { confirmDraftNavigation } from './use-session-draft';
import PlanComparisonPanel from './PlanComparisonPanel';
import PlanReviewPanel from './PlanReviewPanel';
import SnapshotChangePanel from './SnapshotChangePanel';

type Props = {
  datasetSnapshotId: string; inputFileSha256: string; archiveSha256: string;
  country: string; sector: string; countries: string[]; sectors: string[];
  onCountry: (value: string) => void; onSector: (value: string) => void;
  onOpenSource: (sourceId: string, target: 'case' | 'map' | 'audit') => void;
};
const scenarioLabels = {
  capacity_minus_one: 'One fewer investigation slot', capacity_plus_one: 'One more investigation slot',
  recurrence_minus_twenty: 'Recurrence weight −20 points', recurrence_plus_twenty: 'Recurrence weight +20 points', country_cap_plus_one: 'One more slot per country',
};
export default function InvestigationPlanner(props: Props) {
  const active = useSyncExternalStore(subscribeActivePlan, getActivePlan);
  const initial = useRef(matchingActivePlan(active, props.datasetSnapshotId, props.archiveSha256, props.inputFileSha256)).current;
  const [capacity, setCapacity] = useState(String(initial?.report.input.parameters.capacity || 10)), [countryCap, setCountryCap] = useState(String(initial?.report.input.parameters.maxPerCountry || 2)), [weight, setWeight] = useState(initial?.report.input.parameters.recurrenceWeight ?? 50);
  const initialScopeMatches = initial && initial.report.input.dataset.inputFileSha256 === props.inputFileSha256
    && plannerCanonical(initial.report.input.parameters.countries) === plannerCanonical(props.country === 'All regions' ? [] : [props.country])
    && plannerCanonical(initial.report.input.parameters.sectors) === plannerCanonical(props.sector === 'All sectors' ? [] : [props.sector]);
  const [report, setReport] = useState<InvestigationPortfolio | null>(initialScopeMatches ? initial.report : null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<PlannerStrategy>(initial?.strategy || 'weighted'), [show, setShow] = useState('selected'), [page, setPage] = useState(1);
  const [activationMessage, setActivationMessage] = useState('');
  const [reviewPlanId, setReviewPlanId] = useState('team-investigation-plan');
  const [activating, setActivating] = useState(false);
  const activationGeneration = useRef(0);
  const parameters = useMemo(() => ({ capacity: Number(capacity), maxPerCountry: Number(countryCap), recurrenceWeight: weight,
    countries: props.country === 'All regions' ? [] : [props.country], sectors: props.sector === 'All sectors' ? [] : [props.sector] }), [capacity, countryCap, weight, props.country, props.sector]);
  const context = { datasetSnapshotId: props.datasetSnapshotId, inputFileSha256: props.inputFileSha256, archiveSha256: props.archiveSha256, parameters };
  const key = plannerCanonical({ ...context, capacity, countryCap });
  const latest = useRef(key); latest.current = key;
  const selectionKey = key + ':' + strategy;
  const latestSelection = useRef(selectionKey); latestSelection.current = selectionKey;
  const request = useRef<AbortController | null>(null);
  const mountedKey = useRef(key);
  useEffect(() => { if (mountedKey.current === key) return; mountedKey.current = key; request.current?.abort(); setReport(null); setError(''); setLoading(false); setPage(1); setActivationMessage(''); }, [key]);
  useEffect(() => () => { request.current?.abort(); activationGeneration.current++; }, []);
  const scores = useMemo(() => report ? plannerScores(report.input.candidates, report.input.parameters) : new Map(), [report]);
  const selectedPlan = report?.portfolios.find(item => item.strategy === strategy);
  const rows = useMemo(() => {
    if (!report || !selectedPlan) return [];
    const selected = new Map(selectedPlan.selectedIds.map((id, index) => [id, index]));
    return report.input.candidates.filter(row => show === 'all' || (show === 'selected' ? selected.has(row.sourceId) : !selected.has(row.sourceId)))
      .sort((a, b) => (selected.get(a.sourceId) ?? Infinity) - (selected.get(b.sourceId) ?? Infinity) || a.sourceId.localeCompare(b.sourceId));
  }, [report, selectedPlan, show]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  async function run() {
    if (!PlannerParameters.safeParse(parameters).success) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const started = key; setLoading(true); setError(''); setReport(null);
    try {
      const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/investigations/portfolios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ datasetSnapshotId: context.datasetSnapshotId, inputFileSha256: context.inputFileSha256, parameters }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'Dataset changed. Reload the page before planning.' : response.status === 429 ? 'Too many plans. Wait one minute and retry.' : 'Planning data unavailable. Retry when the API and pinned archive are available.');
      const text = await response.text();
      if (text.length > 4_000_000) throw new Error('Planning response exceeds the local safety limit.');
      const accepted = await acceptInvestigationPortfolio(JSON.parse(text), context);
      if (!controller.signal.aborted && latest.current === started) { setReport(accepted); setPage(1); }
    } catch (caught) {
      if (!controller.signal.aborted && latest.current === started) setError(caught instanceof Error ? caught.message : 'Plan could not be verified. Retry.');
    } finally { if (!controller.signal.aborted && latest.current === started) setLoading(false); }
  }
  async function usePlan() {
    if (!report || !confirmDraftNavigation()) return;
    const started = ++activationGeneration.current, chosenKey = selectionKey; setActivating(true);
    try {
      const checked = await acceptInvestigationPortfolio(report, context);
      if (latestSelection.current !== chosenKey || started !== activationGeneration.current) return;
      const current = getActivePlan();
      const before = current?.report.portfolios.find(p => p.strategy === current.strategy)?.selectedIds || [];
      const after = checked.portfolios.find(p => p.strategy === strategy)!.selectedIds;
      activatePlan(checked, strategy);
      setActivationMessage(`${after.length} planned sources activated · ${after.filter(id => !before.includes(id)).length} added · ${before.filter(id => !after.includes(id)).length} removed. Open Map Explorer to see the same queue and cyan rings.`);
    } catch { if (started === activationGeneration.current) setError('Plan changed or replay failed. Recompute before activation.'); }
    finally { if (started === activationGeneration.current) setActivating(false); }
  }
  return <section className="panel investigation-planner" aria-label="Investigation capacity planner">
    <header className="planner-heading"><div><span className="planner-kicker">FROM SOURCE RANKING TO TEAM ALLOCATION</span><h2>What can your team investigate next?</h2><p>Set your capacity. Compare historical indicators with broader coverage. Inspect the tradeoffs before opening an investigation.</p></div><span className="planner-badge">HISTORICAL · DECISION SUPPORT</span></header>
    <ol className="planner-steps" aria-label="Planning workflow"><li>1 · Set capacity & scope</li><li>2 · Compare four plans</li><li>3 · Inspect sources & evidence</li></ol>
    <div className="planner-form">
      <label>Investigation slots<input aria-label="Investigation slots" type="number" min="1" max="50" value={capacity} onChange={event => setCapacity(event.target.value)}/></label>
      <label>Maximum per country<input aria-label="Maximum investigations per country" type="number" min="1" max="50" value={countryCap} onChange={event => setCountryCap(event.target.value)}/></label>
      <label>Country scope<select aria-label="Country scope" value={props.country} onChange={event => props.onCountry(event.target.value)}><option>All regions</option>{props.countries.map(country => <option key={country}>{country}</option>)}</select></label>
      <label>Sector scope<select aria-label="Sector scope" value={props.sector} onChange={event => props.onSector(event.target.value)}><option>All sectors</option>{props.sectors.map(sector => <option key={sector}>{sector}</option>)}</select></label>
      <label className="planner-weight">Historical indicator blend<span>Recurrence {weight}% · magnitude {100 - weight}%</span><input aria-label="Recurrence weight" type="range" min="0" max="100" step="10" value={weight} onChange={event => setWeight(Number(event.target.value))}/></label>
    </div>
    <p className="planner-note">One slot assumes one source investigation; actual effort varies. These are analyst choices, not predicted repairs or avoided emissions. All archived dates are used, independently of the map’s period filter. Changing scope recalculates relative indicator percentiles.</p>
    <button className="primary-btn" type="button" disabled={loading || !PlannerParameters.safeParse(parameters).success} onClick={() => void run()}>{loading ? 'Comparing & verifying plans…' : 'Compare investigation plans'}</button>
    {!PlannerParameters.safeParse(parameters).success && <p role="alert">Use whole numbers from 1 to 50 for slots and country limits.</p>}
    {loading && <p role="status">Reading the pinned historical snapshot and replaying the allocation policy locally.</p>}
    {error && <p role="alert" className="planner-error">{error}</p>}
    {!report && !loading && !error && <div className="planner-empty">Your plan will appear here. Nothing is assigned, published or sent by this tool.</div>}
    {report && selectedPlan && <>
      <div className="planner-summary" data-testid="planner-summary"><strong>{report.eligibleCount.toLocaleString('en-US')} eligible sources</strong><span>{report.input.candidates.length.toLocaleString('en-US')} catalog records · {report.input.dataset.archiveStartDate} – {report.input.dataset.archiveEndDate} UTC</span><span>{report.input.dataset.scope === 'public_preview' ? 'Restricted public preview: only three curated sources are considered.' : 'Full pinned source snapshot; country / sector scope applied above.'}</span></div>
      <div className="planner-comparisons" role="group" aria-label="Alternative investigation plans">{report.portfolios.map(plan => <button key={plan.strategy} type="button" aria-pressed={strategy === plan.strategy} onClick={() => { setStrategy(plan.strategy); setPage(1); }}>
        <span>{plannerStrategyLabels[plan.strategy]}</span><strong>{plan.selectedIds.length}<small> / {report.input.parameters.capacity} slots</small></strong><span>{plan.countryCount} countries · {plan.sectorCount} sectors</span><small>Median source flux {plan.medianSourceFluxKgHr === null ? 'unknown' : plan.medianSourceFluxKgHr.toLocaleString('en-US') + ' kg/h'}<br/>Median observed dates {plan.medianObservedDates ?? 'unknown'}</small><small>{plan.overlapWithWeighted} shared with weighted plan · {plan.unfilledSlots} unfilled</small>
      </button>)}</div>
      <p className="planner-note">Same eligible pool and country cap for every plan. More coverage or a higher indicator score does not establish a better climate outcome. Baselines are application-defined; they are not UNEP’s official Top 50.</p>
      <div className="plan-activation"><div><strong>Move this selection into your investigation workspace</strong><p>Activate explicitly. Later parameter edits leave your current queue unchanged until you activate a replacement.</p></div><button type="button" className="primary-btn" disabled={activating} onClick={() => void usePlan()}>Use this plan on map & queue</button></div>
      {activationMessage && <p role="status">{activationMessage}</p>}
      {selectedPlan.unfilledSlots > 0 && <p role="status">{selectedPlan.unfilledSlots} slots remain unfilled because the eligible pool and country quotas do not allow more selections. Relax constraints to compare another plan.</p>}
      <div className="planner-results-head"><div><h3>{plannerStrategyLabels[strategy]}</h3><p>{selectedPlan.missingFluxSelected} selected sources lack numeric flux. Missing values remain unknown. Opening a source clears directory/map filters to keep the selected source visible.</p></div><label>Inspect rows<select aria-label="Planner rows to inspect" value={show} onChange={event => { setShow(event.target.value); setPage(1); }}><option value="selected">Selected sources</option><option value="excluded">Excluded sources</option><option value="all">All source records</option></select></label></div>
      <div className="planner-table-wrap" role="region" aria-label="Planned and excluded source records" tabIndex={0}><table><thead><tr><th>Source / location</th><th>Historical indicators</th><th>Allocation reason</th><th>Investigate</th></tr></thead><tbody>{rows.slice((page - 1) * 20, page * 20).map(row => {
        const points = scores.get(row.sourceId), position = selectedPlan.selectedIds.indexOf(row.sourceId);
        return <tr key={row.sourceId}><td><strong>{position >= 0 ? `${position + 1}. ` : ''}{row.sourceId}</strong><span>{row.country || 'Country not reported'}</span><small>{row.sector || 'Sector not reported'}</small></td><td><span>{row.distinctDates} observed dates · {row.observationCount} records</span><span>{row.medianFluxKgHr === null ? 'Flux not reported' : `Median ${row.medianFluxKgHr.toLocaleString('en-US')} kg/h`}</span><small>Median reported SD {row.medianUncertaintyKgHr === null ? 'not reported' : row.medianUncertaintyKgHr.toLocaleString('en-US') + ' kg/h'} · {row.missingFluxCount} records without flux</small><small>Latest {row.lastObserved || 'not reported'} UTC</small></td><td><span>{dispositionLabels[plannerDisposition(report, row.sourceId, strategy)]}</span>{points && <small>Magnitude {points.magnitudePoints.toFixed(1)} · recurrence {points.recurrencePoints.toFixed(1)} · weighted {points.score.toFixed(1)} ranking points</small>}{position >= 0 && <small>{strategy === 'breadth' ? 'Greedy new-country / new-sector coverage; score and source ID break ties.' : strategy === 'flux' ? 'Descending numeric median flux; missing flux follows reported values.' : strategy === 'recurrence' ? 'Descending distinct observed dates; source ID breaks ties.' : 'Descending blended historical percentiles; source ID breaks ties.'}</small>}</td><td><div className="planner-row-actions"><button type="button" onClick={() => props.onOpenSource(row.sourceId, 'case')} aria-label={`Inspect case ${row.sourceId}`}>Case</button><button type="button" onClick={() => props.onOpenSource(row.sourceId, 'map')} aria-label={`Map ${row.sourceId}`}>Map ↗</button><button type="button" onClick={() => props.onOpenSource(row.sourceId, 'audit')} aria-label={`Evidence ${row.sourceId}`}>Evidence →</button></div></td></tr>;
      })}{!rows.length && <tr><td colSpan={4}>No sources in this view. Check the scope, quotas or row selection.</td></tr>}</tbody></table></div>
      <div className="planner-pagination"><span>Showing {rows.length ? (page - 1) * 20 + 1 : 0}–{Math.min(page * 20, rows.length)} of {rows.length.toLocaleString('en-US')}</span><div><button type="button" disabled={page <= 1} aria-label="Previous planner page" onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {pageCount}</span><button type="button" disabled={page >= pageCount} aria-label="Next planner page" onClick={() => setPage(value => value + 1)}>Next</button></div></div>
      <details className="planner-details"><summary>How stable is this allocation?</summary><p>Each comparison reruns the weighted strategy on this same snapshot, changing one analyst assumption. This is not a confidence interval.</p><ul>{report.sensitivity.map(item => <li key={item.key}><strong>{scenarioLabels[item.key]}</strong><span>{item.selectedCount} selected · {item.addedIds.length} added · {item.removedIds.length} removed</span><small>Added: {item.addedIds.join(', ') || 'none'}<br/>Removed: {item.removedIds.join(', ') || 'none'}</small></li>)}</ul></details>
      <details className="planner-details"><summary>Method, provenance & limitations</summary><p>Weighted score: {(100 - report.input.parameters.recurrenceWeight) / 100} × median-flux percentile + {report.input.parameters.recurrenceWeight / 100} × distinct-date percentile. Tied values share their midrank; one numeric value has percentile 100. Null flux receives no magnitude points, not a zero measurement.</p><ul>{report.limitations.map(item => <li key={item}>{item}</li>)}</ul><p>{report.input.dataset.provenance?.attribution}</p><dl><dt>Snapshot</dt><dd>{report.input.dataset.datasetSnapshotId}</dd><dt>Archive SHA-256</dt><dd>{report.input.dataset.archiveSha256}</dd><dt>Normalized input SHA-256</dt><dd>{report.input.dataset.inputFileSha256}</dd><dt>Intelligence SHA-256</dt><dd>{report.input.dataset.intelligenceSha256}</dd><dt>Policy / replay digest</dt><dd>{report.policyVersion}<br/>{report.digest}</dd></dl></details>
      <div className="planner-export"><button type="button" className="outline-btn" onClick={() => downloadPlannerReplay(report)}>Download reproducible plan</button><span>Unsigned analysis · not a saved audit or blockchain receipt. Full candidate projection included; no private team notes.</span></div>
    </>}
    <SnapshotChangePanel report={report} strategy={strategy} onOpenSource={props.onOpenSource}/>
    <PlanComparisonPanel report={report} strategy={strategy} onOpenSource={props.onOpenSource}/>
    <PlanReviewPanel key={`${report?.digest || 'none'}:${strategy}`} report={report} strategy={strategy} planId={reviewPlanId} onPlanId={setReviewPlanId}/>
  </section>;
}
