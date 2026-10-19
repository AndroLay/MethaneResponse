import { useEffect, useRef, useState } from 'react';
import { HumanAssessmentInput, type AuditResult, type AuditScope, type ClaimType, type HumanEvidenceReference, type ResultLabel, type ReviewerAssurance, type ConflictDeclaration } from '@methane/shared';
import { humanDraftSchema } from './session-draft';
import { useSessionDraft } from './use-session-draft';
import { requestAssessmentFollowUp } from './CaseWorkPanel';
import type { IntelligenceCapability } from './reviewer-capability';
import AssessmentTrustPanel, { reviewerStatusLabel } from './AssessmentTrustPanel';
import { fetchLatestHumanAssessment } from './human-history';

type DraftReference = ReturnType<typeof humanDraftSchema.parse>['evidence'][number];
const api = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const kindLabels: Record<HumanEvidenceReference['kind'], string> = {
  detection: 'Detection record', notification: 'Notification / delivery record', mitigation_confirmation: 'Action and follow-up record', contradiction: 'Explicit contrary record', document_excerpt: 'Context reference only',
};

type Props = { draftContext: string; sourceId: string; claimType: ClaimType; scope?: AuditScope; datasetSnapshotId?: string; synthetic: boolean; capability: IntelligenceCapability | null; currentAudit: AuditResult | null; onAssessment: (audit: AuditResult) => void };

