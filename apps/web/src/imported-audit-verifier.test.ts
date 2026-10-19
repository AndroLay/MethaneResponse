import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from '../../api/src/audit';
import { createDocumentAudit, createReviewedAudit, DocumentAssessmentInput } from '../../api/src/ai-review';
import { loadCasebook, sourceFromCase } from '../../api/src/casebook';
import { verifyImportedAuditReport } from './imported-audit-verifier';
import { addExportIntegrity, buildReportExportPayload, canonicalJson } from './report-export';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ImportedAuditVerifier from './ImportedAuditVerifier';

test('browser verifier defaults to complete context checking with a visible legacy option', () => {
  const html = renderToStaticMarkup(createElement(ImportedAuditVerifier));
  expect(html).toContain('Require complete export context');
  expect(html).toContain('checked=""');
  expect(html).toContain('legacy');
});

function makeAudit() {
  const source = DEMO_SOURCES[0];
  return createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' }, { caseId: source.sourceId, revision: 1 });
}

test('strict context verification requires a complete report instead of a raw or legacy bundle', async () => {
  const audit = makeAudit();
  for (const report of [audit, { latestAudit: audit }]) {
    const result = await verifyImportedAuditReport(report, { requireExportContext: true });
    expect(result.localDigest).toBe('invalid');
    expect(result.message).toContain('complete JSON report');
  }
  expect((await verifyImportedAuditReport(audit)).localDigest).toBe('valid');
});

test('strict context verification accepts the app export and rejects changed outer context', async () => {
  const audit = makeAudit();
  const report = await addExportIntegrity(buildReportExportPayload({ audit, claim: 'source_detected', source: DEMO_SOURCES[0], snapshot: null, realMode: false, generatedAt: '2026-10-18T00:00:00Z' }));
  expect(await verifyImportedAuditReport(report, { requireExportContext: true })).toMatchObject({ localDigest: 'valid', exportContext: 'manifest_valid' });
  const tampered = structuredClone(report);
  tampered.disclaimer += ' changed';
  expect((await verifyImportedAuditReport(tampered, { requireExportContext: true })).localDigest).toBe('invalid');
});

test('export observation timestamps must match the committed UTC day', async () => {
  const source = structuredClone(DEMO_SOURCES[0]);
  const input = DocumentAssessmentInput.parse({ sourceId: source.sourceId, claimType: 'source_detected', consentToExternalProcessing: true,
    documents: [{ id: 'DEMO-doc', title: 'DEMO document', text: 'DEMO document for a timestamp regression. It contains no verified repair, measured outcome, or independent physical evidence.', rightsDeclared: 'owned' }] });
  const audit = createDocumentAudit(input, source, { verdict: 'insufficient_evidence', reason: 'DEMO timing regression only.', citations: [] }, 1,
    { caseId: source.sourceId, externalEvidence: [], observationTimeline: [{ id: 'DEMO-offset', observedAt: '2026-09-30T23:30:00-12:00' }] });
  for (const [date, expected] of [['2026-09-30T10:00:00Z', 'invalid'], ['2026-10-01T11:30:00Z', 'valid'], ['2026-09-31', 'invalid']] as const) {
    const report = await addExportIntegrity(buildReportExportPayload({ audit, claim: 'source_detected', source: { ...source, observations: [{ id: 'DEMO-offset', date, fluxKgHr: null }] }, snapshot: null, realMode: false, generatedAt: '2026-10-18T00:00:00Z' }));
    expect((await verifyImportedAuditReport(report)).localDigest).toBe(expected);
  }
});

test('new semantics reject a rehashed physical-verification claim while legacy bundle bytes remain valid', async () => {
  const audit = makeAudit();
  delete audit.bundle.assessmentSemantics;
  audit.bundleHash = `0x${createHash('sha256').update(canonicalJson(audit.bundle)).digest('hex')}`;
  const before = JSON.stringify(audit);
  expect((await verifyImportedAuditReport(audit)).localDigest).toBe('valid');
  expect(JSON.stringify(audit)).toBe(before);
  Object.assign(audit.bundle, { assessmentSemantics: { version: 1, basis: 'metadata_coverage', physicalVerification: 'verified' } });
  audit.bundleHash = `0x${createHash('sha256').update(canonicalJson(audit.bundle)).digest('hex')}`;
  const result = await verifyImportedAuditReport(audit);
  expect(result.localDigest).toBe('invalid');
  expect(result.message).toContain('physical-verification');
});

