import { spawnSync } from 'node:child_process';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './e2e-runner-utils';

// Never forward an operator's provider, signer, state or .env into role fixtures.
const env = buildE2ERunnerEnvironment(process.env, chooseE2ETemporaryRoot(process.env));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--evidence' || !args[1])) {
  process.stderr.write('Usage: run-integration-roles.ts [--evidence NEW_PATH]\n');
  process.exit(2);
}
if (args[1]) env.METHANE_ROLE_EVIDENCE_PATH = args[1];
const result = spawnSync(process.execPath, ['--no-env-file', 'test', 'scripts/integration-role-runtime.test.ts'], { env, stdio: 'inherit' });
if (result.error) process.stderr.write('Could not start isolated integration role checks.\n');
process.exit(result.status ?? 1);
