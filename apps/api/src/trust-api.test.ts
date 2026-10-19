import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createApp } from './app';
import { FileAuditStore, MemoryAuditStore } from './store';
import { issueReviewerToken } from './reviewer-auth';
import { canonicalJson } from './canonical';

const secret = 'trust-api-DEMO-only-' + 'x'.repeat(48);
const input = { sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected', scope: { startDate: '2026-09-01', endDate: '2026-09-30' },
  claimText: 'PRIVATE exact claim for the synthetic test source.', rationale: 'PRIVATE rationale containing confidential reviewer notes.', result: 'supported', sourceInspected: true,
  evidence: [{ id: 'DEMO-reference', sourceId: 'DEMO-001', kind: 'detection', title: 'PRIVATE title', locator: 'PRIVATE page 1', reference: 'https://www.unep.org/private-demo-reference', date: '2026-09-01' }],
};

test('trust controls are opt-in, server derived, privately bound and publicly redacted', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  const dir = await mkdtemp(join(tmpdir(), 'methane-trust-'));
  let retrievals = 0;
  try {
    const path = join(dir, 'audits.json');
    const api = createApp(new FileAuditStore(path), undefined, {
      loadReviewerAssurance: async () => ({ status: 'operator_attested', assessedAt: new Date().toISOString(), organization: 'PRIVATE org', checkedBy: 'PRIVATE authority' }),
      checkEvidenceReference: async reference => { retrievals++; return { reference, checkedAt: new Date().toISOString(), status: 'publisher_retrieved', publisherHost: 'www.unep.org', sha256: 'a'.repeat(64), bytes: 50 }; },
    });
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reviewer', ['review', 'private_read'], 600)}` };
    const post = (value: unknown) => api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(value) });
    const first = (await (await post({ ...input, reviewer: { status: 'operator_attested' } })).json()).audit;
    expect(first.bundle.humanAssessment.trust.referenceChecks[0].status).toBe('not_checked');
    expect(retrievals).toBe(0);
    expect((await api.request(`/api/transparency/${first.auditId}`)).status).toBe(404);
    const saved = await post({ ...input, checkPublicReferences: true, conflictDeclaration: 'none_declared', publicSummaryConsent: true });
    expect(saved.status).toBe(201);
    const { audit } = await saved.json();
    expect(retrievals).toBe(1);
    expect(audit.bundle.humanAssessment.trust.reviewer.status).toBe('operator_attested');
    const restarted = createApp(new FileAuditStore(path));
    const response = await restarted.request(`/api/transparency/${audit.auditId}`);
    expect(response.status).toBe(200);
    const record = await response.json();
    expect(record.summary.privateBundleHash).toBe(audit.bundleHash);
    expect(record.summary.referenceChecks.retrieved).toBe(1);
    expect(record.summary.reviewerStatus).toBe('operator_attested');
    expect(record.summaryHash).toBe(`0x${createHash('sha256').update(canonicalJson(record.summary)).digest('hex')}`);
    expect(JSON.stringify(record)).not.toContain('PRIVATE');
    expect(JSON.stringify(record)).not.toContain('private-demo-reference');
    expect(JSON.stringify(record)).not.toContain('DEMO-reviewer');
    expect((await restarted.request(`/api/audits/${audit.auditId}`)).status).toBe(404);
    expect((await restarted.request(`/api/audits/${audit.auditId}/verify`)).status).toBe(404);
    const list = await (await restarted.request('/api/transparency?sourceId=DEMO-001&limit=1')).json();
    expect(list.summaries).toHaveLength(1);
    expect(list.summaries[0]).toEqual(record);
    expect((await restarted.request('/api/transparency?limit=999')).status).toBe(400);
    expect((await restarted.request('/api/transparency?cursor=invalid')).status).toBe(400);
  } finally {
    if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old;
    await rm(dir, { recursive: true, force: true });
  }
});

test('revoked authority, digest mismatch and forged assurance cannot produce trusted decisions', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reviewer', ['review'], 600)}` };
    const api = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: 'revoked', assessedAt: new Date().toISOString() }) });
    expect((await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(input) })).status).toBe(403);
    const mismatch = createApp(new MemoryAuditStore(), undefined, {
      loadReviewerAssurance: async () => ({ status: 'unverified', assessedAt: new Date().toISOString() }),
      checkEvidenceReference: async reference => ({ reference, checkedAt: new Date().toISOString(), status: 'digest_mismatch' }),
    });
    expect((await mismatch.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, checkPublicReferences: true }) })).status).toBe(422);
    const saved = await mismatch.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, reviewerId: 'boss', trust: { reviewer: { status: 'operator_attested' } }, publicSummaryConsent: true }) });
    expect(saved.status).toBe(201);
    const { audit } = await saved.json();
    expect(audit.bundle.humanAssessment.trust.reviewer.status).toBe('unverified');
    expect(audit.bundle.humanAssessment.trust.conflictDeclaration).toBe('not_declared');
    const record = await (await mismatch.request(`/api/transparency/${audit.auditId}`)).json();
    expect(record.summary.reviewerStatus).toBe('unverified');
    expect((await mismatch.request('/api/reviewers/me?claimType=source_detected', { headers })).status).toBe(200);
    expect((await mismatch.request('/api/reviewers/me?claimType=source_detected')).status).toBe(401);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});

