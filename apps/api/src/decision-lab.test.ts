import { describe, expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { buildDecisionPlan, decisionChallenges, verifyDecisionPlan } from '@methane/shared/decision-lab';
import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical';

describe('decision evidence stress tests', () => {
  test('distinguishes complete, missing, out-of-period, contrary and conflicting DEMO references', async () => {
    expect((await decisionChallenges()).map(item => [item.id, item.plan.result])).toEqual([
      ['complete', 'supported'], ['missing-follow-up', 'insufficient_evidence'],
      ['outside-period', 'insufficient_evidence'], ['contrary', 'contradicted'], ['conflict', 'insufficient_evidence'],
    ]);
    expect((await decisionChallenges()).every(item => item.plan.synthetic && item.plan.sourceId === 'DEMO_DECISION_LAB')).toBe(true);
  });
  test('shows the actual reference dependency without changing the saved evidence', async () => {
    const plan = (await decisionChallenges())[0].plan;
    expect(plan.sensitivity).toEqual([{ removedEvidenceIds: ['DEMO-action'], result: 'insufficient_evidence' }]);
    expect(plan.trace[0].disposition).toBe('supporting');
    expect(plan.summary).toEqual({ total: 1, supporting: 1, contrary: 0, excluded: 0 });
  });
  test('explains invalid pointers and orders follow-up after the action', async () => {
    const item = (await decisionChallenges())[0];
    const plan = await buildDecisionPlan({ ...item.plan.input, evidence: [{ ...item.plan.input.evidence[0], reference: 'http://unsafe.invalid', followUpDate: '2026-06-01' }] });
    expect(plan.trace[0].reasons).toEqual(expect.arrayContaining(['invalid_reference', 'follow_up_before_action']));
    expect(plan.result).toBe('insufficient_evidence');
  });
  test('hashes all decision content deterministically and is independent of input ordering', async () => {
    const plan = (await decisionChallenges())[4].plan;
    const again = await buildDecisionPlan({ ...plan.input, evidence: [...plan.input.evidence].reverse() });
    expect(again).toEqual(plan);
    const { digest, ...payload } = plan;
    expect(digest).toBe(`0x${createHash('sha256').update(canonicalJson(payload)).digest('hex')}`);
    expect(await buildDecisionPlan({ ...plan.input, scope: { startDate: '2026-07-01', endDate: '2026-07-31' } })).not.toEqual(plan);
  });
});

test('dependency display is bounded while aggregate removal covers the full eligible set', async () => {
  const base = (await decisionChallenges())[0].plan.input;
  const evidence = Array.from({ length: 12 }, (_, index) => ({ ...base.evidence[0], id: 'DEMO-' + index }));
  const plan = await buildDecisionPlan({ ...base, evidence });
  expect(plan.sensitivity.length).toBe(9);
  expect(plan.sensitivityOmitted).toBe(4);
  expect(plan.sensitivity.slice(0, 8).every(item => item.result === 'supported')).toBe(true);
  expect(plan.sensitivity[8].removedEvidenceIds.length).toBe(12);
  expect(plan.sensitivity[8].result).toBe('insufficient_evidence');
  const changed = structuredClone(plan);
  changed.summary.supporting = 99;
  expect(await verifyDecisionPlan(changed)).toBe(false);
});

test('same-day metadata remains explicitly limited and cannot be relabeled as a physical outcome', async () => {
  const input = (await decisionChallenges())[0].plan.input;
  const plan = await buildDecisionPlan({ ...input, evidence: [{ ...input.evidence[0], followUpDate: input.evidence[0].date }] });
  expect(plan.result).toBe('supported');
  expect(plan.limitations.some(item => item.includes('do not establish the order'))).toBe(true);
  expect(plan).not.toHaveProperty('physicalMitigationEstablished');
});

const post = (app: ReturnType<typeof createApp>, body: unknown) => app.request('/api/investigations/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('decision API binds real KAZ observations, refuses stale snapshots and never saves an audit', async () => {
  const app = createApp(new MemoryAuditStore());
  const input = { sourceId: 'KAZ_S_159', claimType: 'source_detected', datasetSnapshotId: 'unep-mars-675417694883', scope: { startDate: '2024-06-07', endDate: '2024-06-07' } };
  const response = await post(app, input);
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const result = await response.json();
  expect(result.synthetic).toBe(false);
  expect(result.input.provenance.provider).toContain('UNEP');
  expect(result.input.provenance.license).toContain('CC BY-NC-SA');
  expect(result.input.provenance.archiveSha256).toBe(result.input.archiveSha256);
  expect(result.input.sourceLimitations.length).toBeGreaterThan(0);
  expect(result.result).toBe('supported');
  expect(result.summary).toEqual({ total: 3, supporting: 1, contrary: 0, excluded: 2 });
  expect(result.trace.filter((item: { disposition: string }) => item.disposition === 'excluded').every((item: { reasons: string[] }) => item.reasons.includes('outside_period'))).toBe(true);
  expect((await post(app, { ...input, datasetSnapshotId: 'stale' })).status).toBe(409);
  expect((await (await app.request('/api/audits')).json()).audits).toEqual([]);
  await expect(buildDecisionPlan({ ...result.input, provenance: { ...result.input.provenance, archiveSha256: 'b'.repeat(64) } })).rejects.toThrow();
});
test('decision API rejects client-supplied evidence, oversized bodies, unknown sources and private preview scopes', async () => {
  const app = createApp(new MemoryAuditStore());
  expect((await post(app, { sourceId: 'KAZ_S_159', claimType: 'source_detected', evidence: [] })).status).toBe(400);
  expect((await post(app, { sourceId: 'UNKNOWN', claimType: 'source_detected' })).status).toBe(404);
  expect((await post(app, { oversized: 'x'.repeat(17000) })).status).toBe(413);
  const preview = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true });
  expect((await post(preview, { sourceId: 'KAZ_S_159', claimType: 'operator_notified', scope: { startDate: '2026-01-01', endDate: '2026-07-31', recipient: 'Private recipient' } })).status).toBe(403);
});

test('decision rate limit bounds repeated work independently of audit creation', async () => {
  const app = createApp(new MemoryAuditStore());
  const body = { sourceId: 'DEMO-001', claimType: 'source_detected' };
  for (let i = 0; i < 20; i++) expect((await post(app, body)).status).toBe(200);
  expect((await post(app, body)).status).toBe(429);
  const audit = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  expect(audit.status).toBe(201);
});
