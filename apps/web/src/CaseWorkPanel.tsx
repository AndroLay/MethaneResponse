import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import type { AuditResult, AuditScope, ClaimType } from '@methane/shared';
import { CASE_WORK_CHANGED, listCaseWork, readCaseWork, saveCaseWork, workStatusLabels, type CaseWorkContext, type CaseWorkDraft } from './case-work';
import { appendAssessmentRequest, caseDraftSchema } from './session-draft';
import { confirmDraftNavigation, useSessionDraft } from './use-session-draft';
import { getTeamSession, subscribeTeamSession } from './team-session';
const SharedCaseWorkPanel = lazy(() => import('./SharedCaseWorkPanel'));
export const CASE_FOLLOW_UP = 'methane-add-assessment-follow-up';
export function requestAssessmentFollowUp(audit: AuditResult) { window.dispatchEvent(new CustomEvent(CASE_FOLLOW_UP, { detail: audit })); }

export type CaseWorkPanelProps = { context: CaseWorkContext; claimType: ClaimType; scope?: AuditScope; onResume: (claim: ClaimType, scope?: AuditScope, sourceId?: string, workId?: string) => void };
type Props = CaseWorkPanelProps;
export default function CaseWorkPanel(props: Props) {
  const teamSession = useSyncExternalStore(subscribeTeamSession, getTeamSession);
  const [sharedOpen, setSharedOpen] = useState(false);
  const [, setVersion] = useState(0);
  useEffect(() => { const changed = () => setVersion(n => n + 1); window.addEventListener(CASE_WORK_CHANGED, changed); window.addEventListener('storage', changed); return () => { window.removeEventListener(CASE_WORK_CHANGED, changed); window.removeEventListener('storage', changed); }; }, []);
  const records = listCaseWork(props.context).filter(item => item.sourceId === props.context.sourceId);
  const activeId = props.context.workId || readCaseWork(props.context)?.workId || 'default';
  if (sharedOpen || teamSession) return <Suspense fallback={<p role="status">Loading shared casework…</p>}><SharedCaseWorkPanel {...props} selectedWorkId={props.context.workId || 'default'} onLocal={() => setSharedOpen(false)}/></Suspense>;
  return <CaseWorkEditor key={`${activeId}:${JSON.stringify([props.context.sourceId, props.context.datasetSnapshotId, props.context.archiveSha256, props.context.synthetic, props.claimType, props.scope])}`} {...props} context={{ ...props.context, workId: activeId }} records={records} onShared={() => { if (confirmDraftNavigation()) setSharedOpen(true); }}/>;
}
function CaseWorkEditor({ context, claimType, scope, onResume, records, onShared }: Props & { records: ReturnType<typeof listCaseWork>; onShared: () => void }) {
  const [saved, setSaved] = useState(() => readCaseWork(context));
  const initial: CaseWorkDraft = saved || { status: 'investigate', question: '', notes: '', evidenceRequest: '', nextAction: '', claimType, scope };
  const session = useSessionDraft('case', JSON.stringify([context, claimType, scope]), caseDraftSchema, { draft: initial, baseRevision: saved?.revision || 0 });
  const draft = session.value.draft;
  const setDraft = (update: (value: CaseWorkDraft) => CaseWorkDraft) => session.set(previous => ({ ...previous, draft: update(previous.draft) }));
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const receive = (event: Event) => {
      const audit = (event as CustomEvent<AuditResult>).detail;
      if (audit.sourceId !== context.sourceId || audit.synthetic !== context.synthetic) return;
      if (saved && (saved.claimType !== claimType || JSON.stringify(saved.scope) !== JSON.stringify(scope))) { setFailed(true); setMessage('Create a new investigation for this claim / period before adding follow-up.'); return; }
      const value = appendAssessmentRequest({ ...draft, claimType, scope }, audit, context);
      if (!value) { setFailed(true); setMessage('The saved request does not match this scope, or the request field is full. Your existing work is retained.'); return; }
      setDraft(() => value); setFailed(false); setMessage('Added the saved assessment request to this draft. Work status is unchanged. Save case work to keep it.');
      document.getElementById('analyst-case-work')?.scrollIntoView({ block: 'start' });
    };
    window.addEventListener(CASE_FOLLOW_UP, receive); return () => window.removeEventListener(CASE_FOLLOW_UP, receive);
  }, [draft, claimType, JSON.stringify(scope), context.sourceId, context.synthetic]);
  const contextDiffers = Boolean(saved && (saved.claimType !== claimType || JSON.stringify(saved.scope) !== JSON.stringify(scope)));
  function save() {
    if (contextDiffers) { setFailed(true); setMessage('Resume the saved context or create a new investigation before saving this claim / period.'); return; }
    const result = saveCaseWork(context, { ...draft, claimType, scope }, session.value.baseRevision);
    setFailed(!result.ok);
    if (result.ok) { setSaved(result.record); session.reset({ draft: result.record, baseRevision: result.record.revision }); setMessage('Saved in this browser. Claim and current scope are included.'); }
    else setMessage(result.reason === 'conflict' ? 'This investigation changed in another view. Reload the saved work before saving again; your current draft is retained.' : result.reason === 'invalid' ? 'Load a versioned dataset and apply valid dates before saving.' : 'Browser storage is unavailable or full. Your work has not been saved.');
  }
  function reload() {
    if (!confirmDraftNavigation()) return;
    const current = readCaseWork(context); setSaved(current);
    const value = current || { status: 'investigate' as const, question: '', notes: '', evidenceRequest: '', nextAction: '', claimType, scope };
    session.reset({ draft: value, baseRevision: current?.revision || 0 }); setFailed(false); setMessage(current ? 'Loaded the saved case work.' : 'Draft discarded. No saved work exists for this investigation.');
  }
  const field = (name: 'question' | 'notes' | 'evidenceRequest' | 'nextAction', label: string, maxLength: number) => <label>{label}<textarea rows={name === 'notes' ? 3 : 2} maxLength={maxLength} value={draft[name]} onChange={event => { setDraft(previous => ({ ...previous, [name]: event.target.value })); setMessage(''); }} /></label>;
  return <section id="analyst-case-work" className="case-tool case-work-panel" aria-label="Analyst case work">
    <h3>Analyst case work</h3><p>Keep separate investigations for {context.sourceId}. Work status is your triage decision; it is separate from the audit result and priority score.</p>
    <button type="button" className="outline-btn" onClick={onShared}>Open shared workspace</button>
    <div className="case-tool-grid"><label>Saved investigations<select value={saved?.workId || ''} onChange={event => { const item = records.find(item => item.workId === event.target.value); if (item) onResume(item.claimType, item.scope, item.sourceId, item.workId); }}><option value="">{saved ? 'Select investigation' : 'New investigation draft'}</option>{records.map(item => <option key={item.workId} value={item.workId}>{item.question || item.claimType.replaceAll('_', ' ')} · {item.scope ? `${item.scope.startDate} → ${item.scope.endDate}` : 'whole source'} · {item.workId}</option>)}</select></label>
    <label>Work status<select value={draft.status} onChange={event => { setDraft(previous => ({ ...previous, status: event.target.value as CaseWorkDraft['status'] })); setMessage(''); }}>{Object.entries(workStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    {saved && (saved.claimType !== claimType || JSON.stringify(saved.scope) !== JSON.stringify(scope)) && <p>Current claim or scope differs from this saved investigation. Resume its saved context, or create a new investigation to keep the episodes separate.</p>}
    <div className="case-tool-grid">{field('question', 'Open question', 1000)}{field('nextAction', 'Next action', 1000)}{field('evidenceRequest', 'Evidence to request', 1000)}{field('notes', 'Working notes', 4000)}</div>
    <div className="case-tool-actions"><button type="button" className="primary-btn" disabled={contextDiffers} onClick={save}>Save case work</button>{saved && <button type="button" className="outline-btn" onClick={() => onResume(saved.claimType, saved.scope, context.sourceId, saved.workId)}>Resume saved investigation</button>}<button type="button" className="outline-btn" onClick={() => onResume(claimType, scope, context.sourceId, crypto.randomUUID())}>New investigation</button><button type="button" className="outline-btn" onClick={reload}>Reload saved work</button></div>
    {session.dirty && <p role="status">{session.recovered ? 'Recovered unsaved draft. ' : 'Unsaved changes. '}{session.storageReady ? 'Recovery copy kept in this tab.' : 'Session storage is unavailable. Keep this page open and copy important work.'}</p>}
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    {draft.assessmentLink && <p>Follow-up from assessment {draft.assessmentLink.auditId} · integrity hash {draft.assessmentLink.bundleHash}. This link does not change the audit or prove completion.</p>}
    <small>{saved ? `Saved ${saved.updatedAt} · revision ${saved.revision}. ` : ''}Browser-local notes and tab recovery copies are not encrypted or shared. Save before closing the tab. Keep credentials and document contents out of these fields. Audit revisions remain in the API store.</small>
  </section>;
}
