import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONDITION, EVIDENCE_DIRECTORY, PERSONAS, PROTOCOL_ID, TASK_FAMILIES, buildDesign, buildRunnerPrompt, type Episode } from '../../scripts/agent-usefulness/protocol';
import { runTaskAgent, type AgentAttempt, type UsageBudget } from '../../scripts/agent-usefulness/agent-loop';
import { runCodexTaskAgent } from '../../scripts/agent-usefulness/codex-cli-runner';
import { createBrowserTaskTools } from '../../scripts/agent-usefulness/browser-tools';
import { createManualPacketTool } from '../../scripts/agent-usefulness/manual-packet';
import { buildTaskAssignment, providerSafePacket } from '../../scripts/agent-usefulness/runner-context';
import { assertRunnerConfigMatchesFrozen, parseRunnerConfig } from '../../scripts/agent-usefulness/runner-config';
import { openUsageLedger } from '../../scripts/agent-usefulness/budget-ledger';
import type { RunRecord } from '../../scripts/agent-usefulness/scorer';

type Packet = Record<string, unknown>;

const evidenceDirectory = EVIDENCE_DIRECTORY;
const protocolPath = join(evidenceDirectory, 'protocol-frozen.json');
if (!existsSync(protocolPath)) throw new Error(`Freeze the agent lab first with agent-lab:prepare; missing ${protocolPath}`);
const frozen = JSON.parse(readFileSync(protocolPath, 'utf8')) as Record<string, any>;
if (frozen.protocolId !== PROTOCOL_ID || frozen.design?.episodes?.length !== 48) throw new Error('Frozen protocol does not match this 48-episode runner.');
const runtimeConfig = parseRunnerConfig(process.env);
assertRunnerConfigMatchesFrozen(runtimeConfig, frozen.modelConfig);
const design = buildDesign();
const packets = Object.fromEntries(TASK_FAMILIES.map(task => {
  const path = join(evidenceDirectory, 'scenarios', task.id === 'T1' ? 'T1-plan-packet.json' : task.id === 'T2' ? 'T2-investigate-request-packet.json' : 'T3-review-revisit-verify-packet.json');
  return [task.id, JSON.parse(readFileSync(path, 'utf8')) as Packet];
})) as Record<'T1' | 'T2' | 'T3', Packet>;

const sealedDirectory = join(evidenceDirectory, 'runs', 'sealed');
const startedDirectory = join(evidenceDirectory, 'runs', 'runtime', 'started');
const usageLedgerPath = join(evidenceDirectory, 'runs', 'runtime', 'usage-ledger.json');
const safeJson = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

class StopAfterLedgerError extends Error {}
class StopAfterCodexStartupError extends Error {}

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

function scrubString(value: string) {
  let result = value;
  if (runtimeConfig.apiKey) result = result.replaceAll(runtimeConfig.apiKey, '[REDACTED]');
  result = result.replace(/(?:Bearer\s+[A-Za-z0-9._~+/=-]{24,}|mrv1\.[A-Za-z0-9._~+/=-]{20,}|\b(?:sk|pk)-[A-Za-z0-9_-]{20,})/g, '[REDACTED]');
  return result;
}

function scrubOutput(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map(scrubOutput);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrubOutput(child)]));
  return value;
}

function buildEpisodePrompt(episode: Episode, packet: Packet) {
  const persona = PERSONAS.find(item => item.id === episode.personaId)!;
  const task = TASK_FAMILIES.find(item => item.id === episode.taskId)!;
  const assignment = buildTaskAssignment(episode.taskId, packet);
  const details = episode.condition === CONDITION.C0
    ? episode.taskId === 'T1'
      ? `Manual-packet assignment (not an answer): ${JSON.stringify(assignment)}\nThe 4,218-row candidate table is available through read_manual_packet. Read bounded weighted-ranking pages and find the named source rows. Apply the written country quota yourself; the tool does not select a plan.`
      : `Frozen manual packet (gold data is not included): ${JSON.stringify(providerSafePacket(packet))}`
    : `Application-browser assignment (not an answer): ${JSON.stringify(assignment)}\nUse the local MethaneResponse UI through the Playwright tools to inspect evidence and complete the task. Do not use developer files or the gold set.`;
  return `${buildRunnerPrompt(persona, task, episode)}\n\nRequired output fields: ${JSON.stringify(task.requiredOutputFields)}\n\n${details}`;
}

