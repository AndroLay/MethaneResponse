import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getIntelligenceSnapshot } from './intelligence-data';

function snapshotFor(input: Buffer) {
  return {
    schemaVersion: 1,
    kind: 'observational_investigation_ranking',
    modelVersion: 'test-priority-v1',
    datasetSnapshotId: 'unep-mars-aaaaaaaaaaaa',
    linkedObservationCount: 3,
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
    generatedAt: '2026-10-11T00:00:00+00:00',
    inputFileSha256: createHash('sha256').update(input).digest('hex'),
    upstreamArchiveSha256: 'a'.repeat(64),
    sourceCount: 1,
    method: 'Test heuristic only',
    limitations: ['Not a forecast.'],
    sources: [{
      sourceId: 'KAZ_S_159', priorityScore: 45, priorityBand: 'medium', priorityType: 'heuristic_not_probability',
      observationCount: 3, sourceReportedPlumeCount: 3, uniqueObservationDates: 3,
      observationIds: ['p1', 'p2', 'p3'],
      observationDates: ['2026-05-01', '2026-06-01', '2026-07-11'],
      observationTimestamps: ['2026-05-01T08:00:00Z', '2026-06-01T08:00:00Z', '2026-07-11T08:12:14'],
      numericFluxObservationCount: 3, missingFluxObservationCount: 0, measurementAvailability: 'numeric_flux_available',
      medianObservedFluxKgHr: 500, medianAbsoluteDeviationKgHr: 100, medianObservationUncertaintyKgHr: 20,
      priorityComponents: { recurrenceContribution: 20, magnitudeContribution: 11, magnitudeBasis: 'observed flux' },
      robustOutlierCount: null, observedPersistency: 0.67, observedPersistencyStd: 0.27,
      anomalyAnalysis: {
        methodVersion: 'mad-threshold-screen-v1', status: 'insufficient_observations',
        reason: '3 numeric observations are available; at least 8 are required for this screen.',
        minimumNumericObservations: 8, minimumDistinctObservationDates: 4,
        numericObservationCount: 3, distinctNumericObservationDates: 3,
        baselineMedianFluxKgHr: 500, medianAbsoluteDeviationKgHr: 100, robustScaleKgHr: 148.26,
        scaleBasis: 'scaled_mad',
        thresholdRule: 'flag when absolute deviation exceeds max(3.5 × robust scale, 2 × reported observation uncertainty)',
        flaggedObservations: [], limitation: 'Screen only; not proof of repair or emissions reduction.',
      },
      observedPersistencyCategory: 'frequent', emissionStatus: null,
      indicatorComparison: 'Context only.', lastObserved: '2026-07-11T08:12:14', dataSufficiency: 'limited',
      reasons: ['Three observed records.'], forecast: { status: 'not_available', reason: 'No opportunity labels.' },
    }],
  };
}

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
