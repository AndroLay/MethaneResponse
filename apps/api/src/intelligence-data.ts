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
const ObservedTrendMethod = z.object({
  methodVersion: z.literal('theil-sen-event-trend-v1'),
  minimumNumericObservationDates: z.number().int().positive(), minimumSpanDays: z.number().int().positive(),
  ratePeriodDays: z.literal(30), limitation: z.string(),
});
const ObservedFluxTrend = z.object({
  status: z.enum(['insufficient_observations', 'insufficient_temporal_coverage', 'descriptive_trend']),
  numericObservationDates: z.number().int().nonnegative(), spanDays: z.number().int().nonnegative(),
  pairwiseSlopeCount: z.number().int().nonnegative(), slopeKgHrPer30Days: z.number().nullable(),
  positivePairwiseSlopeShare: z.number().min(0).max(1).nullable(),
  firstObservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), lastObservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  firstObservedMedianFluxKgHr: z.number().nonnegative().nullable(), lastObservedMedianFluxKgHr: z.number().nonnegative().nullable(),
  medianReportedUncertaintyKgHr: z.number().nonnegative().nullable(),
});
const ForecastMissingRequirement = z.enum([
  'complete_observation_opportunities', 'independent_future_outcome_labels', 'held_out_temporal_validation',
]);
const ForecastReadiness = z.object({
  status: z.literal('not_available'), reason: z.string(), missingRequirements: z.array(ForecastMissingRequirement).optional(),
});
const RecordRecurrenceForecast = z.object({
  status: z.literal('available'), modelVersion: z.literal('mars-linked-record-recurrence-logistic-v1'),
  target: z.literal('at_least_one_future_linked_mars_detection_record'),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), horizonDays: z.literal(365),
  probability: z.number().gt(0).lt(1),
});
const MetricInterval = z.object({ lower95: z.number().finite(), upper95: z.number().finite() })
  .refine((interval) => interval.lower95 <= interval.upper95, 'Confidence interval bounds must be ordered');
