import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { assessmentPresentation, DEMO_SOURCES } from '@methane/shared';
import { createAudit } from '../../api/src/audit';
import AssessmentMeaning from './AssessmentMeaning';

test('a supported rules result describes reference coverage and always exposes the physical verification boundary', () => {
  const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });
  const meaning = assessmentPresentation(audit.bundle);
  expect(meaning.resultLabel).toBe('Required references present');
  const html = renderToStaticMarkup(createElement(AssessmentMeaning, { bundle: audit.bundle }));
  expect(html).toContain('Reference metadata coverage');
  expect(html).toContain('Not established by this application');
  expect(html).toContain('issuer authenticity');
  expect(html).not.toContain('Historical bundle');
  delete audit.bundle.assessmentSemantics;
  expect(renderToStaticMarkup(createElement(AssessmentMeaning, { bundle: audit.bundle }))).toContain('Historical bundle');
});

test('model review never changes the meaning into an independent human or physical determination', () => {
  const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });
  const meaning = assessmentPresentation({ ...audit.bundle, schemaVersion: 3, intelligence: { kind: 'llm_document_assessment', reviewStatus: 'approved' } as any });
  expect(meaning.basis).toBe('model_document_assessment');
  expect(meaning.resultLabel).toBe('Reviewed AI assessment: supported');
  expect(meaning.physicalLabel).toContain('not established');
});

test('human labels describe a reviewer determination and explain that inspection is self-attested', () => {
  const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });
  const meaning = assessmentPresentation({ ...audit.bundle, schemaVersion: 4, humanAssessment: { kind: 'human_evidence_assessment' } as any });
  expect(meaning.resultLabel).toBe('Human determination: supported');
  expect(meaning.explanation).toContain('reviewer states');
  expect(meaning.physicalLabel).toContain('not established');
});
