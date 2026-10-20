import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildInvestigationDossier, investigationDigest } from '../packages/shared/src/investigation-dossier';

test('independent dossier CLI requires a trusted digest and rejects edits, rehashes and unknown flags', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'methane-dossier-cli-'));
  try {
    const context = { sourceId: 'DEMO_SOURCE', synthetic: true, datasetSnapshotId: 'DEMO' };
    const dossier = await buildInvestigationDossier(context, 'DEMO-work', [{ context, workId: 'DEMO-work', revision: 1, ownerId: 'DEMO-reviewer', updatedBy: 'DEMO-reviewer', createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-01-03T00:00:00.000Z', status: 'investigate', claimType: 'source_detected', question: '', notes: 'DEMO original', evidenceRequest: '', nextAction: '' }], { plans: [], transitions: [], assessments: [] });
    const file = join(directory, 'dossier.json'); await Bun.write(file, JSON.stringify(dossier));
    const run = async (args: string[]) => {
      const child = Bun.spawn(['bun','--no-env-file',resolve(import.meta.dir,'verify-investigation.ts'), ...args], { stdout: 'pipe', stderr: 'pipe' });
      const [exit, output] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]); return { exit, output };
    };
    const good = await run([file,'--expected-digest',dossier.digest]); expect(good.exit).toBe(0); expect(JSON.parse(good.output).revisions).toBe(1);
    dossier.history[0].notes = 'DEMO changed'; await Bun.write(file, JSON.stringify(dossier));
    expect((await run([file,'--expected-digest',dossier.digest])).exit).toBe(1);
    const trusted = dossier.digest, { digest: _, ...payload } = dossier; dossier.digest = await investigationDigest(payload); await Bun.write(file, JSON.stringify(dossier));
    expect((await run([file,'--expected-digest',trusted])).exit).toBe(1);
    expect((await run([file])).exit).toBe(1);
    expect((await run([file,'--expected-digest',dossier.digest,'--skip-replay'])).exit).toBe(1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
