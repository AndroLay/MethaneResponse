import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { buildObservationCheck, observationCanonical, verifyObservationCheck, type ObservationCheck, type ObservationQuery } from '../packages/shared/src/observation-claims';
import { createApp } from '../apps/api/src/app';
import { MemoryAuditStore } from '../apps/api/src/store';
import { getIntelligenceSnapshot } from '../apps/api/src/intelligence-data';
import { getObservationSource } from '../apps/api/src/observation-archive';
import { observationCheckMarkdown } from '../apps/web/src/observation-check';

const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const save = (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const args = process.argv.slice(2);
if (args[0] === '--verify' && args[1]) {
  if ((await stat(args[1])).size > 8_000_000) throw new Error('Replay file exceeds 8 MB');
  const report = JSON.parse(await readFile(args[1], 'utf8'));
  const expected = args[2] === '--expected-digest' ? args[3] : undefined;
  if ((expected && expected !== report.digest) || !await verifyObservationCheck(report)) {
    process.stderr.write('INVALID observation checksum, policy replay or expected digest\n'); process.exit(1);
  }
  process.stdout.write('VALID_POLICY_REPLAY — unsigned; archive authenticity and physical repair are not established\n'); process.exit(0);
}
if (args[0] !== '--output' || !args[1] || args.length !== 2) throw new Error('Usage: bun --no-env-file scripts/observation-claim-proof.ts --output NEW_DIRECTORY | --verify FILE [--expected-digest HEX]');
const directory = resolve(args[1]);
await mkdir(directory); // Never overwrite a frozen evidence run.
const api = createApp(new MemoryAuditStore()), snapshot = await getIntelligenceSnapshot();
const examples: { file: string; sourceId: string; query: ObservationQuery; status: string; counterexamples: number; digest: string }[] = [];
async function example(sourceId: string, name: string, query: ObservationQuery) {
  const response = await api.request('/api/investigations/observation-check', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, datasetSnapshotId: snapshot.datasetSnapshotId, query }) });
  if (response.status !== 200) throw new Error('Historical query failed: ' + response.status);
  const result = await response.json() as ObservationCheck;
  if (result.input.synthetic || !await verifyObservationCheck(result)) throw new Error('Invalid historical result');
  const file = sourceId + '-' + name + '.json';
  await save(join(directory, file), result);
  await writeFile(join(directory, sourceId + '-' + name + '-request.md'), observationCheckMarkdown(result), { flag: 'wx' });
  examples.push({ file, sourceId, query, status: result.status, counterexamples: result.counterexampleIds.length, digest: result.digest });
  return result;
}
for (const sourceId of ['KAZ_S_159', 'CAN_S_002', 'LBY_S_143']) {
  const records = await getObservationSource(sourceId, snapshot);
  const period = { startDate: records.archiveStartDate, endDate: records.archiveEndDate };
  await example(sourceId, 'no-records', { ...period, kind: 'no_linked_detections' });
  await example(sourceId, 'threshold-1000', { ...period, kind: 'reported_flux_at_most', thresholdKgHr: 1000 });
  await example(sourceId, 'physical-outcome', { ...period, kind: 'physical_mitigation' });
}
const absent = await example('KAZ_S_159', 'empty-window', { kind: 'no_linked_detections', startDate: '2026-08-01', endDate: '2026-08-31' });
const incomplete = await example('KAZ_S_159', 'outside-archive', { kind: 'reported_flux_at_most', thresholdKgHr: 1_000_000, startDate: '2026-08-01', endDate: '2026-12-31' });
if (absent.status !== 'no_observations' || incomplete.status !== 'incomplete_window') throw new Error('Unknown/archive bounds regression');
// Exhaustive local conformance scan, not a scientific or independently labeled benchmark.
const corpus: { sourceId: string; total: number; missingFlux: number; over1000: string[] }[] = [];
for (const source of snapshot.sources) {
  const records = await getObservationSource(source.sourceId, snapshot);
  const common = { sourceId: source.sourceId, datasetSnapshotId: snapshot.datasetSnapshotId, synthetic: false,
    archiveSha256: snapshot.upstreamArchiveSha256, inputFileSha256: snapshot.inputFileSha256, provenance: snapshot.sourceProvenance,
    sourceLimitations: snapshot.limitations, ...records };
  const none = await buildObservationCheck({ ...common, query: { kind: 'no_linked_detections', startDate: records.archiveStartDate, endDate: records.archiveEndDate } });
  const threshold = await buildObservationCheck({ ...common, query: { kind: 'reported_flux_at_most', thresholdKgHr: 1000, startDate: records.archiveStartDate, endDate: records.archiveEndDate } });
  if (none.counterexampleIds.length !== records.observations.length) throw new Error('Record witness coverage mismatch');
  corpus.push({ sourceId: source.sourceId, total: none.summary.total, missingFlux: threshold.summary.missingFlux, over1000: [...threshold.counterexampleIds].sort() });
}
corpus.sort((a, b) => a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
const original = absent;
const edited = { ...original, status: 'counterexample_found' };
const { digest: _, ...modifiedPayload } = edited;
const rehashed = { ...edited, digest: '0x' + hash(observationCanonical(modifiedPayload)) };
if (await verifyObservationCheck(edited) || await verifyObservationCheck(rehashed)) throw new Error('Edited policy output accepted');
const auditResponse = await api.request('/api/audits');
if ((await auditResponse.json()).audits.length !== 0) throw new Error('Exploratory queries created saved audits');
const sourcePaths = [
  'package.json', 'packages/shared/package.json', 'packages/shared/src/observation-claims.ts',
  'apps/api/src/observation-archive.ts', 'apps/api/src/observation-claims.test.ts', 'apps/api/src/app.ts', 'apps/api/src/rate-limit.ts',
  'apps/web/src/observation-check.ts', 'apps/web/src/observation-check.test.ts', 'apps/web/src/ObservationClaimPanel.tsx',
  'apps/web/src/DecisionLabPanel.tsx', 'apps/web/src/decision-lab.css', 'apps/web/src/EvidenceAuditorWorkflow.tsx',
  'apps/web/src/App.tsx', 'apps/web/src/decision-lab.ts',
  'e2e/audit-workflow.spec.ts', 'scripts/observation-claim-proof.ts', 'scripts/tsconfig.evaluation.json',
  'services/data-pipeline/observation_check_oracle.py', 'services/data-pipeline/tests/test_observation_check_oracle.py',
];
const sourceSha256: Record<string, string> = {};
for (const path of sourcePaths) sourceSha256[path] = hash(await readFile(path));
const baseline = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
await save(join(directory, 'verification.json'), {
  recordedAt: new Date().toISOString(), scope: 'Local archive-query conformance; not an operator allegation, AI evaluation or physical mitigation benchmark',
  baselineCommit: baseline.status === 0 ? baseline.stdout.trim() : null, workingTreeSourceSha256: sourceSha256,
  datasetSnapshotId: snapshot.datasetSnapshotId, inputFileSha256: snapshot.inputFileSha256, upstreamArchiveSha256: snapshot.upstreamArchiveSha256,
  examples, corpus: { sources: corpus.length, linkedRecords: corpus.reduce((sum, row) => sum + row.total, 0),
    checks: corpus.length * 2, thresholdKgHr: 1000, canonicalSha256: hash(observationCanonical(corpus)) },
  savedAudits: 0, changedOutput: 'REJECTED', changedAndRehashedOutput: 'REJECTED',
  limitations: ['Both implementations read the same normalized snapshot; this is implementation consistency, not independent measurement validation.',
    'Unsigned files can be rewritten with changed input and a new digest. A trusted external commitment is required for authenticity.',
    'No AI provider, public chain transaction, deployment or human-impact measurement is performed.'],
});
process.stdout.write(examples.length + ' historical scenarios and ' + corpus.length * 2 + ' source-level archive checks generated; changed and rehashed output rejected\n');
