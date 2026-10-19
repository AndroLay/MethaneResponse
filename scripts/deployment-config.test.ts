import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const renderConfig = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
const pinnedBunVersion = (await readFile(new URL('../.bun-version', import.meta.url), 'utf8')).trim();
const ciConfig = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('Render deploys the locked Bun workspace reproducibly', () => {
  expect(renderConfig).toMatch(/buildCommand: command -v flock[^\n]*bun install --frozen-lockfile[^\n]*bun run build:web/);
  expect(renderConfig).toContain(`value: ${pinnedBunVersion}`);
  expect(ciConfig).toContain(`bun-version: ${pinnedBunVersion}`);
  expect(renderConfig).toContain('startCommand: cd apps/api && bun run start');
  expect(renderConfig).toContain('healthCheckPath: /api/health');
  expect(renderConfig).toContain('name: methaneresponse-preview');
  expect(renderConfig).toContain('plan: free');
  expect(renderConfig).toContain('region: singapore');
  expect(renderConfig).toContain('autoDeployTrigger: off');
});

test('Render preview explicitly uses temporary file state and narrowly enables public baseline mode', () => {
  expect(renderConfig).toContain('key: AUDIT_STORE_PATH\n        value: /tmp/methane-response-preview/audits.json');
  expect(renderConfig).toContain('key: NODE_ENV\n        value: production');
  expect(renderConfig).toContain('key: METHANE_PUBLIC_PREVIEW\n        value: "true"');
  expect(renderConfig).not.toContain('DATABASE_URL');
  expect(renderConfig).not.toContain('RATE_LIMIT_HASH_SECRET');
  expect(renderConfig).not.toContain('VITE_');
  expect(renderConfig).not.toContain('ENABLE_PUBLIC_BASELINE_AUDITS');
  expect(renderConfig).not.toContain('ADMIN_API_TOKEN');
  expect(renderConfig).not.toContain('HUMAN_REVIEW_TOKEN');
  expect(renderConfig).not.toContain('SEPOLIA_PRIVATE_KEY');
});
