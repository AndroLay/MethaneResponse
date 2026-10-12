import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AuditResult } from '@methane/shared';
import { app, createApp } from './app';
import { FileAuditStore, MemoryAuditStore } from './store';
import { getIntelligenceSnapshot } from './intelligence-data';
import { auditIntegrityValid } from './integrity';
import { canonicalJson } from './canonical';

const excerpt = 'The independent inspection confirmed that a repair was completed. A later methane observation is still required to verify sustained mitigation.';

test('AI assessment supports separate human decisions and immutable, verifiable report revisions', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const previousAdminToken = process.env.ADMIN_API_TOKEN;
  const previousHumanToken = process.env.HUMAN_REVIEW_TOKEN;
  const previousReviewerId = process.env.HUMAN_REVIEWER_ID;
  const aiToken = 'ai-review-token-' + 'a'.repeat(40);
  const adminToken = 'admin-review-token-' + 'b'.repeat(40);
  const humanToken = 'human-review-token-' + 'c'.repeat(40);
  process.env.AI_REVIEW_TOKEN = aiToken;
  process.env.ADMIN_API_TOKEN = adminToken;
  process.env.HUMAN_REVIEW_TOKEN = humanToken;
  process.env.HUMAN_REVIEWER_ID = 'independent-reviewer';
  try {
    const store = new MemoryAuditStore();
    const routed = createApp(store, undefined, {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'supported',
        reason: 'The submitted excerpt describes an inspection and stated repair, but does not establish sustained emissions reduction.',
        citations: [{ documentId: 'authorized-note', quote: 'The independent inspection confirmed that a repair was completed.' }],
      }),
      getIntelligenceSnapshot: async () => { throw new Error('snapshot unavailable in test'); },
    });
    const request = {
      sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
      documents: [{ id: 'authorized-note', title: 'Authorized inspection note', text: excerpt }],
    };
    const unauthorized = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
    });
    expect(unauthorized.status).toBe(401);

    const created = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` }, body: JSON.stringify(request),
    });
    expect(created.status).toBe(201);
    const draft = (await created.json()).audit;
    expect(draft.bundle.schemaVersion).toBe(3);
    expect(draft.bundle.intelligence.reviewStatus).toBe('unreviewed');
    expect(draft.bundle.intelligence.observationIds).toHaveLength(3);
    expect(draft.bundle.provenance.archiveSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(draft)).not.toContain(excerpt);

    const earlyAnchor = await routed.request(`/api/audits/${draft.auditId}/anchor`, {
      method: 'POST', headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(earlyAnchor.status).toBe(409);

    const reviewed = await routed.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'rejected', note: 'The excerpt does not verify sustained methane mitigation.' }),
    });
    expect(reviewed.status).toBe(201);
    const revision = (await reviewed.json()).audit;
    expect(revision.revision).toBe(draft.revision + 1);
    expect(revision.bundle.intelligence.reviewStatus).toBe('rejected');
    expect(revision.bundle.intelligence.review.reviewerId).toBe('independent-reviewer');
    expect(revision.bundle.intelligence.review.parentBundleHash).toBe(draft.bundleHash);
    expect((await store.get(draft.auditId))?.bundle.intelligence?.reviewStatus).toBe('unreviewed');
    expect((await store.list('KAZ_S_159', 'mitigation_confirmed')).map((item) => item.revision).sort()).toEqual([1, 2]);

    const followUpDraftResponse = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` }, body: JSON.stringify(request),
    });
    expect(followUpDraftResponse.status).toBe(201);
    const followUpDraft = (await followUpDraftResponse.json()).audit;
    expect(followUpDraft.revision).toBe(3);
    const requestedEvidence = await routed.request(`/api/audits/${followUpDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'needs_more_evidence', note: 'Request an independently verifiable post-repair observation.' }),
    });
    expect(requestedEvidence.status).toBe(201);
    const requestedRevision = (await requestedEvidence.json()).audit;
    expect(requestedRevision.revision).toBe(4);
    expect(requestedRevision.result).toBe('insufficient_evidence');
    expect(requestedRevision.bundle.intelligence.reviewStatus).toBe('needs_more_evidence');
    expect((await store.get(followUpDraft.auditId))?.bundle.intelligence?.reviewStatus).toBe('unreviewed');

    const integrity = await routed.request(`/api/audits/${requestedRevision.auditId}/verify`);
    expect(integrity.status).toBe(200);
    const integrityResult = await integrity.json();
    expect(integrityResult.localDigestValid).toBe(true);
    expect(integrityResult.integrityVerified).toBe(false);
    expect(['not_configured', 'not_anchored']).toContain(integrityResult.status);

    const approvalDraftResponse = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` }, body: JSON.stringify(request),
    });
    expect(approvalDraftResponse.status).toBe(201);
    const approvalDraft = (await approvalDraftResponse.json()).audit;
    expect(approvalDraft.revision).toBe(5);
    const unsafeApproval = await routed.request(`/api/audits/${approvalDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'approved', note: 'The cited excerpt supports this narrowly scoped report assessment.' }),
    });
    expect(unsafeApproval.status).toBe(400);
    const approval = await routed.request(`/api/audits/${approvalDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'approved', note: 'The cited excerpt supports this narrowly scoped report assessment.', sourceInspected: true }),
    });
    expect(approval.status).toBe(201);
    const approvedRevision = (await approval.json()).audit;
    expect(approvedRevision.revision).toBe(6);
    expect(approvedRevision.result).toBe('supported');
    expect(approvedRevision.bundle.intelligence.reviewStatus).toBe('approved');
    expect(approvedRevision.bundle.limitations.join(' ')).toContain('physical mitigation');
    expect((await store.list('KAZ_S_159', 'mitigation_confirmed')).map((item) => item.revision).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
    if (previousAdminToken === undefined) delete process.env.ADMIN_API_TOKEN;
    else process.env.ADMIN_API_TOKEN = previousAdminToken;
    if (previousHumanToken === undefined) delete process.env.HUMAN_REVIEW_TOKEN;
    else process.env.HUMAN_REVIEW_TOKEN = previousHumanToken;
    if (previousReviewerId === undefined) delete process.env.HUMAN_REVIEWER_ID;
    else process.env.HUMAN_REVIEWER_ID = previousReviewerId;
  }
});

