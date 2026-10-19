import { transparencySummaryPayload, TransparencyRecord, type AuditResult, type TransparencyRecord as RecordType } from '@methane/shared';
import { canonicalJson, sha256Hex } from './report-export';

export async function makeTransparencyRecord(audit: AuditResult): Promise<RecordType | null> {
  const summary = transparencySummaryPayload(audit);
  return summary ? { summary, summaryHash: await sha256Hex(canonicalJson(summary)) } : null;
}
export async function verifyTransparencyRecord(value: unknown): Promise<'valid' | 'invalid' | 'unavailable'> {
  const parsed = TransparencyRecord.safeParse(value);
  if (!parsed.success) return 'invalid';
  try { return await sha256Hex(canonicalJson(parsed.data.summary)) === parsed.data.summaryHash ? 'valid' : 'invalid'; }
  catch { return 'unavailable'; }
}
export function downloadTransparencyRecord(record: RecordType) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `methane-transparency-${record.summary.auditId}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function fetchTransparencyRecord(base: string, auditId: string, signal?: AbortSignal): Promise<RecordType> {
  const response = await fetch(`${base}/api/transparency/${encodeURIComponent(auditId)}`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Current public summary could not be checked. Refresh before sharing or withdrawing.');
  const record = TransparencyRecord.parse(await response.json());
  if (record.summary.auditId !== auditId || await verifyTransparencyRecord(record) !== 'valid' || !record.publication) throw new Error('Current public summary verification failed.');
  return record;
}
