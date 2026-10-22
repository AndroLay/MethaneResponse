import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openUsageLedger } from './budget-ledger';
import { parseRunnerConfig } from './runner-config';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

function config(model = 'DEMO-model') {
  return parseRunnerConfig({
    AGENT_LAB_BASE_URL: 'http://127.0.0.1:11434/v1', AGENT_LAB_PROVIDER: 'local-test', AGENT_LAB_MODEL: model,
    AGENT_LAB_SEED: '12', AGENT_LAB_TEMPERATURE: '0', AGENT_LAB_TOKEN_CAP: '10000', AGENT_LAB_COST_CAP_USD: '0',
    AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0', AGENT_LAB_MAX_CALLS_PER_EPISODE: '4',
    AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '1000', AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '100', AGENT_LAB_API_KEY: 'ledger-secret-not-to-store',
  });
}

describe('agent lab usage ledger', () => {
  test('persists only totals and reloads them for a non-rerunning continuation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-agent-ledger-'));
    directories.push(directory);
    const path = join(directory, 'usage-ledger.json');
    const ledger = await openUsageLedger(path, 'agent-practical-usefulness-test-r4', config());
    ledger.budget.totalTokens = 640;
    ledger.budget.costUsd = 0.0125;
    ledger.budget.providerCalls = 3;
    await ledger.persist();

    const saved = await readFile(path, 'utf8');
    expect(saved).not.toContain('ledger-secret-not-to-store');
    const resumed = await openUsageLedger(path, 'agent-practical-usefulness-test-r4', config());
    expect(resumed.budget).toEqual({ totalTokens: 640, costUsd: 0.0125, providerCalls: 3 });
  });

  test('refuses to reuse usage from a different frozen model configuration', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-agent-ledger-'));
    directories.push(directory);
    const path = join(directory, 'usage-ledger.json');
    await openUsageLedger(path, 'agent-practical-usefulness-test-r4', config());
    await expect(openUsageLedger(path, 'agent-practical-usefulness-test-r4', config('OTHER-model'))).rejects.toThrow('usage ledger belongs to a different protocol or runner configuration');
  });
});
