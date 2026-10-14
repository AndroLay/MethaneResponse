import { expect, test } from 'bun:test';
import { aggregateObservedFluxPoints, layoutObservedFluxPoints } from './observed-flux-chart';

test('lays out discrete historical flux dates in chronological order without connecting them', () => {
  const points = layoutObservedFluxPoints([
    { date: '2025-04-01', medianFluxKgHr: 300, medianReportedUncertaintyKgHr: 20, observationCount: 1 },
    { date: '2025-01-01', medianFluxKgHr: 100, medianReportedUncertaintyKgHr: null, observationCount: 2 },
  ]);

  expect(points).toHaveLength(2);
  expect(points[0]!.date).toBe('2025-01-01');
  expect(points[1]!.date).toBe('2025-04-01');
  expect(points[0]!.x).toBeLessThan(points[1]!.x);
  expect(points[0]!.y).toBeGreaterThan(points[1]!.y);
  expect(points.every(point => point.x >= 0 && point.x <= 320 && point.y >= 0 && point.y <= 100)).toBe(true);
});

test('keeps all-zero observed flux points finite and filters malformed chart values', () => {
  const points = layoutObservedFluxPoints([
    { date: '2025-01-01', medianFluxKgHr: 0, medianReportedUncertaintyKgHr: null, observationCount: 1 },
    { date: 'invalid-date', medianFluxKgHr: 12, medianReportedUncertaintyKgHr: null, observationCount: 1 },
    { date: '2025-02-01', medianFluxKgHr: Number.NaN, medianReportedUncertaintyKgHr: null, observationCount: 1 },
  ]);

  expect(points).toHaveLength(1);
  expect(Number.isFinite(points[0]!.x)).toBe(true);
  expect(Number.isFinite(points[0]!.y)).toBe(true);
});

test('aggregates the exact selected-source records by UTC day and preserves missing flux as missing', () => {
  const points = aggregateObservedFluxPoints([
    { id: 'a', date: '2025-01-01T03:00:00Z', fluxKgHr: 100, uncertaintyKgHr: 10 },
    { id: 'b', date: '2025-01-01T21:00:00Z', fluxKgHr: 200, uncertaintyKgHr: 20 },
    { id: 'b', date: '2025-02-01', fluxKgHr: 900, uncertaintyKgHr: 30 },
    { id: 'c', date: '2025-03-01', fluxKgHr: null, uncertaintyKgHr: null },
    { id: 'd', date: '2025-04-01', fluxKgHr: 0, uncertaintyKgHr: null },
  ]);

  expect(points).toEqual([
    { date: '2025-01-01', medianFluxKgHr: 150, medianReportedUncertaintyKgHr: 15, observationCount: 2 },
    { date: '2025-04-01', medianFluxKgHr: 0, medianReportedUncertaintyKgHr: null, observationCount: 1 },
  ]);
});
