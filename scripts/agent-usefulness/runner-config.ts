export type RunnerConfig = {
  profile: 'openai-gpt-6-luna' | 'codex-cli-gpt-6-luna-max' | null;
  executor: 'openai-api' | 'codex-cli';
  billingMode: 'api' | 'chatgpt-plan';
  baseUrl: string;
  provider: string;
  model: string;
  /** Runtime only. Never write this value to evidence or logs. */
  apiKey?: string;
  seed: string | null;
  temperature: number | null;
  reasoningEffort: 'none' | 'max' | null;
  serviceTier: 'default' | null;
  codexCliVersion: string | null;
  tokenCap: number;
  costCapUsd: number;
  inputUsdPer1mTokens: number;
  outputUsdPer1mTokens: number;
  maxCallsPerEpisode: number;
  maxInputTokensPerCall: number;
  maxOutputTokensPerCall: number;
  remoteProvider: boolean;
  authorizationConfigured: boolean;
};

export type FrozenRunnerConfig = Omit<RunnerConfig, 'apiKey'> & {
  browserRunner: 'Playwright Chromium on disposable localhost';
  taskAgent: 'OpenAI-compatible chat-completions tool loop' | 'Codex CLI with restricted MCP tools';
  apiKeyStored: false;
};

type Environment = Record<string, string | undefined>;

function required(env: Environment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function configuredOrDefault(env: Environment, defaults: Environment, key: string) {
  const value = env[key]?.trim() || defaults[key]?.trim();
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function numberSetting(env: Environment, key: string, options: { integer?: boolean; min: number; max: number }) {
  const raw = required(env, key);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < options.min || value > options.max || options.integer && !Number.isSafeInteger(value)) {
    throw new Error(`${key} must be ${options.integer ? 'an integer' : 'a number'} between ${options.min} and ${options.max}`);
  }
  return value;
}

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function safeLabel(value: string, key: string) {
  if (value.length > 160 || /[\r\n\0]/.test(value)) throw new Error(`${key} must be a single-line label of at most 160 characters`);
  return value;
}

/** Parse explicit runner settings; credentials remain only in this runtime object. */
export function parseRunnerConfig(env: Environment): RunnerConfig {
  const profileValue = env.AGENT_LAB_PROFILE?.trim() || null;
  if (profileValue && profileValue !== 'openai-gpt-6-luna' && profileValue !== 'codex-cli-gpt-6-luna-max') throw new Error(`Unsupported AGENT_LAB_PROFILE: ${profileValue}`);
  const profile = profileValue as RunnerConfig['profile'];
  const codexProfile = profile === 'codex-cli-gpt-6-luna-max';
  const defaults: Environment = codexProfile ? {
    AGENT_LAB_BASE_URL: 'codex://chatgpt-plan',
    AGENT_LAB_PROVIDER: 'codex-cli-chatgpt-plan',
    AGENT_LAB_MODEL: 'gpt-6-luna',
    AGENT_LAB_TOKEN_CAP: '100000000',
    AGENT_LAB_COST_CAP_USD: '0',
    AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0',
    AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0',
    AGENT_LAB_MAX_CALLS_PER_EPISODE: '120',
    AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '200000',
    AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '16384',
  } : profile ? {
    AGENT_LAB_BASE_URL: 'https://api.openai.com/v1',
    AGENT_LAB_PROVIDER: 'openai',
    AGENT_LAB_MODEL: 'gpt-6-luna',
    AGENT_LAB_SEED: '20261021',
    AGENT_LAB_TEMPERATURE: '0',
    AGENT_LAB_TOKEN_CAP: '8000000',
    AGENT_LAB_COST_CAP_USD: '5',
    AGENT_LAB_INPUT_USD_PER_1M_TOKENS: '0.10',
    AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS: '0.50',
    AGENT_LAB_MAX_CALLS_PER_EPISODE: '20',
    AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL: '32000',
    AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL: '2048',
  } : {};
  const baseUrlInput = configuredOrDefault(env, defaults, 'AGENT_LAB_BASE_URL');
  let url: URL;
  let remoteProvider = false;
  if (codexProfile) {
    if (baseUrlInput !== 'codex://chatgpt-plan') throw new Error('codex-cli-gpt-6-luna-max profile pins baseUrl=codex://chatgpt-plan');
    url = new URL(baseUrlInput);
  } else {
    try {
      url = new URL(baseUrlInput);
    } catch {
      throw new Error('AGENT_LAB_BASE_URL must be an absolute HTTP(S) URL');
    }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('AGENT_LAB_BASE_URL must be an absolute HTTP(S) URL');
    if (url.username || url.password || url.search || url.hash) throw new Error('AGENT_LAB_BASE_URL must not contain credentials, query or fragment');
    remoteProvider = !isLoopback(url.hostname);
    const allowRemote = env.AGENT_LAB_ALLOW_REMOTE === '1';
    if (remoteProvider && !allowRemote) throw new Error('remote provider requires AGENT_LAB_ALLOW_REMOTE=1');
    if (remoteProvider && url.protocol !== 'https:') throw new Error('remote provider endpoint must use HTTPS');
  }

  const provider = safeLabel(configuredOrDefault(env, defaults, 'AGENT_LAB_PROVIDER'), 'AGENT_LAB_PROVIDER');
  const model = safeLabel(configuredOrDefault(env, defaults, 'AGENT_LAB_MODEL'), 'AGENT_LAB_MODEL');
  if (profile === 'openai-gpt-6-luna' && (provider !== 'openai' || model !== 'gpt-6-luna')) throw new Error('openai-gpt-6-luna profile pins provider=openai and model=gpt-6-luna');
  if (codexProfile && (provider !== 'codex-cli-chatgpt-plan' || model !== 'gpt-6-luna')) throw new Error('codex-cli-gpt-6-luna-max profile pins provider=codex-cli-chatgpt-plan and model=gpt-6-luna');
  const seed = codexProfile ? null : safeLabel(configuredOrDefault(env, defaults, 'AGENT_LAB_SEED'), 'AGENT_LAB_SEED');
  if (seed !== null && (!/^\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)) || Number(seed) > 2_147_483_647)) {
    throw new Error('AGENT_LAB_SEED must be an integer between 0 and 2147483647');
  }
  const temperature = codexProfile ? null : Number(configuredOrDefault(env, defaults, 'AGENT_LAB_TEMPERATURE'));
  if (temperature !== null && (!Number.isFinite(temperature) || temperature < 0 || temperature > 2)) throw new Error('AGENT_LAB_TEMPERATURE must be a number between 0 and 2');
  const withDefaults = { ...defaults, ...env };
  const tokenCap = numberSetting(withDefaults, 'AGENT_LAB_TOKEN_CAP', { integer: true, min: 1, max: 100_000_000 });
  const costCapUsd = numberSetting(withDefaults, 'AGENT_LAB_COST_CAP_USD', { min: 0, max: 100_000 });
  const inputUsdPer1mTokens = numberSetting(withDefaults, 'AGENT_LAB_INPUT_USD_PER_1M_TOKENS', { min: 0, max: 100_000 });
  const outputUsdPer1mTokens = numberSetting(withDefaults, 'AGENT_LAB_OUTPUT_USD_PER_1M_TOKENS', { min: 0, max: 100_000 });
  const maxCallsPerEpisode = numberSetting(withDefaults, 'AGENT_LAB_MAX_CALLS_PER_EPISODE', { integer: true, min: 1, max: 180 });
  const maxInputTokensPerCall = numberSetting(withDefaults, 'AGENT_LAB_MAX_INPUT_TOKENS_PER_CALL', { integer: true, min: 256, max: 200_000 });
  const maxOutputTokensPerCall = numberSetting(withDefaults, 'AGENT_LAB_MAX_OUTPUT_TOKENS_PER_CALL', { integer: true, min: 64, max: 16_384 });
  if (remoteProvider && costCapUsd <= 0) throw new Error('remote provider requires a positive cost cap');
  if (remoteProvider && (inputUsdPer1mTokens <= 0 || outputUsdPer1mTokens <= 0)) throw new Error('remote provider requires positive declared input and output prices');
  const apiKey = env.AGENT_LAB_API_KEY?.trim() || undefined;
  if (apiKey && /[\r\n\0]/.test(apiKey)) throw new Error('AGENT_LAB_API_KEY must be a single-line value');
  if (profile === 'openai-gpt-6-luna' && !apiKey) throw new Error('openai-gpt-6-luna profile requires AGENT_LAB_API_KEY');
  if (codexProfile && !env.AGENT_LAB_CODEX_VERSION?.trim()) throw new Error('Missing AGENT_LAB_CODEX_VERSION');

  return {
    profile,
    executor: codexProfile ? 'codex-cli' : 'openai-api',
    billingMode: codexProfile ? 'chatgpt-plan' : 'api',
    baseUrl: codexProfile ? baseUrlInput : url.href.replace(/\/$/, ''),
    provider,
    model,
    ...(!codexProfile && apiKey ? { apiKey } : {}),
    seed,
    temperature,
    reasoningEffort: codexProfile ? 'max' : profile ? 'none' : null,
    serviceTier: profile === 'openai-gpt-6-luna' ? 'default' : null,
    codexCliVersion: codexProfile ? safeLabel(env.AGENT_LAB_CODEX_VERSION!.trim(), 'AGENT_LAB_CODEX_VERSION') : null,
    tokenCap,
    costCapUsd,
    inputUsdPer1mTokens,
    outputUsdPer1mTokens,
    maxCallsPerEpisode,
    maxInputTokensPerCall,
    maxOutputTokensPerCall,
    remoteProvider,
    authorizationConfigured: codexProfile || Boolean(apiKey),
  };
}

