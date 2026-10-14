export type ReportedFluxBand = 'unknown' | 'under-100' | '100-499' | '500-1999' | '2000-4999' | '5000-plus';

export const REPORTED_FLUX_PALETTE: Array<{ band: ReportedFluxBand; label: string; color: string }> = [
  { band: 'under-100', label: '0–99', color: '#3978eb' },
  { band: '100-499', label: '100–499', color: '#20d2d2' },
  { band: '500-1999', label: '500–1,999', color: '#f3d14b' },
  { band: '2000-4999', label: '2,000–4,999', color: '#f58b38' },
  { band: '5000-plus', label: '≥5,000', color: '#ed4b43' },
];

const FLUX_BAND_COLORS: Record<ReportedFluxBand, string> = {
  unknown: '#91a9b2',
  ...Object.fromEntries(REPORTED_FLUX_PALETTE.map(({ band, color }) => [band, color])) as Pick<Record<ReportedFluxBand, string>, Exclude<ReportedFluxBand, 'unknown'>>,
};

export function getReportedFluxBand(fluxKgHr: number | null | undefined): ReportedFluxBand {
  if (fluxKgHr === null || fluxKgHr === undefined || !Number.isFinite(fluxKgHr) || fluxKgHr < 0) return 'unknown';
  if (fluxKgHr < 100) return 'under-100';
  if (fluxKgHr < 500) return '100-499';
  if (fluxKgHr < 2_000) return '500-1999';
  if (fluxKgHr < 5_000) return '2000-4999';
  return '5000-plus';
}

export function getReportedFluxColor(fluxKgHr: number | null | undefined): string {
  return FLUX_BAND_COLORS[getReportedFluxBand(fluxKgHr)];
}
