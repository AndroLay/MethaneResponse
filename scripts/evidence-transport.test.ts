import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('real TLS transport pins the checked IP, validates hostname, bounds bytes and refuses redirects', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-reference-tls-'));
  let server: ReturnType<typeof Bun.serve> | undefined;
  try {
    const key = join(dir, 'key.pem'); const cert = join(dir, 'cert.pem');
    const generate = Bun.spawn(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '1', '-subj', '/CN=publisher-fixture.invalid', '-addext', 'subjectAltName=DNS:publisher-fixture.invalid'], { stdout: 'ignore', stderr: 'ignore' });
    expect(await generate.exited).toBe(0);
    let redirectedRequests = 0;
    server = Bun.serve({ hostname: '127.0.0.1', port: 0, tls: { key: await readFile(key), cert: await readFile(cert) }, fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === '/redirect') return new Response(null, { status: 302, headers: { location: '/target' } });
      if (path === '/target') redirectedRequests++;
      if (path === '/large') return new Response('a'.repeat(2 * 1024 * 1024 + 1));
      if (path === '/slow') return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('DEMO incomplete response')); } }));
      return new Response('DEMO official bytes', { headers: { 'content-type': 'application/pdf' } });
    } });
    const modulePath = resolve('apps/api/src/evidence-check.ts');
    const script = `import { retrievePublisherReference } from ${JSON.stringify(modulePath)};
const root = 'https://publisher-fixture.invalid:${server.port}';
const results = [];
for (const path of ['/record.pdf', '/redirect', '/large', '/slow']) {
  try { results.push(await retrievePublisherReference(root + path, '127.0.0.1', 4)); }
  catch { results.push({ rejected: true }); }
}
try { await retrievePublisherReference('https://wrong-fixture.invalid:${server.port}/record.pdf', '127.0.0.1', 4); results.push({ badHostnameAccepted: true }); }
catch { results.push({ badHostnameRejected: true }); }
process.stdout.write(JSON.stringify(results));`;
    const child = Bun.spawn([process.execPath, '--no-env-file', '-e', script], { env: { PATH: process.env.PATH, NODE_EXTRA_CA_CERTS: cert }, stdout: 'pipe', stderr: 'pipe' });
    const output = await new Response(child.stdout).text();
    const errors = await new Response(child.stderr).text();
    expect(await child.exited).toBe(0);
    expect(errors).toBe('');
    const results = JSON.parse(output);
    expect(results[0].status).toBe(200);
    expect(results[0].sha256).toBe(createHash('sha256').update('DEMO official bytes').digest('hex'));
    expect(results[1].status).toBe(302);
    expect(redirectedRequests).toBe(0);
    expect(results[2].rejected).toBe(true);
    expect(results[3].rejected).toBe(true);
    expect(results[4].badHostnameRejected).toBe(true);
  } finally { server?.stop(true); await rm(dir, { recursive: true, force: true }); }
}, 20_000);
