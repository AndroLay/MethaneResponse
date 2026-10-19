/** A pointer's syntax is checked here; its contents and authenticity are not. */
export function isSecureEvidenceReference(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000 || value !== value.trim() || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

/** Strict calendar day in UTC. MARS timestamps without an offset are interpreted as UTC. */
export function evidenceUtcDay(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return undefined;
  const day = match[1];
  const midnight = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day) return undefined;
  if (!match[2]) return day;
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return undefined;
  const timestamp = Date.parse(`${day}T${match[2]}:${match[3]}:${match[4]}${match[5] || ''}${match[6] || 'Z'}`);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : undefined;
}

/** DEMO fixtures can use local pointers. Real evidence must use a secure web pointer. */
export function hasEvidencePointer(value: unknown, synthetic: boolean): boolean {
  return isSecureEvidenceReference(value) || (synthetic === true && typeof value === 'string'
    && value.length <= 2000 && /^fixture:\/\/[a-zA-Z0-9][a-zA-Z0-9/_:.-]*$/.test(value));
}
