import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { AgentAttempt, RunTaskAgentOptions, UsageBudget } from './agent-loop';
import type { Episode } from './protocol';
import type { RunnerConfig } from './runner-config';
import { readBridgeDiagnostic } from './bridge-diagnostics';
import { taskContractProblems, taskOutputJsonSchema, validTaskOutput, type TaskContract } from './task-contract-v13';
import { createTrustedExportTool, type TrustedExportFixture } from './trusted-export-tool';

export type CodexUsage = {
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
};

export type CodexEvent = {
  type?: string;
  usage?: Partial<{
    input_tokens: number;
    output_tokens: number;
    cached_input_tokens: number;
    reasoning_output_tokens: number;
  }>;
};

export function parseCodexEvent(line: string): CodexEvent | null {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as CodexEvent : null;
  } catch {
    return null;
  }
}

export function applyCodexUsageEvent(usage: CodexUsage, event: CodexEvent) {
  if (event.type !== 'turn.completed' || !event.usage) return false;
  usage.modelCalls += 1;
  usage.inputTokens += Number.isSafeInteger(event.usage.input_tokens) ? Number(event.usage.input_tokens) : 0;
  usage.outputTokens += Number.isSafeInteger(event.usage.output_tokens) ? Number(event.usage.output_tokens) : 0;
  usage.cachedInputTokens += Number.isSafeInteger(event.usage.cached_input_tokens) ? Number(event.usage.cached_input_tokens) : 0;
  usage.reasoningOutputTokens += Number.isSafeInteger(event.usage.reasoning_output_tokens) ? Number(event.usage.reasoning_output_tokens) : 0;
  return true;
}

function safeErrorCode(exitCode: number | null, timedOut: boolean) {
  if (timedOut) return 'time_limit_reached';
  if (exitCode === null) return 'codex_process_interrupted';
  if (exitCode !== 0) return `codex_cli_exit_${exitCode}`;
  return 'codex_result_missing';
}

function buildPrompt(prompt: string) {
  return [
    'You are one synthetic evaluation agent in an isolated, disposable MethaneResponse lab.',
    'Follow the assignment and persona exactly. Use only the MCP tools supplied by the lab server. The local shell, filesystem, arbitrary browser access, external network and other tools are unavailable and must not be requested.',
    'For browser tasks, use the supplied browser tools to inspect and operate only the localhost MethaneResponse application. For manual tasks, use only the supplied packet tool when it is present.',
    'Keep DEMO fixtures labeled. Do not claim physical mitigation, methane reduction, repair, authenticity, zero emissions or human approval unless the supplied evidence establishes it. Feedback, a digest and a missing later observation do not establish those outcomes.',
    'When done, call submit_result exactly once with status, assistance and the task output object. Do not treat a prose final answer as a submitted result.',
    '',
    'TASK ASSIGNMENT',
    prompt,
  ].join('\n');
}

function filteredCodexEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  const allowed = [
    'PATH', 'HOME', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR', 'CODEX_HOME', 'CODEX_SQLITE_HOME',
    'CODEX_VERSION', 'CODEX_MANAGED_BY_NPM', 'CODEX_MANAGED_PACKAGE_ROOT', 'CODEX_NETWORK_PROXY_ACTIVE',
    'CODEX_NETWORK_ALLOW_LOCAL_BINDING', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'NO_PROXY',
  ];
  for (const key of allowed) if (source[key] !== undefined) result[key] = source[key];
  return result;
}

export function codexMcpBridgeExecutable(environment: NodeJS.ProcessEnv) {
  return environment.AGENT_LAB_BUN_EXECUTABLE?.trim() || 'bun';
}

export type CodexTaskContext = {
  episode: Episode;
  packet: Record<string, unknown>;
  appOrigin: string | null;
  initialPath: string | null;
  taskContract?: TaskContract;
  verificationFixture?: TrustedExportFixture;
};

export type CodexTaskOptions = Omit<RunTaskAgentOptions, 'config' | 'taskTools' | 'onBudgetChange' | 'budget'> & {
  config: RunnerConfig;
  context: CodexTaskContext;
  stepLimit: number;
  budget: UsageBudget;
  onBudgetChange?: (budget: UsageBudget) => void | Promise<void>;
};

