import type { Feature, FeatureCollection, MultiPolygon, Point } from 'geojson';
import type { MarsObservation } from './mars';
import type { RenderTier } from './earth-rendering';

export type PlumeFootprintProperties = {
  plumeId: string;
  sourceId: string | null;
  observedAt: string;
  latitude: number;
  longitude: number;
  reportedFluxKgHr: number | null;
  reportedUncertaintyKgHr: number | null;
  satellite: string | null;
  sector: string | null;
  country: string | null;
  notified: boolean | null;
  actionable: string | null;
};

export type PlumeFootprintFeature = Feature<MultiPolygon, PlumeFootprintProperties>;
export type PlumeFootprintCollection = FeatureCollection<MultiPolygon, PlumeFootprintProperties>;
export type PlumeFootprintLocationCollection = FeatureCollection<Point, PlumeFootprintProperties>;
export type PlumeObservationLocationProperties = PlumeFootprintProperties & { hasGeometry: 0 | 1 | null };
export type PlumeObservationLocationCollection = FeatureCollection<Point, PlumeObservationLocationProperties>;

export type PlumeGeometryMonth = {
  file: string | null;
  sha256: string | null;
  featureCount: number;
  plumeRecordCount: number;
  withoutGeometryCount: number;
  compressedBytes: number;
  /** Hash of the uncompressed GeoJSON representation returned by browsers when HTTP Content-Encoding is gzip. */
  uncompressedSha256?: string | null;
  uncompressedBytes?: number;
};

export type PlumeGeometryManifest = {
  schemaVersion: 1;
  datasetId: string;
  sourceArchiveSha256: string;
  sourceRetrievedAt: string | null;
  geometryArchiveSha256: string;
  retrievedAt: string;
  upstreamLastModifiedAt: string | null;
  catalogUrl: string;
  downloadUrl: string;
  license: string;
  attribution: string;
  geometryLimitation: string;
  inputPlumeCount: number;
  geometryFeatureCount: number;
  withoutGeometryCount: number;
  observationMonths: string[];
  months: Record<string, PlumeGeometryMonth>;
};

export type LoadedPlumeGeometryMonth = {
  manifest: PlumeGeometryManifest;
  collection: PlumeFootprintCollection;
};

export const FLUX_FOOTPRINT_NO_DATA = '#91a9b2';
/** SHA-256 of the tracked manifest; a shard hash is only meaningful if its index is pinned too. */
export const PINNED_MARS_GEOMETRY_MANIFEST_SHA256 = '81484a5461799b4e8e13b06fd808948b627131c2d027834293ae82677fbdc1be';
export const FLUX_FOOTPRINT_BINS = [
  { minimum: 0, color: '#3978eb' },
  { minimum: 100, color: '#20d2d2' },
  { minimum: 500, color: '#f3d14b' },
  { minimum: 2_000, color: '#f58b38' },
  { minimum: 5_000, color: '#ed4b43' },
] as const;

export function getFluxFootprintColor(fluxKgHr: number | null): string {
  if (fluxKgHr === null || !Number.isFinite(fluxKgHr) || fluxKgHr < 0) return FLUX_FOOTPRINT_NO_DATA;
  let color: string = FLUX_FOOTPRINT_BINS[0].color;
  for (const bin of FLUX_FOOTPRINT_BINS.slice(1)) {
    if (fluxKgHr < bin.minimum) break;
    color = bin.color;
  }
  return color;
}

/** MapLibre expression shared by the polygon fill and global record-location markers. */
export function getFluxFootprintColorExpression(property = 'reportedFluxKgHr'): unknown[] {
  const value = ['get', property];
  return [
    'case',
    ['any', ['==', value, null], ['<', value, 0]], FLUX_FOOTPRINT_NO_DATA,
    ['step', value,
      FLUX_FOOTPRINT_BINS[0].color,
      FLUX_FOOTPRINT_BINS[1].minimum, FLUX_FOOTPRINT_BINS[1].color,
      FLUX_FOOTPRINT_BINS[2].minimum, FLUX_FOOTPRINT_BINS[2].color,
      FLUX_FOOTPRINT_BINS[3].minimum, FLUX_FOOTPRINT_BINS[3].color,
      FLUX_FOOTPRINT_BINS[4].minimum, FLUX_FOOTPRINT_BINS[4].color,
    ],
  ];
}

