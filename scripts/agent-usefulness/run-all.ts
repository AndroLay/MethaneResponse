import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVIDENCE_DIRECTORY, PROTOCOL_ID } from './protocol';
import { assertRunnerConfigMatchesFrozen, parseRunnerConfig } from './runner-config';

const evidenceDirectory = EVIDENCE_DIRECTORY;
const dryRunDirectory = join(evidenceDirectory, 'runs', 'dry-run');
const continuationMigrationPath = join(evidenceDirectory, 'runs', 'runtime', 'continuation-migration.json');
const finalArtifacts = ['results.json', 'verification.json', 'findings.md', 'checksums.sha256'];

export function planLabExecution(options: { protocolFrozen: boolean; resultsExist: boolean; dryRunRecordCount: number; expectedDryRunRecords?: number }) {
  const expected = options.expectedDryRunRecords ?? 4;
  if (options.resultsExist) throw new Error('refusing to overwrite finalized evidence');
  if (options.dryRunRecordCount > expected) throw new Error('unexpected dry-run record count');
  if (options.dryRunRecordCount > 0 && options.dryRunRecordCount < expected) throw new Error('partial dry-run evidence requires a new revision');
  return { prepare: !options.protocolFrozen, dryRun: options.dryRunRecordCount === 0 };
}

function runStage(label: string, args: string[], env: NodeJS.ProcessEnv) {
  process.stdout.write(`\n[agent-lab] ${label}\n`);
  const result = Bun.spawnSync(args, { cwd: process.cwd(), env, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' });
  return result.exitCode ?? 1;
}

function dryRunRecordCount() {
  if (!existsSync(dryRunDirectory)) return 0;
  return readdirSync(dryRunDirectory).filter(name => name.endsWith('.json') && !name.endsWith('-plan-replay.json')).length;
}

function finalizedArtifactsExist() {
  return finalArtifacts.some(name => existsSync(join(evidenceDirectory, name)));
}

function verifyFrozenPacket(config: ReturnType<typeof parseRunnerConfig>) {
  const protocolPath = join(evidenceDirectory, 'protocol-frozen.json');
  const manifestPath = join(evidenceDirectory, 'source-manifest.json');
  if (!existsSync(protocolPath) || !existsSync(manifestPath)) throw new Error('frozen protocol packet is incomplete; preserve it and create a new revision');
  const protocol = JSON.parse(readFileSync(protocolPath, 'utf8')) as Record<string, unknown>;
  if (protocol.protocolId !== PROTOCOL_ID) throw new Error(`frozen protocol ID does not match ${PROTOCOL_ID}`);
  assertRunnerConfigMatchesFrozen(config, protocol.modelConfig);
}

async function main() {
  const config = parseRunnerConfig(process.env);
  const protocolExists = existsSync(join(evidenceDirectory, 'protocol-frozen.json'));
  const directoryEntries = existsSync(evidenceDirectory) ? readdirSync(evidenceDirectory) : [];
  if (!protocolExists && directoryEntries.length) throw new Error(`evidence directory is incomplete; refusing to overwrite ${evidenceDirectory}`);

  const plan = planLabExecution({
    protocolFrozen: protocolExists,
    resultsExist: finalizedArtifactsExist(),
    dryRunRecordCount: dryRunRecordCount(),
  });
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (!env.TMPDIR && existsSync('/dev/shm')) env.TMPDIR = '/dev/shm';
  if (!env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && existsSync('/usr/bin/chromium')) env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = '/usr/bin/chromium';

  if (plan.prepare) {
    const code = runStage('freeze r11 model, limits, inherited packets and source hashes', ['bun', '--no-env-file', 'scripts/agent-usefulness/prepare.ts'], env);
    if (code !== 0) throw new Error(`agent-lab preparation failed with exit ${code}`);
  }
  verifyFrozenPacket(config);

  const gates = runStage('run deterministic safety/reliability gates before provider calls', ['bun', '--no-env-file', 'run', 'agent-lab:gates'], env);
  if (gates !== 0) {
    runStage('finalize a report without starting model episodes', ['bun', '--no-env-file', 'run', 'agent-lab:finalize'], env);
    process.exitCode = 1;
    return;
  }

  if (plan.dryRun) {
    const dryRun = runStage('exercise four scripted Playwright instrumentation flows', ['bun', '--no-env-file', 'run', 'agent-lab:dry-run'], env);
    if (dryRun !== 0) {
      runStage('finalize a report without starting model episodes', ['bun', '--no-env-file', 'run', 'agent-lab:finalize'], env);
      process.exitCode = 1;
      return;
    }
  }

  const frozenProtocol = JSON.parse(readFileSync(join(evidenceDirectory, 'protocol-frozen.json'), 'utf8')) as { continuation?: { parentRevision?: string } };
  if (frozenProtocol.continuation?.parentRevision && !existsSync(continuationMigrationPath)) {
    const migration = runStage('verify r10 lineage, carry forward valid attempts and preserve cumulative usage', ['bun', '--no-env-file', 'scripts/agent-usefulness/migrate-continuation.ts'], env);
    if (migration !== 0) {
      process.stderr.write('[agent-lab] continuation migration failed before any new model episode started\n');
      process.exitCode = 1;
      return;
    }
  }

  const sealed = runStage('run/resume all scheduled sealed agent episodes serially', ['bun', '--no-env-file', 'run', 'agent-lab:sealed'], env);
  const finalized = runStage('score immutable attempts, verify hashes and write the report', ['bun', '--no-env-file', 'run', 'agent-lab:finalize'], env);
  if (sealed !== 0 || finalized !== 0) process.exitCode = 1;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown setup failure';
    process.stderr.write(`[agent-lab] stopped before provider execution: ${message}\n`);
    process.exitCode = 1;
  }
}
