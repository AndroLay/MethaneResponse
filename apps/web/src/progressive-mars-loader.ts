import type { MarsObservation, MarsSnapshot, MarsSource } from './mars';
import type { MarsSnapshotManifest } from './mars-snapshot-integrity';

const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_CATALOG_BYTES = 8 * 1024 * 1024;
const MAX_BUCKET_BYTES = 5 * 1024 * 1024;

export type ProgressiveCatalogSource = Omit<MarsSource, 'observations'> & { observationDates: string[]; historyBucketId: string };
export type ProgressiveMarsCatalog = Omit<MarsSnapshot, 'sources' | 'unlinkedObservations'> & {
  sources: ProgressiveCatalogSource[];
  unlinkedObservations: [];
  unlinkedObservationCount: number;
  observationsByYear: Record<string, number>;
};

export type ProgressiveArtifactManifestEntry = {
  id?: string;
  file: string;
  sourceCount?: number;
  linkedObservationCount?: number;
  unlinkedObservationCount?: number;
  compressedSha256: string;
  decodedSha256: string;
  compressedBytes: number;
  decodedBytes: number;
};

export type ProgressiveMarsManifest = {
  schemaVersion: 1;
  datasetSnapshotId: string;
  sourceArchiveSha256: string;
  inputFileSha256: string;
  decodedContentSha256: string;
  sourceCount: number;
  plumeCount: number;
  linkedObservationCount: number;
  unlinkedObservationCount: number;
  observationsByYear: Record<string, number>;
  bucketAlgorithm: 'sha256-first-byte-modulo';
  bucketCount: number;
  catalog: ProgressiveArtifactManifestEntry & { sourceCount: number; unlinkedObservationCount: number };
  buckets: Array<ProgressiveArtifactManifestEntry & {
    id: string;
    sourceCount: number;
    linkedObservationCount: number;
    unlinkedObservationCount: number;
  }>;
};

export type ProgressiveObservationBucket = {
  sources: Map<string, MarsObservation[]>;
  unlinkedObservations: MarsObservation[];
  counts: { sources: number; linkedPlumes: number; unlinkedPlumes: number; plumes: number };
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type ArtifactHashes = {
  file?: string;
  id?: string;
  sourceCount?: number;
  linkedObservationCount?: number;
  unlinkedObservationCount?: number;
  compressedSha256: string;
  decodedSha256: string;
  compressedBytes: number;
  decodedBytes: number;
};
type RecordObject = Record<string, unknown>;

function isRecord(value: unknown): value is RecordObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function error(message: string): Error {
  return new Error(`MARS progressive data: ${message}`);
}

function validateArtifactHashes(value: unknown, byteLimit: number): value is ArtifactHashes {
  if (!isRecord(value)) return false;
  return typeof value.compressedSha256 === 'string' && SHA256.test(value.compressedSha256)
    && typeof value.decodedSha256 === 'string' && SHA256.test(value.decodedSha256)
    && isCount(value.compressedBytes) && Number(value.compressedBytes) > 0 && Number(value.compressedBytes) <= byteLimit
    && isCount(value.decodedBytes) && Number(value.decodedBytes) > 0 && Number(value.decodedBytes) <= byteLimit;
}

function isYearCounts(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([year, count]) => /^\d{4}$/.test(year) && isCount(count));
}

