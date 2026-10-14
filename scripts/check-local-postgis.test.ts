import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const temporaryDirectories: string[] = [];

function invokePostgisGate(options: { dockerInfoStatus?: number; childStatus?: number; existingTestUrl?: string } = {}) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'methane-check-postgis-test-'));
  temporaryDirectories.push(temporaryDirectory);
  const bin = join(temporaryDirectory, 'bin');
  const dockerLog = join(temporaryDirectory, 'docker.log');
  const childEnvironment = join(temporaryDirectory, 'child-environment.txt');
  mkdirSync(bin);
  writeFileSync(dockerLog, '');
  writeFileSync(childEnvironment, '');

  writeFileSync(join(bin, 'docker'), `#!/bin/sh
printf '%s\\n' "$*" >> "$MR_DOCKER_LOG"
case "$1" in
  info) exit "$MR_DOCKER_INFO_STATUS" ;;
  run) printf '0123456789abcdef\\n'; exit "$MR_DOCKER_RUN_STATUS" ;;
  port) printf '127.0.0.1:45678\\n' ;;
  exec) exit 0 ;;
  ps) if [ "$MR_DOCKER_RUN_STATUS" -eq 125 ]; then exit 0; else printf 'stub-container-id\\n'; fi ;;
  rm) exit 0 ;;
  *) exit 91 ;;
esac
`, { mode: 0o755 });
  writeFileSync(join(bin, 'bash'), `#!/bin/sh
printf 'TEST_DATABASE_URL=%s\\nDATABASE_URL=%s\\n' "$TEST_DATABASE_URL" "$DATABASE_URL" > "$MR_CHILD_ENV_LOG"
exit "$MR_CHILD_STATUS"
`, { mode: 0o755 });

  const result = spawnSync('/usr/bin/bash', ['scripts/check-local-postgis.sh'], {
    cwd: resolve(import.meta.dir, '..'),
    encoding: 'utf8',
    timeout: 3000,
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://application.example/methane_response',
      MR_CHILD_ENV_LOG: childEnvironment,
      MR_CHILD_STATUS: String(options.childStatus ?? 0),
      MR_DOCKER_INFO_STATUS: String(options.dockerInfoStatus ?? 0),
      MR_DOCKER_LOG: dockerLog,
      MR_DOCKER_RUN_STATUS: String(options.dockerRunStatus ?? 0),
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      TEST_DATABASE_URL: options.existingTestUrl ?? '',
    },
  });

  return { dockerLog, childEnvironment, result, temporaryDirectory };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runs the full gate on loopback-only tmpfs PostGIS and removes its container', () => {
  const { dockerLog, childEnvironment, result } = invokePostgisGate();
  const calls = readFileSync(dockerLog, 'utf8');
  const environment = readFileSync(childEnvironment, 'utf8');

  expect(result.status).toBe(0);
  expect(calls).toContain('127.0.0.1::5432');
  expect(calls).toContain('--tmpfs /var/lib/postgresql/data:rw,size=512m');
  expect(calls).toContain('com.methane-response.check-run=');
  expect(calls).toContain('postgis/postgis:17-3.5-alpine');
  expect(calls).toContain('rm --force');
  expect(environment).toBe('TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:45678/methane_test\nDATABASE_URL=\n');
  expect(`${result.stdout}${result.stderr}`).not.toContain('postgres:postgres@127.0.0.1');
});

test('removes the temporary database container when the full gate fails', () => {
  const { dockerLog, result } = invokePostgisGate({ childStatus: 17 });
  const calls = readFileSync(dockerLog, 'utf8');

  expect(result.status).toBe(17);
  expect(calls).toContain('rm --force');
});

test('attempts cleanup if Docker reports failure after beginning container startup', () => {
  const { dockerLog, result } = invokePostgisGate({ dockerRunStatus: 12 });
  const calls = readFileSync(dockerLog, 'utf8');

  expect(result.status).toBe(3);
  expect(calls).toContain('run --detach');
  expect(calls).toContain('rm --force');
});

test('does not remove a pre-existing container when the generated name collides', () => {
  const { dockerLog, result } = invokePostgisGate({ dockerRunStatus: 125 });

  expect(result.status).toBe(3);
  expect(readFileSync(dockerLog, 'utf8')).not.toContain('rm --force');
});

test('refuses to replace a caller-provided TEST_DATABASE_URL', () => {
  const { dockerLog, result } = invokePostgisGate({ existingTestUrl: 'postgresql://user:password@host/database' });

  expect(result.status).toBe(2);
  expect(`${result.stdout}${result.stderr}`).toContain('Refusing to replace TEST_DATABASE_URL');
  expect(readFileSync(dockerLog, 'utf8')).toBe('');
});

test('refuses to start a container when Docker is unavailable', () => {
  const { dockerLog, result } = invokePostgisGate({ dockerInfoStatus: 1 });
  const calls = readFileSync(dockerLog, 'utf8');

  expect(result.status).toBe(2);
  expect(`${result.stdout}${result.stderr}`).toContain('Docker daemon');
  expect(calls).not.toContain('run --detach');
});