function initialPath(episode: Episode, packet: Packet) {
  if (episode.taskId === 'T1') {
    const task = packet.task as Record<string, unknown>;
    return `/dashboard/cases?sourceId=${encodeURIComponent(String(task.sourceAId || 'BHR_S_003'))}`;
  }
  if (episode.taskId === 'T2') {
    const claim = packet.claim as Record<string, unknown>;
    return `/dashboard/audit?sourceId=${encodeURIComponent(String(claim.sourceId || 'KAZ_S_159'))}`;
  }
  return '/dashboard/reports';
}

function timingEmpty(failures: string[] = []): RunRecord['timing'] {
  return { wallClockSeconds: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: runtimeConfig.billingMode === 'chatgpt-plan' ? null : 0, retries: 0, hints: 0, failures };
}

function recordFor(episode: Episode, attempt: AgentAttempt, startedAt: string, browser: string | null, sourcePacketSha256: string): RunRecord & { execution: Record<string, unknown> } {
  return {
    schemaVersion: 1,
    episodeId: episode.episodeId,
    pairId: episode.pairId,
    personaId: episode.personaId,
    taskId: episode.taskId,
    condition: episode.condition,
    runner: {
      kind: 'agent', model: runtimeConfig.model, provider: runtimeConfig.provider, seed: runtimeConfig.seed,
      browser, startedAt, endedAt: new Date().toISOString(),
      reasoningEffort: runtimeConfig.reasoningEffort,
      billingMode: runtimeConfig.billingMode,
      codexCliVersion: runtimeConfig.codexCliVersion,
    },
    status: attempt.status,
    assistance: attempt.assistance,
    output: scrubOutput(attempt.output) as Record<string, unknown> | null,
    timing: attempt.timing,
    artifactPaths: [],
    ...(attempt.note ? { notes: scrubString(attempt.note) } : {}),
    execution: {
      schemaVersion: 1,
      sourcePacketSha256,
      steps: attempt.steps,
      toolNames: attempt.toolNames.map(scrubString),
      providerUsageEstimate: attempt.providerUsageEstimate,
      ...(attempt.execution ? scrubOutput(attempt.execution) as Record<string, unknown> : {}),
    },
  };
}