const RecordRecurrenceTestMetrics = z.object({
  sourceCount: z.number().int().nonnegative(), positiveCount: z.number().int().nonnegative(),
  prevalence: z.number().min(0).max(1), rocAuc: z.number().min(0).max(1), brierScore: z.number().min(0).max(1),
  expectedCalibrationError10: z.number().min(0).max(1), precisionAtTopDecile: z.number().min(0).max(1),
  recallAtTopDecile: z.number().min(0).max(1), liftAtTopDecile: z.number().nonnegative(),
}).refine((metrics) => metrics.positiveCount <= metrics.sourceCount
  && Math.abs(metrics.prevalence - metrics.positiveCount / Math.max(1, metrics.sourceCount)) <= 0.000001,
'Cohort prevalence must match its positive-label count');
const RecordRecurrenceBootstrap = z.object({
  method: z.literal('percentile_cluster_bootstrap'), resamplingUnit: z.literal('country_cluster'),
  clusterCount: z.number().int().positive(), replicatesRequested: z.number().int().min(20), seed: z.number().int(),
});
const RecordRecurrenceBaseline = z.object({
  name: z.literal('recent_365_day_linked_detection_dates'), rocAuc: z.number().min(0).max(1),
  precisionAtTopDecile: z.number().min(0).max(1).optional(),
});
const RecordRecurrenceModel = z.object({
  schemaVersion: z.literal(1), modelVersion: z.literal('mars-linked-record-recurrence-logistic-v1'),
  status: z.enum(['historical_backtest_passed', 'not_available']),
  target: z.literal('at_least_one_future_linked_mars_detection_record'), horizonDays: z.literal(365),
  datasetSnapshotId: z.string().nullable(), inputFileSha256: z.string().regex(/^[0-9a-f]{64}$/),
  datasetLastObservedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), retrievedAt: z.string().optional(),
  testOrigin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), testWindowEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  testCohort: RecordRecurrenceTestMetrics.optional(),
  testBrierReference: z.object({
    probabilityFromCalibrationCohort: z.number().min(0).max(1), brierScore: z.number().min(0).max(1),
    brierSkillScore: z.number().finite(),
  }).optional(),
  confidenceIntervals95: z.record(z.string(), MetricInterval).optional(),
  releaseGateResults: z.record(z.string(), z.boolean()).optional(),
  bootstrap: RecordRecurrenceBootstrap.optional(), baselineComparison: RecordRecurrenceBaseline.optional(),
  evaluationRole: z.string().optional(), predictionSourceCount: z.number().int().nonnegative().optional(),
  limitations: z.array(z.string()).optional(),
}).passthrough();
const PublisherIndicatorCategory = z.object({
  category: z.string().min(1), sourceCount: z.number().int().nonnegative(),
  scoredSourceCount: z.number().int().nonnegative(), medianProbability: z.number().min(0).max(1).nullable(),
}).refine((row) => row.scoredSourceCount <= row.sourceCount
  && (row.scoredSourceCount > 0) === (row.medianProbability !== null),
'Category recurrence scores must agree with their coverage count');
const PublisherIndicatorTopDecileAgreement = z.object({
  fraction: z.literal(0.1), comparedSourceCount: z.number().int().positive(), selectedPerRanking: z.number().int().positive(),
  overlapCount: z.number().int().nonnegative(), recurrenceOnlyCount: z.number().int().nonnegative(),
  persistencyOnlyCount: z.number().int().nonnegative(), tieBreak: z.literal('sourceId_ascending'),
}).refine((value) => value.selectedPerRanking <= value.comparedSourceCount
  && value.overlapCount + value.recurrenceOnlyCount === value.selectedPerRanking
  && value.overlapCount + value.persistencyOnlyCount === value.selectedPerRanking,
'Top-decile overlap counts must partition both rankings');
const PublisherIndicatorNumericComparison = z.object({
  status: z.enum(['available', 'not_available']), reason: z.string().nullable(),
  method: z.literal('spearman_rank_correlation_with_average_ties'),
  matchedSourceCount: z.number().int().nonnegative(), spearmanRho: z.number().min(-1).max(1).nullable(),
  topDecileAgreement: PublisherIndicatorTopDecileAgreement.nullable(),
}).superRefine((value, context) => {
  if (value.status === 'available' && (value.matchedSourceCount < 2 || value.spearmanRho === null
    || value.topDecileAgreement === null || value.reason !== null)) {
    context.addIssue({ code: 'custom', message: 'Available numeric comparison needs ranked sources, rho, and top-decile counts' });
  }
  if (value.status === 'not_available' && (value.spearmanRho !== null || value.topDecileAgreement !== null
    || !value.reason?.trim())) {
    context.addIssue({ code: 'custom', message: 'Unavailable numeric comparison must explain why no statistic is emitted' });
  }
});
const PublisherIndicatorComparison = z.object({
  schemaVersion: z.literal(1), status: z.enum(['available', 'not_available']),
  datasetSnapshotId: z.string().nullable(), inputFileSha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  target: z.literal('at_least_one_future_linked_mars_detection_record'), horizonDays: z.literal(365),
  modelVersion: z.string().nullable(), realSourceCount: z.number().int().nonnegative(),
  recurrencePredictionCount: z.number().int().nonnegative(), invalidPredictionCount: z.number().int().nonnegative(),
  persistencyCoverage: z.object({
    numericReportedCount: z.number().int().nonnegative(), missingCount: z.number().int().nonnegative(), invalidCount: z.number().int().nonnegative(),
    categoryReportedCount: z.number().int().nonnegative(), categoryMissingCount: z.number().int().nonnegative(),
    emissionStatusReportedCount: z.number().int().nonnegative(), emissionStatusMissingCount: z.number().int().nonnegative(),
  }),
  probabilityByPersistencyCategory: z.array(PublisherIndicatorCategory),
  numericPersistencyComparison: PublisherIndicatorNumericComparison,
  limitations: z.array(z.string().min(1)),
}).superRefine((value, context) => {
  const coverage = value.persistencyCoverage;
  if (coverage.numericReportedCount + coverage.missingCount + coverage.invalidCount !== value.realSourceCount
    || coverage.categoryReportedCount + coverage.categoryMissingCount !== value.realSourceCount
    || coverage.emissionStatusReportedCount + coverage.emissionStatusMissingCount !== value.realSourceCount) {
    context.addIssue({ code: 'custom', message: 'Publisher indicator coverage counts must sum to real sources' });
  }
  if (value.recurrencePredictionCount + value.invalidPredictionCount > value.realSourceCount
    || value.numericPersistencyComparison.matchedSourceCount > Math.min(
      coverage.numericReportedCount, value.recurrencePredictionCount,
    )) {
    context.addIssue({ code: 'custom', message: 'Publisher comparison counts cannot exceed their eligible source populations' });
  }
  const categorySources = value.probabilityByPersistencyCategory.reduce((sum, item) => sum + item.sourceCount, 0);
  const categoryScores = value.probabilityByPersistencyCategory.reduce((sum, item) => sum + item.scoredSourceCount, 0);
  if (categorySources !== coverage.categoryReportedCount || categoryScores > value.recurrencePredictionCount) {
    context.addIssue({ code: 'custom', message: 'Category comparison rows must match reported category coverage' });
  }
  if (value.status === 'available' && (value.recurrencePredictionCount === 0 || !value.datasetSnapshotId
    || !value.inputFileSha256 || !value.asOfDate || !value.modelVersion)) {
    context.addIssue({ code: 'custom', message: 'Available publisher comparison needs a pinned model and source snapshot' });
  }
});
const RECURRENCE_RELEASE_GATES = {
  minimumTestSources: 500,
  minimumTestPositiveLabels: 100,
  minimumTestNegativeLabels: 100,
  minimumRocAucLower95: 0.75,
  maximumExpectedCalibrationError10: 0.10,
  maximumExpectedCalibrationError10Upper95: 0.15,
  minimumBrierSkillLower95: 0.10,
  minimumTopDecileLiftLower95: 1.50,
  minimumBootstrapReplicates: 400,
  minimumCountryClusters: 30,
} as const;
const REQUIRED_RECURRENCE_GATES = [
  'minimumTestCohort', 'minimumPositiveAndNegativeTestLabels', 'rocAucLower95', 'calibrationEce10',
  'calibrationEceUpper95', 'brierSkillLower95', 'topDecileLiftLower95', 'baselineAucDeltaLower95',
  'minimumBootstrapReplicates', 'minimumCountryClusters',
] as const;
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
  observedFluxTrend: ObservedFluxTrend.optional(),
  priorityComponents: z.object({ recurrenceContribution: z.number(), magnitudeContribution: z.number().nullable(), magnitudeBasis: z.string() }),
  observedPersistency: z.number().nullable(), observedPersistencyStd: z.number().nullable(),
  observedPersistencyCategory: z.string().nullable().optional(), emissionStatus: z.string().nullable().optional(),
  indicatorComparison: z.string(), lastObserved: z.string().nullable().optional(), dataSufficiency: z.string(),
  reasons: z.array(z.string()), forecast: ForecastReadiness.optional(), recordRecurrenceForecast: RecordRecurrenceForecast.optional(),
});
const Snapshot = z.object({ schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]), kind: z.literal('observational_investigation_ranking'), modelVersion: z.string(), trainedModel: z.literal(false), calibratedProbability: z.literal(false), generatedAt: z.string(), inputFileSha256: z.string().regex(/^[0-9a-f]{64}$/), upstreamArchiveSha256: z.string().nullable().optional(), sourceCount: z.number().int(), method: z.string(), limitations: z.array(z.string()), sources: z.array(Row) })
  .extend({
    datasetSnapshotId: z.string().nullable(), linkedObservationCount: z.number().int().nonnegative(),
    sourceDataset: z.string().nullable(), sourceProvider: z.string().nullable(), datasetLicense: z.string().nullable(),
    catalogUrl: z.string().url().nullable(), datasetAttribution: z.string().nullable(),
    sourceProvenance: MarsProvenance.optional(),
    observedTrendMethod: ObservedTrendMethod.optional(), forecastReadiness: ForecastReadiness.optional(),
    recordRecurrenceModel: RecordRecurrenceModel.optional(),
    publisherIndicatorComparison: PublisherIndicatorComparison.optional(),
  });

