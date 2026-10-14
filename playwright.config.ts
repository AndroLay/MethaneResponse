import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildE2ERunnerEnvironment, chooseE2ETemporaryRoot } from './scripts/e2e-runner-utils';

const temporaryRoot = chooseE2ETemporaryRoot(process.env);
const stateDirectory = mkdtempSync(join(temporaryRoot, 'methane-response-e2e-'));
const isolatedViteEnvironmentDirectory = join(stateDirectory, 'vite-env');
mkdirSync(isolatedViteEnvironmentDirectory);
const outputDirectory = process.env.PLAYWRIGHT_OUTPUT_DIR || '.playwright-cli/e2e-results';
const apiPort = process.env.METHANE_E2E_API_PORT || '43139';
const webPort = process.env.METHANE_E2E_WEB_PORT || '4179';
const mockAiEnabled = process.env.METHANE_E2E_AI_MOCK === '1';
const mockAiPort = process.env.METHANE_E2E_MOCK_AI_PORT || '43140';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const mockAiUrl = `http://127.0.0.1:${mockAiPort}`;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const mockAiAccessToken = mockAiEnabled ? process.env.METHANE_E2E_AI_ACCESS_TOKEN || '' : '';
const mockReviewerSecret = mockAiEnabled ? process.env.METHANE_E2E_REVIEWER_SECRET || '' : '';
const mockProviderApiKey = mockAiEnabled ? randomBytes(24).toString('hex') : '';

if (mockAiEnabled && (mockAiAccessToken.length < 32 || mockReviewerSecret.length < 32)) {
  throw new Error('The AI E2E runner must provide ephemeral access and reviewer credentials before Playwright starts.');
}

const workerEnvironment = buildE2ERunnerEnvironment(process.env, temporaryRoot);
for (const name of Object.keys(process.env)) delete process.env[name];
Object.assign(process.env, workerEnvironment);
if (mockAiEnabled) {
  process.env.METHANE_E2E_AI_MOCK = '1';
  process.env.METHANE_E2E_AI_ACCESS_TOKEN = mockAiAccessToken;
  process.env.METHANE_E2E_REVIEWER_SECRET = mockReviewerSecret;
}

const isolatedEnvironment = {
  ...workerEnvironment,
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
  testMatch: mockAiEnabled ? /ai-review-workflow\.spec\.ts/ : /audit-workflow\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
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
    ...(mockAiEnabled ? [{
      command: 'bun --no-env-file scripts/e2e-mock-ai-provider.ts',
      url: `${mockAiUrl}/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...isolatedEnvironment,
        METHANE_E2E_MOCK_AI_PORT: mockAiPort,
        METHANE_E2E_MOCK_PROVIDER_KEY: mockProviderApiKey,
      },
    }] : []),
    {
      command: 'bun --no-env-file --hot apps/api/src/index.ts',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...isolatedEnvironment,
        HOST: '127.0.0.1',
        PORT: apiPort,
        WEB_ORIGIN: webUrl,
        AI_REVIEW_TOKEN: mockAiEnabled ? mockAiAccessToken : '',
        REVIEWER_AUTH_SECRET: mockAiEnabled ? mockReviewerSecret : '',
        ...(mockAiEnabled ? {
          AI_BASE_URL: `${mockAiUrl}/v1`,
          AI_API_KEY: mockProviderApiKey,
          AI_MODEL: 'methane-response-e2e-mock-v1',
        } : {}),
      },
    },
    {
      command: `cd apps/web && bun --no-env-file run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: webUrl,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        ...isolatedEnvironment,
        METHANE_API_PROXY_TARGET: apiUrl,
        METHANE_E2E_ISOLATED_ENV_DIR: isolatedViteEnvironmentDirectory,
      },
    },
  ],
});
