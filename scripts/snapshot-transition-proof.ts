import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { buildSnapshotTransition, transitionDigest, transitionPage } from '../packages/shared/src/snapshot-transition';
import { readTransitionSnapshot, historicalTransitionPaths, TransitionManifest } from '../apps/api/src/snapshot-transition-data';
import { getIntelligenceSnapshot } from '../apps/api/src/intelligence-data';
import { getPlannerCatalog } from '../apps/api/src/investigation-planner-data';
import { buildInvestigationPortfolio } from '../packages/shared/src/investigation-planner';

if (process.argv.length !== 4 || process.argv[2] !== '--output') throw new Error('Usage: --output NEW_DIRECTORY');
const output = resolve(process.argv[3]); await mkdir(output);
const manifest = TransitionManifest.parse(JSON.parse(await readFile(historicalTransitionPaths.manifest, 'utf8')));
const before = await readTransitionSnapshot(historicalTransitionPaths.before, manifest.before.inputFileSha256), after = await readTransitionSnapshot(historicalTransitionPaths.after, manifest.after.inputFileSha256);
const report = await buildSnapshotTransition(before, after);
if (report.digest !== manifest.reportDigest) throw new Error('Offline replay differs from the pinned report commitment');
const original = join(output, 'historical-change-report.json'), editedPath = join(output, 'edited-report.json'), rehashedPath = join(output, 'edited-rehashed-report.json');
await writeFile(original, JSON.stringify(report), { flag: 'wx' });
const edited = structuredClone(report); edited.observationChanges.find(row => row.after !== null)!.after!.fluxKgHr = 123456;
await writeFile(editedPath, JSON.stringify(edited), { flag: 'wx' });
const { digest: _, ...payload } = edited; edited.digest = await transitionDigest(payload);
await writeFile(rehashedPath, JSON.stringify(edited), { flag: 'wx' });
const argumentsFor = (file: string, expectedReport = report.digest, expectedBefore = manifest.before.inputFileSha256) => [file, '--before', historicalTransitionPaths.before, '--after', historicalTransitionPaths.after, '--expected-before', expectedBefore, '--expected-after', manifest.after.inputFileSha256, '--expected-report', expectedReport];
const scenarios = [
  ['original', argumentsFor(original), 0], ['edited', argumentsFor(editedPath), 1],
  ['edited-and-rehashed-trusted-head', argumentsFor(rehashedPath), 1], ['edited-and-rehashed-own-head-full-record-replay', argumentsFor(rehashedPath, edited.digest), 1],
  ['wrong-original-input', argumentsFor(original, report.digest, 'f'.repeat(64)), 1], ['wrong-report-commitment', argumentsFor(original, '0x'+'f'.repeat(64)), 1],
  ['missing-trusted-inputs', [original], 1], ['unknown-option', [...argumentsFor(original), '--skip-replay'], 1],
] as const;
const cli = scenarios.map(([scenario, args, expectedExit]) => {
  const run = Bun.spawnSync([process.execPath, '--no-env-file', 'scripts/verify-snapshot-transition.ts', ...args], { env: { PATH: process.env.PATH || '' } });
  const result = { scenario, expectedExit, actualExit: run.exitCode, output: new TextDecoder().decode(run.stdout).trim() || new TextDecoder().decode(run.stderr).trim() };
  if (run.exitCode !== expectedExit) throw new Error('Unexpected CLI outcome: ' + scenario);
  return result;
});
const snapshot = await getIntelligenceSnapshot(), catalog = await getPlannerCatalog(snapshot);
if (!snapshot.datasetSnapshotId || !snapshot.inputFileSha256 || !snapshot.upstreamArchiveSha256 || !snapshot.sourceProvenance) throw new Error('Real-input bindings are required for the allocation proof');
const dataset = { datasetSnapshotId: snapshot.datasetSnapshotId, archiveSha256: snapshot.upstreamArchiveSha256, inputFileSha256: snapshot.inputFileSha256, intelligenceSha256: snapshot.snapshotSha256,
  synthetic: false, provenance: snapshot.sourceProvenance, scope: 'full_snapshot' as const, totalSourceCount: snapshot.sourceCount, archiveStartDate: catalog.archiveStartDate, archiveEndDate: catalog.archiveEndDate };
const allocations = [];
for (const capacity of [10,20]) {
  const plan = await buildInvestigationPortfolio({ dataset, candidates: catalog.candidates, parameters: { capacity, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] } });
  const selected = plan.portfolios[0].selectedIds, watch = transitionPage(report, { datasetSnapshotId: dataset.datasetSnapshotId, inputFileSha256: dataset.inputFileSha256, sourceIds: selected, offset: 0, limit: 50 });
  allocations.push({ capacity, reportDigest: plan.digest, strategy: 'weighted', selectedIds: selected, affectedSelectedIds: watch.items.map(row => row.sourceId), unchangedSelectedIds: watch.unchangedSourceIds,
    reasons: watch.items.map(row => ({ sourceId: row.sourceId, sourceMetadataFields: row.metadataChange?.changedFields || [], observationIds: row.observationChanges.map(change => change.id) })) });
}
const oracle = Bun.spawnSync(['python3','services/data-pipeline/snapshot_transition_oracle.py','--report',original,'--before',historicalTransitionPaths.before,'--after',historicalTransitionPaths.after,
  '--expected-before',manifest.before.inputFileSha256,'--expected-after',manifest.after.inputFileSha256,'--expected-report',manifest.reportDigest], { env: { PATH: process.env.PATH || '' } });
if (oracle.exitCode !== 0) throw new Error('Independent Python record oracle failed');
await writeFile(join(output, 'verification.json'), JSON.stringify({ recordedAt: new Date().toISOString(), inputPins: { before: manifest.before, after: manifest.after }, reportDigest: report.digest,
  summary: report.summary, affectedSourceCount: report.affectedSourceIds.length, allocations, cli, independentOracle: JSON.parse(new TextDecoder().decode(oracle.stdout)),
  limitation: 'Two real historical normalized snapshots. Software scenario replay, not a human study, live monitoring, prospective accuracy, physical methane reduction or a blockchain transaction.' }, null, 2)+'\n', { flag: 'wx' });
console.log(JSON.stringify({ cliScenarios: cli.length, independentOraclePassed: true, affectedSources: report.affectedSourceIds.length, allocations: allocations.map(row => ({ capacity: row.capacity, affectedSelected: row.affectedSelectedIds.length })) }));
