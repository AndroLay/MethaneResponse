import { expect, test } from 'bun:test';
import { realpath } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createDeliveryTempRuntime } from './delivery-runtime';

const repoRoot = new URL('..', import.meta.url).pathname;

test('temporary Chromium paths are short aliases backed by workspace storage and clean up safely', async () => {
  const runtime = await createDeliveryTempRuntime(repoRoot);
  let stateDir = '';
  try {
    expect(runtime.tempAlias.length).toBeLessThan(36);
    expect(await realpath(runtime.tempAlias)).toBe(await realpath(runtime.backingDir));
    stateDir = await mkdtemp(join(runtime.tempAlias, 'state-'));
    expect(stateDir.startsWith(runtime.tempAlias)).toBe(true);
    expect(stateDir.length).toBeLessThan(64);
  } finally {
    if (stateDir) await rm(stateDir, { recursive: true, force: true });
    await runtime.cleanup();
  }
  await expect(realpath(runtime.tempAlias)).rejects.toThrow();
});
