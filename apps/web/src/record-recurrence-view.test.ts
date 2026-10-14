import { expect, test } from 'bun:test';
import { makeRecordRecurrenceView, type RecordRecurrenceForecast, type RecordRecurrenceModel } from './record-recurrence-view';

function model(): RecordRecurrenceModel {
  return {
    status: 'historical_backtest_passed',
    modelVersion: 'mars-linked-record-recurrence-logistic-v1',
    target: 'at_least_one_future_linked_mars_detection_record',
    horizonDays: 365,
    datasetLastObservedDate: '2026-09-11',
    testOrigin: '2025-09-11',
    testWindowEnd: '2026-09-11',
    testCohort: {
      sourceCount: 3130,
      positiveCount: 1249,
      prevalence: 0.39904153,
      rocAuc: 0.80751683,
      brierScore: 0.18146372,
      expectedCalibrationError10: 0.08845709,
      precisionAtTopDecile: 0.86261981,
      liftAtTopDecile: 2.16172938,
    },
    testBrierReference: { brierScore: 0.25038163, brierSkillScore: 0.27525146 },
    confidenceIntervals95: {
      rocAuc: { lower95: 0.78637858, upper95: 0.82748491 },
      brierSkill: { lower95: 0.23744367, upper95: 0.31067418 },
      expectedCalibrationError10: { lower95: 0.05308951, upper95: 0.14133753 },
      precisionAtTopDecile: { lower95: 0.79574468, upper95: 0.93696275 },
      liftAtTopDecile: { lower95: 1.8253108, upper95: 2.5822731 },
      rocAucDeltaVsBaseline: { lower95: 0.02066957, upper95: 0.0412876 },
    },
    bootstrap: { resamplingUnit: 'country_cluster', clusterCount: 79, replicatesRequested: 400 },
    baselineComparison: { rocAuc: 0.77798741, precisionAtTopDecile: 0.85521702 },
    releaseGateResults: {
      minimumTestCohort: true,
      minimumPositiveAndNegativeTestLabels: true,
      rocAucLower95: true,
      calibrationEce10: true,
      calibrationEceUpper95: true,
      brierSkillLower95: true,
      topDecileLiftLower95: true,
      baselineAucDeltaLower95: true,
      minimumBootstrapReplicates: true,
      minimumCountryClusters: true,
    },
    evaluationRole: 'retrospective_temporal_development_holdout',
    limitations: ['Archive-record recurrence only.'],
  };
}

const forecast: RecordRecurrenceForecast = {
  status: 'available',
  modelVersion: 'mars-linked-record-recurrence-logistic-v1',
  target: 'at_least_one_future_linked_mars_detection_record',
  asOfDate: '2026-09-11',
  horizonDays: 365,
  probability: 0.917326,
};

test('presents the calibrated probability with its exact archive-record target and backtest evidence', () => {
  const view = makeRecordRecurrenceView(forecast, model());

  expect(view?.probabilityPercent).toBe('91.7%');
  expect(view?.targetLabel).toContain('linked MARS detection record');
  expect(view?.asOfDate).toBe('2026-09-11');
  expect(view?.testSourceCount).toBe(3130);
  expect(view?.rocAuc).toBe(0.80751683);
  expect(view?.rocAucLower95).toBe(0.78637858);
  expect(view?.countryClusterCount).toBe(79);
  expect(view?.disclaimer).toContain('not a probability of active methane emissions');
  expect(view?.baselineAuc).toBe(0.77798741);
  expect(view?.baselineAucDeltaLower95).toBe(0.02066957);
});

test('hides estimates when the model, target, date, or status does not match', () => {
  expect(makeRecordRecurrenceView({ ...forecast, status: 'unavailable' } as unknown as RecordRecurrenceForecast, model())).toBeNull();
  expect(makeRecordRecurrenceView({ ...forecast, modelVersion: 'another-model' }, model())).toBeNull();
  expect(makeRecordRecurrenceView(forecast, { ...model(), status: 'not_available' })).toBeNull();
  expect(makeRecordRecurrenceView({ ...forecast, probability: Number.NaN }, model())).toBeNull();
  expect(makeRecordRecurrenceView(forecast, { ...model(), releaseGateResults: { calibration: false } })).toBeNull();
  expect(makeRecordRecurrenceView(forecast, { ...model(), datasetLastObservedDate: '2026-09-10' })).toBeNull();
  expect(makeRecordRecurrenceView(forecast, { ...model(), confidenceIntervals95: { ...model().confidenceIntervals95, rocAuc: { lower95: -0.1, upper95: 0.9 } } })).toBeNull();
});
