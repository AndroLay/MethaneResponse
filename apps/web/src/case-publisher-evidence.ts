import type { MarsObservation } from './mars';
import type { ExternalEvidenceReference } from '@methane/shared';

export function formatExternalEvidenceMetadata(reference: Pick<
  ExternalEvidenceReference,
  'publisher' | 'reportDate' | 'license' | 'contentIncluded'
>): string {
  const publisher = reference.publisher?.trim() || 'Publisher unspecified';
  const reportDate = reference.reportDate?.trim() || 'not listed';
  const contentStatus = reference.contentIncluded ? 'report content included' : 'report content not copied';
  return `${publisher} · report date ${reportDate} · license ${reference.license} · ${contentStatus}`;
}

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
