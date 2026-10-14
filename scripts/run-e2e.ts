import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot, routeE2EArguments } from './e2e-runner-utils';

function runPlaywright(arguments_: string[], environment: Record<string, string>): number {
  const result = spawnSync('bun', ['--no-env-file', 'run', 'playwright', 'test', ...arguments_], {
    stdio: 'inherit',
    env: environment,
  });

  if (result.error) {
    process.stderr.write('Could not launch the isolated browser workflow.\n');
    return 1;
  }
  return result.status ?? 1;
}

const argsByPhase = routeE2EArguments(process.argv.slice(2));
const temporaryRoot = chooseE2ETemporaryRoot(process.env);
const baselineEnvironment = buildE2ERunnerEnvironment(process.env, temporaryRoot);
const regressionTests = spawnSync('bun', ['--no-env-file', 'test', 'scripts/e2e-runner-utils.test.ts'], {
  stdio: 'inherit',
  env: baselineEnvironment,
});

if (regressionTests.error) {
  process.stderr.write('Could not launch the E2E runner regression tests.\n');
  process.exit(1);
}
if (regressionTests.status !== 0) process.exit(regressionTests.status ?? 1);

if (argsByPhase.baseline) {
  const status = runPlaywright(argsByPhase.baseline, baselineEnvironment);
  if (status !== 0) process.exit(status);
}

if (argsByPhase.ai) {
  const aiEnvironment = {
    ...baselineEnvironment,
    METHANE_E2E_AI_MOCK: '1',
    METHANE_E2E_AI_ACCESS_TOKEN: randomBytes(32).toString('base64url'),
    METHANE_E2E_REVIEWER_SECRET: randomBytes(32).toString('base64url'),
  };
  process.exit(runPlaywright(argsByPhase.ai, aiEnvironment));
}
