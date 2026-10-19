import { evidenceUtcDay, type AuditScope } from '@methane/shared';

type ScopeDraft = { startDate: string; endDate: string; observationId: string; recipient: string };
export const scopeDraftSchema = {
  safeParse(value: unknown): { success: true; data: ScopeDraft } | { success: false } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { success: false };
    const record = value as Record<string, unknown>;
    const { startDate, endDate, observationId, recipient } = record;
    if (typeof startDate !== 'string' || startDate.length > 10 || typeof endDate !== 'string' || endDate.length > 10
      || typeof observationId !== 'string' || observationId.length > 128 || typeof recipient !== 'string' || recipient.length > 160) return { success: false };
    return { success: true, data: { startDate, endDate, observationId, recipient } };
  },
};

export function observationPeriod(events: { id: string; date: string }[]) {
  const days = events.map(event => evidenceUtcDay(event.date)).filter((day): day is string => Boolean(day)).sort();
  return days.length ? { startDate: days[0]!, endDate: days[days.length - 1]!, count: days.length } : undefined;
}

export function scopeDraftChanged(scope: AuditScope | undefined, draft: { startDate: string; endDate: string; observationId: string; recipient: string }): boolean {
  return draft.startDate !== (scope?.startDate || '') || draft.endDate !== (scope?.endDate || '')
    || draft.observationId !== (scope?.observationId || '') || draft.recipient.trim() !== (scope?.recipient || '');
}