test('verifies a valid exported audit bundle and marks wrapper context as unsigned', async () => {
  const audit = makeAudit();
  const result = await verifyImportedAuditReport({ latestAudit: audit, sourceDataset: { archiveSha256: 'f'.repeat(64) } });

  expect(result).toMatchObject({
    localDigest: 'valid', auditId: audit.auditId, revision: 1, sourceId: audit.sourceId,
    assessmentBasis: 'Reference metadata coverage', resultLabel: 'Required references present',
    receipt: 'not_present', exportContext: 'not_in_audit_hash', synthetic: true,
  });
});

test('verifies the current v3 human-reviewed report revision without claiming chain proof', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0];
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const input = DocumentAssessmentInput.parse({
    sourceId: source.sourceId,
    claimType: 'mitigation_confirmed',
    consentToExternalProcessing: true,
    documents: [{
      id: 'test-excerpt',
      title: 'Test-only excerpt',
      text: 'An operator log says a valve was repaired. No independent follow-up methane measurement is included in this test excerpt.',
      rightsDeclared: 'owned',
    }],
  });
  const draft = createDocumentAudit(input, source, {
    verdict: 'insufficient_evidence',
    reason: 'The excerpt reports an action but does not establish its physical outcome.',
    citations: [{ documentId: 'test-excerpt', quote: 'An operator log says a valve was repaired.' }],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [], provenance: book.provenance });
  const reviewed = createReviewedAudit(draft, 2, 'test-reviewer', {
    status: 'needs_more_evidence',
    note: 'Request independent follow-up observation evidence.',
    publishCitations: false,
  });
  const result = await verifyImportedAuditReport(reviewed);

  expect(result).toMatchObject({
    localDigest: 'valid', revision: 2, sourceId: source.sourceId,
    result: 'insufficient_evidence', reviewStatus: 'needs_more_evidence', receipt: 'not_present',
  });
});

test('verifies a historical v3 report whose document digest predates the rights declaration field', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0]!;
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const input = DocumentAssessmentInput.parse({
    sourceId: source.sourceId,
    claimType: 'mitigation_confirmed',
    consentToExternalProcessing: true,
    documents: [{
      id: 'legacy-test-excerpt',
      title: 'Legacy test excerpt',
      text: 'A historical excerpt is included to ensure old v3 audit bundles remain verifiable after the request schema gains rights declarations.',
      rightsDeclared: 'owned',
    }],
  });
  const legacy = createDocumentAudit(input, source, {
    verdict: 'insufficient_evidence',
    reason: 'The historical excerpt does not establish physical mitigation.',
    citations: [],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [], provenance: book.provenance });

  for (const document of legacy.bundle.intelligence!.documentDigests) delete document.rightsDeclared;
  legacy.bundleHash = `0x${createHash('sha256').update(canonicalJson(legacy.bundle)).digest('hex')}` as `0x${string}`;

  expect(await verifyImportedAuditReport(legacy)).toMatchObject({
    localDigest: 'valid', revision: 1, sourceId: source.sourceId, result: 'insufficient_evidence',
  });
});

