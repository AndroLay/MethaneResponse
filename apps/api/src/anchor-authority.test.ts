import { expect, test } from 'bun:test';
import { createApp } from './app';
import { demoChain, demoStore, demoReviewedAudit } from './anchor-test-fixtures';
import { issueReviewerToken } from './reviewer-auth';
test('revoked, expired and out-of-category reviewers cannot inspect, anchor or reconcile', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = 'DEMO-authority-secret'.padEnd(64, 'x');
  try {
    const store = await demoStore();
    const audit = await demoReviewedAudit(store);
    const headers = { authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET, 'DEMO-reviewer', ['anchor', 'private_read'], 600)}` };
    for (const status of ['revoked', 'outside_authority', 'expired'] as const) {
      const app = createApp(store, undefined, { ...demoChain, loadReviewerAssurance: async () => ({ status, assessedAt: new Date().toISOString() }) });
      expect((await app.request(`/api/audits/${audit.auditId}/anchor-status`, { headers })).status).toBe(403);
      expect((await app.request(`/api/audits/${audit.auditId}/anchor`, { method: 'POST', headers })).status).toBe(403);
      expect((await app.request(`/api/audits/${audit.auditId}/reconcile`, { method: 'POST', headers })).status).toBe(403);
    }
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});
test('revocation during broadcast prevents returning private report contents', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = 'DEMO-authority-secret'.padEnd(64, 'x');
  try {
    const store = await demoStore(), audit = await demoReviewedAudit(store);
    let revoked = false;
    const app = createApp(store, undefined, { ...demoChain, loadReviewerAssurance: async () => ({ status: revoked ? 'revoked' : 'operator_attested', assessedAt: new Date().toISOString() }), broadcastAnchor: async () => { revoked = true; } });
    const response = await app.request(`/api/audits/${audit.auditId}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${issueReviewerToken(process.env.REVIEWER_AUTH_SECRET, 'DEMO-reviewer', ['anchor', 'private_read'], 600)}` } });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.status).toBe('anchored'); expect(payload.bundle).toBeUndefined();
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});
