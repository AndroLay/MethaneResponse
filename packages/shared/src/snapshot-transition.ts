import { z } from 'zod';
import { MarsProvenance, evidenceUtcDay } from './index';
import { plannerCanonical } from './investigation-planner';

export const TRANSITION_POLICY = 'mars-normalized-record-delta/1';
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
const Id = z.string().min(1).max(160);
const Scalar = z.union([z.string().max(4096), z.number().finite(), z.boolean(), z.null()]);
const Fields = z.record(z.string().min(1).max(80), Scalar);
type Fields = z.infer<typeof Fields>;
export const sourceTransitionFields = ['lat', 'lon', 'country', 'sector', 'sourceType', 'detectedPlumeCount', 'latestPlumeId', 'latestPlumeDate', 'persistency', 'persistencyStd', 'persistencyCategory', 'notified', 'feedback', 'feedbackOperator', 'feedbackGovernment', 'feedbackScope', 'mitigationConfirmed'] as const;
export const observationTransitionFields = ['sourceId', 'linkStatus', 'date', 'fluxKgHr', 'uncertaintyKgHr', 'fluxUnit', 'satellite', 'country', 'sector', 'actionable', 'notified', 'tile', 'detectionInstitution', 'quantificationInstitution', 'totalEmissionTonnes', 'totalEmissionStdTonnes', 'windU', 'windV', 'windSpeed', 'lastUpdate', 'insertDate', 'tileBackground', 'lat', 'lon'] as const;
const Descriptor = z.object({ datasetSnapshotId: Id, inputFileSha256: Hash, provenance: MarsProvenance,
  sourceCount: z.number().int().nonnegative(), observationCount: z.number().int().nonnegative(), linkedObservationCount: z.number().int().nonnegative(),
  unresolvedObservationCount: z.number().int().nonnegative(), archiveStartDate: z.iso.date(), archiveEndDate: z.iso.date(),
}).strict();
const Change = z.object({ id: Id, kind: z.enum(['added', 'removed', 'changed']), before: Fields.nullable(), after: Fields.nullable(), changedFields: z.array(z.string()).max(80) }).strict();
export type RecordChange = z.infer<typeof Change>;
export const SnapshotTransition = z.object({ schemaVersion: z.literal(1), policyVersion: z.literal(TRANSITION_POLICY),
  before: Descriptor, after: Descriptor,
  summary: z.object({ addedSources: z.number().int().nonnegative(), removedSources: z.number().int().nonnegative(), changedSources: z.number().int().nonnegative(),
    addedObservations: z.number().int().nonnegative(), removedObservations: z.number().int().nonnegative(), changedObservations: z.number().int().nonnegative(),
    laterDatedAdditions: z.number().int().nonnegative(), historicalBackfillAdditions: z.number().int().nonnegative(), reassignedObservations: z.number().int().nonnegative(),
  }).strict(), sourceChanges: z.array(Change).max(100_000), observationChanges: z.array(Change).max(100_000), affectedSourceIds: z.array(Id).max(100_000),
  physicalOutcomeEstablished: z.literal(false), limitations: z.array(z.string()).max(20), digest: z.string().regex(/^0x[a-f0-9]{64}$/),
}).strict();
export type SnapshotTransition = z.infer<typeof SnapshotTransition>;
export type TransitionSnapshot = { descriptor: z.infer<typeof Descriptor>; sources: Map<string, Fields>; observations: Map<string, Fields> };
const SourceInput = z.object({ sourceId: Id, synthetic: z.literal(false), observations: z.array(Fields).max(100_000) }).passthrough();
const Input = z.object({ snapshotId: Id, provenance: MarsProvenance, truncated: z.literal(false), originalSourceCount: z.number().int().nonnegative(),
  plumeCount: z.number().int().nonnegative(), plumeObservationDateRange: z.object({ start: z.iso.date(), end: z.iso.date() }),
  sources: z.array(SourceInput).max(100_000), unmappedSources: z.array(SourceInput).max(100_000), unlinkedObservations: z.array(Fields).max(100_000),
}).passthrough();
function project(row: Record<string, unknown>, keys: readonly string[]): Fields {
  return Object.fromEntries(keys.map(key => [key, Scalar.parse(row[key] ?? null)]));
}
/** Complete normalized inputs only; never fabricate a previous snapshot by deleting current rows. */
export function normalizeTransitionSnapshot(raw: unknown, inputFileSha256: string): TransitionSnapshot {
  Hash.parse(inputFileSha256);
  const input = Input.parse(raw), sources = new Map<string, Fields>(), observations = new Map<string, Fields>();
  if (input.provenance.snapshotId !== input.snapshotId || input.plumeObservationDateRange.start > input.plumeObservationDateRange.end) throw new Error('Snapshot provenance or date range mismatch');
  let linked = 0;
  function addObservation(raw: Fields, parent: string | null) {
    const id = Id.parse(raw.id), row = project(raw, observationTransitionFields), day = typeof row.date === 'string' ? evidenceUtcDay(row.date) : undefined;
    if (observations.has(id) || raw.synthetic !== false || !day || day < input.plumeObservationDateRange.start || day > input.plumeObservationDateRange.end
      || row.fluxUnit !== 'kg/h' || row.fluxKgHr !== null && (typeof row.fluxKgHr !== 'number' || row.fluxKgHr < 0)
      || row.uncertaintyKgHr !== null && (typeof row.uncertaintyKgHr !== 'number' || row.uncertaintyKgHr < 0)) throw new Error('Invalid original observation identity, time or measurement');
    if (parent !== null ? row.sourceId !== parent || row.linkStatus !== 'linked' : !['source_id_missing', 'source_record_missing'].includes(String(row.linkStatus))) throw new Error('Invalid original observation linkage');
    if (parent !== null) linked++;
    observations.set(id, row);
  }
  for (const source of [...input.sources, ...input.unmappedSources]) {
    if (sources.has(source.sourceId)) throw new Error('Duplicate original source ID');
    sources.set(source.sourceId, project(source, sourceTransitionFields));
    for (const observation of source.observations) addObservation(observation, source.sourceId);
  }
  for (const observation of input.unlinkedObservations) addObservation(observation, null);
  if (sources.size !== input.originalSourceCount || observations.size !== input.plumeCount) throw new Error('Incomplete snapshot source or observation inventory');
  return { descriptor: { datasetSnapshotId: input.snapshotId, inputFileSha256, provenance: input.provenance,
    sourceCount: sources.size, observationCount: observations.size, linkedObservationCount: linked, unresolvedObservationCount: observations.size - linked,
    archiveStartDate: input.plumeObservationDateRange.start, archiveEndDate: input.plumeObservationDateRange.end }, sources, observations };
}
function changes(before: Map<string, Fields>, after: Map<string, Fields>): RecordChange[] {
  return [...new Set([...before.keys(), ...after.keys()])].sort().flatMap(id => {
    const a = before.get(id) || null, b = after.get(id) || null;
    const fields = !a || !b ? Object.keys(a || b!).sort() : Object.keys(a).filter(key => a[key] !== b[key]).sort();
    return fields.length ? [{ id, kind: !a ? 'added' as const : !b ? 'removed' as const : 'changed' as const, before: a, after: b, changedFields: fields }] : [];
  });
}
export async function transitionDigest(value: unknown) {
  return '0x' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plannerCanonical(value)))), n => n.toString(16).padStart(2, '0')).join('');
}
export async function buildSnapshotTransition(before: TransitionSnapshot, after: TransitionSnapshot): Promise<SnapshotTransition> {
  const a = before.descriptor, b = after.descriptor;
  if (a.datasetSnapshotId === b.datasetSnapshotId || a.inputFileSha256 === b.inputFileSha256 || a.provenance.archiveSha256 === b.provenance.archiveSha256
    || Date.parse(a.provenance.retrievedAt) >= Date.parse(b.provenance.retrievedAt)
    || (['provider', 'dataset', 'catalogUrl', 'license'] as const).some(key => a.provenance[key] !== b.provenance[key])) throw new Error('Incompatible or non-chronological historical snapshots');
  const sourceChanges = changes(before.sources, after.sources), observationChanges = changes(before.observations, after.observations);
  const affected = new Set(sourceChanges.map(change => change.id));
  for (const change of observationChanges) for (const row of [change.before, change.after]) {
    if (typeof row?.sourceId === 'string' && (before.sources.has(row.sourceId) || after.sources.has(row.sourceId))) affected.add(row.sourceId);
  }
  const added = observationChanges.filter(row => row.kind === 'added');
  const count = (rows: RecordChange[], kind: RecordChange['kind']) => rows.filter(row => row.kind === kind).length;
  const payload = { schemaVersion: 1 as const, policyVersion: TRANSITION_POLICY, before: a, after: b,
    summary: { addedSources: count(sourceChanges, 'added'), removedSources: count(sourceChanges, 'removed'), changedSources: count(sourceChanges, 'changed'),
      addedObservations: added.length, removedObservations: count(observationChanges, 'removed'), changedObservations: count(observationChanges, 'changed'),
      laterDatedAdditions: added.filter(row => evidenceUtcDay(String(row.after!.date))! > a.archiveEndDate).length,
      historicalBackfillAdditions: added.filter(row => evidenceUtcDay(String(row.after!.date))! <= a.archiveEndDate).length,
      reassignedObservations: observationChanges.filter(row => row.kind === 'changed' && (row.before!.sourceId !== row.after!.sourceId || row.before!.linkStatus !== row.after!.linkStatus)).length },
    sourceChanges, observationChanges, affectedSourceIds: [...affected].sort(), physicalOutcomeEstablished: false as const,
    limitations: [
      'Historical release comparison, not a live feed or prospective validation. Added records can be historical backfill, corrections or later-dated observations, not necessarily new physical leaks.',
      'The complete normalized source/plume inventory is compared by exact original IDs, including unresolved observations. Compared fields follow the versioned policy; original publisher CSV bytes are identified by recorded archive hashes, not reauthenticated here.',
      'Notification and feedback are publisher metadata, not proof of operator receipt, repair or methane reduction. Missing or removed observations are not zero emissions.',
      'Source IDs and linkage can change between releases. Corrections and relinking are inspection prompts; no operator or facility identity is inferred.',
      'Hash consistency binds the supplied files. Independent verification needs expected input and report digests from a separately trusted channel; it does not authenticate physical measurements or establish current status.',
    ] };
  return SnapshotTransition.parse({ ...payload, digest: await transitionDigest(payload) });
}
export async function transitionIntegrityValid(raw: unknown): Promise<boolean> {
  const parsed = SnapshotTransition.safeParse(raw); if (!parsed.success) return false;
  const { digest, ...payload } = parsed.data;
  return await transitionDigest(payload) === digest;
}