test('validates open-license declaration shape independently of the bundle hash', async () => {
  const book = await loadCasebook();
  const sourceCase = book.cases[0]!;
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const input = DocumentAssessmentInput.parse({
    sourceId: source.sourceId,
    claimType: 'mitigation_confirmed',
    claimText: 'The submitted test evidence reports a specific action for this source.',
    consentToExternalProcessing: true,
    documents: [{
      id: 'open-license-test', title: 'Synthetic verifier fixture',
      text: 'Test-only synthetic excerpt text used to validate the report schema, not a quotation from a published document.',
      sourceUrl: 'https://publisher.example/article', rightsDeclared: 'open_license',
      licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'Synthetic fixture attribution for verifier tests.', licenseScopeConfirmed: true,
    }],
  });
  const audit = createDocumentAudit(input, source, {
    verdict: 'insufficient_evidence', reason: 'Synthetic verifier fixture.', citations: [],
  }, 1, { caseId: sourceCase.caseId, externalEvidence: [], provenance: book.provenance });

  expect(await verifyImportedAuditReport(audit)).toMatchObject({ localDigest: 'valid' });

  const malformed = structuredClone(audit);
  malformed.bundle.intelligence!.documentDigests[0]!.licenseUrl = 'http://publisher.example/license';
  malformed.bundleHash = `0x${createHash('sha256').update(canonicalJson(malformed.bundle)).digest('hex')}` as `0x${string}`;
  const result = await verifyImportedAuditReport(malformed);
  expect(result).toMatchObject({ localDigest: 'valid', documentRightsMetadata: 'invalid' });
  expect(result.documentRightsMessage).toContain('license');
});

test('rejects an edited audit bundle even when its outer report still parses', async () => {
  const report = { latestAudit: structuredClone(makeAudit()), generatedAt: '2026-10-13T00:00:00.000Z' };
  report.latestAudit.bundle.reason = 'Changed after export';
  const result = await verifyImportedAuditReport(report);

  expect(result.localDigest).toBe('invalid');
});

test('rejects changed exported observations when the report includes an export checksum', async () => {
  const audit = makeAudit();
  const report = {
    selectedSourceId: audit.sourceId,
    sourceDataset: { snapshotId: null, archiveSha256: null },
    observations: [{ id: 'observation-1', fluxKgHr: 120 }],
    latestAudit: audit,
    exportIntegrity: { schemaVersion: 1, algorithm: 'SHA-256', sha256: `0x${'0'.repeat(64)}` },
  };
  const result = await verifyImportedAuditReport(report);

  expect(result.localDigest).toBe('invalid');
  expect(result.exportContext).toBe('manifest_invalid');
  expect(result.message).toContain('export');
});

test('rejects report summary fields that no longer match the hashed bundle', async () => {
  const report = structuredClone(makeAudit());
  report.sourceId = 'OTHER_SOURCE';
  const result = await verifyImportedAuditReport(report);

  expect(result.localDigest).toBe('invalid');
});

test('keeps a locally valid digest separate from receipt metadata and live chain verification', async () => {
  const audit = structuredClone(makeAudit());
  const txHash = `0x${'1'.repeat(64)}` as `0x${string}`;
  audit.anchored = true;
  audit.chainTxHash = txHash;
  audit.receipt = {
    chainId: 11155111,
    registryAddress: `0x${'2'.repeat(40)}`,
    txHash,
    issuer: `0x${'3'.repeat(40)}`,
    version: 1,
    blockNumber: '12345',
  };
  const result = await verifyImportedAuditReport(audit);

  expect(result).toMatchObject({ localDigest: 'valid', receipt: 'metadata_matches_event_unverified' });
});

test('flags receipt metadata mismatch without misreporting the independently valid bundle hash', async () => {
  const audit = structuredClone(makeAudit());
  audit.anchored = true;
  audit.chainTxHash = `0x${'4'.repeat(64)}`;
  audit.receipt = {
    chainId: 11155111,
    registryAddress: `0x${'2'.repeat(40)}`,
    txHash: `0x${'1'.repeat(64)}`,
    issuer: `0x${'3'.repeat(40)}`,
    version: 1,
    blockNumber: '12345',
  };
  const result = await verifyImportedAuditReport(audit);

  expect(result).toMatchObject({ localDigest: 'valid', receipt: 'metadata_mismatch' });
});

test('rejects malformed input instead of treating a missing bundle as a valid report', async () => {
  const result = await verifyImportedAuditReport({ latestAudit: null });

  expect(result.localDigest).toBe('invalid');
});