test('directory revocation immediately protects private reads, verification and history', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    let revoked = false;
    const api = createApp(new MemoryAuditStore(), undefined, { loadReviewerAssurance: async () => ({ status: revoked ? 'revoked' : 'unverified', assessedAt: new Date().toISOString() }) });
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reader', ['review', 'private_read'], 600)}` };
    const created = await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(input) });
    const { audit } = await created.json();
    expect((await api.request(`/api/audits/${audit.auditId}`, { headers })).status).toBe(200);
    revoked = true;
    expect((await api.request(`/api/audits/${audit.auditId}`, { headers })).status).toBe(404);
    expect((await api.request(`/api/audits/${audit.auditId}/verify`, { headers })).status).toBe(404);
    expect((await api.request('/api/audits/history?limit=10', { headers })).status).toBe(401);
    const reviewerResponse = await api.request(`/api/audits/${audit.auditId}/review`, { method: 'POST', headers, body: JSON.stringify({ status: 'approved', note: 'DEMO revoked reviewer must be denied', sourceInspected: true, publishCitations: false, publishClaimText: false }) });
    expect(reviewerResponse.status).toBe(403);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});

test('tampered private bundles are excluded from public summaries', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    const store = new MemoryAuditStore(); const api = createApp(store);
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reader', ['review'], 600)}` };
    const { audit } = await (await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, publicSummaryConsent: true }) })).json();
    expect((await api.request(`/api/transparency/${audit.auditId}`)).status).toBe(200);
    const stored = await store.get(audit.auditId); stored!.bundle.reason = 'PRIVATE tampered';
    expect((await api.request(`/api/transparency/${audit.auditId}`)).status).toBe(404);
    expect((await (await api.request('/api/transparency?sourceId=DEMO-001')).json()).summaries).toEqual([]);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});

test('strict reviewer policy and category filtering apply to every private read', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; const oldPolicy = process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS;
  process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    const store = new MemoryAuditStore();
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reader', ['review', 'private_read'], 600)}` };
    const initial = createApp(store, undefined, { loadReviewerAssurance: async () => ({ status: 'unverified', assessedAt: new Date().toISOString() }) });
    const { audit } = await (await initial.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(input) })).json();
    process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS = 'true';
    expect((await initial.request(`/api/audits/${audit.auditId}`, { headers })).status).toBe(404);
    expect((await initial.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(input) })).status).toBe(403);
    const restricted = createApp(store, undefined, { loadReviewerAssurance: async (_id, category) => ({ status: category === 'source_detected' ? 'outside_authority' : 'operator_attested', assessedAt: new Date().toISOString() }) });
    expect((await restricted.request(`/api/audits/${audit.auditId}`, { headers })).status).toBe(404);
    const history = await (await restricted.request('/api/audits/history?limit=1', { headers })).json();
    expect(history.audits).toEqual([]); expect(history.hasMore).toBe(false);
  } finally {
    if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old;
    if (oldPolicy === undefined) delete process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS; else process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS = oldPolicy;
  }
});

test('follow-up digests are checked separately and failed physical evidence can be recorded as insufficient', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    const api = createApp(new MemoryAuditStore(), undefined, {
      loadReviewerAssurance: async () => ({ status: 'unverified', assessedAt: new Date().toISOString() }),
      checkEvidenceReference: async (reference, expected) => ({ reference, checkedAt: new Date().toISOString(), status: reference.endsWith('/followup') ? 'digest_mismatch' : 'publisher_retrieved', expectedSha256: expected }),
    });
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reviewer', ['review'], 600)}` };
    const body = { ...input, claimType: 'mitigation_confirmed', checkPublicReferences: true, publicSummaryConsent: true,
      evidence: [{ ...input.evidence[0], kind: 'mitigation_confirmation', action: 'DEMO fictional action only', followUpDate: '2026-09-02', followUpReference: 'https://www.unep.org/DEMO/followup', followUpExpectedSha256: 'b'.repeat(64) }] };
    const post = (value: unknown) => api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(value) });
    expect((await post(body)).status).toBe(422);
    const response = await post({ ...body, result: 'insufficient_evidence' });
    expect(response.status).toBe(201);
    const { audit } = await response.json();
    expect(audit.bundle.humanAssessment.trust.referenceChecks).toHaveLength(2);
    expect(audit.bundle.humanAssessment.trust.referenceChecks[1].expectedSha256).toBe('b'.repeat(64));
    const record = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    expect(record.summary.result).toBe('insufficient_evidence');
    expect(record.summary.referenceChecks.digestMismatched).toBe(1);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});

test('a reviewer revoked during reference retrieval cannot finish saving an assessment', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET; process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    let revoked = false; const store = new MemoryAuditStore();
    const api = createApp(store, undefined, {
      loadReviewerAssurance: async () => ({ status: revoked ? 'revoked' : 'operator_attested', assessedAt: new Date().toISOString() }),
      checkEvidenceReference: async reference => { revoked = true; return { reference, checkedAt: new Date().toISOString(), status: 'unavailable' }; },
    });
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'DEMO-reviewer', ['review'], 600)}` };
    expect((await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, checkPublicReferences: true }) })).status).toBe(403);
    expect(await store.list()).toHaveLength(0);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});
