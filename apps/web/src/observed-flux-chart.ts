export type ObservedFluxPoint = {
  date: string;
  medianFluxKgHr: number;
  medianReportedUncertaintyKgHr: number | null;
  observationCount: number;
};

export type PositionedObservedFluxPoint = ObservedFluxPoint & { x: number; y: number };
export type HistoricalFluxObservation = {
  id: string;
  date: string;
  fluxKgHr: number | null;
  uncertaintyKgHr?: number | null;
};

export const OBSERVED_FLUX_CHART_WIDTH = 320;
export const OBSERVED_FLUX_CHART_HEIGHT = 100;

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function normalizedDate(value: string) {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const timestamp = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day ? day : null;
}

export function aggregateObservedFluxPoints(observations: HistoricalFluxObservation[]): ObservedFluxPoint[] {
  const seenIds = new Set<string>();
  const byDate = new Map<string, { fluxes: number[]; uncertainties: number[] }>();
  for (const observation of observations) {
    if (!observation.id?.trim() || seenIds.has(observation.id)) continue;
    const date = normalizedDate(observation.date);
    if (!date) continue;
    seenIds.add(observation.id);
    if (observation.fluxKgHr === null || !Number.isFinite(observation.fluxKgHr) || observation.fluxKgHr < 0) continue;
    const daily = byDate.get(date) || { fluxes: [], uncertainties: [] };
    daily.fluxes.push(observation.fluxKgHr);
    const uncertainty = observation.uncertaintyKgHr;
    if (uncertainty !== null && uncertainty !== undefined && Number.isFinite(uncertainty) && uncertainty >= 0) {
      daily.uncertainties.push(uncertainty);
    }
    byDate.set(date, daily);
  }
  return [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, daily]) => ({
    date,
    medianFluxKgHr: median(daily.fluxes),
    medianReportedUncertaintyKgHr: daily.uncertainties.length ? median(daily.uncertainties) : null,
    observationCount: daily.fluxes.length,
  }));
}

export function layoutObservedFluxPoints(
  input: ObservedFluxPoint[],
  width = OBSERVED_FLUX_CHART_WIDTH,
  height = OBSERVED_FLUX_CHART_HEIGHT,
): PositionedObservedFluxPoint[] {
  const points = input.flatMap((point) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date)
      || !Number.isFinite(point.medianFluxKgHr)
      || point.medianFluxKgHr < 0
      || !Number.isInteger(point.observationCount)
      || point.observationCount < 1) return [];
    const timestamp = Date.parse(`${point.date}T00:00:00.000Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== point.date) return [];
    return [{ ...point, timestamp }];
  }).sort((left, right) => left.timestamp - right.timestamp);

  if (!points.length) return [];

  const padding = { left: 24, right: 8, top: 8, bottom: 18 };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const firstTimestamp = points[0]!.timestamp;
  const lastTimestamp = points.at(-1)!.timestamp;
  const timeSpan = lastTimestamp - firstTimestamp;
  const maximumFlux = Math.max(1, ...points.map(point => point.medianFluxKgHr));

  return points.map(({ timestamp, ...point }) => ({
    ...point,
    x: timeSpan === 0
      ? padding.left + plotWidth / 2
      : padding.left + ((timestamp - firstTimestamp) / timeSpan) * plotWidth,
    y: padding.top + plotHeight - (point.medianFluxKgHr / maximumFlux) * plotHeight,
  }));
}
