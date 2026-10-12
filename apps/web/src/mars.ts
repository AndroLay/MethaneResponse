import type { ReviewSource } from '@methane/shared';

/** MARS observations are periodic satellite detections, not continuous live sensor readings. */
export type MarsObservation = {
  id: string;
  date: string;
  sourceId?: string | null;
  linkStatus?: 'linked' | 'source_id_missing' | 'source_record_missing';
  fluxKgHr: number | null;
  uncertaintyKgHr?: number | null;
  fluxUnit?: 'kg/h';
  satellite?: string;
  lat?: number;
  lon?: number;
  notified?: boolean;
  actionable?: string;
  tile?: string;
  detectionInstitution?: string;
  quantificationInstitution?: string;
  totalEmissionTonnes?: number | null;
  totalEmissionStdTonnes?: number | null;
  windU?: number | null;
  windV?: number | null;
  windSpeed?: number | null;
  lastUpdate?: string | null;
  insertDate?: string | null;
  tileBackground?: string | null;
  country?: string | null;
  sector?: string | null;
  raw?: Record<string, string>;
};
export type MarsSource = Omit<ReviewSource, 'observations'> & {
  country?: string;
  sector?: string;
  plumeCount?: number;
  lastObserved?: string;
  maxFluxKgHr?: number | null;
  notified?: string;
  feedback?: string;
  sourceType?: string | null;
  detectedPlumeCount?: number | null;
  latestPlumeId?: string | null;
  latestPlumeDate?: string | null;
  persistency?: number | null;
  persistencyStd?: number | null;
  persistencyCategory?: string | null;
  raw?: Record<string, string>;
  observations?: MarsObservation[];
};
export type MarsSnapshot = {
  dataset: 'UNEP MARS';
  sourceUrl: string;
  license: string;
  importedAt: string;
  snapshotId?: string;
  provenance?: Record<string, unknown>;
  counts?: Record<string, number>;
  plumeObservationDateRange?: { start: string | null; end: string | null };
  lastObserved?: string;
  plumeCount?: number;
  unlinkedObservations?: MarsObservation[];
  unmappedSources?: Record<string, unknown>[];
  unlinkedSourceCount?: number;
  originalSourceCount?: number;
  truncated?: boolean;
  sources: MarsSource[];
};

export type ObservationArchiveWindow = 'All observations' | '1 year' | '30 days';

/** Filter within the dated archive, relative to its last day rather than today's clock. */
export function filterObservationsToArchiveWindow<T extends { date: string }>(
  observations: T[],
  window: ObservationArchiveWindow,
  archiveEndDate?: string | null,
): T[] {
  if (window === 'All observations') return observations;
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeDays = window === '30 days' ? 30 : 365;
  const utcDay = (value: string): number => {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return Number.NaN;
    const parsed = new Date(timestamp);
    return Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  };
  const providedEnd = archiveEndDate ? utcDay(archiveEndDate) : Number.NaN;
  const latestObservationDay = observations.reduce((latest, observation) => {
    const day = utcDay(observation.date);
    return Number.isFinite(day) && (!Number.isFinite(latest) || day > latest) ? day : latest;
  }, Number.NaN);
  const endDay = Number.isFinite(providedEnd) ? providedEnd : archiveEndDate ? Number.NaN : latestObservationDay;
  if (!Number.isFinite(endDay)) return [];
  const startDay = endDay - (rangeDays - 1) * dayMs;
  const endExclusive = endDay + dayMs;
  return observations.filter(observation => {
    const timestamp = Date.parse(observation.date);
    return Number.isFinite(timestamp) && timestamp >= startDay && timestamp < endExclusive;
  });
}

