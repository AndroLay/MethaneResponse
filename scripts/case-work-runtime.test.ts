import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';

test('real API sessions retain team state after process crash and the kernel releases the writer lock', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-team-runtime-'));
  const reservation = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('fixture') });
  const port = reservation.port!; reservation.stop(true);
  const origin = `http://127.0.0.1:${port}`;
  const audit = join(dir, 'audits.json');
  const directory = join(dir, 'directory.json');
  const secret = 'DEMO-runtime-test-only-' + 'x'.repeat(40);
  const token = issueReviewerToken(secret, 'runtime-alice', ['review', 'private_read'], 600);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const launch = () => Bun.spawn(['flock', '-n', '-E', '73', '-F', `${audit}.writer.lock`, process.execPath, '--no-env-file', resolve('apps/api/src/index.ts')], { env: { PATH: process.env.PATH || '', HOST: '127.0.0.1', PORT: String(port), WEB_ORIGIN: origin, AUDIT_STORE_PATH: audit, METHANE_API_WRITER_LOCK: `${audit}.writer.lock`, REVIEWER_AUTH_SECRET: secret, REVIEWER_DIRECTORY_PATH: directory }, stdout: 'ignore', stderr: 'pipe' });
  const waitReady = async () => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await fetch(`${origin}/api/health`).then(response => response.ok, () => false)) return;
      await Bun.sleep(30);
    }
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Isolated API exited ${child.exitCode}: ${(await new Response(child.stderr as ReadableStream).text()).slice(0, 1000)}`);
    throw new Error('Isolated API stayed alive but health could not be reached on loopback');
  };
  try {
    await writeFile(directory, JSON.stringify({ schemaVersion: 1, reviewers: [{ reviewerId: 'runtime-alice', organization: 'DEMO test', checkedBy: 'runtime-registrar', checkedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', verificationReference: 'DEMO runtime fixture', claimTypes: ['source_detected'], disabled: false }] }), { mode: 0o600 });
    child = launch(); await waitReady();
    const created = await fetch(`${origin}/api/case-work/runtime`, { method: 'PUT', headers, body: JSON.stringify({ context: { sourceId: 'DEMO-001', synthetic: true, datasetSnapshotId: 'DEMO' }, expectedRevision: 0, draft: { claimType: 'source_detected', status: 'awaiting_evidence', question: 'DEMO crash recovery', notes: '', evidenceRequest: 'DEMO receipt', nextAction: 'DEMO inspect receipt' } }) });
    expect(created.status).toBe(201);
    child.kill('SIGKILL'); await child.exited;
    child = launch(); await waitReady();
    const loaded = await fetch(`${origin}/api/case-work/runtime?sourceId=DEMO-001&datasetSnapshotId=DEMO&synthetic=true`, { headers });
    expect(loaded.status).toBe(200);
    expect((await loaded.json()).work).toMatchObject({ revision: 1, ownerId: 'runtime-alice', nextAction: 'DEMO inspect receipt', status: 'awaiting_evidence' });
    const concurrent = launch();
    expect(await concurrent.exited).toBe(73);
    expect((await fetch(`${origin}/api/health`)).status).toBe(200);
  } finally {
    if (child) { child.kill('SIGTERM'); await child.exited; }
    await rm(dir, { recursive: true, force: true });
  }
}, 20_000);
