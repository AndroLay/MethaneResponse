import { defineConfig } from '@playwright/test';
import { accessSync, constants, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function resolveTemporaryRoot(): string {
  if (process.env.METHANE_E2E_TEMP_ROOT) return process.env.METHANE_E2E_TEMP_ROOT;
  try {
    accessSync('/dev/shm', constants.W_OK);
    return '/dev/shm';
  } catch {
    return tmpdir();
  }
}

const temporaryRoot = resolveTemporaryRoot();
const stateDirectory = mkdtempSync(join(temporaryRoot, 'methane-response-e2e-'));
const outputDirectory = process.env.PLAYWRIGHT_OUTPUT_DIR || '.playwright-cli/e2e-results';
const apiPort = process.env.METHANE_E2E_API_PORT || '43139';
const webPort = process.env.METHANE_E2E_WEB_PORT || '4179';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const inheritedNonSecretEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !/(TOKEN|KEY|SECRET|PASSWORD|RPC_URL|DATABASE_URL)/i.test(name) && !/^VITE_/i.test(name)),
);

const isolatedEnvironment = {
  ...inheritedNonSecretEnvironment,
  TMPDIR: temporaryRoot,
  CI: process.env.CI || '',
  NODE_ENV: 'development',
  DATABASE_URL: '',
  TEST_DATABASE_URL: '',
  AUDIT_STORE_PATH: join(stateDirectory, 'audits.json'),
  AI_BASE_URL: '',
  AI_API_KEY: '',
  AI_MODEL: '',
  AI_REVIEW_TOKEN: '',
  HUMAN_REVIEW_TOKEN: '',
  HUMAN_REVIEWER_ID: '',
  REVIEWER_AUTH_SECRET: '',
  ADMIN_API_TOKEN: '',
  SEPOLIA_RPC_URL: '',
  AUDIT_REGISTRY_ADDRESS: '',
  SEPOLIA_PRIVATE_KEY: '',
  RATE_LIMIT_HASH_SECRET: '',
};

process.on('exit', () => {
  rmSync(stateDirectory, { recursive: true, force: true });
});

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  outputDir: outputDirectory,
  use: {
    baseURL: webUrl,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
      args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'bun run dev:api',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...isolatedEnvironment,
        HOST: '127.0.0.1',
        PORT: apiPort,
        WEB_ORIGIN: webUrl,
      },
    },
    {
      command: `cd apps/web && bun run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webUrl,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...isolatedEnvironment,
        METHANE_API_PROXY_TARGET: apiUrl,
      },
    },
  ],
});
