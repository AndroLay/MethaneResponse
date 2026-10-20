import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { normalizeTransitionSnapshot, SnapshotTransition, transitionIntegrityValid, TRANSITION_POLICY } from '@methane/shared/snapshot-transition';
import type { getIntelligenceSnapshot } from './intelligence-data';

const root = resolve(import.meta.dir, '../../..');
export const historicalTransitionPaths = {
  before: resolve(root, 'data/real/snapshot-projections/unep-mars-e0721015e925.json.gz'),
  after: process.env.INTELLIGENCE_INPUT_PATH || resolve(root, 'apps/web/public/data/mars-snapshot.json.gz'),
  report: resolve(root, 'data/processed/snapshot-transition/report.json'),
  manifest: resolve(root, 'data/processed/snapshot-transition/manifest.json'),
};
const Pin = z.object({ datasetSnapshotId: z.string(), inputFileSha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const TransitionManifest = z.object({ schemaVersion: z.literal(1), policyVersion: z.literal(TRANSITION_POLICY), before: Pin, after: Pin,
  reportFileSha256: z.string().regex(/^[a-f0-9]{64}$/), reportDigest: z.string().regex(/^0x[a-f0-9]{64}$/),
}).strict();
function sha(bytes: Uint8Array) { return createHash('sha256').update(bytes).digest('hex'); }
async function boundedBytes(path: string, max: number) {
  const before = await stat(path);
  if (!before.isFile() || before.size > max) throw new Error('Snapshot artifact exceeds local bounds');
  const bytes = await readFile(path), after = await stat(path);
  if (bytes.byteLength > max || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Error('Snapshot artifact changed while loading');
  return bytes;
}
/** Only callers in offline tools choose paths; HTTP requests cannot supply them. */
export async function readTransitionSnapshot(path: string, expectedInputSha256: string) {
  const bytes = await boundedBytes(path, 16_000_000);
  if (sha(bytes) !== expectedInputSha256) throw new Error('Historical snapshot input hash mismatch');
  return normalizeTransitionSnapshot(JSON.parse(gunzipSync(bytes, { maxOutputLength: 128_000_000 }).toString('utf8')), expectedInputSha256);
}
let cached: { key: string; report: SnapshotTransition } | undefined;
let pending: { key: string; value: Promise<SnapshotTransition> } | undefined;
/** Offline-generated delta; runtime hashes bounded artifacts once per file generation. */
export async function getSnapshotTransition(snapshot: Awaited<ReturnType<typeof getIntelligenceSnapshot>>, paths = historicalTransitionPaths) {
  const stats = await Promise.all(Object.values(paths).map(path => stat(path)));
  const key = JSON.stringify([paths, stats.map(row => [row.size, row.mtimeMs, row.ctimeMs]), snapshot.datasetSnapshotId, snapshot.inputFileSha256, snapshot.upstreamArchiveSha256]);
  if (cached?.key === key) return cached.report;
  let value = pending?.key === key ? pending.value : undefined;
  if (!value) {
    value = (async () => {
      const manifest = TransitionManifest.parse(JSON.parse((await boundedBytes(paths.manifest, 8192)).toString('utf8')));
      if (manifest.after.datasetSnapshotId !== snapshot.datasetSnapshotId || manifest.after.inputFileSha256 !== snapshot.inputFileSha256) throw new Error('Historical transition does not match the active snapshot');
      const bytes = await boundedBytes(paths.report, 16_000_000);
      if (sha(bytes) !== manifest.reportFileSha256) throw new Error('Historical transition artifact hash mismatch');
      const report = SnapshotTransition.parse(JSON.parse(bytes.toString('utf8')));
      if (report.digest !== manifest.reportDigest || !await transitionIntegrityValid(report)
        || report.before.datasetSnapshotId !== manifest.before.datasetSnapshotId || report.before.inputFileSha256 !== manifest.before.inputFileSha256
        || report.after.datasetSnapshotId !== manifest.after.datasetSnapshotId || report.after.inputFileSha256 !== manifest.after.inputFileSha256
        || report.after.provenance.archiveSha256 !== snapshot.upstreamArchiveSha256) throw new Error('Historical transition provenance mismatch');
      // Verify retained complete inputs without replaying the expensive offline record diff on requests.
      const [before, after] = await Promise.all([boundedBytes(paths.before, 16_000_000), boundedBytes(paths.after, 16_000_000)]);
      if (sha(before) !== manifest.before.inputFileSha256 || sha(after) !== manifest.after.inputFileSha256) throw new Error('Retained snapshot input changed');
      cached = { key, report }; return report;
    })();
    pending = { key, value };
  }
  try { return await value; } finally { if (pending?.value === value) pending = undefined; }
}
