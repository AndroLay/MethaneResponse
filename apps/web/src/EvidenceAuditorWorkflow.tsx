import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuditResult, AuditScope, ClaimType } from '@methane/shared';
import type { MarsObservation, MarsSource } from './mars';
import type { IntelligenceCapability } from './reviewer-capability';
import SourceCasePicker from './SourceCasePicker';
import EvidenceCoveragePanel from './EvidenceCoveragePanel';
import type { InvestigationAction } from './investigation-plan';
import AssessmentScopeEditor from './AssessmentScopeEditor';
import AssessmentMeaning from './AssessmentMeaning';

const EvidenceObservationPanel = lazy(() => import('./EvidenceObservationPanel'));
const IntelligencePanel = lazy(() => import('./IntelligencePanel'));
const HumanAssessmentPanel = lazy(() => import('./HumanAssessmentPanel'));

const stages = [
  { id: 'overview', label: 'Overview', description: 'Choose a claim and run the rules baseline.' },
  { id: 'observations', label: 'Observations', description: 'Inspect dated satellite records and provenance.' },
  { id: 'human-review', label: 'Human assessment', description: 'Record inspected references and a human determination.' },
  { id: 'review', label: 'Review', description: 'Check the result before opening its report.' },
  { id: 'document-ai', label: 'Document AI', description: 'Optional: assess authorized excerpts and review citations.' },
] as const;

type StageId = typeof stages[number]['id'];

