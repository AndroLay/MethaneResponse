import { expect, test } from 'bun:test';
import { connectSharedWork, disconnectSharedWork, listSharedWork, saveSharedWork, SharedWorkRequestError } from './shared-work-api';
import { getTeamSession } from './team-session';
const profile = { reviewerId: 'team-alice', claimTypes: ['source_detected'], canWrite: true, storage: { backend: 'file', persistent: true, ready: true } };
const context = { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' };
const draft = { claimType: 'source_detected' as const, status: 'investigate' as const, question: 'DEMO', notes: '', evidenceRequest: '', nextAction: '' };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

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
  const response = json({ works: [] });
  response.json = async () => { started(); await bodyGate; return { works: [] }; };
  const pending = listSharedWork(context, async () => response);
  await bodyStarted;
  await connectSharedWork('DEMO-new-session', async () => json({ ...profile, reviewerId: 'team-bob' }));
  release();
  await expect(pending).rejects.toThrow();
  disconnectSharedWork();
});