export function getMarsDashboardSummary(sources: MarsSource[], unlinked: MarsObservation[] = []) {
  const observationsByYear: Record<string, number> = {};
  let linkedObservationCount = 0;
  for (const source of sources) {
    for (const observation of source.observations || []) {
      linkedObservationCount += 1;
      const year = /^(\d{4})/.exec(observation.date)?.[1];
      if (year) observationsByYear[year] = (observationsByYear[year] || 0) + 1;
    }
  }
  for (const observation of unlinked) {
    const year = /^(\d{4})/.exec(observation.date)?.[1];
    if (year) observationsByYear[year] = (observationsByYear[year] || 0) + 1;
  }
  const sourcesWithResponseMetadata = sources.filter(source => [
    source.notified, source.feedback, source.feedbackOperator, source.feedbackGovernment,
  ].some(value => typeof value === 'string' && value.trim().length > 0)).length;
  return {
    sourceCount: sources.length,
    linkedObservationCount,
    unlinkedObservationCount: unlinked.length,
    observationCount: linkedObservationCount + unlinked.length,
    sourcesWithResponseMetadata,
    observationsByYear,
  };
}

/** Add curated casebook documents to matching global records without replacing snapshot observations or provenance. */
export function mergeCuratedCasebookEvidence(sources: MarsSource[], casebook: MarsSource[]): MarsSource[] {
  const curatedBySourceId = new Map(casebook.map(source => [source.sourceId, source]));
  return sources.map(source => {
    const curated = curatedBySourceId.get(source.sourceId);
    if (!curated) return source;
    const detectionIds = curated.evidence.filter(evidence => evidence.kind === 'detection').map(evidence => evidence.id);
    const currentObservationIds = new Set((source.observations || []).map(observation => observation.id));
    if (!detectionIds.length || !detectionIds.every(id => currentObservationIds.has(id))) return source;
    return {
      ...source,
      caseId: curated.caseId,
      evidence: curated.evidence,
      externalEvidence: curated.externalEvidence,
    };
  });
}

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

function rawFields(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, field]) => [key, field == null ? '' : String(field)]));
}

