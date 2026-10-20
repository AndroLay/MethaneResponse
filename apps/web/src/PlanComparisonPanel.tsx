import { useEffect, useRef, useState } from 'react';
import { compareInvestigationPortfolios, type InvestigationPortfolio, type PlannerStrategy } from '@methane/shared/investigation-planner';
import { acceptPlanArtifact } from './plan-operations';
type Imported = Awaited<ReturnType<typeof acceptPlanArtifact>>;
type Delta = Awaited<ReturnType<typeof compareInvestigationPortfolios>>;
export default function PlanComparisonPanel({ report, strategy, onOpenSource }: { report: InvestigationPortfolio | null; strategy: PlannerStrategy; onOpenSource: (id: string, target: 'case' | 'map' | 'audit') => void }) {
  const [file, setFile] = useState<File | null>(null), [expected, setExpected] = useState('');
  const [baseline, setBaseline] = useState<Imported | null>(null), [delta, setDelta] = useState<Delta | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => { generation.current++; setBaseline(null); setError(''); setBusy(false); }, [file, expected]);
  useEffect(() => {
    let alive = true; setDelta(null);
    if (baseline && report) void compareInvestigationPortfolios(baseline.report, report, baseline.strategy, strategy)
      .then(value => { if (alive) { setDelta(value); setError(''); } }).catch(() => { if (alive) setError('These plans have incompatible visibility, publisher or snapshot bindings.'); });
    return () => { alive = false; };
  }, [baseline, report, strategy]);
  useEffect(() => () => { generation.current++; }, []);
  async function inspect() {
    if (!file) return; const started = ++generation.current; setBusy(true); setBaseline(null); setError('');
    try {
      if (file.size > 16_000_000) throw new Error('Plan file exceeds the 16 MB import limit.');
      const value = await acceptPlanArtifact(JSON.parse(await file.text()), expected.trim());
      if (started === generation.current) setBaseline(value);
    } catch (reason) { if (started === generation.current) setError(reason instanceof Error ? reason.message : 'Plan import failed.'); }
    finally { if (started === generation.current) setBusy(false); }
  }
  return <details className="planner-details plan-operations" open>
    <summary>Compare an earlier plan or snapshot</summary>
    <p>Import a saved replay or reviewer history and its independently recorded digest. Files stay in this browser. Both plans are replayed before comparison. A history file can contain private reviewer notes.</p>
    <div className="plan-fields"><label>Earlier plan file<input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files?.[0] || null)}/></label><label>Expected plan or history digest<input value={expected} maxLength={66} onChange={e => setExpected(e.target.value)} placeholder="0x… SHA-256 from a separate trusted record"/></label></div>
    <button type="button" className="outline-btn" disabled={!file || !/^0x[a-f0-9]{64}$/.test(expected.trim()) || busy} onClick={() => void inspect()}>{busy ? 'Verifying earlier plan…' : 'Verify earlier plan'}</button>
    {error && <p role="alert">{error}</p>}
    {baseline && <p role="status">Earlier plan verified against supplied digest · {baseline.report.input.dataset.datasetSnapshotId}. {baseline.journal ? `Recorded ${baseline.journal.revisions.at(-1)!.decision} decision; reviewer identity is not independently authenticated by this file.` : 'Unsigned plan; using its weighted strategy for comparison.'}</p>}
    {baseline && !report && <p>Compute a current plan to compare it with this verified baseline.</p>}
    {delta && <div aria-label="Plan change comparison">
      <div className="plan-delta-summary"><strong>{delta.addedIds.length} added</strong><strong>{delta.removedIds.length} removed</strong><strong>{delta.retainedIds.length} retained</strong></div>
      <p>{delta.datasetChanged ? 'Different dataset snapshots: summary changes require inspection.' : 'Same dataset snapshot: this is an allocation comparison, not a new observation feed.'} {delta.assumptionsChanged ? 'Strategy or analyst constraints also changed; differences cannot be attributed only to data.' : 'Analyst constraints and strategy are unchanged.'}</p>
      <p>Added: {delta.addedIds.join(', ') || 'none'}<br/>Removed: {delta.removedIds.join(', ') || 'none'}</p>
      <h4>{delta.reviewSources.length} selected sources with changed summaries</h4>
      <ul>{delta.reviewSources.map(row => <li key={row.sourceId}><strong>{row.sourceId}</strong> · {row.changedFields.join(', ')}<br/><small>Linked records {row.before?.observationCount ?? 'not present'} → {row.after?.observationCount ?? 'not present'} · median flux {row.before?.medianFluxKgHr ?? 'not reported'} → {row.after?.medianFluxKgHr ?? 'not reported'} kg/h.</small>{row.after && <button type="button" className="outline-btn" onClick={() => onOpenSource(row.sourceId, 'audit')}>Inspect changed source {row.sourceId}</button>}</li>)}</ul>
      {!delta.reviewSources.length && <p>No selected source summaries differ. This does not establish unchanged physical emissions.</p>}
      <small>{delta.changedSourceCount} changed source summaries across the supplied catalogs. {delta.limitation}</small>
    </div>}
  </details>;
}
