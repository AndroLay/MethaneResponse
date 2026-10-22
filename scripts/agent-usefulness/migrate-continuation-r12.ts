/**
 * Resume the immutable r11 partial packet as r12.
 * All 43 validated r11 attempts are copied byte-for-byte; only the five
 * interrupted/not-started episodes are eligible for execution in r12.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { EVIDENCE_DIRECTORY, PROTOCOL_ID, type Episode } from './protocol-r12';
import { normalizeProtocolId } from './continuation';
import { validateSealedRun, type RunRecord } from './scorer';

const PARENT_DIRECTORY = 'docs/evidence/agent-practical-usefulness-2026-10-21-r11';
const MIGRATION_PATH = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'continuation-migration.json');
const EXPECTED_INTERRUPTED_ID = 'P8-T1-C1_APPLICATION_BROWSER';

type FrozenProtocol = {
  protocolId: string;
  modelConfig: Record<string, unknown>;
  design: { episodes: Episode[]; pairs: unknown[] };
  scenarios: Record<string, { packet: string; gold: string; packetSha256: string; goldSha256: string }>;
  continuation?: {
    parentRevision?: string; parentProtocolId?: string; parentProtocolFrozenSha256?: string;
    parentSourceManifestSha256?: string; parentUsageLedgerSha256?: string;
    parentUsage?: { totalTokens: number; costUsd: number; providerCalls: number };
  };
};

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const readJson = async <T>(path: string) => JSON.parse(await readFile(path, 'utf8')) as T;
const hashFile = async (path: string) => sha256(await readFile(path));

async function verifyChecksums(directory: string) {
  const lines = (await readFile(join(directory, 'checksums.sha256'), 'utf8')).trimEnd().split('\n');
  if (!lines.length || lines.some(line => !/^[a-f0-9]{64}  [^\0]+$/.test(line))) throw new Error('r11 checksum manifest is malformed');
  for (const line of lines) {
    const expected = line.slice(0, 64);
    const relative = line.slice(66);
    if (relative.startsWith('/') || relative.split('/').includes('..')) throw new Error('r11 checksum path escapes its evidence directory');
    if (await hashFile(join(directory, relative)) !== expected) throw new Error(`r11 checksum mismatch: ${relative}`);
  }
}

async function verifyScenarioParity(parent: FrozenProtocol, child: FrozenProtocol) {
  const parity: Record<string, unknown> = {};
  for (const taskId of ['T1', 'T2', 'T3']) {
    const oldScenario = parent.scenarios[taskId];
    const newScenario = child.scenarios[taskId];
    if (!oldScenario || !newScenario) throw new Error(`missing frozen ${taskId} scenario`);
    const oldPacket = await readJson<Record<string, unknown>>(join(PARENT_DIRECTORY, oldScenario.packet));
    const newPacket = await readJson<Record<string, unknown>>(join(EVIDENCE_DIRECTORY, newScenario.packet));
    const oldGold = await readJson<Record<string, unknown>>(join(PARENT_DIRECTORY, oldScenario.gold));
    const newGold = await readJson<Record<string, unknown>>(join(EVIDENCE_DIRECTORY, newScenario.gold));
    if (JSON.stringify(normalizeProtocolId(newPacket, parent.protocolId)) !== JSON.stringify(oldPacket)
        || JSON.stringify(normalizeProtocolId(newGold, parent.protocolId)) !== JSON.stringify(oldGold)) {
      throw new Error(`${taskId} packet or gold changed beyond protocolId`);
    }
    if (await hashFile(join(PARENT_DIRECTORY, oldScenario.packet)) !== oldScenario.packetSha256
        || await hashFile(join(PARENT_DIRECTORY, oldScenario.gold)) !== oldScenario.goldSha256
        || await hashFile(join(EVIDENCE_DIRECTORY, newScenario.packet)) !== newScenario.packetSha256
        || await hashFile(join(EVIDENCE_DIRECTORY, newScenario.gold)) !== newScenario.goldSha256) {
      throw new Error(`${taskId} packet/gold hash mismatch`);
    }
    parity[taskId] = { parentPacketSha256: oldScenario.packetSha256, childPacketSha256: newScenario.packetSha256,
      parentGoldSha256: oldScenario.goldSha256, childGoldSha256: newScenario.goldSha256 };
  }
  return parity;
}

async function main() {
  if (existsSync(MIGRATION_PATH)) throw new Error('r12 continuation migration already exists; refusing to alter lineage');
  const parentBytes = await readFile(join(PARENT_DIRECTORY, 'protocol-frozen.json'));
  const parentProtocol = JSON.parse(parentBytes.toString('utf8')) as FrozenProtocol;
  const childProtocol = await readJson<FrozenProtocol>(join(EVIDENCE_DIRECTORY, 'protocol-frozen.json'));
  const parentFrozenHash = sha256(parentBytes);
  const parentManifest = await readJson<{ hashes?: { protocolFrozenSha256?: string } }>(join(PARENT_DIRECTORY, 'source-manifest.json'));
  const parentResults = await readJson<{
    protocolId?: string; status?: string; sealed?: { records?: number; invalid?: unknown[]; interruptedUnsealed?: Array<{ episodeId?: string }> };
    aggregate?: { notRun?: number }; continuation?: { integrityOk?: boolean; cumulativeUsage?: { totalTokens?: number; providerCalls?: number; costUsd?: number } };
  }>(join(PARENT_DIRECTORY, 'results.json'));
  const parentVerification = await readJson<{
    protocolId?: string; status?: string; passed?: boolean; integrity?: { ok?: boolean };
    gates?: { passed?: number; failed?: number }; dryRun?: { passed?: boolean };
  }>(join(PARENT_DIRECTORY, 'verification.json'));
  const parentUsage = await readJson<{
    schemaVersion: number; protocolId: string; runnerConfigSha256: string;
    budget: { totalTokens: number; costUsd: number; providerCalls: number };
  }>(join(PARENT_DIRECTORY, 'runs/runtime/usage-ledger.json'));
  const parentSourceManifestSha256 = await hashFile(join(PARENT_DIRECTORY, 'source-manifest.json'));
  const parentUsageLedgerSha256 = await hashFile(join(PARENT_DIRECTORY, 'runs/runtime/usage-ledger.json'));
  if (parentProtocol.protocolId !== 'agent-practical-usefulness-2026-10-21-r11'
      || childProtocol.protocolId !== PROTOCOL_ID || childProtocol.continuation?.parentRevision !== 'r11'
      || childProtocol.continuation.parentProtocolId !== parentProtocol.protocolId
      || childProtocol.continuation.parentProtocolFrozenSha256 !== parentFrozenHash
      || childProtocol.continuation.parentSourceManifestSha256 !== parentSourceManifestSha256
      || childProtocol.continuation.parentUsageLedgerSha256 !== parentUsageLedgerSha256
      || parentManifest.hashes?.protocolFrozenSha256 !== parentFrozenHash
      || parentResults.protocolId !== parentProtocol.protocolId || parentResults.status !== 'BLOCKED_INTERRUPTED_ATTEMPTS'
      || parentResults.sealed?.records !== 43 || (parentResults.sealed.invalid?.length ?? 0) !== 0
      || parentResults.aggregate?.notRun !== 5 || parentResults.continuation?.integrityOk !== true
      || parentVerification.protocolId !== parentProtocol.protocolId
      || parentVerification.status !== 'BLOCKED_INTERRUPTED_ATTEMPTS' || parentVerification.passed !== false
      || parentVerification.integrity?.ok !== true || parentVerification.gates?.passed !== 12
      || parentVerification.gates.failed !== 0 || parentVerification.dryRun?.passed !== true) {
    throw new Error('r11 parent identity, integrity, gate, or episode counts do not match the verified partial report');
  }
  const interrupted = parentResults.sealed?.interruptedUnsealed ?? [];
  if (interrupted.length !== 1 || interrupted[0]?.episodeId !== EXPECTED_INTERRUPTED_ID) throw new Error('r11 interrupted episode differs from the frozen resume plan');
  if (JSON.stringify(parentProtocol.design.episodes) !== JSON.stringify(childProtocol.design.episodes)
      || JSON.stringify(parentProtocol.design.pairs) !== JSON.stringify(childProtocol.design.pairs)) throw new Error('r11 and r12 schedules differ');
  if (JSON.stringify(parentProtocol.modelConfig) !== JSON.stringify(childProtocol.modelConfig)
      || parentProtocol.modelConfig.tokenCap !== 100_000_000) throw new Error('r12 must preserve the r11 model and cumulative token cap');
  if (parentUsage.schemaVersion !== 1 || parentUsage.protocolId !== parentProtocol.protocolId
      || parentUsage.runnerConfigSha256 !== sha256(JSON.stringify(parentProtocol.modelConfig))
      || parentUsage.budget.totalTokens !== parentResults.continuation?.cumulativeUsage?.totalTokens
      || parentUsage.budget.providerCalls !== parentResults.continuation?.cumulativeUsage?.providerCalls) throw new Error('r11 cumulative usage ledger does not match its verified report');
  await verifyChecksums(PARENT_DIRECTORY);
  const packetParity = await verifyScenarioParity(parentProtocol, childProtocol);

  const parentSealed = join(PARENT_DIRECTORY, 'runs/sealed');
  const childSealed = join(EVIDENCE_DIRECTORY, 'runs/sealed');
  const childStarted = join(EVIDENCE_DIRECTORY, 'runs/runtime/started');
  const parentNames = (await readdir(parentSealed)).filter(name => name.endsWith('.json')).sort();
  if (parentNames.length !== 43) throw new Error(`r11 has ${parentNames.length} sealed records; expected 43`);
  const episodes = new Map(parentProtocol.design.episodes.map(episode => [episode.episodeId, episode]));
  const inherited: Array<{ episodeId: string; status: string; sha256: string; inputTokens: number | null; outputTokens: number | null; modelCalls: number }> = [];
  const bytesByName = new Map<string, Buffer>();
  for (const name of parentNames) {
    const bytes = await readFile(join(parentSealed, name));
    const run = JSON.parse(bytes.toString('utf8')) as RunRecord;
    const episode = episodes.get(run.episodeId);
    if (!episode || name !== `${run.episodeId}.json`) throw new Error(`unexpected r11 sealed record: ${name}`);
    const errors = validateSealedRun(run, episode, parentProtocol.modelConfig as never);
    if (errors.length) throw new Error(`invalid r11 run ${run.episodeId}: ${errors.join('; ')}`);
    if (run.status !== 'completed' && run.status !== 'abstained') throw new Error(`unsupported r11 status for ${run.episodeId}: ${run.status}`);
    inherited.push({ episodeId: run.episodeId, status: run.status, sha256: sha256(bytes), inputTokens: run.timing.inputTokens,
      outputTokens: run.timing.outputTokens, modelCalls: run.timing.modelCalls });
    bytesByName.set(name, bytes);
  }
  const inheritedIds = new Set(inherited.map(row => row.episodeId));
  const missingIds = childProtocol.design.episodes.map(episode => episode.episodeId).filter(id => !inheritedIds.has(id)).sort();
  if (missingIds.length !== 5 || !missingIds.includes(EXPECTED_INTERRUPTED_ID)) throw new Error('r12 must execute exactly the five missing r11 episodes');
  const startedBeforeMigration = existsSync(childStarted) ? (await readdir(childStarted)).filter(name => name.endsWith('.json')) : [];
  if (startedBeforeMigration.length) throw new Error('r12 has started markers before migration');
  for (const name of await readdir(childSealed)) if (name.endsWith('.json')) throw new Error(`r12 already contains a sealed run: ${name}`);

  for (const record of inherited) {
    const bytes = bytesByName.get(`${record.episodeId}.json`)!;
    await writeFile(join(childSealed, `${record.episodeId}.json`), bytes, { flag: 'wx', mode: 0o644 });
  }
  const childLedgerPath = join(EVIDENCE_DIRECTORY, 'runs/runtime/usage-ledger.json');
  await mkdir(join(EVIDENCE_DIRECTORY, 'runs/runtime'), { recursive: true });
  const childLedger = { schemaVersion: 1, protocolId: childProtocol.protocolId,
    runnerConfigSha256: sha256(JSON.stringify(childProtocol.modelConfig)), budget: { ...parentUsage.budget }, updatedAt: new Date().toISOString() };
  await writeFile(childLedgerPath, JSON.stringify(childLedger, null, 2) + '\n', { flag: 'wx', mode: 0o600 });

  const manifest = {
    schemaVersion: 1, protocolId: childProtocol.protocolId, migratedAt: new Date().toISOString(),
    parent: { protocolId: parentProtocol.protocolId, protocolFrozenSha256: parentFrozenHash,
      sourceManifestSha256: parentSourceManifestSha256, resultsSha256: await hashFile(join(PARENT_DIRECTORY, 'results.json')),
      verificationSha256: await hashFile(join(PARENT_DIRECTORY, 'verification.json')), usageLedgerSha256: parentUsageLedgerSha256, checksumsVerified: true },
    packetParity, inheritedAttempts: inherited, interruptedParentAttempts: interrupted, parentUsageCarriedForward: parentUsage.budget,
    episodeAccounting: { parentSealedAttempts: 43, inheritedValidAttempts: 43, excludedAndReplayedAttempts: 0,
      parentEpisodesNotRun: 5, parentInterruptedAttempts: 1, childEpisodesToExecute: 5, missingEpisodeIds: missingIds },
    modelChange: 'none; provider, model, reasoning effort, billing mode and cumulative token cap match r11',
  };
  await writeFile(MIGRATION_PATH, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o644 });
  process.stdout.write(JSON.stringify({ protocolId: PROTOCOL_ID, parentProtocolId: parentProtocol.protocolId,
    inheritedAttempts: inherited.length, episodesToExecute: missingIds.length, cumulativeTokensBeforeContinuation: parentUsage.budget.totalTokens,
    cumulativeProviderCallsBeforeContinuation: parentUsage.budget.providerCalls }) + '\n');
}

if (import.meta.main) {
  try { await main(); }
  catch (error) {
    process.stderr.write(`[agent-lab] r12 continuation migration stopped: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