export function geometrySnapshotMatches(
  manifest: Pick<PlumeGeometryManifest, 'datasetId' | 'sourceArchiveSha256'>,
  expectedSnapshotId: string,
  expectedSourceArchiveSha256: string,
): boolean {
  return Boolean(expectedSnapshotId && /^[a-f0-9]{64}$/.test(expectedSourceArchiveSha256)
    && manifest.datasetId === expectedSnapshotId
    && manifest.sourceArchiveSha256 === expectedSourceArchiveSha256);
}

export function shouldLoadPlumeFootprints(renderTier: RenderTier): boolean {
  return renderTier !== 'low';
}

export function filterPlumeFootprints(
  collection: PlumeFootprintCollection,
  observations: readonly Pick<MarsObservation, 'id'>[],
): PlumeFootprintCollection {
  const visibleIds = new Set(observations.map(observation => observation.id));
  return {
    ...collection,
    features: collection.features.filter(feature => visibleIds.has(feature.properties.plumeId)),
  };
}

export function toPlumeFootprintLocations(collection: PlumeFootprintCollection): PlumeFootprintLocationCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.filter(feature => Number.isFinite(feature.properties.longitude)
      && Number.isFinite(feature.properties.latitude)
      && Math.abs(feature.properties.longitude) <= 180
      && Math.abs(feature.properties.latitude) <= 90).map(feature => ({
      type: 'Feature',
      id: feature.properties.plumeId,
      geometry: { type: 'Point', coordinates: [feature.properties.longitude, feature.properties.latitude] },
      properties: feature.properties,
    })),
  };
}

/**
 * Keep every selected-month MARS observation visible at small scales, including
 * records for which the publisher supplied no polygon geometry. Coordinates
 * and flux remain the original per-record values; no plume surface is inferred.
 */
export function toPlumeObservationLocations(
  observations: readonly MarsObservation[],
  collection: PlumeFootprintCollection,
  month: string,
  geometryKnown = true,
): PlumeObservationLocationCollection {
  if (!MONTH_PATTERN.test(month)) return { type: 'FeatureCollection', features: [] };
  const geometryIds = new Set(collection.features.map(feature => feature.properties.plumeId));
  const features = observations.filter(observation => observation.date.slice(0, 7) === month
    && Number.isFinite(observation.lat) && Number.isFinite(observation.lon)
    && Math.abs(observation.lat!) <= 90 && Math.abs(observation.lon!) <= 180)
    .map(observation => ({
      type: 'Feature' as const,
      id: observation.id,
      geometry: { type: 'Point' as const, coordinates: [observation.lon!, observation.lat!] as [number, number] },
      properties: {
        plumeId: observation.id,
        sourceId: observation.sourceId || null,
        observedAt: observation.date,
        latitude: observation.lat!,
        longitude: observation.lon!,
        reportedFluxKgHr: observation.fluxKgHr,
        reportedUncertaintyKgHr: observation.uncertaintyKgHr ?? null,
        satellite: observation.satellite || null,
        sector: observation.sector || null,
        country: observation.country || null,
        notified: typeof observation.notified === 'boolean' ? observation.notified : null,
        actionable: observation.actionable || null,
        hasGeometry: geometryKnown ? (geometryIds.has(observation.id) ? 1 : 0) as 0 | 1 : null,
      },
    }));
  return { type: 'FeatureCollection', features };
}

