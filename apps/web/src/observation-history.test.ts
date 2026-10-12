import { describe, expect, test } from 'bun:test';
import { filterObservationsForMonth, filterObservationsThroughMonth, getObservationHistoryBuckets } from './observation-history';

describe('historical observation timeline', () => {
  test('builds a complete monthly axis and distinguishes months with no rows', () => {
    const buckets = getObservationHistoryBuckets([
      { id: 'a', date: '2024-11-03', fluxKgHr: 0 },
      { id: 'b', date: '2025-01-12T08:45:00Z', fluxKgHr: null },
      { id: 'bad', date: 'not-a-date', fluxKgHr: 900 },
    ]);

    expect(buckets).toEqual([
      { month: '2024-11', count: 1 },
      { month: '2024-12', count: 0 },
      { month: '2025-01', count: 1 },
    ]);
  });

  test('shows cumulative archive records through the selected month without changing source values', () => {
    const observations = [
      { id: 'oct', date: '2024-10-31', fluxKgHr: null, sourceId: null },
      { id: 'nov-zero', date: '2024-11-05', fluxKgHr: 0, sourceId: 'KAZ_S_159' },
      { id: 'dec', date: '2024-12-01T02:00:00Z', fluxKgHr: 700, sourceId: 'KAZ_S_159' },
    ];

    expect(filterObservationsThroughMonth(observations, '2024-11')).toEqual(observations.slice(0, 2));
    expect(filterObservationsThroughMonth(observations, null)).toBe(observations);
    expect(filterObservationsThroughMonth(observations, '2024-13')).toEqual([]);
  });

  test('selected geometry month includes only that month and retains zero and missing flux distinctly', () => {
    const observations = [
      { id: 'oct', date: '2024-10-31', fluxKgHr: null },
      { id: 'nov-zero', date: '2024-11-05', fluxKgHr: 0 },
      { id: 'nov-value', date: '2024-11-30T23:59:00Z', fluxKgHr: 700 },
      { id: 'dec', date: '2024-12-01T02:00:00Z', fluxKgHr: 900 },
    ];

    expect(filterObservationsForMonth(observations, '2024-11')).toEqual(observations.slice(1, 3));
    expect(filterObservationsForMonth(observations, '2024-13')).toEqual([]);
    expect(filterObservationsForMonth(observations, '2024-11')[0]?.fluxKgHr).toBe(0);
  });
});
