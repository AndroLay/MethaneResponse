import { constants } from 'node:fs';
import { mkdir, open, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/** Canonical parent gives API and maintenance the same stable cooperative lock. */
export async function prepareAuditPath(path: string) {
  await mkdir(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  const canonical = resolve(await realpath(dirname(resolve(path))), resolve(path).split('/').at(-1)!);
  const lock = await open(`${canonical}.writer.lock`, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
  await lock.close();
  return canonical;
}
export async function runWithApiWriterLock(auditPath: string, command: string[], extraEnvironment: Record<string, string> = {}) {
  const child = Bun.spawn(['flock', '-n', '-E', '73', '-F', `${auditPath}.writer.lock`, ...command], {
    env: { ...process.env, ...extraEnvironment, AUDIT_STORE_PATH: auditPath, METHANE_API_WRITER_LOCK: `${auditPath}.writer.lock` },
    stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
  });
  const forwardTerm = () => child.kill('SIGTERM');
  const forwardInt = () => child.kill('SIGINT');
  process.on('SIGTERM', forwardTerm); process.on('SIGINT', forwardInt);
  try { return await child.exited; }
  finally { process.off('SIGTERM', forwardTerm); process.off('SIGINT', forwardInt); }
}
