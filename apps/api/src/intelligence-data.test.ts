import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app';
import { expandObservedFluxTrend, getIntelligenceSnapshot } from './intelligence-data';
import { MemoryAuditStore } from './store';

function snapshotFor(input: Buffer) {
  return {
    schemaVersion: 2,
    kind: 'observational_investigation_ranking',
    modelVersion: 'test-priority-v4',
    datasetSnapshotId: 'unep-mars-aaaaaaaaaaaa',
    linkedObservationCount: 4,
    sourceDataset: 'Test MARS dataset', sourceProvider: 'UNEP IMEO', datasetLicense: 'CC BY-NC-SA 4.0',
    catalogUrl: 'https://methanedata.unep.org/download-dataset', datasetAttribution: 'UNEP IMEO test attribution',
    sourceProvenance: {
      provider: 'UNEP IMEO', dataset: 'Test MARS dataset',
      catalogUrl: 'https://methanedata.unep.org/download-dataset', downloadUrl: 'https://example.org/mars.zip',
      retrievedAt: '2026-10-11T00:00:00+00:00', archiveSha256: 'a'.repeat(64),
      snapshotId: 'unep-mars-aaaaaaaaaaaa', license: 'CC BY-NC-SA 4.0', attribution: 'UNEP IMEO test attribution',
    },
    trainedModel: false,
    calibratedProbability: false,
    observedTrendMethod: {
      methodVersion: 'theil-sen-event-trend-v1', minimumNumericObservationDates: 4,
      minimumSpanDays: 90, ratePeriodDays: 30, limitation: 'Historical event trend only; not a forecast.',
    },
    forecastReadiness: {
      status: 'not_available', reason: 'Opportunity labels are missing.',
      missingRequirements: ['complete_observation_opportunities', 'independent_future_outcome_labels', 'held_out_temporal_validation'],
    },
    generatedAt: '2026-10-11T00:00:00+00:00',
    inputFileSha256: createHash('sha256').update(input).digest('hex'),
    upstreamArchiveSha256: 'a'.repeat(64),
    sourceCount: 1,
    method: 'Test heuristic only',
    limitations: ['Not a forecast.'],
    sources: [{
      sourceId: 'KAZ_S_159', priorityScore: 45, priorityBand: 'medium', priorityType: 'heuristic_not_probability',
      observationCount: 4, sourceReportedPlumeCount: 4, uniqueObservationDates: 4,
      observationIds: ['p1', 'p2', 'p3', 'p4'],
      observationDates: ['2026-01-01', '2026-02-10', '2026-03-22', '2026-05-01'],
      observationTimestamps: ['2026-01-01T08:00:00Z', '2026-02-10T08:00:00Z', '2026-03-22T08:00:00Z', '2026-05-01T08:12:14Z'],
      numericFluxObservationCount: 4, missingFluxObservationCount: 0, measurementAvailability: 'numeric_flux_available',
      medianObservedFluxKgHr: 500, medianAbsoluteDeviationKgHr: 100, medianObservationUncertaintyKgHr: 20,
      priorityComponents: { recurrenceContribution: 20, magnitudeContribution: 11, magnitudeBasis: 'observed flux' },
      robustOutlierCount: null, observedPersistency: 0.67, observedPersistencyStd: 0.27,
      anomalyAnalysis: {
        methodVersion: 'mad-threshold-screen-v1', status: 'insufficient_observations',
        reason: '4 numeric observations are available; at least 8 are required for this screen.',
        minimumNumericObservations: 8, minimumDistinctObservationDates: 4,
        numericObservationCount: 4, distinctNumericObservationDates: 4,
        baselineMedianFluxKgHr: 500, medianAbsoluteDeviationKgHr: 100, robustScaleKgHr: 148.26,
        scaleBasis: 'scaled_mad',
        thresholdRule: 'flag when absolute deviation exceeds max(3.5 × robust scale, 2 × reported observation uncertainty)',
        flaggedObservations: [], limitation: 'Screen only; not proof of repair or emissions reduction.',
      },
      observedPersistencyCategory: 'frequent', emissionStatus: null,
      indicatorComparison: 'Context only.', lastObserved: '2026-07-11T08:12:14', dataSufficiency: 'limited',
      reasons: ['Three observed records.'],
      observedFluxTrend: {
        status: 'descriptive_trend', numericObservationDates: 4, spanDays: 120,
        pairwiseSlopeCount: 6, slopeKgHrPer30Days: 106.25, positivePairwiseSlopeShare: 1,
        firstObservationDate: '2026-01-01', lastObservationDate: '2026-05-01',
        firstObservedMedianFluxKgHr: 300, lastObservedMedianFluxKgHr: 700, medianReportedUncertaintyKgHr: 20,
      },
      forecast: { status: 'not_available', reason: 'Legacy per-source forecast abstention.' },
    }],
  };
}

