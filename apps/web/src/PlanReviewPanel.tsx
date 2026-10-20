import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { InvestigationPortfolio, PlannerStrategy } from '@methane/shared/investigation-planner';
import { PlanJournal, PlanSaveInput, PlanReviewDraft, verifyPlanJournal } from '@methane/shared/plan-journal';
import { connectSharedWork, disconnectSharedWork, requestPlanResource } from './shared-work-api';
import { getTeamSession, subscribeTeamSession } from './team-session';
import { downloadPlanJournal } from './plan-operations';
import { useSessionDraft, confirmDraftNavigation } from './use-session-draft';
type Props = { report: InvestigationPortfolio | null; strategy: PlannerStrategy; planId: string; onPlanId: (id: string) => void };
export default function PlanReviewPanel(props: Props) {
  const session = useSyncExternalStore(subscribeTeamSession, getTeamSession);
  return <PlanReviewEditor key={session?.reviewerId || 'disconnected'} {...props}/>;
}
function PlanReviewEditor({ report, strategy, planId: id, onPlanId }: Props) {
  const session = useSyncExternalStore(subscribeTeamSession, getTeamSession);
  const [token, setToken] = useState('');
  const [journal, setJournal] = useState<PlanJournal | null>(null), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const draft = useSessionDraft('case', `plan-review:${session?.reviewerId || 'disconnected'}:${id}:${report?.digest || 'none'}:${strategy}`, PlanReviewDraft, { decision: 'accept', rationale: '' });
  const key = `${id}:${report?.digest || ''}:${strategy}:${session?.reviewerId || ''}`, latest = useRef(key); latest.current = key;
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { setJournal(null); setMessage(''); setError(''); setBusy(false); }, [id, session?.reviewerId]);
  async function connect() {
    setBusy(true); setError('');
    try { await connectSharedWork(token); if (alive.current) setToken(''); }
    catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Team connection failed.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function loadOrSave(save: boolean) {
    const started = key; setBusy(true); setError(''); setMessage('');
    try {
      const head = journal?.revisions.at(-1);
      const body = save ? PlanSaveInput.parse({ ...draft.value, strategy, request: { datasetSnapshotId: report!.input.dataset.datasetSnapshotId, inputFileSha256: report!.input.dataset.inputFileSha256, parameters: report!.input.parameters }, reportDigest: report!.digest, expectedRevision: head?.revision || 0, expectedHead: head?.hash || null }) : undefined;
      const raw = await requestPlanResource(id, body ? { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
      const result = PlanJournal.parse(raw);
      if (result.planId !== id || !await verifyPlanJournal(result, result.revisions.at(-1)!.hash)) throw new Error('Server plan history failed verification.');
      if (save && (result.revisions.at(-1)!.reportDigest !== report!.digest || result.revisions.at(-1)!.strategy !== strategy)) throw new Error('Saved decision differs from the displayed plan.');
      if (alive.current && latest.current === started) { setJournal(result); if (save) draft.reset(draft.value); setMessage(save ? 'Reviewer decision saved. Earlier revisions are retained; no assignment or publication was made.' : 'Saved history loaded. Compare its last report before recording another decision.'); }
    } catch (reason) { if (alive.current && latest.current === started) setError(reason instanceof Error ? reason.message : 'Decision unavailable. Load latest before retrying.'); }
    finally { if (alive.current && latest.current === started) setBusy(false); }
  }
  return <details className="planner-details plan-operations" open aria-label="Plan reviewer decisions"><summary>Human review & version history</summary>
    <p>Accept, defer or reject this allocation. This decision does not confirm a methane repair. Signed reviewer access and current directory authority are required; history stays private.</p>
    {!session ? <form onSubmit={e => { e.preventDefault(); void connect(); }}><label>Plan reviewer token (memory only)<input type="password" autoComplete="off" maxLength={4096} value={token} onChange={e => setToken(e.target.value)} disabled={busy}/></label><button className="outline-btn" disabled={busy || !token.trim()}>Connect plan reviewer</button></form> : <><p>Connected as <strong>{session.reviewerId}</strong> · {session.canWrite ? 'Review enabled' : 'Read only'}. Local API files need backup; an ephemeral preview is not durable storage.</p><button type="button" className="outline-btn" disabled={busy} onClick={() => { if (confirmDraftNavigation()) disconnectSharedWork(); }}>Disconnect plan reviewer</button></>}
    <div className="plan-fields"><label>Plan ID<input value={id} maxLength={80} disabled={busy} onChange={e => { if (confirmDraftNavigation()) { draft.reset({ decision: 'accept', rationale: '' }); onPlanId(e.target.value); } }}/></label><label>Allocation decision<select aria-label="Allocation decision" value={draft.value.decision} disabled={busy} onChange={e => draft.set(p => ({ ...p, decision: e.target.value as 'accept' | 'defer' | 'reject' }))}><option value="accept">Accept allocation</option><option value="defer">Defer · need more information</option><option value="reject">Reject allocation</option></select></label></div>
    <label>Decision rationale<textarea aria-label="Decision rationale" rows={3} value={draft.value.rationale} maxLength={4000} disabled={busy} onChange={e => draft.set(p => ({ ...p, rationale: e.target.value }))}/></label>
    <div className="plan-actions"><button type="button" className="outline-btn" disabled={busy || !session || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)} onClick={() => void loadOrSave(false)}>Load saved plan history</button><button type="button" className="primary-btn" disabled={busy || !report || !session?.canWrite || !session.claimTypes.includes('source_detected') || draft.value.rationale.trim().length < 20 || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)} onClick={() => void loadOrSave(true)}>{busy ? 'Checking plan…' : 'Save reviewer decision'}</button></div>
    {draft.dirty && <p role="status">Unsaved rationale · recovery copy in this tab {draft.storageReady ? 'available' : 'unavailable'}. Keep credentials and confidential document contents out of notes.</p>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {journal && <div className="plan-history"><h4>{journal.revisions.length} preserved decision revisions</h4><ol>{journal.revisions.map(rev => <li key={rev.hash}><strong>v{rev.revision} · {rev.decision} · {rev.reviewerId}</strong><span>{rev.reviewedAt} · {rev.strategy}</span><p>{rev.rationale}</p></li>)}</ol><p>Trusted head from this authenticated API session:<br/><code>{journal.revisions.at(-1)!.hash}</code></p><button type="button" className="outline-btn" onClick={() => downloadPlanJournal(journal)}>Download reviewed plan history</button><p>Store this digest separately. File verification proves consistency against that digest; it does not independently authenticate a reviewer, establish current status, or prove physical mitigation. This plan is not blockchain anchored.</p></div>}
  </details>;
}
