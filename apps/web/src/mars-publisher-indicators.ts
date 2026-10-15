export type MarsTop50Row = {
  publisherRowOrder: number;
  country: string;
  sector: string | null;
  potentialSourceType: string | null;
  sourceId: string;
  latitude: number;
  longitude: number;
  plumesDetectedSince2024: number | null;
  publisherNotificationFlag: boolean | null;
  publisherFeedbackFlag: boolean | null;
  averageHalfYearFluxRateTHr: number | null;
  averageHalfYearFluxStdDevTHr: number | null;
  averageAnnualFluxRateTHr: number | null;
  averageAnnualFluxStdDevTHr: number | null;
  lastPlumeDate: string | null;
  halfYearPersistencyCategory: string | null;
  halfYearEmissionPersistency: number | null;
  halfYearPersistencyStdDev: number | null;
  annualPersistencyCategory: string | null;
  annualEmissionPersistency: number | null;
  annualPersistencyStdDev: number | null;
  estimatedHalfYearMethaneEmissionsT: number | null;
  estimatedAnnualMethaneEmissionsT: number | null;
};

export type MarsTop50Snapshot = {
  period: string;
  sourceFile: string;
  rowCount: number;
  matchedSourceCount: number;
  unmatchedSourceIds: string[];
  rows: MarsTop50Row[];
};

export type MarsResponseRateRow = {
  country: string;
  notifiedSourceCount: number | null;
  notifiedWithFeedbackCount: number | null;
  publishedResponseRatePercent: number | null;
};

export type MarsResponseRateSnapshot = {
  periodStart: string;
  periodEnd: string;
  sourceFile: string;
  rowCount: number;
  rows: MarsResponseRateRow[];
};

export type MarsPublisherIndicators = {
  schemaVersion: 1;
  datasetId: 'unep-mars-publisher-indicators';
  generatedBy: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  marsSnapshotId: string;
  marsSnapshotArchiveSha256: string;
  marsSourceCount: number;
  marsSnapshotProvenance: Record<string, unknown> & { archiveSha256: string };
  top50Snapshots: MarsTop50Snapshot[];
  responseRateSnapshots: MarsResponseRateSnapshot[];
  mitigationSnapshotReference: {
    title: string;
    period: string;
    publisherUrl: string;
    publisherHandle: string;
    license: string;
    checkedAt: string;
    handling: string;
  };
  provenance: {
    top50: Record<string, unknown> & { archiveSha256: string };
    responseRates: Record<string, unknown> & { archiveSha256: string };
    [key: string]: unknown;
  };
  limitations: string[];
};

export type MarsPublisherIndicatorsManifest = {
  schemaVersion: 1;
  datasetId: 'unep-mars-publisher-indicators';
  dataFile: string;
  dataFileSha256: string;
  dataFileBytes: number;
  marsSnapshotId: string;
  marsSnapshotArchiveSha256: string;
  top50ReleaseCount: number;
  top50RowCount: number;
  responseRateReleaseCount: number;
  responseRateRowCount: number;
  top50ArchiveSha256: string;
  responseRatesArchiveSha256: string;
};

