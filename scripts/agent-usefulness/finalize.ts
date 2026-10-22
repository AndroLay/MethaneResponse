/**
 * Finalize the frozen practical-usefulness lab.
 *
 * Reads only frozen inputs and sealed run records. A missing sealed run stays
 * NOT_RUN: this script never fabricates an agent episode, a score or a metric.
 * It also verifies frozen hashes and runs the twelve deterministic gates.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  aggregate, scoreEpisode,
  validateSealedRun, type EpisodeScore, type GoldSet, type RunRecord,
} from './scorer';
import { CONDITION, EVIDENCE_DIRECTORY, PROTOCOL_ID } from './protocol';
import { runGates } from './gates';

const NOT_RUN_CAUSE = 'No sealed attempt record exists for this scheduled episode; it was not executed.';
const CONTINUATION_PATH = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'continuation-migration.json');

type FrozenEpisode = {
  episodeId: string; pairId: string; personaId: string; taskId: 'T1' | 'T2' | 'T3';
  condition: 'C0_MANUAL_PACKET' | 'C1_APPLICATION_BROWSER';
};

function sha256(bytes: Uint8Array | string) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function writeExclusive(path: string, value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  await writeFile(path, text, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
}

async function listFiles(directory: string): Promise<string[]> {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else files.push(path);
  }
  return files.sort();
}

function notRunRecord(episode: FrozenEpisode, notes: string): RunRecord {
  return {
    schemaVersion: 1,
    episodeId: episode.episodeId,
    pairId: episode.pairId,
    personaId: episode.personaId,
    taskId: episode.taskId,
    condition: episode.condition,
    runner: { kind: 'none', model: null, provider: null, seed: null, browser: null, startedAt: null, endedAt: null },
    status: 'NOT_RUN',
    assistance: 'unknown',
    output: null,
    timing: { wallClockSeconds: null, modelCalls: 0, inputTokens: null, outputTokens: null, costUsd: null, retries: 0, hints: 0, failures: [] },
    artifactPaths: [],
    notes,
  };
}

async function main() {
  const protocolPath = join(EVIDENCE_DIRECTORY, 'protocol-frozen.json');
  const manifestPath = join(EVIDENCE_DIRECTORY, 'source-manifest.json');
  for (const path of [protocolPath, manifestPath]) {
    if (!existsSync(path)) throw new Error(`Missing frozen input ${path}. Run prepare.ts first.`);
  }
  const protocolBytes = await readFile(protocolPath);
  const protocol = await readJson<{
    status: string; frozenAt: string; modelConfig: { provider: string; model: string; seed: string | null; reasoningEffort?: string | null; billingMode?: 'api' | 'chatgpt-plan' | null; codexCliVersion?: string | null }; design: { episodes: FrozenEpisode[] };
    scenarios: Record<string, { packet: string; gold: string; packetSha256: string; goldSha256: string }>;
    continuation?: {
      parentRevision?: string; parentProtocolId?: string; parentProtocolFrozenSha256?: string;
      parentSourceManifestSha256?: string; parentUsageLedgerSha256?: string;
      parentUsage?: { totalTokens: number; costUsd: number; providerCalls: number };
    };
  }>(protocolPath);
  const manifest = await readJson<{
    runtimeFiles: Record<string, string>;
    versions: Record<string, string>;
    hashes: { protocolFrozenSha256?: string; taskParitySha256?: string };
  }>(manifestPath);

  const episodes = protocol.design.episodes;
  if (episodes.length !== 48) throw new Error(`Frozen design must contain 48 episodes, found ${episodes.length}.`);

  // 1. Frozen artifact integrity.
  const scenarioChecks: { path: string; expected: string; actual: string; match: boolean }[] = [];
  for (const scenario of Object.values(protocol.scenarios)) {
    for (const [path, expected] of [[scenario.packet, scenario.packetSha256], [scenario.gold, scenario.goldSha256]] as const) {
      const full = join(EVIDENCE_DIRECTORY, path);
      const actual = sha256(await readFile(full));
      scenarioChecks.push({ path, expected, actual, match: actual === expected });
    }
  }
  const runtimeChecks = Object.entries(manifest.runtimeFiles).map(([path, expected]) => {
    if (!existsSync(path)) return { path, expected, actual: null, match: false, reason: 'missing' };
    return { path, expected, actual: sha256(readFileSync(path)), match: true, reason: null };
  }).map(check => ({ ...check, match: check.match && check.actual === check.expected }));
  const parityPath = join(EVIDENCE_DIRECTORY, 'task-parity.json');
  const frozenMetadataChecks = [
    {
      path: relative(EVIDENCE_DIRECTORY, protocolPath),
      expected: manifest.hashes.protocolFrozenSha256 || null,
      actual: sha256(protocolBytes),
      match: Boolean(manifest.hashes.protocolFrozenSha256) && sha256(protocolBytes) === manifest.hashes.protocolFrozenSha256,
    },
    {
      path: relative(EVIDENCE_DIRECTORY, parityPath),
      expected: manifest.hashes.taskParitySha256 || null,
      actual: existsSync(parityPath) ? sha256(readFileSync(parityPath)) : null,
      match: Boolean(manifest.hashes.taskParitySha256) && existsSync(parityPath) && sha256(readFileSync(parityPath)) === manifest.hashes.taskParitySha256,
    },
  ];
  const frozenInputIntegrityOk = scenarioChecks.every(check => check.match)
    && runtimeChecks.every(check => check.match)
    && frozenMetadataChecks.every(check => check.match);

  // 2. Sealed runs. Nothing is invented for a missing episode.
  const sealedDirectory = join(EVIDENCE_DIRECTORY, 'runs', 'sealed');
  const sealedFiles = (await listFiles(sealedDirectory)).filter(path => path.endsWith('.json'));
  const sealedByEpisode = new Map<string, RunRecord>();
  const scheduledIds = new Set(episodes.map(episode => episode.episodeId));
  const invalidSealed: { path: string; error: string }[] = [];
  const scheduledEpisodes = new Map(episodes.map(episode => [episode.episodeId, episode]));
  for (const path of sealedFiles) {
    try {
      const run = await readJson<RunRecord>(path);
      if (!run.episodeId) throw new Error('episodeId is missing');
      const scheduled = scheduledEpisodes.get(run.episodeId);
      if (!scheduledIds.has(run.episodeId) || !scheduled) throw new Error(`episodeId ${run.episodeId} is not in the frozen schedule`);
      if (run.status === 'NOT_RUN') throw new Error('NOT_RUN records are not sealed attempts; leave the episode without a file');
      if (sealedByEpisode.has(run.episodeId)) throw new Error(`duplicate sealed record for ${run.episodeId}`);
      const errors = validateSealedRun(run, scheduled, protocol.modelConfig);
      if (errors.length) throw new Error(errors.join('; '));
      sealedByEpisode.set(run.episodeId, run);
    } catch (error) {
      invalidSealed.push({ path, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const startedDirectory = join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'started');
  const startedFiles = (await listFiles(startedDirectory)).filter(path => path.endsWith('.json'));
  const interruptedUnsealed: { path: string; episodeId: string | null; error: string | null }[] = [];
  const staleStartedMarkers: string[] = [];
  for (const path of startedFiles) {
    try {
      const marker = await readJson<{ episodeId?: string }>(path);
      if (marker.episodeId && sealedByEpisode.has(marker.episodeId)) staleStartedMarkers.push(relative(EVIDENCE_DIRECTORY, path));
      else interruptedUnsealed.push({ path: relative(EVIDENCE_DIRECTORY, path), episodeId: marker.episodeId || null, error: null });
    } catch (error) {
      interruptedUnsealed.push({ path: relative(EVIDENCE_DIRECTORY, path), episodeId: null, error: error instanceof Error ? error.message : String(error) });
    }
  }

  let continuationIntegrity: {
    applicable: boolean; ok: boolean; parentProtocolId?: string; inheritedAttempts?: number;
    excludedCapStoppedAttempt?: string | null; parentUsageTokens?: number; cumulativeUsageTokens?: number; errors: string[];
  } = { applicable: Boolean(protocol.continuation), ok: !protocol.continuation, errors: [] };
  let continuationSummary: Record<string, unknown> | null = null;
  if (protocol.continuation) {
    try {
      const migration = await readJson<{
        protocolId: string;
        parent: { protocolId: string; protocolFrozenSha256: string; sourceManifestSha256: string; usageLedgerSha256: string };
        inheritedAttempts: Array<{ episodeId: string; status: string; sha256: string }>;
        excludedCapStoppedAttempt: { episodeId: string; inputTokens: number; outputTokens: number; modelCalls: number; failures: string[] };
        parentUsageCarriedForward: { totalTokens: number; costUsd: number; providerCalls: number };
        episodeAccounting: { inheritedValidAttempts: number; excludedAndReplayedAttempts: number; parentEpisodesNotRun: number; childEpisodesToExecute: number };
      }>(CONTINUATION_PATH);
      const ledger = await readJson<{
        protocolId: string; runnerConfigSha256: string;
        budget: { totalTokens: number; costUsd: number; providerCalls: number };
      }>(join(EVIDENCE_DIRECTORY, 'runs', 'runtime', 'usage-ledger.json'));
      const errors: string[] = [];
      if (migration.protocolId !== PROTOCOL_ID || migration.parent.protocolId !== protocol.continuation.parentProtocolId
          || migration.parent.protocolFrozenSha256 !== protocol.continuation.parentProtocolFrozenSha256
          || migration.parent.sourceManifestSha256 !== protocol.continuation.parentSourceManifestSha256
          || migration.parent.usageLedgerSha256 !== protocol.continuation.parentUsageLedgerSha256) {
        errors.push('continuation parent identity or hashes do not match the frozen protocol');
      }
      if (migration.inheritedAttempts.length !== 36 || migration.episodeAccounting.inheritedValidAttempts !== 36
          || migration.episodeAccounting.excludedAndReplayedAttempts !== 1 || migration.episodeAccounting.parentEpisodesNotRun !== 11
          || migration.episodeAccounting.childEpisodesToExecute !== 12) errors.push('continuation episode accounting does not match the r10 stop point');
      if (JSON.stringify(migration.parentUsageCarriedForward) !== JSON.stringify(protocol.continuation.parentUsage)) {
        errors.push('parent usage was changed after the continuation protocol freeze');
      }

      for (const attempt of migration.inheritedAttempts) {
        if (!scheduledIds.has(attempt.episodeId)) {
          errors.push(`inherited episode is outside the frozen schedule: ${attempt.episodeId}`);
          continue;
        }
        const run = sealedByEpisode.get(attempt.episodeId);
        const runPath = join(sealedDirectory, `${attempt.episodeId}.json`);
        if (!run || run.status !== attempt.status || !existsSync(runPath) || sha256(readFileSync(runPath)) !== attempt.sha256) {
          errors.push(`inherited immutable attempt hash does not match: ${attempt.episodeId}`);
        }
      }
      if (!scheduledIds.has(migration.excludedCapStoppedAttempt.episodeId)
          || !sealedByEpisode.has(migration.excludedCapStoppedAttempt.episodeId)) errors.push('the r10 cap-stopped episode was not replayed in r11');
      if (!migration.excludedCapStoppedAttempt.failures.includes('lab_token_cap')) errors.push('excluded parent attempt was not stopped by the token cap');
      if (ledger.protocolId !== PROTOCOL_ID || ledger.runnerConfigSha256 !== sha256(JSON.stringify(protocol.modelConfig))) {
        errors.push('cumulative usage ledger identity does not match r11');
      }

      const recordTokens = [...sealedByEpisode.values()].reduce((sum, run) => sum + (run.timing.inputTokens ?? 0) + (run.timing.outputTokens ?? 0), 0);
      const recordCalls = [...sealedByEpisode.values()].reduce((sum, run) => sum + run.timing.modelCalls, 0);
      const expectedTokens = recordTokens + migration.excludedCapStoppedAttempt.inputTokens + migration.excludedCapStoppedAttempt.outputTokens;
      const expectedCalls = recordCalls + migration.excludedCapStoppedAttempt.modelCalls;
      if (ledger.budget.totalTokens !== expectedTokens || ledger.budget.providerCalls !== expectedCalls) {
        errors.push('cumulative usage does not reconcile with inherited, replayed and excluded attempts');
      }

      continuationIntegrity = {
        applicable: true, ok: errors.length === 0, parentProtocolId: migration.parent.protocolId,
        inheritedAttempts: migration.inheritedAttempts.length,
        excludedCapStoppedAttempt: migration.excludedCapStoppedAttempt.episodeId,
        parentUsageTokens: migration.parentUsageCarriedForward.totalTokens,
        cumulativeUsageTokens: ledger.budget.totalTokens,
        errors,
      };
      continuationSummary = {
        parentProtocolId: migration.parent.protocolId,
        inheritedValidAttempts: migration.inheritedAttempts.length,
        excludedCapStoppedAttemptReplayed: migration.excludedCapStoppedAttempt.episodeId,
        parentUsageCarriedForward: migration.parentUsageCarriedForward,
        cumulativeUsage: ledger.budget,
        integrityOk: continuationIntegrity.ok,
      };
    } catch (error) {
      continuationIntegrity = { applicable: true, ok: false, errors: [error instanceof Error ? error.message : String(error)] };
    }
  }
  const integrityOk = frozenInputIntegrityOk && continuationIntegrity.ok;

  const gold: GoldSet = {
    T1: await readJson(join(EVIDENCE_DIRECTORY, 'scenarios/gold/T1-plan-gold.json')),
    T2: await readJson(join(EVIDENCE_DIRECTORY, 'scenarios/gold/T2-investigate-request-gold.json')),
    T3: await readJson(join(EVIDENCE_DIRECTORY, 'scenarios/gold/T3-review-revisit-verify-gold.json')),
  };
  const scores: EpisodeScore[] = episodes.map(episode =>
    scoreEpisode(episode, sealedByEpisode.get(episode.episodeId) ?? notRunRecord(episode, NOT_RUN_CAUSE), gold));
  const results = aggregate(scores, episodes);

  // 3. Dry-run instrumentation is reported separately and never scored.
  const dryRunFiles = (await listFiles(join(EVIDENCE_DIRECTORY, 'runs', 'dry-run'))).filter(path => path.endsWith('.json') && !path.endsWith('-plan-replay.json'));
  const dryRun: { episodeId: string; personaId: string; condition: string; runKind: string; aiAgentExecuted: boolean; humanParticipant: boolean; scored: boolean; observations: unknown; path: string }[] = [];
  for (const path of dryRunFiles) {
    const record = await readJson<{ episodeId: string; personaId: string; condition: string; runKind: string; aiAgentExecuted: boolean; humanParticipant: boolean; scored: boolean; observations: unknown }>(path);
    dryRun.push({ episodeId: record.episodeId, personaId: record.personaId, condition: record.condition, runKind: record.runKind, aiAgentExecuted: record.aiAgentExecuted, humanParticipant: record.humanParticipant, scored: record.scored, observations: record.observations, path: relative(EVIDENCE_DIRECTORY, path) });
  }
  const expectedDryRunIds = ['P1', 'P8'].flatMap(personaId => [CONDITION.C0, CONDITION.C1].map(condition => `${personaId}-T1-${condition}`));
  const observedDryRunIds = dryRun.map(record => record.episodeId);
  const dryRunCounts = new Map<string, number>();
  for (const episodeId of observedDryRunIds) dryRunCounts.set(episodeId, (dryRunCounts.get(episodeId) || 0) + 1);
  const dryRunValidation = {
    expected: expectedDryRunIds.length,
    recorded: dryRun.length,
    missing: expectedDryRunIds.filter(episodeId => !dryRunCounts.has(episodeId)),
    duplicates: [...dryRunCounts].filter(([, count]) => count > 1).map(([episodeId]) => episodeId),
    unexpected: observedDryRunIds.filter(episodeId => !expectedDryRunIds.includes(episodeId)),
    invalid: dryRun.filter(record => record.runKind !== 'dry_run_scripted_instrumentation' || record.aiAgentExecuted !== false || record.humanParticipant !== false || record.scored !== false).map(record => record.episodeId),
    passed: false,
  };
  dryRunValidation.passed = dryRunValidation.recorded === dryRunValidation.expected
    && dryRunValidation.missing.length === 0 && dryRunValidation.duplicates.length === 0
    && dryRunValidation.unexpected.length === 0 && dryRunValidation.invalid.length === 0;

  // 4. Gates.
  const gates = await runGates();
  const gatesPassed = gates.filter(gate => gate.passed).length;

  const sealedCount = sealedByEpisode.size;
  const status = invalidSealed.length ? 'BLOCKED_INVALID_SEALED_RUNS'
    : interruptedUnsealed.length ? 'BLOCKED_INTERRUPTED_ATTEMPTS'
      : sealedCount === 0 ? 'FROZEN_NOT_RUN' : sealedCount < episodes.length ? 'PARTIALLY_RUN' : 'SEALED_RUNS_COMPLETE';

  const resultsDocument = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    generatedAt: new Date().toISOString(),
    status,
    scorerVersion: results.scorerVersion,
    sealed: { records: sealedCount, invalid: invalidSealed, expected: episodes.length, interruptedUnsealed, staleStartedMarkers, notRunCause: NOT_RUN_CAUSE },
    ...(continuationSummary ? { continuation: continuationSummary } : {}),
    aggregate: results,
    scores,
    gates: { passed: gatesPassed, failed: gates.length - gatesPassed, results: gates },
    dryRun: { ...dryRunValidation, excludedFromMetrics: true, note: 'Scripted instrumentation only; not an AI agent episode and never a persona result.', records: dryRun },
    claimBoundaries: [
      'No agent-usefulness metric is reported while sealed episodes are NOT_RUN.',
      'Gates prove deterministic rule behavior in this repository, not field effectiveness.',
      'The dry-run proves the planner flow and packet are usable; it does not measure persona performance.',
    ],
  };
  await writeExclusive(join(EVIDENCE_DIRECTORY, 'results.json'), resultsDocument);

  const verificationDocument = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    checkedAt: new Date().toISOString(),
    protocolFrozenSha256: sha256(protocolBytes),
    frozenAt: protocol.frozenAt,
    integrity: {
      ok: integrityOk,
      scenarios: scenarioChecks,
      frozenMetadata: frozenMetadataChecks,
      runtimeFiles: runtimeChecks,
      ...(protocol.continuation ? { continuation: continuationIntegrity } : {}),
    },
    sealedRuns: { files: sealedFiles.length, accepted: sealedCount, invalid: invalidSealed, interruptedUnsealed, staleStartedMarkers },
    gates: { passed: gatesPassed, failed: gates.length - gatesPassed, results: gates },
    dryRun: dryRunValidation,
    status,
    passed: integrityOk && gates.length === 12 && gates.every(gate => gate.passed) && invalidSealed.length === 0 && interruptedUnsealed.length === 0 && dryRunValidation.passed,
    note: 'Runtime file hashes cover the harness at freeze time. Any later edit is reported as a mismatch rather than silently ignored.',
  };
  await writeExclusive(join(EVIDENCE_DIRECTORY, 'verification.json'), verificationDocument);

  const gateRows = gates.map(gate => `| ${gate.id} | ${gate.title} | ${gate.passed ? 'PASS' : 'FAIL'} | ${gate.limitation.replace(/\|/g, '\\|')} |`).join('\n');
  const coverageFinding = results.notRun === 0
    ? `All ${episodes.length} scheduled episodes have sealed attempts.`
    : `**${results.notRun} of ${episodes.length} scheduled episodes remain NOT_RUN.** Cause: ${NOT_RUN_CAUSE}`;
  const metricFinding = results.scored === 0
    ? 'No episode metric is available; NOT_RUN episodes are excluded from metric denominators.'
    : `Scores cover ${results.scored}/${episodes.length} attempted episodes; NOT_RUN episodes are excluded from metric denominators.`;
  const compositeFinding = results.practicalUsefulnessIndex === null
    ? 'No composite index is reported because the required complete run or frozen efficiency normalization is unavailable.'
    : `Frozen practical-usefulness index: ${results.practicalUsefulnessIndex}.`;
  const findings = `# Findings — agent practical-usefulness lab

Protocol: \`${PROTOCOL_ID}\`
Status: **${status}**
Generated: ${resultsDocument.generatedAt}

## What was executed

- Frozen protocol, scenarios, gold sets, task parity and source manifest were generated by \`scripts/agent-usefulness/prepare.ts\`.
- Twelve deterministic gates were run against production rules and generated artifacts: **${gatesPassed} passed, ${gates.length - gatesPassed} failed**.
- Dry-run instrumentation recorded ${dryRun.length}/${expectedDryRunIds.length} scheduled scripted records. Validation ${dryRunValidation.passed ? 'passed' : 'failed'}; missing IDs: ${dryRunValidation.missing.join(', ') || 'none'}. Every accepted record carries \`aiAgentExecuted: false\`, \`humanParticipant: false\` and \`scored: false\`.
- ${sealedCount} of ${episodes.length} scheduled episodes have sealed agent attempts; ${invalidSealed.length} sealed records were rejected.
- ${interruptedUnsealed.length} started episodes remain without sealed records; ${staleStartedMarkers.length} markers already have a sealed record and can be cleaned on resume.
- ${metricFinding} ${compositeFinding}

## What was not executed

- ${coverageFinding}
- No human participant or independent expert validation was conducted. The task agents are role simulations from one frozen model configuration.

${continuationSummary ? `## Continuation accounting

- r10 supplied ${continuationIntegrity.inheritedAttempts} validated completed/abstained attempts, copied byte-for-byte.
- The r10 cap-stopped episode \`${continuationIntegrity.excludedCapStoppedAttempt}\` was excluded from scoring and replayed in r11.
- The prior ${continuationIntegrity.parentUsageTokens} aggregate tokens remain in the cumulative ledger; r11 records ${continuationIntegrity.cumulativeUsageTokens} cumulative tokens.
- Parent lineage and inherited record hashes: ${continuationIntegrity.ok ? 'verified' : 'FAILED'}.
` : ''}

## Gates

| Gate | Behavior checked | Result | Limitation |
| --- | --- | --- | --- |
${gateRows}

## Negative findings and limits

- The dry-run is scripted Playwright instrumentation, not an agent and not a person. It shows the planner screen and the frozen packet are usable; it says nothing about usefulness, comprehension, speed or accuracy of any persona.
- T1 gold is a replay pin of the repository's own planner implementation, not an externally validated allocation. It can detect drift; it cannot prove the policy is normatively correct.
- T2 gold is an author-frozen rule check over the pinned MARS metadata. It is not an independent expert judgment.
- T3 gold uses a DEMO decision fixture. Its digest proves integrity and chronology inside the fixture, not physical truth or reviewer identity.
- Gates G01-G06 exercise production evidence rules. G07-G08 use DEMO fixtures. G09 checks route authorization and input rejection, not reviewer identity proof or durable storage. G10-G12 scan generated artifacts only; they do not review screenshots or future UI copy.
- No T2 or T3 browser flow was exercised in the dry-run. Those screens remain unverified by this packet.
- Secrets are never included in the packet. Screenshots and traces would need visual review before publication.

## Claim boundaries

- This is a synthetic task simulation. It is not a human pilot, expert validation, user-satisfaction study and not an independent scientific gold set.
- Source feedback alone never proves repaired equipment or reduced emissions.
- Missing later plume observations do not establish zero methane.
- Contract receipts and digests prove integrity and version chronology, not physical outcomes.
`;
  await writeExclusive(join(EVIDENCE_DIRECTORY, 'findings.md'), findings);

  // 5. Checksums over every artifact except the checksum file itself.
  const artifactFiles = (await listFiles(EVIDENCE_DIRECTORY)).filter(path => !path.endsWith(`${sep}checksums.sha256`));
  const lines: string[] = [];
  for (const path of artifactFiles) {
    lines.push(`${sha256(await readFile(path))}  ${relative(EVIDENCE_DIRECTORY, path).split(sep).join('/')}`);
  }
  await writeExclusive(join(EVIDENCE_DIRECTORY, 'checksums.sha256'), lines.join('\n') + '\n');

  process.stdout.write(JSON.stringify({
    status, episodes: episodes.length, sealedRecords: sealedCount, invalidSealed: invalidSealed.length,
    scored: results.scored, notRun: results.notRun, gates: { passed: gatesPassed, failed: gates.length - gatesPassed },
    dryRunRecords: dryRun.length, dryRunValid: dryRunValidation.passed, integrityOk, practicalUsefulnessIndex: results.practicalUsefulnessIndex,
    artifacts: artifactFiles.map(path => relative(EVIDENCE_DIRECTORY, path)),
  }, null, 2) + '\n');
  if (!integrityOk || gates.length !== 12 || gates.some(gate => !gate.passed) || invalidSealed.length > 0 || !dryRunValidation.passed) process.exitCode = 1;
}

if (import.meta.main) await main();
