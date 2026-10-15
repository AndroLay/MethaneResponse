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

test('Render preview uses file persistence and has no database settings', () => {
  expect(renderConfig).toMatch(/key: WEB_ORIGIN\s+sync: false/);
  expect(renderConfig).toContain('key: AUDIT_STORE_PATH\n        value: /tmp/methane-response-audits.json');
  expect(renderConfig).toContain('key: NODE_ENV\n        value: production');
  expect(renderConfig).not.toContain('DATABASE_URL');
  expect(renderConfig).not.toContain('RATE_LIMIT_HASH_SECRET');
  expect(renderConfig).not.toContain('VITE_');
});
