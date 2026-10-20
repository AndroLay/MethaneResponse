import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { decisionChallenges, verifyDecisionPlan, type DecisionPlan } from '../packages/shared/src/decision-lab';
import { createApp } from '../apps/api/src/app';
import { MemoryAuditStore } from '../apps/api/src/store';
import { getIntelligenceSnapshot } from '../apps/api/src/intelligence-data';
import { evidenceRequestMarkdown } from '../apps/web/src/decision-lab';

const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const save = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const args = process.argv.slice(2);
if (args[0] === '--verify' && args[1]) {
  if ((await stat(args[1])).size > 8_000_000) throw new Error('Decision file exceeds 8 MB');
  const value = JSON.parse(await readFile(args[1], 'utf8'));
  const expected = args[2] === '--expected-digest' ? args[3] : undefined;
  if ((expected && expected !== value.digest) || !await verifyDecisionPlan(value)) {
    process.stderr.write('INVALID decision checksum, policy replay or expected commitment\n'); process.exit(1);
  }
  process.stdout.write('VALID_POLICY_REPLAY — unsigned; publisher authenticity and physical repair are not established\n');
  process.exit(0);
}
if (args[0] !== '--output' || !args[1] || args.length !== 2) throw new Error('Usage: bun --no-env-file scripts/decision-lab-proof.ts --output NEW_DIRECTORY | --verify FILE [--expected-digest HEX]');
const directory = resolve(args[1]);
await mkdir(directory); // Refuse overwrite of a frozen run.
const api = createApp(new MemoryAuditStore());
const snapshot = await getIntelligenceSnapshot();
const summaries: { sourceId: string; claimType: string; result: string; excluded: number; digest: string }[] = [];
for (const sourceId of ['KAZ_S_159', 'LBY_S_143', 'CAN_S_002']) {
  const row = snapshot.sources.find(item => item.sourceId === sourceId);
  if (!row) throw new Error('Required historical source missing');
  const days = row.observationTimestamps.map(value => value.slice(0, 10)).sort();
  for (const claimType of ['source_detected', 'mitigation_confirmed']) {
    const input = { sourceId, claimType, datasetSnapshotId: snapshot.datasetSnapshotId,
      scope: { startDate: days[0], endDate: days.at(-1)! } };
    const request = (path: string) => api.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const response = await request('/api/investigations/plan');
    if (response.status !== 200) throw new Error('Decision route failed');
    const plan = await response.json() as DecisionPlan;
    const expected = claimType === 'source_detected' ? 'supported' : 'insufficient_evidence';
    if (plan.result !== expected || plan.synthetic || !await verifyDecisionPlan(plan)) throw new Error('Unexpected historical policy result');
    const baselineResponse = await request('/api/audits');
    if (baselineResponse.status !== 201 || (await baselineResponse.json()).result !== plan.result) throw new Error('Decision Lab differs from saved baseline');
    const stem = sourceId + '-' + claimType;
    await save(join(directory, stem + '.json'), plan);
    await writeFile(join(directory, stem + '-request.md'), evidenceRequestMarkdown(plan), { flag: 'wx' });
    summaries.push({ sourceId, claimType, result: plan.result, excluded: plan.summary.excluded, digest: plan.digest });
  }
}
const challenges = await decisionChallenges();
for (const item of challenges) await save(join(directory, 'DEMO-' + item.id + '.json'), item.plan);
const edited = structuredClone(challenges[0].plan);
edited.nextChecks[0].acceptance = 'Controlled changed acceptance condition';
if (await verifyDecisionPlan(edited)) throw new Error('Changed plan passed verification');
const sourcePaths = [
  'package.json', 'scripts/tsconfig.evaluation.json',
  'packages/shared/src/decision-lab.ts', 'packages/shared/package.json',
  'apps/api/src/app.ts', 'apps/api/src/rate-limit.ts', 'apps/api/src/decision-lab.test.ts',
  'apps/web/src/decision-lab.ts', 'apps/web/src/decision-lab.test.ts',
  'apps/web/src/DecisionLabPanel.tsx', 'apps/web/src/decision-lab.css',
  'apps/web/src/EvidenceAuditorWorkflow.tsx', 'apps/web/src/investigation-tools.css',
  'playwright.config.ts', 'scripts/e2e-runner-utils.ts', 'scripts/e2e-runner-utils.test.ts',
  'scripts/chain-integration.test.ts', 'scripts/decision-lab-proof.ts', 'e2e/audit-workflow.spec.ts',
];
const files: Record<string, string> = {};
for (const path of sourcePaths) files[path] = hash(await readFile(path));
const baseline = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
await save(join(directory, 'verification.json'), {
  recordedAt: new Date().toISOString(), scope: 'Local prototype decision explanation and policy replay; not independent scientific validation',
  baselineCommit: baseline.status === 0 ? baseline.stdout.trim() : null,
  workingTreeSourceSha256: files, datasetSnapshotId: snapshot.datasetSnapshotId,
  upstreamArchiveSha256: snapshot.upstreamArchiveSha256,
  historical: summaries, authoredChallenges: challenges.map(item => ({ id: item.id, result: item.plan.result, digest: item.plan.digest })),
  modifiedPlan: 'REJECTED', savedBaselineParity: '6 of 6',
  providerExecution: 'none', publicChain: 'not verified', humanImpact: 'not measured',
});
process.stdout.write('6 historical decisions, 5 authored challenges, baseline parity and changed-plan rejection verified locally\n');
