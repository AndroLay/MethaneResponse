import type { RunnerConfig } from './runner-config';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

export type FunctionTool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatCompletion = {
  message: ChatMessage;
  finishReason: string | null;
  usage: { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
};

function nonnegativeInteger(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** One bounded OpenAI-compatible Chat Completions request. Response bodies are never copied into errors. */
export async function requestChatCompletion(
  config: RunnerConfig,
  messages: ChatMessage[],
  tools: FunctionTool[],
  maxOutputTokens: number,
  signal?: AbortSignal,
): Promise<ChatCompletion> {
  const url = `${config.baseUrl}/chat/completions`;
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' });
  if (config.apiKey) headers.set('authorization', `Bearer ${config.apiKey}`);
  const body = {
    model: config.model,
    messages,
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: false,
    ...(config.temperature !== null ? { temperature: config.temperature } : {}),
    ...(config.reasoningEffort ? { reasoning_effort: config.reasoningEffort } : {}),
    ...(config.serviceTier ? { service_tier: config.serviceTier } : {}),
    ...(config.seed !== null ? { seed: Number(config.seed) } : {}),
    max_completion_tokens: maxOutputTokens,
  };
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  } catch {
    throw new Error('Provider request failed before a response was received.');
  }
  if (!response.ok) throw new Error(`Provider request failed with HTTP ${response.status}.`);

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error('Provider returned a non-JSON response.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Provider returned an invalid completion object.');
  const record = value as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const choice = choices[0] && typeof choices[0] === 'object' ? choices[0] as Record<string, unknown> : null;
  const message = choice?.message && typeof choice.message === 'object' ? choice.message as Record<string, unknown> : null;
  if (!message || message.role !== 'assistant') throw new Error('Provider response did not contain an assistant message.');

  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls.map((rawCall, index) => {
    const call = rawCall && typeof rawCall === 'object' ? rawCall as Record<string, unknown> : {};
    const fn = call.function && typeof call.function === 'object' ? call.function as Record<string, unknown> : {};
    if (call.type !== 'function' || typeof fn.name !== 'string' || typeof fn.arguments !== 'string') {
      throw new Error(`Provider returned malformed tool call ${index + 1}.`);
    }
    return { id: typeof call.id === 'string' ? call.id : `tool-call-${index + 1}`, type: 'function' as const, function: { name: fn.name, arguments: fn.arguments } };
  }) : undefined;
  if (message.content !== null && typeof message.content !== 'string') throw new Error('Provider returned unsupported assistant content.');

  const usage = record.usage && typeof record.usage === 'object' ? record.usage as Record<string, unknown> : {};
  const inputTokens = nonnegativeInteger(usage.prompt_tokens ?? usage.input_tokens);
  const outputTokens = nonnegativeInteger(usage.completion_tokens ?? usage.output_tokens);
  const totalTokens = nonnegativeInteger(usage.total_tokens) ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  return {
    message: {
      role: 'assistant',
      content: message.content as string | null,
      ...(toolCalls ? { tool_calls: toolCalls } : {}),
    },
    finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
    usage: { inputTokens, outputTokens, totalTokens },
  };
}