function parseNormalizedMarsTables(root: Record<string, unknown>): MarsSnapshot {
  const rawSources = Array.isArray(root.sources) ? root.sources : [];
  const rawPlumes = Array.isArray(root.plumes) ? root.plumes : [];
  const sourceById = new Map<string, MarsSource>();
  let unlinkedSourceCount = 0;
  for (const item of rawSources) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const sourceId = str(record.sourceId);
    const lat = num(record.lat);
    const lon = num(record.lon);
    if (!sourceId || !validCoord(lat, lon) || lon === null) { unlinkedSourceCount += 1; continue; }
    const country = str(record.country);
    const sector = str(record.sector);
    sourceById.set(sourceId, {
      sourceId, name: sourceId, region: country || 'Region not specified', lat, lon,
      country, sector, sourceType: str(record.sourceType),
      synthetic: false, evidence: [], observations: [], plumeCount: 0,
      detectedPlumeCount: num(record.detectedPlumeCount),
      latestPlumeId: str(record.latestPlumeId) || null,
      latestPlumeDate: str(record.latestPlumeDate) || null,
      notified: str(record.notified), feedback: str(record.feedback),
      feedbackOperator: str(record.feedbackOperator), feedbackGovernment: str(record.feedbackGovernment),
      persistency: num(record.persistency), persistencyStd: num(record.persistencyStd),
      persistencyCategory: str(record.persistencyCategory),
      raw: rawFields(record.raw),
      provenance: root.provenance && typeof root.provenance === 'object' ? root.provenance as MarsSource['provenance'] : undefined,
    });
  }

  const unlinkedObservations: MarsObservation[] = [];
  let maxDate = '';
  for (const item of rawPlumes) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const sourceId = str(record.sourceId) || null;
    const plumeId = str(record.plumeId);
    const date = str(record.tileDate);
    if (!plumeId || !date) continue;
    const lat = num(record.lat);
    const lon = num(record.lon);
    const observation: MarsObservation = {
      id: plumeId, sourceId, linkStatus: record.linkStatus === 'linked' ? 'linked' : record.linkStatus === 'source_record_missing' ? 'source_record_missing' : 'source_id_missing',
      date, fluxKgHr: num(record.fluxKgHr), uncertaintyKgHr: num(record.fluxStdKgHr), fluxUnit: 'kg/h',
      satellite: str(record.satellite), actionable: str(record.actionable),
      ...(lat !== null && Math.abs(lat) <= 90 ? { lat } : {}),
      ...(lon !== null && Math.abs(lon) <= 180 ? { lon } : {}),
      ...(typeof record.notified === 'boolean' ? { notified: record.notified } : {}),
      tile: str(record.tile), detectionInstitution: str(record.detectionInstitution),
      quantificationInstitution: str(record.quantificationInstitution),
      totalEmissionTonnes: num(record.totalEmissionTonnes),
      totalEmissionStdTonnes: num(record.totalEmissionStdTonnes),
      windU: num(record.windU), windV: num(record.windV), windSpeed: num(record.windSpeed),
      lastUpdate: str(record.lastUpdate) || null, insertDate: str(record.insertDate) || null,
      tileBackground: str(record.tileBackground) || null,
      country: str(record.country) || null, sector: str(record.sector) || null,
      raw: rawFields(record.raw),
    };
    if (date > maxDate) maxDate = date;
    const source = sourceId ? sourceById.get(sourceId) : undefined;
    if (!source || observation.linkStatus !== 'linked') {
      unlinkedObservations.push(observation);
      continue;
    }
    source.observations?.push(observation);
    source.plumeCount = (source.plumeCount || 0) + 1;
    if (!source.lastObserved || date > source.lastObserved) source.lastObserved = date;
    if (observation.fluxKgHr !== null) source.maxFluxKgHr = Math.max(source.maxFluxKgHr || 0, observation.fluxKgHr);
  }
  for (const source of sourceById.values()) {
    source.observations?.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    source.lastObserved ||= source.latestPlumeDate || undefined;
  }
  const provenance = root.provenance && typeof root.provenance === 'object' ? root.provenance as Record<string, unknown> : {};
  const counts = root.counts && typeof root.counts === 'object' ? root.counts as Record<string, number> : {};
  const dateRange = root.plumeObservationDateRange && typeof root.plumeObservationDateRange === 'object'
    ? root.plumeObservationDateRange as MarsSnapshot['plumeObservationDateRange'] : undefined;
  const retrievedAt = str(provenance.retrievedAt) || new Date().toISOString();
  const rootUnlinked = Array.isArray(root.unlinkedObservations) ? root.unlinkedObservations as MarsObservation[] : [];
  if (rootUnlinked.length) unlinkedObservations.push(...rootUnlinked);
  return {
    dataset: 'UNEP MARS', sourceUrl: ISO_URL, license: str(provenance.license) || 'CC BY-NC-SA 4.0',
    importedAt: retrievedAt, snapshotId: str(root.snapshotId || provenance.snapshotId) || undefined,
    provenance, counts,
    plumeObservationDateRange: dateRange,
    lastObserved: maxDate || dateRange?.end || undefined,
    plumeCount: Number(counts.plumes) || rawPlumes.length,
    originalSourceCount: Number(counts.sources) || rawSources.length,
    unlinkedSourceCount, unlinkedObservations,
    sources: Array.from(sourceById.values()),
  };
}

