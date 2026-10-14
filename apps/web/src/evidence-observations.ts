import type { MarsObservation } from './mars';

export type EvidenceObservationRecord = Pick<MarsObservation, 'id' | 'date' | 'fluxKgHr' | 'uncertaintyKgHr'>;

export type PositionedEvidenceObservation = {
  observation: EvidenceObservationRecord;
  x: number;
  y: number;
  kind: 'quantified' | 'unquantified';
  uncertaintyTop: number | null;
  uncertaintyBottom: number | null;
};

export type EvidenceObservationChart = {
  points: PositionedEvidenceObservation[];
  domainMin: number;
  domainMax: number;
  plotTop: number;
  plotBottom: number;
  unquantifiedY: number;
};

function observationTimestamp(value: string): number | null {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const calendarDate = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(calendarDate) || new Date(calendarDate).toISOString().slice(0, 10) !== day) return null;
  const utcValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  const timestamp = Date.parse(utcValue);
  if (!Number.isFinite(timestamp)) return null;
  return timestamp;
}

function reportedFlux(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function reportedUncertainty(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0;
}

export function summarizeEvidenceObservations(observations: readonly EvidenceObservationRecord[]) {
  const dates = observations
    .filter(observation => observationTimestamp(observation.date) !== null)
    .map(observation => observation.date.slice(0, 10))
    .sort();
  const quantified = observations.filter(observation => reportedFlux(observation.fluxKgHr)).length;

  return {
    total: observations.length,
    quantified,
    unquantified: observations.length - quantified,
    dateRange: dates.length ? { start: dates[0]!, end: dates.at(-1)! } : null,
  };
}

/** Layouts discrete satellite records; missing flux gets its own lane, never the zero-flux baseline. */
export function layoutEvidenceObservations(
  observations: readonly EvidenceObservationRecord[],
  width = 720,
  height = 220,
): EvidenceObservationChart {
  const safeWidth = Number.isFinite(width) ? Math.max(240, width) : 720;
  const safeHeight = Number.isFinite(height) ? Math.max(150, height) : 220;
  const left = 58;
  const right = safeWidth - 18;
  const plotTop = 18;
  const plotBottom = safeHeight - 78;
  const unquantifiedY = safeHeight - 27;
  const ordered = observations.flatMap(observation => {
    const timestamp = observationTimestamp(observation.date);
    return timestamp === null ? [] : [{ observation, timestamp }];
  }).sort((a, b) => a.timestamp - b.timestamp || a.observation.id.localeCompare(b.observation.id));

  const quantified = ordered.filter(({ observation }) => reportedFlux(observation.fluxKgHr));
  const lowerValues = quantified.map(({ observation }) => observation.fluxKgHr! - (reportedUncertainty(observation.uncertaintyKgHr) ? observation.uncertaintyKgHr : 0));
  const upperValues = quantified.map(({ observation }) => observation.fluxKgHr! + (reportedUncertainty(observation.uncertaintyKgHr) ? observation.uncertaintyKgHr : 0));
  const domainMin = Math.min(0, ...lowerValues);
  const domainMax = Math.max(0, ...upperValues, domainMin + 1);
  const valueRange = domainMax - domainMin || 1;
  const yFor = (value: number) => plotBottom - ((value - domainMin) / valueRange) * (plotBottom - plotTop);
  const firstTime = ordered[0]?.timestamp ?? 0;
  const lastTime = ordered.at(-1)?.timestamp ?? firstTime;
  const timeRange = lastTime - firstTime;

  const points = ordered.map(({ observation, timestamp }): PositionedEvidenceObservation => {
    const x = timeRange === 0
      ? (left + right) / 2
      : left + ((timestamp - firstTime) / timeRange) * (right - left);
    if (!reportedFlux(observation.fluxKgHr)) {
      return { observation, x, y: unquantifiedY, kind: 'unquantified', uncertaintyTop: null, uncertaintyBottom: null };
    }
    const uncertainty = reportedUncertainty(observation.uncertaintyKgHr) ? observation.uncertaintyKgHr : null;
    return {
      observation,
      x,
      y: yFor(observation.fluxKgHr),
      kind: 'quantified',
      uncertaintyTop: uncertainty === null ? null : yFor(observation.fluxKgHr + uncertainty),
      uncertaintyBottom: uncertainty === null ? null : yFor(observation.fluxKgHr - uncertainty),
    };
  });

  return { points, domainMin, domainMax, plotTop, plotBottom, unquantifiedY };
}
