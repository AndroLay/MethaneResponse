import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { getIntelligenceSnapshot } from '../apps/api/src/intelligence-data';
import { getPlannerCatalog } from '../apps/api/src/investigation-planner-data';
import { FilePlanStore } from '../apps/api/src/plan-store';
import { buildInvestigationPortfolio, compareInvestigationPortfolios } from '../packages/shared/src/investigation-planner';
import { verifyPlanJournal, planJournalHash } from '../packages/shared/src/plan-journal';

if (process.argv.length !== 4 || process.argv[2] !== '--output') throw new Error('Usage: --output NEW_DIRECTORY');
const output = resolve(process.argv[3]); await mkdir(output);
const snapshot = await getIntelligenceSnapshot(), catalog = await getPlannerCatalog(snapshot);
const dataset = { datasetSnapshotId: snapshot.datasetSnapshotId, archiveSha256: snapshot.upstreamArchiveSha256, inputFileSha256: snapshot.inputFileSha256, intelligenceSha256: snapshot.snapshotSha256,
  synthetic: false, provenance: snapshot.sourceProvenance, scope: 'full_snapshot' as const, totalSourceCount: snapshot.sourceCount, archiveStartDate: catalog.archiveStartDate, archiveEndDate: catalog.archiveEndDate };
const parameters = { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] };
const ten = await buildInvestigationPortfolio({ dataset, candidates: catalog.candidates, parameters });
const twenty = await buildInvestigationPortfolio({ dataset, candidates: catalog.candidates, parameters: { ...parameters, capacity: 20 } });
const comparison = await compareInvestigationPortfolios(ten, twenty, 'weighted', 'weighted');
if (comparison.datasetChanged || !comparison.assumptionsChanged || twenty.portfolios[0].selectedIds.length !== 20 || comparison.addedIds.length !== 10) throw new Error('Unexpected real-input allocation comparison');
const temporary = await mkdtemp(join(tmpdir(), 'methane-plan-proof-'));
try {
  const path = join(temporary, 'plans.json'), store = new FilePlanStore(path);
  const decision = { strategy: 'weighted' as const, decision: 'accept' as const, rationale: 'DEMO software fixture: accept a historical allocation for source inspection. No human review or physical outcome is established.' };
  const first = await store.save('DEMO-software-review', ten, decision, 0, null, 'DEMO-software-reviewer');
  const journal = await store.save('DEMO-software-review', twenty, { ...decision, rationale: 'DEMO software fixture: expand capacity to twenty. Original records and document evidence still need inspection; no work is assigned.' }, 1, first.revisions[0].hash, 'DEMO-software-reviewer');
  const reopened = await new FilePlanStore(path).get(journal.planId), head = journal.revisions.at(-1)!.hash;
  if (!reopened || !await verifyPlanJournal(reopened, head)) throw new Error('Restart replay failed');
  const files: Record<string, unknown> = { 'ten.json': ten, 'twenty.json': twenty, 'comparison.json': comparison, 'DEMO-reviewed-history.json': journal };
  const tampered = structuredClone(journal); tampered.revisions.at(-1)!.rationale = 'DEMO changed reasoning which the original fixture did not commit.';
  files['tampered-history.json'] = tampered;
  const { hash: _, ...payload } = tampered.revisions.at(-1)!; tampered.revisions.at(-1)!.hash = await planJournalHash(payload);
  files['tampered-rehashed-history.json'] = structuredClone(tampered);
  // Keep the first edited fixture genuinely unhashed.
  files['tampered-history.json'] = { ...tampered, revisions: [...tampered.revisions.slice(0,-1), { ...tampered.revisions.at(-1)!, hash: head }] };
  // Large replay inputs are compact data artifacts, not additional source-code lines.
  for (const [name, value] of Object.entries(files)) await writeFile(join(output, name), JSON.stringify(value)+'\n', { flag: 'wx' });
  const cases = [
    ['original', ['DEMO-reviewed-history.json', '--expected-head', head], 0],
    ['edited', ['tampered-history.json', '--expected-head', head], 1],
    ['edited-and-rehashed', ['tampered-rehashed-history.json', '--expected-head', head], 1],
    ['wrong-expected-head', ['DEMO-reviewed-history.json', '--expected-head', '0x'+'f'.repeat(64)], 1],
    ['missing-expected-head', ['DEMO-reviewed-history.json'], 1],
    ['unknown-option', ['DEMO-reviewed-history.json', '--expected-head', head, '--skip-replay'], 1],
  ] as const;
  const outcomes = cases.map(([scenario, args, expectedExit]) => {
    const [file, ...flags] = args;
    const run = Bun.spawnSync([process.execPath, '--no-env-file', 'scripts/verify-plan.ts', join(output,file), ...flags], { env: { PATH: process.env.PATH || '' } });
    if (run.exitCode !== expectedExit) throw new Error(`CLI ${scenario} unexpected exit ${run.exitCode}`);
    return { scenario, expectedExit, actualExit: run.exitCode, output: new TextDecoder().decode(run.stdout).trim() || new TextDecoder().decode(run.stderr).trim() };
  });
  await writeFile(join(output, 'verification.json'), JSON.stringify({ recordedAt: new Date().toISOString(), datasetSnapshotId: snapshot.datasetSnapshotId, sourceCount: catalog.candidates.length,
    selectedTen: ten.portfolios[0].selectedIds, selectedTwenty: twenty.portfolios[0].selectedIds, comparison, trustedHead: head, reopenedFileHistoryVerified: true, cli: outcomes,
    limitation: 'Real historical source inputs; reviewer actions are explicit software fixtures, not human research. One snapshot, no actual later-snapshot validation, AI provider or blockchain transaction.' }, null, 2)+'\n', { flag: 'wx' });
  console.log(JSON.stringify({ sourceCount: catalog.candidates.length, selected: [10,20], added: comparison.addedIds.length, cliScenarios: outcomes.length, reopenedFileHistoryVerified: true }));
} finally { await rm(temporary, { recursive: true, force: true }); }
