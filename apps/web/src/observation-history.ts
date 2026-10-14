export type ObservationHistoryBucket = { month: string; count: number };

/** Find the archive date bounds with one allocation-free scan. */
export function getObservationDateRange<T extends { date: string }>(observations: readonly T[]): { start: string; end: string } | null {
  let start: string | null = null;
  let end: string | null = null;
  for (const observation of observations) {
    const day = observation.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (start === null || day < start) start = day;
    if (end === null || day > end) end = day;
  }
  return start === null || end === null ? null : { start, end };
}

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

/** Return the newest valid calendar month with a row linked to the requested source. */
export function getLatestObservationMonthForSource<T extends { date: string; sourceId?: string | null }>(observations: readonly T[], sourceId: string | null): string | null {
  if (!sourceId) return null;
  let latest: string | null = null;
  for (const observation of observations) {
    if (observation.sourceId !== sourceId) continue;
    const month = observationMonth(observation.date);
    if (month && (latest === null || month > latest)) latest = month;
  }
  return latest;
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
