import { useEffect, useRef, useState } from 'react';
import { transitionIntegrityValid, type SnapshotTransitionPage, type RecordChange, type SnapshotTransitionRequest } from '@methane/shared/snapshot-transition';
import type { InvestigationPortfolio, PlannerStrategy } from '@methane/shared/investigation-planner';
import { acceptSnapshotTransitionPage, changeValue } from './snapshot-change-watch';

type Props = { report: InvestigationPortfolio | null; strategy: PlannerStrategy; onOpenSource: (id: string, target: 'case' | 'map' | 'audit') => void };
const api = (path: string) => `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/investigations/snapshot-transition${path}`;
const fieldName = (name: string) => ({ fluxKgHr: 'Point estimate (kg/h)', uncertaintyKgHr: 'Reported SD (kg/h)', date: 'Observation timestamp (UTC)', lastUpdate: 'Publisher last update', sourceId: 'Original source ID', notified: 'Notification metadata', feedback: 'Feedback metadata' } as Record<string, string>)[name] || name;
function FieldChanges({ change }: { change: RecordChange }) {
  return <div className="snapshot-fields" role="region" aria-label={`Changed fields ${change.id}`} tabIndex={0}><table><thead><tr><th>Field</th><th>Earlier release</th><th>Later release</th></tr></thead><tbody>{change.changedFields.map(field => <tr key={field}><th scope="row">{fieldName(field)}</th><td>{change.before ? changeValue(change.before[field]) : 'record absent'}</td><td>{change.after ? changeValue(change.after[field]) : 'record absent'}</td></tr>)}</tbody></table></div>;
}
function ObservationChanges({ rows, sourceId }: { rows: RecordChange[]; sourceId: string }) {
  const [offset, setOffset] = useState(0);
  return <><p>{rows.length} normalized plume record changes linked to this source on either side.</p>
    {rows.slice(offset, offset + 5).map(row => <details className="snapshot-observation" key={row.id}><summary><strong>{row.kind}</strong> · {row.id}<span>{changeValue(row.before?.date || row.after?.date)} UTC · inspect exact fields</span></summary><FieldChanges change={row}/></details>)}
    {rows.length > 5 && <div className="planner-pagination"><span>Records {offset + 1}–{Math.min(offset + 5, rows.length)} of {rows.length}</span><div><button type="button" disabled={offset === 0} aria-label={`Previous record changes ${sourceId}`} onClick={() => setOffset(n => Math.max(0, n - 5))}>Previous records</button><button type="button" disabled={offset + 5 >= rows.length} aria-label={`Next record changes ${sourceId}`} onClick={() => setOffset(n => n + 5)}>Next records</button></div></div>}
  </>;
}
async function readResponse(response: Response) {
  const body = await response.text();
  if (body.length > 16_000_000) throw new Error('Change response is too large for the browser. Use the offline verifier.');
  const value = JSON.parse(body);
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'Historical change comparison failed. Retry explicitly.');
  return value;
}
export default function SnapshotChangePanel({ report, strategy, onOpenSource }: Props) {
  const [mode, setMode] = useState<'selected' | 'all'>('selected');
  const [result, setResult] = useState<SnapshotTransitionPage | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null), generation = useRef(0);
  const key = `${report?.digest || ''}:${strategy}`, latest = useRef(key); latest.current = key;
  useEffect(() => { generation.current++; controller.current?.abort(); setResult(null); setBusy(false); setError(''); }, [key]);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);
  function request(offset: number): SnapshotTransitionRequest {
    return { datasetSnapshotId: report!.input.dataset.datasetSnapshotId, inputFileSha256: report!.input.dataset.inputFileSha256,
      sourceIds: mode === 'selected' ? report!.portfolios.find(row => row.strategy === strategy)!.selectedIds : [], offset, limit: 20 };
  }
  async function load(offset = 0) {
    if (!report) return;
    controller.current?.abort(); const signal = new AbortController(); controller.current = signal;
    const started = ++generation.current, startedKey = key, body = request(offset);
    setBusy(true); setError(''); setResult(null);
    try {
      // An empty portfolio must not be interpreted as an unrestricted catalog request.
      if (mode === 'selected' && !body.sourceIds.length) throw new Error('This allocation has no selected sources. Choose all changed sources to inspect the historical transition.');
      const raw = await readResponse(await fetch(api(''), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: signal.signal }));
      const value = acceptSnapshotTransitionPage(raw, body, report.input.dataset.archiveSha256);
      if (generation.current === started && latest.current === startedKey) setResult(value);
    } catch (reason) { if (generation.current === started && latest.current === startedKey) setError(reason instanceof Error ? reason.message : 'Historical transition unavailable.'); }
    finally { if (generation.current === started && latest.current === startedKey) setBusy(false); }
  }
  async function download() {
    if (!result || !report) return;
    const started = ++generation.current, startedKey = key; setBusy(true); setError('');
    controller.current?.abort(); const signal = new AbortController(); controller.current = signal;
    try {
      const raw = await readResponse(await fetch(api('/export'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request(0)), signal: signal.signal }));
      if (!await transitionIntegrityValid(raw) || raw.digest !== result.digest || raw.after.inputFileSha256 !== report.input.dataset.inputFileSha256) throw new Error('Export differs from the inspected historical transition.');
      if (generation.current !== started || latest.current !== startedKey) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(raw)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'methane-historical-snapshot-changes.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { if (generation.current === started && latest.current === startedKey) setError(reason instanceof Error ? reason.message : 'Change export failed.'); }
    finally { if (generation.current === started && latest.current === startedKey) setBusy(false); }
  }
  return <details className="planner-details plan-operations snapshot-watch" open aria-label="Historical snapshot change watch"><summary>Which investigations need another look?</summary>
    <p>Compare two complete historical MARS releases by original source and plume IDs. New archive records, corrected estimates and metadata changes are shown separately. This is not a live feed.</p>
    <div className="plan-actions"><label>Sources to check<select aria-label="Snapshot change scope" value={mode} disabled={busy} onChange={e => { generation.current++; controller.current?.abort(); setMode(e.target.value as 'selected' | 'all'); setResult(null); setError(''); }}><option value="selected">Sources in this allocation</option><option value="all">All changed sources</option></select></label><button type="button" className="outline-btn" disabled={!report || busy} onClick={() => void load()}>{busy ? 'Checking pinned releases…' : 'Check historical snapshot changes'}</button></div>
    {!report && <p>Compute an allocation first to bind this comparison to its dataset and selected sources.</p>}
    {busy && <p role="status">Loading verified historical record changes…</p>}{error && <p role="alert">{error}</p>}
    {result && <div aria-label="Historical snapshot change results"><p className="snapshot-release-line"><strong>{result.before.datasetSnapshotId}</strong> → <strong>{result.after.datasetSnapshotId}</strong><span>Retrieved {result.before.provenance.retrievedAt.slice(0,10)} → {result.after.provenance.retrievedAt.slice(0,10)} · UTC</span></p>
      <div className="plan-delta-summary"><strong>{result.summary.addedSources} added sources</strong><strong>{result.summary.addedObservations} added records</strong><strong>{result.summary.changedObservations} changed records</strong><strong>{result.summary.removedObservations} removed records</strong></div>
      <p>{result.summary.laterDatedAdditions} added records have observation dates after the earlier coverage end; {result.summary.historicalBackfillAdditions} are historical backfill. An added record does not establish a new physical leak.</p>
      <p>Unresolved plume records: {result.before.unresolvedObservationCount.toLocaleString('en-US')} → {result.after.unresolvedObservationCount.toLocaleString('en-US')}. They remain outside source-specific investigations; the complete export retains their record changes.</p>
      <h4>{result.total} {result.coverage === 'selected_sources' ? `of ${result.requestedSourceIds.length} selected sources need record review` : 'sources have record or metadata changes'}</h4>
      {!!result.unchangedSourceIds.length && <p>{result.unchangedSourceIds.length} selected sources have no changes in the compared fields. This does not establish unchanged physical emissions.</p>}
      {!result.total && <p>No compared record changes for these selected sources. Check documents and observation opportunities before making a mitigation claim.</p>}
      <ul className="snapshot-source-list">{result.items.map(item => <li key={item.sourceId}><header><div><strong>{item.sourceId}</strong><span>{item.metadataChange ? `${item.metadataChange.kind} source metadata · ${item.metadataChange.changedFields.length} fields` : 'Original source metadata unchanged'} · {item.observationChanges.length} plume record changes</span></div>{report?.input.candidates.some(row => row.sourceId === item.sourceId) && <div className="plan-actions"><button type="button" aria-label={`Inspect changed source ${item.sourceId}`} onClick={() => onOpenSource(item.sourceId, 'audit')}>Inspect evidence →</button><button type="button" aria-label={`Locate changed source ${item.sourceId}`} onClick={() => onOpenSource(item.sourceId, 'map')}>Map ↗</button></div>}</header>
        <details><summary>Original record changes for {item.sourceId}</summary>{item.metadataChange && <><h5>Source metadata</h5><FieldChanges change={item.metadataChange}/></>}<ObservationChanges key={item.sourceId} rows={item.observationChanges} sourceId={item.sourceId}/></details></li>)}</ul>
      {!!result.total && <div className="planner-pagination"><span>Sources {result.offset + 1}–{Math.min(result.offset + result.limit, result.total)} of {result.total}</span><div><button type="button" disabled={busy || result.offset === 0} aria-label="Previous changed sources" onClick={() => void load(Math.max(0, result.offset - result.limit))}>Previous</button><button type="button" disabled={busy || result.offset + result.limit >= result.total} aria-label="Next changed sources" onClick={() => void load(result.offset + result.limit)}>Next</button></div></div>}
      <details><summary>Provenance, export & verification</summary><p>{result.after.provenance.attribution}</p><p>Earlier input SHA-256: <code>{result.before.inputFileSha256}</code><br/>Later input SHA-256: <code>{result.after.inputFileSha256}</code><br/>Full change report commitment: <code>{result.digest}</code></p><button type="button" className="outline-btn" disabled={busy} onClick={() => void download()}>Download complete historical change report</button><p>The export includes all changed normalized records, beyond the selected page. Verify it against both complete inputs and separately trusted digests with <code>verify:snapshot-transition</code>.</p></details>
      <p className="snapshot-caution">Feedback is not repair evidence. Missing or removed records are not zero methane. Source changes do not modify your active plan or create assignments.</p>
    </div>}
  </details>;
}
