import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuditResult, ClaimType } from '@methane/shared';
import type { MarsObservation, MarsSource } from './mars';
import type { IntelligenceCapability } from './reviewer-capability';
import SourceCasePicker from './SourceCasePicker';

const EvidenceObservationPanel = lazy(() => import('./EvidenceObservationPanel'));
const IntelligencePanel = lazy(() => import('./IntelligencePanel'));

const stages = [
  { id: 'overview', label: 'Overview', description: 'Choose a claim and run the rules baseline.' },
  { id: 'observations', label: 'Observations', description: 'Inspect dated satellite records and provenance.' },
  { id: 'document-ai', label: 'Document AI', description: 'Assess authorized excerpts and review citations.' },
  { id: 'review', label: 'Review', description: 'Check the result before opening its report.' },
] as const;

type StageId = typeof stages[number]['id'];

type Props = {
  source: MarsSource;
  sources: MarsSource[];
  onSelectSource: (sourceId: string) => void;
  observations: MarsObservation[];
  realMode: boolean;
  sourceCanBeAudited: boolean;
  sourceHistoryLoading: boolean;
  sourceHistoryError?: string;
  retrySourceHistory: () => void;
  datasetUrl: string;
  datasetSnapshotId?: string;
  datasetRetrievedAt?: string;
  datasetLicense?: string;
  sourceArchiveHash?: string;
  onOpenGlobe: () => void;
  claim: ClaimType;
  claimLabels: Record<ClaimType, string>;
  claimDescriptions: Record<ClaimType, string>;
  onClaimChange: (claim: ClaimType) => void;
  audit: AuditResult | null;
  auditWarning: string;
  auditPending: boolean;
  auditError?: string;
  onRunAudit: () => void;
  documentAssessmentAllowed: boolean;
  intelligenceCapability: IntelligenceCapability | null;
  capabilityLoading: boolean;
  capabilityError?: string;
  onRetryCapability: () => void;
  onAssessment: (audit: AuditResult) => void;
  onOpenDocuments: () => void;
  onOpenReports: () => void;
  onOpenBlockchain: () => void;
};

