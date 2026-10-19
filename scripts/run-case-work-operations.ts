import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';

// Loopback API fixtures must not inherit proxy settings, production secrets or .env.
const environment = buildE2ERunnerEnvironment(process.env, chooseE2ETemporaryRoot(process.env));
const result = spawnSync(process.execPath, ['--no-env-file', 'test', 'scripts/case-work-operations.test.ts', 'scripts/case-work-runtime.test.ts'], { env: environment, stdio: 'inherit' });
if (result.error) process.stderr.write('Could not start isolated casework operation checks.\n');
process.exit(result.status ?? 1);
