import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { type AuditReceipt } from '@methane/shared';
import { createApp } from './app';
import { createAudit } from './audit';
import { findCaseBySourceId } from './casebook';
import { createDocumentAudit, createReviewedAudit, DocumentAssessmentInput } from './ai-review';
import { auditIntegrityValid } from './integrity';
import { PostgresAuditStore } from './postgres-store';
import { issueReviewerToken } from './reviewer-auth';
import { createRateLimitClientKey } from './rate-limit';
import { configuredTestDatabaseUrl } from './test-database-config';

const databaseUrl = configuredTestDatabaseUrl({
  CI: process.env.CI,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
});
const run = describe.skipIf(!databaseUrl);
let store: PostgresAuditStore;

run('PostgreSQL persistence integration', () => {
  beforeAll(async () => { store = await PostgresAuditStore.connect(databaseUrl!); });
  afterAll(async () => { await store?.close(); });

  test('applies migrations, seeds the real casebook, and keeps immutable audit revisions', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    expect(found).not.toBeNull();
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const [seededSource] = await sql`SELECT raw_sha256 FROM sources WHERE source_id = ${found!.source.sourceId}`;
      expect(seededSource?.raw_sha256).toBe(found!.book.provenance.archiveSha256);
    } finally {
      await sql.end({ timeout: 2 });
    }
    const caseId = `${found!.item.caseId}-TEST-${randomUUID()}`;
    const create = (revision: number) => createAudit(found!.source, { sourceId: found!.source.sourceId, claimType: 'source_detected' }, {
      caseId,
      revision,
      provenance: found!.book.provenance,
      externalEvidence: found!.item.externalEvidence,
    });
    const first = await store.create(caseId, found!.source.sourceId, 'source_detected', create);
    const second = await store.create(caseId, found!.source.sourceId, 'source_detected', create);
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect((await store.get(first.auditId))?.bundleHash).toBe(first.bundleHash);
    expect((await store.list(found!.source.sourceId, 'source_detected')).filter((item) => item.caseId === caseId)).toHaveLength(2);

    const receipt: AuditReceipt = {
      chainId: 11155111,
      registryAddress: '0x0000000000000000000000000000000000000001',
      txHash: `0x${'1'.repeat(64)}`,
      issuer: '0x0000000000000000000000000000000000000002',
      version: 1,
      blockNumber: '123',
    };
    await store.replace({ ...first, anchored: true, chainTxHash: receipt.txHash, receipt });
    expect((await store.get(first.auditId))?.receipt).toEqual(receipt);
    await expect(store.replace({ ...first, bundle: { ...first.bundle, reason: 'tampered' } })).rejects.toThrow('Audit bundles are immutable');
  });

  test('shares a bounded rate-limit window across independent PostgreSQL store instances', async () => {
    const peer = await PostgresAuditStore.connect(databaseUrl!);
    const keyHash = createHash('sha256').update(randomUUID()).digest('hex');
    const concurrentKeyHash = createHash('sha256').update(randomUUID()).digest('hex');
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const first = await store.consumeRateLimit('audit_write', keyHash, 1, 60_000);
      const second = await peer.consumeRateLimit('audit_write', keyHash, 1, 60_000);
      const separateScope = await peer.consumeRateLimit('ai_assessment', keyHash, 1, 60_000);
      expect(first).toMatchObject({ allowed: true, remaining: 0 });
      expect(second).toMatchObject({ allowed: false, remaining: 0, reason: 'limit' });
      expect(second.resetAt).toBe(first.resetAt);
      expect(separateScope.allowed).toBe(true);

      const concurrent = await Promise.all(Array.from({ length: 12 }, (_, index) =>
        (index % 2 === 0 ? store : peer).consumeRateLimit('audit_write', concurrentKeyHash, 3, 60_000)));
      expect(concurrent.filter((item) => item.allowed)).toHaveLength(3);
      expect(concurrent.filter((item) => item.reason === 'limit')).toHaveLength(9);
      expect(new Set(concurrent.map((item) => item.resetAt)).size).toBe(1);

      const [row] = await sql`SELECT scope, client_key_hash FROM api_rate_limit_buckets WHERE client_key_hash = ${keyHash} AND scope = 'audit_write'`;
      expect(row).toEqual({ scope: 'audit_write', client_key_hash: keyHash });
    } finally {
      await sql`DELETE FROM api_rate_limit_buckets WHERE client_key_hash IN (${keyHash}, ${concurrentKeyHash})`;
      await sql.end({ timeout: 2 });
      await peer.close();
    }
  });

  test('enforces the shared PostgreSQL write quota through separate production API instances', async () => {
    const names = ['NODE_ENV', 'ENABLE_PUBLIC_BASELINE_AUDITS', 'RATE_LIMIT_HASH_SECRET'] as const;
    const previous = new Map(names.map(name => [name, process.env[name]]));
    const peer = await PostgresAuditStore.connect(databaseUrl!);
    const secret = 'postgres-shared-rate-limit-test-0123456789abcdef';
    const address = `test-client-${randomUUID()}`;
    const keyHash = createRateLimitClientKey(secret, 'audit_write', address);
    const sql = postgres(databaseUrl!, { prepare: false });
    let auditId: string | undefined;
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_PUBLIC_BASELINE_AUDITS = 'true';
    process.env.RATE_LIMIT_HASH_SECRET = secret;
    try {
      const firstApp = createApp(store, undefined, undefined, { auditRateLimit: { limit: 1, windowMs: 60_000 } });
      const secondApp = createApp(peer, undefined, undefined, { auditRateLimit: { limit: 1, windowMs: 60_000 } });
      const write = (target: typeof firstApp, forwardedFor: string) => target.fetch(new Request('http://localhost/api/audits', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
        body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }),
      }), { clientAddress: address });

      const first = await write(firstApp, '198.51.100.10');
      expect(first.status).toBe(201);
      expect(first.headers.get('x-ratelimit-remaining')).toBe('0');
      auditId = (await first.json()).auditId;
      const health = await firstApp.request('/api/health');
      expect(health.status).toBe(200);
      expect((await health.json()).rateLimits).toEqual({ backend: 'postgres', shared: true, required: true, ready: true });

      const second = await write(secondApp, '198.51.100.11');
      expect(second.status).toBe(429);
      expect(second.headers.get('retry-after')).toBe('60');
      const [row] = await sql`SELECT scope, client_key_hash FROM api_rate_limit_buckets WHERE scope = 'audit_write' AND client_key_hash = ${keyHash}`;
      expect(row).toEqual({ scope: 'audit_write', client_key_hash: keyHash });
    } finally {
      if (auditId) await sql`DELETE FROM audits WHERE audit_id = ${auditId}::UUID`;
      await sql`DELETE FROM api_rate_limit_buckets WHERE scope = 'audit_write' AND client_key_hash = ${keyHash}`;
      await sql.end({ timeout: 2 });
      await peer.close();
      for (const [name, value] of previous) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  test('shares the AI assessment quota across PostgreSQL-backed API instances before calling the provider', async () => {
    const names = ['NODE_ENV', 'RATE_LIMIT_HASH_SECRET', 'AI_REVIEW_TOKEN'] as const;
    const previous = new Map(names.map(name => [name, process.env[name]]));
    const peer = await PostgresAuditStore.connect(databaseUrl!);
    const found = await findCaseBySourceId('KAZ_S_159');
    if (!found) throw new Error('Pinned KAZ_S_159 case is unavailable');
    const secret = 'postgres-ai-rate-limit-test-0123456789abcdef';
    const aiToken = `postgres-ai-rate-limit-token-${randomUUID()}`;
    const address = `test-ai-client-${randomUUID()}`;
    const tokenFingerprint = createHash('sha256').update(aiToken).digest('hex');
    const keyHash = createRateLimitClientKey(secret, 'ai_assessment', address, tokenFingerprint);
    const caseId = `${found.item.caseId}-AI-RATELIMIT-${randomUUID()}`;
    const sql = postgres(databaseUrl!, { prepare: false });
    let providerCalls = 0;
    const casebookAccess = {
      load: async () => found.book,
      list: async () => [],
      find: async (sourceId: string) => sourceId === found.source.sourceId
        ? { ...found, item: { ...found.item, caseId } }
        : null,
    };
    const services = {
      aiConfigured: () => true,
      requestModelAssessment: async () => {
        providerCalls += 1;
        return { verdict: 'insufficient_evidence' as const, reason: 'The submitted text does not verify the physical methane outcome.', citations: [] };
      },
      getIntelligenceSnapshot: async () => { throw new Error('Use the pinned curated casebook fallback'); },
    };
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_HASH_SECRET = secret;
    process.env.AI_REVIEW_TOKEN = aiToken;
    try {
      const options = { aiAssessmentRateLimit: { limit: 1, windowMs: 60_000 } };
      const firstApp = createApp(store, casebookAccess, services, options);
      const secondApp = createApp(peer, casebookAccess, services, options);
      const request = (target: typeof firstApp) => target.fetch(new Request('http://localhost/api/intelligence/assessments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
        body: JSON.stringify({
          sourceId: found.source.sourceId,
          claimType: 'mitigation_confirmed',
          consentToExternalProcessing: true,
          documents: [{ id: 'authorized-test-excerpt', title: 'Test excerpt', rightsDeclared: 'explicit_permission', text: 'The field report records that a valve was tightened during maintenance, but includes no independent methane measurement collected after the reported repair.' }],
        }),
      }), { clientAddress: address });

      const first = await request(firstApp);
      expect(first.status).toBe(201);
      const audit = (await first.json()).audit;
      expect(audit.caseId).toBe(caseId);
      expect(audit.result).toBe('insufficient_evidence');
      const second = await request(secondApp);
      expect(second.status).toBe(429);
      expect(second.headers.get('retry-after')).toBe('60');
      expect(providerCalls).toBe(1);
      const [row] = await sql`SELECT scope, client_key_hash FROM api_rate_limit_buckets WHERE scope = 'ai_assessment' AND client_key_hash = ${keyHash}`;
      expect(row).toEqual({ scope: 'ai_assessment', client_key_hash: keyHash });
    } finally {
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql`DELETE FROM api_rate_limit_buckets WHERE scope = 'ai_assessment' AND client_key_hash = ${keyHash}`;
      await sql.end({ timeout: 2 });
      await peer.close();
      for (const [name, value] of previous) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  test('uses indexed keyset pages and excludes private drafts before calculating public hasMore', async () => {
    const suffix = randomUUID();
    const sourceId = `MARS_PAGE_TEST_${suffix}`;
    const caseId = `MARS_PAGE_CASE_${suffix}`;
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const publicAudit = await store.create(caseId, sourceId, 'source_detected', revision => createAudit(
        { sourceId, synthetic: false, evidence: [] }, { sourceId, claimType: 'source_detected' }, { caseId, revision },
      ));
      await store.create(caseId, sourceId, 'source_detected', revision => {
        const draft = createAudit(
          { sourceId, synthetic: false, evidence: [] }, { sourceId, claimType: 'source_detected' }, { caseId, revision },
        );
        return {
          ...draft,
          bundle: {
            ...draft.bundle,
            schemaVersion: 3,
            intelligence: {
              reviewStatus: 'unreviewed',
              citationPublication: { status: 'private', authorConsent: false },
            },
          },
        } as unknown as typeof draft;
      });

      const visiblePage = await store.listPage({ sourceId, limit: 1, visibility: 'public' });
      expect(visiblePage.audits.map(item => item.auditId)).toEqual([publicAudit.auditId]);
      expect(visiblePage.hasMore).toBe(false);
      const allPage = await store.listPage({ sourceId, limit: 1, visibility: 'all' });
      expect(allPage.audits).toHaveLength(1);
      expect(allPage.hasMore).toBe(true);

      const indexes = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'audits' AND indexname IN ('audits_source_page_idx','audits_claim_page_idx','audits_created_page_idx')`;
      const indexNames = indexes as unknown as Array<{ indexname: string }>;
      expect(indexNames.map(row => row.indexname).sort()).toEqual(['audits_claim_page_idx', 'audits_created_page_idx', 'audits_source_page_idx']);
    } finally {
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql`DELETE FROM sources WHERE source_id = ${sourceId}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('retains a plume observation with no source link instead of assigning a guessed source', async () => {
    const sql = postgres(databaseUrl!, { prepare: false });
    const plumeId = `UNLINKED-TEST-${randomUUID()}`;
    try {
      await sql`INSERT INTO observations (plume_id, source_id, observed_at, provenance)
        VALUES (${plumeId}, NULL, now(), ${sql.json({ linkStatus: 'source_id_missing' } as never)})`;
      const [row] = await sql`SELECT source_id FROM observations WHERE plume_id = ${plumeId}`;
      expect(row?.source_id).toBeNull();
    } finally {
      await sql`DELETE FROM observations WHERE plume_id = ${plumeId}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('accepts every evidence kind in the shared audit schema', async () => {
    const sql = postgres(databaseUrl!, { prepare: false });
    const suffix = randomUUID();
    const evidenceIds = [`META-${suffix}`, `EXCERPT-${suffix}`];
    try {
      await sql`INSERT INTO evidence (evidence_id, source_id, kind, claim_type, title)
        VALUES (${evidenceIds[0]}, 'KAZ_S_159', 'metadata_notification', 'operator_notified', 'Source-level notification metadata'),
               (${evidenceIds[1]}, 'KAZ_S_159', 'document_excerpt', 'mitigation_confirmed', 'Authorized excerpt citation')`;
      const rows = await sql`SELECT kind FROM evidence WHERE evidence_id = ${evidenceIds[0]} OR evidence_id = ${evidenceIds[1]} ORDER BY evidence_id`;
      expect(rows.map((row) => row.kind)).toEqual(['document_excerpt', 'metadata_notification']);
    } finally {
      await sql`DELETE FROM evidence WHERE evidence_id = ${evidenceIds[0]} OR evidence_id = ${evidenceIds[1]}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('persists document-review dispositions as immutable v3 revisions across store reconnects', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    expect(found).not.toBeNull();
    const sourceCase = found!.item;
    const caseId = `${sourceCase.caseId}-V3-TEST-${randomUUID()}`;
    const input = DocumentAssessmentInput.parse({
      sourceId: sourceCase.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{
        id: 'authorized-inspection',
        title: 'Authorized inspection excerpt',
        rightsDeclared: 'explicit_permission',
        text: 'The operator recorded a completed valve repair. An independent follow-up measurement has not yet been performed to verify sustained methane mitigation.',
      }],
    });
    let reopened: PostgresAuditStore | undefined;
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const draft = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createDocumentAudit(
        input,
        found!.source,
        { verdict: 'supported', reason: 'The excerpt documents a reported repair, but not a verified physical outcome.', citations: [{ documentId: 'authorized-inspection', quote: 'The operator recorded a completed valve repair.' }] },
        revision,
        { caseId, externalEvidence: found!.item.externalEvidence, provenance: found!.book.provenance, observationIds: sourceCase.plumes.map((item) => item.plumeId) },
      ));
      const decision = { status: 'needs_more_evidence' as const, note: 'Request an independent post-repair methane observation.', sourceInspected: false, publishCitations: false };
      const reviewed = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createReviewedAudit(draft, revision, 'database-reviewer', decision));
      reopened = await PostgresAuditStore.connect(databaseUrl!);

      const revisions = (await reopened.list(sourceCase.sourceId, input.claimType)).filter((item) => item.caseId === caseId).sort((a, b) => a.revision - b.revision);
      expect(revisions.map((item) => item.revision)).toEqual([1, 2]);
      expect(revisions[0].bundle.intelligence?.reviewStatus).toBe('unreviewed');
      expect(revisions[1].bundle.intelligence?.reviewStatus).toBe('needs_more_evidence');
      expect(revisions[1].result).toBe('insufficient_evidence');
      expect(revisions[1].bundle.intelligence?.review?.parentBundleHash).toBe(draft.bundleHash);
      expect(auditIntegrityValid(revisions[0])).toBe(true);
      expect(auditIntegrityValid(revisions[1])).toBe(true);
      expect((await reopened.get(reviewed.auditId))?.bundleHash).toBe(reviewed.bundleHash);
    } finally {
      await reopened?.close();
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('HTTP assessment, private review, history and digest survive a PostgreSQL store reconnect', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    if (!found) throw new Error('The pinned integration source KAZ_S_159 is unavailable');

    const caseId = `${found.item.caseId}-HTTP-POSTGRES-TEST-${randomUUID()}`;
    const input = {
      sourceId: found.source.sourceId,
      claimType: 'mitigation_confirmed' as const,
      consentToExternalProcessing: true as const,
      documents: [{
        id: 'authorized-inspection',
        title: 'Test-only authorized inspection excerpt',
        rightsDeclared: 'explicit_permission',
        text: 'The operator report states that a repair was completed. An independent post-repair methane measurement has not been provided.',
      }],
    };
    const exactQuote = 'The operator report states that a repair was completed.';
    const casebookAccess = {
      load: async () => found.book,
      list: async () => [],
      find: async (sourceId: string) => sourceId === found.source.sourceId
        ? { ...found, item: { ...found.item, caseId } }
        : null,
    };
    const services = {
      aiConfigured: () => true,
      requestModelAssessment: async () => ({
        verdict: 'insufficient_evidence' as const,
        reason: 'The excerpt reports an action but does not verify the physical mitigation outcome.',
        citations: [{ documentId: 'authorized-inspection', quote: exactQuote }],
      }),
      getIntelligenceSnapshot: async () => { throw new Error('Test exercises the pinned casebook fallback'); },
      chainConfigured: () => false,
      chainWriteConfigured: () => false,
    };

    const envNames = ['AI_REVIEW_TOKEN', 'ADMIN_API_TOKEN', 'HUMAN_REVIEW_TOKEN', 'HUMAN_REVIEWER_ID', 'REVIEWER_AUTH_SECRET'] as const;
    const previousEnv = new Map(envNames.map(name => [name, process.env[name]]));
    const aiToken = `postgres-workflow-ai-${'a'.repeat(48)}`;
    const reviewerSecret = `postgres-workflow-reviewer-${'b'.repeat(48)}`;
    process.env.AI_REVIEW_TOKEN = aiToken;
    process.env.ADMIN_API_TOKEN = `postgres-workflow-admin-${'c'.repeat(48)}`;
    delete process.env.HUMAN_REVIEW_TOKEN;
    delete process.env.HUMAN_REVIEWER_ID;
    process.env.REVIEWER_AUTH_SECRET = reviewerSecret;
    const reviewerToken = issueReviewerToken(reviewerSecret, 'postgres-reviewer', ['private_read', 'review'], 600);

    let firstStore: PostgresAuditStore | undefined;
    let reopenedStore: PostgresAuditStore | undefined;
    try {
      firstStore = await PostgresAuditStore.connect(databaseUrl!);
      const initialApp = createApp(firstStore, casebookAccess, services);
      const created = await initialApp.request('/api/intelligence/assessments', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${aiToken}` },
        body: JSON.stringify(input),
      });
      expect(created.status).toBe(201);
      const draft = (await created.json()).audit;
      expect(draft.caseId).toBe(caseId);
      expect(draft.sourceId).toBe('KAZ_S_159');
      expect(draft.result).toBe('insufficient_evidence');
      expect(draft.bundle.provenance.snapshotId).toBe(found.book.provenance.snapshotId);
      expect(draft.bundle.provenance.archiveSha256).toBe(found.book.provenance.archiveSha256);
      expect(draft.bundle.intelligence.reviewStatus).toBe('unreviewed');
      const quotation = draft.bundle.intelligence.quotations[0];
      expect(quotation).toMatchObject({ documentId: 'authorized-inspection', quote: exactQuote });
      expect(quotation.quoteSha256).toBe(createHash('sha256').update(exactQuote).digest('hex'));
      expect(auditIntegrityValid(draft)).toBe(true);
      expect((await initialApp.request(`/api/audits/${draft.auditId}`)).status).toBe(404);

      await firstStore.close();
      firstStore = undefined;
      reopenedStore = await PostgresAuditStore.connect(databaseUrl!);
      const reopenedApp = createApp(reopenedStore, casebookAccess, services);
      const privateDraftResponse = await reopenedApp.request(`/api/audits/${draft.auditId}`, {
        headers: { authorization: `Bearer ${reviewerToken}` },
      });
      expect(privateDraftResponse.status).toBe(200);
      expect(privateDraftResponse.headers.get('cache-control')).toContain('no-store');
      const persistedDraft = await privateDraftResponse.json();
      expect(persistedDraft.bundleHash).toBe(draft.bundleHash);
      expect(persistedDraft.bundle.intelligence.reviewStatus).toBe('unreviewed');
      expect(persistedDraft.bundle.intelligence.documentDigests).toMatchObject([{
        id: 'authorized-inspection',
        sha256: createHash('sha256').update(input.documents[0]!.text).digest('hex'),
        rightsDeclared: 'explicit_permission',
      }]);
      expect(auditIntegrityValid(persistedDraft)).toBe(true);

      const reviewedResponse = await reopenedApp.request(`/api/audits/${draft.auditId}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${reviewerToken}` },
        body: JSON.stringify({
          status: 'needs_more_evidence',
          note: 'Request an independent post-repair methane measurement.',
        }),
      });
      expect(reviewedResponse.status).toBe(201);
      const reviewed = (await reviewedResponse.json()).audit;
      expect(reviewed.revision).toBe(draft.revision + 1);
      expect(reviewed.result).toBe('insufficient_evidence');
      expect(reviewed.bundle.intelligence.reviewStatus).toBe('needs_more_evidence');
      expect(reviewed.bundle.intelligence.review.parentBundleHash).toBe(draft.bundleHash);
      expect(auditIntegrityValid(reviewed)).toBe(true);

      const unchangedDraft = await reopenedApp.request(`/api/audits/${draft.auditId}`, {
        headers: { authorization: `Bearer ${reviewerToken}` },
      });
      expect((await unchangedDraft.json()).bundle.intelligence.reviewStatus).toBe('unreviewed');
      const privateHistory = await reopenedApp.request(`/api/audits/history?sourceId=KAZ_S_159&claimType=mitigation_confirmed`, {
        headers: { authorization: `Bearer ${reviewerToken}` },
      });
      expect(privateHistory.status).toBe(200);
      expect((await privateHistory.json()).audits.map((audit: { auditId: string }) => audit.auditId)).toEqual([draft.auditId, reviewed.auditId]);
      const publicHistory = await reopenedApp.request('/api/audits?sourceId=KAZ_S_159&claimType=mitigation_confirmed');
      expect(publicHistory.status).toBe(200);
      expect((await publicHistory.json()).audits).toEqual([]);
      const verification = await reopenedApp.request(`/api/audits/${reviewed.auditId}/verify`, {
        headers: { authorization: `Bearer ${reviewerToken}` },
      });
      expect(verification.status).toBe(200);
      expect(await verification.json()).toMatchObject({ status: 'not_configured', integrityVerified: false, localDigestValid: true });
    } finally {
      try {
        await firstStore?.close();
        await reopenedStore?.close();
        const cleanup = postgres(databaseUrl!, { prepare: false });
        try {
          await cleanup`DELETE FROM audit_anchor_intents WHERE case_id = ${caseId}`;
          await cleanup`DELETE FROM audits WHERE case_id = ${caseId}`;
        } finally {
          await cleanup.end({ timeout: 2 });
        }
      } finally {
        for (const [name, value] of previousEnv) {
          if (value === undefined) delete process.env[name];
          else process.env[name] = value;
        }
      }
    }
  });

  test('registers a pinned non-curated source before atomically persisting its document audit', async () => {
    const suffix = randomUUID();
    const sourceId = `MARS_TEST_${suffix}`;
    const caseId = `mars:unep-mars-test:${sourceId}`;
    const provenance = {
      provider: 'UNEP IMEO', dataset: 'Pinned MARS test snapshot',
      catalogUrl: 'https://methanedata.unep.org/download-dataset', downloadUrl: 'https://example.org/mars.zip',
      retrievedAt: '2026-10-12T10:20:45+00:00', archiveSha256: 'a'.repeat(64), snapshotId: 'unep-mars-test',
      license: 'CC BY-NC-SA 4.0', attribution: 'UNEP IMEO test snapshot',
    };
    const input = DocumentAssessmentInput.parse({
      sourceId, claimType: 'mitigation_confirmed', consentToExternalProcessing: true,
      documents: [{ id: 'inspection', title: 'Authorized inspection excerpt', rightsDeclared: 'explicit_permission', text: 'The operator recorded a completed repair, but no later methane observation is available to assess sustained mitigation.' }],
    });
    const sql = postgres(databaseUrl!, { prepare: false });
    try {
      const audit = await store.create(caseId, sourceId, input.claimType, (revision) => createDocumentAudit(
        input, { sourceId, synthetic: false },
        { verdict: 'insufficient_evidence', reason: 'No later methane observation supports an outcome claim.', citations: [{ documentId: 'inspection', quote: 'The operator recorded a completed repair' }] },
        revision, { caseId, provenance, externalEvidence: [], observationIds: ['original-plume-id'] },
      ));
      const [source] = await sql`SELECT case_id, synthetic, source_license, raw_sha256 FROM sources WHERE source_id = ${sourceId}`;
      expect(source).toMatchObject({ case_id: caseId, synthetic: false, source_license: provenance.license, raw_sha256: provenance.archiveSha256 });
      expect((await store.get(audit.auditId))?.bundleHash).toBe(audit.bundleHash);
    } finally {
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql`DELETE FROM sources WHERE source_id = ${sourceId}`;
      await sql.end({ timeout: 2 });
    }
  });

  test('durably reserves a reviewed audit anchor across store reconnects and completes one receipt', async () => {
    const found = await findCaseBySourceId('KAZ_S_159');
    expect(found).not.toBeNull();
    const sourceCase = found!.item;
    const caseId = `${sourceCase.caseId}-ANCHOR-TEST-${randomUUID()}`;
    const input = DocumentAssessmentInput.parse({
      sourceId: sourceCase.sourceId,
      claimType: 'mitigation_confirmed',
      consentToExternalProcessing: true,
      documents: [{
        id: 'inspection', title: 'Authorized inspection excerpt',
        rightsDeclared: 'explicit_permission',
        text: 'The operator reported a completed repair. No independent follow-up methane measurement has been provided to verify a sustained reduction.',
      }],
    });
    const sql = postgres(databaseUrl!, { prepare: false });
    let reopened: PostgresAuditStore | undefined;
    try {
      const draft = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createDocumentAudit(
        input, found!.source,
        { verdict: 'insufficient_evidence', reason: 'The document does not verify the physical mitigation outcome.', citations: [{ documentId: 'inspection', quote: 'The operator reported a completed repair.' }] },
        revision, { caseId, externalEvidence: found!.item.externalEvidence, provenance: found!.book.provenance },
      ));
      const reviewed = await store.create(caseId, sourceCase.sourceId, input.claimType, (revision) => createReviewedAudit(
        draft, revision, 'anchor-test-reviewer',
        { status: 'needs_more_evidence', note: 'Request a post-repair observation before assessing the outcome.', sourceInspected: true, publishCitations: false },
      ), draft.auditId);

      expect(await store.reserveAnchor(reviewed)).toBe(true);
      reopened = await PostgresAuditStore.connect(databaseUrl!);
      expect(await reopened.reserveAnchor(reviewed)).toBe(false);

      const receipt: AuditReceipt = {
        chainId: 11155111,
        registryAddress: '0x0000000000000000000000000000000000000001',
        txHash: `0x${'a'.repeat(64)}`,
        issuer: '0x0000000000000000000000000000000000000002',
        version: 1,
        blockNumber: '456',
      };
      const anchored = { ...reviewed, anchored: true, chainTxHash: receipt.txHash, receipt };
      await reopened.completeAnchor(anchored);
      expect((await store.get(reviewed.auditId))?.receipt).toEqual(receipt);
      expect(await reopened.reserveAnchor(reviewed)).toBe(false);
    } finally {
      await reopened?.close();
      await sql`DELETE FROM audit_anchor_intents WHERE case_id = ${caseId}`;
      await sql`DELETE FROM audits WHERE case_id = ${caseId}`;
      await sql.end({ timeout: 2 });
    }
  });
});
