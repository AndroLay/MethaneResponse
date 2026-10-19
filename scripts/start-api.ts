import { resolve } from 'node:path';
import { auditStatePath } from '../apps/api/src/case-work-file';
import { prepareAuditPath, runWithApiWriterLock } from './api-writer-lock';

try {
  const auditPath = await prepareAuditPath(auditStatePath());
  const args = process.argv.slice(2);
  if (args.some(value => value !== '--hot')) throw new Error('Unsupported API argument');
  process.exit(await runWithApiWriterLock(auditPath, [process.execPath, '--no-env-file', ...args, resolve(import.meta.dir, '../apps/api/src/index.ts')]));
} catch {
  process.stderr.write('API could not start. Check the state directory and availability of flock.\n');
  process.exit(1);
}
