import { expect, test } from 'bun:test';
import { MAP_PANEL_LOAD_FAILURE_COPY } from './MapPanelErrorBoundary';

test('map chunk failure keeps the rest of the case review usable', () => {
  expect(MAP_PANEL_LOAD_FAILURE_COPY).toContain('Reload this page to retry');
  expect(MAP_PANEL_LOAD_FAILURE_COPY).toContain('source and evidence review remains available');
});
