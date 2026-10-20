import type { getIntelligenceSnapshot } from './intelligence-data';
import { getObservationCatalog } from './observation-archive';
import { evidenceUtcDay } from '@methane/shared';
import type { PlannerCandidate } from '@methane/shared/investigation-planner';

function median(values: number[]) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/** Geography and summaries originate from the same validated local archive, never a request. */
export async function getPlannerCatalog(snapshot: Awaited<ReturnType<typeof getIntelligenceSnapshot>>) {
  const catalog = await getObservationCatalog(snapshot);
  const candidates: PlannerCandidate[] = snapshot.sources.map(row => {
    const source = catalog.get(row.sourceId);
    if (!source) throw new Error('Planner source is missing from pinned archive');
    const numeric = source.observations.filter(record => record.fluxKgHr !== null);
    const medianFluxKgHr = median(numeric.map(record => record.fluxKgHr!));
    const medianUncertaintyKgHr = median(numeric.flatMap(record => record.uncertaintyKgHr === null ? [] : [record.uncertaintyKgHr]));
    const distinctDates = new Set(source.observations.map(record => evidenceUtcDay(record.date))).size;
    if (medianFluxKgHr !== row.medianObservedFluxKgHr || medianUncertaintyKgHr !== row.medianObservationUncertaintyKgHr
      || distinctDates !== row.uniqueObservationDates || numeric.length !== row.numericFluxObservationCount) throw new Error('Planner summary differs from original observation records');
    const lastObserved = source.observations.length ? [...source.observations].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)[0].date : null;
    return { sourceId: row.sourceId, country: source.country, sector: source.sector, medianFluxKgHr, medianUncertaintyKgHr,
      observationCount: source.observations.length, distinctDates, missingFluxCount: source.observations.length - numeric.length, lastObserved };
  });
  const first = catalog.values().next().value;
  if (!first) throw new Error('Pinned source catalog is empty');
  return { candidates, archiveStartDate: first.archiveStartDate, archiveEndDate: first.archiveEndDate };
}
