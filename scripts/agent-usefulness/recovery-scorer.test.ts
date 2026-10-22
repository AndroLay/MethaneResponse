import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { recoveryScore, semanticVerdict } from './recovery-scorer';
import { auditFrozenR12 } from './recovery-audit';
import type { GoldSet, RunRecord } from './scorer';

const root = 'docs/evidence/agent-practical-usefulness-2026-10-21-r12';
const gold = Object.fromEntries(await Promise.all(['T1-plan','T2-investigate-request','T3-review-revisit-verify'].map(async (name, i) => [`T${i+1}`, JSON.parse(await readFile(`${root}/scenarios/gold/${name}-gold.json`, 'utf8'))]))) as GoldSet;
async function run(id: string): Promise<RunRecord> { return JSON.parse(await readFile(`${root}/runs/sealed/${id}.json`, 'utf8')); }

test('T1 display label and observed objects normalize without modifying the sealed record', async () => {
  const r = await run('P1-T1-C1_APPLICATION_BROWSER'), before = JSON.stringify(r);
  expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(true);
  expect(JSON.stringify(r)).toBe(before);
  r.output!.selectedSourceIds = [...gold.T1.selectedSourceIds.slice(0,9), 'WRONG_SOURCE'];
  expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(false);
});
test('T1 rejects wrong active membership, replacement, duplicates and hypothetical manual state', async () => {
  for (const mutate of [
    (r: RunRecord) => { (r.output!.activationStateAfterCapacityChange as Record<string, unknown>).automaticallyReplaced = true; },
    (r: RunRecord) => { (r.output!.activationStateBeforeCapacityChange as Record<string, unknown>).selectedSourceIds = ['WRONG']; },
    (r: RunRecord) => { (r.output!.activationStateBeforeCapacityChange as Record<string, unknown>).active = false; },
    (r: RunRecord) => { (r.output!.activationStateAfterCapacityChange as Record<string, unknown>).activePlanRemains = false; },
    (r: RunRecord) => { r.output!.selectedSourceIds = [...gold.T1.selectedSourceIds, gold.T1.selectedSourceIds[0]]; },
  ]) {
    const r = await run('P1-T1-C1_APPLICATION_BROWSER'); mutate(r);
    expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(false);
  }
  const manual = await run('P5-T1-C0_MANUAL_PACKET');
  expect(recoveryScore(manual, manual, gold).score.taskCompletion).toBe(false);
});
test('T2 recognizes bounded abstention but never supplies absent hash, requirements, scope or request fields', async () => {
  const r = await run('P8-T2-C0_MANUAL_PACKET');
  const result = recoveryScore(r, r, gold);
  expect(result.score.decisionAccuracy).toBe(true);
  expect(result.score.taskCompletion).toBe(false);
  expect(r.output!.claimTextSha256).toBeUndefined();
  expect(r.output!.requestedEvidenceRequirementIds).toBeUndefined();
  for (const value of ['supported', 'contradicted', 'abstain but mitigation was confirmed']) expect(semanticVerdict(value)).toBe(value);
});
test('T3 cannot pass through missing digest/auth or mismatched reason codes', async () => {
  const r = await run('P7-T3-C1_APPLICATION_BROWSER');
  expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(false);
  r.status = 'completed';
  r.output = { ...gold.T3, revisitReasonCodes: ['WRONG_REASON'] };
  expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(false);
  r.output = { ...gold.T3, decisionDigest: null };
  expect(recoveryScore(r, r, gold).score.taskCompletion).toBe(false);
});
test('all 48 original sealed attempts receive an audit classification and frozen bytes remain unchanged', async () => {
  const report = await auditFrozenR12();
  expect(report.episodes).toHaveLength(48);
  expect(report.frozenFilesUnchanged).toBe(73);
  expect(report.episodes.every(e => e.categories.length > 0)).toBe(true);
  expect(report.alternative.categoriesNonExclusive.AGENT_OR_TOOL_FAILURE).toBe(3);
  expect(report.alternative.categoriesNonExclusive.GENUINE_TASK_FAILURE).toBe(1);
});
