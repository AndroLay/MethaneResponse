import { expect, test } from 'bun:test';
import { listCaseWork, readCaseWork, saveCaseWork, type CaseWorkContext } from './case-work';

function storageFixture(): Storage {
  const map = new Map<string, string>();
  return { get length() { return map.size; }, key: index => [...map.keys()][index] || null, getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value); }, removeItem: key => { map.delete(key); }, clear: () => map.clear() };
}
const context: CaseWorkContext = { sourceId: 'KAZ_S_159', datasetSnapshotId: 'snapshot-one', archiveSha256: 'a'.repeat(64), synthetic: false };
const draft = { status: 'investigate' as const, question: 'Was the named operator actually notified?', notes: 'Check receipt and its date.', evidenceRequest: 'Find a dated receipt.', nextAction: 'Inspect the notification register.', claimType: 'operator_notified' as const, scope: { startDate: '2024-06-07', endDate: '2024-12-31', recipient: 'Facility operator' } };

test('saved analyst work can be resumed and is isolated by source, snapshot, archive and mode', () => {
  const storage = storageFixture();
  expect(saveCaseWork(context, draft, 0, storage).ok).toBe(true);
  const saved = readCaseWork(context, storage);
  expect(saved).toMatchObject({ revision: 1, ...draft });
  expect(listCaseWork(context, storage)).toHaveLength(1);
  for (const other of [{ sourceId: 'LBY_S_143' }, { datasetSnapshotId: 'snapshot-two' }, { archiveSha256: 'b'.repeat(64) }, { synthetic: true }]) {
    expect(readCaseWork({ ...context, ...other }, storage)).toBeNull();
  }
  expect(listCaseWork({ ...context, datasetSnapshotId: 'snapshot-two' }, storage)).toHaveLength(0);
});

test('stale tab saves are rejected instead of overwriting newer work', () => {
  const storage = storageFixture();
  saveCaseWork(context, draft, 0, storage);
  expect(saveCaseWork(context, { ...draft, notes: 'Newer note' }, 1, storage).ok).toBe(true);
  expect(saveCaseWork(context, { ...draft, notes: 'Stale note' }, 1, storage)).toMatchObject({ ok: false, reason: 'conflict' });
  expect(readCaseWork(context, storage)?.notes).toBe('Newer note');
});

test('blocked storage and invalid dates are reported without claiming a save', () => {
  const storage = storageFixture();
  storage.setItem = () => { throw new Error('Storage blocked'); };
  expect(saveCaseWork(context, draft, 0, storage)).toMatchObject({ ok: false, reason: 'unavailable' });
  expect(saveCaseWork(context, { ...draft, scope: { startDate: '2026-02-30', endDate: '2026-03-01' } }, 0, storage)).toMatchObject({ ok: false, reason: 'invalid' });
});

test('case work stores only its declared fields and never credentials or audit contents', () => {
  const storage = storageFixture();
  saveCaseWork(context, { ...draft, reviewerToken: 'DO-NOT-STORE', audit: { confidential: true } }, 0, storage);
  const contents = storage.getItem(storage.key(0)!);
  expect(contents).not.toContain('DO-NOT-STORE');
  expect(contents).not.toContain('confidential');
});

test('multiple investigations for one source persist and revise independently', () => {
  const storage = storageFixture();
  const first = { ...context, workId: 'notice-episode' };
  const second = { ...context, workId: 'repair-episode' };
  expect(saveCaseWork(first, draft, 0, storage).ok).toBe(true);
  expect(saveCaseWork(second, { ...draft, claimType: 'mitigation_confirmed', question: 'Was the action verified?' }, 0, storage).ok).toBe(true);
  expect(listCaseWork(context, storage)).toHaveLength(2);
  expect(readCaseWork(first, storage)?.question).toBe(draft.question);
  expect(saveCaseWork(first, { ...draft, notes: 'Notice updated' }, 1, storage).ok).toBe(true);
  expect(readCaseWork(second, storage)?.revision).toBe(1);
});

test('legacy v1 notes remain readable and are retained when upgraded', () => {
  const storage = storageFixture();
  const oldKey = `methane-case-work-v1:${encodeURIComponent(JSON.stringify([context.synthetic, context.datasetSnapshotId, context.archiveSha256]))}:${encodeURIComponent(context.sourceId)}`;
  const old = { ...context, ...draft, version: 1, revision: 3, updatedAt: '2026-10-16T00:00:00.000Z' };
  storage.setItem(oldKey, JSON.stringify(old));
  expect(readCaseWork(context, storage)).toMatchObject({ workId: 'default', revision: 3 });
  expect(saveCaseWork({ ...context, workId: 'default' }, { ...draft, notes: 'Continued legacy work' }, 3, storage).ok).toBe(true);
  expect(listCaseWork(context, storage)).toHaveLength(1);
  expect(readCaseWork(context, storage)).toMatchObject({ version: 2, revision: 4 });
  expect(storage.getItem(oldKey)).toBe(JSON.stringify(old));
});
