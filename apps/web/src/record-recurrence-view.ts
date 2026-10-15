export type RecordRecurrenceForecast = {
  status: 'available' | string;
  modelVersion: string;
  target: string;
  asOfDate: string;
  horizonDays: number;
  probability: number;
};

type MetricInterval = { lower95: number; upper95: number };

export type RecordRecurrenceModel = {
  status: 'historical_backtest_passed' | 'not_available' | string;
  modelVersion: string;
  target: string;
  horizonDays: number;
  reason?: string;
  datasetLastObservedDate?: string;
  testOrigin?: string;
  testWindowEnd?: string;
  testCohort?: {
    sourceCount: number;
    positiveCount: number;
    prevalence: number;
    rocAuc: number;
    brierScore: number;
    expectedCalibrationError10: number;
    precisionAtTopDecile: number;
    liftAtTopDecile: number;
  };
  testBrierReference?: { brierScore: number; brierSkillScore: number };
  confidenceIntervals95?: Record<string, MetricInterval>;
  bootstrap?: { resamplingUnit: string; clusterCount: number; replicatesRequested: number };
  baselineComparison?: { rocAuc: number; precisionAtTopDecile?: number };
  releaseGateResults?: Record<string, boolean>;
  evaluationRole?: string;
  limitations?: string[];
};

export type RecordRecurrenceView = {
  probabilityPercent: string;
  validationStatus: string;
  targetLabel: string;
  asOfDate: string;
  horizonDays: number;
  testOrigin: string;
  testWindowEnd: string;
  testSourceCount: number;
  positiveCount: number;
  rocAuc: number;
  rocAucLower95: number;
  rocAucUpper95: number;
  brierScore: number;
  brierSkillScore: number;
  brierSkillLower95: number;
  ece10: number;
  ece10Upper95: number;
  precisionAtTopDecile: number;
  precisionAtTopDecileLower95: number;
  precisionAtTopDecileUpper95: number;
  liftAtTopDecile: number;
  liftAtTopDecileLower95: number;
  liftAtTopDecileUpper95: number;
  baselineAuc: number;
  baselineAucDeltaLower95: number;
  baselineAucDeltaUpper95: number;
  countryClusterCount: number;
  bootstrapReplicates: number;
  disclaimer: string;
};

const TARGET = 'at_least_one_future_linked_mars_detection_record';
const REQUIRED_RELEASE_GATES = [
  'minimumTestCohort', 'minimumPositiveAndNegativeTestLabels', 'rocAucLower95', 'calibrationEce10',
  'calibrationEceUpper95', 'brierSkillLower95', 'topDecileLiftLower95', 'baselineAucDeltaLower95',
  'minimumBootstrapReplicates', 'minimumCountryClusters',
] as const;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function inRange(value: unknown, min: number, max: number): value is number {
  return finite(value) && value >= min && value <= max;
}

function validIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function interval(model: RecordRecurrenceModel, name: string): MetricInterval | null {
  const candidate = model.confidenceIntervals95?.[name];
  return candidate && finite(candidate.lower95) && finite(candidate.upper95)
    && candidate.lower95 <= candidate.upper95 ? candidate : null;
}

