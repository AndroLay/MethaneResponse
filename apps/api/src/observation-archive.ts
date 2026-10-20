import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { MarsProvenance } from '@methane/shared';
import { ArchiveObservation } from '@methane/shared/observation-claims';
import type { getIntelligenceSnapshot } from './intelligence-data';

type Snapshot = Awaited<ReturnType<typeof getIntelligenceSnapshot>>;
const Archive = z.object({
  snapshotId: z.string(), provenance: MarsProvenance, truncated: z.literal(false),
  plumeObservationDateRange: z.object({ start: z.iso.date(), end: z.iso.date() }),
  sources: z.array(z.object({ sourceId: z.string(), country: z.string().nullable().optional(), sector: z.string().nullable().optional(), observations: z.array(z.unknown()) })).max(100_000),
});
type SourceRecords = { observations: ArchiveObservation[]; archiveStartDate: string; archiveEndDate: string };
type CatalogRecords = SourceRecords & { country: string | null; sector: string | null };
let cached: { key: string; sources: Map<string, CatalogRecords> } | undefined;
let pending: { key: string; value: Promise<Map<string, CatalogRecords>> } | undefined;

/** Read only the local pinned input; no URL or file path comes from an HTTP request. */
export async function getObservationCatalog(snapshot: Snapshot,
  path = process.env.INTELLIGENCE_INPUT_PATH || resolve(import.meta.dir, '../../../apps/web/public/data/mars-snapshot.json.gz')) {
  const before = await stat(path);
  const key = [path, snapshot.datasetSnapshotId, snapshot.upstreamArchiveSha256, snapshot.snapshotSha256, snapshot.inputFileSha256, before.size, before.mtimeMs, before.ctimeMs].join(':');
  let sources: Map<string, CatalogRecords>;
  if (cached?.key === key) sources = cached.sources;
  else {
    let value = pending?.key === key ? pending.value : undefined;
    if (!value) {
      value = (async () => {
        if (before.size > 16_000_000) throw new Error('Pinned compressed snapshot exceeds local bounds');
        const bytes = await readFile(path);
        if (createHash('sha256').update(bytes).digest('hex') !== snapshot.inputFileSha256) throw new Error('Pinned archive input hash mismatch');
        const archive = Archive.parse(JSON.parse(gunzipSync(bytes, { maxOutputLength: 128_000_000 }).toString('utf8')));
        if (archive.snapshotId !== snapshot.datasetSnapshotId || archive.provenance.snapshotId !== snapshot.datasetSnapshotId
          || archive.provenance.archiveSha256 !== snapshot.upstreamArchiveSha256 || archive.sources.length !== snapshot.sourceCount) throw new Error('Archive provenance or source count mismatch');
        const metadata = new Map(snapshot.sources.map(row => [row.sourceId, row]));
        const map = new Map<string, CatalogRecords>(), ids = new Set<string>();
        for (const source of archive.sources) {
          if (map.has(source.sourceId)) throw new Error('Duplicate archive source ID');
          const row = metadata.get(source.sourceId);
          if (!row || source.observations.length !== row.observationIds.length) throw new Error('Archive history count mismatch');
          const expected = new Map(row.observationIds.map((id, index) => [id, row.observationTimestamps[index]]));
          const observations = source.observations.map(raw => {
            const original = raw as Record<string, unknown>;
            const observation = ArchiveObservation.parse({
              id: original.id, sourceId: original.sourceId, linkStatus: original.linkStatus, date: original.date,
              fluxKgHr: original.fluxKgHr, uncertaintyKgHr: original.uncertaintyKgHr ?? null, fluxUnit: original.fluxUnit,
              ...(original.satellite !== undefined ? { satellite: original.satellite } : {}),
              ...(original.lat !== undefined ? { lat: original.lat } : {}), ...(original.lon !== undefined ? { lon: original.lon } : {}),
            });
            if (observation.sourceId !== source.sourceId || ids.has(observation.id)
              || expected.get(observation.id) !== observation.date) throw new Error('Archive record identity or date mismatch');
            ids.add(observation.id);
            return observation;
          });
          map.set(source.sourceId, { observations, country: source.country?.trim() || null, sector: source.sector?.trim() || null,
            archiveStartDate: archive.plumeObservationDateRange.start, archiveEndDate: archive.plumeObservationDateRange.end });
        }
        const after = await stat(path);
        if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Error('Archive changed while being loaded');
        cached = { key, sources: map };
        return map;
      })();
      pending = { key, value };
    }
    try { sources = await value; } finally { if (pending?.value === value) pending = undefined; }
  }
  return sources;
}

export async function getObservationSource(sourceId: string, snapshot: Snapshot, path?: string): Promise<SourceRecords> {
  const result = (await getObservationCatalog(snapshot, path)).get(sourceId);
  if (!result) throw new Error('Source missing from pinned archive');
  // Preserve the observation-check input schema and historical API shape.
  return { observations: result.observations, archiveStartDate: result.archiveStartDate, archiveEndDate: result.archiveEndDate };
}
