import { expect, test } from 'bun:test';
import { connectSharedWork, disconnectSharedWork, listSharedWork, saveSharedWork, requestPlanResource, requestInvestigationResource, SharedWorkRequestError } from './shared-work-api';
import { getTeamSession } from './team-session';
const profile = { reviewerId: 'team-alice', claimTypes: ['source_detected'], canWrite: true, storage: { backend: 'file', persistent: true, ready: true } };
const context = { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' };
const draft = { claimType: 'source_detected' as const, status: 'investigate' as const, question: 'DEMO', notes: '', evidenceRequest: '', nextAction: '' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
test('plan requests share memory-only auth and reject late private responses after disconnect', async () => {
  await connectSharedWork('DEMO-plan-token', async () => json(profile));
  let release!: (r: Response) => void;
  const pending = requestPlanResource('demo-plan', {}, async (url, options) => {
    expect(String(url)).toEndWith('/api/investigation-plans/demo-plan');
    expect(options?.headers).toMatchObject({ authorization: 'Bearer DEMO-plan-token' });
    return new Promise<Response>(done => { release = done; });
  });
  disconnectSharedWork(); release(json({ private: 'DEMO reviewer history' }));
  await expect(pending).rejects.toThrow();
  expect(() => requestPlanResource('../outside')).toThrow();
});

test('shared access keeps token out of observable session data and clears identity on disconnect', async () => {
  const token = 'DEMO-ephemeral-test-token';
  await connectSharedWork(token, async () => json(profile));
  expect(getTeamSession()?.reviewerId).toBe('team-alice');
  expect(JSON.stringify(getTeamSession())).not.toContain(token);
  disconnectSharedWork();
  expect(getTeamSession()).toBeNull();
  await expect(listSharedWork(context, async () => json({ works: [] }))).rejects.toThrow();
});

test('a disconnected or replaced session cannot accept a late response', async () => {
  await connectSharedWork('DEMO-first-token', async () => json(profile));
  let resolve!: (response: Response) => void;
  const pending = listSharedWork(context, () => new Promise<Response>(done => { resolve = done; }));
  disconnectSharedWork();
  await connectSharedWork('DEMO-second-token', async () => json({ ...profile, reviewerId: 'team-bob' }));
  resolve(json({ works: [] }));
  await expect(pending).rejects.toThrow();
  expect(getTeamSession()?.reviewerId).toBe('team-bob');
  disconnectSharedWork();
});

test('shared response provenance is checked and stale-save conflicts are preserved as conflicts', async () => {
  await connectSharedWork('DEMO-token', async () => json(profile));
  const foreign = { ...draft, context: { ...context, datasetSnapshotId: 'foreign' }, workId: 'episode', revision: 1, ownerId: 'team-alice', updatedBy: 'team-alice', createdAt: '2026-10-17T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z' };
  await expect(listSharedWork(context, async () => json({ works: [foreign] }))).rejects.toThrow();
  try {
    await saveSharedWork(context, 'episode', draft, 1, async () => json({ error: 'This investigation changed', code: 'conflict' }, 409));
    throw new Error('A stale save must fail');
  } catch (error) {
    expect(error).toBeInstanceOf(SharedWorkRequestError);
    expect((error as SharedWorkRequestError).status).toBe(409);
  }
  disconnectSharedWork();
});

test('a session change during response-body decoding rejects the old private result', async () => {
  await connectSharedWork('DEMO-old-session', async () => json(profile));
  let release!: () => void;
  let started!: () => void;
  const bodyStarted = new Promise<void>(done => { started = done; });
  const bodyGate = new Promise<void>(done => { release = done; });
  const response = new Response(new ReadableStream({ async pull(controller) { started(); await bodyGate; controller.enqueue(new TextEncoder().encode('{"works":[]}')); controller.close(); } }), { headers: { 'content-type': 'application/json' } });
  const pending = listSharedWork(context, async () => response);
  await bodyStarted;
  await connectSharedWork('DEMO-new-session', async () => json({ ...profile, reviewerId: 'team-bob' }));
  release();
  await expect(pending).rejects.toThrow();
  disconnectSharedWork();
});
test('investigation responses reject oversized UTF-8 streams without reading the entire body', async () => {
  await connectSharedWork('DEMO-bounded-response', async () => json(profile));
  let cancelled = false, chunks = 0;
  const body = new ReadableStream({ pull(controller) { chunks++; controller.enqueue(new TextEncoder().encode('é'.repeat(512 * 1024))); }, cancel() { cancelled = true; } });
  await expect(requestInvestigationResource(context, 'DEMO-work', 'dossier', {}, async () => new Response(body))).rejects.toThrow('browser limit');
  expect(cancelled).toBe(true); expect(chunks).toBeLessThanOrEqual(18);
  let read = false;
  await expect(requestInvestigationResource(context, 'DEMO-work', 'dossier', {}, async () => new Response(new ReadableStream({ pull() { read = true; } }, { highWaterMark: 0 }), { headers: { 'content-length': String(16 * 1024 * 1024 + 1) } }))).rejects.toThrow('browser limit');
  expect(read).toBe(false); disconnectSharedWork();
});