export function makeRecordRecurrenceView(
  forecast: RecordRecurrenceForecast | undefined,
  model: RecordRecurrenceModel | undefined,
): RecordRecurrenceView | null {
  if (!forecast || !model || forecast.status !== 'available' || model.status !== 'historical_backtest_passed') return null;
  if (!model.evaluationRole?.startsWith('retrospective_temporal_development_holdout')) return null;
  if (forecast.modelVersion !== model.modelVersion || forecast.target !== TARGET || model.target !== TARGET
    || forecast.horizonDays !== 365 || model.horizonDays !== forecast.horizonDays
    || !finite(forecast.probability) || forecast.probability <= 0 || forecast.probability >= 1
    || !validIsoDay(forecast.asOfDate)
    || forecast.asOfDate !== model.datasetLastObservedDate
    || !model.testOrigin || !model.testWindowEnd
    || !model.testCohort || !model.testBrierReference || !model.bootstrap
    || model.bootstrap.resamplingUnit !== 'country_cluster'
    || !Number.isInteger(model.bootstrap.clusterCount) || model.bootstrap.clusterCount < 2
    || !Number.isInteger(model.bootstrap.replicatesRequested) || model.bootstrap.replicatesRequested < 20
    || !model.releaseGateResults || REQUIRED_RELEASE_GATES.some(gate => model.releaseGateResults?.[gate] !== true)
    || Object.values(model.releaseGateResults).some(value => value !== true)) return null;

  const metrics = model.testCohort;
  const intervals = {
    rocAuc: interval(model, 'rocAuc'),
    brierSkill: interval(model, 'brierSkill'),
    expectedCalibrationError10: interval(model, 'expectedCalibrationError10'),
    precisionAtTopDecile: interval(model, 'precisionAtTopDecile'),
    liftAtTopDecile: interval(model, 'liftAtTopDecile'),
    rocAucDeltaVsBaseline: interval(model, 'rocAucDeltaVsBaseline'),
  };
  if (Object.values(intervals).some(value => value === null)) return null;
  const baselineAuc = model.baselineComparison?.rocAuc;
  if (!Number.isInteger(metrics.sourceCount) || metrics.sourceCount < 1
    || !Number.isInteger(metrics.positiveCount) || metrics.positiveCount < 0 || metrics.positiveCount > metrics.sourceCount
    || !inRange(metrics.prevalence, 0, 1)
    || Math.abs(metrics.prevalence - metrics.positiveCount / metrics.sourceCount) > 0.000001
    || !inRange(metrics.rocAuc, 0, 1) || !inRange(metrics.brierScore, 0, 1)
    || !inRange(metrics.expectedCalibrationError10, 0, 1)
    || !inRange(metrics.precisionAtTopDecile, 0, 1) || !finite(metrics.liftAtTopDecile)
    || !inRange(model.testBrierReference.brierSkillScore, -10, 1)
    || !inRange(model.testBrierReference.brierScore, 0, 1)
    || !inRange(baselineAuc, 0, 1)
    || !inRange(intervals.rocAuc!.lower95, 0, 1) || !inRange(intervals.rocAuc!.upper95, 0, 1)
    || !inRange(intervals.brierSkill!.lower95, -10, 1) || !inRange(intervals.brierSkill!.upper95, -10, 1)
    || !inRange(intervals.expectedCalibrationError10!.lower95, 0, 1) || !inRange(intervals.expectedCalibrationError10!.upper95, 0, 1)
    || !inRange(intervals.precisionAtTopDecile!.lower95, 0, 1) || !inRange(intervals.precisionAtTopDecile!.upper95, 0, 1)
    || intervals.liftAtTopDecile!.lower95 < 0 || intervals.liftAtTopDecile!.upper95 < 0
    || !inRange(intervals.rocAucDeltaVsBaseline!.lower95, -1, 1) || !inRange(intervals.rocAucDeltaVsBaseline!.upper95, -1, 1)) return null;

  const roc = intervals.rocAuc!;
  const brierSkill = intervals.brierSkill!;
  const ece = intervals.expectedCalibrationError10!;
  const precision = intervals.precisionAtTopDecile!;
  const lift = intervals.liftAtTopDecile!;
  const aucDelta = intervals.rocAucDeltaVsBaseline!;
  return {
    probabilityPercent: `${(forecast.probability * 100).toFixed(1)}%`,
    validationStatus: 'Same-snapshot development holdout · prospective/external validation pending',
    targetLabel: 'At least one future linked MARS detection record within 365 days',
    asOfDate: forecast.asOfDate,
    horizonDays: forecast.horizonDays,
    testOrigin: model.testOrigin,
    testWindowEnd: model.testWindowEnd,
    testSourceCount: metrics.sourceCount,
    positiveCount: metrics.positiveCount,
    rocAuc: metrics.rocAuc,
    rocAucLower95: roc.lower95,
    rocAucUpper95: roc.upper95,
    brierScore: metrics.brierScore,
    brierSkillScore: model.testBrierReference.brierSkillScore,
    brierSkillLower95: brierSkill.lower95,
    ece10: metrics.expectedCalibrationError10,
    ece10Upper95: ece.upper95,
    precisionAtTopDecile: metrics.precisionAtTopDecile,
    precisionAtTopDecileLower95: precision.lower95,
    precisionAtTopDecileUpper95: precision.upper95,
    liftAtTopDecile: metrics.liftAtTopDecile,
    liftAtTopDecileLower95: lift.lower95,
    liftAtTopDecileUpper95: lift.upper95,
    baselineAuc,
    baselineAucDeltaLower95: aucDelta.lower95,
    baselineAucDeltaUpper95: aucDelta.upper95,
    countryClusterCount: model.bootstrap.clusterCount,
    bootstrapReplicates: model.bootstrap.replicatesRequested,
    disclaimer: 'This is not a probability of active methane emissions, future flux, or a continuing leak. The 95% intervals summarize historical test metrics across country clusters; they are not an individual source prediction interval. No record in the archive does not mean zero emissions.',
  };
}
