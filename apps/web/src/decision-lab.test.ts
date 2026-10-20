import { expect, test } from 'bun:test';
import { decisionChallenges } from '@methane/shared/decision-lab';
import { acceptDecisionPlan, evidenceRequestMarkdown } from './decision-lab';

test('client verifies the full decision computation and rejects a different source, scope, snapshot or digest', async () => {
  const plan = (await decisionChallenges())[0].plan;
  const context = { sourceId: plan.sourceId, claimType: plan.input.claimType, scope: plan.input.scope, datasetSnapshotId: plan.datasetSnapshotId, synthetic: true };
  expect((await acceptDecisionPlan(plan, context)).digest).toBe(plan.digest);
  for (const change of [{ sourceId: 'OTHER' }, { datasetSnapshotId: 'stale' }, { synthetic: false }, { scope: undefined }, { claimType: 'source_detected' as const }]) {
    await expect(acceptDecisionPlan(plan, { ...context, ...change })).rejects.toThrow();
  }
  await expect(acceptDecisionPlan({ ...plan, result: 'contradicted' }, context)).rejects.toThrow();
});
test('evidence requests retain source, scope, input archive and explicit acceptance conditions', async () => {
  const plan = (await decisionChallenges())[1].plan;
  const text = evidenceRequestMarkdown(plan);
  expect(text).toContain('DEMO');
  expect(text).toContain('2026-06-01');
  expect(text).toContain('follow-up measurement');
  expect(text).toContain(plan.digest);
  expect(text).toContain('not sent');
  expect(text.split('\n').length).toBeGreaterThan(15);
  expect(text).not.toContain('\\n');
});
