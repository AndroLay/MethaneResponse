import { z } from 'zod';
import { ConflictDeclaration, type HumanAssessmentTrust } from './trust';
import { evidenceUtcDay, hasEvidencePointer, isSecureEvidenceReference } from './evidence-policy';
import type { AssessmentSemantics } from './assessment-semantics';
import { EvidenceRequestEvent } from './evidence-lifecycle';
import { InvestigationDigest, InvestigationPlanLink } from './investigation-links';
export * from './assessment-semantics';
export * from './evidence-policy';
export * from './trust';
export { transparencySummaryPayload } from './transparency';

export { validateDocumentRightsMetadata } from './document-rights';

export const ClaimType = z.enum(['source_detected', 'operator_notified', 'mitigation_confirmed']);
export type ClaimType = z.infer<typeof ClaimType>;
export const AuditScope = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  observationId: z.string().trim().min(1).max(128).optional(),
  recipient: z.string().trim().min(1).max(160).optional(),
}).refine(value => value.startDate <= value.endDate, { message: 'Scope start must precede its end', path: ['endDate'] });
export type AuditScope = z.infer<typeof AuditScope>;
export const CaseWorkDraft = z.object({
  status: z.enum(['investigate', 'awaiting_evidence', 'deferred', 'review_recorded']),
  question: z.string().trim().max(1000), notes: z.string().trim().max(4000),
  evidenceRequest: z.string().trim().max(1000), nextAction: z.string().trim().max(1000),
  claimType: ClaimType, scope: AuditScope.optional(),
  assessmentLink: z.object({ auditId: z.string().min(1).max(128), bundleHash: z.string().regex(/^0x[0-9a-f]{64}$/) }).optional(),
  assignee: z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/).optional(), dueDate: z.iso.date().optional(),
  planLink: InvestigationPlanLink.optional(), changeReportDigest: InvestigationDigest.optional(),
  acceptanceCriteria: z.string().trim().max(1000).optional(),
  requestEvents: z.array(EvidenceRequestEvent).max(40).optional(),
});
export type CaseWorkDraft = z.infer<typeof CaseWorkDraft>;
export const CaseWorkRecord = CaseWorkDraft.extend({
  version: z.union([z.literal(1), z.literal(2)]), workId: z.string().min(1).max(128).optional(), revision: z.number().int().positive(), updatedAt: z.iso.datetime(),
  sourceId: z.string().min(1), datasetSnapshotId: z.string().optional(), archiveSha256: z.string().optional(), synthetic: z.boolean(),
});
export type CaseWorkRecord = z.infer<typeof CaseWorkRecord>;
export const SharedWorkId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
export const SharedWorkContext = z.object({
  sourceId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/), synthetic: z.boolean(),
  datasetSnapshotId: z.string().trim().min(1).max(160), archiveSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict().refine(value => value.synthetic || Boolean(value.archiveSha256), { message: 'Real casework requires an archive digest' });
export type SharedWorkContext = z.infer<typeof SharedWorkContext>;
export const SharedWorkInput = z.object({ context: SharedWorkContext, expectedRevision: z.number().int().nonnegative(), draft: CaseWorkDraft.strict() }).strict();
export const SharedCaseWork = CaseWorkDraft.extend({
  context: SharedWorkContext, workId: SharedWorkId, revision: z.number().int().positive(),
  ownerId: z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/), updatedBy: z.string().regex(/^[a-zA-Z0-9._:@-]{3,96}$/),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).strict();
export type SharedCaseWork = z.infer<typeof SharedCaseWork>;
export const SharedWorkSession = z.object({ reviewerId: z.string().min(3), claimTypes: z.array(ClaimType), canWrite: z.boolean(), storage: z.object({ backend: z.enum(['memory', 'file']), persistent: z.boolean(), ready: z.boolean() }) });
export const SharedWorkListResponse = z.object({ works: z.array(SharedCaseWork).max(500) });
export const SharedWorkDetailResponse = z.object({ work: SharedCaseWork, history: z.array(SharedCaseWork).min(1).max(100) });
export const SharedWorkSaveResponse = z.object({ work: SharedCaseWork });
// Drafts may be incomplete. Only these fields are persisted, never tokens or inspection consent.
const draftReferenceUrl = z.string().max(2000).refine(value => !/^https?:\/\/[^/?#]*@/i.test(value), { message: 'Credentials in reference URLs cannot be kept in a draft' });
const referenceDraft = z.object({
  id: z.string().max(128), sourceId: z.string().max(128),
  kind: z.enum(['detection', 'notification', 'mitigation_confirmation', 'contradiction', 'document_excerpt']),
  title: z.string().max(160), reference: draftReferenceUrl, locator: z.string().max(300).optional(),
  date: z.string().max(30).optional(), observationId: z.string().max(128).optional(), recipient: z.string().max(160).optional(),
  action: z.string().max(500).optional(), followUpDate: z.string().max(30).optional(), followUpReference: draftReferenceUrl.optional(),
  expectedSha256: z.string().max(64).optional(), followUpExpectedSha256: z.string().max(64).optional(),
});
export const HumanAssessmentDraft = z.object({ claimText: z.string().max(1000), rationale: z.string().max(2000), result: z.enum(['supported', 'contradicted', 'insufficient_evidence']), evidence: z.array(referenceDraft).max(12), nextEvidenceRequest: z.string().max(1000), conflictDeclaration: ConflictDeclaration.optional() });
export const CaseSessionDraft = z.object({ draft: CaseWorkDraft, baseRevision: z.number().int().nonnegative() });
export const InvestigationSelection = z.object({ context: z.string().max(1500), sourceId: z.string().max(128), claimType: ClaimType, scope: AuditScope.optional(), workId: z.string().min(1).max(128) });
export const AuditInput = z.object({
  sourceId: z.string().min(1).max(128),
  claimType: ClaimType,
  scope: AuditScope.optional(),
  datasetSnapshotId: z.string().trim().min(1).max(160).optional(),
});
export type AuditInput = z.infer<typeof AuditInput>;
export const Evidence = z.object({
  id: z.string(),
  kind: z.enum(['detection', 'notification', 'mitigation_confirmation', 'contradiction', 'metadata_notification', 'document_excerpt']),
  claimType: ClaimType.optional(),
  title: z.string(),
  reference: z.string(),
  date: z.string().optional(),
  synthetic: z.boolean(),
  observationId: z.string().optional(),
  recipient: z.string().optional(),
  action: z.string().optional(),
  followUpDate: z.string().optional(),
  followUpReference: z.string().optional(),
  locator: z.string().optional(),
});
export type Evidence = z.infer<typeof Evidence>;

/** Required reference types for the deterministic coverage baseline; not physical verification. */
export const CLAIM_SUPPORT_KIND: Readonly<Record<ClaimType, Evidence['kind']>> = Object.freeze({
  source_detected: 'detection',
  operator_notified: 'notification',
  mitigation_confirmed: 'mitigation_confirmation',
});

/** Same eligibility rules for the saved baseline and its inventory preview. */
export function evidenceMatchesScope(evidence: Evidence, scope: AuditScope): boolean {
  const date = evidenceUtcDay(evidence.date);
  if (!date || evidenceUtcDay(scope.startDate) !== scope.startDate || evidenceUtcDay(scope.endDate) !== scope.endDate
    || scope.startDate > scope.endDate || date < scope.startDate || date > scope.endDate) return false;
  return !scope.observationId || (evidence.observationId || (evidence.kind === 'detection' ? evidence.id : undefined)) === scope.observationId;
}
export function claimEvidence(evidence: Evidence[], claimType: ClaimType, scope?: AuditScope) {
  const relevant = evidence.filter(e => (e.kind === CLAIM_SUPPORT_KIND[claimType] && (!e.claimType || e.claimType === claimType)) || (e.kind === 'contradiction' && e.claimType === claimType));
  const eligible = relevant.filter(e => {
    const date = evidenceUtcDay(e.date);
    if (!date || !hasEvidencePointer(e.reference, e.synthetic)) return false;
    if (claimType !== 'source_detected' && !scope) return false;
    if (scope && !evidenceMatchesScope(e, scope)) return false;
    if (claimType === 'operator_notified' && (!scope?.recipient?.trim()
      || e.recipient?.trim().toLowerCase() !== scope.recipient.trim().toLowerCase())) return false;
    if (e.kind === 'mitigation_confirmation') {
      const followUp = evidenceUtcDay(e.followUpDate);
      if (!e.action?.trim() || !hasEvidencePointer(e.followUpReference, e.synthetic)
        || !followUp || followUp < date || !scope || followUp > scope.endDate) return false;
    }
    return true;
  });
  return { supporting: eligible.filter(e => e.kind !== 'contradiction'), contradictions: eligible.filter(e => e.kind === 'contradiction'),
    excludedCount: new Set(relevant.filter(e => !eligible.includes(e)).map(e => e.id)).size };
}

export const ExternalEvidenceReference = z.object({
  title: z.string().min(1),
  url: z.string().url().startsWith('https://'),
  publisher: z.string().optional(),
  reportDate: z.string().optional(),
  license: z.string().min(1),
  contentIncluded: z.literal(false),
});
export type ExternalEvidenceReference = z.infer<typeof ExternalEvidenceReference>;

export const MarsProvenance = z.object({
  provider: z.string().min(1),
  dataset: z.string().min(1),
  catalogUrl: z.string().url().startsWith('https://'),
  downloadUrl: z.string().url().startsWith('https://'),
  retrievedAt: z.string().datetime({ offset: true }),
  archiveSha256: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotId: z.string().min(1).optional(),
  license: z.string().min(1),
  attribution: z.string().min(1),
}).passthrough();
export type MarsProvenance = z.infer<typeof MarsProvenance>;

export const MarsPlumeRecord = z.object({
  plumeId: z.string().min(1),
  sourceId: z.string().min(1),
  linkStatus: z.literal('linked'),
  satellite: z.string().min(1),
  tileDate: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  notified: z.boolean(),
  fluxKgHr: z.number().nonnegative().nullable(),
  fluxStdKgHr: z.number().nonnegative().nullable(),
  synthetic: z.literal(false),
}).passthrough();
export type MarsPlumeRecord = z.infer<typeof MarsPlumeRecord>;

export const MarsCase = z.object({
  caseId: z.string().min(1),
  sourceId: z.string().regex(/^[A-Z]{3}_S_\d+$/),
  purpose: z.string().min(1),
  source: z.object({
    sourceId: z.string().regex(/^[A-Z]{3}_S_\d+$/),
    lon: z.number().min(-180).max(180),
    lat: z.number().min(-90).max(90),
    country: z.string().min(1),
    sector: z.string().min(1),
    sourceType: z.string().min(1),
    detectedPlumeCount: z.number().int().nonnegative(),
    latestPlumeDate: z.string().nullable(),
    notified: z.string(),
    feedback: z.string(),
    feedbackOperator: z.string(),
    feedbackGovernment: z.string(),
    feedbackScope: z.literal('source'),
    mitigationConfirmed: z.null(),
    synthetic: z.literal(false),
  }).passthrough(),
  plumes: z.array(MarsPlumeRecord).min(1),
  externalEvidence: z.array(ExternalEvidenceReference),
}).superRefine((item, context) => {
  if (item.sourceId !== item.source.sourceId) context.addIssue({ code: 'custom', path: ['source', 'sourceId'], message: 'Case and source IDs must match.' });
  for (const [index, plume] of item.plumes.entries()) {
    if (plume.sourceId !== item.sourceId) context.addIssue({ code: 'custom', path: ['plumes', index, 'sourceId'], message: 'A case may include only plumes linked to its source ID.' });
  }
});
export type MarsCase = z.infer<typeof MarsCase>;

export const MarsCasebook = z.object({
  schemaVersion: z.literal(1),
  provenance: MarsProvenance,
  limitations: z.array(z.string().min(1)).min(1),
  cases: z.array(MarsCase).min(1),
}).superRefine((book, context) => {
  const caseIds = new Set<string>();
  const sourceIds = new Set<string>();
  book.cases.forEach((item, index) => {
    if (caseIds.has(item.caseId)) context.addIssue({ code: 'custom', path: ['cases', index, 'caseId'], message: 'Duplicate case ID.' });
    if (sourceIds.has(item.sourceId)) context.addIssue({ code: 'custom', path: ['cases', index, 'sourceId'], message: 'Duplicate source ID.' });
    caseIds.add(item.caseId);
    sourceIds.add(item.sourceId);
  });
});
export type MarsCasebook = z.infer<typeof MarsCasebook>;
export const Source = z.object({
  sourceId: z.string(),
  name: z.string(),
  region: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  synthetic: z.boolean(),
  evidence: z.array(Evidence),
});
export type Source = z.infer<typeof Source>;
export const ReviewSource = Source.extend({
  caseId: z.string().optional(),
  country: z.string().optional(),
  sector: z.string().optional(),
  sourceType: z.string().optional(),
  plumeCount: z.number().int().nonnegative().optional(),
  lastObserved: z.string().optional(),
  persistency: z.number().nullable().optional(),
  persistencyStd: z.number().nullable().optional(),
  persistencyCategory: z.string().optional(),
  emissionStatus: z.string().optional(),
  maxFluxKgHr: z.number().nullable().optional(),
  observations: z.array(z.object({
    id: z.string(), date: z.string(), fluxKgHr: z.number().nullable(), uncertaintyKgHr: z.number().nullable(),
    fluxUnit: z.literal('kg/h').optional(), satellite: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(), lon: z.number().min(-180).max(180).optional(),
    notified: z.boolean().optional(), actionable: z.string().optional(), tile: z.string().optional(),
    detectionInstitution: z.string().optional(), quantificationInstitution: z.string().optional(),
    totalEmissionTonnes: z.number().nullable().optional(), totalEmissionStdTonnes: z.number().nullable().optional(),
  })).optional(),
  notified: z.string().optional(),
  feedback: z.string().optional(),
  feedbackOperator: z.string().optional(),
  feedbackGovernment: z.string().optional(),
  externalEvidence: z.array(ExternalEvidenceReference).optional(),
  provenance: MarsProvenance.optional(),
});
export type ReviewSource = z.infer<typeof ReviewSource>;
export const ResultLabel = z.enum(['supported', 'insufficient_evidence', 'contradicted']);
export type ResultLabel = z.infer<typeof ResultLabel>;
const SecureReference = z.string().max(2000).refine(isSecureEvidenceReference, { message: 'References require a valid HTTPS URL without credentials or surrounding whitespace' });
export const HumanEvidenceReference = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9:_-]+$/),
  sourceId: z.string().trim().min(1).max(128),
  kind: z.enum(['detection', 'notification', 'mitigation_confirmation', 'contradiction', 'document_excerpt']),
  title: z.string().trim().min(1).max(160),
  reference: SecureReference,
  locator: z.string().trim().min(1).max(300),
  date: z.iso.date().optional(),
  observationId: z.string().trim().min(1).max(128).optional(),
  recipient: z.string().trim().min(1).max(160).optional(),
  action: z.string().trim().min(1).max(500).optional(),
  followUpDate: z.iso.date().optional(),
  followUpReference: SecureReference.optional(),
  expectedSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  followUpExpectedSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export type HumanEvidenceReference = z.infer<typeof HumanEvidenceReference>;
export const HumanAssessmentInput = z.object({
  sourceId: z.string().trim().min(1).max(128),
  claimType: ClaimType,
  datasetSnapshotId: z.string().trim().min(1).max(160),
  scope: AuditScope,
  claimText: z.string().trim().min(20).max(1000),
  result: ResultLabel,
  rationale: z.string().trim().min(20).max(2000),
  sourceInspected: z.literal(true),
  evidence: z.array(HumanEvidenceReference).max(12),
  nextEvidenceRequest: z.string().trim().max(1000).optional(),
  parentAuditId: z.string().uuid().optional(),
  checkPublicReferences: z.boolean().optional(),
  conflictDeclaration: ConflictDeclaration.optional(),
  publicSummaryConsent: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (new Set(value.evidence.map(item => item.id)).size !== value.evidence.length) ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'Evidence IDs must be unique' });
  if (value.evidence.some(item => item.sourceId !== value.sourceId)) ctx.addIssue({ code: 'custom', path: ['evidence'], message: 'Evidence must belong to the selected source' });
  if (value.claimType === 'operator_notified' && !value.scope.recipient) ctx.addIssue({ code: 'custom', path: ['scope', 'recipient'], message: 'Name the intended notification recipient' });
});
export type HumanAssessmentInput = z.infer<typeof HumanAssessmentInput>;
export type EvidenceBundle = {
  schemaVersion: 2 | 3 | 4;
  assessmentSemantics?: AssessmentSemantics;
  scope?: AuditScope;
  humanAssessment?: {
    kind: 'human_evidence_assessment';
    reviewerId: string;
    reviewedAt: string;
    sourceInspected: true;
    claimText: string;
    publication: 'private';
    submittedEvidence: HumanEvidenceReference[];
    baseline: { result: ResultLabel; reason: string; evidenceIds: string[] };
    nextEvidenceRequest?: string;
    parentBundleHash?: string;
    trust?: HumanAssessmentTrust;
  };
  intelligence?: {
    kind: 'llm_document_assessment';
    modelVersion: string;
    promptVersion: string;
    reviewStatus: 'unreviewed' | 'approved' | 'rejected' | 'needs_more_evidence';
    review?: { reviewerId: string; reviewedAt: string; note: string; parentBundleHash: string; sourceInspected?: boolean };
    citationPublication?: { status: 'private' | 'public'; authorConsent: boolean; publishedAt?: string };
    claimText?: string;
    claimTextSha256?: string;
    assessmentInputSha256?: string;
    claimPublication?: { status: 'private' | 'public'; authorConsent: boolean; publishedAt?: string };
    generatedFromUserExcerpts: true;
    documentDigests: {
      id: string;
      title: string;
      sha256: string;
      sourceUrl?: string;
      originalFileSha256?: string;
      rightsDeclared?: 'owned' | 'explicit_permission' | 'open_license';
      licenseName?: string;
      licenseUrl?: string;
      attribution?: string;
      licenseScopeConfirmed?: true;
      selectedPages?: { page: number; textSha256: string }[];
    }[];
    quotations: { documentId: string; quote: string; quoteSha256: string }[];
    limitations: string[];
    investigationSnapshotSha256?: string;
    investigationPriority?: number;
    investigationModelVersion?: string;
    datasetSnapshotId?: string;
    datasetInputSha256?: string;
    observationTimeline?: { id: string; observedAt: string }[];
    observationIds?: string[];
  };
  auditId: string;
  caseId: string;
  revision: number;
  generatedAt: string;
  sourceId: string;
  claimType: ClaimType;
  result: ResultLabel;
  reason: string;
  citedEvidence: Evidence[];
  externalEvidence: ExternalEvidenceReference[];
  provenance?: MarsProvenance;
  limitations: string[];
  synthetic: boolean;
};
export type AuditReceipt = {
  chainId: number;
  registryAddress: `0x${string}`;
  txHash: `0x${string}`;
  issuer: `0x${string}`;
  version: number;
  blockNumber: string;
  blockHash?: `0x${string}`;
  confirmations?: number;
};
export type AuditResult = {
  bundle: EvidenceBundle;
  auditId: string;
  caseId: string;
  revision: number;
  sourceId: string;
  claimType: ClaimType;
  result: ResultLabel;
  reason: string;
  evidenceIds: string[];
  bundleHash: `0x${string}`;
  generatedAt: string;
  synthetic: boolean;
  anchored: boolean;
  chainTxHash?: `0x${string}`;
  receipt?: AuditReceipt;
};

