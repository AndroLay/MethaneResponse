import { expect, test } from 'bun:test';
import { activatePlan, clearActivePlan, getActivePlan, matchingActivePlan, subscribeActivePlan, plannedMapPoints } from './plan-session';
import { buildInvestigationPortfolio } from '@methane/shared/investigation-planner';
import type { MarsSource } from './mars';
test('active plan survives navigation subscriptions, invalidates across snapshot contexts and clears explicitly', async () => {
  clearActivePlan(); let notifications = 0; const unsubscribe = subscribeActivePlan(() => { notifications++; });
  const report = await buildInvestigationPortfolio({ dataset: { datasetSnapshotId: 'DEMO', inputFileSha256: 'a'.repeat(64), archiveSha256: 'b'.repeat(64), intelligenceSha256: 'c'.repeat(64), synthetic: true, provenance: null, scope: 'full_snapshot', totalSourceCount: 0, archiveStartDate: '2020-01-01', archiveEndDate: '2026-01-01' }, candidates: [], parameters: { capacity: 10, maxPerCountry: 2, recurrenceWeight: 50, countries: [], sectors: [] } });
  activatePlan(report, 'weighted');
  expect(getActivePlan()?.report.digest).toBe(report.digest);
  expect(matchingActivePlan(getActivePlan(), 'DEMO', 'b'.repeat(64), 'a'.repeat(64))?.strategy).toBe('weighted');
  expect(matchingActivePlan(getActivePlan(), 'different', 'b'.repeat(64), 'a'.repeat(64))).toBeNull();
  expect(matchingActivePlan(getActivePlan(), 'DEMO', 'c'.repeat(64), 'a'.repeat(64))).toBeNull();
  expect(matchingActivePlan(getActivePlan(), 'DEMO', 'b'.repeat(64), 'c'.repeat(64))).toBeNull();
  expect(matchingActivePlan(getActivePlan(), 'DEMO', 'b'.repeat(64), undefined)).toBeNull();
  clearActivePlan(); expect(getActivePlan()).toBeNull(); expect(notifications).toBe(2); unsubscribe();
});
test('map allocation contains only exact selected IDs, valid coordinates and ordered slot numbers', () => {
  const sources = [{ sourceId: 'B', lat: 2, lon: 3 }, { sourceId: 'A', lat: 0, lon: 0 }, { sourceId: 'C', lat: 99, lon: 0 }] as MarsSource[];
  const points = plannedMapPoints(sources, ['A', 'C', 'B', 'MISSING']);
  expect(points.features.map(f => [f.properties?.id, f.properties?.slot])).toEqual([['A',1], ['B',3]]);
  expect(points.features[0].geometry.coordinates).toEqual([0,0]);
  expect(plannedMapPoints(sources, []).features).toHaveLength(0);
});