export const SnapshotTransitionRequest = z.object({ datasetSnapshotId: Id, inputFileSha256: Hash,
  sourceIds: z.array(Id).max(50).default([]), offset: z.number().int().min(0).max(100_000).default(0), limit: z.number().int().min(1).max(50).default(20),
}).strict().superRefine((input, ctx) => { if (new Set(input.sourceIds).size !== input.sourceIds.length) ctx.addIssue({ code: 'custom', message: 'Duplicate selected source IDs' }); });
export type SnapshotTransitionRequest = z.infer<typeof SnapshotTransitionRequest>;
export function transitionPage(report: SnapshotTransition, request: SnapshotTransitionRequest) {
  const allowed = new Set(request.sourceIds);
  const rows = report.affectedSourceIds.filter(id => !allowed.size || allowed.has(id));
  const bySource = new Map(report.sourceChanges.map(row => [row.id, row]));
  const selected = rows.slice(request.offset, request.offset + request.limit);
  return { schemaVersion: 1 as const, policyVersion: report.policyVersion, before: report.before, after: report.after, digest: report.digest,
    summary: report.summary, physicalOutcomeEstablished: false as const, limitations: report.limitations,
    coverage: allowed.size ? 'selected_sources' as const : 'all_affected_sources' as const, requestedSourceIds: request.sourceIds,
    unchangedSourceIds: request.sourceIds.filter(id => !report.affectedSourceIds.includes(id)), total: rows.length, totalAffectedSources: report.affectedSourceIds.length,
    offset: request.offset, limit: request.limit,
    items: selected.map(sourceId => ({ sourceId, metadataChange: bySource.get(sourceId) || null,
      observationChanges: report.observationChanges.filter(row => row.before?.sourceId === sourceId || row.after?.sourceId === sourceId) })),
  };
}
export type SnapshotTransitionPage = ReturnType<typeof transitionPage>;
export const SnapshotTransitionPageData = SnapshotTransition.pick({ schemaVersion: true, policyVersion: true, before: true, after: true, digest: true, summary: true, physicalOutcomeEstablished: true, limitations: true }).extend({
  coverage: z.enum(['selected_sources', 'all_affected_sources']), requestedSourceIds: z.array(Id).max(50), unchangedSourceIds: z.array(Id).max(50),
  total: z.number().int().min(0).max(100_000), totalAffectedSources: z.number().int().min(0).max(100_000), offset: z.number().int().min(0).max(100_000), limit: z.number().int().min(1).max(50),
  items: z.array(z.object({ sourceId: Id, metadataChange: Change.nullable(), observationChanges: z.array(Change).max(100_000) }).strict()).max(50),
}).strict();