type TestRecurrenceForecast = {
  status: 'available'; modelVersion: string; target: string; asOfDate: string; horizonDays: number; probability: number;
};
type TestSnapshotV3 = ReturnType<typeof snapshotFor> & {
  recordRecurrenceModel?: Record<string, unknown>;
  publisherIndicatorComparison?: Record<string, unknown>;
  sources: Array<ReturnType<typeof snapshotFor>['sources'][number] & { recordRecurrenceForecast?: TestRecurrenceForecast }>;
};

test('serves an intelligence snapshot only when it is bound to the current input bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-intelligence-test-'));
  const snapshotPath = join(dir, 'snapshot.json');
  const inputPath = join(dir, 'casebook.json');
  try {
    const input = Buffer.from('{"schemaVersion":1,"pinned":"casebook"}\n');
    await writeFile(inputPath, input);
    const bytes = Buffer.from(JSON.stringify(snapshotFor(input), null, 2) + '\n');
    await writeFile(snapshotPath, bytes);
    const [loaded, concurrentLoad] = await Promise.all([
      getIntelligenceSnapshot(snapshotPath, inputPath),
      getIntelligenceSnapshot(snapshotPath, inputPath),
    ]);
    expect(loaded).toBe(concurrentLoad);
    expect(loaded.snapshotSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(loaded.sources[0].sourceId).toBe('KAZ_S_159');
    expect(loaded.datasetSnapshotId).toBe('unep-mars-aaaaaaaaaaaa');
    expect(loaded.datasetLicense).toBe('CC BY-NC-SA 4.0');

    await writeFile(inputPath, '{"schemaVersion":1,"pinned":"changed"}\n');
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/input.*hash|stale/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects an invalid observed flux summary in a version 2 snapshot', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-trend-validation-'));
  const snapshotPath = join(dir, 'snapshot.json');
  const inputPath = join(dir, 'casebook.json');
  try {
    const input = Buffer.from('{"snapshot":"trend-test"}\n');
    await writeFile(inputPath, input);
    const snapshot = snapshotFor(input);
    snapshot.sources[0].observedFluxTrend.firstObservedMedianFluxKgHr = -1;
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/observedFluxTrend|firstObservedMedianFluxKgHr/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('continues to accept legacy version 1 snapshots without observed trend fields', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-legacy-intelligence-'));
  const snapshotPath = join(dir, 'snapshot.json');
  const inputPath = join(dir, 'casebook.json');
  try {
    const input = Buffer.from('{"snapshot":"legacy-test"}\n');
    await writeFile(inputPath, input);
    const snapshot = snapshotFor(input);
    snapshot.schemaVersion = 1;
    Reflect.deleteProperty(snapshot.sources[0], 'observedFluxTrend');
    Reflect.deleteProperty(snapshot, 'observedTrendMethod');
    Reflect.deleteProperty(snapshot, 'forecastReadiness');
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    const loaded = await getIntelligenceSnapshot(snapshotPath, inputPath);
    expect(loaded.schemaVersion).toBe(1);
    expect(loaded.sources[0].observedFluxTrend).toBeUndefined();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('accepts a hash-bound version 3 record-recurrence estimate and rejects a broken probability', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-record-recurrence-'));
  const snapshotPath = join(dir, 'snapshot.json');
  const inputPath = join(dir, 'mars.json.gz');
  try {
    const input = Buffer.from('record-recurrence-v3-input');
    await writeFile(inputPath, input);
    const snapshot = snapshotFor(input) as TestSnapshotV3;
    snapshot.schemaVersion = 3;
    snapshot.modelVersion = 'transparent-priority-v5';
    snapshot.recordRecurrenceModel = {
      schemaVersion: 1,
      modelVersion: 'mars-linked-record-recurrence-logistic-v1',
      status: 'historical_backtest_passed',
      target: 'at_least_one_future_linked_mars_detection_record',
      horizonDays: 365,
      datasetSnapshotId: snapshot.datasetSnapshotId,
      inputFileSha256: createHash('sha256').update(input).digest('hex'),
      datasetLastObservedDate: '2026-09-11',
      retrievedAt: '2026-10-12T10:20:45+00:00',
      testOrigin: '2025-09-11',
      testWindowEnd: '2026-09-11',
      testCohort: {
        sourceCount: 3130, positiveCount: 1249, prevalence: 0.39904153,
        rocAuc: 0.80751683, brierScore: 0.18146372, expectedCalibrationError10: 0.08845709,
        precisionAtTopDecile: 0.86261981, recallAtTopDecile: 0.21617294, liftAtTopDecile: 2.16172938,
      },
      testBrierReference: { probabilityFromCalibrationCohort: 0.50187266, brierScore: 0.25038163, brierSkillScore: 0.27525146 },
      confidenceIntervals95: {
        rocAuc: { lower95: 0.7925, upper95: 0.8221 },
        brierScore: { lower95: 0.1760, upper95: 0.1872 },
        brierSkill: { lower95: 0.2374, upper95: 0.3107 },
        expectedCalibrationError10: { lower95: 0.0531, upper95: 0.1414 },
        precisionAtTopDecile: { lower95: 0.8242, upper95: 0.9042 },
        liftAtTopDecile: { lower95: 2.0606, upper95: 2.2855 },
        rocAucDeltaVsBaseline: { lower95: 0.0207, upper95: 0.0413 },
      },
      baselineComparison: { name: 'recent_365_day_linked_detection_dates', rocAuc: 0.778, precisionAtTopDecile: 0.8552 },
      bootstrap: { method: 'percentile_cluster_bootstrap', resamplingUnit: 'country_cluster', clusterCount: 79, replicatesRequested: 400, seed: 177 },
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
      predictionSourceCount: 1,
      limitations: ['Archive record only; not a physical emissions forecast.'],
    };
    snapshot.sources[0]!.recordRecurrenceForecast = {
      status: 'available', modelVersion: 'mars-linked-record-recurrence-logistic-v1',
      target: 'at_least_one_future_linked_mars_detection_record', asOfDate: '2026-09-11',
      horizonDays: 365, probability: 0.72,
    };
    snapshot.publisherIndicatorComparison = {
      schemaVersion: 1,
      status: 'available',
      datasetSnapshotId: snapshot.datasetSnapshotId,
      inputFileSha256: createHash('sha256').update(input).digest('hex'),
      asOfDate: '2026-09-11',
      target: 'at_least_one_future_linked_mars_detection_record',
      horizonDays: 365,
      modelVersion: 'mars-linked-record-recurrence-logistic-v1',
      realSourceCount: 1,
      recurrencePredictionCount: 1,
      invalidPredictionCount: 0,
      persistencyCoverage: {
        numericReportedCount: 1, missingCount: 0, invalidCount: 0,
        categoryReportedCount: 1, categoryMissingCount: 0,
        emissionStatusReportedCount: 0, emissionStatusMissingCount: 1,
      },
      probabilityByPersistencyCategory: [{
        category: 'frequent', sourceCount: 1, scoredSourceCount: 1, medianProbability: 0.72,
      }],
      numericPersistencyComparison: {
        status: 'not_available',
        reason: 'At least two sources with both a valid estimate and numeric publisher persistency are required.',
        method: 'spearman_rank_correlation_with_average_ties',
        matchedSourceCount: 1,
        spearmanRho: null,
        topDecileAgreement: null,
      },
      limitations: ['Publisher metadata is not ground truth.'],
    };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    const loaded = await getIntelligenceSnapshot(snapshotPath, inputPath);
    expect(loaded.schemaVersion).toBe(3);
    expect(loaded.sources[0]!.recordRecurrenceForecast?.probability).toBe(0.72);
    expect(loaded.publisherIndicatorComparison?.status).toBe('available');

    const comparison = snapshot.publisherIndicatorComparison;
    snapshot.publisherIndicatorComparison = { ...comparison, datasetSnapshotId: 'unep-mars-other123456' };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/publisher indicator comparison.*pinned snapshot/i);
    snapshot.publisherIndicatorComparison = comparison;

    snapshot.sources[0]!.recordRecurrenceForecast.probability = 1.01;
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/recordRecurrenceForecast|probability/i);

    snapshot.sources[0]!.recordRecurrenceForecast.probability = 0.72;
    const model = snapshot.recordRecurrenceModel!;
    const gates = { ...(model.releaseGateResults as Record<string, boolean>) };
    delete gates.minimumBootstrapReplicates;
    snapshot.recordRecurrenceModel = { ...model, releaseGateResults: gates };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/registered recurrence gate/i);

    snapshot.recordRecurrenceModel = { ...model, releaseGateResults: { ...(model.releaseGateResults as Record<string, boolean>) }, bootstrap: { ...(model.bootstrap as Record<string, unknown>), replicatesRequested: 399 } };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/registered recurrence gate/i);

    snapshot.recordRecurrenceModel = {
      ...model,
      testCohort: { ...(model.testCohort as Record<string, unknown>), expectedCalibrationError10: 0.2 },
    };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/registered recurrence gate/i);

    snapshot.recordRecurrenceModel = {
      ...model,
      confidenceIntervals95: {
        ...(model.confidenceIntervals95 as Record<string, unknown>),
        expectedCalibrationError10: { lower95: -0.01, upper95: 0.14 },
      },
    };
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/registered recurrence gate/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects a versioned intelligence snapshot whose source archive provenance disagrees with its pin', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'methane-provenance-test-'));
  const snapshotPath = join(dir, 'snapshot.json');
  const inputPath = join(dir, 'mars.json.gz');
  try {
    const input = Buffer.from('pinned MARS input bytes');
    await writeFile(inputPath, input);
    const snapshot = snapshotFor(input);
    snapshot.sourceProvenance.archiveSha256 = 'b'.repeat(64);
    await writeFile(snapshotPath, JSON.stringify(snapshot));
    await expect(getIntelligenceSnapshot(snapshotPath, inputPath)).rejects.toThrow(/provenance/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('expands compact trend rows with versioned thresholds and truthful wording', () => {
  const snapshot = snapshotFor(Buffer.from('unused'));
  const source = snapshot.sources[0]!;
  const expanded = expandObservedFluxTrend(
    source.observedFluxTrend as Parameters<typeof expandObservedFluxTrend>[0],
    snapshot.observedTrendMethod as Parameters<typeof expandObservedFluxTrend>[1],
  );

  expect(expanded?.methodVersion).toBe('theil-sen-event-trend-v1');
  expect(expanded?.minimumNumericObservationDates).toBe(4);
  expect(expanded?.reason).toContain('sampled observations only');
  expect(expanded?.limitation).toContain('not a forecast');
});

test('serves a source-bound historical trend and forecast abstention through the Hono route', async () => {
  const response = await createApp(new MemoryAuditStore()).request('/api/intelligence/insights?sourceId=DZA_S_012');
  expect(response.status).toBe(200);
  const payload = await response.json() as {
    snapshot: {
      datasetSnapshotId: string; inputFileSha256: string;
      observedTrendMethod: { methodVersion: string };
      forecastReadiness: { status: string; missingRequirements: string[] };
      recordRecurrenceModel: { status: string; testCohort: { rocAuc: number; sourceCount: number } };
      publisherIndicatorComparison: {
        status: string; datasetSnapshotId: string; inputFileSha256: string; target: string; horizonDays: number;
        persistencyCoverage: { numericReportedCount: number; emissionStatusReportedCount: number; emissionStatusMissingCount: number };
        numericPersistencyComparison: { status: string; matchedSourceCount: number; spearmanRho: number };
      };
    };
    insight: { sourceId: string; observedFluxTrend: { status: string; numericObservationDates: number; reason: string }; forecast: { status: string }; recordRecurrenceForecast: { status: string; probability: number; horizonDays: number; target: string } };
  };
  expect(payload.snapshot.datasetSnapshotId).toBe('unep-mars-675417694883');
  expect(payload.snapshot.publisherIndicatorComparison).toMatchObject({
    status: 'available',
    datasetSnapshotId: payload.snapshot.datasetSnapshotId,
    inputFileSha256: payload.snapshot.inputFileSha256,
    target: 'at_least_one_future_linked_mars_detection_record',
    horizonDays: 365,
    persistencyCoverage: { numericReportedCount: 3059, emissionStatusReportedCount: 0, emissionStatusMissingCount: 4218 },
    numericPersistencyComparison: { status: 'available' },
  });
  expect(payload.snapshot.publisherIndicatorComparison.numericPersistencyComparison.matchedSourceCount).toBeGreaterThan(1000);
  expect(Number.isFinite(payload.snapshot.publisherIndicatorComparison.numericPersistencyComparison.spearmanRho)).toBe(true);
  expect(payload.snapshot.observedTrendMethod.methodVersion).toBe('theil-sen-event-trend-v1');
  expect(payload.snapshot.forecastReadiness.status).toBe('not_available');
  expect(payload.snapshot.forecastReadiness.missingRequirements).toContain('complete_observation_opportunities');
  expect(payload.insight.sourceId).toBe('DZA_S_012');
  expect(payload.insight.observedFluxTrend.status).toBe('descriptive_trend');
  expect(payload.insight.observedFluxTrend.numericObservationDates).toBeGreaterThanOrEqual(4);
  expect(payload.insight.observedFluxTrend.reason).toContain('Theil–Sen');
  expect(payload.insight.forecast.status).toBe('not_available');
  expect(payload.snapshot.recordRecurrenceModel.status).toBe('historical_backtest_passed');
  expect(payload.snapshot.recordRecurrenceModel.testCohort.rocAuc).toBeGreaterThan(0.80);
  expect(payload.snapshot.recordRecurrenceModel.testCohort.sourceCount).toBe(3131);
  expect(payload.insight.recordRecurrenceForecast.status).toBe('available');
  expect(payload.insight.recordRecurrenceForecast.horizonDays).toBe(365);
  expect(payload.insight.recordRecurrenceForecast.probability).toBeCloseTo(0.918307, 6);
  expect(payload.insight.recordRecurrenceForecast.target).toBe('at_least_one_future_linked_mars_detection_record');
});
