import { accessSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';

const FORWARDED_ENVIRONMENT_KEYS = [
  'PATH',
  'HOME',
  'TMPDIR',
  'CI',
  'GITHUB_ACTIONS',
  'RUNNER_ENVIRONMENT',
  'LANG',
  'LC_ALL',
  'TZ',
  'TERM',
  'XDG_CACHE_HOME',
  'PLAYWRIGHT_CHROMIUM_EXECUTABLE',
  'PLAYWRIGHT_BROWSERS_PATH',
  'PLAYWRIGHT_OUTPUT_DIR',
  'METHANE_E2E_API_PORT',
  'METHANE_E2E_WEB_PORT',
  'METHANE_E2E_TEMP_ROOT',
  'METHANE_E2E_MOCK_AI_PORT',
] as const;

export type E2EEnvironmentSource = Record<string, string | undefined>;

/** Software WebGL is required for map coverage, not for reviewer/form captures. */
export function chromiumGraphicsArguments(geospatialSuite: boolean): string[] {
  return geospatialSuite ? ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] : [];
}

/** Exercise shipped assets, without a dev transform server competing with Chromium for memory. */
export function buildE2EWebServerCommand(port: string): string {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid E2E web port');
  return `cd apps/web && NODE_ENV=production bun --no-env-file run build && NODE_ENV=production bun --no-env-file run preview -- --host 127.0.0.1 --port ${port} --strictPort`;
}

/** Hosted Ubuntu blocks Chromium user namespaces. This exception applies only to disposable GitHub-hosted test runners. */
export function chromiumSandboxEnabled(source: E2EEnvironmentSource): boolean {
  return !(source.CI === 'true' && source.GITHUB_ACTIONS === 'true' && source.RUNNER_ENVIRONMENT === 'github-hosted');
}

export function chooseE2ETemporaryRoot(source: E2EEnvironmentSource): string {
  if (source.METHANE_E2E_TEMP_ROOT) return source.METHANE_E2E_TEMP_ROOT;
  if (source.TMPDIR) return source.TMPDIR;
  try {
    accessSync('/dev/shm', constants.W_OK);
    return '/dev/shm';
  } catch {
    return tmpdir();
  }
}

export function buildE2ERunnerEnvironment(source: E2EEnvironmentSource, temporaryRoot: string): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const key of FORWARDED_ENVIRONMENT_KEYS) {
    const value = source[key];
    if (value !== undefined) environment[key] = value;
  }
  environment.TMPDIR = temporaryRoot;
  environment.METHANE_E2E_TEMP_ROOT = temporaryRoot;
  return environment;
}

const BASELINE_SPEC = 'e2e/audit-workflow.spec.ts';
const AI_SPEC = 'e2e/ai-review-workflow.spec.ts';

function matchesSpecArgument(argument: string, spec: string): boolean {
  const normalized = argument.replaceAll('\\', '/').replace(/^\.\//, '');
  return normalized === spec || normalized.endsWith(`/${spec}`);
}

export function routeE2EArguments(arguments_: string[]): { baseline?: string[]; ai?: string[] } {
  const hasBaseline = arguments_.some(argument => matchesSpecArgument(argument, BASELINE_SPEC));
  const hasAi = arguments_.some(argument => matchesSpecArgument(argument, AI_SPEC));

  if (hasBaseline && !hasAi) return { baseline: arguments_ };
  if (hasAi && !hasBaseline) return { ai: arguments_ };

  const commonArguments = arguments_.filter(argument =>
    !matchesSpecArgument(argument, BASELINE_SPEC) && !matchesSpecArgument(argument, AI_SPEC));
  return {
    ...(hasBaseline ? { baseline: [BASELINE_SPEC, ...commonArguments] } : { baseline: arguments_ }),
    ...(hasAi ? { ai: [AI_SPEC, ...commonArguments] } : { ai: arguments_ }),
  };
}
