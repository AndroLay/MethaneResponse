import { describe, expect, test } from 'bun:test';
import { shouldActivateMapPanel, shouldAnalyzeObservationHistory, shouldBuildObservationPoints, shouldBuildSourcePoints, shouldLoadCompleteObservationHistory, shouldLoadSelectedSourceHistory } from './map-panel-load';

describe('map panel viewport loading', () => {
  test('waits until the map enters the expanded viewport when observation is supported', () => {
    expect(shouldActivateMapPanel(false, true)).toBe(false);
    expect(shouldActivateMapPanel(true, true)).toBe(true);
  });

  test('loads immediately when IntersectionObserver is unavailable', () => {
    expect(shouldActivateMapPanel(false, false)).toBe(true);
  });

  test('prepares expensive observation points only when point records are visible', () => {
    expect(shouldBuildObservationPoints('sources', false)).toBe(false);
    expect(shouldBuildObservationPoints('plumes', false)).toBe(true);
    expect(shouldBuildObservationPoints('plumes', true)).toBe(false);
  });

  test('prepares source point geometry only for visible source-marker layers or the safe fallback', () => {
    expect(shouldBuildSourcePoints('sources', 'observed-flux', false)).toBe(false);
    expect(shouldBuildSourcePoints('sources', 'source-density', false)).toBe(true);
    expect(shouldBuildSourcePoints('sources', 'investigation-priority', false)).toBe(true);
    expect(shouldBuildSourcePoints('sources', 'investigation-priority', true)).toBe(false);
    expect(shouldBuildSourcePoints('plumes', 'source-density', false)).toBe(false);
  });

  test('keeps historical analysis available on observation-based map layers', () => {
    expect(shouldAnalyzeObservationHistory('sources', 'source-density')).toBe(false);
    expect(shouldAnalyzeObservationHistory('sources', 'investigation-priority')).toBe(false);
    expect(shouldAnalyzeObservationHistory('sources', 'observed-flux')).toBe(true);
    expect(shouldAnalyzeObservationHistory('sources', 'plume-footprints')).toBe(true);
    expect(shouldAnalyzeObservationHistory('plumes', 'source-density')).toBe(true);
  });

  test('loads history only for case details and complete archive layers that are actually visible', () => {
    expect(shouldLoadSelectedSourceHistory('map', false)).toBe(false);
    expect(shouldLoadSelectedSourceHistory('map', true)).toBe(true);
    expect(shouldLoadSelectedSourceHistory('indicators', false)).toBe(false);
    expect(shouldLoadSelectedSourceHistory('cases', false)).toBe(true);
    expect(shouldLoadCompleteObservationHistory(false, true, 'plumes', 'observed-flux')).toBe(false);
    expect(shouldLoadCompleteObservationHistory(true, false, 'plumes', 'observed-flux')).toBe(false);
    expect(shouldLoadCompleteObservationHistory(true, true, 'sources', 'source-density')).toBe(false);
    expect(shouldLoadCompleteObservationHistory(true, true, 'sources', 'observed-flux')).toBe(true);
    expect(shouldLoadCompleteObservationHistory(true, true, 'plumes', 'source-density')).toBe(true);
  });
});
