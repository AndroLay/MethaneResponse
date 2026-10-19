import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStaticWebHandler } from './static-web';

let root = '';
let outside = '';
let serve: ReturnType<typeof createStaticWebHandler>;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'methane-preview-web-'));
  outside = await mkdtemp(join(tmpdir(), 'methane-preview-outside-'));
  await mkdir(join(root, 'assets'));
  await mkdir(join(root, 'data'));
  await writeFile(join(root, 'index.html'), '<main>preview shell</main>');
  await writeFile(join(root, 'assets', 'app.js'), 'console.log("ok")');
  await writeFile(join(root, 'data', 'snapshot.json.gz'), Buffer.from([0x1f, 0x8b, 0x00, 0x42]));
  await writeFile(join(outside, 'secret.txt'), 'not for the web');
  await symlink(join(outside, 'secret.txt'), join(root, 'secret-link.txt'));
  serve = createStaticWebHandler(root);
});

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  if (outside) await rm(outside, { recursive: true, force: true });
});

describe('same-origin static web handler', () => {
  test('serves root and extensionless deep links from the built SPA', async () => {
    for (const path of ['/', '/dashboard/map?sourceId=KAZ_S_159', '/dashboard/reports']) {
      const response = await serve(new Request(`http://localhost${path}`));
      expect(response?.status).toBe(200);
      expect(await response?.text()).toContain('preview shell');
    }
  });

  test('serves real assets and preserves gzip bytes without Content-Encoding', async () => {
    const asset = await serve(new Request('http://localhost/assets/app.js'));
    expect(asset?.headers.get('content-type')).toContain('text/javascript');
    expect(await asset?.text()).toContain('console.log');

    const gzip = await serve(new Request('http://localhost/data/snapshot.json.gz'));
    expect(gzip?.headers.get('content-type')).toBe('application/gzip');
    expect(gzip?.headers.has('content-encoding')).toBe(false);
    expect([...new Uint8Array(await gzip!.arrayBuffer())]).toEqual([0x1f, 0x8b, 0x00, 0x42]);
  });

  test('rejects traversal, dotfiles, missing assets, symlinks outside the build and write methods', async () => {
    for (const path of ['/../secret.txt', '/%2e%2e/%2e%2e/etc/passwd', '/.env', '/missing.js', '/secret-link.txt']) {
      const response = await serve(new Request(`http://localhost${path}`));
      expect(response?.status).toBe(404);
    }
    expect(await serve(new Request('http://localhost/', { method: 'POST' }))).toBeNull();
    expect(await readFile(join(outside, 'secret.txt'), 'utf8')).toBe('not for the web');
  });

  test('HEAD returns metadata without streaming a body', async () => {
    const response = await serve(new Request('http://localhost/assets/app.js', { method: 'HEAD' }));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe('');
    expect(response?.headers.get('content-length')).toBe(String(Buffer.byteLength('console.log("ok")')));
  });
});
