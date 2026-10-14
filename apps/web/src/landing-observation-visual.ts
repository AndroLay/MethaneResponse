export type LandingObservationValue = {
  plumeId: string;
  date: string;
  fluxKgHr: number | null;
  uncertaintyKgHr: number | null;
};

export type LandingObservationChartPoint = {
  plumeId: string;
  date: string;
  valueKgHr: number;
  uncertaintyKgHr: number | null;
  lowerKgHr: number | null;
  upperKgHr: number | null;
  x: number;
  y: number;
  lowerY: number | null;
  upperY: number | null;
};

export type LandingObservationChart = {
  axisMaximumKgHr: number | null;
  points: LandingObservationChartPoint[];
  missingFluxCount: number;
  invalidDateCount: number;
  tickValuesKgHr: number[];
};

const CHART = { left: 90, right: 550, top: 32, bottom: 206 } as const;

function utcTimestamp(value: string): number {
  const normalized = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return Date.parse(normalized);
}

export function buildLandingObservationChart(observations: LandingObservationValue[]): LandingObservationChart {
  const missingFluxCount = observations.filter(observation =>
    typeof observation.fluxKgHr !== 'number' || !Number.isFinite(observation.fluxKgHr) || observation.fluxKgHr < 0,
  ).length;

  const datedFlux = observations.flatMap(observation => {
    const value = observation.fluxKgHr;
    const timestamp = utcTimestamp(observation.date);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isFinite(timestamp)) return [];
    return [{ observation, value, timestamp }];
  }).sort((left, right) => left.timestamp - right.timestamp || left.observation.plumeId.localeCompare(right.observation.plumeId));

  const invalidDateCount = observations.filter(observation => !Number.isFinite(utcTimestamp(observation.date))).length;
  if (datedFlux.length === 0) {
    return { axisMaximumKgHr: null, points: [], missingFluxCount, invalidDateCount, tickValuesKgHr: [] };
  }

  const maximumReportedUpper = Math.max(...datedFlux.map(({ observation, value }) => {
    const uncertainty = observation.uncertaintyKgHr;
    return value + (typeof uncertainty === 'number' && Number.isFinite(uncertainty) && uncertainty >= 0 ? uncertainty : 0);
  }));
  const axisMaximumKgHr = Math.max(250, Math.ceil(maximumReportedUpper / 250) * 250);
  const plotHeight = CHART.bottom - CHART.top;
  const yFor = (value: number) => CHART.bottom - (Math.min(value, axisMaximumKgHr) / axisMaximumKgHr) * plotHeight;

  const points = datedFlux.map(({ observation, value }, index) => {
    const uncertainty = observation.uncertaintyKgHr;
    const uncertaintyKgHr = typeof uncertainty === 'number' && Number.isFinite(uncertainty) && uncertainty >= 0
      ? uncertainty
      : null;
    const lowerKgHr = uncertaintyKgHr === null ? null : Math.max(0, value - uncertaintyKgHr);
    const upperKgHr = uncertaintyKgHr === null ? null : value + uncertaintyKgHr;
    return {
      plumeId: observation.plumeId,
      date: observation.date,
      valueKgHr: value,
      uncertaintyKgHr,
      lowerKgHr,
      upperKgHr,
      x: datedFlux.length === 1
        ? (CHART.left + CHART.right) / 2
        : CHART.left + (index / (datedFlux.length - 1)) * (CHART.right - CHART.left),
      y: yFor(value),
      lowerY: lowerKgHr === null ? null : yFor(lowerKgHr),
      upperY: upperKgHr === null ? null : yFor(upperKgHr),
    };
  });

  return {
    axisMaximumKgHr,
    points,
    missingFluxCount,
    invalidDateCount,
    tickValuesKgHr: [0, 1, 2, 3, 4].map(step => (axisMaximumKgHr * step) / 4),
  };
}

export function formatLandingObservationDate(value: string): string {
  const date = value.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}
