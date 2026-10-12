export type ObservationHistoryBucket = { month: string; count: number };

function monthNumber(value: string): number | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [yearText, monthText] = value.split('-');
  const year = Number(yearText);
  if (year < 1) return null;
  return year * 12 + Number(monthText) - 1;
}

function observationMonth(value: string): string | null {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(value))) return null;
  const parsedDay = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsedDay.getTime()) || parsedDay.toISOString().slice(0, 10) !== day) return null;
  return day.slice(0, 7);
}

function monthFromNumber(value: number): string {
  const year = Math.floor(value / 12);
  const month = value % 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Count archive rows per month, including empty months between observations. */
export function getObservationHistoryBuckets<T extends { date: string }>(observations: T[]): ObservationHistoryBucket[] {
  const counts = new Map<string, number>();
  for (const observation of observations) {
    const month = observationMonth(observation.date);
    if (month) counts.set(month, (counts.get(month) || 0) + 1);
  }
  const indices = Array.from(counts.keys()).map(month => monthNumber(month)).filter((value): value is number => value !== null);
  if (!indices.length) return [];
  const first = Math.min(...indices);
  const last = Math.max(...indices);
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const month = monthFromNumber(first + offset);
    return { month, count: counts.get(month) || 0 };
  });
}

/** Return cumulative rows through the source timestamp's calendar month; null keeps the complete archive. */
export function filterObservationsThroughMonth<T extends { date: string }>(observations: T[], month: string | null): T[] {
  if (month === null) return observations;
  if (monthNumber(month) === null) return [];
  return observations.filter(observation => {
    const rowMonth = observationMonth(observation.date);
    return rowMonth !== null && rowMonth <= month;
  });
}

/** Return only records whose source timestamp falls in this calendar month. */
export function filterObservationsForMonth<T extends { date: string }>(observations: T[], month: string): T[] {
  if (monthNumber(month) === null) return [];
  return observations.filter(observation => observationMonth(observation.date) === month);
}
