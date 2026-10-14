import { expect, test } from 'bun:test';
import { getReportedFluxBand, getReportedFluxColor } from './map-marker-style';

test('source markers use historical reported-flux bins and preserve unknown values', () => {
  const cases = [
    [0, 'under-100', '#3978eb'],
    [99.9, 'under-100', '#3978eb'],
    [100, '100-499', '#20d2d2'],
    [499.9, '100-499', '#20d2d2'],
    [500, '500-1999', '#f3d14b'],
    [1999.9, '500-1999', '#f3d14b'],
    [2000, '2000-4999', '#f58b38'],
    [4999.9, '2000-4999', '#f58b38'],
    [5000, '5000-plus', '#ed4b43'],
  ] as const;

  for (const [flux, band, color] of cases) {
    expect(getReportedFluxBand(flux)).toBe(band);
    expect(getReportedFluxColor(flux)).toBe(color);
  }
  expect(getReportedFluxBand(null)).toBe('unknown');
  expect(getReportedFluxBand(undefined)).toBe('unknown');
  expect(getReportedFluxBand(Number.NaN)).toBe('unknown');
  expect(getReportedFluxBand(-1)).toBe('unknown');
  expect(getReportedFluxColor(null)).toBe('#91a9b2');
});
