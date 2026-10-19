import type { AuditResult } from './index';
import { HumanAssessmentTrust, TransparencySummary, type TransparencySummary as Summary } from './trust';

/** Deliberately construct every field. Never spread private assessment or provenance objects. */
export function transparencySummaryPayload(audit: AuditResult): Summary | null {
  const human = audit.bundle.humanAssessment;
  const parsedTrust = HumanAssessmentTrust.safeParse(human?.trust);
  const trust = parsedTrust.success ? parsedTrust.data : undefined;
  const scope = audit.bundle.scope;
  if (audit.bundle.schemaVersion !== 4 || !human || trust?.publicSummaryConsent !== true || !scope) return null;
  const checks = trust.referenceChecks;
  const provenance = audit.bundle.provenance;
  const value = {
    schemaVersion: 1, kind: 'redacted_human_assessment', auditId: audit.auditId, revision: audit.revision,
    sourceId: audit.sourceId, claimType: audit.claimType, result: audit.result, generatedAt: audit.generatedAt, synthetic: audit.synthetic,
    period: { startDate: scope.startDate, endDate: scope.endDate },
    ...(provenance?.snapshotId ? { dataset: { snapshotId: provenance.snapshotId, archiveSha256: provenance.archiveSha256 } } : {}),
    reviewerStatus: trust.reviewer.status, conflictDeclaration: trust.conflictDeclaration,
    referenceCount: human.submittedEvidence.length, citedReferenceCount: audit.evidenceIds.length,
    referenceChecks: {
      retrieved: checks.filter(item => item.status === 'publisher_retrieved').length,
      digestMatched: checks.filter(item => item.status === 'digest_matched').length,
      digestMismatched: checks.filter(item => item.status === 'digest_mismatch').length,
      unchecked: checks.filter(item => ['not_checked', 'blocked', 'unavailable'].includes(item.status)).length,
    },
    privateBundleHash: audit.bundleHash,
    limitations: [
      'Redacted human determination. Private claim wording, recipients, reviewer identities, reference URLs and reasoning are withheld.',
      'Reviewer status describes an operator attestation at assessment time, not independent identity certification or current authorization.',
      'Conflict declarations are self-reported; independence is not independently established.',
      'Publisher retrieval confirms origin and bytes at check time. A matching declared digest does not authenticate the issuer or the claims.',
      'Reference checks count URLs, including follow-up URLs, not verified physical events.',
      'The summary digest detects edits. The private bundle commitment can be compared by an authorized reader; it does not reveal or publicly verify private evidence.',
      'This is a historical revision. Later private revisions may exist, and later consent changes do not remove previously published summaries.',
      'Feedback and missing later observations do not prove repair, zero methane or reduced emissions. No physical mitigation is certified.',
      ...(audit.synthetic ? ['DEMO: this is a synthetic assessment and is not evidence about a real facility.'] : []),
    ],
  };
  const parsed = TransparencySummary.safeParse(value);
  return parsed.success ? parsed.data : null;
}
