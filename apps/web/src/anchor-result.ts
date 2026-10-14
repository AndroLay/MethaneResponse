import type { AuditReceipt, AuditResult } from '@methane/shared';

export type AnchorReceiptResponse = {
  status: 'anchored';
  auditId: string;
  bundleHash: string;
  receipt: AuditReceipt;
};
export type AnchorResponse = AuditResult | AnchorReceiptResponse;

function validSepoliaReceipt(receipt: AuditReceipt | undefined): receipt is AuditReceipt {
  return Boolean(receipt && receipt.chainId === 11155111
    && /^0x[a-fA-F0-9]{40}$/.test(receipt.registryAddress)
    && /^0x[a-fA-F0-9]{40}$/.test(receipt.issuer)
    && /^0x[a-fA-F0-9]{64}$/.test(receipt.txHash)
    && /^\d{1,19}$/.test(receipt.blockNumber));
}

/** Preserve a private report when an anchor-only reviewer receives a minimal receipt. */
export function mergeAnchorResponse(current: AuditResult, response: AnchorResponse): AuditResult {
  if ('status' in response) {
    if (response.status !== 'anchored' || response.auditId !== current.auditId
        || response.bundleHash.toLowerCase() !== current.bundleHash.toLowerCase()
        || !validSepoliaReceipt(response.receipt)) {
      throw new Error('Anchor receipt does not match the current audit');
    }
    return {
      ...current,
      anchored: true,
      chainTxHash: response.receipt.txHash,
      receipt: response.receipt,
    };
  }
  if (response.auditId !== current.auditId
      || response.bundleHash.toLowerCase() !== current.bundleHash.toLowerCase()
      || !response.anchored || !validSepoliaReceipt(response.receipt)
      || response.chainTxHash?.toLowerCase() !== response.receipt.txHash.toLowerCase()) {
    throw new Error('Anchor result does not match the current audit');
  }
  return response;
}