const EMPTY_FOOTPRINTS: PlumeFootprintCollection = { type: 'FeatureCollection', features: [] };
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateManifest(value: unknown): PlumeGeometryManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.datasetId !== 'string'
    || typeof value.sourceArchiveSha256 !== 'string' || !SHA256_PATTERN.test(value.sourceArchiveSha256)
    || typeof value.geometryArchiveSha256 !== 'string' || !SHA256_PATTERN.test(value.geometryArchiveSha256)
    || typeof value.retrievedAt !== 'string' || typeof value.catalogUrl !== 'string'
    || typeof value.downloadUrl !== 'string' || typeof value.license !== 'string'
    || typeof value.attribution !== 'string' || typeof value.geometryLimitation !== 'string'
    || !Number.isInteger(value.inputPlumeCount) || !Number.isInteger(value.geometryFeatureCount)
    || !Number.isInteger(value.withoutGeometryCount) || !Array.isArray(value.observationMonths)
    || !isRecord(value.months)) {
    throw new Error('MARS geometry manifest is invalid');
  }
  for (const [month, entry] of Object.entries(value.months)) {
    if (!MONTH_PATTERN.test(month) || !isRecord(entry)) {
      throw new Error('MARS geometry manifest contains an invalid month entry');
    }
    const hasUncompressedMetadata = entry.uncompressedBytes !== undefined || entry.uncompressedSha256 !== undefined;
    const uncompressedMetadataInvalid = hasUncompressedMetadata && (
      !Number.isInteger(entry.uncompressedBytes) || (entry.uncompressedBytes as number) < 0
      || (entry.uncompressedBytes === undefined) !== (entry.uncompressedSha256 === undefined)
      || ((entry.featureCount as number) === 0 && (entry.uncompressedBytes !== 0 || entry.uncompressedSha256 !== null))
      || ((entry.featureCount as number) > 0 && ((entry.uncompressedBytes as number) === 0
        || typeof entry.uncompressedSha256 !== 'string' || !SHA256_PATTERN.test(entry.uncompressedSha256)))
    );
    if (!(entry.file === null || entry.file === `${month}.geojson.gz`)
      || !(entry.sha256 === null || (typeof entry.sha256 === 'string' && SHA256_PATTERN.test(entry.sha256)))
      || !Number.isInteger(entry.featureCount) || !Number.isInteger(entry.plumeRecordCount)
      || !Number.isInteger(entry.withoutGeometryCount) || !Number.isInteger(entry.compressedBytes)
      || (entry.featureCount as number) < 0 || (entry.plumeRecordCount as number) < 0
      || (entry.withoutGeometryCount as number) < 0 || (entry.compressedBytes as number) < 0
      || ((entry.featureCount as number) === 0 && (entry.file !== null || entry.sha256 !== null))
      || ((entry.featureCount as number) > 0 && (typeof entry.file !== 'string' || typeof entry.sha256 !== 'string'))
      || uncompressedMetadataInvalid) {
      throw new Error('MARS geometry manifest contains an invalid month entry');
    }
  }
  return value as unknown as PlumeGeometryManifest;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function parseFeatureCollection(value: unknown, expectedMonth: string, expectedCount: number): PlumeFootprintCollection {
  if (!isRecord(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)
    || value.features.length !== expectedCount) {
    throw new Error('MARS geometry shard has an invalid feature count or GeoJSON structure');
  }
  const features: PlumeFootprintFeature[] = value.features.map((candidate: unknown) => {
    if (!isRecord(candidate) || candidate.type !== 'Feature' || !isRecord(candidate.geometry)
      || candidate.geometry.type !== 'MultiPolygon' || !isRecord(candidate.properties)) {
      throw new Error('MARS geometry shard contains an invalid plume feature');
    }
    const properties = candidate.properties;
    if (typeof properties.plumeId !== 'string' || !properties.plumeId
      || typeof properties.observedAt !== 'string' || properties.observedAt.slice(0, 7) !== expectedMonth
      || typeof properties.latitude !== 'number' || !Number.isFinite(properties.latitude)
      || Math.abs(properties.latitude) > 90
      || typeof properties.longitude !== 'number' || !Number.isFinite(properties.longitude)
      || Math.abs(properties.longitude) > 180
      || !(properties.reportedFluxKgHr === null || (typeof properties.reportedFluxKgHr === 'number' && Number.isFinite(properties.reportedFluxKgHr)))
      || !(properties.reportedUncertaintyKgHr === null || (typeof properties.reportedUncertaintyKgHr === 'number' && Number.isFinite(properties.reportedUncertaintyKgHr)))) {
      throw new Error('MARS geometry shard has invalid plume metadata');
    }
    return candidate as unknown as PlumeFootprintFeature;
  });
  return { type: 'FeatureCollection', features };
}

