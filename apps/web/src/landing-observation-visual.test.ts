import { describe, expect, test } from 'bun:test';
import { buildLandingObservationChart, formatLandingObservationDate } from './landing-observation-visual';

describe('landing historical observation chart model', () => {
  test('orders dated MARS observations discretely and carries reported uncertainty', () => {
    const chart = buildLandingObservationChart([
      { plumeId: 'p3', date: '2026-07-11T08:12:14', fluxKgHr: 496, uncertaintyKgHr: 226 },
      { plumeId: 'p1', date: '2024-06-07T08:05:04', fluxKgHr: 591, uncertaintyKgHr: 335 },
      { plumeId: 'p2', date: '2026-06-05T07:40:02', fluxKgHr: 307, uncertaintyKgHr: 66 },
    ]);

    expect(chart.axisMaximumKgHr).toBe(1_000);
    expect(chart.points.map(({ plumeId, date, valueKgHr, lowerKgHr, upperKgHr }) => ({
      plumeId, date, valueKgHr, lowerKgHr, upperKgHr,
    }))).toEqual([
      { plumeId: 'p1', date: '2024-06-07T08:05:04', valueKgHr: 591, lowerKgHr: 256, upperKgHr: 926 },
      { plumeId: 'p2', date: '2026-06-05T07:40:02', valueKgHr: 307, lowerKgHr: 241, upperKgHr: 373 },
      { plumeId: 'p3', date: '2026-07-11T08:12:14', valueKgHr: 496, lowerKgHr: 270, upperKgHr: 722 },
    ]);
    expect(chart.points[0]?.x).toBe(90);
    expect(chart.points[1]?.x).toBe(320);
    expect(chart.points[2]?.x).toBe(550);
    expect(chart.missingFluxCount).toBe(0);
  });

  test('does not turn absent flux into zero and keeps a point when uncertainty is absent', () => {
    const chart = buildLandingObservationChart([
      { plumeId: 'known', date: '2026-01-01T00:00:00', fluxKgHr: 125, uncertaintyKgHr: null },
      { plumeId: 'missing', date: '2026-02-01T00:00:00', fluxKgHr: null, uncertaintyKgHr: null },
    ]);

    expect(chart.points).toHaveLength(1);
    expect(chart.points[0]?.valueKgHr).toBe(125);
    expect(chart.points[0]?.lowerY).toBeNull();
    expect(chart.points[0]?.upperY).toBeNull();
    expect(chart.missingFluxCount).toBe(1);
  });

  test('returns an explicit empty model when no flux is reported', () => {
    expect(buildLandingObservationChart([])).toEqual({
      axisMaximumKgHr: null,
      points: [],
      missingFluxCount: 0,
      invalidDateCount: 0,
      tickValuesKgHr: [],
    });
  });

  test('formats dates in UTC without shifting the publisher day to the browser timezone', () => {
    expect(formatLandingObservationDate('2026-07-11T23:45:00')).toBe('11 Jul 2026');
  });
});