/** Accept extracted MARS GeoJSON (sources, plumes or both), never invent mitigation outcomes. */
export function parseMarsGeoJSON(input: unknown): MarsSnapshot {
  if (!input || typeof input !== 'object') throw new Error('File must contain valid GeoJSON.');
  const root = input as Record<string, unknown>;
  const sourceRows = Array.isArray(root.sources) ? root.sources : [];
  const plumeRows = Array.isArray(root.plumes) ? root.plumes : [];
  const rootProvenance = root.provenance && typeof root.provenance === 'object' ? root.provenance as Record<string, unknown> : {};
  if (sourceRows.length && plumeRows.length && (root.snapshotId || rootProvenance.dataset)) {
    return parseNormalizedMarsTables(root);
  }
  if (root.dataset === 'UNEP MARS' && Array.isArray(root.sources)) {
    const snap = root as MarsSnapshot;
    if (!snap.sources.every(s => s && typeof s.sourceId === 'string' && Number.isFinite(s.lat) && Number.isFinite(s.lon) && s.synthetic === false)) {
      throw new Error('Normalized snapshot contains invalid or synthetic sources.');
    }
    for (const source of snap.sources) {
      source.observations = (source.observations || []).slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    }
    snap.unlinkedObservations ||= [];
    return snap;
  }
  const features = Array.isArray(root.features) ? root.features : [];
  if (root.type !== 'FeatureCollection' || !features.length) throw new Error('Expected a GeoJSON FeatureCollection with properties. Extract the official UNEP GeoJSON ZIP first.');
  const byId = new Map<string, MarsSource>();
  const unlinkedObservations: MarsObservation[] = [];
  let maxDate = '';
  for (const feature of features) {
    if (!feature || typeof feature !== 'object') continue;
    const f = feature as Record<string, unknown>;
    const p = f.properties && typeof f.properties === 'object' ? f.properties as Record<string, unknown> : {};
    const sourceId = str(first(p, 'source_name', 'source_id'));
    const geometry = f.geometry && typeof f.geometry === 'object' ? f.geometry as Record<string, unknown> : {};
    const coords = geometry.type === 'Point' && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
    const lat = num(first(p, 'lat', 'latitude') ?? coords[1]);
    const lon = num(first(p, 'lon', 'longitude') ?? coords[0]);
    if (!validCoord(lat, lon) || lon === null) continue;
    const date = str(first(p, 'tile_date', 'last_plume_date'));
    const obsId = str(first(p, 'id_plume'));
    if (!/^[A-Z]{3}_S_\d+$/.test(sourceId)) {
      if (obsId && date) {
        const flux = num(first(p, 'ch4_fluxrate'));
        unlinkedObservations.push({
          id: obsId, sourceId: sourceId || null, linkStatus: sourceId ? 'source_record_missing' : 'source_id_missing',
          date, fluxKgHr: flux, uncertaintyKgHr: num(first(p, 'ch4_fluxrate_std')),
          fluxUnit: 'kg/h', satellite: str(first(p, 'satellite')), lat, lon,
          actionable: str(first(p, 'actionable')), tile: str(first(p, 'tile')),
          detectionInstitution: str(first(p, 'detection_institution')),
          quantificationInstitution: str(first(p, 'quantification_institution')),
          totalEmissionTonnes: num(first(p, 'total_emission')),
          totalEmissionStdTonnes: num(first(p, 'total_emission_std')),
          windU: num(first(p, 'wind_u')), windV: num(first(p, 'wind_v')),
          windSpeed: num(first(p, 'wind_speed')),
          lastUpdate: str(first(p, 'last_update')) || null,
          insertDate: str(first(p, 'insert_date')) || null,
          tileBackground: str(first(p, 'tile_background')) || null,
          raw: rawFields(p),
        });
        if (date > maxDate) maxDate = date;
      }
      continue;
    }
    let source = byId.get(sourceId);
    if (!source) {
      const country = str(first(p, 'country'));
      const sector = str(first(p, 'sector'));
      source = {
        sourceId, name: sourceId, region: country || 'Region not specified', lat, lon, country, sector,
        synthetic: false, evidence: [], observations: [], plumeCount: 0,
        notified: str(first(p, 'notified')), feedback: str(first(p, 'feedback')),
        feedbackOperator: str(first(p, 'feedback_operator')), feedbackGovernment: str(first(p, 'feedback_government')),
        persistency: num(first(p, 'persistency')), persistencyStd: num(first(p, 'persistency_std')),
        persistencyCategory: str(first(p, 'persistency_category')),
        sourceType: str(first(p, 'source_type')),
        detectedPlumeCount: num(first(p, 'n_plumes_detected')),
        raw: rawFields(p),
      };
      byId.set(sourceId, source);
    }
    source.country ||= str(first(p, 'country'));
    source.sector ||= str(first(p, 'sector'));
    source.notified ||= str(first(p, 'notified'));
    source.feedback ||= str(first(p, 'feedback'));
    source.feedbackOperator ||= str(first(p, 'feedback_operator'));
    source.feedbackGovernment ||= str(first(p, 'feedback_government'));
    if (source.persistency == null) source.persistency = num(first(p, 'persistency'));
    if (source.persistencyStd == null) source.persistencyStd = num(first(p, 'persistency_std'));
    source.persistencyCategory ||= str(first(p, 'persistency_category'));
    if (date && date > maxDate) maxDate = date;
    const flux = num(first(p, 'ch4_fluxrate'));
    if (obsId && date && source.observations && !source.observations.some(o => o.id === obsId)) {
      const plumeLat = num(first(p, 'lat', 'latitude') ?? coords[1]);
      const plumeLon = num(first(p, 'lon', 'longitude') ?? coords[0]);
      source.observations.push({
        id: obsId, date, fluxKgHr: flux, uncertaintyKgHr: num(first(p, 'ch4_fluxrate_std')),
        fluxUnit: 'kg/h', satellite: str(first(p, 'satellite')),
        ...(plumeLat !== null && Math.abs(plumeLat) <= 90 ? { lat: plumeLat } : {}),
        ...(plumeLon !== null && Math.abs(plumeLon) <= 180 ? { lon: plumeLon } : {}),
        ...(typeof first(p, 'notified') === 'boolean' ? { notified: first(p, 'notified') as boolean } : {}),
        actionable: str(first(p, 'actionable')), tile: str(first(p, 'tile')),
        detectionInstitution: str(first(p, 'detection_institution')),
        quantificationInstitution: str(first(p, 'quantification_institution')),
        totalEmissionTonnes: num(first(p, 'total_emission')),
        totalEmissionStdTonnes: num(first(p, 'total_emission_std')),
        windU: num(first(p, 'wind_u')), windV: num(first(p, 'wind_v')),
        windSpeed: num(first(p, 'wind_speed')),
        lastUpdate: str(first(p, 'last_update')) || null,
        insertDate: str(first(p, 'insert_date')) || null,
        tileBackground: str(first(p, 'tile_background')) || null,
        sourceId, linkStatus: 'linked', raw: rawFields(p),
      });
      source.plumeCount = (source.plumeCount || 0) + 1;
      source.evidence.push({ id: obsId, kind: 'detection', title: 'UNEP MARS satellite plume observation', reference: `${ISO_URL}#${sourceId}`, date, synthetic: false });
    }
    if (date && (!source.lastObserved || date > source.lastObserved)) source.lastObserved = date;
    if (flux !== null) source.maxFluxKgHr = Math.max(source.maxFluxKgHr || 0, flux);
  }
  const sources = Array.from(byId.values());
  if (!sources.length) throw new Error('No valid MARS source IDs and WGS84 coordinates were found. Check you selected the official MARS dataset.');
  for (const s of sources) {
    s.observations?.sort((a,b) => a.date.localeCompare(b.date));
    s.evidence.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    s.plumeCount = s.observations?.length || 0;
  }
  return { dataset: 'UNEP MARS', sourceUrl: ISO_URL, license: 'CC BY-NC-SA 4.0', importedAt: new Date().toISOString(), lastObserved: maxDate, plumeCount: sources.reduce((sum, s) => sum + (s.plumeCount || 0), 0) + unlinkedObservations.length, originalSourceCount: sources.length, unlinkedObservations, sources };
}