/** The public freeze contains provider identity and limits, never credential bytes. */
export function freezeRunnerConfig(config: RunnerConfig): FrozenRunnerConfig {
  return {
    browserRunner: 'Playwright Chromium on disposable localhost',
    taskAgent: config.executor === 'codex-cli' ? 'Codex CLI with restricted MCP tools' : 'OpenAI-compatible chat-completions tool loop',
    profile: config.profile,
    executor: config.executor,
    billingMode: config.billingMode,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    seed: config.seed,
    temperature: config.temperature,
    reasoningEffort: config.reasoningEffort,
    serviceTier: config.serviceTier,
    codexCliVersion: config.codexCliVersion,
    tokenCap: config.tokenCap,
    costCapUsd: config.costCapUsd,
    inputUsdPer1mTokens: config.inputUsdPer1mTokens,
    outputUsdPer1mTokens: config.outputUsdPer1mTokens,
    maxCallsPerEpisode: config.maxCallsPerEpisode,
    maxInputTokensPerCall: config.maxInputTokensPerCall,
    maxOutputTokensPerCall: config.maxOutputTokensPerCall,
    remoteProvider: config.remoteProvider,
    authorizationConfigured: config.authorizationConfigured,
    apiKeyStored: false,
  };
}

export function assertRunnerConfigMatchesFrozen(config: RunnerConfig, frozen: unknown) {
  if (JSON.stringify(freezeRunnerConfig(config)) !== JSON.stringify(frozen)) {
    throw new Error('runtime runner configuration does not match the frozen runner configuration');
  }
}
