import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createApp } from '../apps/api/src/app';
import { MemoryAuditStore } from '../apps/api/src/store';
import { getIntelligenceSnapshot } from '../apps/api/src/intelligence-data';
import { verifyInvestigationPortfolio, plannerCanonical, type InvestigationPortfolio } from '../packages/shared/src/investigation-planner';

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const args = process.argv.slice(2);
if (args[0] === '--verify' && args[1]) {
  if (!(args.length === 2 || args.length === 4 && args[2] === '--expected-digest' && /^0x[a-f0-9]{64}$/.test(args[3]))) throw new Error('Use --verify FILE [--expected-digest 0xSHA256]; unknown or incomplete flags are rejected.');
  if ((await stat(args[1])).size > 8_000_000) throw new Error('Replay file exceeds 8 MB');
  const report = JSON.parse(await readFile(args[1], 'utf8'));
  const expected = args[2] === '--expected-digest' ? args[3] : undefined;
  if (!await verifyInvestigationPortfolio(report, expected)) { process.stderr.write('INVALID checksum, policy replay or expected commitment\n'); process.exit(1); }
  process.stdout.write('VALID_POLICY_REPLAY — unsigned allocation, not proof of climate benefit or authentic data origin\n'); process.exit(0);
}
if (args[0] !== '--output' || !args[1] || args.length !== 2) throw new Error('Usage: --output NEW_DIRECTORY | --verify FILE [--expected-digest HEX]');
const directory = resolve(args[1]); await mkdir(directory);
const snapshot = await getIntelligenceSnapshot(), api = createApp(new MemoryAuditStore());
const scenarios = [
  { name: 'global-ten', capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] },
  { name: 'global-fifty', capacity: 50, maxPerCountry: 3, recurrenceWeight: 70, countries: [], sectors: [] },
  { name: 'kazakhstan-quota', capacity: 10, maxPerCountry: 1, recurrenceWeight: 50, countries: ['Kazakhstan'], sectors: [] },
  { name: 'waste-ten', capacity: 10, maxPerCountry: 2, recurrenceWeight: 30, countries: [], sectors: ['Waste'] },
  { name: 'empty-scope', capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: ['NOT A PUBLISHER COUNTRY'], sectors: [] },
];
const summary: unknown[] = [];
for (const { name, ...parameters } of scenarios) {
  const started = performance.now();
  const response = await api.request('/api/investigations/portfolios', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, parameters }) });
  const text = await response.text(), report = JSON.parse(text) as InvestigationPortfolio;
  if (response.status !== 200 || !await verifyInvestigationPortfolio(report)) throw new Error('Portfolio verification failed');
  const elapsedMs = performance.now() - started;
  await writeFile(join(directory, name + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  const oracle = spawnSync('python3', ['services/data-pipeline/investigation_plan_oracle.py', join(directory, name + '.json'), 'apps/web/public/data/mars-snapshot.json.gz'], { encoding: 'utf8' });
  if (oracle.status !== 0) throw new Error('Independent-language conformance failed: ' + oracle.stderr.slice(-1000));
  if (name === 'global-ten') {
    const changed = structuredClone(report); changed.portfolios[0].selectedIds.reverse();
    if (await verifyInvestigationPortfolio(changed)) throw new Error('Edited allocation accepted');
    const { digest: _, ...payload } = changed;
    changed.digest = '0x' + hash(plannerCanonical(payload));
    if (await verifyInvestigationPortfolio(changed) || await verifyInvestigationPortfolio(report, '0x' + '0'.repeat(64))) throw new Error('Untrusted commitment accepted');
  }
  summary.push({ name, elapsedMs: Math.round(elapsedMs), responseBytes: Buffer.byteLength(text), digest: report.digest,
    eligibleCount: report.eligibleCount, portfolios: report.portfolios, oracle: JSON.parse(oracle.stdout) });
}
if ((await (await api.request('/api/audits')).json()).audits.length) throw new Error('Allocation created an audit');
const paths = [
  'packages/shared/src/investigation-planner.ts', 'packages/shared/package.json', 'apps/api/src/investigation-planner-data.ts', 'apps/api/src/investigation-planner.test.ts',
  'apps/api/src/app.ts', 'apps/api/src/observation-archive.ts', 'apps/api/src/rate-limit.ts', 'apps/web/src/InvestigationPlanner.tsx', 'apps/web/src/investigation-planner.ts',
  'apps/web/src/investigation-planner.test.ts', 'apps/web/src/investigation-planner.css', 'apps/web/src/CasesWorkspace.tsx', 'apps/web/src/App.tsx',
  'e2e/audit-workflow.spec.ts', 'e2e/ai-review-workflow.spec.ts', 'playwright.config.ts',
  'scripts/e2e-runner-utils.ts', 'scripts/e2e-runner-utils.test.ts', 'scripts/run-e2e.ts',
  'services/data-pipeline/investigation_plan_oracle.py', 'services/data-pipeline/tests/test_investigation_plan_oracle.py',
  'scripts/investigation-planner-proof.ts', 'scripts/tsconfig.evaluation.json', 'package.json',
  'packages/shared/src/index.ts', 'packages/shared/src/evidence-policy.ts', 'packages/shared/src/observation-claims.ts',
  'apps/api/src/intelligence-data.ts', 'apps/api/src/public-preview.ts', 'apps/web/src/use-session-draft.ts',
];
const sourceSha256: Record<string, string> = {};
for (const path of paths) sourceSha256[path] = hash(await readFile(path));
const baseline = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
await writeFile(join(directory, 'verification.json'), JSON.stringify({ recordedAt: new Date().toISOString(), baselineCommit: baseline.stdout.trim(),
  scope: 'Local allocation conformance; not a user study, prospective model evaluation or demonstrated climate benefit',
  sourceSha256, scenarios: summary, tamperChecks: ['edited output rejected', 'edited + rehashed output rejected by policy replay', 'wrong expected digest rejected'],
  savedAudits: 0, limitation: 'Elapsed times are one local process run including HTTP serialization and replay, not production latency or device benchmarks.' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ directory, scenarios: scenarios.length, sourcesPerScenario: snapshot.sourceCount, independentLanguageConformance: true }));
