import type { AuditInput } from '@methane/shared';

/** Curated, real historical MARS cases exposed by the public hackathon preview. */
export const PUBLIC_PREVIEW_SOURCE_IDS = Object.freeze([
  'KAZ_S_159',
  'LBY_S_143',
  'CAN_S_002',
] as const);

const allowedSourceIds: ReadonlySet<string> = new Set(PUBLIC_PREVIEW_SOURCE_IDS);

/** Keep anonymous writes small, source-bound, and free of recipient/private scope data. */
export function isPublicPreviewAuditAllowed(input: AuditInput): boolean {
  return allowedSourceIds.has(input.sourceId)
    && input.claimType !== 'operator_notified'
    && !input.scope?.recipient;
}