function validateProgressiveManifest(value: unknown, fullManifest: MarsSnapshotManifest): ProgressiveMarsManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || value.bucketAlgorithm !== 'sha256-first-byte-modulo') {
    throw error('manifest schema is invalid.');
  }
  if (value.datasetSnapshotId !== fullManifest.datasetSnapshotId
    || value.sourceArchiveSha256 !== fullManifest.sourceArchiveSha256
    || value.inputFileSha256 !== fullManifest.inputFileSha256
    || value.decodedContentSha256 !== fullManifest.decodedContentSha256
    || value.sourceCount !== fullManifest.sourceCount
    || value.plumeCount !== fullManifest.plumeCount) {
    throw error('full snapshot binding does not match.');
  }
  if (!Number.isSafeInteger(value.bucketCount) || Number(value.bucketCount) < 1 || Number(value.bucketCount) > 256
    || !isCount(value.sourceCount) || !isCount(value.plumeCount)
    || !isCount(value.linkedObservationCount) || !isCount(value.unlinkedObservationCount)
    || Number(value.linkedObservationCount) + Number(value.unlinkedObservationCount) !== Number(value.plumeCount)
    || !isYearCounts(value.observationsByYear)
    || Object.values(value.observationsByYear).reduce((sum, count) => sum + count, 0) !== Number(value.plumeCount)) {
    throw error('manifest counts are invalid.');
  }
  if (!validateArtifactHashes(value.catalog, MAX_CATALOG_BYTES)
    || value.catalog.file !== 'mars-source-catalog.json.gz'
    || value.catalog.sourceCount !== value.sourceCount
    || value.catalog.unlinkedObservationCount !== value.unlinkedObservationCount) {
    throw error('catalog descriptor is invalid.');
  }
  if (!Array.isArray(value.buckets) || value.buckets.length !== value.bucketCount) {
    throw error('bucket manifest does not match the declared bucket count.');
  }

  const expectedIds = Array.from({ length: Number(value.bucketCount) }, (_, index) => `${index}`.padStart(3, '0'));
  const seenIds = new Set<string>();
  let linkedCount = 0;
  let unlinkedCount = 0;
  for (const bucket of value.buckets) {
    if (!isRecord(bucket) || typeof bucket.id !== 'string' || !expectedIds.includes(bucket.id)
      || seenIds.has(bucket.id) || bucket.file !== `mars-observation-buckets/${bucket.id}.json.gz`
      || !validateArtifactHashes(bucket, MAX_BUCKET_BYTES)
      || !isCount(bucket.sourceCount) || !isCount(bucket.linkedObservationCount)
      || !isCount(bucket.unlinkedObservationCount)) {
      throw error('bucket descriptor is invalid.');
    }
    seenIds.add(bucket.id);
    linkedCount += Number(bucket.linkedObservationCount);
    unlinkedCount += Number(bucket.unlinkedObservationCount);
  }
  if (seenIds.size !== expectedIds.length || linkedCount !== value.linkedObservationCount || unlinkedCount !== value.unlinkedObservationCount) {
    throw error('bucket row totals do not match the manifest.');
  }
  return value as unknown as ProgressiveMarsManifest;
}

async function readBoundedStream(stream: ReadableStream<Uint8Array> | null, maximumBytes: number): Promise<Uint8Array> {
  if (!stream) throw error('response body is missing.');
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw error('response exceeds its declared size limit.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function readResponse(response: Response, maximumBytes: number): Promise<Uint8Array> {
  if (!response.ok) throw error(`asset request failed (${response.status}).`);
  const headerSize = response.headers.get('content-length');
  if (headerSize !== null) {
    const size = Number(headerSize);
    if (!Number.isSafeInteger(size) || size < 0 || size > maximumBytes) throw error('response exceeds its declared size limit.');
  }
  return readBoundedStream(response.body, maximumBytes);
}

async function digest(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw error('Web Crypto SHA-256 is unavailable.');
  const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const result = await globalThis.crypto.subtle.digest('SHA-256', exactBuffer);
  return Array.from(new Uint8Array(result), item => item.toString(16).padStart(2, '0')).join('');
}

async function decodeArtifact(bytes: Uint8Array, expected: ArtifactHashes): Promise<Uint8Array> {
  const receivedDigest = await digest(bytes);
  if (bytes.byteLength === expected.decodedBytes && receivedDigest === expected.decodedSha256) return bytes;
  if (bytes.byteLength !== expected.compressedBytes || receivedDigest !== expected.compressedSha256) {
    throw error('asset digest or byte count does not match its manifest.');
  }
  if (typeof DecompressionStream === 'undefined') throw error('this browser cannot decompress a verified history bucket.');
  try {
    const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const decompressed = new Blob([exactBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    const decoded = await readBoundedStream(decompressed, expected.decodedBytes);
    if (decoded.byteLength !== expected.decodedBytes || await digest(decoded) !== expected.decodedSha256) {
      throw error('decoded asset digest or byte count does not match its manifest.');
    }
    return decoded;
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('MARS progressive data:')) throw cause;
    throw error('verified gzip asset could not be decompressed.');
  }
}

async function fetchJsonArtifact(fetcher: Fetcher, url: string, expected: ArtifactHashes, maximumBytes: number, signal?: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { cache: 'force-cache', signal });
  const raw = await readResponse(response, Math.min(maximumBytes, Math.max(expected.compressedBytes, expected.decodedBytes)));
  const decoded = await decodeArtifact(raw, expected);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded));
  } catch {
    throw error('verified asset is not valid UTF-8 JSON.');
  }
}

function validUtcDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const milliseconds = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === value;
}

function validateCatalog(value: unknown, manifest: ProgressiveMarsManifest): ProgressiveMarsCatalog {
  if (!isRecord(value) || value.dataset !== 'UNEP MARS' || value.schemaVersion !== 1
    || value.snapshotId !== manifest.datasetSnapshotId || !isRecord(value.provenance)
    || value.provenance.archiveSha256 !== manifest.sourceArchiveSha256
    || !isCount(value.plumeCount) || value.plumeCount !== manifest.plumeCount
    || !isCount(value.unlinkedObservationCount) || value.unlinkedObservationCount !== manifest.unlinkedObservationCount
    || !Array.isArray(value.unlinkedObservations) || value.unlinkedObservations.length !== 0
    || !Array.isArray(value.sources) || value.sources.length !== manifest.sourceCount
    || !isYearCounts(value.observationsByYear)
    || JSON.stringify(value.observationsByYear) !== JSON.stringify(manifest.observationsByYear)) {
    throw error('catalog metadata or counts are invalid.');
  }
  if (!isRecord(value.counts)
    || value.counts.plumes !== manifest.plumeCount
    || value.counts.linkedPlumes !== manifest.linkedObservationCount
    || value.counts.unlinkedPlumes !== manifest.unlinkedObservationCount) {
    throw error('catalog dataset counts do not match the manifest.');
  }

  const seenSources = new Set<string>();
  let totalLinkedCount = 0;
  for (const source of value.sources) {
    if (!isRecord(source) || typeof source.sourceId !== 'string' || !source.sourceId || seenSources.has(source.sourceId)
      || source.synthetic !== false || typeof source.lat !== 'number' || !Number.isFinite(source.lat)
      || Math.abs(source.lat) > 90 || typeof source.lon !== 'number' || !Number.isFinite(source.lon)
      || Math.abs(source.lon) > 180 || !isCount(source.plumeCount)
      || typeof source.historyBucketId !== 'string' || !/^\d{3}$/.test(source.historyBucketId)
      || Number(source.historyBucketId) >= manifest.bucketCount
      || !Array.isArray(source.observationDates) || !source.observationDates.every(validUtcDate)) {
      throw error('catalog contains an invalid source record.');
    }
    const dates = source.observationDates as string[];
    if (dates.some((date, index) => index > 0 && dates[index - 1]! >= date)
      || (Number(source.plumeCount) === 0 && dates.length !== 0)
      || (Number(source.plumeCount) > 0 && dates.length === 0)) {
      throw error(`catalog observation summaries are invalid for ${source.sourceId}.`);
    }
    seenSources.add(source.sourceId);
    totalLinkedCount += Number(source.plumeCount);
  }
  if (totalLinkedCount !== manifest.linkedObservationCount) throw error('catalog source history counts do not match the manifest.');

  const provenance = { ...value.provenance, webSnapshotInputSha256: manifest.inputFileSha256 };
  return { ...value, provenance } as unknown as ProgressiveMarsCatalog;
}

