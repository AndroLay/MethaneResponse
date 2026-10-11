import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DEMO_SOURCES } from '../packages/shared/src/index';
import { createAudit } from '../apps/api/src/audit';
import type { AuditResult } from '../packages/shared/src/index';

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
});
