import { expect, test } from 'bun:test';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { FileAuditStore, MemoryAuditStore, type AuditStore } from './store';
import { issueReviewerToken } from './reviewer-auth';

const secret = 'DEMO-publication-tests-' + 'x'.repeat(48);
const input = { sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected',
  scope: { startDate: '2026-09-01', endDate: '2026-09-30' },
  claimText: 'PRIVATE DEMO claim inspected for this source.', rationale: 'PRIVATE DEMO reasoning and confidential reference notes.',
  result: 'insufficient_evidence', sourceInspected: true, evidence: [], publicSummaryConsent: true };

async function fixture(store: AuditStore, run: (context: {
  api: ReturnType<typeof createApp>; headers: Record<string, string>;
  create: (extra?: Record<string, unknown>) => Promise<any>; revoke: () => void;
}) => Promise<void>) {
  const old = process.env.REVIEWER_AUTH_SECRET;
  process.env.REVIEWER_AUTH_SECRET = secret;
  let revoked = false;
  try {
    const api = createApp(store, undefined, { loadReviewerAssurance: async () => ({ status: revoked ? 'revoked' : 'operator_attested', assessedAt: new Date().toISOString() }) }, { auditRateLimit: { limit: 100, windowMs: 60_000 } });
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${issueReviewerToken(secret, 'PRIVATE-demo-reviewer', ['review', 'private_read'], 600)}` };
    await run({ api, headers, revoke: () => { revoked = true; }, create: async (extra = {}) => {
      const response = await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, ...extra }) });
      expect(response.status).toBe(201);
      return (await response.json()).audit;
    } });
  } finally { if (old === undefined) delete process.env.REVIEWER_AUTH_SECRET; else process.env.REVIEWER_AUTH_SECRET = old; }
}

for (const backend of ['memory', 'file'] as const) test(`${backend}: public correction and withdrawal preserve immutable history and survive reload`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-publication-'));
  const path = join(dir, 'audits.json');
  const store = backend === 'file' ? new FileAuditStore(path) : new MemoryAuditStore();
  try {
    await fixture(store, async ({ api, headers, create }) => {
      const first = await create();
      const firstRecord = await (await api.request(`/api/transparency/${first.auditId}`)).json();
      expect(firstRecord.publication.status).toBe('published');
      const second = await create({ parentAuditId: first.auditId, rationale: 'PRIVATE DEMO corrected reasoning with insufficient evidence.' });
      const oldRecord = await (await api.request(`/api/transparency/${first.auditId}`)).json();
      expect(oldRecord.summaryHash).toBe(firstRecord.summaryHash);
      expect(oldRecord.summary).toEqual(firstRecord.summary);
      expect(oldRecord.publication.status).toBe('superseded');
      expect(oldRecord.publication.replacementAuditId).toBe(second.auditId);
      const list = await (await api.request('/api/transparency?sourceId=DEMO-001')).json();
      expect(list.summaries.map((r: any) => r.summary.auditId)).toEqual([second.auditId]);
      const history = await (await api.request('/api/transparency?sourceId=DEMO-001&view=history&limit=1')).json();
      expect(history.summaries).toHaveLength(1);
      const older = await (await api.request(`/api/transparency?sourceId=DEMO-001&view=history&limit=1&cursor=${history.nextCursor}`)).json();
      expect(older.summaries[0].publication.status).toBe('superseded');
      const current = list.summaries[0];
      const withdraw = await api.request(`/api/transparency/${second.auditId}/withdraw`, { method: 'POST', headers, body: JSON.stringify({ expectedVersion: current.publication.version, reason: 'consent_withdrawn' }) });
      expect(withdraw.status).toBe(200);
      const withdrawn = await withdraw.json();
      expect(withdrawn.publication.status).toBe('withdrawn');
      expect(withdrawn.publication.history.at(-1).reason).toBe('consent_withdrawn');
      expect((await store.get(first.auditId))!.bundleHash).toBe(first.bundleHash);
      expect((await store.get(second.auditId))!.bundleHash).toBe(second.bundleHash);
      expect((await api.request(`/api/audits/${second.auditId}`)).status).toBe(404);
      const reloaded = backend === 'file' ? createApp(new FileAuditStore(path)) : api;
      const live = await reloaded.request(`/api/transparency/${second.auditId}/verify`);
      expect(live.status).toBe(200);
      expect((await live.json()).publication.status).toBe('withdrawn');
      const reloadedList = await (await reloaded.request('/api/transparency?sourceId=DEMO-001')).json();
      expect(reloadedList.summaries[0].publication.status).toBe('withdrawn');
      expect(live.headers.get('cache-control')).toBe('no-store');
      expect(JSON.stringify({ oldRecord, withdrawn, reloadedList })).not.toContain('PRIVATE');
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('private revisions do not supersede or expose themselves through public status', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, create }) => {
    const first = await create();
    const before = await (await api.request(`/api/transparency/${first.auditId}`)).json();
    const privateRevision = await create({ parentAuditId: first.auditId, publicSummaryConsent: false });
    const after = await (await api.request(`/api/transparency/${first.auditId}`)).json();
    expect(after.publication).toEqual(before.publication);
    expect(JSON.stringify(after)).not.toContain(privateRevision.auditId);
    expect((await api.request(`/api/transparency/${privateRevision.auditId}`)).status).toBe(404);
    expect((await api.request(`/api/transparency/${privateRevision.auditId}/verify`)).status).toBe(404);
    const correction = await create({ parentAuditId: privateRevision.auditId });
    const corrected = await (await api.request(`/api/transparency/${first.auditId}`)).json();
    expect(corrected.publication.replacementAuditId).toBe(correction.auditId);
    expect(JSON.stringify(corrected)).not.toContain(privateRevision.auditId);
  });
});

test('withdrawal rejects stale/concurrent requests, repeat withdrawal and unsafe reasons', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-pub-cas-'));
  try { await fixture(new FileAuditStore(join(dir, 'audit.json')), async ({ api, headers, create }) => {
    const audit = await create();
    const record = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    const url = `/api/transparency/${audit.auditId}/withdraw`;
    const post = (body: unknown) => api.request(url, { method: 'POST', headers, body: JSON.stringify(body) });
    expect((await post({ expectedVersion: record.publication.version, reason: 'PRIVATE free text' })).status).toBe(400);
    expect((await post({ expectedVersion: record.publication.version, reason: 'consent_withdrawn', actorId: 'forged' })).status).toBe(400);
    const results = await Promise.all([post({ expectedVersion: record.publication.version, reason: 'consent_withdrawn' }), post({ expectedVersion: record.publication.version, reason: 'published_in_error' })]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const updated = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    expect((await post({ expectedVersion: updated.publication.version, reason: 'consent_withdrawn' })).status).toBe(409);
  }); } finally { await rm(dir, { recursive: true, force: true }); }
});

test('correction publication requires the latest assessment parent and rejects racing stale forms', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, headers, create }) => {
    const first = await create();
    const post = (extra: Record<string, unknown>) => api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, ...extra }) });
    expect((await post({})).status).toBe(409);
    const results = await Promise.all([post({ parentAuditId: first.auditId }), post({ parentAuditId: first.auditId })]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    const list = await (await api.request('/api/transparency?sourceId=DEMO-001')).json();
    expect(list.summaries).toHaveLength(1);
    expect(list.summaries[0].summary.revision).toBe(2);
  });
});

test('withdrawal denies unverified, expired and wrong-category review authority', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, headers, create }) => {
    const audit = await create();
    const initial = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    for (const status of ['unverified', 'expired', 'outside_authority', 'directory_unavailable'] as const) {
      const store = new MemoryAuditStore();
      await store.create(audit.caseId, audit.sourceId, audit.claimType, () => audit);
      const denied = createApp(store, undefined, { loadReviewerAssurance: async () => ({ status, assessedAt: new Date().toISOString() }) });
      expect((await denied.request(`/api/transparency/${audit.auditId}/withdraw`, { method: 'POST', headers, body: JSON.stringify({ expectedVersion: initial.publication.version, reason: 'evidence_under_review' }) })).status).toBe(403);
    }
  });
});

test('directory revocation while withdrawal is queued prevents the commit', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, create }) => {
    const audit = await create();
    const record = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    const store = new MemoryAuditStore();
    await store.create(audit.caseId, audit.sourceId, audit.claimType, () => audit);
    let checks = 0;
    const guarded = createApp(store, undefined, { loadReviewerAssurance: async () => ({ status: ++checks === 1 ? 'operator_attested' : 'revoked', assessedAt: new Date().toISOString() }) });
    const token = issueReviewerToken(secret, 'PRIVATE-demo-reviewer', ['review'], 600);
    expect((await guarded.request(`/api/transparency/${audit.auditId}/withdraw`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ expectedVersion: record.publication.version, reason: 'consent_withdrawn' }) })).status).toBe(403);
    expect((await (await guarded.request(`/api/transparency/${audit.auditId}`)).json()).publication.status).toBe('published');
  });
});

test('withdrawal requires current review authority; anonymous and read-only users cannot mutate', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, headers, create, revoke }) => {
    const audit = await create();
    const record = await (await api.request(`/api/transparency/${audit.auditId}`)).json();
    const body = JSON.stringify({ expectedVersion: record.publication.version, reason: 'consent_withdrawn' });
    const url = `/api/transparency/${audit.auditId}/withdraw`;
    expect((await api.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body })).status).toBe(401);
    const reader = issueReviewerToken(secret, 'DEMO-reader', ['private_read'], 600);
    expect((await api.request(url, { method: 'POST', headers: { ...headers, authorization: `Bearer ${reader}` }, body })).status).toBe(401);
    revoke();
    expect((await api.request(url, { method: 'POST', headers, body })).status).toBe(403);
    expect((await (await api.request(`/api/transparency/${audit.auditId}`)).json()).publication.status).toBe('published');
  });
});

test('legacy envelopes retain public consent and reject corrupt publication metadata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-pub-legacy-'));
  const path = join(dir, 'audits.json');
  try {
    await fixture(new MemoryAuditStore(), async ({ create }) => {
      const audit = await create();
      await writeFile(path, JSON.stringify([audit]), { mode: 0o600 });
      const store = new FileAuditStore(path);
      const api = createApp(store);
      expect((await (await api.request(`/api/transparency/${audit.auditId}`)).json()).publication.status).toBe('published');
      await writeFile(path, JSON.stringify({ schemaVersion: 1, audits: [audit], anchorIntents: [], publicationEvents: [{ auditId: audit.auditId, status: 'withdrawn', actorId: 'PRIVATE', reason: 'PRIVATE' }] }), { mode: 0o600 });
      expect((await store.status()).ready).toBe(false);
      expect((await api.request('/api/transparency')).status).toBe(503);
      expect((await readFile(path, 'utf8'))).toContain('publicationEvents');
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('legacy revisions migrate to one current publication without exposing private revisions or reviving withdrawal', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-pub-migration-'));
  const path = join(dir, 'audits.json');
  try {
    await fixture(new MemoryAuditStore(), async ({ create, headers }) => {
      const first = await create();
      const privateRevision = await create({ parentAuditId: first.auditId, publicSummaryConsent: false });
      const second = await create({ parentAuditId: privateRevision.auditId });
      await writeFile(path, JSON.stringify({ schemaVersion: 1, audits: [first, privateRevision, second], anchorIntents: [] }), { mode: 0o600 });
      const api = createApp(new FileAuditStore(path), undefined, { loadReviewerAssurance: async () => ({ status: 'operator_attested', assessedAt: new Date().toISOString() }) });
      const old = await (await api.request(`/api/transparency/${first.auditId}`)).json();
      expect(old.publication.status).toBe('superseded');
      expect(old.publication.replacementAuditId).toBe(second.auditId);
      expect(JSON.stringify(old)).not.toContain(privateRevision.auditId);
      const current = await (await api.request(`/api/transparency/${second.auditId}`)).json();
      const response = await api.request(`/api/transparency/${second.auditId}/withdraw`, { method: 'POST', headers, body: JSON.stringify({ expectedVersion: current.publication.version, reason: 'published_in_error' }) });
      expect(response.status).toBe(200);
      const persisted = JSON.parse(await readFile(path, 'utf8'));
      expect(persisted.schemaVersion).toBe(2);
      expect(persisted.publicationEvents.some((event: any) => event.origin === 'legacy_consent')).toBe(true);
      const stripped = { ...persisted, publicationEvents: [] };
      await writeFile(path, JSON.stringify(stripped), { mode: 0o600 });
      expect((await new FileAuditStore(path).status()).ready).toBe(false);
      delete persisted.publicationEvents;
      await writeFile(path, JSON.stringify(persisted), { mode: 0o600 });
      expect((await new FileAuditStore(path).status()).ready).toBe(false);
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('a scoped baseline between human revisions cannot block a consented correction', async () => {
  await fixture(new MemoryAuditStore(), async ({ api, create }) => {
    const first = await create();
    const baseline = await api.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId: input.sourceId, claimType: input.claimType, datasetSnapshotId: 'DEMO', scope: input.scope }) });
    expect(baseline.status).toBe(201);
    const second = await create({ parentAuditId: first.auditId });
    expect(second.revision).toBe(3);
    expect(second.bundle.humanAssessment.parentBundleHash).toBe(first.bundleHash);
    expect((await (await api.request(`/api/transparency/${first.auditId}`)).json()).publication.replacementAuditId).toBe(second.auditId);
  });
});

test('human publication rechecks reviewer approval inside the queued write', async () => {
  const store = new MemoryAuditStore();
  await fixture(store, async ({ create, headers }) => {
    const first = await create();
    const save = store.create.bind(store);
    let revoke = false;
    store.create = async (...args) => { revoke = true; return save(...args); };
    const api = createApp(store, undefined, { loadReviewerAssurance: async () => ({ status: revoke ? 'revoked' : 'operator_attested', assessedAt: new Date().toISOString() }) });
    const response = await api.request('/api/human-assessments', { method: 'POST', headers, body: JSON.stringify({ ...input, parentAuditId: first.auditId }) });
    expect(response.status).toBe(403);
    expect((await store.list()).length).toBe(1);
    expect((await (await api.request(`/api/transparency/${first.auditId}`)).json()).publication.status).toBe('published');
  });
});

test('file storage rejects two active publications for a scope', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-pub-invariant-'));
  const path = join(dir, 'audits.json');
  try {
    await fixture(new FileAuditStore(path), async ({ create }) => {
      const first = await create(); await create({ parentAuditId: first.auditId });
      const state = JSON.parse(await readFile(path, 'utf8'));
      state.publicationEvents = state.publicationEvents.filter((event: any) => event.status === 'published');
      await writeFile(path, JSON.stringify(state), { mode: 0o600 });
      expect((await new FileAuditStore(path).status()).ready).toBe(false);
    });
  } finally { await rm(dir, { recursive: true, force: true }); }
});
