type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validHttpsWithoutCredentials(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const OPEN_LICENSE_FIELDS = ['licenseName', 'licenseUrl', 'attribution', 'licenseScopeConfirmed'] as const;

/**
 * Validate the shape of rights declarations in a versioned audit bundle.
 * This checks recorded metadata only; it cannot establish legal permission,
 * document authenticity, or the applicability of the cited license.
 */
export function validateDocumentRightsMetadata(bundle: unknown): string | null {
  if (!isRecord(bundle)) return 'Audit bundle is malformed.';
  if (bundle.intelligence === undefined) return null;
  if (!isRecord(bundle.intelligence)) return 'Audit intelligence metadata is malformed.';

  const digests = bundle.intelligence.documentDigests;
  if (digests === undefined) return null;
  if (!Array.isArray(digests)) return 'Document digest metadata is malformed.';

  for (const [index, item] of digests.entries()) {
    if (!isRecord(item)) return `Document digest ${index + 1} is malformed.`;
    const hasOpenLicenseMetadata = OPEN_LICENSE_FIELDS.some((key) => item[key] !== undefined);
    const rightsDeclared = item.rightsDeclared;

    if (rightsDeclared === undefined) {
      if (hasOpenLicenseMetadata) return `Document digest ${index + 1} has open-license fields without a rights declaration.`;
      continue; // Historical v3 bundles did not always record rightsDeclared.
    }
    if (rightsDeclared === 'owned' || rightsDeclared === 'explicit_permission') {
      if (hasOpenLicenseMetadata) return `Document digest ${index + 1} has open-license fields with a different rights declaration.`;
      continue;
    }
    if (rightsDeclared !== 'open_license') return `Document digest ${index + 1} has an unsupported rights declaration.`;

    const licenseName = item.licenseName;
    const attribution = item.attribution;
    if (!validHttpsWithoutCredentials(item.sourceUrl)
      || typeof licenseName !== 'string' || licenseName.trim().length < 1 || licenseName.trim().length > 120
      || !validHttpsWithoutCredentials(item.licenseUrl)
      || typeof attribution !== 'string' || attribution.trim().length < 10 || attribution.trim().length > 500
      || item.licenseScopeConfirmed !== true) {
      return `Open-license declaration in document digest ${index + 1} is incomplete or invalid.`;
    }
  }

  return null;
}
