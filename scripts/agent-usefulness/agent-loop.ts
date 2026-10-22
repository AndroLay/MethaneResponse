import type { RunStatus, Assistance, Timing } from './scorer';
import type { RunnerConfig } from './runner-config';
import { requestChatCompletion, type ChatMessage, type FunctionTool } from './provider';

export type AgentTaskTool = {
  definition: FunctionTool;
  execute: (arguments_: unknown) => unknown | Promise<unknown>;
};

export type UsageBudget = {
  totalTokens: number;
  costUsd: number;
  providerCalls: number;
};

export type AgentAttempt = {
  status: 'completed' | 'abstained' | 'failed';
  assistance: Assistance;
  output: Record<string, unknown> | null;
  note: string | null;
  steps: number;
  toolNames: string[];
  providerUsageEstimate: boolean;
  timing: Timing;
  execution?: Record<string, unknown>;
};

export type RunTaskAgentOptions = {
  config: RunnerConfig;
  prompt: string;
  taskTools: AgentTaskTool[];
  stepLimit: number;
  timeLimitSeconds: number;
  budget: UsageBudget;
  onBudgetChange?: (budget: UsageBudget) => void | Promise<void>;
};

const submitResultTool: FunctionTool = {
  type: 'function',
  function: {
    name: 'submit_result',
    description: 'Finish this episode. Submit the required task output and say whether you completed or abstained.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['completed', 'abstained'] },
        assistance: { type: 'string', enum: ['none', 'navigation', 'substantive', 'unknown'] },
        output: { type: 'object', additionalProperties: true },
        note: { type: 'string', maxLength: 2000 },
      },
      required: ['status', 'assistance', 'output'],
    },
  },
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Conservative character-based estimate used for local token and cost caps. */
export function estimateTokens(value: string) {
  return Math.ceil(new TextEncoder().encode(value).length / 3);
}

function estimateCost(config: RunnerConfig, inputTokens: number, outputTokens: number) {
  return inputTokens * config.inputUsdPer1mTokens / 1_000_000 + outputTokens * config.outputUsdPer1mTokens / 1_000_000;
}

function sanitizedFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const http = message.match(/HTTP (\d{3})/);
  if (http) return `provider_http_${http[1]}`;
  if (/input.*token.*limit/i.test(message)) return 'input_token_limit';
  if (/lab token cap/i.test(message)) return 'lab_token_cap';
  if (/lab cost cap/i.test(message)) return 'lab_cost_cap';
  if (/tool limit/i.test(message)) return 'tool_limit_reached';
  if (/time limit/i.test(message)) return 'time_limit_reached';
  if (/provider returned/i.test(message)) return 'provider_malformed_response';
  return 'provider_or_runtime_error';
}

function safeToolError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (!message || message.length > 240 || /(?:Bearer\s|https?:\/\/|\bsk-[A-Za-z0-9_-]{12,})/i.test(message)) return 'Action failed; inspect the visible page or retry with valid fields.';
  return `Action failed: ${message}`;
}

function scrubProviderValue(value: unknown, apiKey?: string): unknown {
  if (typeof value === 'string') {
    let result = apiKey ? value.replaceAll(apiKey, '[REDACTED]') : value;
    result = result.replace(/(?:Bearer\s+[A-Za-z0-9._~+/=-]{24,}|mrv1\.[A-Za-z0-9._~+/=-]{20,}|\b(?:sk|pk)-[A-Za-z0-9_-]{20,})/g, '[REDACTED]');
    return result;
  }
  if (Array.isArray(value)) return value.map(item => scrubProviderValue(item, apiKey));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrubProviderValue(child, apiKey)]));
  return value;
}

function readSubmitResult(raw: unknown): { status: 'completed' | 'abstained'; assistance: Assistance; output: Record<string, unknown>; note: string | null } | null {
  const value = object(raw);
  const output = object(value?.output);
  if (!value || !output || (value.status !== 'completed' && value.status !== 'abstained')) return null;
  const assistance = ['none', 'navigation', 'substantive', 'unknown'].includes(String(value.assistance)) ? value.assistance as Assistance : 'unknown';
  return {
    status: value.status,
    assistance,
    output,
    note: typeof value.note === 'string' ? value.note.slice(0, 2000) : null,
  };
}

