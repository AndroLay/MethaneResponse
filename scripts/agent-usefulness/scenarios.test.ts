import { describe, expect, test } from 'bun:test';
import { buildT1Scenario } from './scenarios';

describe('frozen T1 planner scenario', () => {
  test('names the source A/B records while keeping their gold dispositions out of the packet', async () => {
    const { packet, gold } = await buildT1Scenario();
    const candidateIds = new Set(packet.candidates.map(candidate => candidate.sourceId));

    expect(packet.task.sourceAId).toBe(gold.dispositions.included.sourceId);
    expect(packet.task.sourceBId).toBe(gold.dispositions.excludedQuota.sourceId);
    expect(candidateIds.has(packet.task.sourceAId)).toBe(true);
    expect(candidateIds.has(packet.task.sourceBId)).toBe(true);
    expect(packet.task.sourceAId).not.toBe(packet.task.sourceBId);
    expect(gold.selectedSourceIds).toContain(packet.task.sourceAId);
    expect(gold.selectedSourceIds).not.toContain(packet.task.sourceBId);
    expect(JSON.stringify(packet.task)).not.toMatch(/selected|country_quota_filled/i);
  });
});
