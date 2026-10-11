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
  kind: z.enum(['detection', 'notification', 'mitigation_confirmation', 'contradiction']),
  claimType: ClaimType.optional(),
  title: z.string(),
  reference: z.string(),
  date: z.string(),
  synthetic: z.boolean(),
});
export type Evidence = z.infer<typeof Evidence>;
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
export const ResultLabel = z.enum(['supported', 'insufficient_evidence', 'contradicted']);
export type ResultLabel = z.infer<typeof ResultLabel>;
export type EvidenceBundle = {
  schemaVersion: 1;
  auditId: string;
  generatedAt: string;
  sourceId: string;
  claimType: ClaimType;
  result: ResultLabel;
  reason: string;
  citedEvidence: Evidence[];
  synthetic: boolean;
};
export type AuditResult = {
  bundle: EvidenceBundle;
  auditId: string;
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

