import type { AuditResult, AuditScope, ClaimType } from '@methane/shared';
import type { MarsSource } from './mars';
import { getClaimCoverage, getInvestigationPlan, type InvestigationAction } from './investigation-plan';

type Props = {
  source: MarsSource;
  claim: ClaimType;
  scope?: AuditScope;
  audit: AuditResult | null;
  historyLoading: boolean;
  historyError?: string;
  onSelectClaim: (claim: ClaimType) => void;
  onAction: (action: InvestigationAction) => void;
};

export default function EvidenceCoveragePanel({ source, claim, scope, audit, historyLoading, historyError, onSelectClaim, onAction }: Props) {
  const coverage = getClaimCoverage(source, scope);
  const plan = getInvestigationPlan(source, claim, audit, scope);
  const observations = historyLoading ? 'Loading observation history' : historyError ? 'Observation history unavailable'
    : source.observations ? `${source.observations.length.toLocaleString()} loaded observation records` : 'Observation history not loaded';

  return <section className="panel evidence-coverage" aria-label="Claim evidence coverage">
    <div className="coverage-heading"><div><h3>What can this evidence support?</h3><p>Inventory for {source.sourceId}{scope ? ` · ${scope.startDate} → ${scope.endDate}${scope.observationId ? ` · ${scope.observationId}` : ''}` : ' · whole source'}. Select a claim to see its requirements.</p></div>{source.synthetic && <span className="chip chip-orange">SYNTHETIC DEMO</span>}</div>
    <div className="coverage-claims">{coverage.map(item => <button
      type="button" key={item.claimType} className={`coverage-claim coverage-${item.status}`}
      aria-pressed={claim === item.claimType} onClick={() => onSelectClaim(item.claimType)}
    >
      <span className="coverage-claim-title">{item.title}</span>
      <span className="coverage-label">{item.label}</span>
      <span className="coverage-counts">{item.supportingCount} required-type · {item.contraryCount} contrary{scope ? ` · ${item.excludedCount} excluded by scope / requirements` : ''}</span>
      <span className="coverage-requirement">{item.requirement}</span>
    </button>)}</div>
    <p className="coverage-inventory">{observations} · {source.externalEvidence?.length || 0} linked publisher reports. Links and administrative flags are not counted as assessed document evidence.</p>
    {(source.notified || source.feedback) && <p className="coverage-metadata">Publisher metadata · notified: {source.notified || 'not recorded'} · feedback: {source.feedback || 'not recorded'}. These flags do not establish delivery of a notice or a physical repair.</p>}
    <div className="coverage-plan" aria-live="polite">
      <h4>{plan.title}</h4><p>{plan.detail}</p>
      <ol>{plan.steps.map(step => <li key={step.title}><div><strong>{step.title}</strong><p>{step.detail}</p></div><button type="button" className="outline-btn" onClick={() => onAction(step.action)}>{step.action === 'observations' ? 'Inspect observations' : step.action === 'references' ? 'Open references' : step.action === 'document-review' ? 'Open document review' : step.action === 'human-review' ? 'Open human assessment' : step.action === 'follow-up' ? 'Open follow-up work' : 'Open assessment'}</button></li>)}</ol>
    </div>
    <p className="coverage-limit">This preview describes available reference types. It does not authenticate documents, replace a saved assessment, or certify physical mitigation.</p>
  </section>;
}
