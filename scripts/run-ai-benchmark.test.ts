import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { executeBenchmarkToPrivateFile, validateCandidates } from './run-ai-benchmark';

const excerpt = 'An operator filed a repair notice, but this report does not establish independent, sustained methane-emissions mitigation. '.repeat(2);
const valid = {
  claimId: 'claim-01', split: 'test', synthetic: false,
  sourceInspected: true,
  reviewerId: 'adjudicator-01', reviewedAt: '2026-10-13',
  rightsReview: {
    reviewerId: 'adjudicator-01', reviewedAt: '2026-10-13',
    documents: [{
      documentId: 'report-01', documentUrl: 'https://evidence.example/report-01',
      rightsBasis: { kind: 'license', title: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      scopes: { excerptProcessing: true, providerProcessing: true, privateEvaluationStorage: true,
        quoteStorage: true, metricsPublication: true },
    }],
  },
  input: { sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
    documents: [{ id: 'report-01', title: 'Permission-cleared report', text: excerpt, rightsDeclared: 'explicit_permission' }] },
};

test('billable runner admits only bounded held-out real and reviewed evidence', () => {
  expect(validateCandidates([valid], 1)).toHaveLength(1);
  expect(() => validateCandidates([{ ...valid, synthetic: true }], 1)).toThrow();
  expect(() => validateCandidates([{ ...valid, split: 'train' }], 1)).toThrow();
  expect(() => validateCandidates([{ ...valid, sourceInspected: false }], 1)).toThrow();
  expect(() => validateCandidates([{ ...valid, input: { ...valid.input, consentToExternalProcessing: false } }], 1)).toThrow();
  expect(() => validateCandidates([valid, valid], 2)).toThrow('Duplicate');
  expect(() => validateCandidates([valid, { ...valid, claimId: 'claim-02' }], 1)).toThrow('approved cap');
  expect(() => validateCandidates([valid], 101)).toThrow('1–100');
});

test('billable runner requires per-document rights scope for every processing use', () => {
  const approval = valid.rightsReview.documents[0];
  expect(() => validateCandidates([{ ...valid, rightsReview: undefined }], 1)).toThrow('rights review');
  for (const scope of ['excerptProcessing', 'providerProcessing', 'privateEvaluationStorage', 'quoteStorage', 'metricsPublication'] as const) {
    expect(() => validateCandidates([{ ...valid, rightsReview: { ...valid.rightsReview,
      documents: [{ ...approval, scopes: { ...approval.scopes, [scope]: false } }] } }], 1)).toThrow('Rights review must clear');
  }
  expect(() => validateCandidates([{ ...valid, rightsReview: { ...valid.rightsReview,
    documents: [] } }], 1)).toThrow('match the submitted documents');
  expect(() => validateCandidates([{ ...valid, rightsReview: { ...valid.rightsReview,
    documents: [{ ...approval, documentUrl: 'http://evidence.example/report-01' }] } }], 1)).toThrow('HTTPS');
  expect(() => validateCandidates([{ ...valid, rightsReview: { ...valid.rightsReview,
    documents: [{ ...approval, rightsBasis: { ...approval.rightsBasis, url: 'https://user:pass@license.example' } }] } }], 1)).toThrow('HTTPS');
  expect(() => validateCandidates([{ ...valid, input: { ...valid.input, documents: [{ ...valid.input.documents[0],
    sourceUrl: 'https://different.example/report' }] } }], 1)).toThrow('does not match');
  const [candidate] = validateCandidates([valid], 1);
  expect(candidate.rightsReviewSha256).toMatch(/^[0-9a-f]{64}$/);
});

test('benchmark output is published only after every provider assessment succeeds', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-'));
  const output = join(directory, 'predictions.jsonl');
  const candidates = validateCandidates([valid, { ...valid, claimId: 'claim-02' }], 2);
  let calls = 0;
  try {
    await expect(executeBenchmarkToPrivateFile(candidates, output, async () => {
      calls += 1;
      if (calls === 2) throw new Error('provider unavailable');
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow('provider unavailable');
    expect(calls).toBe(2);
    expect(await readdir(directory)).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('atomic publish preserves an output created by another process during assessment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-'));
  const output = join(directory, 'predictions.jsonl');
  let calls = 0;
  try {
    await expect(executeBenchmarkToPrivateFile(validateCandidates([valid], 1), output, async () => {
      calls += 1;
      await writeFile(output, 'another complete run\n', { flag: 'wx', mode: 0o600 });
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow();
    expect(calls).toBe(1);
    expect(await readFile(output, 'utf8')).toBe('another complete run\n');
    expect(await readdir(directory)).toEqual(['predictions.jsonl']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('exclusive run lock prevents a concurrent invocation from calling the provider', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-'));
  const output = join(directory, 'predictions.jsonl');
  let signalStarted!: () => void;
  let finishAssessment!: () => void;
  const started = new Promise<void>(resolve => { signalStarted = resolve; });
  const assessmentGate = new Promise<void>(resolve => { finishAssessment = resolve; });
  let calls = 0;
  try {
    const firstRun = executeBenchmarkToPrivateFile(validateCandidates([valid], 1), output, async () => {
      calls += 1;
      signalStarted();
      await assessmentGate;
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    });
    await started;
    await expect(executeBenchmarkToPrivateFile(validateCandidates([valid], 1), output, async () => {
      calls += 1;
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow();
    expect(calls).toBe(1);
    finishAssessment();
    expect(await firstRun).toBe(1);
    expect(await readdir(directory)).toEqual(['predictions.jsonl']);
  } finally {
    finishAssessment();
    await rm(directory, { recursive: true, force: true });
  }
});

test('completed benchmark output is private, complete, and refuses overwrite before provider use', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-'));
  const output = join(directory, 'predictions.jsonl');
  const candidates = validateCandidates([valid, { ...valid, claimId: 'claim-02' }], 2);
  let calls = 0;
  const assessor = async () => {
    calls += 1;
    return { verdict: 'insufficient_evidence' as const, reason: 'The supplied passage is not conclusive.', citations: [] };
  };
  try {
    expect(await executeBenchmarkToPrivateFile(candidates, output, assessor)).toBe(2);
    const outputInfo = await stat(output);
    expect(outputInfo.mode & 0o777).toBe(0o600);
    expect(await readdir(directory)).toEqual(['predictions.jsonl']);
    const lines = (await readFile(output, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => /^[0-9a-f]{64}$/.test(line.rightsReviewSha256))).toBe(true);
    const original = await readFile(output, 'utf8');
    await expect(executeBenchmarkToPrivateFile(candidates, output, assessor)).rejects.toThrow();
    expect(calls).toBe(2);
    expect(await readFile(output, 'utf8')).toBe(original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('benchmark prediction output cannot be placed in public asset directories', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-'));
  const publicDirectory = join(directory, 'public');
  const output = join(publicDirectory, 'predictions.jsonl');
  const candidate = validateCandidates([valid], 1);
  let calls = 0;
  try {
    await expect(executeBenchmarkToPrivateFile(candidate, output, async () => {
      calls += 1;
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow('cannot be written under public assets');
    expect(calls).toBe(0);
    expect(await readdir(directory)).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('benchmark prediction output cannot be written anywhere inside the repository', async () => {
  const output = join(import.meta.dir, `private-predictions-${randomUUID()}.jsonl`);
  let calls = 0;
  try {
    await expect(executeBenchmarkToPrivateFile(validateCandidates([valid], 1), output, async () => {
      calls += 1;
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow('outside the repository');
    expect(calls).toBe(0);
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(output, { force: true });
  }
});

test('benchmark prediction output cannot reach the repository through a symlink', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-link-'));
  const alias = join(directory, 'repository-link');
  const filename = `private-predictions-${randomUUID()}.jsonl`;
  const output = join(alias, filename);
  const target = join(import.meta.dir, filename);
  let calls = 0;
  await symlink(import.meta.dir, alias);
  try {
    await expect(executeBenchmarkToPrivateFile(validateCandidates([valid], 1), output, async () => {
      calls += 1;
      return { verdict: 'insufficient_evidence', reason: 'The supplied passage is not conclusive.', citations: [] };
    })).rejects.toThrow('outside the repository');
    expect(calls).toBe(0);
    await expect(stat(target)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(target, { force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test('benchmark CLI does not create an output directory through a symlink into the repository', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-ai-benchmark-cli-link-'));
  const alias = join(directory, 'repository-link');
  const missingDirectoryName = `private-benchmark-output-${randomUUID()}`;
  const output = join(alias, missingDirectoryName, 'predictions.jsonl');
  const targetDirectory = join(import.meta.dir, missingDirectoryName);
  const input = join(directory, 'claims.jsonl');
  await symlink(import.meta.dir, alias);
  await writeFile(input, `${JSON.stringify(valid)}\n`, { mode: 0o600 });
  try {
    const child = spawnSync(process.execPath, [
      join(import.meta.dir, 'run-ai-benchmark.ts'),
      `--input=${input}`,
      `--output=${output}`,
      '--max-claims=1',
      '--i-approve-billable-provider-calls=yes',
    ], {
      cwd: resolve(import.meta.dir, '..'),
      encoding: 'utf8',
      env: { ...process.env, AI_API_KEY: 'test-key', AI_MODEL: 'test-model', AI_BASE_URL: 'http://localhost', AI_REVIEW_TOKEN: 'r'.repeat(32) },
    });
    expect(child.error).toBeUndefined();
    expect(child.status).not.toBe(0);
    expect(child.stderr).toContain('output directory must already exist');
    await expect(stat(targetDirectory)).rejects.toMatchObject({ code: 'ENOENT' });
  } finally {
    await rm(targetDirectory, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
