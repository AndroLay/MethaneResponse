import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { issueReviewerToken } from './reviewer-auth';
import { FileAuditStore, MemoryAuditStore } from './store';
import { auditIntegrityValid } from './integrity';
import { HumanAssessmentInput } from '@methane/shared';

const secret = 'human-assessment-test-only-' + 'x'.repeat(48);
const input = {
  sourceId: 'KAZ_S_159', claimType: 'operator_notified', datasetSnapshotId: 'unep-mars-675417694883',
  scope: { startDate: '2024-06-07', endDate: '2024-12-31', observationId: '82758651-76f4-4e06-b4ab-c247ce765192', recipient: 'Facility operator' },
  claimText: 'The facility operator received the notice for this June observation.',
  result: 'supported', rationale: 'I inspected the dated receipt and matched its recipient and observation identifier.', sourceInspected: true,
  evidence: [{ id: 'notice-receipt', sourceId: 'KAZ_S_159', kind: 'notification', title: 'Inspection fixture receipt', reference: 'https://example.org/receipt', locator: 'Page 2, receipt table', date: '2024-06-10', recipient: 'Facility operator', observationId: '82758651-76f4-4e06-b4ab-c247ce765192' }],
};

test('malformed primary and follow-up references are validation errors, never exceptions or HTTP 500', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET;
  process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    for (const field of ['reference', 'followUpReference'] as const) {
      for (const value of ['     ', 'not a url', 'https://', 'http://example.org/report', 'https://user:password@example.org/report']) {
        const body = { ...input, evidence: [{ ...input.evidence[0], [field]: value }] };
        expect(() => HumanAssessmentInput.safeParse(body)).not.toThrow();
        expect(HumanAssessmentInput.safeParse(body).success).toBe(false);
        const api = createApp(new MemoryAuditStore());
        const response = await api.request('/api/human-assessments', { method: 'POST', headers: {
          'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'url-regression', ['review'], 600)}`,
        }, body: JSON.stringify(body) });
        expect(response.status).toBe(400);
      }
    }
    expect(HumanAssessmentInput.safeParse({ ...input, evidence: [{ ...input.evidence[0], followUpReference: 'https://example.org/follow-up' }] }).success).toBe(true);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});

