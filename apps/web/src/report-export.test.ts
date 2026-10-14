import { expect, test } from 'bun:test';
import { createDocumentAudit, DocumentAssessmentInput } from '../../api/src/ai-review';
import { createAudit } from '../../api/src/audit';
import { loadCasebook, sourceFromCase } from '../../api/src/casebook';
import { verifyImportedAuditReport } from './imported-audit-verifier';
import { addExportIntegrity, buildReportExportPayload } from './report-export';
import type { MarsSnapshot } from './mars';

async function reportFixture() {
  const book = await loadCasebook();
  const sourceCase = book.cases[0]!;
  const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
  const input = DocumentAssessmentInput.parse({
    sourceId: source.sourceId,
    claimType: 'mitigation_confirmed',
    consentToExternalProcessing: true,
    documents: [{ id: 'report-excerpt', title: 'Local test excerpt', text: 'This synthetic test excerpt contains no verified repair record and exists only to test report snapshot binding and checksum behavior.', rightsDeclared: 'owned' }],
  });
  const observationIds = source.observations?.map(item => item.id) || [];
  const audit = createDocumentAudit(input, source, {
    verdict: 'insufficient_evidence',
    reason: 'This excerpt does not establish physical mitigation.',
    citations: [],
  }, 1, {
    caseId: sourceCase.caseId,
    externalEvidence: [],
    provenance: book.provenance,
    datasetSnapshotId: 'unep-mars-test-snapshot',
    datasetInputSha256: 'a'.repeat(64),
    observationIds,
    observationTimeline: source.observations?.map(item => ({ id: item.id, observedAt: item.date })) || [],
  });
  const newerSnapshot: MarsSnapshot = {
    dataset: 'UNEP MARS', sourceUrl: book.provenance.downloadUrl, license: book.provenance.license,
    importedAt: '2026-10-13T00:00:00.000Z', snapshotId: 'unep-mars-newer-snapshot',
    provenance: { archiveSha256: 'b'.repeat(64) }, sources: [source],
  };
  return { book, source, audit, observationIds, newerSnapshot };
}

test('omits current observations when the source or snapshot differs from a saved audit', async () => {
  const { book, source, audit, newerSnapshot } = await reportFixture();
  const report = buildReportExportPayload({
    audit, claim: 'mitigation_confirmed', source, snapshot: newerSnapshot,
    sourceArchiveHash: 'b'.repeat(64), realMode: true, generatedAt: '2026-10-13T00:00:00.000Z',
  });

  expect(report).toMatchObject({
    exportType: 'audit_report', selectedSourceId: audit.sourceId,
    sourceContextStatus: 'omitted_dataset_mismatch', observations: [], unlinkedObservationCount: null,
    historicalContext: { kind: 'historical_source_observations', observations: [] },
    sourceDataset: { snapshotId: 'unep-mars-test-snapshot', archiveSha256: book.provenance.archiveSha256, inputFileSha256: 'a'.repeat(64) },
  });
  const verification = await verifyImportedAuditReport(await addExportIntegrity(report));
  expect(verification).toMatchObject({ localDigest: 'valid', exportContext: 'manifest_valid', sourceId: audit.sourceId });
});

test('keeps historical source observations in a separate context section, not as cited evidence', async () => {
  const { book, source, newerSnapshot } = await reportFixture();
  const sourceCase = book.cases.find(item => item.sourceId === source.sourceId)!;
  const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'mitigation_confirmed' }, {
    caseId: sourceCase.caseId, externalEvidence: source.externalEvidence, provenance: book.provenance,
  });
  const sameSnapshot: MarsSnapshot = {
    ...newerSnapshot,
    snapshotId: book.provenance.snapshotId,
    provenance: { archiveSha256: book.provenance.archiveSha256 },
  };
  const report = buildReportExportPayload({
    audit, claim: 'mitigation_confirmed', source, snapshot: sameSnapshot,
    sourceArchiveHash: book.provenance.archiveSha256, realMode: true, generatedAt: '2026-10-13T00:00:00.000Z',
  });

  expect(audit.bundle.citedEvidence).toEqual([]);
  expect(report.observations).toEqual([]);
  expect(report.historicalContext).toMatchObject({
    kind: 'historical_source_observations',
    relationship: 'context_only_not_claim_evidence',
    datasetSnapshotId: book.provenance.snapshotId,
    observations: source.observations,
  });

  const protectedReport = await addExportIntegrity(report);
  expect(await verifyImportedAuditReport(protectedReport)).toMatchObject({
    localDigest: 'valid', exportContext: 'manifest_valid', sourceId: audit.sourceId,
    historicalObservationCount: source.observations?.length,
  });
});