export async function loadMonthlyPlumeGeometry(options: {
  month: string;
  expectedSnapshotId: string;
  expectedSourceArchiveSha256: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  basePath?: string;
  expectedManifestSha256?: string;
}): Promise<LoadedPlumeGeometryMonth> {
  const { month, expectedSnapshotId, expectedSourceArchiveSha256, signal } = options;
  if (!MONTH_PATTERN.test(month)) throw new Error('MARS geometry month is invalid');
  const fetcher = options.fetchImpl || fetch;
  const basePath = (options.basePath || '/data/mars-plume-geometries').replace(/\/+$/, '');
  const manifestResponse = await fetcher(`${basePath}/index.json`, { signal, cache: 'no-cache' });
  if (!manifestResponse.ok) throw new Error('MARS geometry index is unavailable');
  const indexBytes = await manifestResponse.arrayBuffer();
  const expectedManifestSha256 = options.expectedManifestSha256 || PINNED_MARS_GEOMETRY_MANIFEST_SHA256;
  if (!SHA256_PATTERN.test(expectedManifestSha256) || !globalThis.crypto?.subtle) {
    throw new Error('This browser cannot verify the pinned MARS geometry index');
  }
  const indexDigest = bytesToHex(await globalThis.crypto.subtle.digest('SHA-256', indexBytes));
  if (indexDigest !== expectedManifestSha256) throw new Error('MARS geometry index failed its pinned SHA-256 integrity check');
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(new TextDecoder().decode(indexBytes));
  } catch {
    throw new Error('MARS geometry index could not be parsed');
  }
  const manifest = validateManifest(manifestValue);
  if (!geometrySnapshotMatches(manifest, expectedSnapshotId, expectedSourceArchiveSha256)) {
    throw new Error('MARS geometry does not match the active data snapshot');
  }
  const monthEntry = manifest.months[month];
  if (!monthEntry || monthEntry.featureCount === 0) return { manifest, collection: EMPTY_FOOTPRINTS };
  const shardResponse = await fetcher(`${basePath}/${monthEntry.file}?v=${manifest.geometryArchiveSha256}`, { signal, cache: 'force-cache' });
  if (!shardResponse.ok) throw new Error('MARS geometry shard is unavailable');
  const shardBytes = await shardResponse.arrayBuffer();
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('This browser cannot verify MARS geometry hashes');
  let parsed: unknown;
  if (shardBytes.byteLength === monthEntry.compressedBytes) {
    const digest = bytesToHex(await subtle.digest('SHA-256', shardBytes));
    if (digest !== monthEntry.sha256) throw new Error('MARS geometry shard failed its SHA-256 integrity check');
    try {
      const decompression = new DecompressionStream('gzip');
      const stream = new Blob([shardBytes]).stream().pipeThrough(decompression);
      parsed = JSON.parse(await new Response(stream).text());
    } catch {
      throw new Error('MARS geometry shard could not be decompressed or parsed');
    }
  } else if (monthEntry.uncompressedBytes !== undefined && monthEntry.uncompressedSha256
    && shardBytes.byteLength === monthEntry.uncompressedBytes) {
    const digest = bytesToHex(await subtle.digest('SHA-256', shardBytes));
    if (digest !== monthEntry.uncompressedSha256) throw new Error('MARS geometry shard failed its uncompressed SHA-256 integrity check');
    try {
      parsed = JSON.parse(new TextDecoder().decode(shardBytes));
    } catch {
      throw new Error('MARS geometry shard could not be parsed');
    }
  } else {
    throw new Error('MARS geometry shard failed its integrity check');
  }
  return { manifest, collection: parseFeatureCollection(parsed, month, monthEntry.featureCount) };
}
