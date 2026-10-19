import type { AuditReceipt } from '@methane/shared';
export type AnchorIntentView = { auditId: string; bundleHash: string; txHash: string; state: 'pending' | 'confirmed' | 'reverted';
  chainId: number; registryAddress: string; issuer: string; expectedVersion: number; confirmations: number };
export type ReconcileResponse = { status: 'pending'; intent: AnchorIntentView } | {
  status: 'reconciled' | 'already_reconciled'; auditId: string; bundleHash?: string; receipt: AuditReceipt;
} | { status: 'reverted'; auditId: string; txHash: string };
export function anchorStateLabel(state: AnchorIntentView['state'] | undefined) {
  return state === 'pending' ? 'Pending — reconcile before another transaction'
    : state === 'reverted' ? 'Transaction reverted — audit remains unanchored'
      : state === 'confirmed' ? 'Receipt recorded — verify its current chain status' : 'No saved transaction intent';
}

export type AnchorTargetView = { chainId: number; registryAddress: string; issuer: string | null; confirmations: number; writeEnabled: boolean };
