import { readTransitionSnapshot } from '../apps/api/src/snapshot-transition-data';
import { buildSnapshotTransition, SnapshotTransition, transitionIntegrityValid } from '../packages/shared/src/snapshot-transition';
import { plannerCanonical } from '../packages/shared/src/investigation-planner';

export function transitionVerifierArguments(args: string[]) {
  if (args.length !== 11 || !args[0] || args[0].startsWith('-') || args[1] !== '--before' || args[3] !== '--after'
    || args[5] !== '--expected-before' || args[7] !== '--expected-after' || args[9] !== '--expected-report'
    || !/^[a-f0-9]{64}$/.test(args[6]) || !/^[a-f0-9]{64}$/.test(args[8]) || !/^0x[a-f0-9]{64}$/.test(args[10])) throw new Error('Usage: REPORT.json --before OLD.json.gz --after NEW.json.gz --expected-before TRUSTED_SHA256 --expected-after TRUSTED_SHA256 --expected-report TRUSTED_0x_SHA256');
  return { report: args[0], before: args[2], after: args[4], beforeHash: args[6], afterHash: args[8], reportHash: args[10] };
}
if (import.meta.main) {
  try {
    const args = transitionVerifierArguments(process.argv.slice(2)), file = Bun.file(args.report);
    if (file.size > 16_000_000) throw new Error('Change report exceeds 16 MB');
    const report = SnapshotTransition.parse(JSON.parse(await file.text()));
    if (report.digest !== args.reportHash || !await transitionIntegrityValid(report)) throw new Error('Change report differs from separately trusted digest');
    const before = await readTransitionSnapshot(args.before, args.beforeHash), after = await readTransitionSnapshot(args.after, args.afterHash);
    const replay = await buildSnapshotTransition(before, after);
    if (plannerCanonical(report) !== plannerCanonical(replay)) throw new Error('Change report does not match complete original record replay');
    console.log(JSON.stringify({ valid: true, before: before.descriptor.datasetSnapshotId, after: after.descriptor.datasetSnapshotId, digest: report.digest,
      sourceRecordsCompared: before.sources.size + after.sources.size, observationsCompared: before.observations.size + after.observations.size,
      limitation: 'Replayed normalized records bound to separately supplied input and report digests; not publisher authentication, live monitoring or physical mitigation proof.' }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Snapshot transition verification failed'); process.exitCode = 1; }
}
