import { describe, expect, test } from 'bun:test';
import { normalizeProtocolId, rebindProtocolId, summarizeContinuationAttempts } from './continuation';

describe('r10 to r11 continuation controls', () => {
  test('changes only the packet protocol identifier', () => {
    const parent = { protocolId: 'lab-r10', dataset: { snapshot: 'pinned' }, sources: ['A', 'B'] };
    const child = rebindProtocolId(parent, 'lab-r10', 'lab-r11', true);
    expect(normalizeProtocolId(child, 'lab-r10')).toEqual(parent);
    expect(child).toEqual({ ...parent, protocolId: 'lab-r11' });
  });

  test('rejects packets from an unexpected parent revision', () => {
    expect(() => rebindProtocolId({ protocolId: 'lab-r9' }, 'lab-r10', 'lab-r11', true)).toThrow('does not match its parent');
    expect(() => rebindProtocolId({ label: 'packet' }, 'lab-r10', 'lab-r11', true)).toThrow('has no protocolId');
  });

  test('reuses completed and abstained records but replays only the cap-stopped attempt', () => {
    const make = (episodeId: string, status: string, failures: string[] = []) => ({
      episodeId, status, timing: { inputTokens: 100, outputTokens: 20, modelCalls: 1, failures },
    });
    const summary = summarizeContinuationAttempts([
      make('P1-T1-C0', 'completed'),
      make('P1-T1-C1', 'abstained'),
      make('P7-T1-C1', 'failed', ['lab_token_cap']),
    ]);
    expect(summary.reusable.map(row => row.episodeId)).toEqual(['P1-T1-C0', 'P1-T1-C1']);
    expect(summary.capStopped.map(row => row.episodeId)).toEqual(['P7-T1-C1']);
    expect(summary.usage).toEqual({ totalTokens: 360, providerCalls: 3 });
  });

  test('rejects non-cap failures and duplicate attempt records', () => {
    const make = (episodeId: string, status: string, failures: string[] = []) => ({
      episodeId, status, timing: { inputTokens: 100, outputTokens: 20, modelCalls: 1, failures },
    });
    expect(() => summarizeContinuationAttempts([make('P1', 'failed', ['time_limit_reached'])])).toThrow('unsupported status or failure');
    expect(() => summarizeContinuationAttempts([make('P1', 'completed'), make('P1', 'completed')])).toThrow('duplicate episodeId');
  });
});