test('human assessment works with AI disabled, stays private, and survives a file-store restart', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET;
  process.env.REVIEWER_AUTH_SECRET = secret;
  const dir = await mkdtemp(join(tmpdir(), 'methane-human-'));
  try {
    let modelCalls = 0;
    const api = createApp(new FileAuditStore(join(dir, 'audits.json')), undefined, { aiConfigured: () => false, requestModelAssessment: async () => { modelCalls++; throw new Error('Must not call model'); } });
    const reviewer = issueReviewerToken(secret, 'analyst-alice', ['review', 'private_read'], 600);
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${reviewer}` };
    const response = await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify(input) });
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const { audit } = await response.json();
    expect(audit.bundle.schemaVersion).toBe(4);
    expect(audit.bundle.assessmentSemantics.basis).toBe('human_assessment');
    expect(audit.bundle.assessmentSemantics.physicalVerification).toBe('not_established_by_application');
    expect(audit.bundle.humanAssessment.reviewerId).toBe('analyst-alice');
    expect(audit.bundle.humanAssessment.baseline.result).toBe('supported');
    expect(audit.bundle.intelligence).toBeUndefined();
    expect(auditIntegrityValid(audit)).toBe(true);
    expect(modelCalls).toBe(0);
    const restarted = createApp(new FileAuditStore(join(dir, 'audits.json')));
    expect((await restarted.request(`/api/audits/${audit.auditId}`)).status).toBe(404);
    expect((await (await restarted.request('/api/audits?sourceId=KAZ_S_159')).json()).audits).toHaveLength(0);
    expect((await restarted.request(`/api/audits/${audit.auditId}`, { headers })).status).toBe(200);
    const childResponse = await restarted.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, parentAuditId: audit.auditId, result: 'insufficient_evidence', rationale: 'The receipt is readable, but I require a second independently attributable delivery record.', nextEvidenceRequest: 'Request an independently attributable receipt.' }) });
    expect(childResponse.status).toBe(201);
    const child = (await childResponse.json()).audit;
    expect(child.result).toBe('insufficient_evidence');
    expect(child.bundle.humanAssessment.baseline.result).toBe('supported');
    expect(child.bundle.humanAssessment.parentBundleHash).toBe(audit.bundleHash);
    expect(child.revision).toBe(2);
    const stale = await restarted.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, parentAuditId: audit.auditId }) });
    expect(stale.status).toBe(409);
    expect((await (await restarted.request(`/api/audits/${audit.auditId}`, { headers })).json()).result).toBe('supported');
    expect((await restarted.request(`/api/audits/${child.auditId}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${issueReviewerToken(secret, 'anchor-only', ['anchor'], 600)}` } })).status).toBe(409);
  } finally {
    if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old;
    await rm(dir, { recursive: true, force: true });
  }
});

test('human assessment enforces reviewer scope, evidence bounds and strong-result requirements', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET;
  process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    const api = createApp(new MemoryAuditStore());
    const post = (body: unknown, token = issueReviewerToken(secret, 'analyst', ['review'], 600)) => api.request('/api/human-assessments', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    expect((await post(input, issueReviewerToken(secret, 'reader', ['private_read'], 600))).status).toBe(401);
    expect((await post({ ...input, sourceInspected: false })).status).toBe(400);
    expect((await post({ ...input, evidence: [] })).status).toBe(422);
    expect((await post({ ...input, result: 'contradicted' })).status).toBe(422);
    expect((await post({ ...input, evidence: [{ ...input.evidence[0], sourceId: 'LBY_S_143' }] })).status).toBe(400);
    expect((await post({ ...input, evidence: [{ ...input.evidence[0], recipient: 'Someone else' }] })).status).toBe(422);
    expect((await post({ ...input, evidence: [{ ...input.evidence[0], date: '2025-01-01' }] })).status).toBe(422);
    expect((await post({ ...input, scope: { ...input.scope, observationId: undefined }, evidence: [{ ...input.evidence[0], observationId: 'foreign-observation' }] })).status).toBe(422);
    expect((await post({ ...input, result: 'contradicted', evidence: [{ ...input.evidence[0], kind: 'contradiction', recipient: 'Other operator' }] })).status).toBe(422);
    expect((await post({ ...input, result: 'insufficient_evidence', evidence: [] })).status).toBe(201);
  } finally {
    if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old;
  }
});

test('private human assessments cannot bypass the anchor restriction through reconciliation', async () => {
  const old = process.env.REVIEWER_AUTH_SECRET;
  process.env.REVIEWER_AUTH_SECRET = secret;
  try {
    class AnchorCapableFixture extends MemoryAuditStore {
      async reserveAnchor() { return true; }
      async completeAnchor() { throw new Error('Must not finalize a private human assessment'); }
    }
    let verifyCalls = 0;
    const api = createApp(new AnchorCapableFixture(), undefined, { chainConfigured: () => true, verifyAnchorTransaction: async () => { verifyCalls++; throw new Error('Private human assessment must not reach receipt verification'); } });
    const creation = await api.request('/api/human-assessments', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'analyst', ['review'], 600)}` }, body: JSON.stringify(input) });
    const audit = (await creation.json()).audit;
    const response = await api.request(`/api/audits/${audit.auditId}/reconcile`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'anchor', ['anchor'], 600)}` }, body: JSON.stringify({ chainId: 11155111, registryAddress: `0x${'1'.repeat(40)}`, txHash: `0x${'2'.repeat(64)}`, issuer: `0x${'3'.repeat(40)}`, version: 1, blockNumber: '1' }) });
    expect(response.status).toBe(409);
    expect(verifyCalls).toBe(0);
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
});