test('detects changes to contextual historical observations in an exported report', async () => {
  const { book, source, audit } = await reportFixture();
  const sameSnapshot: MarsSnapshot = {
    dataset: 'UNEP MARS', sourceUrl: book.provenance.downloadUrl, license: book.provenance.license,
    importedAt: book.provenance.retrievedAt, snapshotId: 'unep-mars-test-snapshot',
    provenance: { archiveSha256: book.provenance.archiveSha256, webSnapshotInputSha256: 'a'.repeat(64) }, sources: [source],
  };
  const report = await addExportIntegrity(buildReportExportPayload({
    audit, claim: 'mitigation_confirmed', source, snapshot: sameSnapshot,
    sourceArchiveHash: book.provenance.archiveSha256, realMode: true, generatedAt: '2026-10-13T00:00:00.000Z',
  }));
  const context = report.historicalContext as { observations: Array<Record<string, unknown>> };
  context.observations[0] = { ...context.observations[0], fluxKgHr: 999999 };

  expect(await verifyImportedAuditReport(report)).toMatchObject({
    localDigest: 'invalid', exportContext: 'manifest_invalid',
  });
});

test('omits observations when the dataset input bytes differ despite matching snapshot ID and archive provenance', async () => {
  const { book, source, audit } = await reportFixture();
  const alteredInputSnapshot: MarsSnapshot = {
    dataset: 'UNEP MARS', sourceUrl: book.provenance.downloadUrl, license: book.provenance.license,
    importedAt: book.provenance.retrievedAt, snapshotId: 'unep-mars-test-snapshot',
    provenance: { archiveSha256: book.provenance.archiveSha256, webSnapshotInputSha256: 'c'.repeat(64) }, sources: [source],
  };
  const report = buildReportExportPayload({
    audit, claim: 'mitigation_confirmed', source, snapshot: alteredInputSnapshot,
    sourceArchiveHash: book.provenance.archiveSha256, realMode: true, generatedAt: '2026-10-13T00:00:00.000Z',
  });

  expect(report.sourceContextStatus).toBe('omitted_dataset_mismatch');
  expect(report.observations).toEqual([]);
  expect(report.unlinkedObservationCount).toBeNull();
});

test('export checksum detects changes to attached observation values', async () => {
  const { book, source, audit, observationIds } = await reportFixture();
  const sameSnapshot: MarsSnapshot = {
    dataset: 'UNEP MARS', sourceUrl: book.provenance.downloadUrl, license: book.provenance.license,
    importedAt: book.provenance.retrievedAt, snapshotId: 'unep-mars-test-snapshot',
    provenance: { archiveSha256: book.provenance.archiveSha256, webSnapshotInputSha256: 'a'.repeat(64) }, sources: [source],
  };
  expect(observationIds.length).toBeGreaterThan(0);
  const report = buildReportExportPayload({
    audit, claim: 'mitigation_confirmed', source, snapshot: sameSnapshot,
    sourceArchiveHash: book.provenance.archiveSha256, realMode: true, generatedAt: '2026-10-13T00:00:00.000Z',
  });
  const protectedReport = await addExportIntegrity(report);
  protectedReport.observations[0] = { ...protectedReport.observations[0], fluxKgHr: 999999 };

  const verification = await verifyImportedAuditReport(protectedReport);
  expect(verification.localDigest).toBe('invalid');
  expect(verification.exportContext).toBe('manifest_invalid');
});

test('preserves snapshot-level unresolved count when progressive history rows are not materialized', async () => {
  const { book, source } = await reportFixture();
  const progressiveCatalog: MarsSnapshot = {
    dataset: 'UNEP MARS', sourceUrl: book.provenance.downloadUrl, license: book.provenance.license,
    importedAt: book.provenance.retrievedAt, snapshotId: 'unep-mars-progressive-snapshot',
    provenance: { archiveSha256: book.provenance.archiveSha256, webSnapshotInputSha256: 'd'.repeat(64) },
    counts: { sources: 4211, plumes: 30319 }, plumeCount: 30319, unlinkedObservationCount: 6534,
    unlinkedObservations: [], sources: [source],
  };
  const report = buildReportExportPayload({
    audit: null, claim: 'mitigation_confirmed', source: { ...source, observations: undefined }, snapshot: progressiveCatalog,
    sourceArchiveHash: book.provenance.archiveSha256, realMode: true, generatedAt: '2026-10-14T00:00:00.000Z',
  });

  expect(report.unlinkedObservationCount).toBe(6534);
  expect(report.sourceDataset).toMatchObject({ counts: { sources: 4211, plumes: 30319 } });
});
