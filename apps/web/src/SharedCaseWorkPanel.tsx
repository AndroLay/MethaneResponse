import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CaseWorkDraft, SharedWorkContext, type SharedCaseWork, type AuditResult } from '@methane/shared';
import type { CaseWorkPanelProps } from './CaseWorkPanel';
import { CASE_FOLLOW_UP } from './CaseWorkPanel';
import { readCaseWork, workStatusLabels } from './case-work';
import { appendAssessmentRequest, caseDraftSchema } from './session-draft';
import { confirmDraftNavigation, useSessionDraft } from './use-session-draft';
import { getTeamSession, subscribeTeamSession, TEAM_WORK_CHANGED } from './team-session';
import { connectSharedWork, disconnectSharedWork, getSharedWork, listSharedWork, saveSharedWork } from './shared-work-api';

const errorText = (error: unknown) => error instanceof Error ? error.message : 'Shared casework is unavailable. Your draft is retained.';
const draftOf = (work: CaseWorkDraft) => CaseWorkDraft.parse(work);
type Props = CaseWorkPanelProps & { onLocal: () => void; selectedWorkId: string };

export default function SharedCaseWorkPanel(props: Props) {
  const session = useSyncExternalStore(subscribeTeamSession, getTeamSession);
  const [token, setToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const parsed = SharedWorkContext.safeParse({ sourceId: props.context.sourceId, synthetic: props.context.synthetic, datasetSnapshotId: props.context.datasetSnapshotId,
    ...(!props.context.synthetic && props.context.archiveSha256 ? { archiveSha256: props.context.archiveSha256 } : {}) });
  async function connect() {
    setConnecting(true); setError('');
    try { await connectSharedWork(token); if (alive.current) setToken(''); }
    catch (reason) { if (alive.current) setError(errorText(reason)); }
    finally { if (alive.current) setConnecting(false); }
  }
  function local() { if (!confirmDraftNavigation()) return; disconnectSharedWork(); setToken(''); props.onLocal(); }
  return <section id="analyst-case-work" className="case-tool shared-case-work" aria-label="Shared case work">
    <h3>Shared case work</h3>
    <p>Continue investigations with your team. Work status describes the investigation; it does not confirm a repair or change an audit result.</p>
    {!session ? <form onSubmit={event => { event.preventDefault(); void connect(); }}>
      <label>Shared reviewer token (memory only)<input type="password" autoComplete="off" value={token} maxLength={4096} onChange={event => setToken(event.target.value)} disabled={connecting}/></label>
      <p>A signed token and current claim authority in the team directory are required. Your token is cleared on page reload.</p>
      <div className="case-tool-actions"><button className="primary-btn" disabled={connecting || !token.trim()}>Connect shared workspace</button><button type="button" className="outline-btn" disabled={connecting} onClick={local}>Return to browser-local work</button></div>
    </form> : <>
      <p>Connected as <strong>{session.reviewerId}</strong> · {session.canWrite ? 'Read and write' : 'Read only'} · {session.storage.persistent ? 'Server file storage' : 'Temporary server memory'}. {session.storage.ready ? '' : 'Storage needs attention.'}</p>
      <div className="case-tool-actions"><button type="button" className="outline-btn" onClick={local}>Disconnect and return to local work</button></div>
      {parsed.success ? <SharedWorkspace key={JSON.stringify([session.reviewerId, parsed.data])} {...props} context={parsed.data}/> : <p role="alert">Load a versioned dataset before using shared casework.</p>}
    </>}
    {error && <p role="alert">{error}</p>}
    <small>Private team notes are visible to members authorized for this claim type. Tab recovery copies are not encrypted. Keep credentials and report contents out of notes. Previously downloaded copies cannot be revoked.</small>
  </section>;
}

function SharedWorkspace(props: Omit<Props, 'onLocal'> & { context: SharedWorkContext }) {
  const [records, setRecords] = useState<SharedCaseWork[]>([]);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const active = useRef(true);
  const requestNumber = useRef(0);
  const session = getTeamSession()!;
  const load = useCallback(async () => {
    const number = ++requestNumber.current;
    setLoading(true); setAvailable(false); setRecords([]); setError('');
    try { const works = await listSharedWork(props.context); if (active.current && number === requestNumber.current) { setRecords(works); setAvailable(true); setReady(true); } }
    catch (reason) { if (active.current && number === requestNumber.current) { setRecords([]); setAvailable(false); setError(errorText(reason)); setReady(true); } }
    finally { if (active.current && number === requestNumber.current) setLoading(false); }
  }, [JSON.stringify(props.context)]);
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; requestNumber.current++; }; }, [load]);
  const selectedId = props.selectedWorkId;
  const selected = records.find(work => work.context.sourceId === props.context.sourceId && work.workId === selectedId);
  const visible = records.filter(work => (filter === 'all' || work.status === filter) && (!onlyMine || work.assignee === session.reviewerId));
  return <>
    <div className="case-tool-grid">
      <label>Shared queue status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(workStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="case-tool-check"><input type="checkbox" checked={onlyMine} onChange={event => setOnlyMine(event.target.checked)}/>Assigned to me</label>
    </div>
    <label>Shared investigations<select value={selected ? `${selected.context.sourceId}/${selected.workId}` : ''} disabled={!ready || loading} onChange={event => { const work = records.find(item => `${item.context.sourceId}/${item.workId}` === event.target.value); if (work) props.onResume(work.claimType, work.scope, work.context.sourceId, work.workId); }}>
      <option value="">New investigation draft</option>{visible.map(work => <option key={`${work.context.sourceId}/${work.workId}`} value={`${work.context.sourceId}/${work.workId}`}>{work.context.sourceId} · {work.question || work.claimType.replaceAll('_', ' ')} · {workStatusLabels[work.status]} · {work.assignee || 'Unassigned'}{work.dueDate ? ` · due ${work.dueDate}` : ''}</option>)}
    </select></label>
    <div className="case-tool-actions"><button type="button" className="outline-btn" disabled={loading} onClick={() => void load()}>Refresh shared queue</button><button type="button" className="outline-btn" onClick={() => props.onResume(props.claimType, props.scope, props.context.sourceId, crypto.randomUUID())}>New shared investigation</button></div>
    {loading && <p role="status">Loading shared investigations…</p>}
    {error && <p role="alert">{error}</p>}
    {!ready ? <p role="status">Connecting to the shared casework store…</p> : <SharedEditor key={JSON.stringify([session.reviewerId, props.context, selectedId, props.claimType, props.scope])} {...props} workId={selectedId} saved={selected} available={available} onChanged={load}/>}
  </>;
}

