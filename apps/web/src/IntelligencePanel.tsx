import { useEffect, useState } from 'react';
import type { AuditResult, ClaimType } from '@methane/shared';
import { canSubmitHumanReview, type IntelligenceCapability } from './reviewer-capability';

type Insight = {
  sourceId: string;
  priorityScore: number;
  priorityBand: string;
  observationCount: number;
  numericFluxObservationCount: number;
  missingFluxObservationCount: number;
  medianObservedFluxKgHr: number | null;
  medianObservationUncertaintyKgHr: number | null;
  uniqueObservationDates: number;
  observedPersistency: number | null;
  observedPersistencyStd: number | null;
  anomalyAnalysis: {
    methodVersion: string;
    status: 'insufficient_observations' | 'insufficient_temporal_coverage' | 'insufficient_scale' | 'potential_anomalies' | 'no_candidates_flagged';
    reason: string;
    minimumNumericObservations: number;
    minimumDistinctObservationDates: number;
    numericObservationCount: number;
    distinctNumericObservationDates: number;
    baselineMedianFluxKgHr: number | null;
    medianAbsoluteDeviationKgHr: number | null;
    robustScaleKgHr: number | null;
    scaleBasis: string;
    thresholdRule: string;
    flaggedObservations: { id: string; date: string; fluxKgHr: number; uncertaintyKgHr: number | null; deviationFromMedianKgHr: number; thresholdKgHr: number }[];
    limitation: string;
  };
  observedPersistencyCategory?: string | null;
  emissionStatus?: string | null;
  dataSufficiency: string;
  reasons: string[];
  forecast: { status: string; reason: string };
};
type Payload = { snapshot: { modelVersion: string; datasetSnapshotId: string | null; linkedObservationCount: number; sourceDataset: string | null; sourceProvider: string | null; datasetLicense: string | null; catalogUrl: string | null; datasetAttribution: string | null; upstreamArchiveSha256?: string | null; snapshotSha256: string; inputFileSha256: string; generatedAt: string; trainedModel: boolean; limitations: string[] }; insight: Insight | null };
type PanelState = 'loading' | 'ready' | 'unavailable';
const api = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export default function IntelligencePanel({ sourceId, claimType, synthetic, documentAssessmentAllowed, currentAudit, onAssessment, capability, capabilityLoading, capabilityError, onRetryCapability }: { sourceId: string; claimType: ClaimType; synthetic: boolean; documentAssessmentAllowed: boolean; currentAudit: AuditResult | null; onAssessment: (result: AuditResult) => void; capability: IntelligenceCapability | null; capabilityLoading: boolean; capabilityError?: string; onRetryCapability: () => void }) {
  const [insights, setInsights] = useState<Payload | null>(null);
  const [insightState, setInsightState] = useState<PanelState>('loading');
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentToPublishCitations, setConsentToPublishCitations] = useState(false);
  const [aiAccessToken, setAiAccessToken] = useState('');
  const [humanAccessToken, setHumanAccessToken] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewerInspectedSource, setReviewerInspectedSource] = useState(false);
  const [publishReviewedReport, setPublishReviewedReport] = useState(false);
  const [generated, setGenerated] = useState<AuditResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGenerated(null);
    setFailure(null);
    setPublishReviewedReport(false);
    setDocumentText('');
    setDocumentTitle('');
    setDocumentUrl('');
    setConsent(false);
    setConsentToPublishCitations(false);
    setInsights(null);
    setInsightState(synthetic ? 'ready' : 'loading');
    if (!synthetic) {
      fetch(`${api}/api/intelligence/insights?sourceId=${encodeURIComponent(sourceId)}`)
        .then(async response => {
          if (!response.ok) throw new Error('Snapshot unavailable');
          return response.json() as Promise<Payload>;
        })
        .then(data => { if (!cancelled) { setInsights(data); setInsightState('ready'); } })
        .catch(() => { if (!cancelled) setInsightState('unavailable'); });
    }
    return () => { cancelled = true; };
  }, [sourceId, synthetic]);

  useEffect(() => {
    setGenerated(currentAudit?.sourceId === sourceId && currentAudit.bundle.schemaVersion === 3 ? currentAudit : null);
    setPublishReviewedReport(false);
    setReviewerInspectedSource(false);
  }, [currentAudit, sourceId]);

  const assessmentAllowed = !synthetic && (documentAssessmentAllowed || insights?.insight?.sourceId === sourceId);

  async function parseResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload as T;
  }

  async function assess() {
    if (!assessmentAllowed || synthetic || !consent || !aiAccessToken.trim() || !documentTitle.trim() || documentText.trim().length < 80 || !capability?.documentModelConfigured) return;
    setLoading(true); setFailure(null);
    try {
      const response = await fetch(`${api}/api/intelligence/assessments`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiAccessToken}` },
        body: JSON.stringify({ sourceId, claimType, consentToExternalProcessing: true,
          consentToPublishCitations,
          documents: [{ id: 'submitted-excerpt-01', title: documentTitle.trim(), text: documentText.trim(), ...(documentUrl.trim() ? { sourceUrl: documentUrl.trim() } : {}) }] }),
      });
      const payload = await parseResponse<{ audit: AuditResult }>(response);
      setGenerated(payload.audit); onAssessment(payload.audit); setReviewNote('');
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Assessment failed'); }
    finally { setLoading(false); }
  }

  async function review(status: 'approved' | 'rejected' | 'needs_more_evidence') {
    if (!generated || generated.bundle.intelligence?.reviewStatus !== 'unreviewed' || !humanAccessToken.trim() || reviewNote.trim().length < 12 || (status === 'approved' && (!reviewerInspectedSource || quotes.length === 0))) return;
    setReviewing(true); setFailure(null);
    try {
      const response = await fetch(`${api}/api/audits/${encodeURIComponent(generated.auditId)}/review`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanAccessToken}` },
        body: JSON.stringify({ status, note: reviewNote.trim(), sourceInspected: status === 'approved' && reviewerInspectedSource, publishCitations: status === 'approved' && publishReviewedReport }),
      });
      const payload = await parseResponse<{ audit: AuditResult }>(response);
      setGenerated(payload.audit); onAssessment(payload.audit);
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Review failed'); }
    finally { setReviewing(false); }
  }

  async function anchorReviewed() {
    if (!generated || generated.bundle.intelligence?.reviewStatus === 'unreviewed' || !humanAccessToken.trim()) return;
    if (!window.confirm('This submits a transaction using the configured server signer and may spend Sepolia test ETH. Continue?')) return;
    setAnchoring(true); setFailure(null);
    try {
      const response = await fetch(`${api}/api/audits/${encodeURIComponent(generated.auditId)}/anchor`, {
        method: 'POST', headers: { authorization: `Bearer ${humanAccessToken}` },
      });
      const payload = await parseResponse<AuditResult>(response);
      setGenerated(payload); onAssessment(payload);
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Anchoring failed'); }
    finally { setAnchoring(false); }
  }

  const insight = insights?.insight;
  const reviewStatus = generated?.bundle.intelligence?.reviewStatus;
  const citationPublication = generated?.bundle.intelligence?.citationPublication;
  const authorAllowedPublication = citationPublication?.authorConsent === true;
  const reviewLabel = reviewStatus === 'approved' ? 'accepted'
    : reviewStatus === 'rejected' ? 'rejected'
      : reviewStatus === 'needs_more_evidence' ? 'more evidence requested'
        : reviewStatus === 'unreviewed' ? 'unreviewed' : 'status unavailable';
  const quotes = generated?.bundle.intelligence?.quotations || [];
  const observationTimeline = generated?.bundle.intelligence?.observationTimeline || [];
  const canReview = canSubmitHumanReview(capability, humanAccessToken, reviewNote, reviewing);
  const canApprove = canReview && reviewerInspectedSource && quotes.length > 0;
  const anomaly = insight?.anomalyAnalysis;
  const anomalyLabel = anomaly?.status === 'potential_anomalies' ? 'Review candidates'
    : anomaly?.status === 'no_candidates_flagged' ? 'No candidates crossed threshold'
      : anomaly?.status === 'insufficient_observations' ? 'Insufficient observations'
        : anomaly?.status === 'insufficient_temporal_coverage' ? 'Insufficient date coverage'
          : anomaly?.status === 'insufficient_scale' ? 'Insufficient spread information' : '';
  return <section className="panel intelligence-panel" id="intelligence" aria-label="Evidence and predictive intelligence">
    <div className="intelligence-heading"><div><small>CLIMATE INTELLIGENCE / RESEARCH PROTOTYPE</small><h2>Evidence & Investigation Intelligence</h2><p>Historical observations, source metadata, and document-grounded suggestions with human review.</p></div><span className="intel-status">{capabilityLoading ? 'CHECKING SERVICE STATUS' : capability?.documentModelConfigured ? 'DOCUMENT AI AVAILABLE' : 'DOCUMENT AI NOT CONFIGURED'}</span></div>
    <div className="intel-grid">
      <div className="intel-card"><div className="intel-section-label">INVESTIGATION PRIORITY <span>Heuristic, not a forecast</span></div>
        {insightState === 'loading' && <p className="intel-empty" role="status">Checking the versioned intelligence snapshot…</p>}
        {insightState === 'unavailable' && <p className="intel-warning" role="status">The intelligence snapshot is unavailable or does not match the pinned MARS data. Rebuild it from the checked-in snapshot before using its ranking.</p>}
        {insightState === 'ready' && !insight && <p className="intel-empty">No analysis row exists for this source in the pinned snapshot. A map location alone is not sufficient for ranking.</p>}
        {insight && <><div className="intel-score"><strong>{insight.priorityScore.toFixed(1)}<small>/ 80</small></strong><span className={`intel-band band-${insight.priorityBand}`}>{insight.priorityBand} priority</span></div>
          <div className="intel-data"><div><small>Recorded observations</small><b>{insight.observationCount}</b></div><div><small>Observed dates</small><b>{insight.uniqueObservationDates}</b></div><div><small>Numeric flux / missing</small><b>{insight.numericFluxObservationCount} / {insight.missingFluxObservationCount}</b></div><div><small>Median observed flux</small><b>{insight.medianObservedFluxKgHr === null ? 'Not available' : `${insight.medianObservedFluxKgHr.toLocaleString()} kg/h`}</b></div><div><small>Median uncertainty</small><b>{insight.medianObservationUncertaintyKgHr === null ? 'Not reported' : `${insight.medianObservationUncertaintyKgHr.toLocaleString()} kg/h`}</b></div><div><small>MARS persistency</small><b>{insight.observedPersistency === null ? 'Not reported' : `${insight.observedPersistency.toFixed(2)}${insight.observedPersistencyCategory ? ` · ${insight.observedPersistencyCategory}` : ''}`}</b></div></div>
          {anomaly && <div className={`intel-anomaly anomaly-${anomaly.status}`} role="status">
            <div className="intel-anomaly-heading"><b>Historical outlier screen</b><span>{anomalyLabel}</span></div>
            <p>{anomaly.reason}</p>
            <div className="intel-anomaly-meta"><span>{anomaly.numericObservationCount} numeric values across {anomaly.distinctNumericObservationDates} dates</span><span>Baseline median {anomaly.baselineMedianFluxKgHr === null ? 'unavailable' : `${anomaly.baselineMedianFluxKgHr.toLocaleString()} kg/h`}</span><span>Robust scale {anomaly.robustScaleKgHr === null ? 'unavailable' : `${anomaly.robustScaleKgHr.toLocaleString()} kg/h`} · {anomaly.scaleBasis.replaceAll('_', ' ')}</span></div>
            {anomaly.flaggedObservations.length > 0 && <ul className="intel-anomaly-list">{anomaly.flaggedObservations.map(point => <li key={point.id}><b>{point.id}</b><span>{point.date} · {point.fluxKgHr.toLocaleString()} kg/h{point.uncertaintyKgHr === null ? ' · uncertainty not reported' : ` ± ${point.uncertaintyKgHr.toLocaleString()} kg/h`}</span><small>Deviation {point.deviationFromMedianKgHr.toLocaleString()} kg/h · threshold {point.thresholdKgHr.toLocaleString()} kg/h</small></li>)}</ul>}
            <details className="intel-anomaly-method"><summary>Screening rule and minimum data</summary><p>{anomaly.thresholdRule}</p><p>Requires at least {anomaly.minimumNumericObservations} numeric observations across {anomaly.minimumDistinctObservationDates} distinct dates. Version {anomaly.methodVersion}.</p></details>
            <p className="intel-anomaly-limit">{anomaly.limitation}</p>
          </div>}
          <ul>{insight.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          <p className="intel-disclaimer">No future emission probability is calculated. Dataset {insights?.snapshot.datasetSnapshotId || 'snapshot unavailable'} · {insights?.snapshot.linkedObservationCount.toLocaleString()} explicitly linked observations · {insights?.snapshot.datasetLicense || 'license unavailable'} · {insights?.snapshot.modelVersion}. Upstream archive SHA-256 {insights?.snapshot.upstreamArchiveSha256?.slice(0,14) || 'unavailable'}… · analysis snapshot SHA-256 {insights?.snapshot.snapshotSha256.slice(0,14)}…{insights?.snapshot.catalogUrl ? <> · <a href={insights.snapshot.catalogUrl} target="_blank" rel="noreferrer">{insights.snapshot.sourceProvider || 'MARS dataset source'}</a></> : null}</p>
        </>}
      </div>
      <div className="intel-card"><div className="intel-section-label">AI DOCUMENT ASSESSMENT <span>Optional · reviewer required</span></div>
        <p className="intel-disclaimer">Submit an excerpt you are authorized to process. It is sent to the configured provider only after opt-in. Full excerpts are not persisted; exact cited passages and document hashes are retained in the versioned report. MARS map metadata is not mitigation evidence; the system does not authenticate the document or prove physical mitigation.</p>
        <label>Source document title<input value={documentTitle} maxLength={160} onChange={event=>setDocumentTitle(event.target.value)} placeholder="Operator response / field inspection report"/></label>
        <label>Document URL (optional)<input type="url" value={documentUrl} onChange={event=>setDocumentUrl(event.target.value)} placeholder="https://official-source.example/report"/></label>
        <label>Authorized document excerpt<textarea rows={4} maxLength={8000} value={documentText} onChange={event=>setDocumentText(event.target.value)} placeholder="Paste the exact passage that relates to the selected claim…"/></label>
        <label>Assessment access token (session only)<input type="password" autoComplete="off" value={aiAccessToken} onChange={event=>setAiAccessToken(event.target.value)} placeholder="AI assessment token"/></label>
        <label className="intel-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/> I am authorized to process this text and consent to transmission to the configured AI provider.</label>
        <label className="intel-consent"><input type="checkbox" checked={consentToPublishCitations} onChange={event=>setConsentToPublishCitations(event.target.checked)}/> I separately permit the exact cited passages and submitted document title/URL to be made public later, only if a human reviewer approves and chooses publication.</label>
        <button type="button" className="intel-action" disabled={!assessmentAllowed || synthetic || !consent || !capability?.documentModelConfigured || !aiAccessToken.trim() || !documentTitle.trim() || documentText.trim().length < 80 || loading} onClick={()=>void assess()}>{loading ? 'Assessing evidence…' : 'Assess documented claim'}</button>
        {synthetic && <p className="intel-warning">Document assessment is disabled for synthetic DEMO sources.</p>}
        {!synthetic && !assessmentAllowed && insightState === 'loading' && <p className="intel-empty" role="status">Confirming that this source exists in the pinned server snapshot…</p>}
        {!synthetic && !assessmentAllowed && insightState === 'unavailable' && <p className="intel-warning">The pinned server snapshot could not validate this source. A local map file alone does not authorize document assessment.</p>}
        {!synthetic && !assessmentAllowed && insightState === 'ready' && <p className="intel-warning">This source is not in the pinned server snapshot or curated casebook. A map marker alone is not an auditable document case.</p>}
        {assessmentAllowed && !documentAssessmentAllowed && <p className="intel-disclaimer">This source is pinned in the full MARS snapshot. Attach an authorized document excerpt; source and plume metadata alone cannot support a mitigation claim.</p>}
        {capabilityLoading && <p className="intel-empty" role="status">Checking server-side AI and reviewer configuration…</p>}
        {capabilityError && <p className="intel-warning" role="alert">Service configuration could not be checked: {capabilityError} <button type="button" className="intel-secondary-action" onClick={onRetryCapability}>Retry check</button></p>}
        {!capabilityLoading && !capabilityError && !capability?.documentModelConfigured && <p className="intel-warning">Document AI is disabled until server-side provider settings and AI_REVIEW_TOKEN are configured. The deterministic baseline remains available.</p>}
        {!capabilityLoading && !capabilityError && generated?.bundle.intelligence?.reviewStatus === 'unreviewed' && !capability?.humanReviewConfigured && <p className="intel-warning">Human review is disabled until a server-side reviewer token and reviewer identity are configured.</p>}
        {failure && <p className="intel-warning" role="alert">{failure}</p>}
        {generated && <div className="intel-result"><b>{reviewStatus === 'unreviewed' ? 'AI suggestion' : `Human review: ${reviewLabel}`} · {generated.result.replaceAll('_', ' ')}</b><p>{generated.reason}</p><small>Revision {generated.revision} · {quotes.length} exact validated quotation(s) · {reviewLabel} · report {citationPublication?.status === 'public' ? 'public' : 'private'}{citationPublication?.status === 'public' ? ' (submitter and reviewer publication consent recorded)' : ''} · bundle SHA-256 {generated.bundleHash} · dataset {generated.bundle.intelligence?.datasetSnapshotId || generated.bundle.provenance?.snapshotId || 'snapshot unavailable'}{generated.bundle.intelligence?.datasetInputSha256 ? ` · input SHA-256 ${generated.bundle.intelligence.datasetInputSha256}` : ''}{generated.bundle.intelligence?.investigationSnapshotSha256 ? ` · analysis SHA-256 ${generated.bundle.intelligence.investigationSnapshotSha256}` : ''}</small>
          {observationTimeline.length > 0 && <details className="intel-observations"><summary>Historical observations bound to this report ({observationTimeline.length})</summary><ol>{observationTimeline.map(item=><li key={item.id}><b>{item.id}</b><span>{item.observedAt}</span></li>)}</ol><p>These are discrete observation timestamps from the pinned dataset. Missing dates do not mean zero emissions.</p></details>}
          {quotes.map((quote, index) => {
            const doc = generated.bundle.intelligence?.documentDigests.find(item => item.id === quote.documentId);
            return <blockquote key={`${quote.documentId}-${index}`}><b>{doc?.title || quote.documentId}</b><p>“{quote.quote}”</p><small>Quote SHA-256 {quote.quoteSha256}{doc?.sourceUrl ? <> · <a href={doc.sourceUrl} target="_blank" rel="noreferrer">Open submitted source</a></> : ''}</small></blockquote>;
          })}
          {reviewStatus === 'unreviewed' && <div className="intel-review-controls"><label>Human reviewer token (session only)<input type="password" autoComplete="off" value={humanAccessToken} onChange={event=>setHumanAccessToken(event.target.value)} placeholder="Reviewer access token"/></label><label>Review note<input value={reviewNote} maxLength={1000} onChange={event=>setReviewNote(event.target.value)} placeholder="Explain the evidence decision (at least 12 characters)"/></label><label className="intel-consent"><input type="checkbox" checked={reviewerInspectedSource} onChange={event=>setReviewerInspectedSource(event.target.checked)}/> I inspected the original document or source context. I understand the full submitted excerpt is not retained here and approval does not prove physical mitigation.</label>{authorAllowedPublication ? <label className="intel-consent"><input type="checkbox" checked={publishReviewedReport} onChange={event=>setPublishReviewedReport(event.target.checked)}/> I authorize public access to this complete reviewed report, including its exact citations and my review note. This is separate from the submitter's citation consent.</label> : <p className="intel-disclaimer">The submitter did not permit citation publication, so this report can only remain private.</p>}{quotes.length === 0 && <p className="intel-warning">Approval is disabled because no exact document quotations passed validation.</p>}<div><button type="button" className="intel-action" disabled={!canApprove} onClick={()=>void review('approved')}>{reviewing ? 'Saving review…' : publishReviewedReport ? 'Accept and publish report' : 'Accept privately'}</button><button type="button" className="intel-secondary-action" disabled={!canReview} onClick={()=>void review('rejected')}>Reject suggestion</button><button type="button" className="intel-secondary-action" disabled={!canReview} onClick={()=>void review('needs_more_evidence')}>Request more evidence</button></div></div>}
          {reviewStatus && reviewStatus !== 'unreviewed' && !generated.anchored && capability?.chainConfigured && <button type="button" className="intel-action" disabled={!capability.humanReviewConfigured || !humanAccessToken.trim() || anchoring} onClick={()=>void anchorReviewed()}>{anchoring ? 'Submitting receipt…' : 'Anchor reviewed report to Sepolia'}</button>}
          {generated.anchored && <p className="intel-disclaimer">Receipt recorded for this revision. It verifies digest integrity and chronology, not methane repair.</p>}
        </div>}
      </div>
    </div>
  </section>;
}
