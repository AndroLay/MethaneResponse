import type { ClaimType } from '@methane/shared';

export type PreparedDocument = {
  id: string;
  title: string;
  text: string;
  sourceUrl?: string;
  originalFileSha256: string;
  rightsDeclared: 'owned' | 'explicit_permission';
  selectedPages: { page: number; textSha256: string }[];
};

const sha256Pattern = /^[a-f0-9]{64}$/;
export const PREPARED_EVIDENCE_MAX_BYTES = 256_000;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

async function sha256Text(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Bytes(value: Uint8Array) {
  // WebCrypto's DOM types require an ArrayBuffer-backed BufferSource. Copying
  // also keeps this helper safe if a caller ever passes a SharedArrayBuffer view.
  const input = new ArrayBuffer(value.byteLength);
  new Uint8Array(input).set(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function validHttpsWithoutCredentials(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function validatePreparedEvidence(
  value: unknown,
  expectedSource: string,
  expectedClaim: ClaimType,
): Promise<PreparedDocument> {
  if (!isRecord(value) || !isRecord(value.apiPayload) || !isRecord(value.localManifest)) {
    throw new Error('Not a MethaneResponse prepared-evidence file');
  }
  const payload = value.apiPayload;
  const manifest = value.localManifest;
  if (manifest.formatVersion !== 1) throw new Error('Unsupported prepared evidence format version');
  if (payload.sourceId !== expectedSource || payload.claimType !== expectedClaim) {
    throw new Error('Evidence source or claim does not match the active investigation');
  }
  if (!Array.isArray(payload.documents) || payload.documents.length !== 1 || !isRecord(payload.documents[0])) {
    throw new Error('Exactly one prepared document is required');
  }
  const document = payload.documents[0];
  if (typeof document.id !== 'string' || !/^[a-zA-Z0-9:_-]{1,64}$/.test(document.id)
    || typeof document.title !== 'string' || document.title.length < 1 || document.title.length > 160
    || typeof document.text !== 'string' || document.text.length < 80 || document.text.length > 8_000) {
    throw new Error('Prepared document fields are invalid');
  }
  if (document.sourceUrl !== undefined && !validHttpsWithoutCredentials(document.sourceUrl)) {
    throw new Error('Source URL must be HTTPS without credentials');
  }
  if (typeof document.originalFileSha256 !== 'string' || !sha256Pattern.test(document.originalFileSha256)
    || manifest.documentSha256 !== document.originalFileSha256) {
    throw new Error('Original-file digest metadata does not match');
  }
  if (manifest.extractedTextSha256 !== await sha256Text(document.text)) {
    throw new Error('Extracted text checksum mismatch: file may be modified');
  }
  if (document.rightsDeclared !== 'owned' && document.rightsDeclared !== 'explicit_permission') {
    throw new Error('Document has no processing rights declaration');
  }
  if (manifest.rightsStatus !== document.rightsDeclared || manifest.sourceUrl !== document.sourceUrl) {
    throw new Error('Document license or origin metadata mismatch');
  }
  if (!Array.isArray(document.selectedPages) || document.selectedPages.length < 1 || document.selectedPages.length > 40
    || !Array.isArray(manifest.selectedPages) || manifest.selectedPages.length !== document.selectedPages.length) {
    throw new Error('Missing prepared page hashes');
  }

  const selectedPages: PreparedDocument['selectedPages'] = [];
  const encodedText = new TextEncoder().encode(document.text);
  let previousEnd = -1;
  for (let index = 0; index < document.selectedPages.length; index++) {
    const page = document.selectedPages[index];
    const recordedPage = manifest.selectedPages[index];
    if (!isRecord(page) || !isRecord(recordedPage) || !Number.isSafeInteger(page.page)
      || Number(page.page) < 1 || Number(page.page) > 250
      || !sha256Pattern.test(String(page.textSha256))
      || page.page !== recordedPage.page || page.textSha256 !== recordedPage.textSha256) {
      throw new Error('Selected page metadata mismatch');
    }
    const startByte = recordedPage.excerptStartByte;
    const lengthBytes = recordedPage.excerptLengthBytes;
    if (!Number.isSafeInteger(startByte) || !Number.isSafeInteger(lengthBytes)
      || Number(startByte) < 0 || Number(lengthBytes) < 1
      || Number(startByte) < previousEnd || Number(startByte) + Number(lengthBytes) > encodedText.byteLength) {
      throw new Error('Selected page excerpt range is invalid');
    }
    const excerptDigest = await sha256Bytes(encodedText.subarray(Number(startByte), Number(startByte) + Number(lengthBytes)));
    if (excerptDigest !== page.textSha256) throw new Error('Selected-page excerpt hash mismatch');
    previousEnd = Number(startByte) + Number(lengthBytes);
    const pageNumber = Number(page.page);
    if (selectedPages.length && pageNumber <= selectedPages[selectedPages.length - 1].page) {
      throw new Error('Selected pages must be unique and ordered');
    }
    selectedPages.push({ page: pageNumber, textSha256: String(page.textSha256) });
  }

  return {
    id: document.id,
    title: document.title,
    text: document.text,
    ...(typeof document.sourceUrl === 'string' ? { sourceUrl: document.sourceUrl } : {}),
    originalFileSha256: document.originalFileSha256,
    rightsDeclared: document.rightsDeclared,
    selectedPages,
  };
}

export async function readPreparedEvidenceFile(
  file: Pick<File, 'name' | 'size' | 'text'>,
  expectedSource: string,
  expectedClaim: ClaimType,
): Promise<PreparedDocument> {
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Only prepared JSON evidence files are accepted');
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > PREPARED_EVIDENCE_MAX_BYTES) {
    throw new Error('Prepared JSON evidence must be between 1 byte and 256 KB');
  }
  const raw = await file.text();
  if (new TextEncoder().encode(raw).byteLength > PREPARED_EVIDENCE_MAX_BYTES) {
    throw new Error('Prepared JSON evidence must be between 1 byte and 256 KB');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Prepared evidence file must contain valid JSON');
  }
  return validatePreparedEvidence(parsed, expectedSource, expectedClaim);
}
