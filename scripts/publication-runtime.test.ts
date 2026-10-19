import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { issueReviewerToken } from '../apps/api/src/reviewer-auth';

test('publication correction and withdrawal survive real API SIGKILL with private event actors retained', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-publication-runtime-'));
  const probe = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('DEMO') });
  const origin = `http://127.0.0.1:${probe.port!}`; probe.stop(true);
  const path = join(dir, 'audits.json'); const directory = join(dir, 'directory.json');
  const secret = 'DEMO-publication-runtime-' + 'x'.repeat(48);
  const token = issueReviewerToken(secret, 'PRIVATE-runtime-reviewer', ['review', 'private_read'], 600);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  let child: ReturnType<typeof Bun.spawn> | undefined;
  const launch = async () => {
    child = Bun.spawn(['flock', '-n', '-E', '73', '-F', `${path}.writer.lock`, process.execPath, '--no-env-file', resolve('apps/api/src/index.ts')], {
      env: { PATH: process.env.PATH || '', HOST: '127.0.0.1', PORT: new URL(origin).port, WEB_ORIGIN: origin, AUDIT_STORE_PATH: path,
        METHANE_API_WRITER_LOCK: `${path}.writer.lock`, REVIEWER_AUTH_SECRET: secret, REVIEWER_DIRECTORY_PATH: directory }, stdout: 'ignore', stderr: 'ignore',
    });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (await fetch(`${origin}/api/health`).then(r => r.ok, () => false)) return;
      if (child.exitCode !== null) throw new Error('Disposable publication API exited before becoming ready');
      await Bun.sleep(30);
    }
    throw new Error('Disposable publication API did not become ready');
  };
  const kill = async () => { child!.kill('SIGKILL'); await child!.exited; };
  const get = (id: string, suffix = '') => fetch(`${origin}/api/transparency/${id}${suffix}`);
  try {
    await writeFile(directory, JSON.stringify({ schemaVersion: 1, reviewers: [{ reviewerId: 'PRIVATE-runtime-reviewer', organization: 'DEMO',
      checkedBy: 'DEMO-registrar', checkedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', verificationReference: 'DEMO only',
      claimTypes: ['source_detected'], disabled: false }] }), { mode: 0o600 });
    await launch();
    const body = { sourceId: 'DEMO-001', datasetSnapshotId: 'DEMO', claimType: 'source_detected', scope: { startDate: '2026-09-01', endDate: '2026-09-30' },
      claimText: 'PRIVATE DEMO source evidence requires additional checking.', rationale: 'PRIVATE DEMO no independent evidence was supplied for this case.',
      result: 'insufficient_evidence', evidence: [], sourceInspected: true, publicSummaryConsent: true };
    const create = async (extra = {}) => {
      const response = await fetch(`${origin}/api/human-assessments`, { method: 'POST', headers, body: JSON.stringify({ ...body, ...extra }) });
      expect(response.status).toBe(201); return (await response.json()).audit;
    };
    const first = await create(); const initial = await (await get(first.auditId)).json();
    const second = await create({ parentAuditId: first.auditId });
    await kill(); await launch();
    const superseded = await (await get(first.auditId)).json();
    expect(superseded.summaryHash).toBe(initial.summaryHash);
    expect(superseded.publication.status).toBe('superseded');
    expect(superseded.publication.replacementAuditId).toBe(second.auditId);
    const current = await (await get(second.auditId)).json();
    const withdrawn = await fetch(`${origin}/api/transparency/${second.auditId}/withdraw`, { method: 'POST', headers,
      body: JSON.stringify({ expectedVersion: current.publication.version, reason: 'consent_withdrawn' }) });
    expect(withdrawn.status).toBe(200);
    await kill(); await launch();
    const verification = await (await get(second.auditId, '/verify')).json();
    expect(verification.publication.status).toBe('withdrawn');
    expect(verification.summaryHash).toBe(current.summaryHash);
    const list = await (await fetch(`${origin}/api/transparency?sourceId=DEMO-001`)).json();
    expect(list.summaries).toHaveLength(1);
    expect(list.summaries[0].publication.status).toBe('withdrawn');
    expect(JSON.stringify({ list, verification, superseded })).not.toContain('PRIVATE');
    const state = JSON.parse(await readFile(path, 'utf8'));
    expect(state.schemaVersion).toBe(2);
    expect(state.publicationEvents.map((event: any) => event.actorId)).toEqual(Array(4).fill('PRIVATE-runtime-reviewer'));
    expect(state.audits.map((audit: any) => audit.bundleHash)).toEqual([first.bundleHash, second.bundleHash]);
    expect((await fetch(`${origin}/api/audits/${second.auditId}`)).status).toBe(404);
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await child.exited; }
    await rm(dir, { recursive: true, force: true });
  }
}, 25_000);
