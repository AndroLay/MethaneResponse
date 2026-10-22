import { describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyCodexUsageEvent, codexMcpBridgeExecutable, parseCodexEvent, runCodexTaskAgent, type CodexUsage } from './codex-cli-runner';
import { parseRunnerConfig } from './runner-config';
import { readBridgeDiagnostic, writeBridgeDiagnostic } from './bridge-diagnostics';
import { TASK_CONTRACT_VERSION, taskContractFields } from './task-contract-v13';

describe('Codex CLI usage events', () => {
  test('uses Bun to start the TypeScript MCP bridge from the Node Playwright runner', () => {
    expect(codexMcpBridgeExecutable({})).toBe('bun');
    expect(codexMcpBridgeExecutable({ AGENT_LAB_BUN_EXECUTABLE: '/opt/bun/bin/bun' })).toBe('/opt/bun/bin/bun');
  });

  test('counts the snake_case usage fields emitted in turn.completed JSONL events', () => {
    const usage: CodexUsage = { modelCalls: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningOutputTokens: 0 };
    const event = parseCodexEvent(JSON.stringify({
      type: 'turn.completed',
      usage: { input_tokens: 36_350, cached_input_tokens: 2_000, output_tokens: 255, reasoning_output_tokens: 80 },
    }));

    expect(event).not.toBeNull();
    expect(applyCodexUsageEvent(usage, event!)).toBe(true);
    expect(usage).toEqual({ modelCalls: 1, inputTokens: 36_350, outputTokens: 255, cachedInputTokens: 2_000, reasoningOutputTokens: 80 });
  });

  test('ignores non-completed and malformed JSONL events', () => {
    const usage: CodexUsage = { modelCalls: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, reasoningOutputTokens: 0 };
    expect(parseCodexEvent('not-json')).toBeNull();
    expect(applyCodexUsageEvent(usage, { type: 'item.completed', usage: { input_tokens: 10 } })).toBe(false);
    expect(usage.modelCalls).toBe(0);
  });

  test('spawns the CLI through Node child_process and persists real usage events', async () => {
    const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'methane-codex-runner-test-'));
    const cliPath = join(directory, 'codex-stub.sh');
    await writeFile(cliPath, '#!/bin/sh\nprintf \'%s\\n\' \'{"type":"turn.completed","usage":{"input_tokens":201200,"cached_input_tokens":80,"output_tokens":150,"reasoning_output_tokens":40}}\'\n', { encoding: 'utf8', mode: 0o700, flag: 'wx' });
    await chmod(cliPath, 0o700);
    const previousCli = process.env.CODEX_CLI_PATH;
    const previousTemp = process.env.TMPDIR;
    process.env.CODEX_CLI_PATH = cliPath;
    process.env.TMPDIR = directory;
    try {
      const config = parseRunnerConfig({ AGENT_LAB_PROFILE: 'codex-cli-gpt-6-luna-max', AGENT_LAB_CODEX_VERSION: '0.160.0' });
      const budget = { totalTokens: 0, costUsd: 0, providerCalls: 0 };
      let persisted = 0;
      const attempt = await runCodexTaskAgent({
        config,
        prompt: 'DEMO test assignment',
        context: {
          episode: { episodeId: 'DEMO-T2-C0', pairId: 'DEMO', personaId: 'P1', taskId: 'T2', condition: 'C0_MANUAL_PACKET', sequence: 1, stepLimit: 4, timeLimitSeconds: 10 },
          packet: { synthetic: true }, appOrigin: null, initialPath: null,
        },
        stepLimit: 4, timeLimitSeconds: 10, budget,
        onBudgetChange: () => { persisted += 1; },
      });
      expect(attempt.timing.failures).not.toContain('codex_process_start_failed');
      expect(attempt.timing.failures).not.toContain('codex_usage_unavailable');
      expect(attempt.timing.failures).not.toContain('input_token_limit');
      expect(attempt.timing.failures).toContain('codex_result_missing');
      expect(attempt.execution?.bridgeDiagnostic).toBeNull();
      expect(attempt.execution?.submittedThroughBridge).toBe(false);
      expect(attempt.timing.modelCalls).toBe(1);
      expect(attempt.timing.inputTokens).toBe(201200);
      expect(attempt.timing.outputTokens).toBe(150);
      expect(attempt.timing.costUsd).toBeNull();
      expect(budget).toEqual({ totalTokens: 201350, costUsd: 0, providerCalls: 1 });
      expect(persisted).toBe(1);
    } finally {
      if (previousCli === undefined) delete process.env.CODEX_CLI_PATH; else process.env.CODEX_CLI_PATH = previousCli;
      if (previousTemp === undefined) delete process.env.TMPDIR; else process.env.TMPDIR = previousTemp;
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test('missing submission retains safe checkpoints and records a prose final without promoting it', async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'methane-runner-recovery-'));
  const cliPath = join(directory, 'stub.sh');
  await writeFile(cliPath, '#!/bin/sh\nprintf \'%s\' \'{"schemaVersion":1,"stage":"tool_finished","steps":2,"submitted":false,"toolNames":["read_page","click"],"failureCount":1}\' > bridge-result.json.diagnostics.json\nprintf \'prose final only\' > last-message.txt\nprintf \'%s\\n\' \'{"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}\'\n', { mode: 0o700 });
  const previous = process.env.CODEX_CLI_PATH;
  process.env.CODEX_CLI_PATH = cliPath;
  try {
    const attempt = await runCodexTaskAgent({ config: parseRunnerConfig({ AGENT_LAB_PROFILE: 'codex-cli-gpt-6-luna-max', AGENT_LAB_CODEX_VERSION: '0.160.0' }), prompt: 'DEMO no provider test',
      context: { episode: { episodeId:'DEMO', pairId:'DEMO', personaId:'P8', taskId:'T3', condition:'C1_APPLICATION_BROWSER', sequence:1, stepLimit:4, timeLimitSeconds:10 }, packet: {}, appOrigin:'http://127.0.0.1:1', initialPath:'/dashboard/reports' },
      stepLimit:4, timeLimitSeconds:10, budget:{totalTokens:0,costUsd:0,providerCalls:0} });
    expect(attempt.status).toBe('failed');
    expect(attempt.steps).toBe(2);
    expect(attempt.toolNames).toEqual(['read_page','click']);
    expect(attempt.timing.failures).toContain('codex_final_without_submission');
    expect(attempt.output).toBeNull();
    expect(attempt.execution?.processExitCode).toBe(0);
    expect(attempt.execution?.finalMessageBytes).toBeGreaterThan(0);
  } finally {
    if (previous === undefined) delete process.env.CODEX_CLI_PATH; else process.env.CODEX_CLI_PATH = previous;
    await rm(directory, { recursive:true, force:true });
  }
});

