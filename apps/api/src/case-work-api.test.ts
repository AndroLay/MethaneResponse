import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from './app';
import { MemoryAuditStore } from './store';
import { issueReviewerToken } from './reviewer-auth';

const context = { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' };
const draft = { claimType: 'source_detected', status: 'investigate', question: 'DEMO shared investigation', notes: '', evidenceRequest: '', nextAction: 'Inspect evidence', assignee: 'team-bob', dueDate: '2026-10-20' };

async function fixture(run: (api: ReturnType<typeof createApp>, token: (id: string, scopes?: ('review' | 'private_read')[]) => string, directory: (disabled?: boolean) => Promise<void>) => Promise<void>) {
  const previous = { secret: process.env.REVIEWER_AUTH_SECRET, directory: process.env.REVIEWER_DIRECTORY_PATH };
  const folder = await mkdtemp(join(tmpdir(), 'methane-team-api-'));
  const secret = 'DEMO-casework-test-only-' + 'x'.repeat(40);
  const path = join(folder, 'directory.json');
  process.env.REVIEWER_AUTH_SECRET = secret;
  process.env.REVIEWER_DIRECTORY_PATH = path;
  const directory = async (disabled = false) => {
    await writeFile(path, JSON.stringify({ schemaVersion: 1, reviewers: ['team-alice', 'team-bob', 'team-other'].map(reviewerId => ({ reviewerId, organization: 'DEMO test team', checkedBy: 'team-registrar', checkedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', verificationReference: 'DEMO test enrollment', claimTypes: reviewerId === 'team-other' ? ['mitigation_confirmed'] : ['source_detected'], disabled: disabled && reviewerId === 'team-bob' })) }), { mode: 0o600 });
  };
  try {
    await directory();
    await run(createApp(new MemoryAuditStore()), (id, scopes = ['private_read', 'review']) => issueReviewerToken(secret, id, scopes, 600), directory);
  } finally {
    for (const [name, value] of [['REVIEWER_AUTH_SECRET', previous.secret], ['REVIEWER_DIRECTORY_PATH', previous.directory]]) {
      if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
    }
    await rm(folder, { recursive: true, force: true });
  }
}
const query = new URLSearchParams({ sourceId: context.sourceId, synthetic: 'true', datasetSnapshotId: 'DEMO' });
const headers = (token: string) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

test('shared casework authenticates signed reviewers and filters private metadata by claim authority', async () => fixture(async (api, token) => {
  expect((await api.request(`/api/case-work?${query}`)).status).toBe(401);
  expect((await api.request('/api/case-work/session', { headers: headers(token('team-alice')) })).status).toBe(200);
  const body = { context, draft, expectedRevision: 0 };
  expect((await api.request('/api/case-work/episode', { method: 'PUT', headers: headers(token('team-alice', ['private_read'])), body: JSON.stringify(body) })).status).toBe(403);
  expect((await api.request('/api/case-work/episode', { method: 'PUT', headers: headers(token('team-other')), body: JSON.stringify(body) })).status).toBe(403);
  expect((await api.request('/api/case-work/episode', { method: 'PUT', headers: headers(token('not-enrolled')), body: JSON.stringify(body) })).status).toBe(403);
  const created = await api.request('/api/case-work/episode', { method: 'PUT', headers: headers(token('team-alice')), body: JSON.stringify(body) });
  expect(created.status).toBe(201);
  expect(created.headers.get('cache-control')).toContain('no-store');
  expect(created.headers.get('vary')).toContain('Authorization');
  expect((await created.json()).work).toMatchObject({ ownerId: 'team-alice', updatedBy: 'team-alice', revision: 1, assignee: 'team-bob' });
  expect((await (await api.request(`/api/case-work?${query}`, { headers: headers(token('team-other')) })).json()).works).toEqual([]);
  expect((await api.request(`/api/case-work/episode?${query}`, { headers: headers(token('team-other')) })).status).toBe(404);
}));

test('two reviewers hand off work and concurrent stale saves cannot overwrite the accepted revision', async () => fixture(async (api, token, directory) => {
  const put = (revision: number, notes: string, id = 'team-alice') => api.request('/api/case-work/handoff', { method: 'PUT', headers: headers(token(id)), body: JSON.stringify({ context, draft: { ...draft, notes }, expectedRevision: revision }) });
  expect((await put(0, 'Initial note')).status).toBe(201);
  const results = await Promise.all([put(1, 'Accepted or rejected A'), put(1, 'Accepted or rejected B', 'team-bob')]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  const current = await (await api.request(`/api/case-work/handoff?${query}`, { headers: headers(token('team-bob')) })).json();
  expect(current.work.revision).toBe(2);
  expect(current.history.map((item: { revision: number }) => item.revision)).toEqual([1, 2]);
  expect(current.history[0].notes).toBe('Initial note');
  expect(current.work.ownerId).toBe('team-alice');
  await directory(true);
  expect((await api.request(`/api/case-work/handoff?${query}`, { headers: headers(token('team-bob')) })).status).toBe(404);
  expect((await put(2, 'Revoked write', 'team-bob')).status).toBe(403);
}));

test('shared writes reject forged actors, unknown sources, mismatched snapshots, and unauthorized assignees', async () => fixture(async (api, token) => {
  const put = (body: unknown) => api.request('/api/case-work/validate', { method: 'PUT', headers: headers(token('team-alice')), body: JSON.stringify(body) });
  const body = { context, draft, expectedRevision: 0 };
  expect((await put({ ...body, updatedBy: 'someone-else' })).status).toBe(400);
  expect((await put({ ...body, draft: { ...draft, actor: 'someone-else' } })).status).toBe(400);
  expect((await put({ ...body, context: { ...context, sourceId: 'UNKNOWN' } })).status).toBe(404);
  expect((await put({ ...body, context: { ...context, datasetSnapshotId: 'wrong' } })).status).toBe(409);
  expect((await put({ ...body, draft: { ...draft, assignee: 'team-other' } })).status).toBe(422);
  expect((await put({ ...body, draft: { ...draft, scope: { startDate: '2026-01-02', endDate: '2026-01-01' } } })).status).toBe(400);
  expect((await put({ ...body, draft: { ...draft, assessmentLink: { auditId: 'foreign', bundleHash: `0x${'a'.repeat(64)}` } } })).status).toBe(422);
  expect((await put(body)).status).toBe(201);
  expect((await put({ ...body, expectedRevision: 1, draft: { ...draft, scope: { startDate: '2020-01-01', endDate: '2026-01-01' } } })).status).toBe(409);
}));

test('expired credentials, expired attestation, legacy tokens and oversized writes never grant shared access', async () => fixture(async (api, token) => {
  const names = ['HUMAN_REVIEW_TOKEN', 'HUMAN_REVIEWER_ID', 'ALLOW_LEGACY_SHARED_REVIEWER_TOKEN', 'REQUIRE_ATTESTED_HUMAN_REVIEWERS'] as const;
  const previous = names.map(name => process.env[name]);
  try {
    process.env.HUMAN_REVIEW_TOKEN = 'DEMO-legacy-' + 'l'.repeat(40);
    process.env.HUMAN_REVIEWER_ID = 'team-alice';
    process.env.ALLOW_LEGACY_SHARED_REVIEWER_TOKEN = 'true';
    process.env.REQUIRE_ATTESTED_HUMAN_REVIEWERS = 'false';
    const expired = issueReviewerToken(process.env.REVIEWER_AUTH_SECRET!, 'team-alice', ['private_read', 'review'], 60, Math.floor(Date.now() / 1000) - 120);
    for (const credential of [expired, process.env.HUMAN_REVIEW_TOKEN, token('team-alice', ['review'])]) {
      expect((await api.request('/api/case-work/session', { headers: headers(credential) })).status).toBe(401);
    }
    const put = (body: string) => api.request('/api/case-work/guard', { method: 'PUT', headers: headers(token('team-alice')), body });
    expect((await put(' '.repeat(16_385))).status).toBe(413);
    const directory = JSON.parse(await Bun.file(process.env.REVIEWER_DIRECTORY_PATH!).text());
    directory.reviewers[0].expiresAt = '2020-01-02T00:00:00Z';
    await writeFile(process.env.REVIEWER_DIRECTORY_PATH!, JSON.stringify(directory));
    expect((await api.request('/api/case-work/session', { headers: headers(token('team-alice')) })).status).toBe(403);
    expect((await put(JSON.stringify({ context, draft, expectedRevision: 0 }))).status).toBe(403);
  } finally {
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
}));
