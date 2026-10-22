import { describe, expect, test } from 'bun:test';
import { freezeRunnerConfig, parseRunnerConfig, assertRunnerConfigMatchesFrozen } from './runner-config';

const localSettings: Record<string, string> = {
  AGENT_LAB_BASE_URL: 'http://127.0.0.1:11434/v1',
  AGENT_LAB_PROVIDER: 'ollama-local',
  AGENT_LAB_MODEL: 'qwen3:8b',
  AGENT_LAB_SEED: '20261021',
  AGENT_LAB_TEMPERATURE: '0',
  AGENT_LAB_TOKEN_CAP: '2400000',
  AGENT_LAB_COST_CAP_USD: '0',
  AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0',
  AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0',
  AGENT_LAB_MAX_CALLS_PER_EPISODE: '12',
  AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '16000',
  AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '1200',
};

describe('agent lab runner configuration', () => {
  test('freezes an exact local model configuration without persisting an API key', () => {
    const runtime = parseRunnerConfig({ ...localSettings, AGENT_LAB_API_KEY: 'local-secret-must-not-be-frozen' });
    const frozen = freezeRunnerConfig(runtime);

    expect(frozen).toEqual({
      browserRunner: 'Playwright Chromium on disposable localhost',
      taskAgent: 'OpenAI-compatible chat-completions tool loop',
      profile: null,
      executor: 'openai-api',
      billingMode: 'api',
      provider: 'ollama-local',
      model: 'qwen3:8b',
      baseUrl: 'http://127.0.0.1:11434/v1',
      seed: '20261021',
      temperature: 0,
      reasoningEffort: null,
      serviceTier: null,
      codexCliVersion: null,
      tokenCap: 2400000,
      costCapUsd: 0,
      inputUsdPer1mTokens: 0,
      outputUsdPer1mTokens: 0,
      maxCallsPerEpisode: 12,
      maxInputTokensPerCall: 16000,
      maxOutputTokensPerCall: 1200,
      remoteProvider: false,
      authorizationConfigured: true,
      apiKeyStored: false,
    });
    expect(JSON.stringify(frozen)).not.toContain('local-secret-must-not-be-frozen');
  });

  test('provides an explicitly selected GPT-6 Luna API preset with a bounded $5 token budget', () => {
    const runtime = parseRunnerConfig({
      AGENT_LAB_PROFILE: 'openai-gpt-6-luna',
      AGENT_LAB_ALLOW_REMOTE: '1',
      AGENT_LAB_API_KEY: 'runtime-only-test-key',
    });
    const frozen = freezeRunnerConfig(runtime);
    expect(frozen).toMatchObject({
      profile: 'openai-gpt-6-luna',
      executor: 'openai-api',
      billingMode: 'api',
      provider: 'openai',
      model: 'gpt-6-luna',
      baseUrl: 'https://api.openai.com/v1',
      seed: '20261021',
      temperature: 0,
      reasoningEffort: 'none',
      serviceTier: 'default',
      tokenCap: 8_000_000,
      costCapUsd: 5,
      inputUsdPer1mTokens: 0.1,
      outputUsdPer1mTokens: 0.5,
      maxCallsPerEpisode: 20,
      maxInputTokensPerCall: 32_000,
      maxOutputTokensPerCall: 2_048,
      remoteProvider: true,
      apiKeyStored: false,
    });
    expect(JSON.stringify(frozen)).not.toContain('runtime-only-test-key');
    expect(() => parseRunnerConfig({ AGENT_LAB_PROFILE: 'openai-gpt-6-luna' })).toThrow('remote provider requires AGENT_LAB_ALLOW_REMOTE=1');
    expect(() => parseRunnerConfig({ AGENT_LAB_PROFILE: 'openai-gpt-6-luna', AGENT_LAB_ALLOW_REMOTE: '1' })).toThrow('requires AGENT_LAB_API_KEY');
  });

  test('freezes GPT-6 Luna Max through the signed-in Codex plan without API credentials or API pricing', () => {
    const runtime = parseRunnerConfig({
      AGENT_LAB_PROFILE: 'codex-cli-gpt-6-luna-max',
      AGENT_LAB_CODEX_VERSION: '0.160.0',
    });
    const frozen = freezeRunnerConfig(runtime);
    expect(frozen).toMatchObject({
      profile: 'codex-cli-gpt-6-luna-max',
      taskAgent: 'Codex CLI with restricted MCP tools',
      provider: 'codex-cli-chatgpt-plan',
      model: 'gpt-6-luna',
      executor: 'codex-cli',
      billingMode: 'chatgpt-plan',
      baseUrl: 'codex://chatgpt-plan',
      seed: null,
      temperature: null,
      reasoningEffort: 'max',
      serviceTier: null,
      codexCliVersion: '0.160.0',
      costCapUsd: 0,
      inputUsdPer1mTokens: 0,
      outputUsdPer1mTokens: 0,
      tokenCap: 100_000_000,
      authorizationConfigured: true,
      apiKeyStored: false,
    });
    expect(() => parseRunnerConfig({ AGENT_LAB_PROFILE: 'codex-cli-gpt-6-luna-max' })).toThrow('AGENT_LAB_CODEX_VERSION');
  });

  test('requires explicit remote-provider opt-in and declared price and cost limits', () => {
    const remote = {
      ...localSettings,
      AGENT_LAB_BASE_URL: 'https://api.example.test/v1',
      AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '2',
      AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '8',
      AGENT_LAB_COST_CAP_USD: '15',
    };
    expect(() => parseRunnerConfig(remote)).toThrow('remote provider requires AGENT_LAB_ALLOW_REMOTE=1');
    expect(() => parseRunnerConfig({ ...remote, AGENT_LAB_ALLOW_REMOTE: '1', AGENT_LAB_COST_CAP_USD: '0' })).toThrow('remote provider requires a positive cost cap');
    expect(parseRunnerConfig({ ...remote, AGENT_LAB_ALLOW_REMOTE: '1' }).remoteProvider).toBe(true);
  });

  test('rejects endpoint credentials and query strings before they can enter frozen metadata', () => {
    expect(() => parseRunnerConfig({ ...localSettings, AGENT_LAB_BASE_URL: 'http://user:pass@127.0.0.1:11434/v1' })).toThrow('must not contain credentials, query or fragment');
    expect(() => parseRunnerConfig({ ...localSettings, AGENT_LAB_BASE_URL: 'http://127.0.0.1:11434/v1?token=secret' })).toThrow('must not contain credentials, query or fragment');
  });

  test('refuses runtime model or budget drift from the frozen protocol', () => {
    const runtime = parseRunnerConfig(localSettings);
    const frozen = freezeRunnerConfig(runtime);
    assertRunnerConfigMatchesFrozen(runtime, frozen);
    expect(() => assertRunnerConfigMatchesFrozen({ ...runtime, model: 'different-model' }, frozen)).toThrow('does not match the frozen runner configuration');
    expect(() => assertRunnerConfigMatchesFrozen({ ...runtime, tokenCap: 2400001 }, frozen)).toThrow('does not match the frozen runner configuration');
  });
});