export default function HumanAssessmentPanel({ draftContext, sourceId, claimType, scope, datasetSnapshotId, synthetic, capability, currentAudit, onAssessment }: Props) {
  const previous = currentAudit?.bundle.humanAssessment;
  const session = useSessionDraft('human', draftContext, humanDraftSchema, {
    claimText: previous?.claimText || '', rationale: previous ? currentAudit!.reason : '',
    result: previous ? currentAudit!.result : 'insufficient_evidence', evidence: previous?.submittedEvidence || [], nextEvidenceRequest: previous?.nextEvidenceRequest || '',
    conflictDeclaration: previous?.trust?.conflictDeclaration || 'not_declared',
  });
  const { claimText, rationale, result, evidence, nextEvidenceRequest } = session.value;
  const setClaimText = (value: string) => session.set(previous => ({ ...previous, claimText: value }));
  const setRationale = (value: string) => session.set(previous => ({ ...previous, rationale: value }));
  const setResult = (value: ResultLabel) => session.set(previous => ({ ...previous, result: value }));
  const setNextEvidenceRequest = (value: string) => session.set(previous => ({ ...previous, nextEvidenceRequest: value }));
  const setEvidence = (update: (value: DraftReference[]) => DraftReference[]) => session.set(previous => ({ ...previous, evidence: update(previous.evidence) }));
  const [inspected, setInspected] = useState(false);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkPublicReferences, setCheckPublicReferences] = useState(false);
  const [publicSummaryConsent, setPublicSummaryConsent] = useState(false);
  const [reviewerAssurance, setReviewerAssurance] = useState<ReviewerAssurance | null>(null);
  const [checkingReviewer, setCheckingReviewer] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyMessage, setHistoryMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  async function loadLatest() {
    if (!scope || !token.trim()) return;
    if (session.dirty && !window.confirm('Replace this unsaved assessment draft with the latest saved human assessment?')) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoadingHistory(true); setError(''); setHistoryMessage('');
    try {
      const audit = await fetchLatestHumanAssessment(api, { sourceId, claimType, scope, synthetic, datasetSnapshotId }, token, request.signal);
      if (!active.current || request.signal.aborted) return;
      if (!audit) { setHistoryMessage('No saved human assessment matches this source, claim, period and dataset.'); return; }
      const human = audit.bundle.humanAssessment!;
      session.reset({ claimText: human.claimText, rationale: audit.reason, result: audit.result, evidence: human.submittedEvidence,
        nextEvidenceRequest: human.nextEvidenceRequest || '', conflictDeclaration: human.trust?.conflictDeclaration || 'not_declared' });
      onAssessment(audit); setInspected(false); setPublicSummaryConsent(false); setCheckPublicReferences(false); setReviewerAssurance(null);
      setHistoryMessage(`Loaded human revision ${audit.revision}. Inspect the evidence again and choose consent for the new revision.`);
    } catch (reason) { if (active.current && !request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Private history unavailable.'); }
    finally { if (active.current && !request.signal.aborted) setLoadingHistory(false); }
  }
  async function checkReviewer() {
    setCheckingReviewer(true); setError(''); setReviewerAssurance(null);
    const request = new AbortController(); controller.current = request;
    try {
      const response = await fetch(`${api}/api/reviewers/me?claimType=${encodeURIComponent(claimType)}`, { headers: { authorization: `Bearer ${token.trim()}` }, signal: request.signal });
      const body = await response.json() as { assurance?: ReviewerAssurance; error?: string };
      if (!response.ok || !body.assurance) throw new Error(body.error || 'Reviewer approval could not be checked.');
      if (active.current) setReviewerAssurance(body.assurance);
    } catch (reason) { if (active.current && !request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Reviewer check failed.'); }
    finally { if (active.current) setCheckingReviewer(false); }
  }
  function addReference() {
    setEvidence(previous => [...previous, {
      id: `reference-${crypto.randomUUID().slice(0, 8)}`, sourceId, kind: 'document_excerpt', title: '', reference: '', locator: '',
      ...(scope?.observationId ? { observationId: scope.observationId } : {}),
    }]);
  }
  function update(index: number, name: keyof HumanEvidenceReference, value: string) {
    setEvidence(previous => previous.map((item, i) => i === index ? { ...item, [name]: value || (name === 'title' || name === 'reference' || name === 'locator' ? '' : undefined) } : item));
  }
  async function submit() {
    if (!scope) { setError('Apply an event / period scope in Overview first.'); return; }
    const parsed = HumanAssessmentInput.safeParse({ sourceId, claimType, scope, datasetSnapshotId: synthetic ? 'DEMO' : datasetSnapshotId,
      claimText, result, rationale, sourceInspected: inspected, evidence, nextEvidenceRequest,
      checkPublicReferences, publicSummaryConsent, conflictDeclaration: session.value.conflictDeclaration,
      ...(previous ? { parentAuditId: currentAudit!.auditId } : {}),
    });
    if (!parsed.success) { setError(parsed.error.issues.map(item => `${item.path.join('.')}: ${item.message}`).slice(0, 3).join(' · ')); return; }
    setSaving(true); setError('');
    const request = new AbortController(); controller.current = request;
    try {
      const response = await fetch(`${api}/api/human-assessments`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token.trim()}` }, body: JSON.stringify(parsed.data), signal: request.signal });
      const payload = await response.json() as { audit?: AuditResult; error?: string };
      if (!response.ok || !payload.audit) throw new Error(payload.error || 'Could not save this assessment.');
      if (active.current) { session.reset({ claimText, rationale, result, evidence, nextEvidenceRequest, conflictDeclaration: session.value.conflictDeclaration }); onAssessment(payload.audit); setInspected(false); setPublicSummaryConsent(false); setCheckPublicReferences(false); }
    } catch (reason) { if (active.current && !request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Assessment failed.'); }
    finally { if (active.current) setSaving(false); }
  }
  function referenceField(item: DraftReference, index: number, name: keyof HumanEvidenceReference, label: string, type = 'text', maxLength = 300) {
    return <label>{label}<input type={type} maxLength={maxLength} value={item[name] || ''} onChange={event => update(index, name, event.target.value)} /></label>;
  }
  return <section className="panel case-tool human-assessment-panel" aria-label="Human evidence assessment">
    <h3>Human evidence assessment</h3>
    <p>Inspect the source material yourself, register its references, and record your own evidence decision. No AI provider or document upload is required. References and reasoning remain private.</p>
    {!capability?.humanReviewConfigured && <p role="status">Human reviewer access is not configured on this API. A server-issued reviewer token is required to save.</p>}
    {!scope && <p role="status">Apply an assessment scope in Overview before saving.</p>}
    {scope && <p>Assessment period: {scope.startDate} → {scope.endDate}. {scope.observationId ? `Observation: ${scope.observationId}.` : 'Whole-period assessment.'} {scope.recipient ? `Intended recipient: ${scope.recipient}.` : ''}</p>}
    {session.dirty && <p role="status">{session.recovered ? 'Recovered unsaved assessment draft. ' : 'Unsaved assessment draft. '}{session.storageReady ? 'Recovery copy kept in this tab; token and inspection confirmation are excluded.' : 'Recovery could not be updated: storage is blocked/full or reference metadata is invalid. Keep this page open and copy important work.'}</p>}
    <form onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset className="human-edit-fields" disabled={saving || loadingHistory}>
      <div className="case-tool-grid">
        <label>Exact claim for human assessment<textarea rows={3} maxLength={1000} value={claimText} onChange={event => setClaimText(event.target.value)} /></label>
        <label>Your determination<select value={result} onChange={event => setResult(event.target.value as ResultLabel)}><option value="insufficient_evidence">Insufficient evidence</option><option value="supported">Supported by the inspected evidence</option><option value="contradicted">Contradicted by an explicit record</option></select></label>
      </div>
      <h4>Reference metadata</h4><p>Add a page, paragraph, receipt or record locator. Do not paste report contents. Optional publisher checks retrieve and hash permitted public URLs; origin and byte matching do not establish document truth.</p>
      {!evidence.length && <p>No references entered. An insufficient-evidence determination can be saved with a reason and next evidence request.</p>}
      {evidence.map((item, index) => <fieldset className="human-reference" key={item.id}><legend>Reference {index + 1}</legend>
        <div className="case-tool-grid">
          <label>Reference kind<select value={item.kind} onChange={event => update(index, 'kind', event.target.value)}>{Object.entries(kindLabels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
          {referenceField(item, index, 'title', 'Reference title', 'text', 160)}
          {referenceField(item, index, 'reference', 'Reference URL', 'url', 2000)}
          {referenceField(item, index, 'locator', 'Page / record locator')}
          {referenceField(item, index, 'expectedSha256', 'Expected document SHA-256 (optional)', 'text', 64)}
          {referenceField(item, index, 'date', item.kind === 'mitigation_confirmation' ? 'Action date' : 'Evidence date', 'date')}
          {referenceField(item, index, 'observationId', 'Evidence observation ID', 'text', 128)}
          {(item.kind === 'notification' || (item.kind === 'contradiction' && claimType === 'operator_notified')) && referenceField(item, index, 'recipient', 'Recorded notification recipient', 'text', 160)}
          {item.kind === 'mitigation_confirmation' && <>
            {referenceField(item, index, 'action', 'Documented action', 'text', 500)}
            {referenceField(item, index, 'followUpDate', 'Follow-up date', 'date')}
            {referenceField(item, index, 'followUpReference', 'Follow-up reference URL', 'url', 2000)}
            {referenceField(item, index, 'followUpExpectedSha256', 'Expected follow-up SHA-256 (optional)', 'text', 64)}
          </>}
        </div>
        <small>Source: {sourceId} · event relationships and dates are declared by the reviewer.</small>
        <button className="outline-btn" type="button" onClick={() => setEvidence(previous => previous.filter((_, i) => i !== index))}>Remove reference {index + 1}</button>
      </fieldset>)}
      <button className="outline-btn" type="button" disabled={evidence.length >= 12 || saving} onClick={addReference}>Add evidence reference</button>
      <div className="case-tool-grid human-rationale">
        <label>Reason for your determination<textarea rows={4} maxLength={2000} value={rationale} onChange={event => setRationale(event.target.value)} /></label>
        <label>Next evidence request<textarea rows={4} maxLength={1000} value={nextEvidenceRequest} onChange={event => setNextEvidenceRequest(event.target.value)} /></label>
      </div>
      <label>Human assessment reviewer token (session only)<input type="password" autoComplete="off" value={token} onChange={event => { setToken(event.target.value); setReviewerAssurance(null); }} disabled={checkingReviewer} /></label>
      <button className="outline-btn" type="button" disabled={checkingReviewer || !token.trim()} onClick={() => void checkReviewer()}>{checkingReviewer ? 'Checking reviewer…' : 'Check reviewer approval'}</button>
      <button className="outline-btn" type="button" disabled={checkingReviewer || !token.trim() || !scope} onClick={() => void loadLatest()}>{loadingHistory ? 'Loading human history…' : 'Load latest human assessment'}</button>
      <p className="note-small">To correct an existing assessment after reopening or running a baseline, load the latest human revision for this exact scope. Requires private history access. Unsaved drafts require confirmation before replacement.</p>
      {historyMessage && <p role="status">{historyMessage}</p>}
      {reviewerAssurance && <p role="status">{reviewerStatusLabel[reviewerAssurance.status]} · checked for this claim category. Directory approval is an operator attestation, not independent identity certification.</p>}
      <label>Conflict of interest declaration<select value={session.value.conflictDeclaration || 'not_declared'} onChange={event => session.set(previous => ({ ...previous, conflictDeclaration: event.target.value as ConflictDeclaration }))}><option value="not_declared">Not declared</option><option value="none_declared">I declare no known conflict</option><option value="conflict_declared">I have a conflict of interest</option></select></label>
      <label className="case-tool-check"><input type="checkbox" checked={checkPublicReferences} onChange={event => setCheckPublicReferences(event.target.checked)} />Check public publisher references when saving (UNEP / IEA allowlist only).</label>
      <p className="note-small">Enable only for public URLs. No document content is stored or republished. Other hosts, redirects, failed downloads and restricted addresses stay unchecked. An expected digest is your declaration, not issuer authentication.</p>
      <label className="case-tool-check"><input type="checkbox" checked={publicSummaryConsent} onChange={event => setPublicSummaryConsent(event.target.checked)} />I authorize a public redacted summary of this revision.</label>
      <p className="note-small">Public fields: source, claim category, outcome, period, dataset commitment, evidence counts and assurance statuses. Claim wording, recipient, names, notes and URLs stay private. Consent applies to this revision. A new consented revision replaces the prior public summary for the same scope and claim; a private revision does not change it. Withdrawal controls are in Reports. Consent and retrieval choices are not recovered from drafts.</p>
      <label className="case-tool-check"><input type="checkbox" checked={inspected} onChange={event => setInspected(event.target.checked)} />I inspected the source material and checked its relevance to this source, claim and period.</label>
      <button className="primary-btn" type="submit" disabled={saving || checkingReviewer || !scope || !capability?.humanReviewConfigured || !token.trim() || !inspected || claimText.trim().length < 20 || rationale.trim().length < 20}>{saving ? 'Saving determination…' : previous ? 'Save revised human determination' : 'Save human determination'}</button>
    </fieldset></form>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {previous && <div className="human-saved-result" role="status"><strong>Human determination saved · {currentAudit!.result.replaceAll('_', ' ')}</strong><p>{currentAudit!.reason}</p><small>Reviewer {previous.reviewerId} · revision {currentAudit!.revision} · private. Rules coverage: {previous.baseline.result.replaceAll('_', ' ')}.</small><p>{previous.nextEvidenceRequest ? `Next evidence request: ${previous.nextEvidenceRequest}` : 'No next evidence request recorded.'}</p>{previous.nextEvidenceRequest && <button type="button" className="outline-btn" onClick={() => requestAssessmentFollowUp(currentAudit!)}>Add saved request to follow-up</button>}</div>}
    {previous && <AssessmentTrustPanel key={currentAudit!.auditId} audit={currentAudit!} />}
    <p className="note-small">Supported and contradicted decisions require an appropriately typed, dated reference matching this scope. A human may resolve conflicting references with a stated rationale. These checks do not certify authenticity, equipment repair or reduced emissions.</p>
  </section>;
}
