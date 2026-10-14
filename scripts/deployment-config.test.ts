import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const renderConfig = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
const pinnedBunVersion = (await readFile(new URL('../.bun-version', import.meta.url), 'utf8')).trim();
const ciConfig = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('Render deploys the locked Bun workspace reproducibly', () => {
  expect(renderConfig).toContain('buildCommand: bun install --frozen-lockfile');
  expect(renderConfig).toContain(`value: ${pinnedBunVersion}`);
  expect(ciConfig).toContain(`bun-version: ${pinnedBunVersion}`);
  expect(renderConfig).toContain('startCommand: cd apps/api && bun run start');
  expect(renderConfig).toContain('healthCheckPath: /api/health');
});

test('Render keeps persistence, CORS origin, and rate-limit secret as dashboard values', () => {
  for (const key of ['DATABASE_URL', 'WEB_ORIGIN', 'RATE_LIMIT_HASH_SECRET']) {
    expect(renderConfig).toMatch(new RegExp(`key: ${key}\\s+sync: false`));
  }
  expect(renderConfig).toContain('key: NODE_ENV\n        value: production');
  expect(renderConfig).not.toContain('VITE_');
});