type ValidatedSnapshot = z.infer<typeof Snapshot> & { snapshotSha256: string };
type TrendSummary = z.infer<typeof ObservedFluxTrend>;
type TrendMethod = z.infer<typeof ObservedTrendMethod>;
let validatedCache: { key: string; value: ValidatedSnapshot } | undefined;
let validationInFlight: { key: string; promise: Promise<ValidatedSnapshot> } | undefined;

export function expandObservedFluxTrend(summary?: TrendSummary, method?: TrendMethod) {
  if (!summary || !method) return undefined;
  const reason = summary.status === 'insufficient_observations'
    ? `${summary.numericObservationDates} distinct dates contain numeric reported flux; at least ${method.minimumNumericObservationDates} are required for a descriptive trend.`
    : summary.status === 'insufficient_temporal_coverage'
      ? `The ${summary.numericObservationDates} numeric-flux dates span ${summary.spanDays} days; at least ${method.minimumSpanDays} days are required for a descriptive trend.`
      : `The median pairwise Theil–Sen slope uses ${summary.numericObservationDates} distinct detection dates across ${summary.spanDays} days. It describes sampled observations only.`;
  return { ...method, ...summary, reason, limitation: method.limitation };
}

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
    if (snapshot.schemaVersion === 2 && (!snapshot.observedTrendMethod || !snapshot.forecastReadiness?.missingRequirements
      || snapshot.sources.some((row) => !row.observedFluxTrend))) {
      throw new Error('Version 2 intelligence snapshots must include trend method, forecast-readiness, and source trend summaries');
    }
    if (snapshot.schemaVersion === 3) {
      const model = snapshot.recordRecurrenceModel;
      if (!model || model.inputFileSha256 !== snapshot.inputFileSha256 || model.datasetSnapshotId !== snapshot.datasetSnapshotId) {
        throw new Error('Version 3 recurrence model metadata must match the pinned dataset snapshot and input hash');
      }
      if (model.status === 'historical_backtest_passed') {
        const cohort = model.testCohort;
        const reference = model.testBrierReference;
        const intervals = model.confidenceIntervals95;
        const bootstrap = model.bootstrap;
        const baseline = model.baselineComparison;
        const allRegisteredGatesPassed = REQUIRED_RECURRENCE_GATES.every((gate) => model.releaseGateResults?.[gate] === true);
        const intervalsMeetThresholds = Boolean(
          intervals?.rocAuc && intervals.rocAuc.lower95 >= RECURRENCE_RELEASE_GATES.minimumRocAucLower95
          && intervals.rocAuc.upper95 <= 1
          && intervals.expectedCalibrationError10
          && intervals.expectedCalibrationError10.lower95 >= 0
          && intervals.expectedCalibrationError10.upper95 <= RECURRENCE_RELEASE_GATES.maximumExpectedCalibrationError10Upper95
          && intervals.brierSkill
          && intervals.brierSkill.lower95 >= RECURRENCE_RELEASE_GATES.minimumBrierSkillLower95
          && intervals.brierSkill.upper95 <= 1
          && intervals.liftAtTopDecile
          && intervals.liftAtTopDecile.lower95 >= RECURRENCE_RELEASE_GATES.minimumTopDecileLiftLower95
          && intervals.rocAucDeltaVsBaseline
          && intervals.rocAucDeltaVsBaseline.lower95 > 0
          && intervals.rocAucDeltaVsBaseline.upper95 <= 1
        );
        const cohortMeetsThresholds = Boolean(cohort
          && cohort.sourceCount >= RECURRENCE_RELEASE_GATES.minimumTestSources
          && cohort.positiveCount >= RECURRENCE_RELEASE_GATES.minimumTestPositiveLabels
          && cohort.sourceCount - cohort.positiveCount >= RECURRENCE_RELEASE_GATES.minimumTestNegativeLabels
          && cohort.expectedCalibrationError10 <= RECURRENCE_RELEASE_GATES.maximumExpectedCalibrationError10);
        const bootstrapMeetsThresholds = Boolean(bootstrap
          && bootstrap.replicatesRequested >= RECURRENCE_RELEASE_GATES.minimumBootstrapReplicates
          && bootstrap.clusterCount >= RECURRENCE_RELEASE_GATES.minimumCountryClusters);
        const brierSkillConsistent = Boolean(cohort && reference && reference.brierScore > 0
          && Math.abs(reference.brierSkillScore - (1 - cohort.brierScore / reference.brierScore)) <= 0.000001);
        if (!cohort || !reference || !intervals || !bootstrap || !baseline || !model.releaseGateResults
          || !model.datasetLastObservedDate || !model.testOrigin || !model.testWindowEnd
          || !allRegisteredGatesPassed || Object.values(model.releaseGateResults).some((passed) => !passed)
          || !intervalsMeetThresholds || !cohortMeetsThresholds || !bootstrapMeetsThresholds || !brierSkillConsistent) {
          throw new Error('A passing recurrence model must satisfy every registered recurrence gate and metric bound');
        }
      }
      if (snapshot.sources.some((row) => row.recordRecurrenceForecast && (
        model.status !== 'historical_backtest_passed'
        || row.recordRecurrenceForecast.modelVersion !== model.modelVersion
        || row.recordRecurrenceForecast.asOfDate !== model.datasetLastObservedDate
      ))) throw new Error('Per-source recurrence estimate does not match its validated model snapshot');
      const comparison = snapshot.publisherIndicatorComparison;
      if (comparison) {
        if (comparison.datasetSnapshotId !== snapshot.datasetSnapshotId
          || comparison.inputFileSha256 !== snapshot.inputFileSha256
          || comparison.datasetSnapshotId !== model.datasetSnapshotId
          || comparison.inputFileSha256 !== model.inputFileSha256
          || comparison.asOfDate !== (model.datasetLastObservedDate ?? null)
          || comparison.target !== model.target || comparison.horizonDays !== model.horizonDays
          || comparison.modelVersion !== model.modelVersion
          || comparison.realSourceCount > snapshot.sourceCount) {
          throw new Error('Publisher indicator comparison does not match the pinned snapshot and recurrence model');
        }
        if ((model.status === 'historical_backtest_passed') !== (comparison.status === 'available')) {
          throw new Error('Publisher indicator comparison availability does not match the recurrence model gate');
        }
      }
      const forecastCount = snapshot.sources.filter((row) => row.recordRecurrenceForecast).length;
      if (model.predictionSourceCount !== undefined && model.predictionSourceCount !== forecastCount) {
        throw new Error('Per-source recurrence estimate count does not match model metadata');
      }
    }
    if (snapshot.sources.some((row) => row.observationIds.length !== row.observationTimestamps.length
      || new Set(row.observationIds).size !== row.observationIds.length)) {
      throw new Error('Intelligence observation identifiers and timestamps are inconsistent');
    }
    if (snapshot.sources.some((row) => row.observedFluxTrend && (
      row.observedFluxTrend.numericObservationDates > row.numericFluxObservationCount
      || (row.observedFluxTrend.numericObservationDates > 0 && (
        row.observedFluxTrend.firstObservationDate === null
        || row.observedFluxTrend.lastObservationDate === null
        || row.observedFluxTrend.firstObservedMedianFluxKgHr === null
        || row.observedFluxTrend.lastObservedMedianFluxKgHr === null
        || row.observedFluxTrend.firstObservationDate > row.observedFluxTrend.lastObservationDate
        || !row.observationDates.includes(row.observedFluxTrend.firstObservationDate)
        || !row.observationDates.includes(row.observedFluxTrend.lastObservationDate)
      ))
      || (row.observedFluxTrend.numericObservationDates === 0 && (
        row.observedFluxTrend.firstObservationDate !== null
        || row.observedFluxTrend.lastObservationDate !== null
        || row.observedFluxTrend.firstObservedMedianFluxKgHr !== null
        || row.observedFluxTrend.lastObservedMedianFluxKgHr !== null
      ))
      || (row.observedFluxTrend.status === 'insufficient_observations' && snapshot.observedTrendMethod
        && row.observedFluxTrend.numericObservationDates >= snapshot.observedTrendMethod.minimumNumericObservationDates)
      || (row.observedFluxTrend.status === 'insufficient_temporal_coverage' && snapshot.observedTrendMethod && (
        row.observedFluxTrend.numericObservationDates < snapshot.observedTrendMethod.minimumNumericObservationDates
        || row.observedFluxTrend.spanDays >= snapshot.observedTrendMethod.minimumSpanDays
      ))
      || (row.observedFluxTrend.status === 'descriptive_trend' && (
        !snapshot.observedTrendMethod
        || row.observedFluxTrend.numericObservationDates < snapshot.observedTrendMethod.minimumNumericObservationDates
        || row.observedFluxTrend.spanDays < snapshot.observedTrendMethod.minimumSpanDays
        || row.observedFluxTrend.slopeKgHrPer30Days === null
        || row.observedFluxTrend.positivePairwiseSlopeShare === null
        || row.observedFluxTrend.pairwiseSlopeCount !== row.observedFluxTrend.numericObservationDates * (row.observedFluxTrend.numericObservationDates - 1) / 2
      ))
      || (row.observedFluxTrend.status !== 'descriptive_trend' && (
        row.observedFluxTrend.slopeKgHrPer30Days !== null || row.observedFluxTrend.pairwiseSlopeCount !== 0
        || row.observedFluxTrend.positivePairwiseSlopeShare !== null
      ))
    ))) throw new Error('Observed trend summary or eligibility metadata are inconsistent');
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
