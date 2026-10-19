import { z } from 'zod';
import type { EvidenceBundle } from './index';

export const AssessmentSemantics = z.object({
  version: z.literal(1),
  basis: z.enum(['metadata_coverage', 'human_assessment', 'model_document_assessment']),
  physicalVerification: z.literal('not_established_by_application'),
  referencePolicy: z.literal('scoped-reference-coverage-v2').optional(),
}).strict();
export type AssessmentSemantics = z.infer<typeof AssessmentSemantics>;

export function assessmentSemantics(basis: AssessmentSemantics['basis']): AssessmentSemantics {
  return { version: 1, basis, physicalVerification: 'not_established_by_application',
    ...(basis === 'model_document_assessment' ? {} : { referencePolicy: 'scoped-reference-coverage-v2' as const }) };
}

/** Optional on historical bundles. Never rewrite a legacy commitment to add this field. */
export function validateAssessmentSemantics(bundle: unknown): string | undefined {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return 'Missing assessment bundle';
  const value = bundle as Record<string, unknown>;
  if (!Object.hasOwn(value, 'assessmentSemantics')) return undefined;
  const parsed = AssessmentSemantics.safeParse(value.assessmentSemantics);
  if (!parsed.success) return 'Invalid assessment semantics or unsupported physical-verification claim';
  const human = value.humanAssessment as Record<string, unknown> | undefined;
  const model = value.intelligence as Record<string, unknown> | undefined;
  const expected = value.schemaVersion === 2 && !human && !model ? 'metadata_coverage'
    : value.schemaVersion === 4 && human?.kind === 'human_evidence_assessment' && !model ? 'human_assessment'
      : value.schemaVersion === 3 && model?.kind === 'llm_document_assessment' && !human ? 'model_document_assessment' : undefined;
  if (parsed.data.basis !== expected) return 'Assessment basis does not match the bundle kind';
  if ((expected !== 'model_document_assessment' && parsed.data.referencePolicy !== 'scoped-reference-coverage-v2')
    || (expected === 'model_document_assessment' && parsed.data.referencePolicy !== undefined)) return 'Reference policy does not match the assessment basis';
  return undefined;
}

/** Derive labels from the bundle kind, not caller-controlled envelope labels. */
export function assessmentPresentation(bundle: Pick<EvidenceBundle, 'schemaVersion' | 'result' | 'humanAssessment' | 'intelligence' | 'assessmentSemantics'>) {
  const physicalLabel = 'Physical verification: not established by this application';
  const verdict = bundle.result.replaceAll('_', ' ');
  if (bundle.schemaVersion === 4 && bundle.humanAssessment) return {
    basis: 'human_assessment' as const, basisLabel: 'Human assessment', resultLabel: `Human determination: ${verdict}`,
    explanation: 'The reviewer states that the source material was inspected. Identity, independence and physical outcomes are not certified by this application.', physicalLabel,
    legacy: !bundle.assessmentSemantics,
  };
  if (bundle.schemaVersion === 3 && bundle.intelligence) return {
    basis: 'model_document_assessment' as const, basisLabel: 'Model document assessment',
    resultLabel: `${bundle.intelligence.reviewStatus === 'unreviewed' ? 'AI suggestion' : 'Reviewed AI assessment'}: ${verdict}`,
    explanation: 'A model assessed user-supplied excerpts. A recorded human review does not turn the model output into an independent physical measurement.', physicalLabel,
    legacy: !bundle.assessmentSemantics,
  };
  return { basis: 'metadata_coverage' as const, basisLabel: 'Reference metadata coverage',
    resultLabel: bundle.result === 'supported' ? 'Required references present' : bundle.result === 'contradicted' ? 'Contrary reference present' : 'Insufficient reference coverage',
    explanation: 'Checks reference metadata and declared relationships. Document substance, issuer authenticity and physical outcomes require further investigation.', physicalLabel,
    legacy: !bundle.assessmentSemantics,
  };
}