test('diagnostic reader rejects invalid payloads and strips untrusted tool text', async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(), 'methane-safe-diagnostic-'));
  const path = join(directory,'result.json');
  try {
    await writeBridgeDiagnostic(path, {schemaVersion:1,stage:'ready',steps:0,submitted:false,toolNames:['untrusted credential payload'],failureCount:0});
    expect((await readBridgeDiagnostic(path))?.toolNames).toEqual(['unknown_tool']);
    await writeFile(`${path}.diagnostics.json`, '{"stage":"ready"}');
    expect(await readBridgeDiagnostic(path)).toBeNull();
  } finally { await rm(directory,{recursive:true,force:true}); }
});

// Scripted protocol conformance only. No model, synthetic usage event or agent
// answer is generated. Unlike a stub writing result.json, this drives the actual
// MCP bridge and Chromium through the runner's disposable context.
for (const mode of ['submit','interrupt','contract-rejection'] as const) test(`runner real MCP browser roundtrip: ${mode}`, async () => {
  const directory = await mkdtemp(join(process.env.TMPDIR || tmpdir(),'methane-mcp-roundtrip-'));
  const server = Bun.serve({hostname:'127.0.0.1',port:0,fetch:() => new Response('<!doctype html><html><body><label>Evidence request<textarea></textarea></label><p>DEMO protocol fixture only</p></body></html>',{headers:{'content-type':'text/html'}})});
  const cliPath = join(directory,'scripted-client.cjs');
  const bridge = resolve('scripts/agent-usefulness/codex-mcp-server.ts');
  const bun = process.execPath;
  await writeFile(cliPath,`#!/usr/bin/env node
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const {createInterface}=require('node:readline');
const child=spawn(${JSON.stringify(bun)},[${JSON.stringify(bridge)}],{env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,
AGENT_LAB_CONTEXT_PATH:resolve('episode-context.json'),AGENT_LAB_RESULT_PATH:resolve('bridge-result.json'),
PLAYWRIGHT_CHROMIUM_EXECUTABLE:${JSON.stringify(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '')}},stdio:['pipe','pipe','pipe']});
let next=0; const pending=new Map();
const closed=new Promise((resolve,reject)=>{child.once('close',resolve);child.once('error',reject)});
child.stderr.on('data',()=>{});
createInterface({input:child.stdout}).on('line',line=>{const row=JSON.parse(line);const item=pending.get(row.id);if(item){pending.delete(row.id);row.error?item.reject(Error('RPC failed')):item.resolve(row.result)}});
const rpc=(method,params)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\\n')});
const call=(name,args)=>rpc('tools/call',{name,arguments:args});
(async()=>{
await rpc('initialize',{protocolVersion:'2024-11-05'});
const list=await rpc('tools/list',{}); if(!list.tools.some(t=>t.name==='read_page')) throw Error('Browser tools missing');
const page=await call('read_page',{}); if(page.isError) throw Error('Browser tool failed');
if(${JSON.stringify(mode)}==='interrupt'){child.stdin.end();await closed;process.exitCode=7;return;}
const fill=await call('fill',{label:'Evidence request',value:'DEMO request a dated source-specific measurement.'}); if(fill.isError) throw Error('Fill failed');
const after=await call('read_page',{}); if(!after.content[0].text.includes('DEMO request a dated source-specific measurement.')) throw Error('Fill did not persist');
const submitted=await call('submit_result',{status:'completed',assistance:'none',output:{kind:'scripted-protocol-conformance',inputObserved:true,physicalOutcomeEstablished:false}});
if(submitted.isError) throw Error('Submission failed');child.stdin.end();if(await closed!==0) throw Error('Bridge failed');
})().catch(()=>{child.kill();process.exitCode=1});
`,{mode:0o700});
  const previous = process.env.CODEX_CLI_PATH;
  process.env.CODEX_CLI_PATH = cliPath;
  try {
    const budget = {totalTokens:0,costUsd:0,providerCalls:0};
    const attempt = await runCodexTaskAgent({config:parseRunnerConfig({AGENT_LAB_PROFILE:'codex-cli-gpt-6-luna-max',AGENT_LAB_CODEX_VERSION:'0.160.0'}),prompt:'DEMO scripted test; no model call.',
      context:{episode:{episodeId:'DEMO-roundtrip',pairId:'DEMO',personaId:'P8',taskId:'T2',condition:'C1_APPLICATION_BROWSER',sequence:1,stepLimit:6,timeLimitSeconds:20},packet:{},appOrigin:`http://127.0.0.1:${server.port}`,initialPath:'/dashboard/evidence',
        ...(mode==='contract-rejection'?{taskContract:{version:TASK_CONTRACT_VERSION,taskId:'T2' as const,advertisedOutputFields:taskContractFields('T2'),availableOperations:['inspect_evidence']}}:{})},
      stepLimit:6,timeLimitSeconds:20,budget});
    expect(budget).toEqual({totalTokens:0,costUsd:0,providerCalls:0});
    expect(attempt.timing.modelCalls).toBe(0);
    expect(attempt.timing.failures).toContain('codex_usage_unavailable');
    if(mode==='submit') {
      expect(attempt.status).toBe('completed');
      expect(attempt.steps).toBe(3);
      expect(attempt.output).toEqual({kind:'scripted-protocol-conformance',inputObserved:true,physicalOutcomeEstablished:false});
      expect(attempt.execution?.submittedThroughBridge).toBe(true);
      expect(attempt.execution?.bridgeDiagnostic).toMatchObject({stage:'closed',steps:3,submitted:true});
    } else if(mode==='interrupt') {
      expect(attempt.status).toBe('failed');
      expect(attempt.steps).toBe(1);
      expect(attempt.toolNames).toEqual(['read_page']);
      expect(attempt.output).toBeNull();
      expect(attempt.timing.failures).toContain('codex_cli_exit_7');
      expect(attempt.execution?.bridgeDiagnostic).toMatchObject({stage:'closed',steps:1,submitted:false});
    } else {
      expect(attempt.status).toBe('failed');
      expect(attempt.timing.failures).toContain('task_contract_output_invalid');
      expect(attempt.output).toEqual({kind:'scripted-protocol-conformance',inputObserved:true,physicalOutcomeEstablished:false});
      expect(attempt.execution?.submittedThroughBridge).toBe(true);
    }
  } finally {
    if(previous===undefined) delete process.env.CODEX_CLI_PATH; else process.env.CODEX_CLI_PATH=previous;
    server.stop(true); await rm(directory,{recursive:true,force:true});
  }
},30_000);
