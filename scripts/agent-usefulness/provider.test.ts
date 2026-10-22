import { afterEach, describe, expect, test } from 'bun:test';
import { parseRunnerConfig } from './runner-config';
import { requestChatCompletion } from './provider';

const servers: ReturnType<typeof Bun.serve>[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

const toolSchema = [{ type: 'function' as const, function: { name: 'submit_result', description: 'Finish the task', parameters: { type: 'object', properties: {} } } }];

describe('OpenAI-compatible task provider', () => {
  test('sends a bounded tool-call request to the frozen local endpoint and parses usage', async () => {
    let requestBody: Record<string, unknown> | undefined;
    let authorization = '';
    const server = Bun.serve({
      port: 0,
      fetch: async request => {
        authorization = request.headers.get('authorization') || '';
        requestBody = await request.json() as Record<string, unknown>;
        return Response.json({
          id: 'DEMO-response',
          choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'submit_result', arguments: '{"status":"completed"}' } }] } }],
          usage: { prompt_tokens: 120, completion_tokens: 18, total_tokens: 138 },
        });
      },
    });
    servers.push(server);
    const config = parseRunnerConfig({
      AGENT_LAB_BASE_URL: `http://127.0.0.1:${server.port}/v1`, AGENT_LAB_PROVIDER: 'local-test', AGENT_LAB_MODEL: 'DEMO-model',
      AGENT_LAB_SEED: '12', AGENT_LAB_TEMPERATURE: '0', AGENT_LAB_TOKEN_CAP: '10000', AGENT_LAB_COST_CAP_USD: '0',
      AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_MAX_CALLS_PER_EPISODE: '3',
      AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '1000', AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '100', AGENT_LAB_API_KEY: 'test-key-never-write',
    });

    const response = await requestChatCompletion(config, [{ role: 'user', content: 'DEMO task' }], toolSchema, 100);

    expect(authorization).toBe('Bearer test-key-never-write');
    expect(requestBody).toMatchObject({ model: 'DEMO-model', temperature: 0, seed: 12, max_completion_tokens: 100, parallel_tool_calls: false });
    expect(JSON.stringify(requestBody)).not.toContain('test-key-never-write');
    expect(response.message.tool_calls?.[0]?.function.name).toBe('submit_result');
    expect(response.usage).toEqual({ inputTokens: 120, outputTokens: 18, totalTokens: 138 });
  });

  test('sends the required no-reasoning mode for GPT-6 Luna function calling', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = Bun.serve({
      port: 0,
      fetch: async request => {
        requestBody = await request.json() as Record<string, unknown>;
        return Response.json({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [] } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
      },
    });
    servers.push(server);
    const config = parseRunnerConfig({
      AGENT_LAB_PROFILE: 'openai-gpt-6-luna',
      AGENT_LAB_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
      AGENT_LAB_API_KEY: 'local-profile-test-key',
    });
    await requestChatCompletion(config, [{ role: 'user', content: 'DEMO task' }], toolSchema, 100);
    expect(requestBody).toMatchObject({ model: 'gpt-6-luna', reasoning_effort: 'none', service_tier: 'default' });
  });

  test('does not include provider response bodies in HTTP failures', async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response('private-provider-error-body', { status: 429 }) });
    servers.push(server);
    const config = parseRunnerConfig({
      AGENT_LAB_BASE_URL: `http://127.0.0.1:${server.port}/v1`, AGENT_LAB_PROVIDER: 'local-test', AGENT_LAB_MODEL: 'DEMO-model',
      AGENT_LAB_SEED: '12', AGENT_LAB_TEMPERATURE: '0', AGENT_LAB_TOKEN_CAP: '10000', AGENT_LAB_COST_CAP_USD: '0',
      AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_MAX_CALLS_PER_EPISODE: '3',
      AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '1000', AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '100',
    });
    let message = '';
    try {
      await requestChatCompletion(config, [{ role: 'user', content: 'DEMO task' }], toolSchema, 100);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('HTTP 429');
    expect(message).not.toContain('private-provider-error-body');
  });
});