async function writeRun(path: string, value: unknown) {
  await writeFile(path, safeJson(value), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

async function interruptedAttemptRecord(episode: Episode, markerPath: string, packetHash: string) {
  const marker = JSON.parse(await readFile(markerPath, 'utf8')) as { startedAt?: string };
  const startedAt = typeof marker.startedAt === 'string' ? marker.startedAt : new Date().toISOString();
  const end = new Date().toISOString();
  const record: RunRecord & { execution: Record<string, unknown> } = {
    schemaVersion: 1, episodeId: episode.episodeId, pairId: episode.pairId, personaId: episode.personaId,
    taskId: episode.taskId, condition: episode.condition,
    runner: { kind: 'agent', model: runtimeConfig.model, provider: runtimeConfig.provider, seed: runtimeConfig.seed, browser: episode.condition === CONDITION.C1 ? 'Chromium (attempt interrupted)' : null, startedAt, endedAt: end,
      reasoningEffort: runtimeConfig.reasoningEffort, billingMode: runtimeConfig.billingMode, codexCliVersion: runtimeConfig.codexCliVersion },
    status: 'failed', assistance: 'unknown', output: null,
    timing: { ...timingEmpty(['interrupted_attempt_not_retried']), wallClockSeconds: Math.max(0, Math.round((Date.parse(end) - Date.parse(startedAt)) / 100) / 10) },
    artifactPaths: [],
    notes: 'An earlier process started this episode and ended before sealing its record. This episode was marked failed and was not rerun.',
    execution: { schemaVersion: 1, sourcePacketSha256: packetHash, steps: 0, toolNames: [], providerUsageEstimate: true },
  };
  return record;
}

async function runEpisode(episode: Episode, page?: Page) {
  test.setTimeout((episode.timeLimitSeconds + 120) * 1000);
  const recordPath = join(sealedDirectory, `${episode.episodeId}.json`);
  const markerPath = join(startedDirectory, `${episode.episodeId}.json`);
  if (await exists(recordPath)) {
    if (await exists(markerPath)) {
      const sealed = JSON.parse(await readFile(recordPath, 'utf8')) as RunRecord;
      const marker = JSON.parse(await readFile(markerPath, 'utf8')) as { protocolId?: string; episodeId?: string; provider?: string; model?: string; seed?: string | null; reasoningEffort?: string | null; billingMode?: string; codexCliVersion?: string | null };
      const matches = marker.protocolId === PROTOCOL_ID && marker.episodeId === episode.episodeId
        && marker.provider === runtimeConfig.provider && marker.model === runtimeConfig.model && marker.seed === runtimeConfig.seed
        && marker.reasoningEffort === runtimeConfig.reasoningEffort && marker.billingMode === runtimeConfig.billingMode
        && marker.codexCliVersion === runtimeConfig.codexCliVersion
        && sealed.episodeId === episode.episodeId && sealed.runner?.provider === runtimeConfig.provider
        && sealed.runner?.model === runtimeConfig.model && sealed.runner?.seed === runtimeConfig.seed
        && sealed.runner?.reasoningEffort === runtimeConfig.reasoningEffort && sealed.runner?.billingMode === runtimeConfig.billingMode
        && sealed.runner?.codexCliVersion === runtimeConfig.codexCliVersion;
      if (!matches) throw new Error(`sealed record and started marker do not match the frozen episode: ${episode.episodeId}`);
      await unlink(markerPath);
    }
    test.skip(true, 'sealed record already exists; episodes are never rerun');
  }
  const packet = packets[episode.taskId] as Packet;
  const packetPath = join(evidenceDirectory, 'scenarios', episode.taskId === 'T1' ? 'T1-plan-packet.json' : episode.taskId === 'T2' ? 'T2-investigate-request-packet.json' : 'T3-review-revisit-verify-packet.json');
  const packetHash = sha256(await readFile(packetPath, 'utf8'));
  const ledger = await openUsageLedger(usageLedgerPath, PROTOCOL_ID, runtimeConfig);

  if (await exists(markerPath)) {
    const interrupted = await interruptedAttemptRecord(episode, markerPath, packetHash);
    await writeRun(recordPath, interrupted);
    await unlink(markerPath);
    return;
  }

  const startedAt = new Date().toISOString();
  await mkdir(startedDirectory, { recursive: true });
  await writeRun(markerPath, { protocolId: PROTOCOL_ID, episodeId: episode.episodeId, provider: runtimeConfig.provider, model: runtimeConfig.model, seed: runtimeConfig.seed,
    reasoningEffort: runtimeConfig.reasoningEffort, billingMode: runtimeConfig.billingMode, codexCliVersion: runtimeConfig.codexCliVersion, startedAt });
  let browserVersion: string | null = null;
  let pageErrorCount = 0;
  try {
    const taskTools = [];
    if (runtimeConfig.executor === 'openai-api' && episode.condition === CONDITION.C0 && episode.taskId === 'T1') taskTools.push(createManualPacketTool(packet));
    if (runtimeConfig.executor === 'openai-api' && episode.condition === CONDITION.C1) {
      if (!page) throw new Error('browser fixture unavailable');
      const configuredOrigin = process.env.AGENT_LAB_APP_ORIGIN;
      if (!configuredOrigin) throw new Error('local application origin is not configured');
      const baseUrl = new URL(configuredOrigin).origin;
      await page.route('**/*', route => new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort());
      page.on('pageerror', () => { pageErrorCount += 1; });
      await page.goto(initialPath(episode, packet), { waitUntil: 'domcontentloaded' });
      const version = page.context().browser()?.version();
      browserVersion = version ? `Chromium ${version}` : 'Chromium';
      taskTools.push(...createBrowserTaskTools(page, baseUrl, packet));
    }

    const prompt = buildEpisodePrompt(episode, packet);
    const attempt = runtimeConfig.executor === 'codex-cli'
      ? await runCodexTaskAgent({
        config: runtimeConfig,
        prompt,
        context: {
          episode, packet,
          appOrigin: episode.condition === CONDITION.C1 ? process.env.AGENT_LAB_APP_ORIGIN || null : null,
          initialPath: episode.condition === CONDITION.C1 ? initialPath(episode, packet) : null,
        },
        stepLimit: episode.stepLimit,
        timeLimitSeconds: episode.timeLimitSeconds,
        budget: ledger.budget,
        onBudgetChange: () => ledger.persist(),
      })
      : await runTaskAgent({
        config: runtimeConfig,
        prompt,
        taskTools,
        stepLimit: episode.stepLimit,
        timeLimitSeconds: episode.timeLimitSeconds,
        budget: ledger.budget,
        onBudgetChange: () => ledger.persist(),
      });
    const attemptBrowser = typeof attempt.execution?.browser === 'string' ? attempt.execution.browser : browserVersion;
    const record = recordFor(episode, attempt, startedAt, attemptBrowser, packetHash);
    record.execution.pageErrorCount = attempt.execution?.pageErrorCount ?? pageErrorCount;
    await writeRun(recordPath, record);
    await unlink(markerPath);
    if (runtimeConfig.executor === 'codex-cli' && attempt.status === 'failed'
      && ((attempt.timing.modelCalls === 0 && (attempt.timing.failures.includes('codex_process_start_failed') || attempt.timing.failures.includes('codex_usage_unavailable')))
        || attempt.toolNames.length === 0)) {
      throw new StopAfterCodexStartupError('Codex did not complete a usable MCP task turn; stopping before consuming further episode slots.');
    }
    if (runtimeConfig.executor === 'codex-cli' && attempt.timing.failures.includes('lab_token_cap')) {
      throw new StopAfterCodexStartupError('The lab token cap was reached; stopping before starting another Codex episode.');
    }
    if (attempt.timing.failures.includes('usage_ledger_write_failed')) throw new StopAfterLedgerError('usage ledger could not be persisted; stopping to protect the run budget');
  } catch (error) {
    if (error instanceof StopAfterLedgerError || error instanceof StopAfterCodexStartupError) throw error;
    const end = new Date().toISOString();
    const failed = recordFor(episode, {
      status: 'failed', assistance: 'unknown', output: null, note: 'Episode setup or evidence write failed; no automatic retry was performed.', steps: 0, toolNames: [],
      providerUsageEstimate: false,
      timing: { ...timingEmpty(['episode_runtime_or_storage_error']), wallClockSeconds: Math.max(0, Math.round((Date.parse(end) - Date.parse(startedAt)) / 100) / 10) },
    }, startedAt, browserVersion, packetHash);
    failed.execution.pageErrorCount = pageErrorCount;
    if (!await exists(recordPath)) await writeRun(recordPath, failed);
    await unlink(markerPath).catch(() => {});
  }
}

for (const episode of design.episodes) {
  const title = `Sealed AI agent ${episode.episodeId}`;
  if (episode.condition === CONDITION.C1 && runtimeConfig.executor === 'openai-api') {
    test(title, async ({ page }) => runEpisode(episode, page));
  } else {
    test(title, async () => runEpisode(episode));
  }
}
