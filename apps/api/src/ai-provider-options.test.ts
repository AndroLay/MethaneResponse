import { expect, test } from 'bun:test';
import { providerGenerationOptions } from './ai-provider-options';

test('provider generation has a bounded default and no implicit reasoning override', () => {
  expect(providerGenerationOptions({})).toEqual({ max_tokens: 2048 });
});

test('DeepSeek profile supports an explicit reasoning setting without changing the model', () => {
  expect(providerGenerationOptions({ AI_MAX_OUTPUT_TOKENS: '4096', AI_REASONING_EFFORT: 'none' }))
    .toEqual({ max_tokens: 4096, reasoning_effort: 'none' });
});

test('invalid provider budgets and reasoning settings fail closed', () => {
  for (const value of ['0', '-1', '127', '1.5', '4097', '2048abc', 'Infinity', '']) {
    expect(() => providerGenerationOptions({ AI_MAX_OUTPUT_TOKENS: value })).toThrow('ai_invalid_output_token_limit');
  }
  expect(() => providerGenerationOptions({ AI_REASONING_EFFORT: 'guess' })).toThrow('ai_invalid_reasoning_effort');
});
