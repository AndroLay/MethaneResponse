import { expect, test } from 'bun:test';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from '../../api/src/audit';
import { buildReportExportPayload, addExportIntegrity } from './report-export';
import { buildInvestigationBrief } from './investigation-brief';
import type { MarsSnapshot, MarsSource } from './mars';

const generatedAt = '2026-10-16T00:00:00.000Z';
function fixture(): MarsSource { return structuredClone(DEMO_SOURCES[0]); }

test('brief preserves the saved decision, citations, integrity boundary and visible DEMO status', async () => {
  const source = fixture();
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
  const payload = await addExportIntegrity(buildReportExportPayload({ audit, claim: 'source_detected', source, snapshot: null, realMode: false, generatedAt }));
  const before = JSON.stringify(payload);
  const brief = buildInvestigationBrief(payload);
  expect(brief).toContain('SYNTHETIC DEMO');
  expect(brief).toContain('Assessment: Required references present');
  expect(brief).toContain('Assessment basis: Reference metadata coverage');
  expect(brief).toContain('Physical verification: not established by this application');
  expect(brief).toContain(audit.bundleHash);
  expect(brief).toContain(payload.exportIntegrity.sha256);
  expect(brief).toContain('editable Markdown');
  expect(brief).toContain('does not establish document authenticity');
  expect(brief).toContain(audit.bundle.citedEvidence[0].id);
  expect(JSON.stringify(payload)).toBe(before);
});

test('source context is not described as an assessment and null flux never becomes zero', () => {
  const source = fixture();
  source.observations = [{ id: 'DEMO-observation', date: '2026-10-01', fluxKgHr: null, uncertaintyKgHr: null, satellite: 'DEMO', notified: false }];
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit: null, claim: 'mitigation_confirmed', source, snapshot: null, realMode: false, generatedAt }));
  expect(brief).toContain('Assessment: Not assessed');
  expect(brief).toContain('| DEMO-observation | 2026-10-01 | Not reported | Not reported |');
  expect(brief).toContain('publisher-reported');
  expect(brief).toContain('Feedback and missing later detections cannot confirm mitigation');
});

test('a saved older dataset keeps its binding and omits current observations in the readable export', () => {
  const source = { ...fixture(), synthetic: false };
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'mitigation_confirmed' }, {
    provenance: { dataset: 'UNEP MARS', provider: 'UNEP', snapshotId: 'saved-snapshot', archiveSha256: 'a'.repeat(64), license: 'Test provenance', retrievedAt: generatedAt, catalogUrl: 'https://example.org/catalog' },
  });
  source.observations = [{ id: 'NEW-SNAPSHOT-OBSERVATION', date: '2026-10-15', fluxKgHr: 123, satellite: 'TEST', notified: false }];
  const snapshot: MarsSnapshot = { dataset: 'UNEP MARS', sourceUrl: 'https://example.org/catalog', license: 'Test provenance', snapshotId: 'new-snapshot', importedAt: generatedAt, provenance: { archiveSha256: 'b'.repeat(64) }, sources: [source] };
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit, claim: 'mitigation_confirmed', source, snapshot, realMode: true, generatedAt }));
  expect(brief).toContain('Dataset snapshot: saved-snapshot');
  expect(brief).toContain('Current observations were omitted');
  expect(brief).not.toContain('NEW-SNAPSHOT-OBSERVATION');
});

test('untrusted titles and references cannot inject Markdown links or HTML into the brief', () => {
  const source = fixture();
  source.externalEvidence = [{ title: '[DEMO](javascript:alert(1))\n# forged heading <script>', url: 'javascript:alert(1)', publisher: 'DEMO', license: 'DEMO', reportDate: '2026-10' }];
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit: null, claim: 'operator_notified', source, snapshot: null, realMode: false, generatedAt }));
  expect(brief).not.toContain('[DEMO](javascript:');
  expect(brief).not.toContain('\n# forged heading');
  expect(brief).not.toContain('<script>');
  expect(brief).toContain('reference: javascript:alert(1)');
});

test('long histories are explicitly bounded without dropping the total record count', () => {
  const source = fixture();
  source.observations = Array.from({ length: 55 }, (_, index) => ({ id: `DEMO-${String(index).padStart(2, '0')}`, date: '2026-10-01', fluxKgHr: index, satellite: 'DEMO', notified: false }));
  const brief = buildInvestigationBrief(buildReportExportPayload({ audit: null, claim: 'source_detected', source, snapshot: null, realMode: false, generatedAt }));
  expect(brief).toContain('Showing 50 of 55 available context records');
  expect(brief).toContain('| DEMO-49 |');
  expect(brief).not.toContain('| DEMO-50 |');
});

test('private claim wording and document quotations stay out of the shareable brief', () => {
  const source = fixture();
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'mitigation_confirmed' });
  audit.bundle.schemaVersion = 3;
  audit.reason = 'PRIVATE DEMO REVIEWER REASON';
  audit.bundle.citedEvidence = [{ id: 'DEMO-private-excerpt', kind: 'document_excerpt', title: 'PRIVATE DEMO DOCUMENT TITLE', reference: 'https://example.org/private-demo', synthetic: true }];
  audit.bundle.intelligence = {
    kind: 'llm_document_assessment', modelVersion: 'DEMO', promptVersion: 'DEMO', reviewStatus: 'unreviewed',
    generatedFromUserExcerpts: true, documentDigests: [], quotations: [{ documentId: 'DEMO', quote: 'PRIVATE DEMO QUOTATION', quoteSha256: 'a'.repeat(64) }], limitations: [],
    claimText: 'PRIVATE DEMO CLAIM WORDING', claimPublication: { status: 'private', authorConsent: false },
    citationPublication: { status: 'private', authorConsent: false },
  };
  const brief = () => buildInvestigationBrief(buildReportExportPayload({ audit, claim: 'mitigation_confirmed', source, snapshot: null, realMode: false, generatedAt }));
  expect(brief()).toContain('PRIVATE REVIEW DRAFT');
  expect(brief()).not.toContain('PRIVATE DEMO CLAIM WORDING');
  expect(brief()).not.toContain('PRIVATE DEMO QUOTATION');
  expect(brief()).not.toContain('PRIVATE DEMO DOCUMENT TITLE');
  expect(brief()).not.toContain('PRIVATE DEMO REVIEWER REASON');
  audit.bundle.intelligence.reviewStatus = 'approved';
  audit.bundle.intelligence.claimPublication = { status: 'public', authorConsent: false };
  expect(brief()).not.toContain('PRIVATE DEMO CLAIM WORDING');
  audit.bundle.intelligence.claimPublication = { status: 'private', authorConsent: true };
  expect(brief()).not.toContain('PRIVATE DEMO CLAIM WORDING');
  audit.bundle.intelligence.claimPublication = { status: 'public', authorConsent: true };
  audit.bundle.intelligence.citationPublication = { status: 'public', authorConsent: true };
  expect(brief()).toContain('Exact claim assessed: PRIVATE DEMO CLAIM WORDING');
  expect(brief()).not.toContain('PRIVATE REVIEW DRAFT');
  expect(brief()).not.toContain('PRIVATE DEMO QUOTATION');
});
