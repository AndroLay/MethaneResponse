import { createHash, randomUUID } from 'node:crypto';
import { assessmentSemantics, CLAIM_SUPPORT_KIND, evidenceUtcDay, type AuditResult, type Evidence, type EvidenceBundle, type HumanAssessmentInput, type HumanAssessmentTrust } from '@methane/shared';
import { assess } from './audit';
import { canonicalJson } from './canonical';
import { type resolveScopedSource, ScopeError } from './scoped-source';

export function createHumanAssessment(input: HumanAssessmentInput, resolved: Awaited<ReturnType<typeof resolveScopedSource>>, reviewerId: string, revision: number, parent?: AuditResult, trust?: HumanAssessmentTrust): AuditResult {
  for (const reference of input.evidence) {
    if (!reference.observationId) continue;
    const observation = resolved.source.evidence.find(item => item.kind === 'detection' && item.id === reference.observationId);
    if (!observation) throw new ScopeError('A reference observation does not belong to this source and snapshot', 422);
    const observationDay = evidenceUtcDay(observation.date);
    if (!observationDay) throw new ScopeError('Linked observation has an invalid date', 422);
    if (reference.date && reference.date < observationDay) throw new ScopeError('Reference date precedes its linked observation', 422);
  }
  const submitted = input.evidence.map(item => ({
    ...item, claimType: input.claimType, synthetic: resolved.source.synthetic,
  })) satisfies Evidence[];
  const baseline = assess({ evidence: submitted }, input.claimType, input.scope);
  const citedEvidence = submitted.filter(item => baseline.evidenceIds.includes(item.id)).sort((a, b) => a.id.localeCompare(b.id));
  if (input.result === 'supported' && !citedEvidence.some(item => item.kind === CLAIM_SUPPORT_KIND[input.claimType])) throw new ScopeError('A supported determination requires a matching dated reference of the required kind and scope', 422);
  if (input.result === 'contradicted' && !citedEvidence.some(item => item.kind === 'contradiction')) throw new ScopeError('A contradicted determination requires an explicit contrary record for this claim and scope', 422);
  const auditId = randomUUID();
  const generatedAt = new Date().toISOString();
  const bundle: EvidenceBundle = {
    schemaVersion: 4, auditId, caseId: resolved.caseId, revision, generatedAt,
    assessmentSemantics: assessmentSemantics('human_assessment'),
    sourceId: input.sourceId, claimType: input.claimType, scope: input.scope,
    result: input.result, reason: input.rationale, citedEvidence,
    externalEvidence: resolved.metadata.externalEvidence || [],
    ...(resolved.metadata.provenance ? { provenance: resolved.metadata.provenance } : {}),
    humanAssessment: {
      kind: 'human_evidence_assessment', reviewerId, reviewedAt: generatedAt, sourceInspected: true,
      claimText: input.claimText, publication: 'private', submittedEvidence: input.evidence, baseline,
      ...(input.nextEvidenceRequest ? { nextEvidenceRequest: input.nextEvidenceRequest } : {}),
      ...(parent ? { parentBundleHash: parent.bundleHash } : {}),
      ...(trust ? { trust } : {}),
    },
    limitations: [
      'A human determination based on submitted reference metadata; no model was called and document contents were not uploaded.',
      'The rules check reference kind, dates and declared event/recipient/action relationships. Optional publisher retrieval records origin and bytes, not document truth or physical mitigation.',
      'The authenticated reviewer states that the source material was inspected; this is not an independently certified inspection.',
      'References and free-text assessment remain private. No third-party report or quotation is reproduced.',
      'A public redacted summary is available only with explicit consent; reviewer attestation and conflict declarations are not independent identity or independence certification.',
      'Missing later observations do not establish zero emissions. Feedback and receipts do not establish a repair or reduced emissions.',
      ...(resolved.metadata.limitations || []),
    ],
    synthetic: resolved.source.synthetic,
  };
  const bundleHash = `0x${createHash('sha256').update(canonicalJson(bundle)).digest('hex')}` as const;
  return { bundle, bundleHash, auditId, caseId: resolved.caseId, revision, sourceId: input.sourceId, claimType: input.claimType,
    result: input.result, reason: input.rationale, evidenceIds: citedEvidence.map(item => item.id), generatedAt, synthetic: resolved.source.synthetic, anchored: false };
}