/** Tool-calling loop with hard per-episode and whole-lab limits; no automatic retries. */
export async function runTaskAgent(options: RunTaskAgentOptions): Promise<AgentAttempt> {
  const { config, prompt, taskTools, stepLimit, timeLimitSeconds, budget, onBudgetChange } = options;
  const started = Date.now();
  const deadline = started + Math.max(1, timeLimitSeconds) * 1000;
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a synthetic evaluation agent, not a human participant. Use only the assigned environment and tools. Never claim real-world action, human review, emission reduction, repair, or physical truth that the supplied evidence does not establish. Keep DEMO fixtures labeled. Follow the role limits in the task. When finished, call submit_result with a JSON object matching the required task fields. Do not include secrets or provider credentials in tool arguments.',
    },
    { role: 'user', content: prompt },
  ];
  const tools = [...taskTools.map(tool => tool.definition), submitResultTool];
  const toolByName = new Map(taskTools.map(tool => [tool.definition.function.name, tool]));
  const failures: string[] = [];
  const toolNames: string[] = [];
  let steps = 0;
  let modelCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  let providerUsageEstimate = false;
  let result: ReturnType<typeof readSubmitResult> = null;

  const failureResult = (status: AgentAttempt['status'] = 'failed'): AgentAttempt => ({
    status,
    assistance: result?.assistance ?? 'unknown',
    output: result?.output ?? null,
    note: result?.note ?? null,
    steps,
    toolNames,
    providerUsageEstimate,
    timing: {
      wallClockSeconds: Math.round((Date.now() - started) / 100) / 10,
      modelCalls,
      inputTokens,
      outputTokens,
      costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
      retries: 0,
      hints: 0,
      failures: [...new Set(failures)],
    },
  });

  while (modelCalls < config.maxCallsPerEpisode && Date.now() < deadline) {
    const serializedMessages = JSON.stringify(messages);
    const estimatedInput = estimateTokens(serializedMessages);
    if (estimatedInput > config.maxInputTokensPerCall) {
      failures.push('input_token_limit');
      return failureResult();
    }
    if (budget.totalTokens + estimatedInput + config.maxOutputTokensPerCall > config.tokenCap) {
      failures.push('lab_token_cap');
      return failureResult();
    }
    const worstCaseCost = estimateCost(config, estimatedInput, config.maxOutputTokensPerCall);
    if (budget.costUsd + worstCaseCost > config.costCapUsd) {
      failures.push('lab_cost_cap');
      return failureResult();
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      failures.push('time_limit_reached');
      return failureResult();
    }
    modelCalls += 1;
    budget.providerCalls += 1;
    budget.totalTokens += estimatedInput + config.maxOutputTokensPerCall;
    budget.costUsd += worstCaseCost;
    try {
      await onBudgetChange?.(budget);
    } catch {
      failures.push('usage_ledger_write_failed');
      return failureResult();
    }
    let completion;
    try {
      completion = await requestChatCompletion(
        config,
        messages,
        tools,
        config.maxOutputTokensPerCall,
        AbortSignal.timeout(Math.max(1, Math.min(120_000, remainingMs))),
      );
    } catch (error) {
      failures.push(sanitizedFailure(error));
      return failureResult();
    }

    const responseText = completion.message.content || JSON.stringify(completion.message.tool_calls || '');
    const missingUsage = completion.usage.inputTokens === null || completion.usage.outputTokens === null;
    providerUsageEstimate ||= missingUsage;
    // Remote providers without usage fields remain charged against the full request reservation.
    const usedInput = missingUsage && config.remoteProvider ? estimatedInput : completion.usage.inputTokens ?? estimatedInput;
    const usedOutput = missingUsage && config.remoteProvider ? config.maxOutputTokensPerCall : completion.usage.outputTokens ?? estimateTokens(responseText);
    const usedCost = missingUsage && config.remoteProvider ? worstCaseCost : estimateCost(config, usedInput, usedOutput);
    inputTokens += usedInput;
    outputTokens += usedOutput;
    costUsd += usedCost;
    budget.totalTokens += usedInput + usedOutput - estimatedInput - config.maxOutputTokensPerCall;
    budget.costUsd += usedCost - worstCaseCost;
    try {
      await onBudgetChange?.(budget);
    } catch {
      failures.push('usage_ledger_write_failed');
      return failureResult();
    }
    if (budget.totalTokens > config.tokenCap || budget.costUsd > config.costCapUsd) {
      failures.push('lab_budget_exceeded_after_response');
      return failureResult();
    }

    messages.push(completion.message);
    const calls = completion.message.tool_calls || [];
    if (!calls.length) continue;
    for (const call of calls) {
      let args: unknown;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'Tool arguments must be valid JSON.' }) });
        failures.push('malformed_tool_arguments');
        continue;
      }
      if (call.function.name === 'submit_result') {
        result = readSubmitResult(args);
        if (!result) {
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'Submit status, assistance and output object are required.' }) });
          failures.push('malformed_final_output');
          continue;
        }
        return failureResult(result.status);
      }
      if (steps >= stepLimit) {
        failures.push('tool_limit_reached');
        return failureResult();
      }
      const tool = toolByName.get(call.function.name);
      steps += 1;
      toolNames.push(tool ? call.function.name : 'unknown_tool');
      if (!tool) {
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'Unknown tool. Use one of the declared tools.' }) });
        failures.push('unknown_tool');
        continue;
      }
      try {
        const value = await tool.execute(args);
        const content = JSON.stringify(scrubProviderValue(value, config.apiKey));
        messages.push({ role: 'tool', tool_call_id: call.id, content: content.length > 30_000 ? `${content.slice(0, 30_000)}\n[tool result truncated]` : content });
      } catch (error) {
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: safeToolError(error) }) });
        failures.push('tool_action_error');
      }
    }
  }

  failures.push(Date.now() >= deadline ? 'time_limit_reached' : 'provider_call_limit_reached');
  return failureResult();
}
