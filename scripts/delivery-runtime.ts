import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface DeliveryTempRuntime {
  backingDir: string;
  tempAlias: string;
  cleanup(): Promise<void>;
}

/**
 * Chromium's Unix domain sockets have a short path limit. Keep the visible
 * TMPDIR alias short while placing its files on the workspace filesystem,
 * which avoids the per-user quota on /tmp during long video captures.
 */
export async function createDeliveryTempRuntime(repoRoot: string): Promise<DeliveryTempRuntime> {
  const runtimeParent = join(resolve(repoRoot), 'delivery-output');
  await mkdir(runtimeParent, { recursive: true });
  const backingDir = await mkdtemp(join(runtimeParent, '.capture-runtime-'));

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const tempAlias = join('/tmp', `mr-${process.pid}-${randomBytes(3).toString('hex')}`);
    try {
      await symlink(backingDir, tempAlias);
      return {
        backingDir,
        tempAlias,
        async cleanup() {
          await rm(tempAlias, { force: true });
          await rm(backingDir, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        await rm(backingDir, { recursive: true, force: true });
        throw error;
      }
    }
  }

  await rm(backingDir, { recursive: true, force: true });
  throw new Error('Could not allocate a unique short Chromium temporary path.');
}
