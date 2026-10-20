import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { MemoryCaseWorkStore } from './case-work';
import { issueReviewerToken } from './reviewer-auth';
import type { CaseWorkDraft, SharedWorkContext } from '@methane/shared';

const oldSecret = process.env.REVIEWER_AUTH_SECRET;
const context: SharedWorkContext = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO-overlap' };
const draft: CaseWorkDraft = { status: 'investigate', question: 'DEMO compare source evidence', notes: 'DEMO PRIVATE NOTE', evidenceRequest: '', nextAction: '', claimType: 'source_detected', scope: { startDate: '2026-07-01', endDate: '2026-07-31' } };
let headers: Record<string,string>;
const query = new URLSearchParams({ sourceId: context.sourceId, synthetic: 'true', datasetSnapshotId: context.datasetSnapshotId }).toString();
const path = `/api/case-work/DEMO-target/evidence-overlap?${query}&expectedRevision=1`;
const services = { loadReviewerAssurance: async () => ({ status: 'operator_attested' } as any) };
beforeAll(() => {
  process.env.REVIEWER_AUTH_SECRET = 'DEMO-overlap-' + 'z'.repeat(40);
  headers = { authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET, 'DEMO-reviewer', ['private_read','review'], 600)}` };
});
afterAll(() => { if (oldSecret === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = oldSecret; });
async function store() {
  const value = new MemoryCaseWorkStore();
  await value.save(context, 'DEMO-target', draft, 0, 'DEMO-reviewer');
  await value.save(context, 'DEMO-related', draft, 0, 'DEMO-reviewer');
  return value;
}
test('private overlap check returns exact related revisions without notes and never changes work', async () => {
  const caseWorkStore = await store(), app = createApp(new MemoryAuditStore(), undefined, services, { caseWorkStore });
  const response = await app.request(path, { headers });
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
  const result = await response.json();
  expect(result.target.revision).toBe(1); expect(result.candidates).toHaveLength(1);
  expect(result.candidates[0].work.workId).toBe('DEMO-related');
  expect(result.candidates[0].reasons).toContain('same_source_overlapping_period');
  expect(result.duplicateMitigationEstablished).toBe(false);
  expect(JSON.stringify(result)).not.toContain(draft.notes);
  expect((await caseWorkStore.history(context, 'DEMO-target'))).toHaveLength(1);
});
test('overlap check requires private access, current directory authority and current saved revision', async () => {
  const caseWorkStore = await store(), app = createApp(new MemoryAuditStore(), undefined, services, { caseWorkStore });
  expect((await app.request(path)).status).toBe(401);
  expect((await app.request(path.replace('expectedRevision=1', 'expectedRevision=2'), { headers })).status).toBe(409);
  expect((await app.request(path.replace('&expectedRevision=1', ''), { headers })).status).toBe(400);
  const revoked = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: 'revoked' } as any) }, { caseWorkStore });
  expect((await revoked.request(path, { headers })).status).toBe(404);
});
test('public preview refuses overlap checks', async () => {
  const app = createApp(new MemoryAuditStore(), undefined, services, { caseWorkStore: await store(), publicBaselinePreview: true });
  expect((await app.request(path, { headers })).status).toBe(403);
});
test('authority revoked while loading related work prevents disclosure', async () => {
  const caseWorkStore = await store(); let revoked = false;
  const list = caseWorkStore.list.bind(caseWorkStore);
  caseWorkStore.list = async (...args) => { const result = await list(...args); revoked = true; return result; };
  const app = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: revoked ? 'revoked' : 'operator_attested' } as any) }, { caseWorkStore });
  const response = await app.request(path, { headers });
  expect(response.status).toBe(403); expect(await response.text()).not.toContain('DEMO-related');
});
