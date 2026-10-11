import { describe, expect, it } from 'bun:test';
import { parseMarsGeoJSON } from './mars';

describe('MARS GeoJSON importer', () => {
  it('groups real-format plume observations per source without claiming mitigation', () => {
    // Synthetic test fixture designed in the shape of real MARS records.
    const snapshot = parseMarsGeoJSON({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', lat: 50.01, lon: 67.04, country: 'Kazakhstan', id_plume: 'test-1', tile_date: '2026-03-01', ch4_fluxrate: 2500, feedback: 'Yes' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [67.04, 50.01] }, properties: { source_name: 'KAZ_S_136', lat: 50.01, lon: 67.04, id_plume: 'test-2', tile_date: '2026-04-01', ch4_fluxrate: 2000 } },
    ] });
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.sources[0].plumeCount).toBe(2);
    expect(snapshot.sources[0].feedback).toBe('Yes');
    expect(snapshot.sources[0].maxFluxKgHr).toBe(2500);
    expect(snapshot.sources[0].evidence.every(e => e.kind === 'detection')).toBe(true);
    expect(snapshot.sources[0].synthetic).toBe(false);
  });
  it('rejects unrelated FeatureCollections', () => {
    expect(() => parseMarsGeoJSON({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { source_name: 'unrelated', lat: 91, lon: 500 } }] })).toThrow();
  });
});