export async function loadMarsFile(file: File): Promise<MarsSnapshot> {
  if (file.size > 90 * 1024 * 1024) throw new Error('File too large for browser import (>90 MB). Use the Python ZIP importer for full datasets.');
  if (/\.zip$/i.test(file.name)) throw new Error('Extract the UNEP ZIP first and choose its GeoJSON file, or use the Python ZIP importer.');
  let content: unknown;
  try { content = JSON.parse(await file.text()); }
  catch { throw new Error('Expected .geojson or normalized .json, not CSV or compressed ZIP.'); }
  return parseMarsGeoJSON(content);
}

/** Decode the versioned gzip asset shipped by the local/offline data pipeline. */
export async function parseMarsGzip(bytes: ArrayBuffer | Uint8Array): Promise<MarsSnapshot> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot decompress the bundled MARS snapshot. Use a current browser or import a GeoJSON file.');
  }
  try {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const isGzip = data.byteLength >= 2 && data[0] === 0x1f && data[1] === 0x8b;
    if (!isGzip) return parseMarsGeoJSON(JSON.parse(new TextDecoder().decode(data)));
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return parseMarsGeoJSON(await new Response(stream).json());
  } catch (error) {
    if (error instanceof Error && error.message.includes('browser cannot decompress')) throw error;
    throw new Error('The bundled MARS snapshot could not be decompressed or validated.');
  }
}
