import { useEffect, useMemo, useRef, useState } from 'react';
import type { AuditResult, ClaimType } from '@methane/shared';
import type { MarsObservation } from './mars';
import { canSubmitHumanReview, type IntelligenceCapability } from './reviewer-capability';
import { readPreparedEvidenceFile, type PreparedDocument } from './prepared-evidence';
import DocumentRightsSummary from './DocumentRightsSummary';
import { mergeAnchorResponse, type AnchorResponse } from './anchor-result';
import { aggregateObservedFluxPoints, layoutObservedFluxPoints } from './observed-flux-chart';
import { makeRecordRecurrenceView, type RecordRecurrenceForecast, type RecordRecurrenceModel } from './record-recurrence-view';
import PublisherIndicatorComparison, { type PublisherIndicatorComparisonData } from './PublisherIndicatorComparison';

type ObservedFluxTrend = {
  methodVersion: string;
  status: 'insufficient_observations' | 'insufficient_temporal_coverage' | 'descriptive_trend';
  reason: string;
  minimumNumericObservationDates: number;
  minimumSpanDays: number;
  numericObservationDates: number;
  spanDays: number;
  pairwiseSlopeCount: number;
  slopeKgHrPer30Days: number | null;
  positivePairwiseSlopeShare: number | null;
  firstObservationDate: string | null;
  lastObservationDate: string | null;
  firstObservedMedianFluxKgHr: number | null;
  lastObservedMedianFluxKgHr: number | null;
  medianReportedUncertaintyKgHr: number | null;
  limitation: string;
};

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
  observedFluxTrend?: ObservedFluxTrend;
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
  forecast: { status: string; reason: string; missingRequirements?: string[] };
  recordRecurrenceForecast?: RecordRecurrenceForecast;
};
type Payload = { snapshot: { modelVersion: string; datasetSnapshotId: string | null; linkedObservationCount: number; sourceDataset: string | null; sourceProvider: string | null; datasetLicense: string | null; catalogUrl: string | null; datasetAttribution: string | null; upstreamArchiveSha256?: string | null; snapshotSha256: string; inputFileSha256: string; generatedAt: string; trainedModel: boolean; limitations: string[]; recordRecurrenceModel?: RecordRecurrenceModel; publisherIndicatorComparison?: PublisherIndicatorComparisonData }; insight: Insight | null };
type PanelState = 'loading' | 'ready' | 'unavailable';
const api = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function ObservedFluxTrendView({ trend, forecast, observations }: { trend: ObservedFluxTrend; forecast: Insight['forecast']; observations: MarsObservation[] }) {
  const dailyPoints = useMemo(() => aggregateObservedFluxPoints(observations), [observations]);
  const plotted = useMemo(() => layoutObservedFluxPoints(dailyPoints), [dailyPoints]);
  const maximumFlux = Math.max(0, ...dailyPoints.map(point => point.medianFluxKgHr));
  const firstPoint = dailyPoints[0];
  const lastPoint = dailyPoints.at(-1);
  const matchesSnapshot = dailyPoints.length === trend.numericObservationDates
    && (firstPoint?.date || null) === trend.firstObservationDate
    && (lastPoint?.date || null) === trend.lastObservationDate
    && (firstPoint?.medianFluxKgHr ?? null) === trend.firstObservedMedianFluxKgHr
    && (lastPoint?.medianFluxKgHr ?? null) === trend.lastObservedMedianFluxKgHr;
  const slope = trend.slopeKgHrPer30Days;
  const slopeLabel = slope === null
    ? trend.status === 'insufficient_observations'
      ? `Need ${trend.minimumNumericObservationDates} numeric dates`
      : `Need ${trend.minimumSpanDays}-day coverage`
    : `${slope > 0 ? '+' : ''}${slope.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg/h per 30 days`;
  const requirementLabels: Record<string, string> = {
    complete_observation_opportunities: 'Complete sensor observation opportunities and non-detections',
    independent_future_outcome_labels: 'Independent future physical-emission outcome labels',
    held_out_temporal_validation: 'Prospective temporal validation for physical-emission outcomes',
  };

  return <section className="intel-trend" aria-label="Observed flux trend analysis">
    <div className="intel-trend-heading"><div><strong>Observed flux pattern</strong><span>Descriptive historical slope · not a forecast</span></div><b>{slopeLabel}</b></div>
    {plotted.length > 0 && matchesSnapshot ? <div className="intel-trend-plot">
      <div className="intel-trend-units">Reported flux · kg/h</div>
      <svg viewBox="0 0 320 100" role="img" aria-labelledby="observed-flux-chart-title">
        <title id="observed-flux-chart-title">Daily median flux at discrete historical satellite observation dates</title>
        <line className="intel-trend-grid" x1="24" y1="8" x2="312" y2="8" />
        <line className="intel-trend-grid" x1="24" y1="45" x2="312" y2="45" />
        <line className="intel-trend-axis" x1="24" y1="82" x2="312" y2="82" />
        <text className="intel-trend-axis-label" x="0" y="11">{maximumFlux.toLocaleString(undefined, { maximumFractionDigits: 0 })}</text>
        <text className="intel-trend-axis-label" x="14" y="85">0</text>
        {plotted.map(point => <circle className="intel-trend-point" key={point.date} cx={point.x} cy={point.y} r="2">
          <title>{`${point.date}: median ${point.medianFluxKgHr.toLocaleString()} kg/h across ${point.observationCount} observation(s)`}${point.medianReportedUncertaintyKgHr === null ? '; reported uncertainty unavailable' : `; median reported uncertainty ${point.medianReportedUncertaintyKgHr.toLocaleString()} kg/h`}</title>
        </circle>)}
      </svg>
      <div className="intel-trend-date-row"><span>{firstPoint?.date}</span><span>{lastPoint?.date}</span></div>
    </div> : <p className="intel-empty">{matchesSnapshot ? 'No numeric historical flux points are available for this source.' : 'Chart hidden because browser observations do not match the versioned trend summary.'}</p>}
    <p className="intel-trend-summary">{trend.reason} · {trend.numericObservationDates} numeric dates across {trend.spanDays} days. The median reported uncertainty is {trend.medianReportedUncertaintyKgHr === null ? 'not available' : `${trend.medianReportedUncertaintyKgHr.toLocaleString()} kg/h`}; it is not a prediction interval.</p>
    <details className="intel-trend-method"><summary>Why observed flux is not forecast</summary>
      <p>{forecast.reason}</p>
      {trend.positivePairwiseSlopeShare !== null ? <p>{(trend.positivePairwiseSlopeShare * 100).toFixed(1)}% of pairwise date slopes were positive; this is a descriptive sign share, not a confidence score.</p> : null}
      {forecast.missingRequirements?.length ? <ul>{forecast.missingRequirements.map(requirement => <li key={requirement}>{requirementLabels[requirement] || requirement.replaceAll('_', ' ')}</li>)}</ul> : null}
      <p>{trend.limitation}</p>
    </details>
  </section>;
}

