import { createHash, randomUUID } from 'node:crypto';
import { type AuditInput, type AuditResult, type EvidenceBundle, type ClaimType, type Evidence, type ResultLabel, type Source } from '@methane/shared';

const supportKind: Record<ClaimType, Evidence['kind']> = {
  source_detected: 'detection',
  operator_notified: 'notification',
  mitigation_confirmed: 'mitigation_confirmation',
};

export function assess(source: Source, claimType: ClaimType): {result: ResultLabel; reason: string; evidenceIds: string[]} {
  const contradictions = source.evidence.filter((e) => e.kind === 'contradiction' && e.claimType === claimType);
  const supporting = source.evidence.filter((e) => e.kind === supportKind[claimType]);
  const refs = [...new Set([...contradictions, ...supporting].map((e) => e.id))].sort();
  if (contradictions.length > 0 && supporting.length > 0) {
    return { result: 'insufficient_evidence', reason: 'Conflicting source records require human adjudication.', evidenceIds: refs };
  }
  if (contradictions.length > 0) {
    return { result: 'contradicted', reason: 'An explicit contrary record exists for this specific claim (fixture baseline).', evidenceIds: refs };
  }
  if (supporting.length > 0) {
    return { result: 'supported', reason: 'An evidence reference of the required type is present. This does not authenticate its contents.', evidenceIds: refs };
  }
  return { result: 'insufficient_evidence', reason: 'No evidence of the required type. Absence does not prove the claim is false.', evidenceIds: [] };
}

export function createAudit(source: Source, input: AuditInput): AuditResult {
  const assessment = assess(source, input.claimType);
  const generatedAt = new Date().toISOString();
  const auditId = randomUUID();
  // Deterministic field order; includes the source's referenced evidence content for tamper detection.
  const citedEvidence = source.evidence
    .filter((e) => assessment.evidenceIds.includes(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const bundle: EvidenceBundle = {
    schemaVersion: 1,
    auditId,
    generatedAt,
    sourceId: source.sourceId,
    claimType: input.claimType,
    result: assessment.result,
    reason: assessment.reason,
    citedEvidence,
    synthetic: source.synthetic,
  };
  const bundleHash = `0x${createHash('sha256').update(JSON.stringify(bundle)).digest('hex')}` as const;
  return { auditId, sourceId: source.sourceId, claimType: input.claimType, ...assessment, bundleHash, generatedAt, synthetic: source.synthetic, bundle, anchored: false };
}

