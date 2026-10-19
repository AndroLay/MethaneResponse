import { evidenceUtcDay, claimEvidence, CLAIM_SUPPORT_KIND, type AuditScope, type AuditResult, type ClaimType, type Evidence } from '@methane/shared';
import type { MarsSource } from './mars';

export const claimRequirements: Record<ClaimType, {
  title: string;
  kind: Evidence['kind'];
  requirement: string;
}> = {
  source_detected: {
    title: 'Source detected', kind: CLAIM_SUPPORT_KIND.source_detected,
    requirement: 'An identifiable, dated observation linked to this source.',
  },
  operator_notified: {
    title: 'Operator notified', kind: CLAIM_SUPPORT_KIND.operator_notified,
    requirement: 'An attributable notice identifying the recipient and notification date.',
  },
  mitigation_confirmed: {
    title: 'Mitigation confirmation claim', kind: CLAIM_SUPPORT_KIND.mitigation_confirmed,
    requirement: 'A scoped, attributable action record with a date and dated follow-up reference. Metadata coverage does not verify the physical outcome.',
  },
};

export type CoverageStatus = 'references_available' | 'conflicting_records' | 'contrary_records' | 'observation_context' | 'missing';
export type ClaimCoverage = {
  claimType: ClaimType;
  title: string;
  requirement: string;
  status: CoverageStatus;
  label: string;
  supportingCount: number;
  contraryCount: number;
  excludedCount: number;
};
export type InvestigationAction = 'observations' | 'references' | 'document-review' | 'assessment' | 'human-review' | 'follow-up';
export type InvestigationStep = { title: string; detail: string; action: InvestigationAction };
export type InvestigationPlan = { title: string; detail: string; steps: InvestigationStep[] };

type Inventory = Pick<MarsSource, 'sourceId' | 'evidence' | 'observations' | 'externalEvidence'>;

/** Inventory only: a linked report, metadata flag or observation context is never promoted to proof. */
export function getClaimCoverage(source: Inventory, scope?: AuditScope): ClaimCoverage[] {
  return (Object.entries(claimRequirements) as [ClaimType, typeof claimRequirements[ClaimType]][]).map(([claimType, requirement]) => {
    const { supporting, contradictions, excludedCount } = claimEvidence(source.evidence, claimType, scope);
    const supportingCount = new Set(supporting.map(item => item.id)).size;
    const contraryCount = new Set(contradictions.map(item => item.id)).size;
    const hasObservationContext = claimType === 'source_detected' && Boolean(source.observations?.some(item => {
      const day = evidenceUtcDay(item.date);
      return day && (!scope || (day >= scope.startDate && day <= scope.endDate && (!scope.observationId || item.id === scope.observationId)));
    }));
    const status: CoverageStatus = supportingCount && contraryCount ? 'conflicting_records'
      : contraryCount ? 'contrary_records' : supportingCount ? 'references_available'
        : hasObservationContext ? 'observation_context' : 'missing';
    const label: Record<CoverageStatus, string> = {
      references_available: 'Required-type references', conflicting_records: 'Conflicting references',
      contrary_records: 'Contrary references', observation_context: 'Observation context available', missing: 'Required evidence not included',
    };
    return { claimType, title: requirement.title, requirement: requirement.requirement, status, label: label[status], supportingCount, contraryCount, excludedCount };
  });
}