export async function loadVerifiedProgressiveCatalog(
  fetcher: Fetcher,
  basePath: string,
  fullManifest: MarsSnapshotManifest,
  signal?: AbortSignal,
): Promise<{ catalog: ProgressiveMarsCatalog; manifest: ProgressiveMarsManifest }> {
  const base = basePath.replace(/\/$/, '');
  const manifestResponse = await fetcher(`${base}/mars-progressive-manifest.json`, { cache: 'no-cache', signal });
  const manifestBytes = await readResponse(manifestResponse, MAX_MANIFEST_BYTES);
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
  } catch {
    throw error('manifest is not valid UTF-8 JSON.');
  }
  const manifest = validateProgressiveManifest(manifestValue, fullManifest);
  const catalog = await fetchJsonArtifact(
    fetcher,
    `${base}/${manifest.catalog.file}`,
    manifest.catalog,
    MAX_CATALOG_BYTES,
    signal,
  );
  return { catalog: validateCatalog(catalog, manifest), manifest };
}

export async function bucketIdForRecordId(recordId: string, bucketCount: number): Promise<string> {
  if (!recordId || !Number.isSafeInteger(bucketCount) || bucketCount < 1 || bucketCount > 256) {
    throw error('cannot route a record to an invalid history bucket.');
  }
  const idHash = await digest(new TextEncoder().encode(recordId));
  const firstByte = Number.parseInt(idHash.slice(0, 2), 16);
  return `${firstByte % bucketCount}`.padStart(3, '0');
}

