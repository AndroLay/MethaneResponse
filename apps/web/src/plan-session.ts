import type { InvestigationPortfolio, PlannerStrategy } from '@methane/shared/investigation-planner';
import type { FeatureCollection, Point } from 'geojson';
import type { MarsSource } from './mars';

export type ActivePlan = { report: InvestigationPortfolio; strategy: PlannerStrategy };
let active: ActivePlan | null = null;
const listeners = new Set<() => void>();
export const getActivePlan = () => active;
export function subscribeActivePlan(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Internal UI state only. Call after accepting a replay-verified response; never an authorization boundary. */
export function activatePlan(report: InvestigationPortfolio, strategy: PlannerStrategy) { active = { report, strategy }; for (const listener of listeners) listener(); }
export function clearActivePlan() { active = null; for (const listener of listeners) listener(); }
export function matchingActivePlan(plan: ActivePlan | null, snapshotId: string | null | undefined, archiveSha256: string | null | undefined, inputFileSha256: string | null | undefined) {
  return plan && plan.report.input.dataset.datasetSnapshotId === snapshotId && plan.report.input.dataset.archiveSha256 === archiveSha256
    && plan.report.input.dataset.inputFileSha256 === inputFileSha256 ? plan : null;
}
export function plannedMapPoints(sources: MarsSource[], ids: readonly string[]): FeatureCollection<Point> {
  const byId = new Map(sources.map(source => [source.sourceId, source]));
  return { type: 'FeatureCollection', features: ids.flatMap((id, index) => {
    const source = byId.get(id);
    if (!source || !Number.isFinite(source.lat) || !Number.isFinite(source.lon) || Math.abs(source.lat) > 90 || Math.abs(source.lon) > 180) return [];
    return [{ type: 'Feature' as const, id, geometry: { type: 'Point' as const, coordinates: [source.lon, source.lat] }, properties: { id, slot: index + 1 } }];
  }) };
}
