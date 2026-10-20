/** Server-owned generation limits; clients cannot raise the provider budget. */
export function providerGenerationOptions(env: Record<string, string | undefined> = process.env) {
  const value = env.AI_MAX_OUTPUT_TOKENS ?? '2048';
  const maxTokens = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(maxTokens) || maxTokens < 128 || maxTokens > 4096) {
    throw new Error('ai_invalid_output_token_limit');
  }
  const effort = env.AI_REASONING_EFFORT;
  if (effort !== undefined && !['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) {
    throw new Error('ai_invalid_reasoning_effort');
  }
  return { max_tokens: maxTokens, ...(effort === undefined ? {} : { reasoning_effort: effort }) };
}
