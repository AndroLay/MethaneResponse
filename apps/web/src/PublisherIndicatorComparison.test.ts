import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'bun:test';
import PublisherIndicatorComparison, { type PublisherIndicatorComparisonData } from './PublisherIndicatorComparison';

const comparison: PublisherIndicatorComparisonData = {
  schemaVersion: 1,
  status: 'available',
  datasetSnapshotId: 'unep-mars-test123456',
  inputFileSha256: 'a'.repeat(64),
  asOfDate: '2026-09-12',
  target: 'at_least_one_future_linked_mars_detection_record',
  horizonDays: 365,
  modelVersion: 'mars-linked-record-recurrence-logistic-v1',
  realSourceCount: 4_213,
  recurrencePredictionCount: 4_213,
  invalidPredictionCount: 0,
  persistencyCoverage: {
    numericReportedCount: 3_057, missingCount: 1_156, invalidCount: 0,
    categoryReportedCount: 4_213, categoryMissingCount: 0,
    emissionStatusReportedCount: 0, emissionStatusMissingCount: 4_213,
  },
  probabilityByPersistencyCategory: [
    { category: 'absent', sourceCount: 2_023, scoredSourceCount: 2_023, medianProbability: 0.91 },
    { category: 'frequent', sourceCount: 433, scoredSourceCount: 433, medianProbability: 0.82 },
  ],
  numericPersistencyComparison: {
    status: 'available', reason: null, method: 'spearman_rank_correlation_with_average_ties',
    matchedSourceCount: 3_057, spearmanRho: -0.4,
    topDecileAgreement: {
      fraction: 0.1, comparedSourceCount: 3_057, selectedPerRanking: 306,
      overlapCount: 120, recurrenceOnlyCount: 186, persistencyOnlyCount: 186,
      tieBreak: 'sourceId_ascending',
    },
  },
  limitations: [
    'This is a descriptive comparison within one pinned MARS snapshot, not independent model validation or a physical-emissions outcome.',
    'Missing or invalid persistency is excluded from rank comparisons; missing emission status is unknown, not zero emissions.',
  ],
};

test('shows snapshot-bound UNEP coverage, ranking disagreement, and non-ground-truth limitations', () => {
  const html = renderToStaticMarkup(createElement(PublisherIndicatorComparison, { comparison }));

  expect(html).toContain('UNEP indicator cross-check');
  expect(html).toContain('SNAPSHOT-WIDE COMPARISON');
  expect(html).toContain('unep-mars-test123456');
  expect(html).toContain('2026-09-12');
  expect(html).toContain('3,057 / 4,213');
  expect(html).toContain('numeric persistency values');
  expect(html).toContain('0 / 4,213');
  expect(html).toContain('emission-status values reported');
  expect(html).toContain('unknown, not zero emissions');
  expect(html).toContain('Spearman rank association -0.400 across 3,057 matched sources');
  expect(html).toContain('Top-decile overlap 120 / 306');
  expect(html).toContain('frequent');
  expect(html).toContain('UNEP persistency is publisher metadata, not ground truth');
  expect(html).toContain('not independent model validation');
});

test('states when the recurrence comparison is unavailable instead of displaying zero agreement', () => {
  const unavailable = {
    ...comparison,
    status: 'not_available' as const,
    recurrencePredictionCount: 0,
    numericPersistencyComparison: {
      status: 'not_available' as const,
      reason: 'No source-matched recurrence estimate passed the pinned model, target, and cutoff checks.',
      method: 'spearman_rank_correlation_with_average_ties' as const,
      matchedSourceCount: 0,
      spearmanRho: null,
      topDecileAgreement: null,
    },
    probabilityByPersistencyCategory: comparison.probabilityByPersistencyCategory.map(row => ({
      ...row, scoredSourceCount: 0, medianProbability: null,
    })),
  };
  const html = renderToStaticMarkup(createElement(PublisherIndicatorComparison, { comparison: unavailable }));

  expect(html).toContain('Comparison unavailable');
  expect(html).toContain('No source-matched recurrence estimate passed');
  expect(html).not.toContain('Spearman rank association 0.000');
});
