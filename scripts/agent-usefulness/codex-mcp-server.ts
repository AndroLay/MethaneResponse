import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { chromium, type Browser, type Page } from '@playwright/test';
import type { AgentTaskTool } from './agent-loop';
import { createBrowserTaskTools } from './browser-tools';
import { createManualPacketTool } from './manual-packet';
import type { Episode } from './protocol';
import { readBridgeDiagnostic, writeBridgeDiagnostic, type BridgeDiagnostic } from './bridge-diagnostics';
import { createTrustedExportTool, type TrustedExportFixture } from './trusted-export-tool';

type Context = {
  episode: Episode;
  packet: Record<string, unknown>;
  appOrigin: string | null;
  initialPath: string | null;
  stepLimit: number;
  verificationFixture?: TrustedExportFixture;
};

type SubmittedResult = {
  status: 'completed' | 'abstained';
  assistance: 'none' | 'navigation' | 'substantive' | 'unknown';
  output: Record<string, unknown>;
  note: string | null;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(/(?:Bearer\s+[A-Za-z0-9._~+/=-]{24,}|mrv1\.[A-Za-z0-9._~+/=-]{20,}|\b(?:sk|pk)-[A-Za-z0-9_-]{20,})/g, '[REDACTED]');
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrub(child)]));
  return value;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (!message || message.length > 220 || /(?:Bearer\s|https?:\/\/|\bmrv1\.|\b(?:sk|pk)-[A-Za-z0-9_-]{12,})/i.test(message)) return 'Action failed; inspect the visible page or retry with valid fields.';
  return message;
}

function validateSubmit(value: unknown): SubmittedResult {
  const row = object(value);
  const output = object(row.output);
  if ((row.status !== 'completed' && row.status !== 'abstained') || !row.output || typeof row.output !== 'object' || Array.isArray(row.output)) {
    throw new Error('submit_result requires completed/abstained status and an output object.');
  }
  const assistance = ['none', 'navigation', 'substantive', 'unknown'].includes(String(row.assistance))
    ? row.assistance as SubmittedResult['assistance'] : 'unknown';
  return {
    status: row.status,
    assistance,
    output: scrub(output) as Record<string, unknown>,
    note: typeof row.note === 'string' ? String(scrub(row.note)).slice(0, 2000) : null,
  };
}

const submitTool = {
  name: 'submit_result',
  description: 'Submit the required task output and whether the episode was completed or abstained. This is the only way to finish the episode.',
  inputSchema: {
    type: 'object', additionalProperties: false,
    properties: {
      status: { type: 'string', enum: ['completed', 'abstained'] },
      assistance: { type: 'string', enum: ['none', 'navigation', 'substantive', 'unknown'] },
      output: { type: 'object', additionalProperties: true },
      note: { type: 'string', maxLength: 2000 },
    },
    required: ['status', 'assistance', 'output'],
  },
};