export default function IntelligencePanel({ sourceId, observations, claimType, synthetic, documentAssessmentAllowed, currentAudit, onAssessment, capability, capabilityLoading, capabilityError, onRetryCapability }: { sourceId: string; observations: MarsObservation[]; claimType: ClaimType; synthetic: boolean; documentAssessmentAllowed: boolean; currentAudit: AuditResult | null; onAssessment: (result: AuditResult) => void; capability: IntelligenceCapability | null; capabilityLoading: boolean; capabilityError?: string; onRetryCapability: () => void }) {
  const [insights, setInsights] = useState<Payload | null>(null);
  const [insightState, setInsightState] = useState<PanelState>('loading');
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [claimText, setClaimText] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null);
  const [rightsDeclared, setRightsDeclared] = useState<'' | 'owned' | 'explicit_permission'>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentToPublishCitations, setConsentToPublishCitations] = useState(false);
  const [consentToPublishClaim, setConsentToPublishClaim] = useState(false);
  const [aiAccessToken, setAiAccessToken] = useState('');
  const [humanAccessToken, setHumanAccessToken] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewerInspectedSource, setReviewerInspectedSource] = useState(false);
  const [publishReviewedReport, setPublishReviewedReport] = useState(false);
  const [publishReviewedClaimText, setPublishReviewedClaimText] = useState(false);
  const [generated, setGenerated] = useState<AuditResult | null>(null);
  const investigationContext = useRef(`${sourceId}\u0000${claimType}`);
  investigationContext.current = `${sourceId}\u0000${claimType}`;

  useEffect(() => {
    let cancelled = false;
    setGenerated(null);
    setFailure(null);
    setClaimText('');
    setPublishReviewedReport(false);
    setDocumentText('');
    setDocumentTitle('');
    setDocumentUrl('');
    setPreparedDocument(null);
    setImportStatus(null);
    setConsent(false);
    setConsentToPublishCitations(false);
    setConsentToPublishClaim(false);
    setPublishReviewedClaimText(false);
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
  }, [sourceId, claimType, synthetic]);

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

  async function importPreparedFile(file: File | undefined) {
    if (!file) return;
    const requestedContext = `${sourceId}\u0000${claimType}`;
    setImportStatus(null);
    try {
      const prepared = await readPreparedEvidenceFile(file, sourceId, claimType);
      if (investigationContext.current !== requestedContext) return;
      setPreparedDocument(prepared);
      setRightsDeclared(prepared.rightsDeclared);
      setDocumentTitle(prepared.title);
      setDocumentUrl(prepared.sourceUrl || '');
      setDocumentText(prepared.text);
      setConsent(false);
      setConsentToPublishCitations(false);
      setImportStatus(`Imported excerpt with ${prepared.selectedPages.length} selected-page hash(es). Verify publisher and rights independently; file hashes do not establish authenticity.`);
    } catch (error) {
      if (investigationContext.current !== requestedContext) return;
      setPreparedDocument(null);
      setImportStatus(error instanceof Error ? error.message : 'Invalid prepared evidence file');
    }
  }

  function clearPreparedProvenance() {
    if (preparedDocument) setImportStatus('Prepared-file provenance was cleared because a field was edited. Re-import the file to restore its digest metadata.');
    setPreparedDocument(null);
  }

  async function assess() {
    if (!assessmentAllowed || synthetic || claimText.trim().length < 20 || !consent || !rightsDeclared || !aiAccessToken.trim() || !documentTitle.trim() || documentText.trim().length < 80 || !capability?.documentModelConfigured) return;
    setLoading(true); setFailure(null);
    try {
      const response = await fetch(`${api}/api/intelligence/assessments`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiAccessToken}` },
        body: JSON.stringify({ sourceId, claimType, claimText: claimText.trim(), consentToExternalProcessing: true,
          consentToPublishCitations,
          consentToPublishClaim,
          documents: [{ id: preparedDocument?.id || 'submitted-excerpt-01', title: documentTitle.trim(), text: documentText.trim(), rightsDeclared, ...(documentUrl.trim() ? { sourceUrl: documentUrl.trim() } : {}), ...(preparedDocument ? { originalFileSha256: preparedDocument.originalFileSha256, selectedPages: preparedDocument.selectedPages } : {}) }] }),
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
        body: JSON.stringify({ status, note: reviewNote.trim(), sourceInspected: status === 'approved' && reviewerInspectedSource, publishCitations: status === 'approved' && publishReviewedReport, publishClaimText: status === 'approved' && publishReviewedReport && publishReviewedClaimText }),
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
      const payload = await parseResponse<AnchorResponse>(response);
      const updated = mergeAnchorResponse(generated, payload);
      setGenerated(updated); onAssessment(updated);
    } catch (error) { setFailure(error instanceof Error ? error.message : 'Anchoring failed'); }
    finally { setAnchoring(false); }
  }

  const insight = insights?.insight;
  const reviewStatus = generated?.bundle.intelligence?.reviewStatus;
  const citationPublication = generated?.bundle.intelligence?.citationPublication;
  const authorAllowedPublication = citationPublication?.authorConsent === true;
  const claimPublication = generated?.bundle.intelligence?.claimPublication;
  const authorAllowedClaimPublication = claimPublication?.authorConsent === true;
  const reviewLabel = reviewStatus === 'approved' ? 'accepted'
    : reviewStatus === 'rejected' ? 'rejected'
      : reviewStatus === 'needs_more_evidence' ? 'more evidence requested'
        : reviewStatus === 'unreviewed' ? 'unreviewed' : 'status unavailable';
  const quotes = generated?.bundle.intelligence?.quotations || [];
  const documentDigests = generated?.bundle.intelligence?.documentDigests || [];
  const observationTimeline = generated?.bundle.intelligence?.observationTimeline || [];
  const canReview = canSubmitHumanReview(capability, humanAccessToken, reviewNote, reviewing);
  const canApprove = canReview && reviewerInspectedSource && quotes.length > 0;
  const anomaly = insight?.anomalyAnalysis;
  const recurrence = makeRecordRecurrenceView(insight?.recordRecurrenceForecast, insights?.snapshot.recordRecurrenceModel);
  const recurrenceModel = insights?.snapshot.recordRecurrenceModel;
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
          {insight.observedFluxTrend && <ObservedFluxTrendView trend={insight.observedFluxTrend} forecast={insight.forecast} observations={observations} />}
          {recurrence && <section className="intel-recurrence" aria-label="Historical MARS archive record recurrence screening">
            <div className="intel-recurrence-heading"><div><strong>Historical MARS record recurrence</strong><span className="intel-recurrence-validation" role="note">{recurrence.validationStatus}</span></div><b>{recurrence.probabilityPercent}</b></div>
            <p className="intel-recurrence-target">{recurrence.targetLabel} · scored as of {recurrence.asOfDate}. Outcome means a later linked archive record for this source, not continuous observation.</p>
            <div className="intel-recurrence-metrics">
              <span><small>Temporal test</small><b>{recurrence.testOrigin} — {recurrence.testWindowEnd}</b></span>
              <span><small>Test cohort</small><b>{recurrence.testSourceCount.toLocaleString()} sources · {recurrence.positiveCount.toLocaleString()} recurred</b></span>
              <span><small>ROC AUC</small><b>{recurrence.rocAuc.toFixed(3)} · 95% CI {recurrence.rocAucLower95.toFixed(3)}–{recurrence.rocAucUpper95.toFixed(3)}</b></span>
              <span><small>Calibration</small><b>Brier {recurrence.brierScore.toFixed(3)} · ECE10 {recurrence.ece10.toFixed(3)}</b></span>
              <span><small>Top decile</small><b>{(recurrence.precisionAtTopDecile * 100).toFixed(1)}% precision · {recurrence.liftAtTopDecile.toFixed(2)}× lift</b></span>
              <span><small>Simple baseline</small><b>AUC {recurrence.baselineAuc.toFixed(3)} · model gain 95% CI {recurrence.baselineAucDeltaLower95.toFixed(3)}–{recurrence.baselineAucDeltaUpper95.toFixed(3)}</b></span>
            </div>
            <details className="intel-recurrence-method"><summary>Validation, uncertainty, and limitations</summary>
              <p>Training origins: 2021–2023; calibration: 2024; final retrospective time window: {recurrence.testOrigin}–{recurrence.testWindowEnd}. The final window was inspected during model development; this is same-snapshot temporal evidence, not a prospective or external validation.</p>
              <p>Brier skill {recurrence.brierSkillScore.toFixed(3)} (country-cluster bootstrap 95% lower bound {recurrence.brierSkillLower95.toFixed(3)}); ECE10 upper 95% bound {recurrence.ece10Upper95.toFixed(3)}. Top-decile precision 95% CI {(recurrence.precisionAtTopDecileLower95 * 100).toFixed(1)}–{(recurrence.precisionAtTopDecileUpper95 * 100).toFixed(1)}%; lift 95% CI {recurrence.liftAtTopDecileLower95.toFixed(2)}–{recurrence.liftAtTopDecileUpper95.toFixed(2)}×.</p>
              <p>Bootstrap resampled {recurrence.countryClusterCount} country clusters over {recurrence.bootstrapReplicates} fixed-seed replicates. The model improves test AUC over the recent-count baseline by {recurrence.baselineAucDeltaLower95.toFixed(3)}–{recurrence.baselineAucDeltaUpper95.toFixed(3)} at the 95% interval.</p>
            </details>
            <p className="intel-recurrence-limit">{recurrence.disclaimer}</p>
          </section>}
          {!recurrence && recurrenceModel?.status === 'not_available' && <p className="intel-recurrence-unavailable" role="status">No recurrence estimate is shown: {recurrenceModel.reason || 'the pinned snapshot did not pass the registered historical evaluation gates.'} The physical-emissions forecast remains unavailable.</p>}
          {insights?.snapshot.publisherIndicatorComparison && <PublisherIndicatorComparison comparison={insights.snapshot.publisherIndicatorComparison}/>}
          {anomaly && <div className={`intel-anomaly anomaly-${anomaly.status}`} role="status">
            <div className="intel-anomaly-heading"><b>Historical outlier screen</b><span>{anomalyLabel}</span></div>
            <p>{anomaly.reason}</p>
            <div className="intel-anomaly-meta"><span>{anomaly.numericObservationCount} numeric values across {anomaly.distinctNumericObservationDates} dates</span><span>Baseline median {anomaly.baselineMedianFluxKgHr === null ? 'unavailable' : `${anomaly.baselineMedianFluxKgHr.toLocaleString()} kg/h`}</span><span>Robust scale {anomaly.robustScaleKgHr === null ? 'unavailable' : `${anomaly.robustScaleKgHr.toLocaleString()} kg/h`} · {anomaly.scaleBasis.replaceAll('_', ' ')}</span></div>
            {anomaly.flaggedObservations.length > 0 && <ul className="intel-anomaly-list">{anomaly.flaggedObservations.map(point => <li key={point.id}><b>{point.id}</b><span>{point.date} · {point.fluxKgHr.toLocaleString()} kg/h{point.uncertaintyKgHr === null ? ' · uncertainty not reported' : ` ± ${point.uncertaintyKgHr.toLocaleString()} kg/h`}</span><small>Deviation {point.deviationFromMedianKgHr.toLocaleString()} kg/h · threshold {point.thresholdKgHr.toLocaleString()} kg/h</small></li>)}</ul>}
            <details className="intel-anomaly-method"><summary>Screening rule and minimum data</summary><p>{anomaly.thresholdRule}</p><p>Requires at least {anomaly.minimumNumericObservations} numeric observations across {anomaly.minimumDistinctObservationDates} distinct dates. Version {anomaly.methodVersion}.</p></details>
            <p className="intel-anomaly-limit">{anomaly.limitation}</p>
          </div>}
          <ul>{insight.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          <p className="intel-disclaimer">The source recurrence screen predicts a later linked archive record only; no future methane-emission probability is calculated. Dataset {insights?.snapshot.datasetSnapshotId || 'snapshot unavailable'} · {insights?.snapshot.linkedObservationCount.toLocaleString()} explicitly linked observations · {insights?.snapshot.datasetLicense || 'license unavailable'} · {insights?.snapshot.modelVersion}. Upstream archive SHA-256 {insights?.snapshot.upstreamArchiveSha256?.slice(0,14) || 'unavailable'}… · analysis snapshot SHA-256 {insights?.snapshot.snapshotSha256.slice(0,14)}…{insights?.snapshot.catalogUrl ? <> · <a href={insights.snapshot.catalogUrl} target="_blank" rel="noreferrer">{insights.snapshot.sourceProvider || 'MARS dataset source'}</a></> : null}</p>
        </>}
      </div>
      <div className="intel-card"><div className="intel-section-label">AI DOCUMENT ASSESSMENT <span>Optional · reviewer required</span></div>
        <p className="intel-disclaimer">State one exact, bounded claim before adding evidence. The claim and authorized excerpt are sent to the configured provider only after opt-in. Full excerpts are not persisted; exact cited passages and document hashes are retained in the versioned report. MARS map metadata is not mitigation evidence; the system does not authenticate the document or prove physical mitigation.</p>
        <label>Exact claim to assess<textarea rows={3} maxLength={1_000} value={claimText} onChange={event=>{setClaimText(event.target.value);setGenerated(null);setPublishReviewedReport(false);setPublishReviewedClaimText(false);}} placeholder={`For ${sourceId}, the operator received the stated notification on [date].`} /></label>
        <p className="intel-disclaimer">Keep the claim source-specific and time-bounded. An action report, a missing later detection, or a MARS feedback field alone cannot establish physical mitigation.</p>
        <label>Import locally prepared evidence JSON (optional)<input type="file" accept=".json,application/json" onChange={event=>{ void importPreparedFile(event.target.files?.[0]); event.target.value = ''; }}/></label>
        {importStatus && <p className="intel-disclaimer" role="status">{importStatus}</p>}
        <p className="intel-disclaimer">Prepare authorized PDF/TXT excerpts with <code>python scripts/prepare_evidence.py</code>. Import runs locally in this browser and never sends the file or grants provider consent. Digest checks do not authenticate the source or establish scientific correctness.</p>
        <label>Source document title<input value={documentTitle} maxLength={160} onChange={event=>{setDocumentTitle(event.target.value);clearPreparedProvenance();}} placeholder="Operator response / field inspection report"/></label>
        <label>Document URL (optional)<input type="url" value={documentUrl} onChange={event=>{setDocumentUrl(event.target.value);clearPreparedProvenance();}} placeholder="https://official-source.example/report"/></label>
        <label>Document processing rights<select value={rightsDeclared} onChange={event=>setRightsDeclared(event.target.value as '' | 'owned' | 'explicit_permission')}><option value="">Choose your authorization…</option><option value="owned">I own this document or excerpt</option><option value="explicit_permission">I have explicit permission to process it</option></select></label>
        <p className="intel-disclaimer">This is a submitter declaration. MethaneResponse does not independently verify copyright, permission, source authenticity, or completeness.</p>
        <label>Authorized document excerpt<textarea rows={4} maxLength={8000} value={documentText} onChange={event=>{setDocumentText(event.target.value);clearPreparedProvenance();}} placeholder="Paste the exact passage that relates to the selected claim…"/></label>
        <form className="intel-token-form" onSubmit={event=>event.preventDefault()}><label>Assessment access token (session only)<input type="password" autoComplete="off" value={aiAccessToken} onChange={event=>setAiAccessToken(event.target.value)} placeholder="AI assessment token"/></label></form>
        <label className="intel-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/> I am authorized to process this text and consent to transmission to the configured AI provider.</label>
        <label className="intel-consent"><input type="checkbox" checked={consentToPublishCitations} onChange={event=>setConsentToPublishCitations(event.target.checked)}/> I separately permit the exact cited passages and submitted document title/URL to be made public later, only if a human reviewer approves and chooses publication.</label>
        <label className="intel-consent"><input type="checkbox" checked={consentToPublishClaim} onChange={event=>setConsentToPublishClaim(event.target.checked)}/> I separately permit the exact claim wording above to be included in a public reviewed report; the reviewer must also choose to publish it.</label>
        <button type="button" className="intel-action" disabled={!assessmentAllowed || synthetic || claimText.trim().length < 20 || !consent || !rightsDeclared || !capability?.documentModelConfigured || !aiAccessToken.trim() || !documentTitle.trim() || documentText.trim().length < 80 || loading} onClick={()=>void assess()}>{loading ? 'Assessing evidence…' : 'Assess documented claim'}</button>
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
        {generated && <div className="intel-result"><b>{reviewStatus === 'unreviewed' ? 'AI suggestion' : `Human review: ${reviewLabel}`} · {generated.result.replaceAll('_', ' ')}</b>{generated.bundle.intelligence?.claimText && <div className="intel-claim-statement"><strong>Exact claim assessed</strong><p>{generated.bundle.intelligence.claimText}</p><small>Claim SHA-256 {generated.bundle.intelligence.claimTextSha256} · full-input SHA-256 {generated.bundle.intelligence.assessmentInputSha256}</small></div>}<p>{generated.reason}</p><small>Revision {generated.revision} · {quotes.length} exact validated quotation(s) · {reviewLabel} · report {citationPublication?.status === 'public' ? 'public' : 'private'}{citationPublication?.status === 'public' ? ' (submitter and reviewer citation consent recorded)' : ''} · bundle SHA-256 {generated.bundleHash} · dataset {generated.bundle.intelligence?.datasetSnapshotId || generated.bundle.provenance?.snapshotId || 'snapshot unavailable'}{generated.bundle.intelligence?.datasetInputSha256 ? ` · input SHA-256 ${generated.bundle.intelligence.datasetInputSha256}` : ''}{generated.bundle.intelligence?.investigationSnapshotSha256 ? ` · analysis SHA-256 ${generated.bundle.intelligence.investigationSnapshotSha256}` : ''}</small>
          {observationTimeline.length > 0 && <details className="intel-observations"><summary>Historical observations bound to this report ({observationTimeline.length})</summary><ol>{observationTimeline.map(item=><li key={item.id}><b>{item.id}</b><span>{item.observedAt}</span></li>)}</ol><p>These are discrete observation timestamps from the pinned dataset. Missing dates do not mean zero emissions.</p></details>}
          <DocumentRightsSummary documents={documentDigests}/>
          {quotes.map((quote, index) => {
            const doc = generated.bundle.intelligence?.documentDigests.find(item => item.id === quote.documentId);
            return <blockquote key={`${quote.documentId}-${index}`}><b>{doc?.title || quote.documentId}</b><p>“{quote.quote}”</p><small>Quote SHA-256 {quote.quoteSha256}{doc?.sourceUrl ? <> · <a href={doc.sourceUrl} target="_blank" rel="noreferrer">Open submitted source</a></> : ''}</small></blockquote>;
          })}
          {reviewStatus === 'unreviewed' && <div className="intel-review-controls"><form onSubmit={event=>event.preventDefault()}><label>Human reviewer token (session only)<input type="password" autoComplete="off" value={humanAccessToken} onChange={event=>setHumanAccessToken(event.target.value)} placeholder="Reviewer access token"/></label></form><label>Review note<input value={reviewNote} maxLength={1000} onChange={event=>setReviewNote(event.target.value)} placeholder="Explain the evidence decision (at least 12 characters)"/></label><label className="intel-consent"><input type="checkbox" checked={reviewerInspectedSource} onChange={event=>setReviewerInspectedSource(event.target.checked)}/> I inspected the original document or source context. I understand the full submitted excerpt is not retained here and approval does not prove physical mitigation.</label>{authorAllowedPublication ? <label className="intel-consent"><input type="checkbox" checked={publishReviewedReport} onChange={event=>{setPublishReviewedReport(event.target.checked);if(!event.target.checked)setPublishReviewedClaimText(false);}}/> I authorize public access to this reviewed report and its exact citations and my review note. This is separate from the submitter's citation consent.</label> : <p className="intel-disclaimer">The submitter did not permit citation publication, so this report can only remain private.</p>}{publishReviewedReport && generated.bundle.intelligence?.claimText && <>{authorAllowedClaimPublication ? <label className="intel-consent"><input type="checkbox" checked={publishReviewedClaimText} onChange={event=>setPublishReviewedClaimText(event.target.checked)}/> Include the exact claim wording in the public report.</label> : <p className="intel-disclaimer">The exact claim statement will remain private; its SHA-256 commitment remains in the published bundle.</p>}</>}{quotes.length === 0 && <p className="intel-warning">Approval is disabled because no exact document quotations passed validation.</p>}<div><button type="button" className="intel-action" disabled={!canApprove} onClick={()=>void review('approved')}>{reviewing ? 'Saving review…' : publishReviewedReport ? 'Accept and publish report' : 'Accept privately'}</button><button type="button" className="intel-secondary-action" disabled={!canReview} onClick={()=>void review('rejected')}>Reject suggestion</button><button type="button" className="intel-secondary-action" disabled={!canReview} onClick={()=>void review('needs_more_evidence')}>Request more evidence</button></div></div>}
          {reviewStatus && reviewStatus !== 'unreviewed' && !generated.anchored && capability?.chainConfigured && <button type="button" className="intel-action" disabled={!capability.humanReviewConfigured || !humanAccessToken.trim() || anchoring} onClick={()=>void anchorReviewed()}>{anchoring ? 'Submitting receipt…' : 'Anchor reviewed report to Sepolia'}</button>}
          {generated.anchored && <p className="intel-disclaimer">Receipt recorded for this revision. It verifies digest integrity and chronology, not methane repair.</p>}
        </div>}
      </div>
    </div>
  </section>;
}
