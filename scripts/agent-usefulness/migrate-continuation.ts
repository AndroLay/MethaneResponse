/**
 * Carry only validated r10 attempts into the resource-only r11 continuation.
 * Parent records are copied byte-for-byte; the cap-stopped attempt is excluded
 * from scoring, but its consumed tokens remain in the cumulative usage ledger.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EVIDENCE_DIRECTORY, PROTOCOL_ID, type Episode } from './protocol';
import { normalizeProtocolId, summarizeContinuationAttempts } from './continuation';
import { validateSealedRun, type RunRecord } from './scorer';

const PARENT_DIRECTORY = 'docs/evidence/agent-practical-usefulness-2026-10-21-r10';
const CAP_STOPPED_EPISODE_ID = 'P7-T1-C1_APPLICATION_BROWSER';
const MIGRATION_PATH = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'continuation-migration.json');

type FrozenProtocol = {
  protocolId: string;
  frozenAt: string;
  modelConfig: Record<string, unknown>;
  design: { episodes: Episode[]; pairs: unknown[] };
  scenarios: Record<string, { packet: string; gold: string; packetSha256: string; goldSha256: string }>;
  continuation?: {
    parentRevision?: string;
    parentProtocolId?: string;
    parentProtocolFrozenSha256?: string;
    parentSourceManifestSha256?: string;
    parentUsageLedgerSha256?: string;
  };
};

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex');
}

async function json<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function hashFile(path: string) {
  return sha256(await readFile(path));
}

async function verifyChecksums(directory: string) {
  const lines = (await readFile(join(directory, 'checksums.sha256'), 'utf8')).trimEnd().split('\n');
  if (!lines.length || lines.some(line => !/^[a-f0-9]{64}  [^\0]+$/.test(line))) throw new Error('r10 checksum manifest is malformed');
  for (const line of lines) {
    const expected = line.slice(0, 64);
    const path = line.slice(66);
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('r10 checksum path escapes its evidence directory');
    if (await hashFile(join(directory, path)) !== expected) throw new Error(`r10 checksum mismatch: ${path}`);
  }
}

async function verifyScenarioParity(parent: FrozenProtocol, child: FrozenProtocol) {
  const parity: Record<string, { parentPacketSha256: string; childPacketSha256: string; parentGoldSha256: string; childGoldSha256: string }> = {};
  for (const taskId of ['T1', 'T2', 'T3']) {
    const parentScenario = parent.scenarios[taskId];
    const childScenario = child.scenarios[taskId];
    if (!parentScenario || !childScenario) throw new Error(`missing frozen ${taskId} input in a continuation revision`);
    const parentPacket = await json<Record<string, unknown>>(join(PARENT_DIRECTORY, parentScenario.packet));
    const childPacket = await json<Record<string, unknown>>(join(EVIDENCE_DIRECTORY, childScenario.packet));
    const parentGold = await json<Record<string, unknown>>(join(PARENT_DIRECTORY, parentScenario.gold));
    const childGold = await json<Record<string, unknown>>(join(EVIDENCE_DIRECTORY, childScenario.gold));
    if (parentPacket.protocolId !== parent.protocolId || childPacket.protocolId !== child.protocolId
        || parentGold.protocolId && parentGold.protocolId !== parent.protocolId
        || childGold.protocolId && childGold.protocolId !== child.protocolId
        || JSON.stringify(normalizeProtocolId(childPacket, parent.protocolId)) !== JSON.stringify(parentPacket)
        || JSON.stringify(normalizeProtocolId(childGold, parent.protocolId)) !== JSON.stringify(parentGold)) {
      throw new Error(`${taskId} task data or gold changed beyond the protocol revision ID`);
    }
    if (await hashFile(join(PARENT_DIRECTORY, parentScenario.packet)) !== parentScenario.packetSha256
        || await hashFile(join(PARENT_DIRECTORY, parentScenario.gold)) !== parentScenario.goldSha256
        || await hashFile(join(EVIDENCE_DIRECTORY, childScenario.packet)) !== childScenario.packetSha256
        || await hashFile(join(EVIDENCE_DIRECTORY, childScenario.gold)) !== childScenario.goldSha256) {
      throw new Error(`${taskId} frozen packet/gold hash does not match its protocol`);
    }
    parity[taskId] = {
      parentPacketSha256: parentScenario.packetSha256,
      childPacketSha256: childScenario.packetSha256,
      parentGoldSha256: parentScenario.goldSha256,
      childGoldSha256: childScenario.goldSha256,
    };
  }
  return parity;
}

async function main() {
  if (existsSync(MIGRATION_PATH)) throw new Error('continuation migration already exists; refusing to alter lineage');
  const parentProtocolPath = join(PARENT_DIRECTORY, 'protocol-frozen.json');
  const parentProtocolBytes = await readFile(parentProtocolPath);
  const parentProtocol = JSON.parse(parentProtocolBytes.toString('utf8')) as FrozenProtocol;
  const childProtocol = await json<FrozenProtocol>(join(EVIDENCE_DIRECTORY, 'protocol-frozen.json'));
  const parentManifest = await json<{ hashes?: { protocolFrozenSha256?: string } }>(join(PARENT_DIRECTORY, 'source-manifest.json'));
  const parentResults = await json<{ protocolId?: string; status?: string; sealed?: { records?: number; invalid?: unknown[] } }>(join(PARENT_DIRECTORY, 'results.json'));
  const parentVerification = await json<{ protocolId?: string; passed?: boolean; integrity?: { ok?: boolean }; gates?: { passed?: number; failed?: number } }>(join(PARENT_DIRECTORY, 'verification.json'));
  const parentUsage = await json<{ schemaVersion: number; protocolId: string; runnerConfigSha256: string; budget: { totalTokens: number; costUsd: number; providerCalls: number } }>(join(PARENT_DIRECTORY, 'runs', 'runtime', 'usage-ledger.json'));
  const parentProtocolSha256 = sha256(parentProtocolBytes);
  if (childProtocol.protocolId !== PROTOCOL_ID || childProtocol.continuation?.parentRevision !== 'r10'
      || childProtocol.continuation.parentProtocolId !== parentProtocol.protocolId
      || childProtocol.continuation.parentProtocolFrozenSha256 !== parentProtocolSha256
      || childProtocol.continuation.parentSourceManifestSha256 !== await hashFile(join(PARENT_DIRECTORY, 'source-manifest.json'))
      || childProtocol.continuation.parentUsageLedgerSha256 !== await hashFile(join(PARENT_DIRECTORY, 'runs', 'runtime', 'usage-ledger.json'))) {
    throw new Error('r11 frozen continuation lineage does not match the r10 parent');
  }
  if (parentProtocol.protocolId !== 'agent-practical-usefulness-2026-10-21-r10'
      || parentManifest.hashes?.protocolFrozenSha256 !== parentProtocolSha256
      || parentResults.protocolId !== parentProtocol.protocolId || parentResults.status !== 'PARTIALLY_RUN'
      || parentResults.sealed?.records !== 37 || (parentResults.sealed.invalid?.length ?? 0) !== 0
      || parentVerification.protocolId !== parentProtocol.protocolId || parentVerification.passed !== true
      || parentVerification.integrity?.ok !== true || parentVerification.gates?.passed !== 12 || parentVerification.gates.failed !== 0) {
    throw new Error('r10 is not an intact, verified partial parent run');
  }
  await verifyChecksums(PARENT_DIRECTORY);
  if (JSON.stringify(parentProtocol.design.episodes) !== JSON.stringify(childProtocol.design.episodes)
      || JSON.stringify(parentProtocol.design.pairs) !== JSON.stringify(childProtocol.design.pairs)) throw new Error('r10 and r11 episode schedules differ');
  if (parentProtocol.modelConfig.tokenCap !== 50_000_000 || childProtocol.modelConfig.tokenCap !== 100_000_000) {
    throw new Error('continuation must change only the frozen whole-lab token cap from 50M to 100M');
  }
  const parentConfigComparable = { ...childProtocol.modelConfig, tokenCap: parentProtocol.modelConfig.tokenCap };
  if (JSON.stringify(parentConfigComparable) !== JSON.stringify(parentProtocol.modelConfig)) throw new Error('r11 changed the frozen model/provider configuration beyond the token cap');
  const packetParity = await verifyScenarioParity(parentProtocol, childProtocol);

  const parentSealedDirectory = join(PARENT_DIRECTORY, 'runs', 'sealed');
  const childSealedDirectory = join(EVIDENCE_DIRECTORY, 'runs', 'sealed');
  const childStartedDirectory = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'started');
  const parentRecordNames = (await readdir(parentSealedDirectory)).filter(name => name.endsWith('.json')).sort();
  if (parentRecordNames.length !== 37) throw new Error(`r10 has ${parentRecordNames.length} sealed files, expected 37`);
  const parentByEpisode = new Map(parentProtocol.design.episodes.map(episode => [episode.episodeId, episode]));
  const attempts: Array<RunRecord & { execution?: Record<string, unknown> }> = [];
  const bytesByEpisode = new Map<string, Buffer>();
  for (const name of parentRecordNames) {
    const bytes = await readFile(join(parentSealedDirectory, name));
    const run = JSON.parse(bytes.toString('utf8')) as RunRecord & { execution?: Record<string, unknown> };
    const episode = parentByEpisode.get(run.episodeId);
    if (!episode || name !== `${run.episodeId}.json`) throw new Error(`unexpected r10 sealed filename or episode: ${name}`);
    const errors = validateSealedRun(run, episode, parentProtocol.modelConfig as never);
    if (errors.length) throw new Error(`invalid r10 attempt ${run.episodeId}: ${errors.join('; ')}`);
    if (run.execution?.sourcePacketSha256 !== parentProtocol.scenarios[run.taskId]?.packetSha256) throw new Error(`r10 attempt has a different task packet hash: ${run.episodeId}`);
    attempts.push(run);
    bytesByEpisode.set(run.episodeId, bytes);
  }

  const summary = summarizeContinuationAttempts(attempts);
  if (summary.reusable.length !== 36 || summary.capStopped.length !== 1
      || summary.capStopped[0].episodeId !== CAP_STOPPED_EPISODE_ID) throw new Error('r10 attempt split differs from the frozen continuation plan');
  const capFailure = summary.capStopped[0];
  const parentBudget = parentUsage.budget;
  if (parentUsage.schemaVersion !== 1 || parentUsage.protocolId !== parentProtocol.protocolId
      || summary.usage.totalTokens !== parentBudget.totalTokens || summary.usage.providerCalls !== parentBudget.providerCalls
      || parentBudget.totalTokens !== 50_989_768 || parentBudget.providerCalls !== 37) {
    throw new Error('r10 usage ledger does not reconcile to its immutable episode records');
  }

  const childStarted = existsSync(childStartedDirectory)
    ? (await readdir(childStartedDirectory)).filter(name => name.endsWith('.json')) : [];
  if (childStarted.length) throw new Error('r11 already has a started episode; migration must run before model execution');
  const inheritedRecords = summary.reusable.map(run => {
    const bytes = bytesByEpisode.get(run.episodeId)!;
    return {
      episodeId: run.episodeId,
      status: run.status,
      sha256: sha256(bytes),
      sourcePacketSha256: (run.execution as Record<string, unknown>).sourcePacketSha256,
      inputTokens: run.timing.inputTokens,
      outputTokens: run.timing.outputTokens,
      modelCalls: run.timing.modelCalls,
    };
  });
  const excludedAttempt = {
    episodeId: capFailure.episodeId,
    status: capFailure.status,
    sha256: sha256(bytesByEpisode.get(capFailure.episodeId)! ),
    inputTokens: capFailure.timing.inputTokens,
    outputTokens: capFailure.timing.outputTokens,
    modelCalls: capFailure.timing.modelCalls,
    failures: capFailure.timing.failures,
    disposition: 'Excluded from scoring and scheduled for a fresh r11 attempt; its usage remains in the cumulative token ledger.',
  };
  const inheritedIds = new Set(inheritedRecords.map(record => record.episodeId));
  const existingChildNames = (await readdir(childSealedDirectory)).filter(name => name.endsWith('.json'));
  for (const name of existingChildNames) {
    const id = name.slice(0, -5);
    if (!inheritedIds.has(id) || !bytesByEpisode.has(id)) throw new Error(`unexpected r11 sealed attempt exists before migration: ${name}`);
    if (!Buffer.from(await readFile(join(childSealedDirectory, name))).equals(bytesByEpisode.get(id)!)) throw new Error(`r11 inherited attempt would overwrite different evidence: ${name}`);
  }
  for (const record of summary.reusable) {
    const sourceBytes = bytesByEpisode.get(record.episodeId)!;
    const destination = join(childSealedDirectory, `${record.episodeId}.json`);
    if (!existsSync(destination)) await writeFile(destination, sourceBytes, { flag: 'wx', mode: 0o644 });
  }

  const childLedgerPath = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'usage-ledger.json');
  await mkdir(join(EVIDENCE_DIRECTORY, 'runs', 'runtime'), { recursive: true });
  const childRunnerConfigSha256 = sha256(JSON.stringify(childProtocol.modelConfig));
  const migratedLedger = {
    schemaVersion: 1,
    protocolId: childProtocol.protocolId,
    runnerConfigSha256: childRunnerConfigSha256,
    budget: { ...parentBudget },
    updatedAt: new Date().toISOString(),
  };
  if (existsSync(childLedgerPath)) {
    const current = await json<typeof migratedLedger>(childLedgerPath);
    if (current.protocolId !== childProtocol.protocolId || current.runnerConfigSha256 !== childRunnerConfigSha256) throw new Error('r11 usage ledger belongs to a different protocol/configuration');
    const currentBudget = current.budget;
    const alreadyMigrated = currentBudget.totalTokens === parentBudget.totalTokens
      && currentBudget.providerCalls === parentBudget.providerCalls && currentBudget.costUsd === parentBudget.costUsd;
    const pristine = currentBudget.totalTokens === 0 && currentBudget.providerCalls === 0 && currentBudget.costUsd === 0;
    if (!alreadyMigrated && !pristine) throw new Error('r11 usage ledger contains unexpected model usage before migration');
    if (pristine) await writeFile(childLedgerPath, JSON.stringify(migratedLedger, null, 2) + '\n', 'utf8');
  } else {
    await writeFile(childLedgerPath, JSON.stringify(migratedLedger, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }

  const manifest = {
    schemaVersion: 1,
    protocolId: childProtocol.protocolId,
    migratedAt: new Date().toISOString(),
    parent: {
      protocolId: parentProtocol.protocolId,
      protocolFrozenSha256: parentProtocolSha256,
      sourceManifestSha256: childProtocol.continuation.parentSourceManifestSha256,
      resultsSha256: await hashFile(join(PARENT_DIRECTORY, 'results.json')),
      verificationSha256: await hashFile(join(PARENT_DIRECTORY, 'verification.json')),
      usageLedgerSha256: childProtocol.continuation.parentUsageLedgerSha256,
      checksumsVerified: true,
    },
    packetParity,
    inheritedAttempts: inheritedRecords,
    excludedCapStoppedAttempt: excludedAttempt,
    parentUsageCarriedForward: parentBudget,
    episodeAccounting: {
      parentSealedAttempts: parentRecordNames.length,
      inheritedValidAttempts: inheritedRecords.length,
      excludedAndReplayedAttempts: 1,
      parentEpisodesNotRun: 11,
      childEpisodesToExecute: 12,
      note: 'The failed cap-stopped attempt consumed plan usage and remains in cumulative usage, but its output is excluded and its scheduled episode must be run once under the r11 cap.',
    },
    modelChange: { provider: 'unchanged', model: 'unchanged', reasoningEffort: 'unchanged', billingMode: 'unchanged', tokenCap: '50,000,000 to 100,000,000 cumulative tokens' },
  };
  await writeFile(MIGRATION_PATH, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o644 });

  process.stdout.write(JSON.stringify({
    protocolId: PROTOCOL_ID,
    inheritedAttempts: inheritedRecords.length,
    excludedCapStoppedAttempts: 1,
    episodesToExecute: 12,
    cumulativeTokensBeforeContinuation: parentBudget.totalTokens,
    cumulativeProviderCallsBeforeContinuation: parentBudget.providerCalls,
  }) + '\n');
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`[agent-lab] continuation migration stopped: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
