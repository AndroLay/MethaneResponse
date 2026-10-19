import { constants } from 'node:fs';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CaseWorkError, CaseWorkState, MemoryCaseWorkStore } from './case-work';

export const MAX_CASE_WORK_BYTES = 16 * 1024 * 1024;
export function auditStatePath() { return resolve(process.env.AUDIT_STORE_PATH || resolve(import.meta.dir, '../../../data/state/audits.json')); }
export function caseWorkStatePath(auditPath = auditStatePath()) { return `${resolve(auditPath)}.case-work.json`; }
export function writerLockPath(auditPath = auditStatePath()) { return `${resolve(auditPath)}.writer.lock`; }
export function caseWorkMarkerPath(path: string) { return `${path}.initialized`; }
const markerContents = 'methane-response-case-work-v1\n';

async function hasInitializationMarker(path: string): Promise<boolean> {
  try {
    const file = await open(caseWorkMarkerPath(path), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size !== Buffer.byteLength(markerContents) || (info.mode & 0o077) !== 0 || await file.readFile('utf8') !== markerContents) throw new CaseWorkError('unavailable');
      return true;
    } finally { await file.close(); }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function readCaseWorkState(path: string): Promise<CaseWorkState> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_CASE_WORK_BYTES || (info.mode & 0o077) !== 0) throw new CaseWorkError('unavailable');
    const text = await file.readFile('utf8');
    if (Buffer.byteLength(text) > MAX_CASE_WORK_BYTES) throw new CaseWorkError('unavailable');
    return CaseWorkState.parse(JSON.parse(text));
  } finally { await file.close(); }
}

/** Caller owns the API writer lock. Acknowledgment follows file and directory fsync. */
export async function writeCaseWorkState(path: string, state: CaseWorkState) {
  const contents = JSON.stringify(CaseWorkState.parse(state));
  if (Buffer.byteLength(contents) > MAX_CASE_WORK_BYTES) throw new CaseWorkError('capacity');
  const initialized = await hasInitializationMarker(path);
  await atomicPrivateWrite(path, contents);
  // Before acknowledging the first revision, record that a missing state is data loss.
  // The marker survives process restarts; it cannot detect loss of the entire volume.
  if (!initialized) await atomicPrivateWrite(caseWorkMarkerPath(path), markerContents);
}

async function atomicPrivateWrite(path: string, contents: string) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(contents, 'utf8'); await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
    const directory = await open(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY);
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

export class FileCaseWorkStore extends MemoryCaseWorkStore {
  private observedState = false;
  constructor(readonly path: string) { super(); }
  protected override async readState(): Promise<CaseWorkState> {
    try {
      const initialized = await hasInitializationMarker(this.path);
      try {
        const state = await readCaseWorkState(this.path);
        this.observedState = true;
        return state;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT' && !initialized && !this.observedState) return { schemaVersion: 1, histories: [] };
        throw error;
      }
    }
    catch (error) {
      throw new CaseWorkError('unavailable');
    }
  }
  protected override async writeState(state: CaseWorkState) { await writeCaseWorkState(this.path, state); }
  override async status(): Promise<{ backend: 'file'; persistent: boolean; ready: boolean }> {
    try { await this.readState(); return { backend: 'file', persistent: true, ready: true }; }
    catch { return { backend: 'file', persistent: true, ready: false }; }
  }
}