export async function loadVerifiedObservationBucket(
  fetcher: Fetcher,
  basePath: string,
  fullManifest: MarsSnapshotManifest,
  manifestInput: ProgressiveMarsManifest,
  catalog: ProgressiveMarsCatalog,
  bucketId: string,
  signal?: AbortSignal,
): Promise<ProgressiveObservationBucket> {
  const manifest = validateProgressiveManifest(manifestInput, fullManifest);
  const entry = manifest.buckets.find(bucket => bucket.id === bucketId);
  if (!entry) throw error('requested history bucket is not declared by the manifest.');
  const base = basePath.replace(/\/$/, '');
  const payload = await fetchJsonArtifact(fetcher, `${base}/${entry.file}`, entry, MAX_BUCKET_BYTES, signal);
  if (!isRecord(payload) || payload.dataset !== 'UNEP MARS' || payload.schemaVersion !== 1
    || payload.snapshotId !== manifest.datasetSnapshotId || payload.sourceArchiveSha256 !== manifest.sourceArchiveSha256
    || payload.bucketId !== bucketId || !Array.isArray(payload.sources) || !Array.isArray(payload.unlinkedObservations)
    || !isRecord(payload.counts)) {
    throw error('history bucket metadata is invalid.');
  }

  const sourcesById = new Map(catalog.sources.map(source => [source.sourceId, source]));
  const loadedSources = new Map<string, MarsObservation[]>();
  const expectedSources = catalog.sources.filter(source => Number(source.plumeCount) > 0 && source.historyBucketId === bucketId);
  if (expectedSources.length !== entry.sourceCount) throw error('bucket source count does not match the catalog.');
  const seenIds = new Set<string>();
  let linkedCount = 0;
  for (const sourceHistory of payload.sources) {
    if (!isRecord(sourceHistory) || typeof sourceHistory.sourceId !== 'string' || !Array.isArray(sourceHistory.observations)) {
      throw error('history bucket has a malformed source entry.');
    }
    const sourceId = sourceHistory.sourceId;
    const catalogSource = sourcesById.get(sourceId);
    if (!catalogSource || loadedSources.has(sourceId) || catalogSource.historyBucketId !== bucketId
      || await bucketIdForRecordId(sourceId, manifest.bucketCount) !== bucketId) {
      throw error(`history bucket has a foreign or duplicate source ${sourceId}.`);
    }
    const observations = sourceHistory.observations as unknown[];
    if (observations.length !== catalogSource.plumeCount) throw error(`catalog history count does not match for ${sourceId}.`);
    const dates: string[] = [];
    for (const value of observations) {
      if (!isRecord(value) || typeof value.id !== 'string' || !value.id || seenIds.has(value.id)
        || value.sourceId !== sourceId || value.linkStatus !== 'linked' || typeof value.date !== 'string') {
        throw error(`history bucket contains an invalid observation for ${sourceId}.`);
      }
      seenIds.add(value.id);
      linkedCount += 1;
      dates.push(value.date.slice(0, 10));
    }
    if (observations.some((value, index) => index > 0 && (() => {
      const prior = observations[index - 1] as RecordObject;
      const current = value as RecordObject;
      return `${String(prior.date)}\u0000${String(prior.id)}` > `${String(current.date)}\u0000${String(current.id)}`;
    })())) {
      throw error(`history order is invalid for ${sourceId}.`);
    }
    const uniqueDates = [...new Set(dates)].sort();
    if (JSON.stringify(uniqueDates) !== JSON.stringify(catalogSource.observationDates)) {
      throw error(`catalog observation dates do not match for ${sourceId}.`);
    }
    loadedSources.set(sourceId, observations as MarsObservation[]);
  }

  for (const source of expectedSources) {
    if (!loadedSources.has(source.sourceId)) {
      throw error(`history bucket omits catalog source ${source.sourceId}.`);
    }
  }

  const unlinkedObservations: MarsObservation[] = [];
  for (const value of payload.unlinkedObservations) {
    if (!isRecord(value) || typeof value.id !== 'string' || !value.id || seenIds.has(value.id)
      || value.linkStatus === 'linked' || typeof value.date !== 'string'
      || await bucketIdForRecordId(value.id, manifest.bucketCount) !== bucketId) {
      throw error('history bucket contains an invalid unresolved observation.');
    }
    if (value.linkStatus === 'source_id_missing') {
      if (value.sourceId !== null && value.sourceId !== undefined) throw error('source-ID-missing observation has an inferred source link.');
    } else if (value.linkStatus === 'source_record_missing') {
      if (typeof value.sourceId !== 'string' || sourcesById.has(value.sourceId)) throw error('unresolved source link is invalid.');
    } else {
      throw error('history bucket contains an unsupported unresolved-link status.');
    }
    seenIds.add(value.id);
    unlinkedObservations.push(value as unknown as MarsObservation);
  }
  const entryLinked = entry.linkedObservationCount;
  const entryUnlinked = entry.unlinkedObservationCount;
  if (!isCount(payload.counts.sources) || payload.counts.sources !== payload.sources.length
    || !isCount(payload.counts.linkedPlumes) || payload.counts.linkedPlumes !== linkedCount || linkedCount !== entryLinked
    || !isCount(payload.counts.unlinkedPlumes) || payload.counts.unlinkedPlumes !== unlinkedObservations.length || unlinkedObservations.length !== entryUnlinked
    || !isCount(payload.counts.plumes) || payload.counts.plumes !== linkedCount + unlinkedObservations.length) {
    throw error('bucket row counts do not match its manifest.');
  }
  if (payload.sources.length !== entry.sourceCount) throw error('bucket source count does not match its manifest.');

  return {
    sources: loadedSources,
    unlinkedObservations,
    counts: {
      sources: Number(payload.counts.sources),
      linkedPlumes: linkedCount,
      unlinkedPlumes: unlinkedObservations.length,
      plumes: linkedCount + unlinkedObservations.length,
    },
  };
}
