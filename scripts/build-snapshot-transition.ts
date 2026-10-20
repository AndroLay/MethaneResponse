import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { readTransitionSnapshot } from '../apps/api/src/snapshot-transition-data';
import { buildSnapshotTransition } from '../packages/shared/src/snapshot-transition';

const args = process.argv.slice(2);
if (args.length !== 10 || args[0] !== '--before' || args[2] !== '--after' || args[4] !== '--expected-before' || args[6] !== '--expected-after' || args[8] !== '--output'
  || !/^[a-f0-9]{64}$/.test(args[5]) || !/^[a-f0-9]{64}$/.test(args[7])) throw new Error('Usage: --before OLD.json.gz --after NEW.json.gz --expected-before SHA256 --expected-after SHA256 --output NEW_DIRECTORY');
const before = await readTransitionSnapshot(resolve(args[1]), args[5]), after = await readTransitionSnapshot(resolve(args[3]), args[7]);
const report = await buildSnapshotTransition(before, after), output = resolve(args[9]);
await mkdir(output); // Refuse replacement of an existing evidence directory.
const bytes = JSON.stringify(report) + '\n';
await writeFile(resolve(output, 'report.json'), bytes, { flag: 'wx' });
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ schemaVersion: 1, policyVersion: report.policyVersion,
  before: { datasetSnapshotId: report.before.datasetSnapshotId, inputFileSha256: report.before.inputFileSha256 },
  after: { datasetSnapshotId: report.after.datasetSnapshotId, inputFileSha256: report.after.inputFileSha256 },
  reportFileSha256: createHash('sha256').update(bytes).digest('hex'), reportDigest: report.digest }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ before: report.before.datasetSnapshotId, after: report.after.datasetSnapshotId, summary: report.summary, affectedSources: report.affectedSourceIds.length, bytes: Buffer.byteLength(bytes), digest: report.digest }));
