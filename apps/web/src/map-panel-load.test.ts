import { describe, expect, test } from 'bun:test';
import { shouldActivateMapPanel } from './map-panel-load';

describe('map panel viewport loading', () => {
  test('waits until the map enters the expanded viewport when observation is supported', () => {
    expect(shouldActivateMapPanel(false, true)).toBe(false);
    expect(shouldActivateMapPanel(true, true)).toBe(true);
  });

  test('loads immediately when IntersectionObserver is unavailable', () => {
    expect(shouldActivateMapPanel(false, false)).toBe(true);
  });
});