function WorkSnapshot({ work }: { work: CaseWorkDraft }) {
  return <dl className="shared-work-snapshot">{[
    ['Open question', work.question], ['Status', workStatusLabels[work.status]], ['Assignee', work.assignee || 'Unassigned'], ['Due date', work.dueDate || 'Not set'],
    ['Next action', work.nextAction], ['Evidence to request', work.evidenceRequest], ['Working notes', work.notes], ['Claim', work.claimType],
    ['Scope', work.scope ? `${work.scope.startDate} → ${work.scope.endDate}${work.scope.observationId ? ` · ${work.scope.observationId}` : ''}${work.scope.recipient ? ` · ${work.scope.recipient}` : ''}` : 'Whole source'],
    ['Assessment link', work.assessmentLink ? `${work.assessmentLink.auditId} · ${work.assessmentLink.bundleHash}` : 'None'],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>;
}

function SharedEditor({ context, claimType, scope, workId, saved, available, onResume, onChanged }: CaseWorkPanelProps & { context: SharedWorkContext; workId: string; saved?: SharedCaseWork; available: boolean; onChanged: () => Promise<void> }) {
  const profile = getTeamSession()!;
  const initial: CaseWorkDraft = saved ? draftOf(saved) : { status: 'investigate', question: '', notes: '', evidenceRequest: '', nextAction: '', claimType, scope };
  const session = useSessionDraft('team-case', JSON.stringify([profile.reviewerId, context, workId]), caseDraftSchema, { draft: initial, baseRevision: saved?.revision || 0 });
  const { draft, baseRevision } = session.value;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [latest, setLatest] = useState<SharedCaseWork | null>(null);
  const [history, setHistory] = useState<SharedCaseWork[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [preview, setPreview] = useState<CaseWorkDraft | null>(null);
  const active = useRef(true);
  const historyRequest = useRef(0);
  const importId = useRef<string | null>(null);
  const changedContext = Boolean(saved && (saved.claimType !== claimType || JSON.stringify(saved.scope) !== JSON.stringify(scope)));
  const canWrite = available && profile.canWrite && profile.claimTypes.includes(claimType) && !changedContext;
  const setDraft = (update: (value: CaseWorkDraft) => CaseWorkDraft) => { session.set(previous => ({ ...previous, draft: update(previous.draft) })); setMessage(''); };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    const request = ++historyRequest.current;
    if (!available) { setHistory([]); setLatest(null); }
    else if (saved) void getSharedWork(context, workId).then(result => { if (current && request === historyRequest.current) setHistory(result.history); }).catch(() => { if (current && request === historyRequest.current) { setFailed(true); setMessage('Revision history could not be loaded. Your draft is retained.'); } });
    return () => { current = false; };
  }, [available, saved?.revision]);
  useEffect(() => {
    const receive = (event: Event) => {
      if (!available || changedContext) return;
      const next = appendAssessmentRequest({ ...draft, claimType, scope }, (event as CustomEvent<AuditResult>).detail, context);
      if (next) { setDraft(() => next); setFailed(false); setMessage('Assessment request added to this draft. Save shared work to keep it.'); }
    };
    window.addEventListener(CASE_FOLLOW_UP, receive); return () => window.removeEventListener(CASE_FOLLOW_UP, receive);
  }, [draft, claimType, JSON.stringify(scope), changedContext, available]);
  async function save() {
    setBusy(true); setMessage('');
    try {
      const work = await saveSharedWork(context, workId, { ...draft, claimType, scope }, baseRevision);
      if (!active.current) return;
      historyRequest.current++;
      session.reset({ draft: draftOf(work), baseRevision: work.revision }); setFailed(false); setMessage(`Saved shared revision ${work.revision}.`); setLatest(null); setReviewed(false);
      window.dispatchEvent(new Event(TEAM_WORK_CHANGED));
      setHistory(previous => [...previous.filter(item => item.revision < work.revision), work]);
      void onChanged();
    } catch (reason) { if (active.current) { setFailed(true); setMessage(`${errorText(reason)} Your current draft is retained.`); } }
    finally { if (active.current) setBusy(false); }
  }
  async function reviewLatest() {
    const request = ++historyRequest.current;
    setBusy(true);
    try { const result = await getSharedWork(context, workId); if (active.current && request === historyRequest.current) { setLatest(result.work); setHistory(result.history); setReviewed(false); setFailed(false); setMessage('Compare the latest saved revision with your draft below.'); } }
    catch (reason) { if (active.current && request === historyRequest.current) { setFailed(true); setMessage(errorText(reason)); } }
    finally { if (active.current) setBusy(false); }
  }
  function useLatest() {
    if (!latest || !confirmDraftNavigation()) return;
    if (latest.claimType !== claimType || JSON.stringify(latest.scope) !== JSON.stringify(scope)) { onResume(latest.claimType, latest.scope, context.sourceId, workId); return; }
    session.reset({ draft: draftOf(latest), baseRevision: latest.revision }); setLatest(null); setReviewed(false); setMessage('Loaded the latest shared revision.'); setFailed(false);
  }
  function keepDraft() {
    if (!latest || !reviewed || latest.claimType !== claimType || JSON.stringify(latest.scope) !== JSON.stringify(scope)) return;
    session.set(previous => ({ ...previous, baseRevision: latest.revision })); setLatest(null); setReviewed(false); setFailed(false); setMessage('Draft retained on the reviewed revision. Save explicitly to apply it.');
  }
  function previewImport() {
    const local = readCaseWork({ ...context, workId });
    if (!local) { setFailed(true); setMessage('No saved browser-local investigation exists for this ID. Return to local work and select it first.'); return; }
    setPreview(draftOf(local)); importId.current = crypto.randomUUID(); setFailed(false); setMessage('Review the local notes before creating a separate shared investigation.');
  }
  async function importLocal() {
    if (!preview || !importId.current) return;
    setBusy(true);
    try {
      const work = await saveSharedWork(context, importId.current, preview, 0);
      if (active.current) { setPreview(null); setFailed(false); setMessage(`Imported as ${work.workId}. Original browser notes are retained.`); window.dispatchEvent(new Event(TEAM_WORK_CHANGED)); await onChanged(); if (active.current) onResume(work.claimType, work.scope, context.sourceId, work.workId); }
    } catch (reason) { if (active.current) { setFailed(true); setMessage(`${errorText(reason)} Check the shared queue before retrying. Original browser notes are retained.`); } }
    finally { if (active.current) setBusy(false); }
  }
  const field = (name: 'question' | 'notes' | 'evidenceRequest' | 'nextAction', label: string, maxLength: number) => <label>{label}<textarea rows={name === 'notes' ? 3 : 2} maxLength={maxLength} value={draft[name]} onChange={event => setDraft(previous => ({ ...previous, [name]: event.target.value }))}/></label>;
  return <>
    {changedContext && <p role="alert">Resume the saved claim and period, or create a new investigation before editing.</p>}
    {!available && <p role="status">Shared state is unavailable. Your retained draft is read only until the shared queue refresh succeeds.</p>}
    {available && !canWrite && !changedContext && <p role="status">This reviewer cannot write this claim type. Reading permitted investigations remains available.</p>}
    {available && saved && <p>Owner {saved.ownerId} · last saved by {saved.updatedBy} · revision {saved.revision} · {saved.updatedAt}</p>}
    {available && saved && saved.revision > baseRevision && <p role="status">A newer shared revision is available. Review it before saving; your draft is retained.</p>}
    <fieldset className="human-edit-fields" disabled={busy || !canWrite}>
      <div className="case-tool-grid"><label>Work status<select value={draft.status} onChange={event => setDraft(previous => ({ ...previous, status: event.target.value as CaseWorkDraft['status'] }))}>{Object.entries(workStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Assignee reviewer ID<input value={draft.assignee || ''} maxLength={96} onChange={event => setDraft(previous => ({ ...previous, assignee: event.target.value.trim() || undefined }))}/></label><label>Due date<input type="date" value={draft.dueDate || ''} onChange={event => setDraft(previous => ({ ...previous, dueDate: event.target.value || undefined }))}/></label></div>
      <div className="case-tool-grid">{field('question', 'Open question', 1000)}{field('nextAction', 'Next action', 1000)}{field('evidenceRequest', 'Evidence to request', 1000)}{field('notes', 'Working notes', 4000)}</div>
    </fieldset>
    {session.dirty && <p role="status">{session.recovered ? 'Recovered unsaved team draft. ' : 'Unsaved team draft. '}{session.storageReady ? 'Recovery copy is kept in this tab without the token.' : 'Tab recovery is unavailable. Copy important work before leaving.'}</p>}
    <div className="case-tool-actions"><button type="button" className="primary-btn" disabled={busy || !canWrite} onClick={() => void save()}>Save shared work</button><button type="button" className="outline-btn" disabled={busy || !available || (!saved && !baseRevision)} onClick={() => void reviewLatest()}>Review latest revision</button>{available && saved && <button type="button" className="outline-btn" onClick={() => onResume(saved.claimType, saved.scope, context.sourceId, workId)}>Resume saved shared investigation</button>}<button type="button" className="outline-btn" disabled={busy || !available} onClick={previewImport}>Preview browser import</button></div>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    {available && latest && <section className="shared-work-comparison" aria-label="Latest shared revision"><h4>Latest shared revision {latest.revision}</h4><p>Saved by {latest.updatedBy} · {latest.updatedAt}. Your editable draft above has been retained. Saving your draft applies all its fields; copy any newer fields you want to keep before saving.</p><WorkSnapshot work={latest}/><label className="case-tool-check"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)}/>I reviewed the differences before applying my draft</label><div className="case-tool-actions"><button type="button" className="outline-btn" onClick={useLatest}>Use latest revision</button><button type="button" className="outline-btn" disabled={!reviewed || !canWrite || latest.claimType !== claimType || JSON.stringify(latest.scope) !== JSON.stringify(scope)} onClick={keepDraft}>Keep my draft on this revision</button></div></section>}
    {preview && <section className="shared-work-comparison" aria-label="Browser import preview"><h4>Browser import preview</h4><p>Creates a new shared investigation in this source and dataset. The existing server investigation and original browser notes are retained.</p><WorkSnapshot work={preview}/><div className="case-tool-actions"><button type="button" className="primary-btn" disabled={busy || !available || !profile.canWrite || !profile.claimTypes.includes(preview.claimType)} onClick={() => void importLocal()}>Import as new shared investigation</button><button type="button" className="outline-btn" disabled={busy} onClick={() => setPreview(null)}>Cancel import</button></div></section>}
    {available && history.length > 0 && <section className="shared-work-history" aria-label="Shared revision history"><h4>Shared revision history</h4><ol>{history.map(work => <li key={work.revision}><strong>Revision {work.revision}</strong> · {work.updatedBy} · {work.updatedAt}<small>{workStatusLabels[work.status]} · {work.assignee || 'Unassigned'}{work.dueDate ? ` · due ${work.dueDate}` : ''}</small><details><summary>Inspect revision {work.revision}</summary><WorkSnapshot work={work}/></details></li>)}</ol></section>}
  </>;
}
