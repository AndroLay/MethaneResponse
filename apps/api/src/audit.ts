import { createHash, randomUUID } from 'node:crypto';
import { assessmentSemantics, claimEvidence, AuditScope, type AuditInput, type AuditResult, type Evidence, type EvidenceBundle, type ClaimType, type ExternalEvidenceReference, type MarsProvenance, type ResultLabel, type Source } from '@methane/shared';
import { canonicalJson } from './canonical';

export { evidenceMatchesScope } from '@methane/shared';

export function assess(source: Pick<Source, 'evidence'>, claimType: ClaimType, scope?: AuditScope): {result: ResultLabel; reason: string; evidenceIds: string[]} {
  if (claimType !== 'source_detected' && !scope) return { result: 'insufficient_evidence', reason: 'An explicit assessment scope with a date period is required for notification or mitigation reference coverage; name the recipient for notification. Existing records alone do not establish this claim.', evidenceIds: [] };
  if (claimType === 'operator_notified' && !scope?.recipient?.trim()) return { result: 'insufficient_evidence', reason: 'Name the intended recipient in the assessment scope before evaluating notification reference coverage.', evidenceIds: [] };
  const { supporting: eligibleSupporting, contradictions } = claimEvidence(source.evidence, claimType, scope);
  const refs = [...new Set([...contradictions, ...eligibleSupporting].map((e) => e.id))].sort();
  if (contradictions.length > 0 && eligibleSupporting.length > 0) {
    return { result: 'insufficient_evidence', reason: 'Conflicting source records require human adjudication.', evidenceIds: refs };
  }
  if (contradictions.length > 0) {
    return { result: 'contradicted', reason: 'An eligible reference is tagged as contrary to this claim and scope. Its substance and authenticity require human inspection.', evidenceIds: refs };
  }
  if (eligibleSupporting.length > 0) {
    return { result: 'supported', reason: 'An evidence reference of the required type is present. This does not authenticate its contents.', evidenceIds: refs };
  }
  return { result: 'insufficient_evidence', reason: 'No eligible reference of the required type matches the pointer, date and declared scope requirements. Absence does not prove the claim is false.', evidenceIds: [] };
}

export type AuditMetadata = {
  caseId?: string;
  revision?: number;
  externalEvidence?: ExternalEvidenceReference[];
  provenance?: MarsProvenance;
  limitations?: string[];
};

type AuditSource = Pick<Source, 'sourceId' | 'synthetic' | 'evidence'>;

export function createAudit(source: AuditSource, input: AuditInput, metadata: AuditMetadata = {}): AuditResult {
  const assessment = assess(source, input.claimType, input.scope);
  const generatedAt = new Date().toISOString();
  const auditId = randomUUID();
  const caseId = metadata.caseId || source.sourceId;
  const revision = metadata.revision || 1;
  // Deterministic field order; includes the source's referenced evidence content for tamper detection.
  const citedEvidence = source.evidence
    .filter((e) => assessment.evidenceIds.includes(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const bundle: EvidenceBundle = {
    schemaVersion: 2,
    assessmentSemantics: assessmentSemantics('metadata_coverage'),
    ...(input.scope ? { scope: input.scope } : {}),
    auditId,
    caseId,
    revision,
    generatedAt,
    sourceId: source.sourceId,
    claimType: input.claimType,
    result: assessment.result,
    reason: assessment.reason,
    citedEvidence,
    externalEvidence: metadata.externalEvidence || [],
    ...(metadata.provenance ? { provenance: metadata.provenance } : {}),
    limitations: [
      'This is a deterministic evidence-coverage baseline, not a scientific or legal certification.',
      'A source-level notification or feedback record does not establish physical mitigation.',
      ...(metadata.limitations || []),
    ],
    synthetic: source.synthetic,
  };
  const bundleHash = `0x${createHash('sha256').update(canonicalJson(bundle)).digest('hex')}` as const;
  return { auditId, caseId, revision, sourceId: source.sourceId, claimType: input.claimType, ...assessment, bundleHash, generatedAt, synthetic: source.synthetic, bundle, anchored: false };
}
