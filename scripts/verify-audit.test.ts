import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DEMO_SOURCES } from '../packages/shared/src/index';
import { createAudit } from '../apps/api/src/audit';
import { createDocumentAudit, createReviewedAudit, DocumentAssessmentInput } from '../apps/api/src/ai-review';
import { loadCasebook, sourceFromCase } from '../apps/api/src/casebook';
import type { AuditResult } from '../packages/shared/src/index';
import { addExportIntegrity, canonicalJson } from '../apps/web/src/report-export';

const repositoryRoot = resolve(import.meta.dir, '..');
const verifierPath = resolve(import.meta.dir, 'verify-audit.ts');
let temporaryDirectory = '';

function runVerifier(reportPath: string, flags: string[] = []) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, '--no-env-file', verifierPath, reportPath, ...flags],
    cwd: repositoryRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

describe('audit receipt CLI', () => {
  beforeAll(async () => { temporaryDirectory = await mkdtemp(join(tmpdir(), 'methane-audit-verify-')); });
  afterAll(async () => { if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true }); });

  test('checks the export context checksum and rejects wrapper tampering', async () => {
    const source = DEMO_SOURCES[0];
    const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
    const payload = await addExportIntegrity({ latestAudit: audit, claim: audit.claimType, selectedSourceId: audit.sourceId, disclaimer: 'DEMO checksum is unsigned and not physical proof.' });
    const path = join(temporaryDirectory, 'context-checksum.json');
    await writeFile(path, JSON.stringify(payload));
    const intact = runVerifier(path);
    expect(intact.exitCode).toBe(0);
    expect(intact.stdout).toContain('export_context_checksum: VALID');
    expect(runVerifier(path, ['--require-context']).exitCode).toBe(0);
    await writeFile(path, JSON.stringify({ ...payload, claim: 'mitigation_confirmed' }));
    const changed = runVerifier(path);
    expect(changed.exitCode).toBe(1);
    expect(changed.stderr).toContain('export_context_checksum: INVALID');
  });

  test('legacy wrappers remain verifiable with an explicit context limitation', async () => {
    const source = DEMO_SOURCES[0];
    const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
    const path = join(temporaryDirectory, 'legacy-wrapper-context.json');
    await writeFile(path, JSON.stringify({ latestAudit: audit }));
    const checked = runVerifier(path);
    expect(checked.exitCode).toBe(0);
    expect(checked.stdout).toContain('export_context_checksum: NOT_RECORDED');
    expect(checked.stdout).toContain('Wrapper fields are outside the audit bundle digest');
    expect(runVerifier(path, ['--require-context']).exitCode).toBe(1);
  });

  test('rejects rechecksummed export claims that disagree with the saved audit', async () => {
    const source = DEMO_SOURCES[0];
    const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' });
    const path = join(temporaryDirectory, 'context-inconsistent-claim.json');
    await writeFile(path, JSON.stringify(await addExportIntegrity({ latestAudit: audit, claim: 'mitigation_confirmed', selectedSourceId: audit.sourceId })));
    const checked = runVerifier(path);
    expect(checked.exitCode).toBe(1);
    expect(checked.stderr).toContain('export_context_fields: MISMATCH');
  });

  test('rejects rechecksummed dataset fields that disagree with audit provenance', async () => {
    const book = await loadCasebook();
    const source = sourceFromCase(book.cases[0]!, book.provenance.catalogUrl, book.provenance);
    const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' }, { provenance: book.provenance });
    const dataset = { snapshotId: audit.bundle.provenance!.snapshotId, archiveSha256: audit.bundle.provenance!.archiveSha256 };
    const path = join(temporaryDirectory, 'context-inconsistent-dataset.json');
    for (const changed of [dataset, { ...dataset, snapshotId: 'another-snapshot' }, { ...dataset, archiveSha256: 'f'.repeat(64) }]) {
      await writeFile(path, JSON.stringify(await addExportIntegrity({ latestAudit: audit, sourceDataset: changed })));
      const checked = runVerifier(path, ['--require-context']);
      expect(checked.exitCode).toBe(changed === dataset ? 0 : 1);
      if (changed !== dataset) expect(checked.stderr).toContain('export_context_fields: MISMATCH');
    }
  });

  test('rejects unknown or repeated CLI options instead of silently weakening requirements', async () => {
    const audit = createAudit(DEMO_SOURCES[0], { sourceId: DEMO_SOURCES[0].sourceId, claimType: 'source_detected' });
    const path = join(temporaryDirectory, 'context-options.json');
    await writeFile(path, JSON.stringify(audit));
    for (const flags of [['--require-contxt'], ['--require-chian'], ['--require-context', '--require-context']]) {
      const checked = runVerifier(path, flags);
      expect(checked.exitCode).toBe(2);
      expect(checked.stderr).toContain('Unknown or repeated option');
    }
    expect(runVerifier(path, ['--require-context']).exitCode).toBe(1);
  });

  test('legacy commitments remain valid and rehashed false physical semantics are rejected', async () => {
    const audit = createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' });
    delete audit.bundle.assessmentSemantics;
    audit.bundleHash = `0x${createHash('sha256').update(canonicalJson(audit.bundle)).digest('hex')}`;
    const path = join(temporaryDirectory, 'legacy-p4.json');
    await writeFile(path, JSON.stringify(audit));
    expect(runVerifier(path).exitCode).toBe(0);
    Object.assign(audit.bundle, { assessmentSemantics: { version: 1, basis: 'metadata_coverage', physicalVerification: 'verified' } });
    audit.bundleHash = `0x${createHash('sha256').update(canonicalJson(audit.bundle)).digest('hex')}`;
    await writeFile(path, JSON.stringify(audit));
    expect(runVerifier(path).exitCode).toBe(1);
  });

  test('redacted summary verification checks historical bytes and never declares current publication active', async () => {
    const summary = { schemaVersion: 1, kind: 'redacted_human_assessment', auditId: '00000000-0000-4000-8000-000000000001', revision: 1,
      sourceId: 'DEMO-001', claimType: 'source_detected', result: 'insufficient_evidence', generatedAt: '2026-10-17T00:00:00Z', synthetic: true,
      period: { startDate: '2026-09-01', endDate: '2026-09-30' }, reviewerStatus: 'unverified', conflictDeclaration: 'not_declared',
      referenceCount: 0, citedReferenceCount: 0, referenceChecks: { retrieved: 0, digestMatched: 0, digestMismatched: 0, unchecked: 0 },
      privateBundleHash: `0x${'a'.repeat(64)}`, limitations: ['DEMO; historical checksum is not physical truth.'] };
    const record = { summary, summaryHash: `0x${createHash('sha256').update(canonicalJson(summary)).digest('hex')}` };
    const path = join(temporaryDirectory, 'redacted-summary.json');
    await writeFile(path, JSON.stringify(record));
    const result = runVerifier(path);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('summary_hash: VALID');
    expect(result.stdout).toContain('publication_status: NOT_CHECKED');
    expect(result.stdout).not.toContain('publication_status: published');
    expect(runVerifier(path, ['--require-chain']).exitCode).toBe(1);
    expect(runVerifier(path, ['--require-context']).exitCode).toBe(1);
    await writeFile(path, JSON.stringify({ ...record, summary: { ...summary, result: 'supported' } }));
    expect(runVerifier(path).exitCode).toBe(1);
  });

  test('accepts an intact local hash and rejects a changed evidence bundle', async () => {
    const source = DEMO_SOURCES[0];
    const audit = createAudit(source, { sourceId: source.sourceId, claimType: 'source_detected' }, { caseId: source.sourceId, revision: 1 });
    const intactPath = join(temporaryDirectory, 'intact.json');
    await writeFile(intactPath, JSON.stringify(audit));
    const intact = runVerifier(intactPath);
    expect(intact.exitCode).toBe(0);
    expect(intact.stdout).toContain('bundle_hash: VALID');
    expect(intact.stdout).toContain('chain_receipt: ABSENT');

    const modified = structuredClone(audit) as AuditResult;
    modified.bundle.reason = 'modified after export';
    const modifiedPath = join(temporaryDirectory, 'modified.json');
    await writeFile(modifiedPath, JSON.stringify(modified));
    const invalid = runVerifier(modifiedPath);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain('bundle_hash: INVALID');
  });

  test('verifies an exported v3 human-review revision and rejects a changed decision', async () => {
    const book = await loadCasebook();
    const sourceCase = book.cases[0];
    const source = sourceFromCase(sourceCase, book.provenance.catalogUrl, book.provenance);
    const input = DocumentAssessmentInput.parse({
      sourceId: source.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{
        id: 'authorized-inspection',
        title: 'Authorized inspection excerpt',
        text: 'The operator recorded a completed valve repair. An independent follow-up measurement has not yet been performed to verify sustained methane mitigation.',
        rightsDeclared: 'explicit_permission',
      }],
    });
    const draft = createDocumentAudit(input, source, {
      verdict: 'supported',
      reason: 'The excerpt records a reported repair, but physical mitigation remains unverified.',
      citations: [{ documentId: 'authorized-inspection', quote: 'The operator recorded a completed valve repair.' }],
    }, 1, { caseId: sourceCase.caseId, externalEvidence: [], provenance: book.provenance });
    const reviewed = createReviewedAudit(draft, 2, 'independent-reviewer', {
      status: 'needs_more_evidence',
      note: 'Request an independent post-repair methane observation.',
    });

    const reportPath = join(temporaryDirectory, 'v3-reviewed-report.json');
    await writeFile(reportPath, JSON.stringify({ latestAudit: reviewed }));
    const valid = runVerifier(reportPath);
    expect(valid.exitCode).toBe(0);
    expect(valid.stdout).toContain('bundle_hash: VALID');
    expect(valid.stdout).toContain('revision: 2');

    const modified = structuredClone(reviewed) as AuditResult;
    modified.bundle.intelligence!.reviewStatus = 'approved';
    await writeFile(reportPath, JSON.stringify({ latestAudit: modified }));
    const invalid = runVerifier(reportPath);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stderr).toContain('bundle_hash: INVALID');

    const modifiedEnvelope = structuredClone(reviewed) as AuditResult;
    modifiedEnvelope.result = 'supported';
    await writeFile(reportPath, JSON.stringify({ latestAudit: modifiedEnvelope }));
    const mismatched = runVerifier(reportPath);
    expect(mismatched.exitCode).toBe(1);
    expect(mismatched.stderr).toContain('bundle_hash: INVALID');
  });

  test('rejects malformed open-license metadata even when its bundle hash is recomputed', async () => {
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
    const intactPath = join(temporaryDirectory, 'open-license-intact.json');
    await writeFile(intactPath, JSON.stringify(audit));
    expect(runVerifier(intactPath).exitCode).toBe(0);

    const malformed = structuredClone(audit);
    malformed.bundle.intelligence!.documentDigests[0]!.licenseUrl = 'http://publisher.example/license';
    malformed.bundleHash = `0x${createHash('sha256').update(canonicalJson(malformed.bundle)).digest('hex')}` as `0x${string}`;
    const malformedPath = join(temporaryDirectory, 'open-license-malformed.json');
    await writeFile(malformedPath, JSON.stringify(malformed));
    const invalid = runVerifier(malformedPath);
    expect(invalid.exitCode).toBe(1);
    expect(invalid.stdout).toContain('bundle_hash: VALID');
    expect(invalid.stdout).toContain('document_rights_metadata: INVALID');
    expect(invalid.stderr).toContain('document_rights_metadata: INVALID');
  });
});

test('require-chain mode refuses an offline-only success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-required-chain-'));
  try {
    const audit = createAudit(DEMO_SOURCES[0], { sourceId: DEMO_SOURCES[0].sourceId, claimType: 'source_detected' });
    const path = join(directory, 'report.json'); await writeFile(path, JSON.stringify(audit));
    const checked = Bun.spawnSync([process.execPath, '--no-env-file', verifierPath, path, '--require-chain'], { env: { PATH: process.env.PATH }, stdout: 'pipe', stderr: 'pipe' });
    expect(checked.exitCode).toBe(1);
    expect(new TextDecoder().decode(checked.stderr)).toContain('chain_receipt: REQUIRED');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
