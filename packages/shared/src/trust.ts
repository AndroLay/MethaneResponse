import { z } from 'zod';

export const EvidenceCheck = z.object({
  reference: z.string(), checkedAt: z.string(),
  status: z.enum(['not_checked', 'blocked', 'unavailable', 'publisher_retrieved', 'digest_matched', 'digest_mismatch']),
  publisherHost: z.string().optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  expectedSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), bytes: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
}).strict();
export type EvidenceCheck = z.infer<typeof EvidenceCheck>;

export const ReviewerAssurance = z.object({
  status: z.enum(['unverified', 'operator_attested', 'expired', 'revoked', 'outside_authority', 'directory_unavailable']),
  assessedAt: z.string(), organization: z.string().optional(), checkedBy: z.string().optional(),
  checkedAt: z.string().optional(), expiresAt: z.string().optional(), verificationReference: z.string().optional(),
}).strict();
export type ReviewerAssurance = z.infer<typeof ReviewerAssurance>;
export const ConflictDeclaration = z.enum(['not_declared', 'none_declared', 'conflict_declared']);
export type ConflictDeclaration = z.infer<typeof ConflictDeclaration>;
export const HumanAssessmentTrust = z.object({
  reviewer: ReviewerAssurance, conflictDeclaration: ConflictDeclaration,
  referenceChecks: z.array(EvidenceCheck).max(24), publicSummaryConsent: z.boolean(),
}).strict();
export type HumanAssessmentTrust = z.infer<typeof HumanAssessmentTrust>;

/** A closed, versioned public shape. No private free text or document URLs. */
export const TransparencySummary = z.object({
  schemaVersion: z.literal(1), kind: z.literal('redacted_human_assessment'),
  auditId: z.string().uuid(), revision: z.number().int().positive(), sourceId: z.string(),
  claimType: z.enum(['source_detected', 'operator_notified', 'mitigation_confirmed']),
  result: z.enum(['supported', 'insufficient_evidence', 'contradicted']),
  generatedAt: z.string(), synthetic: z.boolean(),
  period: z.object({ startDate: z.string(), endDate: z.string() }).strict(),
  dataset: z.object({ snapshotId: z.string(), archiveSha256: z.string() }).strict().optional(),
  reviewerStatus: ReviewerAssurance.shape.status, conflictDeclaration: ConflictDeclaration,
  referenceCount: z.number().int().nonnegative(), citedReferenceCount: z.number().int().nonnegative(),
  referenceChecks: z.object({ retrieved: z.number().int().nonnegative(), digestMatched: z.number().int().nonnegative(), digestMismatched: z.number().int().nonnegative(), unchecked: z.number().int().nonnegative() }).strict(),
  privateBundleHash: z.string().regex(/^0x[a-f0-9]{64}$/),
  limitations: z.array(z.string()),
}).strict();
export type TransparencySummary = z.infer<typeof TransparencySummary>;
export const WithdrawalReason = z.enum(['consent_withdrawn', 'published_in_error', 'evidence_under_review']);
export type WithdrawalReason = z.infer<typeof WithdrawalReason>;
export const PublicationReason = z.enum(['publication_consent', 'revised_assessment', ...WithdrawalReason.options]);
export const publicationReasonLabels: Record<z.infer<typeof PublicationReason>, string> = {
  publication_consent: 'Explicit publication consent', revised_assessment: 'Replaced by a revised public assessment',
  consent_withdrawn: 'Publication consent withdrawn', published_in_error: 'Published in error', evidence_under_review: 'Evidence requires further review',
};
export const PublicationChange = z.object({
  version: z.number().int().nonnegative(), status: z.enum(['published', 'superseded', 'withdrawn']),
  changedAt: z.iso.datetime({ offset: true }), reason: PublicationReason,
  replacementAuditId: z.string().uuid().optional(),
}).strict();
export const PublicationState = PublicationChange.extend({ history: z.array(PublicationChange).min(1).max(1000) }).strict();
export type PublicationState = z.infer<typeof PublicationState>;
export const WithdrawalInput = z.object({ expectedVersion: z.number().int().nonnegative(), reason: WithdrawalReason }).strict();
export const TransparencyRecord = z.object({ summary: TransparencySummary, summaryHash: z.string().regex(/^0x[a-f0-9]{64}$/), publication: PublicationState.optional() }).strict();
export type TransparencyRecord = z.infer<typeof TransparencyRecord>;
