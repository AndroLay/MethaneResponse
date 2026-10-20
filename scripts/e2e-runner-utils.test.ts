import { describe, expect, test } from 'bun:test';
import { buildE2ERunnerEnvironment, routeE2EArguments, chromiumSandboxEnabled, buildE2EWebServerCommand, chromiumGraphicsArguments } from './e2e-runner-utils';

test('only the geospatial browser suite forces software WebGL; document workflows retain default graphics', () => {
  expect(chromiumGraphicsArguments(true)).toEqual(['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader']);
  expect(chromiumGraphicsArguments(false)).toEqual([]);
});

test('browser checks build a fresh production preview and reject unsafe or invalid ports', () => {
  const command = buildE2EWebServerCommand('4179');
  expect(command).toBe('cd apps/web && NODE_ENV=production bun --no-env-file run build && NODE_ENV=production bun --no-env-file run preview -- --host 127.0.0.1 --port 4179 --strictPort');
  for (const port of ['0', '65536', '-1', '4.5', '4179; echo injected', '']) {
    expect(() => buildE2EWebServerCommand(port)).toThrow('Invalid E2E web port');
  }
});

test('Chromium sandbox remains enabled locally and on unknown CI, with a narrow hosted-runner exception', () => {
  expect(chromiumSandboxEnabled({})).toBe(true);
  expect(chromiumSandboxEnabled({ CI: 'true' })).toBe(true);
  expect(chromiumSandboxEnabled({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'self-hosted' })).toBe(true);
  expect(chromiumSandboxEnabled({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted' })).toBe(false);
  const env = buildE2ERunnerEnvironment({ CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', AI_API_KEY: 'excluded' }, '/tmp/e2e');
  expect(chromiumSandboxEnabled(env)).toBe(false);
  expect(env).not.toHaveProperty('AI_API_KEY');
});

describe('E2E runner environment', () => {
  test('copies only explicitly allowlisted non-secret settings', () => {
    const environment = buildE2ERunnerEnvironment({
      PATH: '/usr/bin',
      HOME: '/tmp/test-home',
      CI: 'true',
      FORCE_COLOR: 'should-not-cause-output-noise',
      NO_COLOR: '1',
      PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/usr/bin/chromium',
      METHANE_E2E_API_PORT: '43210',
      GH_TOKEN: 'must-not-cross-process-boundary',
      AI_API_KEY: 'must-not-cross-process-boundary',
      DATABASE_URL: 'postgres://must-not-cross-process-boundary',
      NODE_OPTIONS: '--require=unexpected-module',
      VITE_SECRET: 'must-not-cross-process-boundary',
    }, '/tmp/e2e-state');

    expect(environment).toEqual({
      PATH: '/usr/bin',
      HOME: '/tmp/test-home',
      CI: 'true',
      PLAYWRIGHT_CHROMIUM_EXECUTABLE: '/usr/bin/chromium',
      METHANE_E2E_API_PORT: '43210',
      TMPDIR: '/tmp/e2e-state',
      METHANE_E2E_TEMP_ROOT: '/tmp/e2e-state',
    });
  });
});

describe('E2E argument routing', () => {
  test('runs only the matching phase when a workflow file is selected', () => {
    const baselineArgs = ['e2e/audit-workflow.spec.ts', '--grep', 'historical'];
    expect(routeE2EArguments(baselineArgs)).toEqual({ baseline: baselineArgs, ai: undefined });

    const aiArgs = ['e2e/ai-review-workflow.spec.ts', '--list'];
    expect(routeE2EArguments(aiArgs)).toEqual({ baseline: undefined, ai: aiArgs });
    expect(routeE2EArguments(['/workspace/repo/e2e/ai-review-workflow.spec.ts', '--list'])).toEqual({
      baseline: undefined,
      ai: ['/workspace/repo/e2e/ai-review-workflow.spec.ts', '--list'],
    });
  });

  test('keeps both workflow phases for unscoped or mixed selections', () => {
    expect(routeE2EArguments(['--list'])).toEqual({ baseline: ['--list'], ai: ['--list'] });
    expect(routeE2EArguments([
      'e2e/audit-workflow.spec.ts',
      'e2e/ai-review-workflow.spec.ts',
      '--list',
    ])).toEqual({
      baseline: ['e2e/audit-workflow.spec.ts', '--list'],
      ai: ['e2e/ai-review-workflow.spec.ts', '--list'],
    });
  });
});