test('AI capability status never exposes server credentials', async () => {
  const response = await app.request('/api/intelligence/status');
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload).not.toHaveProperty('apiKey');
  expect(payload).not.toHaveProperty('reviewToken');
});

test('AI assessment accepts a non-curated source only from the pinned MARS snapshot and binds its history', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const aiToken = 'ai-review-token-' + 'd'.repeat(40);
  process.env.AI_REVIEW_TOKEN = aiToken;
  try {
    const unavailableCasebook = {
      load: async () => { throw new Error('casebook fixture unavailable'); },
      list: async () => { throw new Error('casebook fixture unavailable'); },
      find: async () => { throw new Error('casebook fixture unavailable'); },
    };
    const routed = createApp(new MemoryAuditStore(), unavailableCasebook, {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'supported',
        reason: 'The exact submitted passage describes a reported action; it does not establish physical methane mitigation.',
        citations: [{ documentId: 'authorized-note', quote: 'The independent inspection confirmed that a repair was completed.' }],
      }),
    });
    const body = {
      sourceId: 'AFG_S_001',
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{ id: 'authorized-note', title: 'Authorized inspection note', text: excerpt }],
    };
    const response = await routed.request('/api/intelligence/assessments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(201);
    const audit = (await response.json()).audit;
    expect(audit.sourceId).toBe('AFG_S_001');
    expect(audit.caseId).toBe('mars:unep-mars-e0721015e925:AFG_S_001');
    expect(audit.bundle.synthetic).toBe(false);
    expect(audit.bundle.provenance.archiveSha256).toBe('e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481');
    expect(audit.bundle.provenance.snapshotId).toBe('unep-mars-e0721015e925');
    expect(audit.bundle.intelligence.investigationSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.bundle.intelligence.observationIds.length).toBeGreaterThan(0);
    const pinned = await getIntelligenceSnapshot();
    const sourceHistory = pinned.sources.find((item) => item.sourceId === body.sourceId)!;
    expect(audit.bundle.intelligence.datasetSnapshotId).toBe(pinned.datasetSnapshotId);
    expect(audit.bundle.intelligence.datasetInputSha256).toBe(pinned.inputFileSha256);
    expect(audit.bundle.intelligence.observationTimeline).toEqual(sourceHistory.observationIds.map((id, index) => ({ id, observedAt: sourceHistory.observationTimestamps[index] })));
    expect(auditIntegrityValid(audit)).toBe(true);
    expect(audit.bundle.citedEvidence.map((item: { kind: string }) => item.kind)).toEqual(['document_excerpt']);
    expect(JSON.stringify(audit)).not.toContain(excerpt);

    const unknown = await routed.request('/api/intelligence/assessments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
      body: JSON.stringify({ ...body, sourceId: 'UNLISTED_S_999' }),
    });
    expect(unknown.status).toBe(404);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
  }
});

