import { describe, expect, test } from 'bun:test';
import { getDataStatusIndicatorKind, getMapArchiveLabel, getMapBasemapDescription, getMapInteractionHint, getMapToplineLabel } from './map-surface-copy';

describe('map surface copy', () => {
  test('uses a non-live visual status for a historical archive and a distinct demo status', () => {
    expect(getDataStatusIndicatorKind(true)).toBe('historical');
    expect(getDataStatusIndicatorKind(false)).toBe('synthetic');
  });

  test('keeps map record-count labels short enough for the edge status chip', () => {
    const base = { status: 'ready' as const, dataLayer: 'source-density' as const, recordMode: 'sources' as const, sourceCount: 4211, positiveFluxLocationCount: 0, footprintPolygonCount: 0, selectedHistoryMonth: null, priorityPointCount: 0, priorityReady: false };
    expect(getMapToplineLabel(base)).toBe('4,211 sources');
    expect(getMapToplineLabel({ ...base, dataLayer: 'observed-flux', positiveFluxLocationCount: 29256 })).toBe('29,256 flux observations');
    expect(getMapToplineLabel({ ...base, dataLayer: 'plume-footprints', footprintPolygonCount: 326, selectedHistoryMonth: '2026-09' })).toBe('326 geometries · 2026-09');
    expect(getMapToplineLabel({ ...base, dataLayer: 'investigation-priority', priorityPointCount: 47, priorityReady: true })).toBe('47 ranked sources');
    expect(getMapToplineLabel({ ...base, status: 'loading' })).toBe('Loading basemap');
    expect(getMapToplineLabel({ ...base, status: 'error' })).toBe('Map unavailable');
  });

  test('keeps the historical archive date and non-live status together', () => {
    expect(getMapArchiveLabel(false, '2026-09-11')).toBe('UNEP MARS historical archive · through 2026-09-11 UTC · LIVE FEED OFF');
  });

  test('does not describe synthetic fixtures as a historical MARS archive', () => {
    expect(getMapArchiveLabel(true, '2026-09-11')).toBe('Synthetic demo data · DEMO · not live');
  });

  test('describes the static overview and detailed satellite imagery accurately', () => {
    expect(getMapBasemapDescription('satellite')).toBe('Static NASA Blue Marble (August 2004) overview blended over Esri imagery; Esri supplies close detail.');
    expect(getMapBasemapDescription('grayscale')).toBe('Static NASA Blue Marble (August 2004) overview blended over Esri imagery in grayscale; Esri supplies close detail.');
  });

  test('uses interaction guidance that matches the active record mode', () => {
    expect(getMapInteractionHint('sources')).toBe('Drag to pan · scroll to zoom · click a source');
    expect(getMapInteractionHint('plumes')).toBe('Drag to pan · scroll to zoom · click an observation');
  });
});
