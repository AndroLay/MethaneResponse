import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot, routeE2EArguments } from './e2e-runner-utils';

const aiArguments = routeE2EArguments(process.argv.slice(2)).ai;
if (!aiArguments) {
  process.stderr.write('Select e2e/ai-review-workflow.spec.ts when invoking the AI-only workflow.\n');
  process.exit(2);
}

const temporaryRoot = chooseE2ETemporaryRoot(process.env);
const environment = {
  ...buildE2ERunnerEnvironment(process.env, temporaryRoot),
  METHANE_E2E_AI_MOCK: '1',
  METHANE_E2E_AI_ACCESS_TOKEN: randomBytes(32).toString('base64url'),
  METHANE_E2E_REVIEWER_SECRET: randomBytes(32).toString('base64url'),
};
const result = spawnSync('bun', ['--no-env-file', 'run', 'playwright', 'test', ...aiArguments], {
  stdio: 'inherit',
  env: environment,
});

if (result.error) {
  process.stderr.write('Could not launch the isolated AI browser workflow.\n');
  process.exit(1);
}

process.exit(result.status ?? 1);
