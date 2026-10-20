import { expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dir, '..');
function run(args: string[], configured = false) {
  return spawnSync('bun', ['--no-env-file', 'scripts/probe-document-ai.ts', ...args], {
    cwd: root, encoding: 'utf8', timeout: 10_000,
    env: { ...process.env,
      AI_API_KEY: configured ? 'not-a-real-provider-key' : '',
      AI_MODEL: 'deepseek-v4.1-flash-1017', AI_BASE_URL: 'https://provider.invalid/v1',
      AI_REVIEW_TOKEN: 't'.repeat(48),
    },
  });
}
test('live smoke refuses provider calls without explicit approval', () => {
  const result = run([]);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Explicit --approve-provider-calls is required');
});
test('live smoke refuses missing credentials', () => {
  const result = run(['--approve-provider-calls']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Configure the private backend provider environment first');
});
test('live smoke protects an existing output before any external call', () => {
  const directory = mkdtempSync(join(tmpdir(), 'methane-ai-probe-'));
  const output = join(directory, 'report.json');
  writeFileSync(output, 'preserve-me');
  try {
    const result = run(['--approve-provider-calls', `--output=${output}`], true);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('EEXIST');
    expect(result.stderr).not.toContain('provider failed');
    expect(readFileSync(output, 'utf8')).toBe('preserve-me');
  } finally { rmSync(directory, { recursive: true }); }
});
