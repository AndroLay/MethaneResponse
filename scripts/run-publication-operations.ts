import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';

const env = buildE2ERunnerEnvironment(process.env, chooseE2ETemporaryRoot(process.env));
const result = spawnSync(process.execPath, ['--no-env-file', 'test', 'scripts/publication-runtime.test.ts'], { env, stdio: 'inherit' });
if (result.error) process.stderr.write('Could not start isolated publication operation checks.\n');
process.exit(result.status ?? 1);
