import { z } from 'zod';

export const ClaimType = z.enum(['source_detected', 'operator_notified', 'mitigation_confirmed']);
export type ClaimType = z.infer<typeof ClaimType>;
export const AuditInput = z.object({
  sourceId: z.string().min(1).max(128),
  claimType: ClaimType,
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
});
export type Evidence = z.infer<typeof Evidence>;

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
export type EvidenceBundle = {
  schemaVersion: 2 | 3;
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
      rightsDeclared?: 'owned' | 'explicit_permission';
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
      { id: 'DEMO-NOTICE-001', kind: 'notification', title: 'Synthetic operator notification', reference: 'fixture://notifications/DEMO-NOTICE-001', date: '2026-09-04', synthetic: true },
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
      { id: 'DEMO-CONFIRM-002', kind: 'mitigation_confirmation', title: 'Synthetic third-party confirmation report', reference: 'fixture://cases/DEMO-CONFIRM-002', date: '2026-09-20', synthetic: true },
      { id: 'DEMO-CONTRA-002', kind: 'contradiction', claimType: 'operator_notified', title: 'Synthetic explicit notice-not-sent record', reference: 'fixture://cases/DEMO-CONTRA-002', date: '2026-08-14', synthetic: true },
    ],
  },
];
