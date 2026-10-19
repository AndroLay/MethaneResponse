import { expect, test } from 'bun:test';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileCaseWorkStore, writeCaseWorkState } from './case-work-file';
import { CaseWorkState, type CaseWorkState as State } from './case-work';
import { MemoryCaseWorkStore } from './case-work';

const context = { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' };
const draft = { claimType: 'source_detected' as const, status: 'investigate' as const, question: 'DEMO question', notes: 'Original', evidenceRequest: '', nextAction: '' };

test('shared work and immutable actor history survive reopening and reject parallel stale revisions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-store-'));
  try {
    const path = join(dir, 'state.json');
    const store = new FileCaseWorkStore(path);
    await store.save(context, 'episode', draft, 0, 'team-alice');
    const reopened = new FileCaseWorkStore(path);
    const results = await Promise.allSettled(['team-bob', 'team-alice'].map(actor => reopened.save(context, 'episode', { ...draft, notes: actor }, 1, actor)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await reopened.history(context, 'episode')).map(item => [item.revision, item.updatedBy, item.ownerId])).toEqual([[1, 'team-alice', 'team-alice'], [2, 'team-bob', 'team-alice']]);
    expect((await store.history(context, 'episode'))[0].notes).toBe('Original');
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(CaseWorkState.safeParse(JSON.parse(await readFile(path, 'utf8'))).success).toBe(true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('corrupt, forged history and permissive file modes fail closed without overwriting the file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-corrupt-'));
  try {
    const path = join(dir, 'state.json');
    const store = new FileCaseWorkStore(path);
    await writeFile(path, '{damaged', { mode: 0o600 });
    expect((await store.status()).ready).toBe(false);
    await expect(store.save(context, 'episode', draft, 0, 'team-alice')).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe('{damaged');
    await rm(path);
    await store.save(context, 'episode', draft, 0, 'team-alice');
    const state: State = JSON.parse(await readFile(path, 'utf8'));
    state.histories[0][0].revision = 7;
    await writeFile(path, JSON.stringify(state));
    expect((await store.status()).ready).toBe(false);
    await writeFile(path, JSON.stringify({ schemaVersion: 1, histories: [] }));
    await chmod(path, 0o644);
    expect((await store.status()).ready).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('failed persistence and revoked authorization never acknowledge or commit a new revision', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-failure-'));
  class FailingStore extends FileCaseWorkStore {
    fail = false;
    protected override async writeState(state: State) {
      if (this.fail) throw Object.assign(new Error('Injected ENOSPC'), { code: 'ENOSPC' });
      await super.writeState(state);
    }
  }
  try {
    const path = join(dir, 'state.json');
    const store = new FailingStore(path);
    await store.save(context, 'episode', draft, 0, 'team-alice');
    const before = await readFile(path, 'utf8');
    store.fail = true;
    await expect(store.save(context, 'episode', { ...draft, notes: 'Must not be committed' }, 1, 'team-bob')).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe(before);
    store.fail = false;
    await expect(store.save(context, 'episode', draft, 1, 'team-bob', async () => { throw new Error('Revoked before commit'); })).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe(before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('missing acknowledged state fails closed across restart until an explicit restore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-missing-'));
  try {
    const path = join(dir, 'state.json');
    const store = new FileCaseWorkStore(path);
    await store.save(context, 'episode', draft, 0, 'team-alice');
    const backup: State = JSON.parse(await readFile(path, 'utf8'));
    await rm(path);
    expect((await store.status()).ready).toBe(false);
    await expect(store.save(context, 'replacement', draft, 0, 'team-bob')).rejects.toThrow();
    const reopened = new FileCaseWorkStore(path);
    expect((await reopened.status()).ready).toBe(false);
    await expect(reopened.save(context, 'replacement', draft, 0, 'team-bob')).rejects.toThrow();
    await writeCaseWorkState(path, backup);
    expect((await reopened.status()).ready).toBe(true);
    expect((await reopened.history(context, 'episode'))[0].ownerId).toBe('team-alice');
    await chmod(`${path}.initialized`, 0o644);
    expect((await reopened.status()).ready).toBe(false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('revision capacity rejects writes while retaining every acknowledged version', async () => {
  const store = new MemoryCaseWorkStore();
  for (let expected = 0; expected < 100; expected++) await store.save(context, 'bounded', draft, expected, 'team-alice');
  await expect(store.save(context, 'bounded', draft, 100, 'team-alice')).rejects.toThrow('capacity');
  expect((await store.history(context, 'bounded')).map(item => item.revision)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
});
