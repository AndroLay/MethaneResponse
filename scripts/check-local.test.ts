import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
      '#!/bin/sh\nprintf "%s\\n" "$0 $*" >> "$MR_CHECK_LOCAL_STUB_LOG"\nexit 0\n',
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

function expectRefusedBeforeWork(result: ReturnType<typeof spawnSync>, invocations: string) {
  expect(result.status).toBe(2);
  expect(`${result.stdout}${result.stderr}`).toContain('TEST_DATABASE_URL');
  expect(`${result.stdout}${result.stderr}`).toContain('disposable');
  expect(result.stdout).not.toContain('Baseline evaluation output:');
  expect(existsSync(invocations)).toBe(false);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('complete local verification gate', () => {
  test('refuses to call test/build tools when TEST_DATABASE_URL is missing', () => {
    const { invocations, result } = invokeCheckLocal({ TEST_DATABASE_URL: '' });
    expectRefusedBeforeWork(result, invocations);
    expect(`${result.stdout}${result.stderr}`).toContain('PostGIS');
  });

  test('refuses to run database integration tests against the application database URL', () => {
    const sharedUrl = 'postgresql://localhost/methane_response';
    const { invocations, result } = invokeCheckLocal({
      DATABASE_URL: sharedUrl,
      TEST_DATABASE_URL: sharedUrl,
    });

    expectRefusedBeforeWork(result, invocations);
    expect(`${result.stdout}${result.stderr}`).toContain('must be different from DATABASE_URL');
  });
});
