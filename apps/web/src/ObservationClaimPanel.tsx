import { useEffect, useRef, useState } from 'react';
import { evidenceUtcDay } from '@methane/shared';
import { ObservationQuery, type ObservationCheck } from '@methane/shared/observation-claims';
import type { MarsObservation } from './mars';
import { downloadDecisionFile, type DecisionContext } from './decision-lab';
import { acceptObservationCheck, observationCheckMarkdown, observationPlot, observationStatusLabels, uncertaintyLabels } from './observation-check';

type Props = { context: DecisionContext; observations: MarsObservation[]; disabled: boolean; onHumanReview: () => void; onFollowUp: () => void; onObservations: () => void };
export default function ObservationClaimPanel({ context, observations, disabled, onHumanReview, onFollowUp, onObservations }: Props) {
  const days = observations.map(item => evidenceUtcDay(item.date)).filter((day): day is string => Boolean(day)).sort();
  const [kind, setKind] = useState<ObservationQuery['kind']>('no_linked_detections');
  const [start, setStart] = useState(context.scope?.startDate || days[0] || '');
  const [end, setEnd] = useState(context.scope?.endDate || days.at(-1) || '');
  const [threshold, setThreshold] = useState('1000');
  const [report, setReport] = useState<ObservationCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState(20);
  const [copyMessage, setCopyMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  // A progressive history may arrive after this lazy tool mounts. Never overwrite a user's draft.
  const touched = useRef(Boolean(context.scope));
  useEffect(() => { if (!touched.current && days.length) { setStart(days[0]); setEnd(days.at(-1)!); } }, [days[0], days.at(-1)]);
  function invalidate() { touched.current = true; request.current?.abort(); setReport(null); setError(''); setCopyMessage(''); setBusy(false); setRows(20); }
  const query = ObservationQuery.safeParse({ kind, startDate: start, endDate: end, ...(kind === 'reported_flux_at_most' ? { thresholdKgHr: threshold.trim() ? Number(threshold) : NaN } : {}) });
  const unavailable = disabled || context.synthetic || !context.datasetSnapshotId || !context.archiveSha256 || !context.inputFileSha256;
  async function run() {
    if (!query.success || unavailable) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setReport(null); setCopyMessage(''); setRows(20);
    try {
      const response = await fetch('/api/investigations/observation-check', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: context.sourceId, datasetSnapshotId: context.datasetSnapshotId, inputFileSha256: context.inputFileSha256, query: query.data }) });
      if (!response.ok) throw new Error(response.status === 409 ? 'The dataset snapshot changed. Reload before checking.' : response.status === 429 ? 'Check limit reached. Wait one minute and retry.' : response.status === 403 ? 'This source is outside the public preview.' : 'Observation check unavailable. Check the API and retry.');
      const body = await response.text();
      if (body.length > 8_000_000) throw new Error('Observation analysis exceeds the browser size limit.');
      const checked = await acceptObservationCheck(JSON.parse(body), { ...context, query: query.data });
      if (!controller.signal.aborted) setReport(checked);
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Observation check failed. Retry.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function copyDraft() {
    if (!report) return;
    try { await navigator.clipboard.writeText(observationCheckMarkdown(report)); setCopyMessage('Draft copied. Check source, recipient and scope before sharing.'); }
    catch { setCopyMessage('Clipboard unavailable. Download the follow-up draft instead.'); }
  }
  const plot = report ? observationPlot(report) : null;
  const included = report?.trace.filter(item => item.disposition !== 'outside_window') || [];
  // Show witnesses first; retain all rows in the replay file, including excluded dates.
  const ordered = [...included].sort((a, b) => Number(b.disposition === 'counterexample') - Number(a.disposition === 'counterexample') || a.utcDay.localeCompare(b.utcDay));
  return <section className="panel decision-lab observation-check" aria-label="Observation claim cross-check" aria-busy={busy}>
    <header className="decision-heading"><div><span className="decision-kicker">STATEMENT → RECORD → NEXT CHECK</span><h3>Can the archive contradict this statement?</h3><p>Test a precise observation claim against the original linked MARS records. Every counterexample points to an exact plume ID.</p></div><span className="chip chip-teal">HISTORICAL · NOT LIVE</span></header>
    <p className="observation-scenario"><strong>Analyst-defined scenario.</strong> No statement is attributed to an operator or publisher. This tool checks archive records, not the physical success of a repair.</p>
    <form onSubmit={event => { event.preventDefault(); void run(); }}>
      <label className="observation-question">Statement to check<select value={kind} onChange={event => { invalidate(); setKind(event.target.value as ObservationQuery['kind']); }}>
        <option value="no_linked_detections">No linked detection records in this period</option><option value="reported_flux_at_most">Every reported flux estimate is at most a threshold</option><option value="physical_mitigation">Physical methane mitigation succeeded</option>
      </select></label>
      <div className="observation-fields"><label>Check period start (UTC)<input type="date" value={start} onChange={event => { invalidate(); setStart(event.target.value); }}/></label><label>Check period end (UTC)<input type="date" value={end} onChange={event => { invalidate(); setEnd(event.target.value); }}/></label>
        {kind === 'reported_flux_at_most' && <label>Point-estimate threshold (kg/h)<input type="number" min="0" max="1000000000" step="any" value={threshold} onChange={event => { invalidate(); setThreshold(event.target.value); }}/></label>}
      </div>
      <div className="decision-controls"><button type="submit" className="primary-btn" disabled={busy || unavailable || !query.success}>{busy ? 'Checking pinned records…' : 'Check observation claim'}</button><button type="button" className="outline-btn" disabled={!days.length} onClick={() => { invalidate(); setStart(days[0]); setEnd(days.at(-1)!); }}>Use loaded observation period</button></div>
    </form>
    <p className="decision-context">Source <strong>{context.sourceId}</strong> · inclusive UTC days · {context.datasetSnapshotId || 'No pinned snapshot'}</p>
    {unavailable && <p role="status">Select a server-backed historical source and apply any pending scope draft. Synthetic challenges remain in the reference-coverage tool.</p>}
    {!query.success && !unavailable && <p role="status">Choose valid, ordered dates and a non-negative finite threshold when required.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!report && !busy && <p className="decision-empty">Choose a statement and period, then run the check. It does not save or anchor an audit.</p>}
    {report && <>
      <div className={'decision-result ' + (report.status === 'counterexample_found' ? 'contradicted' : '')}><span>BOUNDED ARCHIVE CHECK · NOT A REPAIR VERDICT</span><strong data-testid="observation-outcome">{observationStatusLabels[report.status]}</strong><p className="observation-statement">“{report.statement}”</p><p>{report.explanation}</p></div>
      <div className="decision-counts"><span><strong>{report.summary.counterexamples}</strong> counterexamples</span><span><strong>{report.summary.inWindow}</strong> records in period</span><span><strong>{report.summary.outsideWindow}</strong> outside period</span><span><strong>{report.summary.missingFlux}</strong> missing flux</span></div>
      {plot && <figure className="observation-plot"><figcaption><strong>Discrete observations · kg/h</strong><span>Points are reported estimates; bars show ± reported standard deviation. No continuous emissions or exceedance probability is inferred.</span></figcaption>
        {!plot.points.length ? <p>No numeric observations in the selected period. Missing flux is not plotted as zero.</p> : <div className="observation-chart-scroll" tabIndex={0} role="region" aria-label="Scrollable discrete observation chart"><svg viewBox="0 0 640 220" role="img" aria-label="Discrete reported flux estimates and standard deviations in the selected UTC period">
          <line x1="50" x2="590" y1="180" y2="180" stroke="#6c8798"/><text x="48" y="16" fill="#b6cbd5" fontSize="11">{Math.ceil(plot.maximum).toLocaleString('en-US')} kg/h</text><text x="25" y="184" fill="#b6cbd5" fontSize="11">0</text>
          {plot.thresholdY !== null && <g><line x1="50" x2="590" y1={plot.thresholdY} y2={plot.thresholdY} stroke="#edd18f" strokeDasharray="5 5"/><text x="588" y={Math.max(30, plot.thresholdY - 6)} textAnchor="end" fill="#edd18f" fontSize="11">Threshold {report.input.query.thresholdKgHr} kg/h</text></g>}
          {plot.points.map(point => <g key={point.id} tabIndex={0} aria-label={point.id + ', ' + point.date + ', ' + point.flux + ' kg/h, reported SD ' + (point.sd ?? 'unavailable') + (point.counterexample ? ', counterexample' : '')}><title>{point.id + ' · ' + point.date + ' · ' + point.flux + ' kg/h · SD ' + (point.sd ?? 'not reported')}</title>{point.sd !== null && <line x1={point.x} x2={point.x} y1={point.highY} y2={point.lowY} stroke="#8da6b8" strokeWidth="2"/>}<circle cx={point.x} cy={point.y} r="5" fill={point.counterexample ? '#f39b9f' : '#73dccc'} stroke="#102b3a" strokeWidth="2"/></g>)}
          <text x="50" y="210" fill="#b6cbd5" fontSize="11">{report.input.query.startDate} UTC</text><text x="590" y="210" textAnchor="end" fill="#b6cbd5" fontSize="11">{report.input.query.endDate} UTC</text>
        </svg></div>}{plot.omitted > 0 && <p>Plot shows the 200 highest point estimates; {plot.omitted} omitted visually. All records remain in the table and replay file.</p>}</figure>}
      <section className="decision-trace" aria-label="Exact observation records"><h4>Inspect the records behind this result</h4><p>Counterexamples appear first. Pink points identify counterexamples to the selected archive statement.</p>
        {!ordered.length ? <p>No linked observations in this period.</p> : <><div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable observation records"><table><thead><tr><th>Plume / original timestamp</th><th>Estimate / reported SD</th><th>Check / context</th></tr></thead><tbody>{ordered.slice(0, rows).map(item => <tr key={item.record.id}><td><code>{item.record.id}</code><small>{item.record.date}<br/>UTC day {item.utcDay}</small></td><td>{item.record.fluxKgHr?.toLocaleString('en-US') ?? 'Not reported'} kg/h<small>SD {item.record.uncertaintyKgHr?.toLocaleString('en-US') ?? 'not reported'} kg/h</small></td><td><strong>{item.disposition.replaceAll('_', ' ')}</strong><small>{uncertaintyLabels[item.uncertaintyRelation]}<br/>{item.record.satellite || 'Satellite not reported'}{item.record.lat !== undefined && item.record.lon !== undefined ? ' · ' + item.record.lat + ', ' + item.record.lon : ''}</small></td></tr>)}</tbody></table></div><p>Showing {Math.min(rows, ordered.length)} of {ordered.length} in-period records.</p>{rows < ordered.length && <button type="button" className="outline-btn" onClick={() => setRows(value => value + 20)}>Show next 20 records</button>}</>}
      </section>
      <section className="decision-next"><h4>Turn the finding into a follow-up</h4><ol>{report.nextChecks.map(item => <li key={item}>{item}</li>)}</ol></section>
      <div className="decision-controls"><button type="button" className="primary-btn" onClick={() => downloadDecisionFile(context.sourceId + '-observation-request.md', observationCheckMarkdown(report), 'text/markdown')}>Download follow-up draft</button><button type="button" className="outline-btn" onClick={() => downloadDecisionFile(context.sourceId + '-observation-check.json', JSON.stringify(report, null, 2), 'application/json')}>Download replay file</button><button type="button" className="outline-btn" onClick={() => void copyDraft()}>Copy follow-up draft</button></div>
      {copyMessage && <p role="status">{copyMessage}</p>}
      <div className="decision-controls"><button type="button" className="outline-btn" onClick={onObservations}>Open source observations</button><button type="button" className="outline-btn" onClick={onHumanReview}>Continue to human assessment</button><button type="button" className="outline-btn" onClick={onFollowUp}>Open follow-up work</button></div>
      <details className="decision-trace"><summary>Scope, dataset attribution and limitations</summary><ul>{[...report.limitations, ...report.input.sourceLimitations].map((item, index) => <li key={index}>{item}</li>)}</ul>{report.input.provenance && <><p>{report.input.provenance.attribution} · {report.input.provenance.license}</p><p>Archive dates: {report.input.archiveStartDate} → {report.input.archiveEndDate}. Retrieved {report.input.provenance.retrievedAt} · <a href={report.input.provenance.catalogUrl} target="_blank" rel="noreferrer">Publisher catalogue ↗</a></p></>}</details>
      <p className="decision-digest">SHA-256 <code>{report.digest}</code><small>Checksum and policy replay verified in this browser. Unsigned; not issuer authentication, a saved audit or a blockchain receipt.</small></p>
    </>}
  </section>;
}
