import { describe, expect, test } from 'bun:test';
import { normalizeProtocolId, rebindProtocolId, summarizeContinuationAttempts } from './continuation';

describe('continuation migration evidence rules', () => {
  test('the only allowed packet change is the top-level protocol ID', () => {
    const original = { protocolId: 'r10', sourceIds: ['A'], scope: { startDate: '2026-01-01' } };
    const rebound = rebindProtocolId(original, 'r10', 'r11', true);
    expect(normalizeProtocolId(rebound, 'r10')).toEqual(original);
  });

  test('records the cap-stopped attempt in usage but excludes it from reusable scoring', () => {
    const attempts = [
      { episodeId: 'P1-T1-C1', status: 'completed', timing: { inputTokens: 10, outputTokens: 2, modelCalls: 1, failures: [] } },
      { episodeId: 'P7-T1-C1', status: 'failed', timing: { inputTokens: 30, outputTokens: 4, modelCalls: 1, failures: ['lab_token_cap'] } },
    ];
    const result = summarizeContinuationAttempts(attempts);
    expect(result.reusable.map(attempt => attempt.episodeId)).toEqual(['P1-T1-C1']);
    expect(result.capStopped.map(attempt => attempt.episodeId)).toEqual(['P7-T1-C1']);
    expect(result.usage).toEqual({ totalTokens: 46, providerCalls: 2 });
  });

  test('refuses any failed attempt that did not stop at the global cap', () => {
    const attempts = [
      { episodeId: 'P1-T1-C1', status: 'failed', timing: { inputTokens: 10, outputTokens: 2, modelCalls: 1, failures: ['time_limit_reached'] } },
    ];
    expect(() => summarizeContinuationAttempts(attempts)).toThrow('unsupported status or failure');
  });
});
