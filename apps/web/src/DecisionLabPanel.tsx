import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { MarsObservation } from './mars';
import { DecisionPlan, reasonLabels } from '@methane/shared/decision-lab';
import { acceptDecisionPlan, decisionOutcomeLabels, downloadDecisionFile, evidenceRequestMarkdown, type DecisionContext } from './decision-lab';
import './decision-lab.css';

type Challenge = { id: string; title: string; plan: DecisionPlan };
type Props = { context: DecisionContext; observations: MarsObservation[]; disabled: boolean; onHumanReview: () => void; onFollowUp: () => void; onObservations: () => void };
const ObservationClaimPanel = lazy(() => import('./ObservationClaimPanel'));

async function readResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 409) throw new Error('The dataset snapshot changed. Reload the application before trying again.');
    if (response.status === 429) throw new Error('Analysis limit reached. Wait one minute and try again.');
    if (response.status === 403) throw new Error('This source or claim scope is outside the public preview. Use a permitted historical case.');
    throw new Error('Decision analysis is unavailable. Check the API and retry.');
  }
  const text = await response.text();
  if (text.length > 8_000_000) throw new Error('The analysis is too large to inspect in this browser.');
  return JSON.parse(text) as unknown;
}

export default function DecisionLabPanel({ context, observations, disabled, onHumanReview, onFollowUp, onObservations }: Props) {
  const [tool, setTool] = useState<'references' | 'observations'>('references');
  const [plan, setPlan] = useState<DecisionPlan | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeId, setChallengeId] = useState('complete');
  const [demoOpen, setDemoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [visibleRows, setVisibleRows] = useState(20);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const active = demoOpen ? challenges.find(item => item.id === challengeId)?.plan : plan;

  async function load(demo: boolean) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setCopyMessage('');
    try {
      if (demo) {
        const raw = await readResponse(await fetch('/api/investigations/challenges', { signal: controller.signal }));
        const envelope = raw as { synthetic?: boolean; challenges?: Challenge[] };
        if (envelope.synthetic !== true || !Array.isArray(envelope.challenges) || envelope.challenges.length !== 5) throw new Error('Invalid challenge collection.');
        const checked: Challenge[] = [];
        const ids = new Set(['complete', 'missing-follow-up', 'outside-period', 'contrary', 'conflict']);
        for (const item of envelope.challenges) {
          if (!ids.delete(item.id) || typeof item.title !== 'string' || item.title.length > 160) throw new Error('Invalid challenge metadata.');
          const result = await acceptDecisionPlan(item.plan, { sourceId: 'DEMO_DECISION_LAB', synthetic: true, claimType: 'mitigation_confirmed', datasetSnapshotId: 'DEMO-authored-reference-challenge-v1', scope: { startDate: '2026-06-01', endDate: '2026-06-30' } });
          checked.push({ id: item.id, title: item.title, plan: result });
        }
        if (!controller.signal.aborted) { setChallenges(checked); setDemoOpen(true); setChallengeId('complete'); }
      } else {
        const raw = await readResponse(await fetch('/api/investigations/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ sourceId: context.sourceId, claimType: context.claimType, ...(context.datasetSnapshotId ? { datasetSnapshotId: context.datasetSnapshotId } : {}), ...(context.scope ? { scope: context.scope } : {}) }) }));
        const result = await acceptDecisionPlan(raw, context);
        if (!controller.signal.aborted) { setPlan(result); setDemoOpen(false); }
      }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Analysis failed. Retry.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function download(requestOnly: boolean) {
    if (!active) return;
    const prefix = active.synthetic ? 'DEMO-' : active.input.scope?.recipient ? 'PRIVATE-' : '';
    const stem = `${prefix}${active.sourceId}-decision`;
    downloadDecisionFile(`${stem}.${requestOnly ? 'md' : 'json'}`, requestOnly ? evidenceRequestMarkdown(active) : JSON.stringify(active, null, 2), requestOnly ? 'text/markdown' : 'application/json');
  }

  async function copyRequest() {
    if (!active) return;
    try { await navigator.clipboard.writeText(evidenceRequestMarkdown(active)); setCopyMessage('Request copied. Review it before pasting into follow-up work.'); }
    catch { setCopyMessage('Clipboard unavailable. Download the evidence request instead.'); }
  }

  return <><div className="decision-controls decision-tool-switch" role="group" aria-label="Decision Lab tools"><button type="button" className="outline-btn" aria-pressed={tool === 'references'} onClick={() => setTool('references')}>Reference coverage</button><button type="button" className="outline-btn" aria-pressed={tool === 'observations'} onClick={() => setTool('observations')}>Observation cross-check</button></div>
    {tool === 'observations' ? <Suspense fallback={<p role="status">Loading observation checks…</p>}><ObservationClaimPanel context={context} observations={observations} disabled={disabled} onHumanReview={onHumanReview} onFollowUp={onFollowUp} onObservations={onObservations}/></Suspense> : <section className="panel decision-lab" aria-label="Evidence Decision Lab" aria-busy={busy}>
    <header className="decision-heading"><div><span className="decision-kicker">EVIDENCE → DECISION → NEXT CHECK</span><h3>Why does this evidence change the decision?</h3><p>Inspect reference eligibility, test dependencies and prepare a specific request for missing evidence.</p></div><span className={`chip ${demoOpen || context.synthetic ? 'chip-orange' : 'chip-teal'}`}>{demoOpen || context.synthetic ? 'SYNTHETIC DEMO' : 'PINNED MARS RECORDS'}</span></header>
    <div className="decision-controls">
      <button type="button" className="primary-btn" disabled={busy || disabled} onClick={() => void load(false)}>{busy ? 'Analysing…' : 'Explain current evidence'}</button>
      <button type="button" className="outline-btn" disabled={busy} onClick={() => demoOpen ? (setDemoOpen(false), setError('')) : void load(true)}>{demoOpen ? 'Return to selected MARS source' : 'Open synthetic evidence challenges'}</button>
    </div>
    <p className="decision-context">Selected investigation: <strong>{context.sourceId}</strong> · {context.claimType.replaceAll('_', ' ')}{context.scope ? ` · ${context.scope.startDate} → ${context.scope.endDate} UTC` : ' · source-level scope'}</p>
    {disabled && <p role="status">Apply the scope draft and load a server-backed source before analysing this investigation.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
    {demoOpen && <div className="decision-demo"><strong>SYNTHETIC DEMO · authored reference metadata</strong><p>These fixtures represent no real operator, measurement or repair. They do not alter the selected investigation or its saved audit.</p><label>Synthetic challenge<select value={challengeId} onChange={event => { setChallengeId(event.target.value); setVisibleRows(20); setCopyMessage(''); }}>{challenges.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>}
    {!active && !busy && <p className="decision-empty">Run the explanation to see which references qualify. No audit revision is saved by this analysis.</p>}
    {active && <>
      <div className={`decision-result ${active.result}`}><span>DETERMINISTIC REFERENCE COVERAGE</span><strong data-testid="decision-outcome">{decisionOutcomeLabels[active.result]}</strong><p>{active.sourceId} · {active.datasetSnapshotId}</p><small>Reference metadata can qualify; document contents and physical outcomes still need review.</small></div>
      <div className="decision-counts"><span><strong>{active.summary.supporting}</strong> supporting</span><span><strong>{active.summary.contrary}</strong> contrary</span><span><strong>{active.summary.excluded}</strong> excluded</span><span><strong>{active.summary.total}</strong> total records</span></div>
      <details className="decision-trace"><summary>Inspect reference eligibility · {active.trace.length} records</summary><div className="table-wrap"><table><thead><tr><th>Reference / date</th><th>Eligibility</th><th>Reason</th></tr></thead><tbody>{active.trace.slice(0, visibleRows).map((item, index) => <tr key={`${item.evidenceId}:${index}`}><td><code>{item.evidenceId}</code><small>{item.date || 'No valid date'}</small></td><td>{item.disposition}</td><td>{item.reasons.length ? item.reasons.map(reason => reasonLabels[reason]).join(' ') : 'Matches the declared reference type, pointer, date and scope requirements.'}</td></tr>)}</tbody></table></div>{active.trace.length > visibleRows && <button type="button" className="outline-btn" onClick={() => setVisibleRows(value => value + 50)}>Show next 50 records</button>}</details>
      <section className="decision-sensitivity" aria-label="Evidence sensitivity"><h4>What changes if a reference is removed?</h4><p>Each row reruns the same policy with the named reference removed. The underlying evidence and saved audit remain unchanged.</p>{!active.sensitivity.length ? <p>No eligible references to remove. Obtain the evidence listed below.</p> : <ul>{active.sensitivity.map((item, index) => <li key={index}><span>Remove {item.removedEvidenceIds.length === 1 ? <code>{item.removedEvidenceIds[0]}</code> : `all ${item.removedEvidenceIds.length} eligible references`}</span><strong>{decisionOutcomeLabels[item.result]}</strong><small>{item.result === active.result ? 'Coverage label unchanged' : 'Coverage label changes'}</small></li>)}</ul>}{active.sensitivityOmitted > 0 && <p>First 8 individual dependencies shown; {active.sensitivityOmitted} omitted. The aggregate removal includes all eligible IDs.</p>}<small>Decision dependence is not a calibrated confidence score or a probability of repair.</small></section>
      <section className="decision-next"><h4>Evidence to obtain and acceptance checks</h4><ol>{active.nextChecks.map(item => <li key={item.title}><strong>{item.title}</strong><p>{item.acceptance}</p></li>)}</ol></section>
      <div className="decision-controls"><button type="button" className="primary-btn" onClick={() => download(true)}>Download evidence request</button><button type="button" className="outline-btn" onClick={() => download(false)}>Download reproducible analysis</button><button type="button" className="outline-btn" onClick={() => void copyRequest()}>Copy request</button></div>
      {copyMessage && <p role="status">{copyMessage}</p>}
      {!demoOpen && <div className="decision-controls"><button type="button" className="outline-btn" onClick={onHumanReview}>Continue to human assessment</button><button type="button" className="outline-btn" onClick={onFollowUp}>Open follow-up work</button></div>}
      <p className="decision-digest">SHA-256 <code>{active.digest}</code><small>Checksum and policy replay checked in this browser. Unsigned; not a blockchain receipt or issuer authentication.</small></p>
      {active.input.provenance && <details className="decision-trace"><summary>Dataset attribution and limitations</summary><p>{active.input.provenance.attribution} · {active.input.provenance.license}</p><p>Retrieved {active.input.provenance.retrievedAt} · <a href={active.input.provenance.catalogUrl} target="_blank" rel="noreferrer">Publisher catalogue ↗</a></p><ul>{active.input.sourceLimitations.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
    </>}
  </section>}</>;
}
