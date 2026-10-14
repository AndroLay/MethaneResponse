export const DEFAULT_DEV_API_PROXY_TARGET = 'http://localhost:3001';

export function resolveDevApiProxyTarget(value: string | undefined): string {
  const configured = value?.trim();
  if (!configured) return DEFAULT_DEV_API_PROXY_TARGET;

  let target: URL;
  try {
    target = new URL(configured);
  } catch {
    throw new Error('METHANE_API_PROXY_TARGET must be an HTTP(S) origin without credentials or a path');
  }

  if ((target.protocol !== 'http:' && target.protocol !== 'https:')
    || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('METHANE_API_PROXY_TARGET must be an HTTP(S) origin without credentials or a path');
  }

  return target.origin;
}
