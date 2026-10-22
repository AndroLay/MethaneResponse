/**
 * Freeze the practical-usefulness lab before any runner sees a task.
 *
 * Run once per packet. Existing outputs are never overwritten.
 * No provider, network, browser, wallet or human participant is used here.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  CONDITION, CONDITIONS, EVIDENCE_DIRECTORY, PERSONAS, PROTOCOL_ID, PROTOCOL_VERSION, SAFETY_LIMITS, TASK_FAMILIES,
  buildDesign, buildRunnerPrompt,
} from './protocol-r12';
import { buildT1Scenario, buildT2Scenario, buildT3Scenario, sha256Hex } from './scenarios';
import { parseRunnerConfig, freezeRunnerConfig } from './runner-config';
import { buildTaskAssignment } from './runner-context';
import { normalizeProtocolId, rebindProtocolId } from './continuation';

const evidenceDirectory = EVIDENCE_DIRECTORY;
const scenariosDirectory = join(evidenceDirectory, 'scenarios');
const goldDirectory = join(scenariosDirectory, 'gold');

async function writeExclusive(path: string, value: unknown) {
  if (existsSync(path)) throw new Error(`Refusing to overwrite frozen evidence: ${path}`);
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  await writeFile(path, text, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  return sha256Hex(text);
}

function command(arguments_: string[]) {
  const result = Bun.spawnSync(arguments_, { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) throw new Error(`${arguments_.join(' ')} failed: ${result.stderr.toString()}`);
  return result.stdout.toString().trim();
}

async function hashFile(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function verifyParentChecksums(directory: string) {
  const checksumText = await readFile(join(directory, 'checksums.sha256'), 'utf8');
  const lines = checksumText.trimEnd().split('\n');
  if (!lines.length || lines.some(line => !/^[a-f0-9]{64}  [^\0]+$/.test(line))) throw new Error('parent checksum manifest is malformed');
  for (const line of lines) {
    const [expected, relativePath] = [line.slice(0, 64), line.slice(66)];
    if (relativePath.startsWith('/') || relativePath.split('/').includes('..')) throw new Error('parent checksum path escapes its evidence directory');
    const actual = await hashFile(join(directory, relativePath));
    if (actual !== expected) throw new Error(`parent evidence checksum mismatch: ${relativePath}`);
  }
}

async function verifyContinuationParent(revision: string, design: ReturnType<typeof buildDesign>) {
  if (revision !== 'r11') throw new Error('r12 is pinned to parent revision r11');
  const directory = 'docs/evidence/agent-practical-usefulness-2026-10-21-r11';
  const protocolBytes = await readFile(join(directory, 'protocol-frozen.json'));
  const protocol = JSON.parse(protocolBytes.toString('utf8')) as {
    protocolId: string;
    frozenAt: string;
    modelConfig: Record<string, unknown>;
    design: { pairs: unknown[]; episodes: unknown[] };
    scenarios: Record<string, { packet: string; gold: string; packetSha256: string; goldSha256: string }>;
  };
  const manifest = JSON.parse(await readFile(join(directory, 'source-manifest.json'), 'utf8')) as {
    hashes?: { protocolFrozenSha256?: string };
  };
  const verification = JSON.parse(await readFile(join(directory, 'verification.json'), 'utf8')) as {
    status?: string; passed?: boolean; integrity?: { ok?: boolean }; gates?: { passed?: number; failed?: number }; dryRun?: { passed?: boolean };
  };
  const results = JSON.parse(await readFile(join(directory, 'results.json'), 'utf8')) as {
    protocolId?: string; status?: string; sealed?: { records?: number; invalid?: unknown[]; interruptedUnsealed?: Array<{ episodeId?: string }> };
    continuation?: { integrityOk?: boolean };
  };
  const protocolFrozenSha256 = createHash('sha256').update(protocolBytes).digest('hex');
  if (protocol.protocolId !== 'agent-practical-usefulness-2026-10-21-r11'
      || results.protocolId !== protocol.protocolId
      || manifest.hashes?.protocolFrozenSha256 !== protocolFrozenSha256) throw new Error('r11 parent protocol identity or frozen hash is invalid');
  const interrupted = results.sealed?.interruptedUnsealed ?? [];
  if (verification.status !== 'BLOCKED_INTERRUPTED_ATTEMPTS' || verification.passed !== false || verification.integrity?.ok !== true
      || verification.gates?.passed !== 12 || verification.gates.failed !== 0
      || verification.dryRun?.passed !== true
      || results.status !== 'BLOCKED_INTERRUPTED_ATTEMPTS' || results.sealed?.records !== 43
      || (results.sealed.invalid?.length ?? 0) !== 0 || results.continuation?.integrityOk !== true
      || interrupted.length !== 1 || interrupted[0]?.episodeId !== 'P8-T1-C1_APPLICATION_BROWSER') {
    throw new Error('r11 parent is not an intact, hash-verified interrupted run suitable for continuation');
  }
  if (JSON.stringify(protocol.design.episodes) !== JSON.stringify(design.episodes)
      || JSON.stringify(protocol.design.pairs) !== JSON.stringify(design.pairs)) throw new Error('r11 and r12 episode schedules do not match');
  await verifyParentChecksums(directory);

  for (const scenario of Object.values(protocol.scenarios)) {
    for (const [path, expected] of [[scenario.packet, scenario.packetSha256], [scenario.gold, scenario.goldSha256]] as const) {
      if (await hashFile(join(directory, path)) !== expected) throw new Error(`r11 scenario/gold hash mismatch: ${path}`);
    }
  }
  return { directory, protocol, protocolFrozenSha256, sourceManifestSha256: await hashFile(join(directory, 'source-manifest.json')) };
}

async function inheritedArtifact(parent: Awaited<ReturnType<typeof verifyContinuationParent>>, relativePath: string, expectedSha256: string, requiredProtocolId: boolean) {
  const bytes = await readFile(join(parent.directory, relativePath));
  if (createHash('sha256').update(bytes).digest('hex') !== expectedSha256) throw new Error(`r11 source artifact hash mismatch: ${relativePath}`);
  const value = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
  const rebound = rebindProtocolId(value, parent.protocol.protocolId, PROTOCOL_ID, requiredProtocolId);
  if (JSON.stringify(normalizeProtocolId(rebound, parent.protocol.protocolId)) !== JSON.stringify(value)) {
    throw new Error(`r12 continuation changed non-protocol task data: ${relativePath}`);
  }
  return rebound;
}

async function main() {
  const frozenRunnerConfig = freezeRunnerConfig(parseRunnerConfig(process.env));
  const continuationRevision = process.env.AGENT_LAB_CONTINUE_FROM_REVISION?.trim() || null;
  if (continuationRevision && frozenRunnerConfig.tokenCap !== 100_000_000) throw new Error('r12 continuation requires the inherited 100-million-token cumulative cap');
  if (existsSync(evidenceDirectory)) {
    if ((await readdir(evidenceDirectory)).length) throw new Error(`Refusing to overwrite an existing evidence packet: ${evidenceDirectory}`);
  }

  const frozenAt = new Date().toISOString();
  const design = buildDesign();
  if (design.pairs.length !== 24 || design.episodes.length !== 48) throw new Error('The frozen design must contain 24 pairs and 48 episodes.');
  let t1: Awaited<ReturnType<typeof buildT1Scenario>>;
  let t2: Awaited<ReturnType<typeof buildT2Scenario>>;
  let t3: Awaited<ReturnType<typeof buildT3Scenario>>;
  let continuation: Record<string, unknown> | null = null;
  if (continuationRevision) {
    const parent = await verifyContinuationParent(continuationRevision, design);
    const inherited = await Promise.all((['T1', 'T2', 'T3'] as const).map(async taskId => {
      const scenario = parent.protocol.scenarios[taskId];
      if (!scenario) throw new Error(`r11 protocol has no frozen ${taskId} scenario`);
      const packet = await inheritedArtifact(parent, scenario.packet, scenario.packetSha256, true);
      const gold = await inheritedArtifact(parent, scenario.gold, scenario.goldSha256, false);
      return { packet, gold };
    }));
    t1 = inherited[0] as typeof t1;
    t2 = inherited[1] as typeof t2;
    t3 = inherited[2] as typeof t3;
    const parentUsageLedgerPath = join(parent.directory, 'runs', 'runtime', 'usage-ledger.json');
    const parentUsageLedgerSha256 = await hashFile(parentUsageLedgerPath);
    const parentUsage = JSON.parse(await readFile(parentUsageLedgerPath, 'utf8')) as { budget: { totalTokens: number; costUsd: number; providerCalls: number } };
    continuation = {
      parentRevision: continuationRevision,
      parentProtocolId: parent.protocol.protocolId,
      parentProtocolFrozenSha256: parent.protocolFrozenSha256,
      parentSourceManifestSha256: parent.sourceManifestSha256,
      parentUsageLedgerSha256,
      parentUsage: parentUsage.budget,
      packetChange: 'Only the top-level protocolId was rebound from r11 to r12; dataset, source, claim, scope, timestamps, gold and all other task data are unchanged.',
      executionPolicy: 'Carry all 43 validated completed/abstained attempts and the cumulative r11 usage ledger forward; rerun the interrupted episode and execute the four episodes that had not started.',
      tokenCapChange: { from: parent.protocol.modelConfig.tokenCap, to: frozenRunnerConfig.tokenCap },
    };
  } else {
    [t1, t2, t3] = await Promise.all([buildT1Scenario(), buildT2Scenario(), buildT3Scenario()]);
  }

  await mkdir(scenariosDirectory, { recursive: true });
  await mkdir(goldDirectory, { recursive: true });
  await mkdir(join(evidenceDirectory, 'runs', 'dry-run'), { recursive: true });
  await mkdir(join(evidenceDirectory, 'runs', 'sealed'), { recursive: true });
  await mkdir(join(evidenceDirectory, 'screenshots'), { recursive: true });

  const t1PacketHash = await writeExclusive(join(scenariosDirectory, 'T1-plan-packet.json'), t1.packet);
  const t1GoldHash = await writeExclusive(join(goldDirectory, 'T1-plan-gold.json'), t1.gold);
  const t2PacketHash = await writeExclusive(join(scenariosDirectory, 'T2-investigate-request-packet.json'), t2.packet);
  const t2GoldHash = await writeExclusive(join(goldDirectory, 'T2-investigate-request-gold.json'), t2.gold);
  const t3PacketHash = await writeExclusive(join(scenariosDirectory, 'T3-review-revisit-verify-packet.json'), t3.packet);
  const t3GoldHash = await writeExclusive(join(goldDirectory, 'T3-review-revisit-verify-gold.json'), t3.gold);

  const protocol = {
    schemaVersion: PROTOCOL_VERSION,
    protocolId: PROTOCOL_ID,
    frozenAt,
    status: 'FROZEN_NOT_RUN',
    scope: {
      kind: 'synthetic-agent-task-testing',
      humanParticipants: 0,
      independentExpertValidation: false,
      providerCalls: 0,
      physicalOperations: 0,
      notificationActions: 0,
      note: 'Automated task testing only. This is not a human pilot, expert validation, user-satisfaction study or independent scientific gold set.',
    },
    conditions: [
      { id: CONDITION.C1, environment: 'Synthetic task agent using accessible Playwright tools in a disposable localhost browser. Browser navigation is limited to the local application; no real external actions.', evidenceParity: 'Same task assignment and frozen source snapshot; the application browser is the C1 evidence interface.' },
      { id: CONDITION.C0, environment: 'Synthetic task agent using the frozen manual packet. T1 provides bounded weighted-score pages and source lookups; other tasks receive the provider-safe packet.', evidenceParity: 'Same pinned snapshot, source IDs, claim, scope, timestamps and units; no gold answers are exposed.' },
    ],
    personas: PERSONAS.map(persona => ({
      ...persona,
      runnerPromptsByTaskAndCondition: Object.fromEntries(TASK_FAMILIES.map(task => [task.id, Object.fromEntries(CONDITIONS.map(condition => {
        const episode = design.episodes.find(item => item.personaId === persona.id && item.taskId === task.id && item.condition === condition)!;
        const packet = task.id === 'T1' ? t1.packet : task.id === 'T2' ? t2.packet : t3.packet;
        const assignment = buildTaskAssignment(task.id, packet);
        const conditionPrompt = condition === CONDITION.C0 && task.id === 'T1'
          ? 'Use read_manual_packet for bounded weighted-score pages and named source lookup. Apply country quotas yourself.'
          : condition === CONDITION.C1
            ? 'Use the local application through accessible Playwright tools; do not access gold data or developer files.'
            : 'Use only the frozen manual packet and declared deterministic utilities.';
        const taskPrompt = `${task.prompt}\nTask assignment data: ${JSON.stringify(assignment)}\n${conditionPrompt}`;
        return [condition, buildRunnerPrompt(persona, task, episode, taskPrompt)];
      }))])),
    })),
    taskFamilies: TASK_FAMILIES,
    design: {
      pairCount: design.pairs.length,
      episodeCount: design.episodes.length,
      pairs: design.pairs,
      episodes: design.episodes,
      counterbalance: 'Method order alternates by pair index. Each pair remains a matched application-versus-manual comparison.',
      freshContextPerEpisode: true,
      rerunPolicy: 'No best-of or rerun selection. Failures, abstentions, hints and retries remain in the denominator.',
    },
    budgets: {
      stepLimitPerEpisode: 60,
      timeLimitSecondsPerEpisode: 1800,
      reviewRevisitStepLimit: 90,
      reviewRevisitTimeLimitSeconds: 2700,
      tokenCap: frozenRunnerConfig.tokenCap,
      costCapUsd: frozenRunnerConfig.costCapUsd,
      maxProviderCallsPerEpisode: frozenRunnerConfig.maxCallsPerEpisode,
      maxInputTokensPerCall: frozenRunnerConfig.maxInputTokensPerCall,
      maxOutputTokensPerCall: frozenRunnerConfig.maxOutputTokensPerCall,
      declaredInputUsdPer1mTokens: frozenRunnerConfig.inputUsdPer1mTokens,
      declaredOutputUsdPer1mTokens: frozenRunnerConfig.outputUsdPer1mTokens,
      costNote: frozenRunnerConfig.billingMode === 'chatgpt-plan'
        ? 'The selected ChatGPT/Codex plan does not expose a USD price for these runs; costUsd stays null and no API invoice is inferred.'
        : 'Provider cost is an estimate from reported or estimated usage and declared prices; it is not a billing invoice.',
      providerUsageSemantics: frozenRunnerConfig.billingMode === 'chatgpt-plan'
        ? `The Codex CLI turn.completed event reports aggregate usage for the isolated episode. Internal model request counts and per-request input/output usage are unavailable, so the API-only per-request limits do not apply to this runtime. The ${Math.round(frozenRunnerConfig.tokenCap / 1_000_000)}-million-token lab cap is checked from reported episode aggregates and prevents subsequent episodes from starting after the cap is crossed.`
        : 'Usage is recorded per provider request against per-request input/output and whole-lab token/cost limits.',
    },
    modelConfig: frozenRunnerConfig,
    ...(continuation ? { continuation } : {}),
    providerDataHandling: {
      externalReportBodiesIncluded: false,
      unclearedExternalEvidenceMetadataSent: false,
      note: 'T2 externalEvidenceMetadata is removed before model requests and exact matching metadata strings are redacted from browser observations. The linked report body is not included.',
      remoteProviderRequiresOptIn: frozenRunnerConfig.billingMode === 'api',
    },
    personasNote: 'Personas are synthetic role simulations, not people. Two agents from one model family are not independent experts. Persona P8 receives no click list.',
    scenarios: {
      T1: { packet: 'scenarios/T1-plan-packet.json', gold: 'scenarios/gold/T1-plan-gold.json', packetSha256: t1PacketHash, goldSha256: t1GoldHash, datasetSnapshotId: t1.packet.dataset.datasetSnapshotId, candidateCount: t1.packet.candidateCount },
      T2: { packet: 'scenarios/T2-investigate-request-packet.json', gold: 'scenarios/gold/T2-investigate-request-gold.json', packetSha256: t2PacketHash, goldSha256: t2GoldHash, datasetSnapshotId: t2.packet.dataset.datasetSnapshotId },
      T3: { packet: 'scenarios/T3-review-revisit-verify-packet.json', gold: 'scenarios/gold/T3-review-revisit-verify-gold.json', packetSha256: t3PacketHash, goldSha256: t3GoldHash, synthetic: true },
    },
    goldPolicy: {
      authoredBeforeRuns: true,
      exposedToRunner: false,
      T1: 'Deterministic planner policy replay pin and explicit activation rule.',
      T2: 'Author-frozen rule check over exact source, claim, scope, verdict and request fields.',
      T3: 'Frozen DEMO decision digest, deterministic revisit replay and trusted-digest verification.',
    },
    safetyGates: SAFETY_LIMITS,
    releaseStatus: 'No metric may be published as a result while status is FROZEN_NOT_RUN. Only counts, gates and the excluded dry-run may be reported.',
  };
  const protocolHash = await writeExclusive(join(evidenceDirectory, 'protocol-frozen.json'), protocol);

  const continuationNote = continuation
    ? '\n\n## Continuation lineage\n\nThis r12 revision preserves the r11 task schedule and frozen packets. The only packet field changed is the protocol revision ID. It carries forward 43 hash-verified completed/abstained records and the r11 cumulative usage ledger. The interrupted P8-T1-C1 attempt is rerun, along with the four scheduled episodes that had not started. The model, reasoning effort and 100-million-token cumulative cap are unchanged.\n'
    : '';
  await writeExclusive(join(evidenceDirectory, 'README.md'), `# Agent practical-usefulness lab — revision 12\n\nProtocol source: \`~/Downloads/MethaneResponse_AI_Agent_Evaluation_Lab_Protocol.md\` (local input, not reproduced here).\n\nThis packet schedules the same 48 synthetic agent episodes: 8 role simulations x 3 task families x 2 conditions. The runtime remains GPT-6 Luna at max reasoning effort through the signed-in Codex CLI plan. A restricted per-episode MCP bridge supplies Playwright tools for C1 or bounded manual-packet tools for C0. This is not a human pilot, expert validation, user-satisfaction study or independent scientific gold set.\n\n## Run\n\nRun \`bash scripts/agent-usefulness/run-codex-luna-max-r12.sh\` to verify the r11 parent, freeze r12, run deterministic gates and scripted dry-runs, carry forward validated attempts and cumulative usage, execute the remaining episodes serially, and finalize the report. The launcher pins \`codex-cli-gpt-6-luna-max\`, records the Codex CLI version and uses the locally signed-in account. No API key is required or stored. The app and isolated MCP bridge receive no Codex credentials. Shell, built-in browser, external browser and computer tools are disabled; task tools are limited to the local application or supplied packet.\n\nThe 100-million-token cumulative cap is inherited unchanged from r11. Codex plan usage is recorded from the aggregate \`turn.completed\` usage event for each isolated episode. Internal model request counts and per-request input/output totals are unavailable from this CLI path, so the API-only per-request token limits do not apply. Each episode also has a task tool-step limit and timeout. The account plan exposes no API price or USD invoice, so \`costUsd\` is null and the report does not infer dollar cost. Running this packet consumes ChatGPT/Codex plan usage. T2's uncleared external-report metadata is removed from model input.\n\nThe TypeScript MCP server is launched through Bun from the Node-based Playwright worker. The command refuses to overwrite a frozen packet or sealed episode. Carried-forward episode records are immutable. A Codex startup failure, missing first model turn, or missing MCP tool submission stops the serial runner immediately.\n\n## Evidence and limits\n\n- \`runs/dry-run/\` contains scripted browser instrumentation only; those records are excluded from agent metrics.\n- \`runs/sealed/\` contains one immutable attempt per scheduled episode, including abstentions and failures.\n- C0 T1 exposes bounded score-ranked packet pages and source lookup; it does not apply the quota or return a selected plan.\n- C1 is limited to the disposable localhost application. External links and non-local navigation are blocked. Reviewer-token and credential fields cannot be read or filled by the agent.\n- MARS metadata remains attributed to UNEP IMEO. No third-party report body is included or sent.\n- Source feedback does not prove a repair, and missing later plume observations do not establish zero methane. Digests prove integrity, not physical truth.\n${continuationNote}`);

  const parityChecks = [
    { item: 'Pinned dataset identity', c0: 'dataset block in packet', c1: 'application dataset selector / planner provenance', equivalent: true, note: 'Both use the same snapshot ID and archive hash.' },
    { item: 'Source identifiers and timestamps', c0: 'candidate or plume records in packet', c1: 'source/plume records rendered by application', equivalent: true, note: 'No application-only identifiers are added to the comparison.' },
    { item: 'Claim, scope and units', c0: 'claim block and request template', c1: 'assessment scope and evidence fields', equivalent: true, note: 'Exact UTC dates and kg/h units are preserved.' },
    { item: 'Rules baseline', c0: 'policy prose and acceptance criteria', c1: 'Run rules baseline control', equivalent: true, note: 'C0 must apply the written rules; it does not receive a precomputed verdict.' },
    { item: 'Trusted digest verification', c0: 'exported file + sha256sum / verifier CLI', c1: 'Verify and download decision', equivalent: true, note: 'Both verify against a digest supplied outside the checked artifact.' },
  ];
  const parity = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    frozenAt,
    pairs: design.pairs.map(pair => ({
      pairId: pair.pairId,
      personaId: pair.personaId,
      taskId: pair.taskId,
      order: [pair.first, pair.second],
      checks: parityChecks,
      status: 'DECLARED_EQUIVALENT_NOT_EXERCISED',
      deviations: [],
      note: 'Parity is declared from the frozen inputs. It is not measured until sealed runs complete.',
    })),
    exclusions: [],
  };
  const parityHash = await writeExclusive(join(evidenceDirectory, 'task-parity.json'), parity);
  await writeExclusive(join(evidenceDirectory, 'scorer.ts'), await readFile('scripts/agent-usefulness/scorer.ts', 'utf8'));

  const harnessFiles = [
    'scripts/agent-usefulness/continuation.ts',
    'scripts/agent-usefulness/continuation.test.ts',
    'scripts/agent-usefulness/migrate-continuation-r12.ts',
    'scripts/agent-usefulness/protocol-r12.ts',
    'scripts/agent-usefulness/scenarios.ts',
    'scripts/agent-usefulness/prepare-r12.ts',
    'scripts/agent-usefulness/gates-r12.ts',
    'scripts/agent-usefulness/finalize-r12.ts',
    'scripts/agent-usefulness/scorer.ts',
    'scripts/agent-usefulness/protocol.test.ts',
    'scripts/agent-usefulness/scenarios.test.ts',
    'scripts/agent-usefulness/scorer.test.ts',
    'scripts/agent-usefulness/gates.test.ts',
    'scripts/agent-usefulness/runner-config.ts',
    'scripts/agent-usefulness/runner-config.test.ts',
    'scripts/agent-usefulness/runner-context.ts',
    'scripts/agent-usefulness/runner-context.test.ts',
    'scripts/agent-usefulness/provider.ts',
    'scripts/agent-usefulness/provider.test.ts',
    'scripts/agent-usefulness/agent-loop.ts',
    'scripts/agent-usefulness/agent-loop.test.ts',
    'scripts/agent-usefulness/manual-packet.ts',
    'scripts/agent-usefulness/manual-packet.test.ts',
    'scripts/agent-usefulness/browser-tools.ts',
    'scripts/agent-usefulness/browser-tools.test.ts',
    'scripts/agent-usefulness/budget-ledger.ts',
    'scripts/agent-usefulness/budget-ledger.test.ts',
    'scripts/agent-usefulness/run-all-r12.ts',
    'scripts/agent-usefulness/run-all.test.ts',
    'scripts/agent-usefulness/run-openai-luna.sh',
    'scripts/agent-usefulness/run-codex-luna-max-r12.sh',
    'scripts/agent-usefulness/codex-cli-runner.ts',
    'scripts/agent-usefulness/codex-cli-runner.test.ts',
    'scripts/agent-usefulness/codex-mcp-server.ts',
    'scripts/agent-usefulness/codex-mcp-server.test.ts',
    'playwright.agent-lab-r12.config.ts',
    'playwright.agent-lab-run-r12.config.ts',
    'e2e/agent-lab/plan-dry-run-r12.spec.ts',
    'e2e/agent-lab/sealed-runner-r12.spec.ts',
    'docs/evidence/agent-practical-usefulness-2026-10-21-r12-runbook.md',
    'package.json',
    'tsconfig.agent-lab.json',
    'bun.lock',
  ];
  const hashes: Record<string, string> = {};
  for (const path of harnessFiles) {
    if (existsSync(path)) hashes[path] = await hashFile(path);
  }
  const snapshot = t1.packet.dataset;
  const sourceManifest = {
    schemaVersion: 1,
    protocolId: PROTOCOL_ID,
    frozenAt,
    sourceRevision: {
      head: command(['git', 'rev-parse', 'HEAD']),
      branch: command(['git', 'rev-parse', '--abbrev-ref', 'HEAD']),
      workingTreeDirty: command(['git', 'status', '--porcelain']).split('\n').filter(Boolean),
      diffSha256: createHash('sha256').update(command(['git', 'diff'])).digest('hex'),
    },
    runtimeFiles: hashes,
    dataset: {
      datasetSnapshotId: snapshot.datasetSnapshotId,
      inputFileSha256: snapshot.inputFileSha256,
      archiveSha256: snapshot.archiveSha256,
      intelligenceSha256: snapshot.intelligenceSha256,
      sourceCount: snapshot.totalSourceCount,
      archiveStartDate: snapshot.archiveStartDate,
      archiveEndDate: snapshot.archiveEndDate,
      license: 'UNEP IMEO MARS metadata, CC BY-NC-SA 4.0 (dataset terms); no report body reproduced',
    },
    versions: {
      bun: Bun.version,
      playwright: JSON.parse(await readFile('node_modules/@playwright/test/package.json', 'utf8')).version,
      runtimeSourceRevisionNote: 'Runtime files are bound by SHA-256 above; the dirty working tree is recorded rather than silently cleaned.',
    },
    ...(continuation ? { continuation } : {}),
    privateOrSensitiveInputs: {
      environmentFilesIncluded: false,
      tokensIncluded: false,
      privateUserStateIncluded: false,
      thirdPartyReportBodiesIncluded: false,
    },
    hashes: { protocolFrozenSha256: protocolHash, taskParitySha256: parityHash },
  };
  await writeExclusive(join(evidenceDirectory, 'source-manifest.json'), sourceManifest);

  process.stdout.write(JSON.stringify({
    status: 'frozen', evidenceDirectory, protocolSha256: protocolHash,
    episodes: design.episodes.length, pairs: design.pairs.length,
    scenarios: { T1: t1PacketHash, T2: t2PacketHash, T3: t3PacketHash },
    dataset: snapshot.datasetSnapshotId,
  }) + '\n');
}

if (import.meta.main) await main();
