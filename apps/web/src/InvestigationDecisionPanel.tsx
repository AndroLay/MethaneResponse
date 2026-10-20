import { useEffect, useRef, useState } from 'react';
import type { SharedCaseWork, SharedWorkContext } from '@methane/shared';
import type { InvestigationDossier } from '@methane/shared/investigation-dossier';
import { DecisionHistoryResponse, decisionLabel, chainStatusLabel, revisitLabel, type DecisionSummary as Head, type DecisionTarget as Target } from './investigation-decision-ui';
import { requestDecisionResource, requestInvestigationResource } from './shared-work-api';
export default function InvestigationDecisionPanel({ context,workId,saved,dirty,busy,canWrite,onBusy }: { context:SharedWorkContext; workId:string; saved?:SharedCaseWork; dirty:boolean; busy:boolean; canWrite:boolean; onBusy(v:boolean):void }) {
  const [heads,setHeads] = useState<Head[]>([]), [loaded,setLoaded] = useState(false), [target,setTarget] = useState<Target|null>(null), [preview,setPreview] = useState<InvestigationDossier|null>(null);
  const [inspected,setInspected] = useState(false), [approveChain,setApproveChain] = useState(false), [disposition,setDisposition] = useState('request_more_evidence'), [rationale,setRationale] = useState(''), [message,setMessage] = useState(''), [error,setError] = useState('');
  const generation = useRef(''), alive = useRef(true); generation.current = JSON.stringify([context,workId,saved?.revision,dirty]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; },[]);
  useEffect(() => { setHeads([]); setLoaded(false); setTarget(null); setPreview(null); setInspected(false); setApproveChain(false); setMessage(''); setError(''); },[generation.current]);
  async function act(action:'inspect'|'freeze'|'verify'|'anchor'|'reconcile', digest?:string) {
    const started = generation.current, current = () => { if (!alive.current || generation.current !== started) throw new Error('Investigation changed; reload its saved decision context.'); };
    onBusy(true); setError(''); setMessage('');
    try {
      if (action === 'inspect') {
        const listing = DecisionHistoryResponse.parse(await requestDecisionResource(context,workId,'list'));
        const response = await requestInvestigationResource(context,workId,'dossier'), verifier = await import('@methane/shared/investigation-dossier');
        if (!response.digest || !await verifier.verifyInvestigationDossier(response.value,response.digest)) throw new Error('Dossier integrity checks failed.');
        const value = verifier.InvestigationDossier.parse(response.value);
        if (value.workId !== workId || value.context.sourceId !== context.sourceId || value.context.synthetic !== context.synthetic || value.context.datasetSnapshotId !== context.datasetSnapshotId || value.context.archiveSha256 !== context.archiveSha256 || value.history.at(-1)!.revision !== saved?.revision) throw new Error('Dossier does not match this saved investigation.');
        current(); setHeads(listing.decisions); setLoaded(true); setTarget(listing.target); setPreview(value); setInspected(false); setApproveChain(false);
      } else if (action === 'freeze') {
        const response = await requestDecisionResource(context,workId,'freeze',undefined,{ headers:{'content-type':'application/json'},body:JSON.stringify({ expectedRevision:saved!.revision, expectedDecisionDigest:heads.at(-1)?.digest || null, expectedDossierDigest:preview!.digest, disposition,rationale,sourceInspected:inspected }) }) as {decision:unknown};
        const { InvestigationDecision,verifyInvestigationDecision } = await import('@methane/shared/investigation-decision');
        const value = InvestigationDecision.parse(response.decision);
        if (!await verifyInvestigationDecision(response.decision,value.digest) || value.dossier.digest !== preview!.digest) throw new Error('Decision verification failed.');
        current(); setHeads(v => [...v,{ digest:value.digest,revision:value.revision,workRevision:saved!.revision,reviewerId:value.reviewerId,reviewedAt:value.reviewedAt,disposition:value.disposition,receipt:null }]); setInspected(false);
        setMessage(`Decision ${value.revision} frozen with dossier ${preview!.digest}. The original assessment remains unchanged.`);
      } else if (action === 'verify') {
        const record = await requestDecisionResource(context,workId,'verify',digest) as {decision:unknown;chainStatus:string;revisit:{state:string;snapshotComparison:string}};
        const { verifyInvestigationDecision } = await import('@methane/shared/investigation-decision');
        if (!await verifyInvestigationDecision(record.decision,digest!)) throw new Error('Frozen decision failed independent digest checks.');
        current(); const url = URL.createObjectURL(new Blob([JSON.stringify(record)],{type:'application/json'})), a = document.createElement('a'); a.href=url; a.download=`${context.sourceId}-${workId}-decision.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
        setMessage(`Decision integrity verified. ${chainStatusLabel(record.chainStatus)}. ${revisitLabel(record.revisit.state)}. ${revisitLabel(record.revisit.snapshotComparison)}. Keep the trusted digest separately.`);
      } else {
        const value = await requestDecisionResource(context,workId,action,digest,action === 'anchor' ? { headers:{'content-type':'application/json'},body:JSON.stringify({chainId:target!.chainId,registryAddress:target!.registryAddress,issuer:target!.issuer}) } : {}) as {status:string;txHash:string};
        current(); setApproveChain(false); setMessage(`Chain operation ${value.status} · ${value.txHash}. Reconcile pending operations; do not rebroadcast.`);
      }
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Decision operation failed. Saved history is retained.'); }
    finally { if (alive.current) onBusy(false); }
  }
  const ready = Boolean(saved && !dirty && saved.scope && saved.assessmentLink);
  return <details className="investigation-lifecycle"><summary>Review → freeze decision → verify integrity</summary>
    <p>Freeze an exact dossier with a reviewer decision. Workflow status, assessment outcome and cryptographic integrity are separate. No physical repair is established.</p>
    <button className="outline-btn" type="button" disabled={busy || !saved || dirty} onClick={() => void act('inspect')}>Inspect decision dossier and history</button>
    {!ready && <p>Save a scoped investigation and link an assessment before freezing a decision.</p>}
    {preview && <div className="investigation-decision-preview"><h5>Review exact dossier</h5><p>{context.sourceId} · work revision {preview.history.at(-1)!.revision} · {preview.history.at(-1)!.claimType}</p><p>{preview.history.at(-1)!.scope?.startDate || 'No scope'} → {preview.history.at(-1)!.scope?.endDate || 'No scope'}</p><p>{preview.assessments.length} assessments · {preview.plans.length} plans · {preview.transitions.length} snapshot comparisons · {preview.history.at(-1)!.requestEvents?.length || 0} evidence events</p><code>{preview.digest}</code><p>Use the verified dossier download above to inspect all references and exact evidence content before confirming.</p>
      <fieldset disabled={busy || !canWrite || !ready}><label>Investigation decision<select value={disposition} onChange={e => setDisposition(e.target.value)}>{['request_more_evidence','accept_assessment','reject_assessment'].map(v => <option key={v} value={v}>{decisionLabel(v)}</option>)}</select></label><label>Decision rationale<textarea value={rationale} maxLength={2000} onChange={e => setRationale(e.target.value)}/></label><label className="case-tool-check"><input type="checkbox" checked={inspected} onChange={e => setInspected(e.target.checked)}/>I inspected the scoped source, linked assessment, evidence and exact dossier digest.</label><button type="button" className="primary-btn" disabled={!inspected || rationale.trim().length < 20} onClick={() => void act('freeze')}>Freeze reviewed investigation decision</button></fieldset>
    </div>}
    {loaded && !heads.length && <p>No frozen decision yet. Review the saved investigation first.</p>}
    <ol>{heads.map(head => <li key={head.digest}><strong>Decision {head.revision} · {decisionLabel(head.disposition)}</strong><small>Work revision {head.workRevision} · {head.reviewerId} · {head.reviewedAt.replace('T',' ').replace('Z',' UTC')}</small><code>{head.digest}</code><p>{head.receipt ? `Recorded receipt on chain ${head.receipt.chainId}; verify its event.` : 'No confirmed receipt in this loaded history.'}</p><div className="case-tool-actions"><button type="button" className="outline-btn" disabled={busy} onClick={() => void act('verify',head.digest)}>Verify and download decision {head.revision}</button><button type="button" className="outline-btn" disabled={busy || !canWrite} onClick={() => void act('reconcile',head.digest)}>Reconcile decision {head.revision}</button>{!head.receipt && <button type="button" className="outline-btn" disabled={busy || !canWrite || !approveChain || !target?.writeEnabled || !target.issuer} onClick={() => void act('anchor',head.digest)}>Anchor decision {head.revision}</button>}</div></li>)}</ol>
    {target ? <><p>Configured target: chain {target.chainId} · registry {target.registryAddress} · issuer {target.issuer || 'unconfigured'}.</p><label className="case-tool-check"><input type="checkbox" checked={approveChain} disabled={busy || !canWrite || !target.writeEnabled} onChange={e => setApproveChain(e.target.checked)}/>I authorize one transaction for the selected decision on this target. Only its opaque key and digest go on chain; a pending transaction must be reconciled.</label></> : <p>No chain target available. Frozen decisions remain independently verifiable using a separately trusted digest.</p>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </details>;
}