test('AI assessment uses the active full snapshot for a curated source when its history matches', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const aiToken = 'ai-review-token-' + 'f'.repeat(40);
  process.env.AI_REVIEW_TOKEN = aiToken;
  try {
    const routed = createApp(new MemoryAuditStore(), undefined, {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'insufficient_evidence', reason: 'The passage does not establish the physical outcome.',
        citations: [{ documentId: 'authorized-note', quote: 'The independent inspection confirmed that a repair was completed.' }],
      }),
    });
    const response = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
      body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true, documents: [{ id: 'authorized-note', title: 'Authorized note', text: excerpt }] }),
    });
    expect(response.status).toBe(201);
    const audit = (await response.json()).audit;
    const pinned = await getIntelligenceSnapshot();
    const row = pinned.sources.find((item) => item.sourceId === 'KAZ_S_159')!;
    expect(audit.caseId).toBe(`mars:${pinned.datasetSnapshotId}:KAZ_S_159`);
    expect(audit.bundle.provenance.archiveSha256).toBe(pinned.upstreamArchiveSha256);
    expect(audit.bundle.intelligence.observationTimeline).toEqual(row.observationIds.map((id, index) => ({ id, observedAt: row.observationTimestamps[index] })));
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
  }
});

test('AI document assessments enforce a process-local rate limit before calling the provider', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const aiToken = 'ai-review-token-' + 'e'.repeat(40);
  process.env.AI_REVIEW_TOKEN = aiToken;
  let now = 1_000;
  let providerCalls = 0;
  try {
    const routed = createApp(new MemoryAuditStore(), undefined, {
      aiConfigured: () => true,
      requestModelAssessment: async () => {
        providerCalls += 1;
        return { verdict: 'insufficient_evidence', reason: 'The passage does not confirm the requested outcome.', citations: [{ documentId: 'authorized-note', quote: 'The independent inspection confirmed that a repair was completed.' }] };
      },
    }, { aiAssessmentRateLimit: { limit: 1, windowMs: 60_000, now: () => now } });
    const request = () => routed.request('/api/intelligence/assessments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
      body: JSON.stringify({ sourceId: 'AFG_S_001', claimType: 'mitigation_confirmed', consentToExternalProcessing: true, documents: [{ id: 'authorized-note', title: 'Authorized note', text: excerpt }] }),
    });

    expect((await request()).status).toBe(201);
    const limited = await request();
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBe('60');
    expect(providerCalls).toBe(1);
    now += 60_001;
    expect((await request()).status).toBe(201);
    expect(providerCalls).toBe(2);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
  }
});

