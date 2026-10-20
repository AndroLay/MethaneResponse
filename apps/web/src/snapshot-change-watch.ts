import { SnapshotTransitionPageData, type SnapshotTransitionRequest } from '@methane/shared/snapshot-transition';
import { plannerCanonical } from '@methane/shared/investigation-planner';

export function acceptSnapshotTransitionPage(raw: unknown, request: SnapshotTransitionRequest, archiveSha256: string) {
  const result = SnapshotTransitionPageData.parse(raw);
  const expectedCoverage = request.sourceIds.length ? 'selected_sources' : 'all_affected_sources';
  if (result.after.datasetSnapshotId !== request.datasetSnapshotId || result.after.inputFileSha256 !== request.inputFileSha256
    || result.after.provenance.archiveSha256 !== archiveSha256 || result.coverage !== expectedCoverage
    || plannerCanonical(result.requestedSourceIds) !== plannerCanonical(request.sourceIds) || result.offset !== request.offset || result.limit !== request.limit
    || result.items.length !== Math.max(0, Math.min(result.limit, result.total - result.offset))
    || new Set(result.items.map(row => row.sourceId)).size !== result.items.length || result.total > result.totalAffectedSources
    || request.sourceIds.length && (result.total + result.unchangedSourceIds.length !== request.sourceIds.length
      || result.items.some(row => !request.sourceIds.includes(row.sourceId)) || result.unchangedSourceIds.some(id => !request.sourceIds.includes(id)))) throw new Error('Change response differs from the selected plan, page or pinned dataset. Compare again.');
  return result;
}
export function changeValue(value: unknown) { return value === null || value === undefined ? 'not reported' : String(value); }
