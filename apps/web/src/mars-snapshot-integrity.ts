import { parseMarsGzip, type MarsSnapshot } from './mars';

export type MarsSnapshotManifest = {
  schemaVersion: 1;
  datasetSnapshotId: string;
  sourceArchiveSha256: string;
  inputFileSha256: string;
  decodedContentSha256: string;
  sourceCount: number;
  plumeCount: number;
};

const SHA256 = /^[a-f0-9]{64}$/i;

function isManifest(value: unknown): value is MarsSnapshotManifest {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const manifest = value as Record<string, unknown>;
  return manifest.schemaVersion === 1
    && typeof manifest.datasetSnapshotId === 'string' && manifest.datasetSnapshotId.length > 0
    && typeof manifest.sourceArchiveSha256 === 'string' && SHA256.test(manifest.sourceArchiveSha256)
    && typeof manifest.inputFileSha256 === 'string' && SHA256.test(manifest.inputFileSha256)
    && typeof manifest.decodedContentSha256 === 'string' && SHA256.test(manifest.decodedContentSha256)
    && Number.isSafeInteger(manifest.sourceCount) && Number(manifest.sourceCount) >= 0
    && Number.isSafeInteger(manifest.plumeCount) && Number(manifest.plumeCount) >= 0;
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Validate the fetched bytes and their version manifest before using map rows. */
export async function parseVerifiedMarsSnapshot(bytes: ArrayBuffer, manifestInput: unknown): Promise<MarsSnapshot> {
  if (!isManifest(manifestInput)) throw new Error('MARS snapshot manifest is invalid');
  const manifest = manifestInput;
  const receivedHash = await sha256(bytes);
  if (receivedHash.toLowerCase() !== manifest.inputFileSha256.toLowerCase()
    && receivedHash.toLowerCase() !== manifest.decodedContentSha256.toLowerCase()) {
    throw new Error('MARS snapshot content hash does not match its version manifest');
  }

  const snapshot = await parseMarsGzip(bytes);
  if (snapshot.snapshotId !== manifest.datasetSnapshotId) throw new Error('MARS snapshot ID does not match its version manifest');
  if (snapshot.provenance?.archiveSha256 !== manifest.sourceArchiveSha256) throw new Error('MARS source archive hash does not match its version manifest');
  if (snapshot.sources.length !== manifest.sourceCount || snapshot.plumeCount !== manifest.plumeCount) {
    throw new Error('MARS snapshot counts do not match its version manifest');
  }
  snapshot.provenance = { ...snapshot.provenance, webSnapshotInputSha256: manifest.inputFileSha256 };
  return snapshot;
}
