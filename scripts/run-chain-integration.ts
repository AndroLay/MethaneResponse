import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';
const env = buildE2ERunnerEnvironment(process.env, chooseE2ETemporaryRoot(process.env));
if (process.argv[2] === '--evidence' && process.argv[3]) env.METHANE_CHAIN_EVIDENCE_PATH = process.argv[3];
const result = spawnSync(process.execPath, ['--no-env-file', 'test', 'scripts/chain-integration.test.ts'], { env, stdio: 'inherit' });
if (result.error) process.stderr.write('Could not start isolated local chain checks.\n');
process.exit(result.status ?? 1);