/** Private human reference metadata is never published by the prototype. */
export function isAuditPublic(audit: AuditResult): boolean {
  if (audit.bundle.schemaVersion === 2 && !audit.bundle.humanAssessment) return !audit.bundle.scope?.recipient;
  if (audit.bundle.schemaVersion !== 3 || audit.bundle.humanAssessment) return false;
  const value = audit.bundle.intelligence;
  return value?.reviewStatus === 'approved'
    && value.citationPublication?.status === 'public' && value.citationPublication.authorConsent === true
    && (!value.claimText || (value.claimPublication?.status === 'public' && value.claimPublication.authorConsent === true));
}
export const DEMO_SOURCES: Source[] = [
  {
    sourceId: 'DEMO-001',
    name: 'Fictitious compressor facility',
    region: 'Synthetic region A',
    lat: 31.38,
    lon: 35.92,
    synthetic: true,
    evidence: [
      { id: 'DEMO-OBS-001', kind: 'detection', title: 'Synthetic plume observation', reference: 'fixture://observations/DEMO-OBS-001', date: '2026-09-01', synthetic: true },
      { id: 'DEMO-NOTICE-001', kind: 'notification', title: 'Synthetic operator notification', reference: 'fixture://notifications/DEMO-NOTICE-001', date: '2026-09-04', synthetic: true, observationId: 'DEMO-OBS-001', recipient: 'DEMO facility operator' },
    ],
  },
  {
    sourceId: 'DEMO-002',
    name: 'Fictitious gas distribution facility',
    region: 'Synthetic region B',
    lat: 32.09,
    lon: 36.13,
    synthetic: true,
    evidence: [
      { id: 'DEMO-OBS-002', kind: 'detection', title: 'Synthetic plume observation', reference: 'fixture://observations/DEMO-OBS-002', date: '2026-08-12', synthetic: true },
      { id: 'DEMO-CONFIRM-002', kind: 'mitigation_confirmation', title: 'Synthetic third-party confirmation report', reference: 'fixture://cases/DEMO-CONFIRM-002', date: '2026-09-20', synthetic: true, observationId: 'DEMO-OBS-002', action: 'DEMO valve replacement', followUpDate: '2026-09-25', followUpReference: 'fixture://cases/DEMO-FOLLOW-UP-002' },
      { id: 'DEMO-CONTRA-002', kind: 'contradiction', claimType: 'operator_notified', title: 'Synthetic explicit notice-not-sent record', reference: 'fixture://cases/DEMO-CONTRA-002', date: '2026-08-14', synthetic: true, observationId: 'DEMO-OBS-002', recipient: 'DEMO facility operator' },
    ],
  },
];
