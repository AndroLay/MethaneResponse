import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { MarsProvenance } from '@methane/shared';
const FlaggedObservation = z.object({
  id: z.string(), date: z.string(), fluxKgHr: z.number(), uncertaintyKgHr: z.number().nullable(),
  deviationFromMedianKgHr: z.number().nonnegative(), thresholdKgHr: z.number().nonnegative(),
});
const AnomalyAnalysis = z.object({
  methodVersion: z.literal('mad-threshold-screen-v1'),
  status: z.enum(['insufficient_observations', 'insufficient_temporal_coverage', 'insufficient_scale', 'potential_anomalies', 'no_candidates_flagged']),
  reason: z.string(), minimumNumericObservations: z.number().int().positive(), minimumDistinctObservationDates: z.number().int().positive(),
  numericObservationCount: z.number().int().nonnegative(), distinctNumericObservationDates: z.number().int().nonnegative(),
  baselineMedianFluxKgHr: z.number().nullable(), medianAbsoluteDeviationKgHr: z.number().nonnegative().nullable(),
  robustScaleKgHr: z.number().nonnegative().nullable(), scaleBasis: z.enum(['scaled_mad', 'median_reported_uncertainty_fallback', 'unavailable']),
  thresholdRule: z.string(), flaggedObservations: z.array(FlaggedObservation), limitation: z.string(),
});
const Row = z.object({
  sourceId: z.string(), priorityScore: z.number().min(0).max(100), priorityBand: z.enum(['low','medium','high']),
  priorityType: z.literal('heuristic_not_probability'), observationCount: z.number().int(),
  sourceReportedPlumeCount: z.number().int(), uniqueObservationDates: z.number().int(),
  observationIds: z.array(z.string()), observationDates: z.array(z.string()), observationTimestamps: z.array(z.string()),
  numericFluxObservationCount: z.number().int(), missingFluxObservationCount: z.number().int(),
  measurementAvailability: z.enum(['numeric_flux_available','no_numeric_flux']),
  medianObservedFluxKgHr: z.number().nullable(), medianObservationUncertaintyKgHr: z.number().nullable(),
  medianAbsoluteDeviationKgHr: z.number().nullable(), robustOutlierCount: z.number().int().nullable(),
  anomalyAnalysis: AnomalyAnalysis,
  priorityComponents: z.object({ recurrenceContribution: z.number(), magnitudeContribution: z.number().nullable(), magnitudeBasis: z.string() }),
  observedPersistency: z.number().nullable(), observedPersistencyStd: z.number().nullable(),
  observedPersistencyCategory: z.string().nullable().optional(), emissionStatus: z.string().nullable().optional(),
  indicatorComparison: z.string(), lastObserved: z.string().nullable().optional(), dataSufficiency: z.string(),
  reasons: z.array(z.string()), forecast: z.object({ status: z.literal('not_available'), reason: z.string() }),
});
const Snapshot = z.object({ schemaVersion: z.literal(1), kind: z.literal('observational_investigation_ranking'), modelVersion: z.string(), trainedModel: z.literal(false), calibratedProbability: z.literal(false), generatedAt: z.string(), inputFileSha256: z.string().regex(/^[0-9a-f]{64}$/), upstreamArchiveSha256: z.string().nullable().optional(), sourceCount: z.number().int(), method: z.string(), limitations: z.array(z.string()), sources: z.array(Row) })
  .extend({
    datasetSnapshotId: z.string().nullable(), linkedObservationCount: z.number().int().nonnegative(),
    sourceDataset: z.string().nullable(), sourceProvider: z.string().nullable(), datasetLicense: z.string().nullable(),
    catalogUrl: z.string().url().nullable(), datasetAttribution: z.string().nullable(),
    sourceProvenance: MarsProvenance.optional(),
  });

type ValidatedSnapshot = z.infer<typeof Snapshot> & { snapshotSha256: string };
let validatedCache: { key: string; value: ValidatedSnapshot } | undefined;
let validationInFlight: { key: string; promise: Promise<ValidatedSnapshot> } | undefined;

function statKey(path: string, size: number, mtimeMs: number, ctimeMs: number) {
  return `${path}\0${size}\0${mtimeMs}\0${ctimeMs}`;
}

export async function getIntelligenceSnapshot(
  path = process.env.INTELLIGENCE_SNAPSHOT_PATH || resolve(import.meta.dir, '../../../data/processed/intelligence-snapshot.json'),
  inputPath = process.env.INTELLIGENCE_INPUT_PATH || resolve(import.meta.dir, '../../../apps/web/public/data/mars-snapshot.json.gz'),
) {
  const [snapshotStat, inputStat] = await Promise.all([stat(path), stat(inputPath)]);
  const key = `${statKey(path, snapshotStat.size, snapshotStat.mtimeMs, snapshotStat.ctimeMs)}\0${statKey(inputPath, inputStat.size, inputStat.mtimeMs, inputStat.ctimeMs)}`;
  if (validatedCache?.key === key) return validatedCache.value;
  if (validationInFlight?.key === key) return validationInFlight.promise;

  const promise = (async () => {
    const [bytes, inputBytes] = await Promise.all([readFile(path), readFile(inputPath)]);
    const [snapshotAfter, inputAfter] = await Promise.all([stat(path), stat(inputPath)]);
    const afterKey = `${statKey(path, snapshotAfter.size, snapshotAfter.mtimeMs, snapshotAfter.ctimeMs)}\0${statKey(inputPath, inputAfter.size, inputAfter.mtimeMs, inputAfter.ctimeMs)}`;
    if (key !== afterKey) throw new Error('Intelligence inputs changed while they were being validated');
    const snapshot = Snapshot.parse(JSON.parse(bytes.toString('utf8')) as unknown);
    if (snapshot.sourceCount !== snapshot.sources.length) throw new Error('Intelligence source count mismatch');
    if (snapshot.sources.some((row) => row.observationIds.length !== row.observationTimestamps.length
      || new Set(row.observationIds).size !== row.observationIds.length)) {
      throw new Error('Intelligence observation identifiers and timestamps are inconsistent');
    }
    if (snapshot.linkedObservationCount !== snapshot.sources.reduce((total, row) => total + row.observationCount, 0)) {
      throw new Error('Intelligence linked observation count mismatch');
    }
    const currentInputHash = createHash('sha256').update(inputBytes).digest('hex');
    if (snapshot.inputFileSha256 !== currentInputHash) throw new Error('Intelligence snapshot input hash is stale');
    if (snapshot.upstreamArchiveSha256 && snapshot.datasetSnapshotId !== `unep-mars-${snapshot.upstreamArchiveSha256.slice(0, 12)}`) {
      throw new Error('Intelligence snapshot archive ID mismatch');
    }
    if (snapshot.sourceProvenance && (
      snapshot.sourceProvenance.archiveSha256 !== snapshot.upstreamArchiveSha256
      || snapshot.sourceProvenance.snapshotId !== snapshot.datasetSnapshotId
      || snapshot.sourceProvenance.license !== snapshot.datasetLicense
      || snapshot.sourceProvenance.catalogUrl !== snapshot.catalogUrl
    )) throw new Error('Intelligence provenance does not match its pinned dataset');
    return { ...snapshot, snapshotSha256: createHash('sha256').update(bytes).digest('hex') };
  })();
  validationInFlight = { key, promise };
  try {
    const value = await promise;
    validatedCache = { key, value };
    return value;
  } finally {
    if (validationInFlight?.promise === promise) validationInFlight = undefined;
  }
}