async function main() {
  const contextPath = process.env.AGENT_LAB_CONTEXT_PATH;
  const resultPath = process.env.AGENT_LAB_RESULT_PATH;
  if (!contextPath || !resultPath) throw new Error('Codex MCP server context paths are not configured.');
  const bridgeContextPath: string = contextPath;
  const bridgeResultPath: string = resultPath;
  const context = JSON.parse(await readFile(bridgeContextPath, 'utf8')) as Context;
  const tools = new Map<string, AgentTaskTool>();
  let browser: Browser | null = null;
  let page: Page | null = null;
  let browserVersion: string | null = null;
  let pageErrorCount = 0;
  const toolNames: string[] = [];
  const failures: string[] = [];
  let steps = 0;
  let stepLimitExceeded = false;
  let submitted: SubmittedResult | null = null;
  const checkpoint = (stage: BridgeDiagnostic['stage']) => writeBridgeDiagnostic(bridgeResultPath, {
    schemaVersion: 1, stage, steps, submitted: submitted !== null, toolNames: toolNames.slice(-90), failureCount: failures.length,
  });
  await checkpoint('initializing');
  if(context.verificationFixture && context.episode.taskId === 'T3') {
    const tool = createTrustedExportTool(context.verificationFixture);
    tools.set(tool.definition.function.name,tool);
  }

  if (context.episode.condition === 'C0_MANUAL_PACKET' && context.episode.taskId === 'T1') {
    const packetTool = createManualPacketTool(context.packet);
    tools.set(packetTool.definition.function.name, { definition: packetTool.definition, execute: packetTool.execute });
  }

  if (context.episode.condition === 'C1_APPLICATION_BROWSER') {
    if (!context.appOrigin || !context.initialPath) throw new Error('Codex browser context is incomplete.');
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
      args: ['--no-sandbox'],
    });
    browserVersion = `Chromium ${browser.version()}`;
    const browserContext = await browser.newContext();
    page = await browserContext.newPage();
    const baseUrl = new URL(context.appOrigin).origin;
    await page.route('**/*', route => {
      try {
        return new URL(route.request().url()).origin === baseUrl ? route.continue() : route.abort();
      } catch {
        return route.abort();
      }
    });
    page.on('pageerror', () => { pageErrorCount += 1; });
    await page.goto(new URL(context.initialPath, baseUrl).href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    for (const tool of createBrowserTaskTools(page, baseUrl, context.packet)) tools.set(tool.definition.function.name, tool);
  }

  await checkpoint('ready');
  async function writeSubmittedResult(candidate: SubmittedResult) {
    const result = {
      submitted: true,
      ...candidate,
      steps,
      toolNames,
      stepLimitExceeded,
      failures,
      pageErrorCount,
      browser: browserVersion,
    };
    await writeFile(bridgeResultPath, JSON.stringify(result, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }

  const readline = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of readline) {
    if (!line.trim()) continue;
    let request: { id?: string | number; method?: string; params?: Record<string, unknown> };
    try {
      request = JSON.parse(line);
    } catch {
      continue;
    }
    if (request.method === 'notifications/initialized' || request.method === 'notifications/cancelled') continue;
    const requestId = request.id;
    if (requestId === undefined) continue;

    if (request.method === 'initialize') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: requestId,
        result: {
          protocolVersion: request.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'methane-agent-lab', version: '1.0.0' },
        },
      }) + '\n');
      continue;
    }
    if (request.method === 'ping') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, result: {} }) + '\n');
      continue;
    }
    if (request.method === 'tools/list') {
      const available = [...tools.values()].map(tool => ({
        name: tool.definition.function.name,
        description: tool.definition.function.description,
        inputSchema: tool.definition.function.parameters,
      }));
      available.push(submitTool);
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, result: { tools: available } }) + '\n');
      continue;
    }
    if (request.method !== 'tools/call') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, error: { code: -32601, message: 'Method not found.' } }) + '\n');
      continue;
    }

    const params = object(request.params);
    const name = typeof params.name === 'string' ? params.name : '';
    const args = object(params.arguments);
    try {
      let value: unknown;
      if (name === 'submit_result') {
        if (submitted) throw new Error('submit_result may only be called once.');
        const candidate = validateSubmit(args);
        await writeSubmittedResult(candidate);
        submitted = candidate;
        await checkpoint('submitted');
        value = { accepted: true, status: submitted.status };
      } else {
        steps += 1;
        toolNames.push(tools.has(name) ? name : 'unknown_tool');
        await checkpoint('tool_started');
        if (steps > context.stepLimit) {
          stepLimitExceeded = true;
          failures.push('tool_limit_reached');
          throw new Error('The task tool limit has been reached. Submit a result or abstain.');
        }
        const tool = tools.get(name);
        if (!tool) {
          failures.push('unknown_tool');
          throw new Error('Unknown tool. Use only the tools listed by this server.');
        }
        value = await tool.execute(args);
        await checkpoint('tool_finished');
      }
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, result: { content: [{ type: 'text', text: JSON.stringify(scrub(value)) }] } }) + '\n');
    } catch (error) {
      failures.push('tool_action_error');
      await checkpoint(submitted ? 'submitted' : 'tool_finished');
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, result: { isError: true, content: [{ type: 'text', text: safeError(error) }] } }) + '\n');
    }
  }

  await checkpoint('closed');
  await page?.context().close().catch(() => {});
  await browser?.close().catch(() => {});
}

if (import.meta.main) {
  try {
    await main();
  } catch {
    const path = process.env.AGENT_LAB_RESULT_PATH;
    if (path) {
      const previous = await readBridgeDiagnostic(path);
      await writeBridgeDiagnostic(path, { schemaVersion: 1, stage: previous && previous.stage !== 'initializing' ? 'bridge_failed' : 'initialization_failed', steps: previous?.steps || 0,
        submitted: previous?.submitted || false, toolNames: previous?.toolNames || [], failureCount: (previous?.failureCount || 0) + 1 }).catch(() => {});
    }
    process.stderr.write('Methane agent lab MCP server failed to initialize.\n');
    process.exitCode = 1;
  }
}
