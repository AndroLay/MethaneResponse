import { defineConfig } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { buildE2ERunnerEnvironment, buildE2EWebServerCommand, chooseE2ETemporaryRoot, chromiumSandboxEnabled } from './scripts/e2e-runner-utils';

const originalEnvironment = { ...process.env };
const temporaryRoot = chooseE2ETemporaryRoot(originalEnvironment);
const stateDirectory = mkdtempSync(join(temporaryRoot, 'methane-agent-lab-run-'));
const isolatedViteEnvironmentDirectory = join(stateDirectory, 'vite-env');
mkdirSync(isolatedViteEnvironmentDirectory);
const apiPort = originalEnvironment.METHANE_AGENT_LAB_API_PORT || '43153';
const webPort = originalEnvironment.METHANE_AGENT_LAB_WEB_PORT || '4193';
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const chromiumExecutable = originalEnvironment.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const isCI = originalEnvironment.CI || '';

const forwardedEnvironment = buildE2ERunnerEnvironment(originalEnvironment, temporaryRoot);
for (const name of Object.keys(process.env)) delete process.env[name];
Object.assign(process.env, forwardedEnvironment);
process.env.AGENT_LAB_APP_ORIGIN = webUrl;
for (const name of ['CODEX_HOME', 'CODEX_SQLITE_HOME']) {
  const value = originalEnvironment[name];
  if (value !== undefined) process.env[name] = value;
}
for (const key of [
  'AGENT_LAB_PROFILE', 'AGENT_LAB_BASE_URL', 'AGENT_LAB_PROVIDER', 'AGENT_LAB_MODEL', 'AGENT_LAB_API_KEY', 'AGENT_LAB_SEED', 'AGENT_LAB_TEMPERATURE',
  'AGENT_LAB_TOKEN_CAP', 'AGENT_LAB_COST_CAP_USD', 'AGENT_LAB_INPUT_USD_PER_1M_TOKENS', 'AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS',
  'AGENT_LAB_MAX_CALLS_PER_EPISODE', 'AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL', 'AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL', 'AGENT_LAB_ALLOW_REMOTE', 'AGENT_LAB_CODEX_VERSION',
]) {
  const value = originalEnvironment[key];
  if (value !== undefined) process.env[key] = value;
}

// The application servers receive only isolated local-test settings. Provider credentials stay in the Playwright worker process.
const isolatedEnvironment = {
  ...forwardedEnvironment,
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

process.on('exit', () => rmSync(stateDirectory, { recursive: true, force: true }));

export default defineConfig({
  testDir: './e2e/agent-lab',
  testMatch: /sealed-runner-r12\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(isCI),
  retries: 0,
  workers: 1,
  maxFailures: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  reporter: 'list',
  outputDir: originalEnvironment.PLAYWRIGHT_AGENT_LAB_OUTPUT_DIR || '.playwright-cli/agent-lab-sealed-results',
  use: {
    baseURL: webUrl,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      chromiumSandbox: chromiumSandboxEnabled(forwardedEnvironment),
      ...(chromiumExecutable ? { executablePath: chromiumExecutable } : {}),
      args: [],
    },
  },
  projects: [{ name: 'chromium-agent', use: { browserName: 'chromium' } }],
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
