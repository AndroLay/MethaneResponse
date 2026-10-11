import type { ReviewSource } from '@methane/shared';

/** MARS observations are periodic satellite detections, not continuous live sensor readings. */
export type MarsObservation = {
  id: string;
  date: string;
  fluxKgHr: number | null;
  uncertaintyKgHr?: number | null;
  satellite?: string;
};
export type MarsSource = ReviewSource & {
  country?: string;
  sector?: string;
  plumeCount?: number;
  lastObserved?: string;
  maxFluxKgHr?: number | null;
  notified?: string;
  feedback?: string;
  observations?: MarsObservation[];
};
export type MarsSnapshot = {
  dataset: 'UNEP MARS';
  sourceUrl: string;
  license: string;
  importedAt: string;
  lastObserved?: string;
  originalSourceCount?: number;
  truncated?: boolean;
  sources: MarsSource[];
};
const first = (o: Record<string, unknown>, ...names: string[]): unknown => {
  for (const name of names) if (o[name] !== undefined && o[name] !== null && o[name] !== '') return o[name];
  return undefined;
};
const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const validCoord = (lat: number | null, lon: number | null): lat is number => lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const ISO_URL = 'https://methanedata.unep.org/download-dataset';

/** Accept extracted MARS GeoJSON (sources, plumes or both), never invent mitigation outcomes. */
export function parseMarsGeoJSON(input: unknown): MarsSnapshot {
  if (!input || typeof input !== 'object') throw new Error('File must contain valid GeoJSON.');
  const root = input as Record<string, unknown>;
  if (root.dataset === 'UNEP MARS' && Array.isArray(root.sources)) {
    const snap = root as MarsSnapshot;
    if (!snap.sources.every(s => s && typeof s.sourceId === 'string' && Number.isFinite(s.lat) && Number.isFinite(s.lon) && s.synthetic === false)) {
      throw new Error('Normalized snapshot contains invalid or synthetic sources.');
    }
    return snap;
  }
  const features = Array.isArray(root.features) ? root.features : [];
  if (root.type !== 'FeatureCollection' || !features.length) throw new Error('Expected a GeoJSON FeatureCollection with properties. Extract the official UNEP GeoJSON ZIP first.');
  const byId = new Map<string, MarsSource>();
  let maxDate = '';
  for (const feature of features) {
    if (!feature || typeof feature !== 'object') continue;
    const f = feature as Record<string, unknown>;
    const p = f.properties && typeof f.properties === 'object' ? f.properties as Record<string, unknown> : {};
    const sourceId = str(first(p, 'source_name', 'source_id'));
    if (!/^[A-Z]{3}_S_\d+$/.test(sourceId)) continue;
    const geometry = f.geometry && typeof f.geometry === 'object' ? f.geometry as Record<string, unknown> : {};
    const coords = geometry.type === 'Point' && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    const lat = num(first(p, 'lat', 'latitude') ?? coords[1]);
    const lon = num(first(p, 'lon', 'longitude') ?? coords[0]);
    if (!validCoord(lat, lon) || lon === null) continue;
    let source = byId.get(sourceId);
    if (!source) {
      const country = str(first(p, 'country'));
      const sector = str(first(p, 'sector'));
      source = { sourceId, name: sourceId, region: country || 'Region not specified', lat, lon, country, sector, synthetic: false, evidence: [], observations: [], plumeCount: 0, notified: str(first(p, 'notified')), feedback: str(first(p, 'feedback')) };
      byId.set(sourceId, source);
    }
    source.country ||= str(first(p, 'country'));
    source.sector ||= str(first(p, 'sector'));
    source.notified ||= str(first(p, 'notified'));
    source.feedback ||= str(first(p, 'feedback'));
    const date = str(first(p, 'tile_date', 'last_plume_date'));
    if (date && date > maxDate) maxDate = date;
    const obsId = str(first(p, 'id_plume'));
    const flux = num(first(p, 'ch4_fluxrate'));
    if (obsId && date && source.observations && !source.observations.some(o => o.id === obsId)) {
      source.observations.push({ id: obsId, date, fluxKgHr: flux, uncertaintyKgHr: num(first(p, 'ch4_fluxrate_std')), satellite: str(first(p, 'satellite')) });
      source.plumeCount = (source.plumeCount || 0) + 1;
      source.evidence.push({ id: obsId, kind: 'detection', title: 'UNEP MARS satellite plume observation', reference: `${ISO_URL}#${sourceId}`, date, synthetic: false });
    }
    if (date && (!source.lastObserved || date > source.lastObserved)) source.lastObserved = date;
    if (flux !== null) source.maxFluxKgHr = Math.max(source.maxFluxKgHr || 0, flux);
    const sourcePlumes = num(first(p, 'n_plumes_detected'));
    if (sourcePlumes !== null) source.plumeCount = Math.max(source.plumeCount || 0, sourcePlumes);
  }
  const sources = Array.from(byId.values());
  if (!sources.length) throw new Error('No valid MARS source IDs and WGS84 coordinates were found. Check you selected the official MARS dataset.');
  for (const s of sources) {
    s.observations?.sort((a,b) => a.date.localeCompare(b.date));
    s.evidence.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    s.evidence = s.evidence.slice(0, 40);
    // Bound source memory for browser use while preserving latest observations.
    s.observations = s.observations?.slice(-60);
  }
  return { dataset: 'UNEP MARS', sourceUrl: ISO_URL, license: 'CC BY-NC-SA 4.0', importedAt: new Date().toISOString(), lastObserved: maxDate, originalSourceCount: sources.length, sources };
}

export async function loadMarsFile(file: File): Promise<MarsSnapshot> {
  if (file.size > 90 * 1024 * 1024) throw new Error('File too large for browser import (>90 MB). Use the Python ZIP importer for full datasets.');
  if (/\.zip$/i.test(file.name)) throw new Error('Extract the UNEP ZIP first and choose its GeoJSON file, or use the Python ZIP importer.');
  let content: unknown;
  try { content = JSON.parse(await file.text()); }
  catch { throw new Error('Expected .geojson or normalized .json, not CSV or compressed ZIP.'); }
  return parseMarsGeoJSON(content);
}
