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
import { canonicalJson } from '../apps/web/src/report-export';

const repositoryRoot = resolve(import.meta.dir, '..');
const verifierPath = resolve(import.meta.dir, 'verify-audit.ts');
let temporaryDirectory = '';

function runVerifier(reportPath: string) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, verifierPath, reportPath],
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