export function getInvestigationPlan(source: Inventory, claimType: ClaimType, audit?: AuditResult | null, scope?: AuditScope): InvestigationPlan {
  const coverage = getClaimCoverage(source, scope).find(item => item.claimType === claimType)!;
  const matchingAudit = audit?.sourceId === source.sourceId && audit.claimType === claimType && JSON.stringify(audit.bundle.scope) === JSON.stringify(scope) ? audit : null;
  if (matchingAudit?.bundle.humanAssessment) {
    return {
      title: 'Review the saved human determination',
      detail: 'An identified reviewer recorded this decision for the exact claim and scope. It does not certify physical mitigation; its rules coverage is recorded separately.',
      steps: [
        { title: 'Inspect the human reasoning and references', detail: 'Check the reviewer, claim, period and cited records before reporting.', action: 'assessment' },
        ...(matchingAudit.bundle.humanAssessment.nextEvidenceRequest ? [{ title: 'Continue the evidence request', detail: 'Explicitly add the saved request to an analyst follow-up draft. Choose the work status yourself.', action: 'follow-up' as const }] : []),
      ],
    };
  }
  const review = matchingAudit?.bundle.intelligence?.reviewStatus;
  if (review === 'unreviewed' || review === 'needs_more_evidence' || review === 'rejected') {
    return {
      title: review === 'unreviewed' ? 'Human review is still required' : review === 'rejected' ? 'The document assessment was rejected' : 'The reviewer requested more evidence',
      detail: 'The saved document assessment and the reviewer decision remain separate. An AI suggestion is not a confirmed outcome.',
      steps: [
        { title: 'Inspect the cited passages', detail: 'Check that each passage belongs to this source, claim and event. Resolve any reviewer concerns.', action: 'document-review' },
        review === 'unreviewed'
          ? { title: 'Complete the human review', detail: 'An authorized reviewer must record a decision before the document assessment can be treated as reviewed.', action: 'document-review' }
          : { title: 'Add evidence and create a new assessment', detail: 'This saved review decision is final for its revision. Address the reviewer concerns, add authorized evidence, and submit a new assessment for review.', action: 'document-review' },
      ],
    };
  }
  if (matchingAudit?.result === 'supported') {
    return {
      title: review === 'approved' ? 'Inspect the accepted evidence and its scope' : 'Inspect the references behind this result',
      detail: review === 'approved'
        ? 'A reviewer accepted this assessment. Check the exact claim, source and time covered; it is not an independent physical certification.'
        : 'The rules baseline found a reference of the required type. It does not authenticate the contents or certify a repair.',
      steps: [
        { title: 'Check attribution and timing', detail: 'Inspect the cited record, its publisher, date and source identifier.', action: 'references' },
        { title: 'Review the saved assessment', detail: 'Keep the result, review status and dataset snapshot together before exporting.', action: 'assessment' },
      ],
    };
  }
  if (matchingAudit?.result === 'contradicted' || coverage.contraryCount > 0) {
    return {
      title: coverage.supportingCount > 0 ? 'Resolve the conflicting records' : 'Inspect the explicit contrary record',
      detail: 'A contrary record concerns this particular claim. Missing evidence alone is never a contradiction.',
      steps: [
        { title: 'Compare scope and dates', detail: 'Check whether the supporting and contrary records describe the same source, action and time.', action: 'references' },
        { title: 'Request human adjudication', detail: 'Record the reason for resolving a conflict; do not silently discard an inconvenient record.', action: 'human-review' },
      ],
    };
  }
  if (coverage.supportingCount > 0 && !matchingAudit) {
    return {
      title: 'Inspect the required-type references',
      detail: 'The inventory contains a reference of the required type. Its contents and attribution still need inspection.',
      steps: [
        { title: 'Check the reference and its scope', detail: coverage.requirement, action: claimType === 'source_detected' ? 'observations' : 'references' },
        { title: 'Run the rules baseline', detail: 'Create a saved assessment using the server-pinned evidence. Reference presence alone does not authenticate contents.', action: 'assessment' },
      ],
    };
  }
  if (claimType === 'source_detected') {
    return {
      title: 'Bind a dated observation to the claim',
      detail: coverage.supportingCount > 0 ? 'Detection references are available in this inventory. Run the server baseline to create a saved assessment.'
        : 'Source history is context until an identifiable observation is cited in a saved assessment. A location or record count alone is not a citation.',
      steps: [
        { title: 'Inspect the observation history', detail: 'Confirm the source ID, observation date, satellite, reported flux and uncertainty. Missing flux stays unavailable.', action: 'observations' },
        { title: 'Run the rules baseline', detail: 'The server selects evidence from its pinned snapshot. A local inventory preview is not a saved verdict.', action: 'assessment' },
      ],
    };
  }
  const linkedCount = source.externalEvidence?.length || 0;
  return {
    title: claimType === 'operator_notified' ? 'Find attributable notification evidence' : 'Find attributable mitigation confirmation',
    detail: claimType === 'operator_notified'
      ? 'The publisher’s notified or feedback field does not identify a delivered notice and its recipient.'
      : 'Feedback and missing later detections cannot confirm mitigation. Evidence not included in this audit does not mean that no action occurred.',
    steps: [
      { title: claimType === 'operator_notified' ? 'Identify the notice and recipient' : 'Identify the action and follow-up verification',
        detail: claimRequirements[claimType].requirement, action: 'references' },
      { title: linkedCount ? 'Inspect the linked publisher report' : 'Locate an attributable source document',
        detail: linkedCount ? `${linkedCount} publisher reference${linkedCount === 1 ? ' is' : 's are'} linked; report contents have not been included or assessed. Confirm permitted processing before using an excerpt.`
          : 'Use an attributable document and confirm the rights for the exact excerpt and processing you intend.', action: 'references' },
      { title: 'Record a human evidence decision', detail: 'Apply a period, inspect the reference metadata, and record your reasoning or missing-evidence request. Document AI is an optional source-level path.', action: 'human-review' },
    ],
  };
}
