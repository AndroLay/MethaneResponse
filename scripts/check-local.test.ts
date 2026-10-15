import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temporaryDirectories: string[] = [];

function invokeCheckLocal(envOverrides: Record<string, string>) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'methane-check-local-test-'));
  temporaryDirectories.push(temporaryDirectory);
  const stubBin = join(temporaryDirectory, 'bin');
  const invocations = join(temporaryDirectory, 'tool-invocations.log');
  const baselineOutput = join(temporaryDirectory, 'baseline.json');
  mkdirSync(stubBin);

  for (const tool of ['bun', 'uv', 'forge']) {
    writeFileSync(
      join(stubBin, tool),
      '#!/bin/sh\nprintf "%s DATABASE_URL=%s TEST_DATABASE_URL=%s\\n" "$0 $*" "${DATABASE_URL:-}" "${TEST_DATABASE_URL:-}" >> "$MR_CHECK_LOCAL_STUB_LOG"\nexit 0\n',
      { mode: 0o755 },
    );
  }

  const result = spawnSync('bash', ['scripts/check-local.sh'], {
    cwd: resolve(import.meta.dir, '..'),
    encoding: 'utf8',
    env: {
      ...process.env,
      ...envOverrides,
      BASELINE_EVALUATION_OUTPUT: baselineOutput,
      MR_CHECK_LOCAL_STUB_LOG: invocations,
      PATH: `${stubBin}:${process.env.PATH ?? ''}`,
      TMPDIR: temporaryDirectory,
    },
  });

  return { baselineOutput, invocations, result };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('complete local verification gate', () => {
  test('runs without a database and scrubs obsolete database settings', () => {
    const { invocations, result } = invokeCheckLocal({
      DATABASE_URL: 'postgresql://must-not-be-used.invalid/methane',
      TEST_DATABASE_URL: 'postgresql://must-not-be-used.invalid/test',
    });

    expect(result.status).toBe(0);
    expect(existsSync(invocations)).toBe(true);
    const calls = readFileSync(invocations, 'utf8');
    expect(calls).toContain('bun install --frozen-lockfile');
    expect(calls).toContain('bun run check');
    expect(calls).toContain('bun run test:api');
    expect(calls).toContain('bun run test:web');
    expect(calls).toContain('forge test');
    expect(calls).not.toContain('must-not-be-used.invalid');
  });

});
