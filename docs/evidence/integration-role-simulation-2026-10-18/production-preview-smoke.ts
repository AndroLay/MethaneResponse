// Bounded serving check of an existing build. No browser rendering or public deployment.
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const output = process.argv[2];
if (!output) throw Error('Usage: bun --no-env-file production-preview-smoke.ts NEW_OUTPUT_PATH (from repo root, after build:web)');
// Parent fetches must be isolated too; a host proxy can otherwise intercept loopback.
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete process.env[name];
const root = process.cwd();
const dir = await mkdtemp(join(tmpdir(), 'methane-production-preview-'));
const probe = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('DEMO reservation') });
const port = probe.port!; probe.stop(true);
const origin = `http://127.0.0.1:${port}`;
const child = Bun.spawn([process.execPath, '--no-env-file', resolve('apps/web/node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: resolve('apps/web'), env: { PATH: process.env.PATH || '', METHANE_E2E_ISOLATED_ENV_DIR: dir }, stdout: 'pipe', stderr: 'pipe',
});
const outputText = new Response(child.stdout).text(); const errorText = new Response(child.stderr).text();
let completed = false;
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
try {
  let ready = false;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (await fetch(origin).then(r => r.ok, () => false)) { ready = true; break; }
    if (child.exitCode !== null) throw Error(`DEMO preview exited ${child.exitCode}`);
    await Bun.sleep(30);
  }
  if (!ready) throw Error('DEMO preview readiness timeout');
  const localIndex = await readFile(join(root, 'apps/web/dist/index.html'), 'utf8');
  const rows = [];
  for (const path of ['/', '/dashboard/auditor']) {
    const response = await fetch(origin + path);
    const html = await response.text();
    if (response.status !== 200 || html !== localIndex) throw Error('Production index/deep route mismatch');
    rows.push({ path, status: response.status, sha256: sha(html) });
  }
  const entry = localIndex.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
  if (!entry) throw Error('Build entry module missing');
  for (const path of [entry, '/data/mars-snapshot-manifest.json']) {
    const response = await fetch(origin + path);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (response.status !== 200 || sha(bytes) !== sha(await readFile(join(root, 'apps/web/dist', path)))) throw Error('Served build asset mismatch');
    if (path === entry && !/javascript/.test(response.headers.get('content-type') || '')) throw Error('Entry MIME is not JavaScript');
    rows.push({ path, status: response.status, sha256: sha(bytes) });
  }
  await writeFile(output, JSON.stringify({ label: 'Actual local Vite production preview; not public hosting', recordedAt: new Date().toISOString(),
    checks: rows, publicDeploymentVerified: false, browserRenderingVerified: false,
    limitations: ['API production process, state and CORS tested separately.', 'No public DNS, TLS termination, hosting filesystem or reverse proxy verified.'] }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  completed = true;
} finally {
  child.kill('SIGTERM'); await child.exited;
  if (!completed) process.stderr.write(((await outputText) + (await errorText)).slice(0, 1200));
  await rm(dir, { recursive: true, force: true });
}