type Props = {
  draftContext: string;
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
  scope?: AuditScope;
  onScopeChange: (scope?: AuditScope) => boolean | void;
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
  draftContext,
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
  scope,
  onScopeChange,
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
  const [scopeDraftPending, setScopeDraftPending] = useState(false);
  const stageHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(activeStage);

  useEffect(() => {
    setActiveStage('overview');
  }, [source.sourceId]);

  useEffect(() => {
    if (previousStage.current !== activeStage) stageHeadingRef.current?.focus();
    previousStage.current = activeStage;
  }, [activeStage]);

  const auditReviewStatus = audit?.bundle.schemaVersion === 4 ? 'human determination · private' : audit?.bundle.schemaVersion === 3
    ? audit.bundle.intelligence?.reviewStatus?.replaceAll('_', ' ') || 'review status unavailable'
    : audit ? 'rules baseline · no human review recorded' : 'not assessed';
  const citedEvidence = audit?.bundle.citedEvidence || [];
  const manualStages = stages.filter(stage => stage.id !== 'document-ai');
  const activeIndex = manualStages.findIndex(stage => stage.id === activeStage);

  function openInvestigationStep(action: InvestigationAction) {
    if (action === 'follow-up') { document.getElementById('analyst-case-work')?.scrollIntoView({ block: 'start' }); return; }
    if (action === 'references') {
      onOpenDocuments();
      return;
    }
    setActiveStage(action === 'observations' ? 'observations' : action === 'document-review' ? 'document-ai' : action === 'human-review' ? 'human-review' : audit ? 'review' : 'overview');
    if (action === 'assessment' && !audit) document.getElementById('claim-audit')?.focus();
  }

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
    if (stage === 'human-review') return intelligenceCapability?.humanReviewConfigured ? 'Reviewer access configured' : 'Reviewer access required';
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
        <AssessmentScopeEditor draftContext={draftContext} scope={scope} observations={observations} evidence={source.evidence} historyUnavailable={sourceHistoryLoading || Boolean(sourceHistoryError)} onDraftChange={setScopeDraftPending} onChange={onScopeChange}/>
        <button className="primary-btn run-btn" type="button" disabled={auditPending || !sourceCanBeAudited || scopeDraftPending} onClick={onRunAudit}>
          {auditPending ? 'Assessing…' : 'Run rules baseline'}
        </button>
        {!sourceCanBeAudited && <p className="note-small" role="status">This source is not in the server-pinned snapshot or curated casebook, so its identifier cannot be audited. Select a server-backed source.</p>}
        {sourceCanBeAudited && realMode && !source.caseId && <p className="note-small">Global MARS source: the baseline may cite a linked detection. Notification and mitigation claims need attributable evidence.</p>}
        {auditError && <p role="alert" className="inline-error">{auditError}</p>}
        <div className={`audit-verdict-card ${audit?.result || 'empty'}`} aria-live="polite">
          <div><strong>{audit ? auditWarning : 'Awaiting assessment'}</strong><p>{audit?.reason || 'No assessment has been performed for the selected claim.'}</p><small>{audit ? 'References and reviewer decisions do not establish physical verification by this application.' : 'Missing evidence is unknown, not proof that the claim is false.'}</small></div>
        </div>
        {audit && <AssessmentMeaning bundle={audit.bundle}/>}
        {audit && <div className="audit-citation-preview"><strong>{citedEvidence.length} cited {citedEvidence.length === 1 ? 'reference' : 'references'}</strong>
          {citedEvidence.length ? <ul className="audit-review-citations">{citedEvidence.map(item => <li key={`${item.kind}-${item.id}`}><span><strong>{item.title}</strong><small>{item.id} · {item.date || 'undated'} · {item.kind.replaceAll('_', ' ')}</small></span>{item.reference && <a href={item.reference} target="_blank" rel="noreferrer">Inspect ↗</a>}</li>)}</ul>
            : <p>No accepted citation supports this result. Inspect the evidence requirements below.</p>}
        </div>}
      </section>
      <EvidenceCoveragePanel source={source} claim={claim} scope={scope} audit={audit} historyLoading={sourceHistoryLoading} historyError={sourceHistoryError} onSelectClaim={next => { if (next !== claim) onClaimChange(next); }} onAction={openInvestigationStep}/>
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
        <IntelligencePanel sourceId={source.sourceId} observations={observations} claimType={claim} synthetic={source.synthetic} documentAssessmentAllowed={documentAssessmentAllowed && !scope} currentAudit={audit} onAssessment={onAssessment} capability={intelligenceCapability} capabilityLoading={capabilityLoading} capabilityError={capabilityError} onRetryCapability={onRetryCapability}/>
        {scope && <p className="note-small">Use Human assessment for this event / period. The optional document-AI path currently assesses a source-level claim; clear the scope in Overview to use it.</p>}
      </Suspense>
    </>)}

    {panel('human-review', 'Human assessment', <>
      <Suspense fallback={<div role="status" className="map-loading">Loading human assessment…</div>}><HumanAssessmentPanel draftContext={draftContext} sourceId={source.sourceId} claimType={claim} scope={scope} datasetSnapshotId={datasetSnapshotId} synthetic={source.synthetic} capability={intelligenceCapability} currentAudit={audit} onAssessment={onAssessment}/></Suspense>
      {capabilityError && <p role="alert">Reviewer service status could not be loaded. <button className="outline-btn" type="button" onClick={onRetryCapability}>Retry reviewer status</button></p>}
    </>)}

    {panel('review', 'Review', <>
      <div className="audit-stage-heading"><div><h2 ref={activeStage === 'review' ? stageHeadingRef : null} tabIndex={-1}>Review the result</h2><p>Confirm the case, claim, evidence references and review status before exporting.</p></div><span className="audit-stage-source">{audit ? auditWarning : 'No assessment yet'}</span></div>
      <section className="panel audit-review-summary" aria-live="polite">
        <dl><div><dt>Source</dt><dd>{source.sourceId} · {source.region}</dd></div><div><dt>Claim</dt><dd>{claimLabels[claim]}</dd></div><div><dt>Assessment</dt><dd>{audit ? auditWarning : 'Pending'}</dd></div><div><dt>Reviewer status</dt><dd>{auditReviewStatus}</dd></div><div><dt>Assessment snapshot</dt><dd>{audit?.bundle.intelligence?.datasetSnapshotId || audit?.bundle.provenance?.snapshotId || (audit?.synthetic ? 'SYNTHETIC DEMO' : 'Not recorded')}</dd></div><div><dt>Cited records</dt><dd>{citedEvidence.length}</dd></div></dl>
        {audit?.bundle.scope && <p>Assessment scope: {audit.bundle.scope.startDate} → {audit.bundle.scope.endDate}{audit.bundle.scope.observationId ? ` · ${audit.bundle.scope.observationId}` : ' · whole period'}</p>}
        <p>{audit?.reason || 'Run the rules baseline or record a human assessment with source references. No physical mitigation is certified by this workflow.'}</p>
        {audit && <AssessmentMeaning bundle={audit.bundle}/>}
        {citedEvidence.length > 0 ? <ul className="audit-review-citations">{citedEvidence.map(item => <li key={`${item.kind}-${item.id}`}><span><strong>{item.title}</strong><small>{item.id} · {item.date || 'undated'}</small></span>{item.reference && <a href={item.reference} target="_blank" rel="noreferrer">Inspect ↗</a>}</li>)}</ul> : <p className="audit-review-empty">No validated citation is attached to the current result.</p>}
      </section>
      <div className="audit-review-actions"><button className="outline-btn" type="button" onClick={onOpenReports}>View report preview</button><button className="outline-btn" type="button" onClick={onOpenBlockchain}>Open verification center</button></div>
    </>)}

    <div className="audit-stage-footer">
      <button className="outline-btn" type="button" disabled={activeIndex === 0} onClick={() => setActiveStage(manualStages[Math.max(0, activeIndex - 1)]!.id)}>Previous</button>
      <span aria-live="polite">{activeIndex < 0 ? 'Optional Document AI' : `Step ${activeIndex + 1} of ${manualStages.length} · ${manualStages[activeIndex]?.description}`}</span>
      {activeIndex < 0 ? <button className="primary-btn" type="button" onClick={() => setActiveStage('human-review')}>Return to human assessment</button> : activeIndex < manualStages.length - 1
        ? <button className="primary-btn" type="button" onClick={() => setActiveStage(manualStages[activeIndex + 1]!.id)}>Next: {manualStages[activeIndex + 1]!.label}</button>
        : <button className="primary-btn" type="button" onClick={onOpenReports}>Open report workspace</button>}
    </div>
  </div>;
}
