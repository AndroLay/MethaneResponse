import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decisionFixture } from '../apps/api/src/fixtures/investigation-decision';
import { investigationDigest } from '../packages/shared/src/investigation-dossier';
import { investigationBrief } from './export-investigation-brief';

async function handoffFixture() {
  const value = await decisionFixture(), work = value.dossier.history[0];
  work.nextAction = 'DEMO obtain dated follow-up measurements';
  work.acceptanceCriteria = 'DEMO require method, units and uncertainty';
  work.requestEvents = [{ type: 'issued', requestId: 'DEMO-request', requirement: work.nextAction, acceptanceCriteria: work.acceptanceCriteria, recipientRole: 'operator', dueDate: '2026-01-31' },
    { type: 'response_received', requestId: 'DEMO-request', responseId: 'DEMO-response', reference: 'https://example.org/DEMO-response', locator: 'DEMO page 2', sha256: 'a'.repeat(64), reportedDate: { precision: 'month', value: '2026-01' }, rights: 'explicit_permission' }];
  const { digest: dossierDigest, ...dossierPayload } = value.dossier;
  value.dossier.digest = await investigationDigest(dossierPayload);
  const { digest, ...payload } = value;
  value.digest = await investigationDigest(payload);
  return value;
}

test('verified brief preserves source, scope, requested action and uncertainty without implying mitigation', async () => {
  const value = await handoffFixture(), brief = await investigationBrief({ decision: value }, value.digest);
  for (const part of ['DEMO\\_SOURCE', '2026\\-01\\-01 through 2026\\-01\\-02', 'Request further evidence', 'insufficient\\_evidence', 'method, units and uncertainty', 'precision: month', 'NOT PERFORMED', 'PRIVATE WORKING MATERIAL', value.digest]) expect(brief).toContain(part);
  expect(brief).toContain('**Assignee:** Not recorded');
  expect(brief).not.toContain('2026-01-01 (precision: month)');
  expect(brief).toContain('**Exact assessment claim:** Not recorded');
});

test('missing or wrong trusted digest, edited source and altered-and-rehashed decisions are rejected', async () => {
  const value = await handoffFixture();
  await expect(investigationBrief(value, '')).rejects.toThrow('trusted-digest');
  await expect(investigationBrief(value, `0x${'0'.repeat(64)}`)).rejects.toThrow('trusted-digest');
  const edited = structuredClone(value); edited.dossier.context.sourceId = 'OTHER_SOURCE';
  await expect(investigationBrief(edited, value.digest)).rejects.toThrow('validation');
  const changed = structuredClone(value); changed.rationale = 'DEMO changed rationale after the decision was frozen';
  const { digest, ...payload } = changed; changed.digest = await investigationDigest(payload);
  await expect(investigationBrief(changed, value.digest)).rejects.toThrow('validation');
});

test('Markdown escapes active HTML and headings and excludes untrusted envelope fields', async () => {
  const value = await handoffFixture(); value.rationale = '<img src=x onerror=alert(1)>\n# VERIFIED repair [click](javascript:alert(1))';
  const { digest, ...payload } = value; value.digest = await investigationDigest(payload);
  const brief = await investigationBrief({ decision: value, receipt: { secret: 'NEVER_EXPORT' }, revisit: { state: 'forged_current_status' } }, value.digest);
  expect(brief).not.toContain('<img'); expect(brief).toContain('&lt;img');
  expect(brief).not.toContain('\n# VERIFIED'); expect(brief).toContain('\\[click\\]');
  expect(brief).not.toContain('NEVER_EXPORT'); expect(brief).not.toContain('forged_current_status');
});

test('CLI uses exclusive private files, preserves existing output, and fails without a trusted pin', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-brief-'));
  try {
    const value = await handoffFixture(), input = join(directory, 'decision.json'), output = join(directory, 'brief.md');
    await writeFile(input, JSON.stringify({ decision: value }));
    const run = (...args: string[]) => Bun.spawnSync([process.execPath, '--no-env-file', `${import.meta.dir}/export-investigation-brief.ts`, ...args], { stdout: 'pipe', stderr: 'pipe', env: { PATH: process.env.PATH } });
    expect(run(input, '--expected-digest', value.digest, '--output', output).exitCode).toBe(0);
    expect((await stat(output)).mode & 0o777).toBe(0o600);
    const original = await readFile(output, 'utf8');
    expect(run(input, '--expected-digest', value.digest, '--output', output).exitCode).toBe(1);
    expect(await readFile(output, 'utf8')).toBe(original);
    expect(run(input, '--output', join(directory, 'missing-pin.md')).exitCode).toBe(1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
