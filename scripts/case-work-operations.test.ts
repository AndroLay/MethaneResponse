import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { FileCaseWorkStore } from '../apps/api/src/case-work-file';

const context = { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' };
const draft = { claimType: 'source_detected' as const, status: 'investigate' as const, question: 'DEMO', notes: '', evidenceRequest: '', nextAction: '' };
test('offline backup and restore preserve history, refuse overwrites, and respect an active writer lock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-ops-'));
  const audit = join(dir, 'audits.json');
  const state = `${audit}.case-work.json`;
  const backup = join(dir, 'backup.json');
  const run = (args: string[]) => Bun.spawnSync([process.execPath, '--no-env-file', resolve('scripts/case-work-maintenance.ts'), ...args], { env: { PATH: process.env.PATH || '' }, stdout: 'pipe', stderr: 'pipe' });
  let lock: ReturnType<typeof Bun.spawn> | undefined;
  try {
    const store = new FileCaseWorkStore(state);
    await store.save(context, 'episode', draft, 0, 'team-alice');
    expect(run(['backup', audit, backup]).exitCode).toBe(0);
    const first = await readFile(state, 'utf8');
    expect(await readFile(backup, 'utf8')).toBe(first);
    expect(run(['backup', audit, backup]).exitCode).not.toBe(0);
    await store.save(context, 'episode', { ...draft, notes: 'Later revision' }, 1, 'team-bob');
    expect(run(['restore', audit, backup]).exitCode).not.toBe(0);
    expect(run(['restore', audit, backup, '--confirm-restore']).exitCode).toBe(0);
    expect(await readFile(state, 'utf8')).toBe(first);
    expect((await store.history(context, 'episode'))[0].ownerId).toBe('team-alice');
    const bad = join(dir, 'bad.json');
    await writeFile(bad, '{broken', { mode: 0o600 });
    expect(run(['restore', audit, bad, '--confirm-restore']).exitCode).not.toBe(0);
    expect(await readFile(state, 'utf8')).toBe(first);
    lock = Bun.spawn(['flock', '-n', `${audit}.writer.lock`, 'sh', '-c', 'printf ready; read task_input'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
    const reader = (lock.stdout as ReadableStream<Uint8Array>).getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('ready');
    reader.releaseLock();
    expect(run(['backup', audit, join(dir, 'blocked.json')]).exitCode).toBe(73);
    const launcher = Bun.spawnSync([process.execPath, '--no-env-file', resolve('scripts/start-api.ts')], { env: { PATH: process.env.PATH || '', AUDIT_STORE_PATH: audit }, stdout: 'pipe', stderr: 'pipe', timeout: 5000 });
    expect(launcher.exitCode).toBe(73);
  } finally {
    if (lock) { (lock.stdin as import('bun').FileSink).end(); await lock.exited; }
    await rm(dir, { recursive: true, force: true });
  }
});
