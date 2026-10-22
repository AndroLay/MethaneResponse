import { afterEach, describe, expect, test } from 'bun:test';
import { runTaskAgent } from './agent-loop';
import { parseRunnerConfig } from './runner-config';

const servers: ReturnType<typeof Bun.serve>[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

function config(port: number) {
  return parseRunnerConfig({
    AGENT_LAB_BASE_URL: `http://127.0.0.1:${port}/v1`, AGENT_LAB_PROVIDER: 'local-test', AGENT_LAB_MODEL: 'DEMO-model',
    AGENT_LAB_SEED: '12', AGENT_LAB_TEMPERATURE: '0', AGENT_LAB_TOKEN_CAP: '10000', AGENT_LAB_COST_CAP_USD: '0',
    AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_MAX_CALLS_PER_EPISODE: '4',
    AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '1000', AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '100',
  });
}

function toolCall(id: string, name: string, args: object) {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } };
}

describe('agent tool loop', () => {
  test('executes a local packet tool then records the submitted result and usage', async () => {
    let turn = 0;
    const server = Bun.serve({
      port: 0,
      fetch: async () => {
        turn += 1;
        const call = turn === 1 ? toolCall('call-1', 'read_manual_packet', { operation: 'ranked_page', offset: 0, limit: 2 })
          : toolCall('call-2', 'submit_result', { status: 'completed', assistance: 'none', output: { selectedSourceIds: ['DEMO-A'] } });
        return Response.json({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [call] } }], usage: { prompt_tokens: 80, completion_tokens: 12, total_tokens: 92 } });
      },
    });
    servers.push(server);
    let executed = 0;
    const result = await runTaskAgent({
      config: config(server.port!), prompt: 'DEMO task', taskTools: [{
        definition: { type: 'function', function: { name: 'read_manual_packet', description: 'Read a bounded packet page.', parameters: { type: 'object' } } },
        execute: () => { executed += 1; return { rows: ['DEMO-A', 'DEMO-B'] }; },
      }],
      stepLimit: 2, timeLimitSeconds: 10, budget: { totalTokens: 0, costUsd: 0, providerCalls: 0 },
    });

    expect(turn).toBe(2);
    expect(executed).toBe(1);
    expect(result.status).toBe('completed');
    expect(result.output).toEqual({ selectedSourceIds: ['DEMO-A'] });
    expect(result.steps).toBe(1);
    expect(result.timing.modelCalls).toBe(2);
    expect(result.timing.inputTokens).toBe(160);
    expect(result.timing.outputTokens).toBe(24);
    expect(result.timing.retries).toBe(0);
  });

  test('does not execute a second action beyond the task step limit', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [
        toolCall('call-1', 'read_page', {}), toolCall('call-2', 'click', { name: 'Save' }),
      ] } }], usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 } }),
    });
    servers.push(server);
    let executed = 0;
    const result = await runTaskAgent({
      config: config(server.port!), prompt: 'DEMO task', taskTools: [{
        definition: { type: 'function', function: { name: 'read_page', description: 'Read page.', parameters: { type: 'object' } } }, execute: () => { executed += 1; return {}; },
      }, {
        definition: { type: 'function', function: { name: 'click', description: 'Click.', parameters: { type: 'object' } } }, execute: () => { executed += 1; return {}; },
      }],
      stepLimit: 1, timeLimitSeconds: 10, budget: { totalTokens: 0, costUsd: 0, providerCalls: 0 },
    });
    expect(executed).toBe(1);
    expect(result.status).toBe('failed');
    expect(result.timing.failures).toContain('tool_limit_reached');
  });
});
