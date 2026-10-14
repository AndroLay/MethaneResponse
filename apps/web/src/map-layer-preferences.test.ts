import { expect, test } from 'bun:test';
import { DEFAULT_MAP_DATA_LAYER } from './map-layer-preferences';

test('global map defaults to source locations for a legible and lighter overview', () => {
  expect(DEFAULT_MAP_DATA_LAYER).toBe('source-density');
});
