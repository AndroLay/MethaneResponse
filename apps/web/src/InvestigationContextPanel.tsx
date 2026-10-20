import EvidenceRequestPanel from './EvidenceRequestPanel';
import InvestigationDecisionPanel from './InvestigationDecisionPanel';
import EvidenceOverlapPanel from './EvidenceOverlapPanel';
import { useEffect, useRef, useState } from 'react';
import type { CaseWorkDraft, SharedCaseWork, SharedWorkContext } from '@methane/shared';
import { requestInvestigationResource, requestPlanResource } from './shared-work-api';
import { acceptedInvestigationPlanLink, acceptInvestigationChangeCheck, type InvestigationChangeCheck } from './connected-investigation';

type Props = { context: SharedWorkContext; workId: string; draft: CaseWorkDraft; saved?: SharedCaseWork; dirty: boolean; busy: boolean; canWrite: boolean;
  onBusy: (value: boolean) => void; onChange: (update: (value: CaseWorkDraft) => CaseWorkDraft) => void };
export default function InvestigationContextPanel({ context, workId, draft, saved, dirty, busy, canWrite, onBusy, onChange }: Props) {
  const [planId, setPlanId] = useState(draft.planLink?.planId || 'team-investigation-plan');
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [digest, setDigest] = useState('');
  const [change, setChange] = useState<InvestigationChangeCheck | null>(null);
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const view = useRef(''); view.current = JSON.stringify([context, workId, draft, saved?.revision]);
  useEffect(() => { setChange(null); setDigest(''); setMessage(''); setError(''); }, [saved?.revision]);
  async function act(action: 'plan' | 'change' | 'export') {
    const started = view.current;
    const ensureCurrent = () => { if (view.current !== started) throw new Error('Investigation changed while checking. Inspect the latest saved revision and retry.'); };
    onBusy(true); setError(''); setMessage('');
    try {
      if (action === 'plan') {
        const link = await acceptedInvestigationPlanLink(await requestPlanResource(planId), context);
        if (!alive.current) return;
        ensureCurrent();
        onChange(value => ({ ...value, planLink: link })); setMessage('Accepted allocation revision attached to the draft. Save shared work to preserve the link.');
      } else if (action === 'change') {
        const response = await requestInvestigationResource(context, workId, 'change-check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedRevision: saved!.revision }) });
        const checked = acceptInvestigationChangeCheck(response.value, context, saved!.revision);
        if (!alive.current) return;
        ensureCurrent();
        setChange(checked); onChange(value => ({ ...value, changeReportDigest: checked.changeReportDigest }));
        setMessage('Historical change check attached to the draft. Inspect its reasons and save explicitly; the existing assessment is unchanged.');
      } else {
        const response = await requestInvestigationResource(context, workId, 'dossier');
        const { InvestigationDossier, verifyInvestigationDossier } = await import('@methane/shared/investigation-dossier');
        const value = InvestigationDossier.parse(response.value);
        if (!response.digest || !await verifyInvestigationDossier(response.value, response.digest) || value.workId !== workId || value.context.sourceId !== context.sourceId
          || value.context.datasetSnapshotId !== context.datasetSnapshotId || value.context.archiveSha256 !== context.archiveSha256 || value.context.synthetic !== context.synthetic
          || value.history.at(-1)!.revision !== saved!.revision) throw new Error('Export changed or failed integrity checks. Load the latest investigation before downloading.');
        if (!alive.current) return;
        ensureCurrent();
        const url = URL.createObjectURL(new Blob([JSON.stringify(value)], { type: 'application/json' })), anchor = document.createElement('a');
        anchor.href = url; anchor.download = `${context.sourceId}-${workId}-investigation.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDigest(response.digest); setMessage(`Verified export through saved revision ${saved!.revision}. Store its digest separately. Private team content is included.`);
      }
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Investigation context unavailable. Your draft is retained.'); }
    finally { if (alive.current) onBusy(false); }
  }
  return <section className="investigation-context" aria-label="Connected investigation">
    <header><div><span className="planner-kicker">PLAN → EVIDENCE → NEXT ACTION → REVIEW</span><h4>Investigation context & evidence requirements</h4></div><span className="planner-badge">PRIVATE · VERSIONED</span></header>
    <p>Connect the allocation decision to this source, its evidence request and saved assessment. Historical approval does not confirm a repair.</p>
    <label>Evidence acceptance criteria<textarea aria-label="Evidence acceptance criteria" rows={3} maxLength={1000} disabled={busy || !canWrite} value={draft.acceptanceCriteria || ''} placeholder="Specify the source, period, action date, follow-up method and uncertainty required for review." onChange={e => onChange(value => ({ ...value, acceptanceCriteria: e.target.value }))}/></label>
    <EvidenceRequestPanel draft={draft} disabled={busy || !canWrite} onChange={onChange}/>
    <div className="case-tool-grid"><label>Accepted plan ID<input aria-label="Accepted plan ID" maxLength={80} value={planId} disabled={busy || !canWrite} onChange={e => setPlanId(e.target.value)}/></label><div className="case-tool-actions"><button type="button" className="outline-btn" disabled={busy || !canWrite || !/^[a-zA-Z0-9_-]{1,80}$/.test(planId)} onClick={() => void act('plan')}>Attach accepted plan revision</button></div></div>
    {draft.planLink && <div className="investigation-link"><strong>{draft.planLink.planId} · accepted revision {draft.planLink.revision}</strong><span>{draft.planLink.strategy} · exact report {draft.planLink.reportDigest}</span><small>Historical decision; later revisions may differ. The server checks source membership and dataset before saving.</small><button type="button" disabled={busy || !canWrite} onClick={() => onChange(value => { const { planLink: _, ...rest } = value; return rest; })}>Remove plan link from draft</button></div>}
    <div className="case-tool-actions"><button type="button" className="outline-btn" disabled={busy || !canWrite || !saved || dirty || context.synthetic} onClick={() => void act('change')}>Check historical changes for this investigation</button><button type="button" className="outline-btn" disabled={busy || !saved || dirty} onClick={() => void act('export')}>Download verified investigation dossier</button></div>
    {(!saved || dirty) && <small>Save shared work before checking its recorded scope or exporting. Unsaved fields are retained in your draft.</small>}
    {change && <div className="investigation-change" role="status"><strong>{change.signal.state === 'review_recommended' ? 'Record review recommended' : 'No compared changes in this scope'}</strong><p>{change.beforeSnapshotId} → {change.afterSnapshotId}</p><p>Source metadata fields: {change.signal.metadataFields.join(', ') || 'none'}. Scoped observation changes: {change.signal.observationIds.length}.</p><p>These archive differences do not establish a new leak, a repair or zero emissions.</p></div>}
    {draft.changeReportDigest && <p>Linked historical change report: <code>{draft.changeReportDigest}</code></p>}
    {draft.assessmentLink ? <p>Assessment {draft.assessmentLink.auditId} is bound by its bundle digest. Assessment basis and human review remain recorded in the original bundle.</p> : <p>No assessment linked yet. Record an assessment and use its follow-up request to attach it to this investigation.</p>}
    {busy && <p role="status">Checking the investigation’s exact versions…</p>}{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {digest && <label>Independent verification digest<input aria-label="Independent verification digest" readOnly value={digest}/></label>}
    <EvidenceOverlapPanel context={context} workId={workId} notes={draft.notes} saved={saved} dirty={dirty} busy={busy} canWrite={canWrite} onBusy={onBusy} onChange={onChange}/>
    <InvestigationDecisionPanel context={context} workId={workId} saved={saved} dirty={dirty} busy={busy} canWrite={canWrite} onBusy={onBusy}/>
    <small>The dossier contains private notes and linked evidence. Share only with authorization. Downloading a dossier creates no transaction. Anchoring a reviewed decision requires separate approval.</small>
  </section>;
}
