import { useEffect, useRef, useState } from 'react';
import type { CaseWorkDraft, SharedCaseWork, SharedWorkContext } from '@methane/shared';
import type { EvidenceOverlapReport } from '@methane/shared/evidence-overlap';
import { requestEvidenceOverlap } from './shared-work-api';
import { evidenceOverlapReviewNote, type OverlapInterpretation } from './evidence-overlap-ui';

type Props = { context: SharedWorkContext; workId: string; saved?: SharedCaseWork; dirty: boolean; busy: boolean; canWrite: boolean; onBusy: (value:boolean)=>void; onChange: (update:(value:CaseWorkDraft)=>CaseWorkDraft)=>void; notes: string };
const reasonLabels = { same_source_overlapping_period:'Same source, claim and overlapping period', shared_document_bytes:'Same declared document SHA-256', shared_reference_pointer:'Same recorded reference and locator', shared_assessment_bundle:'Same assessment bundle' };
export default function EvidenceOverlapPanel(props: Props) {
  const { context, workId, saved, dirty, busy, canWrite, onBusy, onChange, notes } = props;
  const [report,setReport] = useState<EvidenceOverlapReport|null>(null), [error,setError] = useState(''), [message,setMessage] = useState(''), [page,setPage] = useState(0);
  const [candidateId,setCandidateId] = useState(''), [interpretation,setInterpretation] = useState<OverlapInterpretation>('needs_investigation'), [rationale,setRationale] = useState('');
  const current = useRef(''); current.current = JSON.stringify([context,workId,saved?.revision,dirty,notes]);
  const alive = useRef(true); useEffect(()=>{alive.current=true; return()=>{alive.current=false;};},[]);
  useEffect(()=>{setReport(null);setError('');setMessage('');setCandidateId('');setRationale('');setPage(0);},[context.sourceId,context.datasetSnapshotId,context.archiveSha256,context.synthetic,workId,saved?.revision]);
  async function check() {
    if (!saved || dirty) return;
    const start = current.current; onBusy(true); setError(''); setMessage(''); setReport(null);
    try {
      const raw = await requestEvidenceOverlap(context,workId,saved.revision);
      const { EvidenceOverlapReport, verifyEvidenceOverlapReport } = await import('@methane/shared/evidence-overlap');
      const value = EvidenceOverlapReport.parse(raw);
      const actual=value.target.context;
      if (!await verifyEvidenceOverlapReport(raw,value.digest) || actual.sourceId!==context.sourceId || actual.datasetSnapshotId!==context.datasetSnapshotId || actual.archiveSha256!==context.archiveSha256 || actual.synthetic!==context.synthetic || value.target.workId!==workId || value.target.revision!==saved.revision) throw new Error('Overlap response does not match this saved investigation.');
      if (alive.current && current.current===start) { setReport(value);setPage(0);setCandidateId(''); }
    } catch(reason) { if(alive.current && current.current===start)setError(reason instanceof Error?reason.message:'Overlap check unavailable.'); }
    finally {if(alive.current)onBusy(false);}
  }
  function record() {
    if (!report || dirty || busy || !canWrite || report.target.revision!==saved?.revision) return;
    try { const updated=evidenceOverlapReviewNote(notes,report,candidateId,interpretation,rationale);onChange(value=>({...value,notes:updated}));setMessage('Interpretation added to your draft. Save shared work to record its reviewer, time and revision.');setError(''); }
    catch(reason){setError(reason instanceof Error?reason.message:'Review could not be added.');}
  }
  const visible=report?.candidates.slice(page*10,(page+1)*10)||[];
  return <details className="evidence-overlap"><summary>Check related claims & reused evidence</summary><section aria-label="Evidence overlap review">
    <p>Compare saved investigations visible to your reviewer in this snapshot. Reusing a report can be legitimate; a candidate is a question for review.</p>
    <button type="button" className="outline-btn" disabled={!saved||dirty||busy} onClick={()=>void check()}>Check related evidence</button>
    {(!saved||dirty)&&<p>Save shared work before comparing exact revisions.</p>}
    {busy&&<p role="status">Checking saved evidence relationships…</p>}
    {report&&<><p role="status">{report.candidates.length} candidates from {report.input.length} authorized investigations. No duplicate mitigation finding.</p>
      <ul className="overlap-candidates">{visible.map(row=><li key={row.id}><strong>{row.work.context.sourceId} · {row.work.workId} · revision {row.work.revision}</strong><span>{row.work.scope?`${row.work.scope.startDate} – ${row.work.scope.endDate}`:'Period not specified'}</span><span>{row.reasons.map(reason=>reasonLabels[reason]).join(' · ')}</span><button type="button" className="outline-btn" disabled={dirty||busy||!canWrite} onClick={()=>{setCandidateId(row.id);setRationale('');}}>Review {row.work.workId}</button></li>)}</ul>
      {report.candidates.length>10&&<nav aria-label="Related evidence pages"><button type="button" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous candidates</button><span>Page {page+1} of {Math.ceil(report.candidates.length/10)}</span><button type="button" disabled={(page+1)*10>=report.candidates.length} onClick={()=>setPage(value=>value+1)}>Next candidates</button></nav>}
      {candidateId&&<fieldset disabled={dirty||busy||!canWrite}><legend>Reviewer interpretation</legend><label>Overlap interpretation<select value={interpretation} onChange={event=>setInterpretation(event.target.value as OverlapInterpretation)}><option value="needs_investigation">Needs investigation</option><option value="legitimate_reuse">Legitimate reuse of evidence</option><option value="distinct_claims">Distinct claims or actions</option></select></label><label>Overlap review rationale<textarea maxLength={600} rows={3} value={rationale} onChange={event=>setRationale(event.target.value)}/></label><button type="button" className="outline-btn" onClick={record}>Add interpretation to draft</button></fieldset>}
      <p><small>Comparison digest <code>{report.digest}</code>. Other work may change after this comparison; the notes retain the revisions actually reviewed.</small></p></>}
    {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  </section></details>;
}
