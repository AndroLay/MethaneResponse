import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.gz': 'application/gzip',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
const spaRoutes = new Set([
  '/',
  '/dashboard',
  '/dashboard/map',
  '/dashboard/indicators',
  '/dashboard/cases',
  '/dashboard/audit',
  '/dashboard/documents',
  '/dashboard/blockchain',
  '/dashboard/reports',
  '/dashboard/operators',
  '/dashboard/settings',
]);

function within(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (!isAbsolute(rel) && !rel.startsWith(`..${sep}`) && rel !== '..');
}

function safePathSegments(pathname: string): string[] | null {
  let decoded: string;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (decoded.includes('\0') || decoded.includes('\\')) return null;
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(segment => segment === '.' || segment === '..' || segment.startsWith('.'))) return null;
  return segments;
}

/** Serve only files below the built Vite directory, with extensionless SPA fallback. */
export function createStaticWebHandler(webRoot: string) {
  const configuredRoot = resolve(webRoot);

  return async function serveStaticWeb(request: Request): Promise<Response | null> {
    if (request.method !== 'GET' && request.method !== 'HEAD') return null;
    const url = new URL(request.url);
    const segments = safePathSegments(url.pathname);
    if (!segments) return new Response('Not found', { status: 404 });

    let root: string;
    try { root = await realpath(configuredRoot); } catch { return null; }

    const requested = resolve(root, ...segments);
    if (!within(root, requested)) return new Response('Not found', { status: 404 });

    let filePath = requested;
    try {
      let resolvedPath = await realpath(filePath);
      if (!within(root, resolvedPath)) return new Response('Not found', { status: 404 });
      let info = await stat(resolvedPath);
      if (info.isDirectory()) {
        resolvedPath = await realpath(resolve(resolvedPath, 'index.html'));
        if (!within(root, resolvedPath)) return new Response('Not found', { status: 404 });
        info = await stat(resolvedPath);
      }
      if (!info.isFile()) return new Response('Not found', { status: 404 });
      filePath = resolvedPath;
    } catch {
      // A missing extension-bearing path is an asset 404, never an HTML response.
      const normalizedRoute = `/${segments.join('/')}`;
      if (extname(segments.at(-1) || '') || !spaRoutes.has(normalizedRoute)) return new Response('Not found', { status: 404 });
      filePath = resolve(root, 'index.html');
      try {
        const resolvedIndex = await realpath(filePath);
        if (!within(root, resolvedIndex) || !(await stat(resolvedIndex)).isFile()) return null;
        filePath = resolvedIndex;
      } catch { return null; }
    }

    const info = await stat(filePath);
    const extension = extname(filePath).toLowerCase();
    const isHtml = extension === '.html';
    const isHashedAsset = filePath.includes(`${sep}assets${sep}`);
    const headers = new Headers({
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
      'Content-Length': String(info.size),
      'Cache-Control': isHtml ? 'no-cache' : isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    });
    // Keep verified .gz snapshot bytes encoded as a file, without HTTP Content-Encoding.
    if (request.method === 'HEAD') return new Response(null, { headers });
    const nodeStream = createReadStream(filePath);
    return new Response(Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>, { headers });
  };
}