const SHA256 = /^[a-f\d]{64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isNullableFinite(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isManifest(value: unknown): value is MarsPublisherIndicatorsManifest {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 1
    && value.datasetId === 'unep-mars-publisher-indicators'
    && typeof value.dataFile === 'string' && value.dataFile === 'mars-publisher-indicators.json'
    && typeof value.dataFileSha256 === 'string' && SHA256.test(value.dataFileSha256)
    && isCount(value.dataFileBytes)
    && typeof value.marsSnapshotId === 'string' && value.marsSnapshotId.length > 0
    && typeof value.marsSnapshotArchiveSha256 === 'string' && SHA256.test(value.marsSnapshotArchiveSha256)
    && isCount(value.top50ReleaseCount) && isCount(value.top50RowCount)
    && isCount(value.responseRateReleaseCount) && isCount(value.responseRateRowCount)
    && typeof value.top50ArchiveSha256 === 'string' && SHA256.test(value.top50ArchiveSha256)
    && typeof value.responseRatesArchiveSha256 === 'string' && SHA256.test(value.responseRatesArchiveSha256);
}

function validateTop50(release: unknown, periodSet: Set<string>): asserts release is MarsTop50Snapshot {
  if (!isRecord(release) || typeof release.period !== 'string' || !/^\d{4}-\d{2}$/.test(release.period)
    || periodSet.has(release.period) || typeof release.sourceFile !== 'string'
    || !isCount(release.rowCount) || !isCount(release.matchedSourceCount)
    || !Array.isArray(release.unmatchedSourceIds) || !release.unmatchedSourceIds.every(id => typeof id === 'string')
    || !Array.isArray(release.rows) || release.rowCount !== release.rows.length
    || release.matchedSourceCount + release.unmatchedSourceIds.length !== release.rowCount) {
    throw new Error('UNEP MARS Top 50 release structure is invalid');
  }
  periodSet.add(release.period);
  const ids = new Set<string>();
  for (const [index, value] of release.rows.entries()) {
    if (!isRecord(value) || !Number.isSafeInteger(value.publisherRowOrder) || value.publisherRowOrder !== index + 1
      || typeof value.sourceId !== 'string' || !value.sourceId.trim() || ids.has(value.sourceId)
      || typeof value.country !== 'string' || !value.country.trim()
      || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90
      || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
      throw new Error('UNEP MARS Top 50 row has an invalid or duplicate source identifier/coordinate');
    }
    ids.add(value.sourceId);
    const numeric = [
      value.plumesDetectedSince2024, value.averageHalfYearFluxRateTHr, value.averageHalfYearFluxStdDevTHr,
      value.averageAnnualFluxRateTHr, value.averageAnnualFluxStdDevTHr, value.halfYearEmissionPersistency,
      value.halfYearPersistencyStdDev, value.annualEmissionPersistency, value.annualPersistencyStdDev,
      value.estimatedHalfYearMethaneEmissionsT, value.estimatedAnnualMethaneEmissionsT,
    ];
    if (!numeric.every(isNullableFinite)
      || [value.plumesDetectedSince2024, value.averageHalfYearFluxRateTHr, value.averageHalfYearFluxStdDevTHr,
        value.averageAnnualFluxRateTHr, value.averageAnnualFluxStdDevTHr, value.halfYearPersistencyStdDev,
        value.annualPersistencyStdDev, value.estimatedHalfYearMethaneEmissionsT, value.estimatedAnnualMethaneEmissionsT]
        .some(item => typeof item === 'number' && item < 0)
      || [value.halfYearEmissionPersistency, value.annualEmissionPersistency]
        .some(item => typeof item === 'number' && (item < 0 || item > 1))) {
      throw new Error('UNEP MARS Top 50 row contains a non-finite or out-of-range published value');
    }
    if (![null, true, false].includes(value.publisherNotificationFlag as null | boolean)
      || ![null, true, false].includes(value.publisherFeedbackFlag as null | boolean)) {
      throw new Error('UNEP MARS Top 50 notification/feedback field is invalid');
    }
  }
  if (ids.size !== release.rowCount) throw new Error('UNEP MARS Top 50 source IDs are duplicated');
}

function validateResponseSnapshot(snapshot: unknown, periods: Set<string>): asserts snapshot is MarsResponseRateSnapshot {
  if (!isRecord(snapshot) || typeof snapshot.periodStart !== 'string' || typeof snapshot.periodEnd !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.periodEnd)
    || snapshot.periodStart > snapshot.periodEnd || periods.has(`${snapshot.periodStart}:${snapshot.periodEnd}`)
    || typeof snapshot.sourceFile !== 'string' || !isCount(snapshot.rowCount)
    || !Array.isArray(snapshot.rows) || snapshot.rowCount !== snapshot.rows.length) {
    throw new Error('UNEP MARS country response-rate release structure is invalid');
  }
  periods.add(`${snapshot.periodStart}:${snapshot.periodEnd}`);
  const countries = new Set<string>();
  for (const value of snapshot.rows) {
    if (!isRecord(value) || typeof value.country !== 'string' || !value.country.trim() || countries.has(value.country)
      || !(value.notifiedSourceCount === null || isCount(value.notifiedSourceCount))
      || !(value.notifiedWithFeedbackCount === null || isCount(value.notifiedWithFeedbackCount))
      || !isNullableFinite(value.publishedResponseRatePercent)
      || (typeof value.publishedResponseRatePercent === 'number' && (value.publishedResponseRatePercent < 0 || value.publishedResponseRatePercent > 100))
      || (typeof value.notifiedSourceCount === 'number' && typeof value.notifiedWithFeedbackCount === 'number'
        && value.notifiedWithFeedbackCount > value.notifiedSourceCount)) {
      throw new Error('UNEP MARS country response-rate row is invalid');
    }
    countries.add(value.country);
  }
}

async function digestSha256(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable; publisher data will not be loaded.');
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Validate byte integrity, release counts, and all identifiers before exposing local publisher data. */
export async function verifyMarsPublisherIndicators(bytes: ArrayBuffer, manifestInput: unknown): Promise<MarsPublisherIndicators> {
  if (!isManifest(manifestInput)) throw new Error('UNEP MARS publisher-indicator manifest is invalid');
  const manifest = manifestInput;
  if (bytes.byteLength !== manifest.dataFileBytes) throw new Error('UNEP MARS publisher-indicator byte length does not match its manifest');
  const actualHash = await digestSha256(bytes);
  if (actualHash.toLowerCase() !== manifest.dataFileSha256.toLowerCase()) throw new Error('UNEP MARS publisher-indicator SHA-256 does not match its manifest');

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error('UNEP MARS publisher-indicator JSON is invalid');
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || parsed.datasetId !== manifest.datasetId
    || parsed.marsSnapshotId !== manifest.marsSnapshotId || !isCount(parsed.marsSourceCount)
    || !Array.isArray(parsed.top50Snapshots) || !Array.isArray(parsed.responseRateSnapshots)
    || !isRecord(parsed.mitigationSnapshotReference)
    || typeof parsed.mitigationSnapshotReference.title !== 'string'
    || typeof parsed.mitigationSnapshotReference.period !== 'string'
    || typeof parsed.mitigationSnapshotReference.publisherUrl !== 'string'
    || !parsed.mitigationSnapshotReference.publisherUrl.startsWith('https://')
    || typeof parsed.mitigationSnapshotReference.publisherHandle !== 'string'
    || typeof parsed.mitigationSnapshotReference.license !== 'string'
    || typeof parsed.mitigationSnapshotReference.checkedAt !== 'string'
    || typeof parsed.mitigationSnapshotReference.handling !== 'string'
    || !parsed.mitigationSnapshotReference.handling.includes('not downloaded')
    || typeof parsed.license !== 'string' || typeof parsed.attribution !== 'string'
    || !Array.isArray(parsed.limitations) || !parsed.limitations.every(item => typeof item === 'string')
    || !isRecord(parsed.marsSnapshotProvenance) || parsed.marsSnapshotProvenance.archiveSha256 !== manifest.marsSnapshotArchiveSha256
    || !isRecord(parsed.provenance) || !isRecord(parsed.provenance.top50) || !isRecord(parsed.provenance.responseRates)
    || parsed.provenance.top50.archiveSha256 !== manifest.top50ArchiveSha256
    || parsed.provenance.responseRates.archiveSha256 !== manifest.responseRatesArchiveSha256) {
    throw new Error('UNEP MARS publisher-indicator dataset identity/snapshot does not match its manifest');
  }
  const topPeriods = new Set<string>();
  for (const release of parsed.top50Snapshots) validateTop50(release, topPeriods);
  const responsePeriods = new Set<string>();
  for (const release of parsed.responseRateSnapshots) validateResponseSnapshot(release, responsePeriods);
  const topRows = parsed.top50Snapshots.reduce((total, release) => total + (release as MarsTop50Snapshot).rowCount, 0);
  const responseRows = parsed.responseRateSnapshots.reduce((total, release) => total + (release as MarsResponseRateSnapshot).rowCount, 0);
  if (parsed.top50Snapshots.length !== manifest.top50ReleaseCount || topRows !== manifest.top50RowCount
    || parsed.responseRateSnapshots.length !== manifest.responseRateReleaseCount || responseRows !== manifest.responseRateRowCount) {
    throw new Error('UNEP MARS publisher-indicator counts do not match its manifest');
  }
  return parsed as unknown as MarsPublisherIndicators;
}

export async function loadMarsPublisherIndicators(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<MarsPublisherIndicators> {
  const [manifestResponse, dataResponse] = await Promise.all([
    fetcher('/data/mars-publisher-indicators.manifest.json', { cache: 'force-cache', signal }),
    fetcher('/data/mars-publisher-indicators.json', { cache: 'force-cache', signal }),
  ]);
  if (!manifestResponse.ok || !dataResponse.ok) throw new Error('The local UNEP MARS publisher-indicator snapshot could not be loaded.');
  const [manifest, bytes] = await Promise.all([manifestResponse.json() as Promise<unknown>, dataResponse.arrayBuffer()]);
  return verifyMarsPublisherIndicators(bytes, manifest);
}

export type CountryResponseHistoryPoint = {
  periodStart: string;
  periodEnd: string;
  notifiedSourceCount: number | null;
  notifiedWithFeedbackCount: number | null;
  responseRatePercent: number | null;
};

export function getCountryResponseHistory(
  snapshots: readonly Pick<MarsResponseRateSnapshot, 'periodStart' | 'periodEnd' | 'rows'>[],
  country: string,
): CountryResponseHistoryPoint[] {
  return snapshots.flatMap(snapshot => {
    const row = snapshot.rows.find(item => item.country === country);
    return row ? [{
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      notifiedSourceCount: row.notifiedSourceCount,
      notifiedWithFeedbackCount: row.notifiedWithFeedbackCount,
      responseRatePercent: row.publishedResponseRatePercent,
    }] : [];
  }).sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

export function formatResponseCount(value: number | null): string {
  return value === null ? 'Not reported' : value.toLocaleString('en-US');
}

export function toResponseRateHistoryLabel(point: CountryResponseHistoryPoint): string {
  const period = `${point.periodStart} – ${point.periodEnd}`;
  return `${period}: ${point.responseRatePercent === null ? 'rate unavailable' : `${point.responseRatePercent}%`}; `
    + `${formatResponseCount(point.notifiedWithFeedbackCount)} of ${formatResponseCount(point.notifiedSourceCount)} notified sources with feedback`;
}

export function wasInPreviousTop50(sourceId: string, previousRows: readonly MarsTop50Row[]): boolean {
  return previousRows.some(row => row.sourceId === sourceId);
}
