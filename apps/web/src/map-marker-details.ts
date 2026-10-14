export type MapMarkerDetail = { label: string; value: string };

export type SourceMarkerRecord = {
  sourceId: string;
  region?: string | null;
  lat?: number | null;
  lon?: number | null;
  maxFluxKgHr?: number | null;
  plumeCount?: number | null;
  detectedPlumeCount?: number | null;
  lastObserved?: string | null;
  latestPlumeDate?: string | null;
  notified?: string | null;
  feedback?: string | null;
  synthetic?: boolean;
};

export type ObservationMarkerRecord = {
  id: string;
  sourceId?: string | null;
  linkStatus?: 'linked' | 'source_id_missing' | 'source_record_missing';
  date?: string | null;
  fluxKgHr?: number | null;
  uncertaintyKgHr?: number | null;
  satellite?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export type MarkerProvenance = { snapshotId?: string | null; archiveSha256?: string | null };

function formatFlux(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? 'Not reported' : `${String(value)} kg/h`;
}

function formatCoordinates(lat: number | null | undefined, lon: number | null | undefined): string {
  return Number.isFinite(lat) && Number.isFinite(lon) ? `${String(lat)}, ${String(lon)}` : 'Coordinates unavailable';
}

function provenanceDetails(provenance: MarkerProvenance, synthetic = false): MapMarkerDetail[] {
  return [
    { label: 'Dataset snapshot', value: synthetic ? 'DEMO synthetic fixture' : provenance.snapshotId || 'Snapshot unavailable' },
    { label: 'Source archive SHA-256', value: provenance.archiveSha256 && /^[a-f0-9]{64}$/i.test(provenance.archiveSha256) ? provenance.archiveSha256 : 'Hash unavailable' },
  ];
}

export function getSourceMarkerDetails(source: SourceMarkerRecord, provenance: MarkerProvenance): MapMarkerDetail[] {
  const rows: MapMarkerDetail[] = [
    { label: 'MARS source ID', value: source.sourceId },
    { label: 'Region', value: source.region || 'Region not specified' },
    { label: 'Coordinates', value: formatCoordinates(source.lat, source.lon) },
    { label: 'Highest reported flux in archive', value: formatFlux(source.maxFluxKgHr) },
    { label: 'Linked plume records', value: Number.isFinite(source.plumeCount) ? String(source.plumeCount) : 'Count unavailable' },
    { label: 'Last recorded plume date', value: source.lastObserved || source.latestPlumeDate || 'Date unavailable' },
  ];
  if (Number.isFinite(source.detectedPlumeCount)) rows.push({ label: 'Publisher-reported detected count', value: String(source.detectedPlumeCount) });
  if (source.notified) rows.push({ label: 'MARS notification field', value: source.notified });
  if (source.feedback) rows.push({ label: 'MARS feedback field · not repair proof', value: source.feedback });
  return [...rows, ...provenanceDetails(provenance, source.synthetic === true)];
}

export function getObservationMarkerDetails(observation: ObservationMarkerRecord, provenance: MarkerProvenance): MapMarkerDetail[] {
  const linked = observation.linkStatus === 'linked' && Boolean(observation.sourceId);
  const sourceLink = linked
    ? `Linked to ${observation.sourceId}`
    : observation.linkStatus === 'source_record_missing' && observation.sourceId
      ? `Source record missing (${observation.sourceId})`
      : 'No source ID in MARS row';
  const uncertainty = Number.isFinite(observation.uncertaintyKgHr) && observation.uncertaintyKgHr! >= 0
    ? `±${String(observation.uncertaintyKgHr)} kg/h`
    : 'Not reported';
  return [
    { label: 'MARS observation ID', value: observation.id },
    { label: 'Source link', value: sourceLink },
    { label: 'Observation timestamp', value: observation.date || 'Date unavailable' },
    { label: 'Reported flux', value: formatFlux(observation.fluxKgHr) },
    { label: 'Reported uncertainty', value: uncertainty },
    { label: 'Satellite', value: observation.satellite || 'Not specified' },
    { label: 'Coordinates', value: formatCoordinates(observation.lat, observation.lon) },
    ...provenanceDetails(provenance),
  ];
}