export default function EvidenceAuditorWorkflow({
  source,
  sources,
  onSelectSource,
  observations,
  realMode,
  sourceCanBeAudited,
  sourceHistoryLoading,
  sourceHistoryError,
  retrySourceHistory,
  datasetUrl,
  datasetSnapshotId,
  datasetRetrievedAt,
  datasetLicense,
  sourceArchiveHash,
  onOpenGlobe,
  claim,
  claimLabels,
  claimDescriptions,
  onClaimChange,
  audit,
  auditWarning,
  auditPending,
  auditError,
  onRunAudit,
  documentAssessmentAllowed,
  intelligenceCapability,
  capabilityLoading,
  capabilityError,
  onRetryCapability,
  onAssessment,
  onOpenDocuments,
  onOpenReports,
  onOpenBlockchain,
}: Props) {
  const [activeStage, setActiveStage] = useState<StageId>('overview');
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(activeStage);

  useEffect(() => {
    setActiveStage('overview');
  }, [source.sourceId]);

  useEffect(() => {
    if (previousStage.current !== activeStage) stageHeadingRef.current?.focus();
    previousStage.current = activeStage;
  }, [activeStage]);

  const auditReviewStatus = audit?.bundle.schemaVersion === 3
    ? audit.bundle.intelligence?.reviewStatus?.replaceAll('_', ' ') || 'review status unavailable'
    : audit ? 'rules baseline · no human review recorded' : 'not assessed';
  const citedEvidence = audit?.bundle.citedEvidence || [];
  const activeIndex = stages.findIndex(stage => stage.id === activeStage);

  function stageStatus(stage: StageId) {
    if (stage === 'overview') return `${source.sourceId} selected`;
    if (stage === 'observations') {
      if (sourceHistoryLoading) return 'Verifying history';
      if (sourceHistoryError) return 'History unavailable';
      return `${observations.length.toLocaleString()} records`;
    }
    if (stage === 'document-ai') {
      if (capabilityLoading) return 'Checking service';
      return intelligenceCapability?.documentModelConfigured ? 'Provider available' : 'Optional · not configured';
    }
    return audit ? auditReviewStatus : 'Assessment pending';
  }

  function panel(stage: StageId, title: string, children: ReactNode) {
    return <section
      className="audit-stage-panel"
      role="tabpanel"
      id={`audit-stage-${stage}`}
      aria-labelledby={`audit-stage-tab-${stage}`}
      aria-label={title}
      hidden={activeStage !== stage}
    >{children}</section>;
  }

  return <div className="evidence-auditor-flow">
    <header className="audit-source-heading">
      <div><h2>Investigation · {source.sourceId}</h2><p>{source.region} · {realMode ? 'Historical UNEP MARS snapshot' : 'Synthetic demonstration'}</p></div>
      <SourceCasePicker sources={sources} selectedSource={source} onSelectSource={onSelectSource}/>
    </header>

    <nav className="audit-stage-nav" aria-label="Evidence audit steps">
      <ol>{stages.map((stage, index) => <li key={stage.id}>
        <button
          type="button"
          id={`audit-stage-tab-${stage.id}`}
          aria-current={activeStage === stage.id ? 'step' : undefined}
          aria-controls={`audit-stage-${stage.id}`}
          aria-label={`${stage.label}. ${stageStatus(stage.id)}`}
          onClick={() => setActiveStage(stage.id)}
        >
          <span className="audit-stage-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="audit-stage-copy"><strong>{stage.label}</strong><small>{stageStatus(stage.id)}</small></span>
        </button>
      </li>)}</ol>
    </nav>

    {panel('overview', 'Overview', <>
      <div className="audit-stage-heading"><div><h2 ref={activeStage === 'overview' ? stageHeadingRef : null} tabIndex={-1}>Choose a claim</h2><p>Select what you want to verify against the available source-linked evidence.</p></div><span className="audit-stage-source">{source.sourceId}</span></div>
      <section className="panel audit-overview-panel">
        <label className="field-small" htmlFor="claim-audit">CLAIM TO EVALUATE</label>
        <select id="claim-audit" className="claim-select" value={claim} onChange={event => onClaimChange(event.target.value as ClaimType)}>
          {(Object.keys(claimLabels) as ClaimType[]).map(type => <option key={type} value={type}>{claimLabels[type]}</option>)}
        </select>
        <p className="audit-claim-description">{claimDescriptions[claim]}</p>
        <button className="primary-btn run-btn" type="button" disabled={auditPending || !sourceCanBeAudited} onClick={onRunAudit}>
          {auditPending ? 'Assessing…' : 'Run rules baseline'}
        </button>
        {!sourceCanBeAudited && <p className="note-small" role="status">This source is not in the server-pinned snapshot or curated casebook, so its identifier cannot be audited. Select a server-backed source.</p>}
        {sourceCanBeAudited && realMode && !source.caseId && <p className="note-small">Global MARS source: the baseline may cite a linked detection. Notification and mitigation claims need attributable evidence.</p>}
        {auditError && <p role="alert" className="inline-error">{auditError}</p>}
        <div className={`audit-verdict-card ${audit?.result || 'empty'}`} aria-live="polite">
          <div><strong>{audit ? auditWarning : 'Awaiting assessment'}</strong><p>{audit?.reason || 'No assessment has been performed for the selected claim.'}</p><small>{audit ? 'Supported by cited evidence does not certify physical mitigation.' : 'Missing evidence is unknown, not proof that the claim is false.'}</small></div>
        </div>
      </section>
    </>)}

    {panel('observations', 'Observations', <>
      <div className="audit-stage-heading"><div><h2 ref={activeStage === 'observations' ? stageHeadingRef : null} tabIndex={-1}>Dated observations</h2><p>Inspect each reported overpass, its uncertainty and the source record.</p></div><span className="audit-stage-source">{observations.length.toLocaleString()} records</span></div>
      <section className="panel evidence-viewer audit-observations-panel">
        <div className="viewer-head"><div><strong>{source.sourceId} · Evidence inventory</strong><small>{realMode ? 'UNEP MARS historical observations' : 'Synthetic test fixture'} · {source.observations?.length ?? source.plumeCount ?? 0} plume records · {(source.externalEvidence?.length || 0).toLocaleString()} linked documents</small></div><span className={`chip ${realMode ? 'chip-teal' : 'chip-orange'}`}>{realMode ? 'UNEP SNAPSHOT' : 'DEMO'}</span></div>
        <Suspense fallback={<div className="map-loading" role="status">Loading verified source history…</div>}>
          <EvidenceObservationPanel source={source} observations={observations} datasetUrl={datasetUrl} datasetSnapshotId={datasetSnapshotId} datasetRetrievedAt={datasetRetrievedAt} datasetLicense={datasetLicense} archiveSha256={sourceArchiveHash} onOpenGlobe={onOpenGlobe} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onRetryHistory={retrySourceHistory}/>
        </Suspense>
        {source.externalEvidence?.length ? <div className="evidence-list compact">{source.externalEvidence.map(item => <div key={item.url}><span><strong>{item.title}</strong><small>Linked publisher reference · contents not included</small></span><a href={item.url} target="_blank" rel="noreferrer">Official link ↗</a></div>)}</div> : null}
      </section>
      <button className="outline-btn" type="button" onClick={onOpenDocuments}>Open source references</button>
    </>)}

    {panel('document-ai', 'Document AI', <>
      <div className="audit-stage-heading"><div><h2 ref={activeStage === 'document-ai' ? stageHeadingRef : null} tabIndex={-1}>Document assessment</h2><p>Optional, server-side, and limited to authorized excerpts with validated citations.</p></div><span className="audit-stage-source">{intelligenceCapability?.documentModelConfigured ? 'AI available' : 'AI not configured'}</span></div>
      <Suspense fallback={<div className="map-loading" role="status">Loading document assessment tools…</div>}>
        <IntelligencePanel sourceId={source.sourceId} observations={observations} claimType={claim} synthetic={source.synthetic} documentAssessmentAllowed={documentAssessmentAllowed} currentAudit={audit} onAssessment={onAssessment} capability={intelligenceCapability} capabilityLoading={capabilityLoading} capabilityError={capabilityError} onRetryCapability={onRetryCapability}/>
      </Suspense>
    </>)}

    {panel('review', 'Review', <>
      <div className="audit-stage-heading"><div><h2 ref={activeStage === 'review' ? stageHeadingRef : null} tabIndex={-1}>Review the result</h2><p>Confirm the case, claim, evidence references and review status before exporting.</p></div><span className="audit-stage-source">{audit ? auditWarning : 'No assessment yet'}</span></div>
      <section className="panel audit-review-summary" aria-live="polite">
        <dl><div><dt>Source</dt><dd>{source.sourceId} · {source.region}</dd></div><div><dt>Claim</dt><dd>{claimLabels[claim]}</dd></div><div><dt>Assessment</dt><dd>{audit ? auditWarning : 'Pending'}</dd></div><div><dt>Reviewer status</dt><dd>{auditReviewStatus}</dd></div><div><dt>Dataset snapshot</dt><dd>{datasetSnapshotId || 'Not available'}</dd></div><div><dt>Cited records</dt><dd>{citedEvidence.length}</dd></div></dl>
        <p>{audit?.reason || 'Run the rules baseline or add an authorized document excerpt to create an assessment. No physical mitigation is certified by this workflow.'}</p>
        {citedEvidence.length > 0 ? <ul className="audit-review-citations">{citedEvidence.map(item => <li key={`${item.kind}-${item.id}`}><span><strong>{item.title}</strong><small>{item.id} · {item.date || 'undated'}</small></span>{item.reference && <a href={item.reference} target="_blank" rel="noreferrer">Inspect ↗</a>}</li>)}</ul> : <p className="audit-review-empty">No validated citation is attached to the current result.</p>}
      </section>
      <div className="audit-review-actions"><button className="outline-btn" type="button" onClick={onOpenReports}>View report preview</button><button className="outline-btn" type="button" onClick={onOpenBlockchain}>Open verification center</button></div>
    </>)}

    <div className="audit-stage-footer">
      <button className="outline-btn" type="button" disabled={activeIndex === 0} onClick={() => setActiveStage(stages[Math.max(0, activeIndex - 1)]!.id)}>Previous</button>
      <span aria-live="polite">Step {activeIndex + 1} of {stages.length} · {stages[activeIndex]?.description}</span>
      {activeIndex < stages.length - 1
        ? <button className="primary-btn" type="button" onClick={() => setActiveStage(stages[activeIndex + 1]!.id)}>Next: {stages[activeIndex + 1]!.label}</button>
        : <button className="primary-btn" type="button" onClick={onOpenReports}>Open report workspace</button>}
    </div>
  </div>;
}
