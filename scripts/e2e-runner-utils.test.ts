import { describe, expect, test } from 'bun:test';
import { buildE2ERunnerEnvironment, routeE2EArguments } from './e2e-runner-utils';

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