/** Run one sealed episode in a fresh Codex CLI task with only the lab MCP tools enabled. */
export async function runCodexTaskAgent(options: CodexTaskOptions): Promise<AgentAttempt> {
  const { config, context, prompt, stepLimit, timeLimitSeconds, budget, onBudgetChange } = options;
  if (config.executor !== 'codex-cli' || config.reasoningEffort !== 'max' || config.model !== 'gpt-6-luna') {
    throw new Error('Codex runner requires the frozen GPT-6 Luna Max profile.');
  }
  const readiness = context.taskContract ? taskContractProblems(context.taskContract) : [];
  if(context.taskContract && context.taskContract.taskId !== context.episode.taskId) readiness.push('task_contract_mismatch');
  if(context.taskContract?.taskId === 'T3') {
    if(!context.verificationFixture || context.verificationFixture.expectedDigest !== context.taskContract.trustedDigest) readiness.push('trusted_export_tool_unavailable');
    else if(!(await createTrustedExportTool(context.verificationFixture).execute({}) as {valid:boolean}).valid) readiness.push('trusted_export_invalid');
  }
  if(readiness.length) return {
    status:'failed',assistance:'unknown',output:null,note:'New task contract failed preflight; no provider process started.',steps:0,toolNames:[],providerUsageEstimate:false,
    timing:{wallClockSeconds:0,modelCalls:0,inputTokens:0,outputTokens:0,costUsd:0,retries:0,hints:0,failures:['task_contract_not_ready',...readiness]},
    execution:{taskContractVersion:context.taskContract?.version,providerProcessStarted:false},
  };
  const root = process.env.TMPDIR || tmpdir();
  if (budget.totalTokens >= config.tokenCap) {
    return {
      status: 'failed', assistance: 'unknown', output: null, note: 'The frozen lab token allowance was exhausted before this episode started.',
      steps: 0, toolNames: [], providerUsageEstimate: false,
      timing: { wallClockSeconds: 0, modelCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: null, retries: 0, hints: 0, failures: ['lab_token_cap'] },
    };
  }
  const workDirectory = await mkdtemp(join(root, 'methane-codex-agent-'));
  const isolatedHome = join(workDirectory, 'home');
  const contextPath = join(workDirectory, 'episode-context.json');
  const resultPath = join(workDirectory, 'bridge-result.json');
  const lastMessagePath = join(workDirectory, 'last-message.txt');
  await mkdir(isolatedHome, { recursive: true, mode: 0o700 });
  const { episode, packet, appOrigin, initialPath } = context;
  await writeFile(contextPath, JSON.stringify({ episode, packet, appOrigin, initialPath, stepLimit, ...(context.verificationFixture ? {verificationFixture:context.verificationFixture} : {}) }), { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  const bridgePath = resolve(process.cwd(), 'scripts/agent-usefulness/codex-mcp-server.ts');
  const bridgeEnvArgs = [
    '-i',
    `PATH=${process.env.PATH || '/usr/bin:/bin'}`,
    `HOME=${isolatedHome}`,
    `TMPDIR=${root}`,
    `AGENT_LAB_CONTEXT_PATH=${contextPath}`,
    `AGENT_LAB_RESULT_PATH=${resultPath}`,
    ...(context.appOrigin ? [`AGENT_LAB_APP_ORIGIN=${context.appOrigin}`] : []),
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? [`PLAYWRIGHT_CHROMIUM_EXECUTABLE=${process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}`] : []),
    codexMcpBridgeExecutable(process.env),
    bridgePath,
  ];
  const codexArgs = [
    'exec',
    '--ignore-user-config',
    '--disable', 'shell_tool',
    '--disable', 'browser_use',
    '--disable', 'browser_use_external',
    '--disable', 'computer_use',
    '--approve-for-me',
    '--config', 'mcp_servers.agent_lab.command="/usr/bin/env"',
    '--config', `mcp_servers.agent_lab.args=${JSON.stringify(bridgeEnvArgs)}`,
    '--model', config.model,
    '--config', `model_reasoning_effort=${config.reasoningEffort}`,
    '--ephemeral',
    '--skip-git-repo-check',
    '--cd', workDirectory,
    '--json',
    '--output-last-message', lastMessagePath,
    '-',
  ];

  const started = Date.now();
  const usage: CodexUsage = { modelCalls: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningOutputTokens: 0 };
  const failures: string[] = [];
  let stdoutBuffer = '';
  let stderrBytes = 0;
  let timedOut = false;
  let sawUsage = false;
  let exceededLimit: 'lab_token_cap' | 'provider_call_limit' | null = null;
  let exitCode: number | null = null;
  let processHandle: ChildProcessWithoutNullStreams | undefined;
  let spawnError = false;

  const terminate = () => {
    processHandle?.kill('SIGTERM');
    setTimeout(() => processHandle?.kill('SIGKILL'), 3000).unref();
  };

  const handleLine = async (line: string) => {
    const event = parseCodexEvent(line);
    if (!event || !applyCodexUsageEvent(usage, event)) return;
    sawUsage = true;
    const eventInputTokens = Number.isSafeInteger(event.usage?.input_tokens) ? Number(event.usage?.input_tokens) : 0;
    const eventOutputTokens = Number.isSafeInteger(event.usage?.output_tokens) ? Number(event.usage?.output_tokens) : 0;
    budget.totalTokens += eventInputTokens + eventOutputTokens;
    budget.providerCalls += 1;
    try {
      await onBudgetChange?.(budget);
    } catch {
      failures.push('usage_ledger_write_failed');
      terminate();
    }
    // Codex reports aggregate usage for the isolated CLI turn, not usage for each
    // internal model request. Per-request input/output limits cannot be checked here.
    if (usage.modelCalls > config.maxCallsPerEpisode) exceededLimit = 'provider_call_limit';
    else if (budget.totalTokens > config.tokenCap) exceededLimit = 'lab_token_cap';
    if (exceededLimit) terminate();
  };

  const consumeStdout = async (stream: NodeJS.ReadableStream & AsyncIterable<Buffer | string>) => {
    for await (const value of stream) {
      stdoutBuffer += Buffer.isBuffer(value) ? value.toString('utf8') : value;
      while (true) {
        const newline = stdoutBuffer.indexOf('\n');
        if (newline < 0) break;
        const line = stdoutBuffer.slice(0, newline);
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        await handleLine(line);
      }
    }
    if (stdoutBuffer.trim()) await handleLine(stdoutBuffer);
  };

  const consumeStderr = async (stream: NodeJS.ReadableStream & AsyncIterable<Buffer | string>) => {
    for await (const value of stream) stderrBytes += Buffer.isBuffer(value) ? value.byteLength : Buffer.byteLength(value);
  };

  try {
    processHandle = spawn(process.env.CODEX_CLI_PATH || 'codex', codexArgs, {
      cwd: workDirectory,
      env: filteredCodexEnvironment(process.env),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdin = processHandle.stdin;
    const stdout = processHandle.stdout;
    const stderr = processHandle.stderr;
    processHandle.once('error', () => { spawnError = true; });
    stdin.on('error', () => { failures.push('codex_stdin_write_failed'); });
    const closed = new Promise<number | null>(resolve => {
      processHandle!.once('close', code => resolve(code));
      processHandle!.once('error', () => { spawnError = true; resolve(null); });
    });
    stdin.end(buildPrompt(context.taskContract ? `${prompt}\n\nOUTPUT CONTRACT ${context.taskContract.version}\n${JSON.stringify(taskOutputJsonSchema(context.taskContract.taskId))}\nReturn the exact advertised JSON structure. An abstention about evidence is not a completed task unless every required request field is supplied.` : prompt));
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate();
    }, Math.max(1, timeLimitSeconds) * 1000);
    try {
      const [, , code] = await Promise.all([
        consumeStdout(stdout),
        consumeStderr(stderr),
        closed,
      ]);
      exitCode = code;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    failures.push(spawnError ? 'codex_process_start_failed' : 'codex_runner_io_failed');
  }

  let bridgeResult: Record<string, unknown> | null = null;
  const bridgeDiagnostic = await readBridgeDiagnostic(resultPath);
  const finalMessageBytes = await stat(lastMessagePath).then(value => value.size).catch(() => 0);
  try {
    bridgeResult = JSON.parse(await readFile(resultPath, 'utf8')) as Record<string, unknown>;
  } catch {
    bridgeResult = null;
  }
  if (timedOut) failures.push('time_limit_reached');
  if (exceededLimit) failures.push(exceededLimit);
  if (bridgeResult?.stepLimitExceeded === true) failures.push('tool_limit_reached');
  if (!sawUsage) failures.push('codex_usage_unavailable');
  if (spawnError && !failures.includes('codex_process_start_failed')) failures.push('codex_process_start_failed');
  if (!bridgeResult?.submitted && !spawnError) failures.push(safeErrorCode(exitCode, timedOut));
  if (!bridgeResult?.submitted && bridgeDiagnostic?.stage === 'initialization_failed') failures.push('codex_bridge_initialization_failed');
  if (!bridgeResult?.submitted && bridgeDiagnostic?.stage === 'bridge_failed') failures.push('codex_bridge_runtime_failed');
  if (!bridgeResult?.submitted && finalMessageBytes > 0) failures.push('codex_final_without_submission');
  if (stderrBytes > 0 && exitCode !== 0 && !timedOut && !failures.length) failures.push('codex_cli_error');
  if(context.taskContract && bridgeResult?.status === 'completed' && !validTaskOutput(context.taskContract,bridgeResult.output)) failures.push('task_contract_output_invalid');

  const status = bridgeResult?.submitted === true && exitCode === 0 && !timedOut && bridgeResult.stepLimitExceeded !== true
    && !exceededLimit && !failures.includes('usage_ledger_write_failed') && !failures.includes('task_contract_output_invalid')
    && (bridgeResult.status === 'completed' || bridgeResult.status === 'abstained')
    ? bridgeResult.status
    : 'failed';
  const outputValue = bridgeResult?.output;
  const output = outputValue && typeof outputValue === 'object' && !Array.isArray(outputValue) ? outputValue as Record<string, unknown> : null;
  const toolNames = Array.isArray(bridgeResult?.toolNames) ? bridgeResult!.toolNames.filter((name): name is string => typeof name === 'string') : bridgeDiagnostic?.toolNames || [];
  const steps = Number.isSafeInteger(bridgeResult?.steps) ? Number(bridgeResult!.steps) : bridgeDiagnostic?.steps || 0;
  const assistance = ['none', 'navigation', 'substantive', 'unknown'].includes(String(bridgeResult?.assistance))
    ? bridgeResult!.assistance as AgentAttempt['assistance'] : 'unknown';
  const note = typeof bridgeResult?.note === 'string' ? bridgeResult.note.slice(0, 2000) : null;
  const elapsed = Math.max(0, Math.round((Date.now() - started) / 100) / 10);
  const attempt: AgentAttempt = {
    status,
    assistance,
    output,
    note,
    steps,
    toolNames,
    providerUsageEstimate: !sawUsage,
    timing: {
      wallClockSeconds: elapsed,
      modelCalls: usage.modelCalls,
      inputTokens: sawUsage ? usage.inputTokens : null,
      outputTokens: sawUsage ? usage.outputTokens : null,
      costUsd: null,
      retries: 0,
      hints: 0,
      failures: [...new Set(failures)],
    },
    execution: {
      executor: 'codex-cli',
      codexCliVersion: config.codexCliVersion,
      reasoningEffort: config.reasoningEffort,
      billingMode: config.billingMode,
      usageSemantics: 'Codex CLI turn.completed aggregate for this isolated episode; internal request counts are unavailable.',
      cachedInputTokens: sawUsage ? usage.cachedInputTokens : null,
      reasoningOutputTokens: sawUsage ? usage.reasoningOutputTokens : null,
      browser: typeof bridgeResult?.browser === 'string' ? bridgeResult.browser : null,
      pageErrorCount: Number.isSafeInteger(bridgeResult?.pageErrorCount) ? Number(bridgeResult!.pageErrorCount) : null,
      bridgeFailures: Array.isArray(bridgeResult?.failures) ? bridgeResult.failures.filter((value): value is string => typeof value === 'string') : [],
      bridgeDiagnostic,
      processExitCode: exitCode,
      stderrBytes,
      finalMessageBytes,
      // A prose final is never promoted to a sealed task submission.
      submittedThroughBridge: bridgeResult?.submitted === true,
    },
  };

  await rm(workDirectory, { recursive: true, force: true }).catch(() => {});
  return attempt;
}
