import { describe, expect, test } from 'bun:test';
import { gunzipSync } from 'node:zlib';
import { layoutEvidenceObservations, selectEvidenceDateTickPoints, summarizeEvidenceObservations } from './evidence-observations';
import { getNextSatelliteContextViewIndex, getPublisherFootprintPreview, getSatelliteContextTiles, getSatelliteContextViews } from './map-imagery';

describe('evidence observation view model', () => {
  test('omits a middle date tick when it would collide with the latest date label', () => {
    const observations = [
      { id: 'old', date: '2024-06-07T08:05:00Z', fluxKgHr: 591, uncertaintyKgHr: 335 },
      { id: 'recent', date: '2026-06-05T07:40:00Z', fluxKgHr: 307, uncertaintyKgHr: 66 },
      { id: 'latest', date: '2026-07-11T08:12:00Z', fluxKgHr: 496, uncertaintyKgHr: 226 },
    ];
    const points = layoutEvidenceObservations(observations).points;
    expect(selectEvidenceDateTickPoints(points).map(point => point.observation.id)).toEqual(['old', 'latest']);
  });

  test('keeps the midpoint date tick when all three labels have enough horizontal space', () => {
    const observations = [
      { id: 'old', date: '2024-01-01T00:00:00Z', fluxKgHr: 100, uncertaintyKgHr: null },
      { id: 'middle', date: '2025-01-01T00:00:00Z', fluxKgHr: 150, uncertaintyKgHr: null },
      { id: 'latest', date: '2026-01-01T00:00:00Z', fluxKgHr: 120, uncertaintyKgHr: null },
    ];
    const points = layoutEvidenceObservations(observations).points;
    expect(selectEvidenceDateTickPoints(points).map(point => point.observation.id)).toEqual(['old', 'middle', 'latest']);
  });

  test('keeps a zero flux record distinct from a record with no reported flux', () => {
    const rows = [
      { id: 'late', date: '2025-04-01T00:00:00Z', fluxKgHr: 600, uncertaintyKgHr: 100 },
      { id: 'missing', date: '2025-03-01T00:00:00Z', fluxKgHr: null, uncertaintyKgHr: null },
      { id: 'zero', date: '2025-01-01T00:00:00Z', fluxKgHr: 0, uncertaintyKgHr: 0 },
    ];

    expect(summarizeEvidenceObservations(rows)).toMatchObject({
      total: 3,
      quantified: 2,
      unquantified: 1,
      dateRange: { start: '2025-01-01', end: '2025-04-01' },
    });

    const chart = layoutEvidenceObservations(rows);
    const points = chart.points;
    expect(points.map(point => point.observation.id)).toEqual(['zero', 'missing', 'late']);
    expect(points.find(point => point.observation.id === 'zero')?.kind).toBe('quantified');
    expect(points.find(point => point.observation.id === 'missing')?.kind).toBe('unquantified');
    expect(points.find(point => point.observation.id === 'missing')?.y).toBe(chart.unquantifiedY);
    expect(points.find(point => point.observation.id === 'zero')?.y).toBe(chart.plotBottom);
    expect(points[0]?.x).toBeLessThan(points[1]!.x);
    expect(points[1]?.x).toBeLessThan(points[2]!.x);
  });

  test('keeps dated satellite observations as separate points even when flux is reported', () => {
    const chart = layoutEvidenceObservations([
      { id: 'latest', date: '2026-01-01T00:00:00Z', fluxKgHr: 240, uncertaintyKgHr: null },
      { id: 'earliest', date: '2024-01-01T00:00:00Z', fluxKgHr: 120, uncertaintyKgHr: null },
      { id: 'middle', date: '2025-01-01T00:00:00Z', fluxKgHr: 0, uncertaintyKgHr: 0 },
    ]);
    expect(chart.points.map(point => point.kind)).toEqual(['quantified', 'quantified', 'quantified']);
    expect('trendPath' in chart).toBe(false);
  });

  test('does not connect observations across missing flux values', () => {
    const chart = layoutEvidenceObservations([
      { id: 'latest', date: '2026-01-01T00:00:00Z', fluxKgHr: 300, uncertaintyKgHr: null },
      { id: 'missing', date: '2025-01-01T00:00:00Z', fluxKgHr: null, uncertaintyKgHr: null },
      { id: 'after-gap', date: '2025-06-01T00:00:00Z', fluxKgHr: 200, uncertaintyKgHr: null },
      { id: 'earliest', date: '2024-01-01T00:00:00Z', fluxKgHr: 100, uncertaintyKgHr: null },
    ]);
    expect(chart.points.map(point => point.kind)).toEqual(['quantified', 'unquantified', 'quantified', 'quantified']);
    expect('trendPath' in chart).toBe(false);
  });

  test('keeps a record with no flux distinct without drawing a line across the gap', () => {
    const chart = layoutEvidenceObservations([
      { id: 'one', date: '2024-01-01T00:00:00Z', fluxKgHr: 100, uncertaintyKgHr: null },
      { id: 'missing', date: '2025-01-01T00:00:00Z', fluxKgHr: null, uncertaintyKgHr: null },
      { id: 'two', date: '2026-01-01T00:00:00Z', fluxKgHr: 200, uncertaintyKgHr: null },
    ]);

    expect(chart.points.map(point => point.kind)).toEqual(['quantified', 'unquantified', 'quantified']);
    expect('trendPath' in chart).toBe(false);
  });

  test('builds a bounded contextual satellite image request only for valid coordinates', () => {
    const tiles = getSatelliteContextTiles(14.80445, -17.31093);
    expect(tiles).toHaveLength(3);
    expect(new URL(tiles[0]!.url).pathname).toContain('/World_Imagery/MapServer/tile/16/');
    expect(tiles[1]!.sourcePoint?.leftPercent).toBeGreaterThanOrEqual(33.3);
    expect(tiles[1]!.sourcePoint?.leftPercent).toBeLessThanOrEqual(66.7);
    expect(tiles.some(tile => tile.sourcePoint)).toBe(true);
    expect(getSatelliteContextTiles(Number.NaN, -17)).toEqual([]);
  });

  test('provides progressively wider imagery fallbacks while keeping the source centered', () => {
    const views = getSatelliteContextViews(14.80445, -17.31093);

    expect(views.map(view => view[0]?.z)).toEqual([16, 13, 10, 7]);
    for (const view of views) {
      expect(view).toHaveLength(3);
      expect(view[1]?.sourcePoint?.leftPercent).toBeGreaterThanOrEqual(33.3);
      expect(view[1]?.sourcePoint?.leftPercent).toBeLessThanOrEqual(66.7);
      expect(view.every(tile => tile.z === view[0]?.z)).toBe(true);
    }
    expect(getSatelliteContextViews(Number.NaN, 0)).toEqual([]);
  });

  test('keeps location imagery in a loading state until the active mosaic center tile loads', async () => {
    const [firstView, fallbackView] = getSatelliteContextViews(43.41337, 52.91829);
    const activeCenter = firstView!.find(tile => tile.sourcePoint)!;
    const fallbackCenter = fallbackView!.find(tile => tile.sourcePoint)!;
    const loadingState = (await import('./map-imagery') as unknown as Record<string, unknown>).isSatelliteContextLoading;

    expect(typeof loadingState).toBe('function');
    if (typeof loadingState !== 'function') return;
    expect(loadingState(firstView!, null)).toBe(true);
    expect(loadingState(firstView!, activeCenter.url)).toBe(false);
    expect(loadingState(fallbackView!, activeCenter.url)).toBe(true);
    expect(loadingState([], null)).toBe(false);
  });

  test('preserves publisher plume geometry in a bounded, aspect-correct shape preview', () => {
    const close = getPublisherFootprintPreview([[[
      [52.918, 43.413], [52.919, 43.413], [52.919, 43.414], [52.918, 43.414], [52.918, 43.413],
    ]]]);

    expect(close).not.toBeNull();
    expect(close?.viewBox).toBe('0 0 768 256');
    expect(close?.pointCount).toBe(5);
    expect(close?.path).toContain('Z');
    expect(close?.path).not.toMatch(/NaN|Infinity/);
    const xCoordinates = [...(close?.path.matchAll(/[ML]([\d.]+),/g) || [])].map(match => Number(match[1]));
    const yCoordinates = [...(close?.path.matchAll(/[ML][\d.]+,([\d.]+)/g) || [])].map(match => Number(match[1]));
    expect(Math.min(...xCoordinates)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...xCoordinates)).toBeLessThanOrEqual(752);
    expect(Math.min(...yCoordinates)).toBeGreaterThanOrEqual(16);
    expect(Math.max(...yCoordinates)).toBeLessThanOrEqual(240);
  });

  test('handles publisher geometry across the antimeridian and rejects invalid coordinates', () => {
    const crossing = getPublisherFootprintPreview([[[
      [179.998, 0], [-179.999, 0], [-179.999, 0.001], [179.998, 0.001], [179.998, 0],
    ]]]);
    const invalid = getPublisherFootprintPreview([[[
      [0, 0], [Number.NaN, 0], [0, 1], [0, 0],
    ]]]);

    expect(crossing).not.toBeNull();
    expect(crossing?.pointCount).toBe(5);
    expect(crossing?.path).not.toMatch(/NaN|Infinity/);
    expect(invalid).toBeNull();
  });

  test('advances imagery fallback once per failed zoom and ignores stale tile failures', () => {
    expect(getNextSatelliteContextViewIndex(0, 0, 4)).toBe(1);
    expect(getNextSatelliteContextViewIndex(1, 0, 4)).toBe(1);
    expect(getNextSatelliteContextViewIndex(1, 1, 4)).toBe(2);
    expect(getNextSatelliteContextViewIndex(3, 3, 4)).toBe(4);
  });

  test('can derive one contextual image view for every source in the pinned UNEP snapshot without per-case assets', async () => {
    const compressed = await Bun.file(new URL('../public/data/mars-snapshot.json.gz', import.meta.url)).arrayBuffer();
    const snapshot = JSON.parse(gunzipSync(Buffer.from(compressed)).toString('utf8')) as {
      sources: Array<{ sourceId: string; lat: number; lon: number }>;
    };

    expect(snapshot.sources).toHaveLength(4218);
    expect(new Set(snapshot.sources.map(source => source.sourceId)).size).toBe(4218);
    for (const source of snapshot.sources) {
      const views = getSatelliteContextViews(source.lat, source.lon);
      expect(views).toHaveLength(4);
      for (const view of views) {
        expect(view).toHaveLength(3);
        const centerTiles = view.filter(tile => tile.sourcePoint);
        expect(centerTiles).toHaveLength(1);
        const center = centerTiles[0]!;
        const tileCount = 2 ** center.z;
        const boundedLatitude = Math.max(-85.05112878, Math.min(85.05112878, source.lat));
        const fractionalX = ((source.lon + 180) / 360) * tileCount;
        const fractionalY = (1 - Math.asinh(Math.tan(boundedLatitude * Math.PI / 180)) / Math.PI) / 2 * tileCount;
        const expectedX = ((Math.floor(fractionalX) % tileCount) + tileCount) % tileCount;
        const expectedY = Math.max(0, Math.min(tileCount - 1, Math.floor(fractionalY)));
        expect(center.x).toBe(expectedX);
        expect(center.y).toBe(expectedY);
        expect(center.sourcePoint!.leftPercent).toBeGreaterThanOrEqual(0);
        expect(center.sourcePoint!.leftPercent).toBeLessThanOrEqual(100);
      }
    }
  });
});