test('insight endpoint serves analysis for curated and other pinned MARS sources, but rejects unknown IDs', async () => {
  const response = await app.request('/api/intelligence/insights?sourceId=KAZ_S_159');
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.snapshot.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(payload.snapshot.inputFileSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(payload.snapshot.datasetSnapshotId).toBe('unep-mars-e0721015e925');
  expect(payload.snapshot.linkedObservationCount).toBe(23785);
  expect(payload.snapshot.datasetLicense).toBe('CC BY-NC-SA 4.0');
  expect(payload.snapshot.catalogUrl).toBe('https://methanedata.unep.org/download-dataset');
  expect(payload.insight.sourceId).toBe('KAZ_S_159');
  expect(payload.insight.priorityType).toBe('heuristic_not_probability');

  const nonCurated = await app.request('/api/intelligence/insights?sourceId=AFG_S_001');
  expect(nonCurated.status).toBe(200);
  expect((await nonCurated.json()).insight.sourceId).toBe('AFG_S_001');

  const imported = await app.request('/api/intelligence/insights?sourceId=UNLISTED_S_999');
  expect(imported.status).toBe(404);
});

test('full-snapshot document report survives human review, store reopen, and digest verification', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const previousHumanToken = process.env.HUMAN_REVIEW_TOKEN;
  const previousReviewerId = process.env.HUMAN_REVIEWER_ID;
  const aiToken = 'full-snapshot-ai-token-' + 'a'.repeat(40);
  const humanToken = 'full-snapshot-human-token-' + 'b'.repeat(40);
  const directory = await mkdtemp(join(tmpdir(), 'methaneresponse-full-snapshot-'));
  const storePath = join(directory, 'audits.json');
  process.env.AI_REVIEW_TOKEN = aiToken;
  process.env.HUMAN_REVIEW_TOKEN = humanToken;
  process.env.HUMAN_REVIEWER_ID = 'snapshot-reviewer-01';
  try {
    const store = new FileAuditStore(storePath);
    const routed = createApp(store, undefined, {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'insufficient_evidence',
        reason: 'The supplied passage does not verify sustained physical mitigation.',
        citations: [{ documentId: 'field-note', quote: 'A later methane observation is still required to verify sustained mitigation.' }],
      }),
    });
    const body = {
      sourceId: 'AFG_S_001', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
      documents: [{ id: 'field-note', title: 'Authorized field note', text: excerpt }],
    };
    const assessment = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` }, body: JSON.stringify(body),
    });
    expect(assessment.status).toBe(201);
    const draft = (await assessment.json()).audit;
    const snapshot = await getIntelligenceSnapshot();
    const sourceHistory = snapshot.sources.find((item) => item.sourceId === body.sourceId)!;
    expect(draft.result).toBe('insufficient_evidence');
    expect(draft.bundle.intelligence.datasetSnapshotId).toBe('unep-mars-e0721015e925');
    expect(draft.bundle.intelligence.observationTimeline).toEqual(sourceHistory.observationIds.map((id, index) => ({ id, observedAt: sourceHistory.observationTimestamps[index] })));

    const review = await routed.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'needs_more_evidence', note: 'Request a later independent methane observation.' }),
    });
    expect(review.status).toBe(201);
    const reviewed = (await review.json()).audit;
    expect(reviewed.revision).toBe(draft.revision + 1);
    expect(reviewed.result).toBe('insufficient_evidence');
    expect(reviewed.bundle.intelligence.reviewStatus).toBe('needs_more_evidence');
    expect(reviewed.bundle.intelligence.review.parentBundleHash).toBe(draft.bundleHash);
    expect(reviewed.bundle.intelligence.datasetSnapshotId).toBe(draft.bundle.intelligence.datasetSnapshotId);
    expect(reviewed.bundle.intelligence.observationTimeline).toEqual(draft.bundle.intelligence.observationTimeline);
    expect(auditIntegrityValid(reviewed)).toBe(true);

    const reopened = new FileAuditStore(storePath);
    expect((await reopened.get(draft.auditId))?.bundle.intelligence?.reviewStatus).toBe('unreviewed');
    expect((await reopened.get(reviewed.auditId))?.bundleHash).toBe(reviewed.bundleHash);
    const reopenedApp = createApp(reopened);
    const publicHistoryResponse = await reopenedApp.request(`/api/audits?sourceId=${encodeURIComponent(body.sourceId)}`);
    expect(publicHistoryResponse.status).toBe(200);
    expect((await publicHistoryResponse.json()).audits).toEqual([]);
    const deniedAssessorHistory = await reopenedApp.request(`/api/audits/history?sourceId=${encodeURIComponent(body.sourceId)}`, {
      headers: { authorization: `Bearer ${aiToken}` },
    });
    expect(deniedAssessorHistory.status).toBe(401);
    const historyResponse = await reopenedApp.request(`/api/audits/history?sourceId=${encodeURIComponent(body.sourceId)}`, {
      headers: { authorization: `Bearer ${humanToken}` },
    });
    expect(historyResponse.status).toBe(200);
    const history = await historyResponse.json();
    expect(history.audits.map((item: AuditResult) => item.revision)).toEqual([1, 2]);
    expect(history.audits.map((item: AuditResult) => item.auditId)).toEqual([draft.auditId, reviewed.auditId]);
    const verification = await reopenedApp.request(`/api/audits/${reviewed.auditId}/verify`);
    expect(verification.status).toBe(200);
    const result = await verification.json();
    expect(result.localDigestValid).toBe(true);
    expect(result.integrityVerified).toBe(false);
    expect(['not_configured', 'not_anchored']).toContain(result.status);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
    if (previousHumanToken === undefined) delete process.env.HUMAN_REVIEW_TOKEN;
    else process.env.HUMAN_REVIEW_TOKEN = previousHumanToken;
    if (previousReviewerId === undefined) delete process.env.HUMAN_REVIEWER_ID;
    else process.env.HUMAN_REVIEWER_ID = previousReviewerId;
    await rm(directory, { recursive: true, force: true });
  }
});

test('v3 citations remain private until both submitter and reviewer explicitly permit publication', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const previousHumanToken = process.env.HUMAN_REVIEW_TOKEN;
  const previousReviewerId = process.env.HUMAN_REVIEWER_ID;
  const aiToken = 'privacy-ai-token-' + 'c'.repeat(40);
  const humanToken = 'privacy-human-token-' + 'd'.repeat(40);
  process.env.AI_REVIEW_TOKEN = aiToken;
  process.env.HUMAN_REVIEW_TOKEN = humanToken;
  process.env.HUMAN_REVIEWER_ID = 'privacy-reviewer-01';
  const quote = 'The inspection documented a valve repair and requested another methane observation.';
  const store = new MemoryAuditStore();
  const routed = createApp(store, undefined, {
    aiConfigured: () => true,
    requestModelAssessment: async () => ({
      verdict: 'insufficient_evidence',
      reason: 'The excerpt describes an action but does not establish sustained physical mitigation.',
      citations: [{ documentId: 'private-note', quote }],
    }),
  });
  const assessment = (consentToPublishCitations: boolean) => ({
    sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
    consentToPublishCitations,
    documents: [{ id: 'private-note', title: 'Authorized local test excerpt', text: `The report says: ${quote} The operator has not supplied later measurements or an independent outcome confirmation.` }],
  });
  const authorized = (token: string) => ({ authorization: `Bearer ${token}` });

  try {
    const privateResponse = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(aiToken) }, body: JSON.stringify(assessment(false)),
    });
    expect(privateResponse.status).toBe(201);
    const privateDraft = (await privateResponse.json()).audit as AuditResult;

    const publicHistory = await routed.request(`/api/audits?sourceId=${privateDraft.sourceId}`);
    expect(publicHistory.status).toBe(200);
    expect((await publicHistory.json()).audits).toEqual([]);
    expect((await routed.request(`/api/audits/${privateDraft.auditId}`)).status).toBe(404);
    expect((await routed.request(`/api/audits/history?sourceId=${privateDraft.sourceId}`)).status).toBe(401);
    const deniedAssessorHistory = await routed.request(`/api/audits/history?sourceId=${privateDraft.sourceId}`, { headers: authorized(aiToken) });
    expect(deniedAssessorHistory.status).toBe(401);
    const deniedAssessorDetail = await routed.request(`/api/audits/${privateDraft.auditId}`, { headers: authorized(aiToken) });
    expect(deniedAssessorDetail.status).toBe(404);

    const legacyId = 'legacy-v3-without-publication-state';
    const legacy = structuredClone(privateDraft) as AuditResult;
    legacy.auditId = legacyId;
    legacy.revision = 2;
    legacy.bundle.auditId = legacyId;
    legacy.bundle.revision = 2;
    legacy.bundle.intelligence!.reviewStatus = 'approved';
    delete legacy.bundle.intelligence!.citationPublication;
    legacy.bundleHash = `0x${createHash('sha256').update(canonicalJson(legacy.bundle)).digest('hex')}` as `0x${string}`;
    await store.create(privateDraft.caseId, privateDraft.sourceId, privateDraft.claimType, () => legacy);
    const afterLegacyPublicHistory = await routed.request(`/api/audits?sourceId=${privateDraft.sourceId}`);
    expect((await afterLegacyPublicHistory.json()).audits).toEqual([]);

    const futureId = 'future-schema-report-fails-closed';
    const future = structuredClone(privateDraft) as AuditResult;
    future.auditId = futureId;
    future.revision = 3;
    future.bundle.auditId = futureId;
    future.bundle.revision = 3;
    (future.bundle as unknown as { schemaVersion: number }).schemaVersion = 4;
    future.bundle.intelligence!.reviewStatus = 'approved';
    future.bundle.intelligence!.citationPublication = { status: 'public', authorConsent: true };
    future.bundleHash = `0x${createHash('sha256').update(canonicalJson(future.bundle)).digest('hex')}` as `0x${string}`;
    await store.create(privateDraft.caseId, privateDraft.sourceId, privateDraft.claimType, () => future);
    const afterFuturePublicHistory = await routed.request(`/api/audits?sourceId=${privateDraft.sourceId}`);
    expect((await afterFuturePublicHistory.json()).audits).toEqual([]);

    const browserOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const preflight = await routed.request('/api/audits/history', {
      method: 'OPTIONS',
      headers: { origin: browserOrigin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe(browserOrigin);
    expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('authorization');

    const privateHistory = await routed.request(`/api/audits/history?sourceId=${privateDraft.sourceId}`, { headers: { ...authorized(humanToken), origin: browserOrigin } });
    expect(privateHistory.status).toBe(200);
    expect(privateHistory.headers.get('cache-control')).toContain('no-store');
    expect(privateHistory.headers.get('vary')?.toLowerCase()).toContain('authorization');
    expect(privateHistory.headers.get('vary')?.toLowerCase()).toContain('origin');
    expect((await privateHistory.json()).audits.map((item: AuditResult) => item.auditId)).toEqual([privateDraft.auditId, legacyId, futureId]);
    expect((await routed.request(`/api/audits/${legacyId}`)).status).toBe(404);
    expect((await routed.request(`/api/audits/${futureId}`)).status).toBe(404);
    const privateDetail = await routed.request(`/api/audits/${privateDraft.auditId}`, { headers: authorized(humanToken) });
    expect(privateDetail.status).toBe(200);
    expect(privateDetail.headers.get('cache-control')).toContain('no-store');
    expect(privateDetail.headers.get('vary')?.toLowerCase()).toContain('authorization');

    const reviewerPrivateDraftResponse = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(aiToken) }, body: JSON.stringify(assessment(true)),
    });
    expect(reviewerPrivateDraftResponse.status).toBe(201);
    const reviewerPrivateDraft = (await reviewerPrivateDraftResponse.json()).audit as AuditResult;
    const privateApproval = await routed.request(`/api/audits/${reviewerPrivateDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(humanToken) },
      body: JSON.stringify({ status: 'approved', note: 'Approved for internal use; do not publish this excerpt.', sourceInspected: true }),
    });
    expect(privateApproval.status).toBe(201);
    const internallyApproved = (await privateApproval.json()).audit as AuditResult;
    expect(internallyApproved.bundle.intelligence?.reviewStatus).toBe('approved');
    expect(internallyApproved.bundle.intelligence?.citationPublication).toMatchObject({ status: 'private', authorConsent: true });
    expect((await (await routed.request(`/api/audits?sourceId=${internallyApproved.sourceId}`)).json()).audits).toEqual([]);

    const deniedPublication = await routed.request(`/api/audits/${privateDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(humanToken) },
      body: JSON.stringify({ status: 'approved', note: 'The report needs more independently attributable evidence.', sourceInspected: true, publishCitations: true }),
    });
    expect(deniedPublication.status).toBe(403);

    const publicDraftResponse = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(aiToken) }, body: JSON.stringify(assessment(true)),
    });
    expect(publicDraftResponse.status).toBe(201);
    const publicDraft = (await publicDraftResponse.json()).audit as AuditResult;
    const publishedResponse = await routed.request(`/api/audits/${publicDraft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorized(humanToken) },
      body: JSON.stringify({ status: 'approved', note: 'The citation is authorized for public review.', sourceInspected: true, publishCitations: true }),
    });
    expect(publishedResponse.status).toBe(201);
    const published = (await publishedResponse.json()).audit as AuditResult;
    expect(published.bundle.intelligence?.citationPublication).toMatchObject({ status: 'public', authorConsent: true });
    expect(published.bundle.intelligence?.review?.note).toBe('The citation is authorized for public review.');

    const releasedHistory = await routed.request(`/api/audits?sourceId=${published.sourceId}`);
    expect((await releasedHistory.json()).audits.map((item: AuditResult) => item.auditId)).toEqual([published.auditId]);
    const publicReport = await routed.request(`/api/audits/${published.auditId}`);
    expect(publicReport.status).toBe(200);
    expect(JSON.stringify(await publicReport.json())).toContain(quote);
    expect((await routed.request(`/api/audits/${privateDraft.auditId}`)).status).toBe(404);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
    if (previousHumanToken === undefined) delete process.env.HUMAN_REVIEW_TOKEN;
    else process.env.HUMAN_REVIEW_TOKEN = previousHumanToken;
    if (previousReviewerId === undefined) delete process.env.HUMAN_REVIEWER_ID;
    else process.env.HUMAN_REVIEWER_ID = previousReviewerId;
  }
});

