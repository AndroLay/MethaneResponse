import { expect, test } from 'bun:test';
import { DEFAULT_MAP_DATA_LAYER } from './map-layer-preferences';

test('opens on the historical reported-flux layer so observed magnitude is visible', () => {
  expect(DEFAULT_MAP_DATA_LAYER).toBe('observed-flux');
});
