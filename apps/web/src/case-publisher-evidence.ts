import type { MarsObservation } from './mars';

/**
 * Orders source-linked records for the case evidence picker. Invalid dates and
 * blank identifiers cannot be used to request a snapshot-bound geometry.
 * Sorting is deterministic and never mutates the source history array.
 */
export function orderCasePublisherObservations<T extends Pick<
  MarsObservation,
  'id' | 'date' | 'fluxKgHr' | 'uncertaintyKgHr'
>>(observations: readonly T[]): T[] {
  return observations
    .filter(observation => observation.id.trim().length > 0 && Number.isFinite(Date.parse(observation.date)))
    .slice()
    .sort((left, right) => {
      const byInstant = Date.parse(right.date) - Date.parse(left.date);
      return byInstant || left.id.localeCompare(right.id, 'en', { numeric: true, sensitivity: 'base' });
    });
}
