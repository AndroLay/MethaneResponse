import { constants } from 'node:fs';
import { copyFile, open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { caseWorkMarkerPath, caseWorkStatePath, readCaseWorkState, writeCaseWorkState } from '../apps/api/src/case-work-file';
import { prepareAuditPath, runWithApiWriterLock } from './api-writer-lock';

async function durableCopy(source: string, target: string) {
  await copyFile(source, target, constants.COPYFILE_EXCL);
  const file = await open(target, constants.O_RDWR | constants.O_NOFOLLOW);
  try { await file.chmod(0o600); await file.sync(); } finally { await file.close(); }
  const directory = await open(dirname(target), constants.O_RDONLY | constants.O_DIRECTORY);
  try { await directory.sync(); } finally { await directory.close(); }
}
try {
  const [mode, auditArgument, backupArgument, ...flags] = process.argv.slice(2);
  if (!['backup', 'restore'].includes(mode) || !auditArgument || !backupArgument || flags.some(flag => !['--confirm-restore', '--under-lock'].includes(flag))) throw new Error('Invalid command');
  if (mode === 'restore' && !flags.includes('--confirm-restore')) throw new Error('Restore requires explicit confirmation');
  const auditPath = await prepareAuditPath(resolve(auditArgument));
  const backupPath = resolve(backupArgument);
  if (!flags.includes('--under-lock')) {
    process.exit(await runWithApiWriterLock(auditPath, [process.execPath, '--no-env-file', import.meta.path, mode, auditPath, backupPath, ...flags, '--under-lock']));
  }
  if (process.env.METHANE_API_WRITER_LOCK !== `${auditPath}.writer.lock`) throw new Error('Writer lock is required');
  const statePath = caseWorkStatePath(auditPath);
  if ([statePath, caseWorkMarkerPath(statePath), auditPath, `${auditPath}.writer.lock`].includes(backupPath)) throw new Error('Invalid backup target');
  if (mode === 'backup') {
    await readCaseWorkState(statePath);
    await durableCopy(statePath, backupPath);
  } else {
    const replacement = await readCaseWorkState(backupPath);
    // Preserve the exact current bytes even when corruption is the reason for restoring.
    try { await durableCopy(statePath, `${statePath}.before-restore-${randomUUID()}`); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await writeCaseWorkState(statePath, replacement);
  }
  process.stdout.write(`${mode} completed; private casework only.\n`);
} catch {
  process.stderr.write('Casework maintenance failed. API must be stopped; verify paths, private file permissions, schema and confirmation. No audit bundle is modified.\n');
  process.exit(1);
}