test('published review revision remains public after reopening the file store while its draft stays private', async () => {
  const previousAiToken = process.env.AI_REVIEW_TOKEN;
  const previousHumanToken = process.env.HUMAN_REVIEW_TOKEN;
  const previousReviewerId = process.env.HUMAN_REVIEWER_ID;
  const aiToken = 'published-file-ai-token-' + 'e'.repeat(40);
  const humanToken = 'published-file-review-token-' + 'f'.repeat(40);
  const directory = await mkdtemp(join(tmpdir(), 'methaneresponse-published-review-'));
  const storePath = join(directory, 'audits.json');
  process.env.AI_REVIEW_TOKEN = aiToken;
  process.env.HUMAN_REVIEW_TOKEN = humanToken;
  process.env.HUMAN_REVIEWER_ID = 'persistent-reviewer-01';
  try {
    const store = new FileAuditStore(storePath);
    const routed = createApp(store, undefined, {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'insufficient_evidence',
        reason: 'The excerpt reports an action but does not establish sustained methane mitigation.',
        citations: [{ documentId: 'authorized-note', quote: 'The independent inspection confirmed that a repair was completed.' }],
      }),
    });
    const assessment = await routed.request('/api/intelligence/assessments', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
      body: JSON.stringify({
        sourceId: 'KAZ_S_159', claimType: 'mitigation_confirmed', consentToExternalProcessing: true, consentToPublishCitations: true,
        documents: [{ id: 'authorized-note', title: 'Authorized inspection note', text: excerpt }],
      }),
    });
    expect(assessment.status).toBe(201);
    const draft = (await assessment.json()).audit as AuditResult;
    const review = await routed.request(`/api/audits/${draft.auditId}/review`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${humanToken}` },
      body: JSON.stringify({ status: 'approved', note: 'Approved for public citation review; outcome remains unverified.', sourceInspected: true, publishCitations: true }),
    });
    expect(review.status).toBe(201);
    const published = (await review.json()).audit as AuditResult;

    const reopened = new FileAuditStore(storePath);
    const reopenedApp = createApp(reopened);
    expect((await reopened.get(draft.auditId))?.bundle.intelligence?.reviewStatus).toBe('unreviewed');
    expect((await reopened.get(published.auditId))?.bundleHash).toBe(published.bundleHash);
    const publicHistory = await reopenedApp.request('/api/audits?sourceId=KAZ_S_159');
    expect(publicHistory.status).toBe(200);
    expect((await publicHistory.json()).audits.map((item: AuditResult) => item.auditId)).toEqual([published.auditId]);
    expect((await reopenedApp.request(`/api/audits/${draft.auditId}`)).status).toBe(404);
    const publicReport = await reopenedApp.request(`/api/audits/${published.auditId}`);
    expect(publicReport.status).toBe(200);
    expect(JSON.stringify(await publicReport.json())).toContain('The independent inspection confirmed that a repair was completed.');
    const deniedAssessorHistory = await reopenedApp.request('/api/audits/history?sourceId=KAZ_S_159', {
      headers: { authorization: `Bearer ${aiToken}` },
    });
    expect(deniedAssessorHistory.status).toBe(401);
    const privateHistory = await reopenedApp.request('/api/audits/history?sourceId=KAZ_S_159', {
      headers: { authorization: `Bearer ${humanToken}` },
    });
    expect((await privateHistory.json()).audits.map((item: AuditResult) => item.auditId)).toEqual([draft.auditId, published.auditId]);
  } finally {
    if (previousAiToken === undefined) delete process.env.AI_REVIEW_TOKEN;
    else process.env.AI_REVIEW_TOKEN = previousAiToken;
    if (previousHumanToken === undefined) delete process.env.HUMAN_REVIEW_TOKEN;
    else process.env.HUMAN_REVIEW_TOKEN = previousHumanToken;
    if (previousReviewerId === undefined) delete process.env.HUMAN_REVIEWER_ID;
    else process.env.HUMAN_REVIEWER_ID = previousReviewerId;
    await rm(directory, { recursive: true, force: true });
  }
});
