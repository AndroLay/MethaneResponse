import { defineConfig } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildE2ERunnerEnvironment, buildE2EWebServerCommand, chooseE2ETemporaryRoot, chromiumSandboxEnabled } from './scripts/e2e-runner-utils';

// Instrumentation only: this config runs a scripted browser actor, not an AI
// agent. Its output is evidence that the application flow works; it is never
// scored as an agent episode.
const temporaryRoot = chooseE2ETemporaryRoot(process.env);
const stateDirectory = mkdtempSync(join(temporaryRoot, 'methane-agent-lab-'));
const isolatedViteEnvironmentDirectory = join(stateDirectory, 'vite-env');
mkdirSync(isolatedViteEnvironmentDirectory);
const outputDirectory = process.env.PLAYWRIGHT_OUTPUT_DIR || '.playwright-cli/agent-lab-results';
const apiPort = process.env.METHANE_E2E_API_PORT || '43149';
const webPort = process.env.METHANE_E2E_WEB_PORT || '4189';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const isCI = process.env.CI || '';

const workerEnvironment = buildE2ERunnerEnvironment(process.env, temporaryRoot);
for (const name of Object.keys(process.env)) delete process.env[name];
Object.assign(process.env, workerEnvironment);

const isolatedEnvironment = {
  ...workerEnvironment,
  TMPDIR: temporaryRoot,
  CI: isCI,
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
  REVIEWER_DIRECTORY_PATH: '',
  REQUIRE_ATTESTED_HUMAN_REVIEWERS: '',
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
  testDir: './e2e/agent-lab',
  testMatch: /plan-dry-run-r12\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(isCI),
  retries: 0,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  outputDir: outputDirectory,
  use: {
    baseURL: webUrl,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      chromiumSandbox: chromiumSandboxEnabled(workerEnvironment),
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
      args: [],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'bun --no-env-file scripts/start-api.ts',
      url: `${apiUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      env: { ...isolatedEnvironment, HOST: '127.0.0.1', PORT: apiPort, WEB_ORIGIN: webUrl },
    },
    {
      command: buildE2EWebServerCommand(webPort),
      url: webUrl,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        ...isolatedEnvironment,
        METHANE_API_PROXY_TARGET: apiUrl,
        METHANE_E2E_ISOLATED_ENV_DIR: isolatedViteEnvironmentDirectory,
      },
    },
  ],
});
