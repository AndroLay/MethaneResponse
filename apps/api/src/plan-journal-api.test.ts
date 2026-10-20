import { expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { issueReviewerToken } from './reviewer-auth';
import { getIntelligenceSnapshot } from './intelligence-data';

test('plan decision API authenticates reviewers, binds displayed report, rejects stale writes and preserves history', async () => {
  const secret = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = 'DEMO-plan-api-secret-'+'x'.repeat(40);
  try {
    const api = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async (id) => ({ status: id === 'plan-reviewer' ? 'operator_attested' : 'outside_authority' } as any) });
    const token = (scopes: ('review' | 'private_read')[] = ['private_read','review']) => issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!, 'plan-reviewer', scopes, 600);
    const headers = (t = token()) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' });
    const snapshot = await getIntelligenceSnapshot();
    const request = { datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters: { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] } };
    const report = await (await api.request('/api/investigations/portfolios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) })).json();
    const body = { request, reportDigest: report.digest, strategy: 'weighted', decision: 'accept', rationale: 'DEMO accept this historical allocation for further document investigation.', expectedRevision: 0, expectedHead: null };
    const put = (b: unknown, h = headers()) => api.request('/api/investigation-plans/plan-test', { method: 'PUT', headers: h, body: JSON.stringify(b) });
    expect((await api.request('/api/investigation-plans/plan-test')).status).toBe(401);
    expect((await put(body, headers(token(['private_read'])))).status).toBe(403);
    expect((await put({ ...body, reviewerId: 'forged' })).status).toBe(400);
    expect((await put({ ...body, reportDigest: '0x'+'f'.repeat(64) })).status).toBe(409);
    const created = await put(body); expect(created.status).toBe(201);
    expect(created.headers.get('cache-control')).toContain('no-store');
    const journal = await created.json(); expect(journal.revisions[0].reviewerId).toBe('plan-reviewer');
    expect((await put(body)).status).toBe(409);
    const second = await put({ ...body, decision: 'defer', expectedRevision: 1, expectedHead: journal.revisions[0].hash });
    expect(second.status).toBe(200); expect((await second.json()).revisions).toHaveLength(2);
    const loaded = await api.request('/api/investigation-plans/plan-test', { headers: headers() }); expect(loaded.status).toBe(200);
    expect((await loaded.json()).revisions[0]).toEqual(journal.revisions[0]);
    const noAuthority = issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!, 'other-reviewer', ['private_read','review'], 600);
    expect((await put(body, headers(noAuthority))).status).toBe(403);
  } finally { if (secret === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = secret; }
});

test('public preview does not expose or accept private plan history', async () => {
  const api = createApp(new MemoryAuditStore(), undefined, {}, { publicBaselinePreview: true });
  expect((await api.request('/api/investigation-plans/example')).status).toBe(403);
  expect((await api.request('/api/investigation-plans/example', { method: 'PUT', body: '{}' })).status).toBe(403);
});
