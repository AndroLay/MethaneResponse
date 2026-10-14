import { createPublicClient, createWalletClient, decodeEventLog, http, isAddress, keccak256, toBytes, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import type { AuditReceipt, ClaimType } from '@methane/shared';

const abi = [
  {
    type: 'function', name: 'anchor', stateMutability: 'nonpayable',
    inputs: [{ name: 'caseId', type: 'bytes32' }, { name: 'bundleHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function', name: 'receipts', stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'issuer', type: 'address' }, { name: 'bundleHash', type: 'bytes32' },
      { name: 'version', type: 'uint64' }, { name: 'updatedAt', type: 'uint64' },
    ],
  },
  {
    type: 'event', name: 'Anchored', anonymous: false,
    inputs: [
      { name: 'caseId', type: 'bytes32', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'bundleHash', type: 'bytes32', indexed: false },
      { name: 'version', type: 'uint64', indexed: false },
    ],
  },
] as const;

export function isAllowedChainRpcUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const secureTransport = url.protocol === 'https:'
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
    return secureTransport && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const settings = () => {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const registry = process.env.AUDIT_REGISTRY_ADDRESS;
  if (!rpc || !isAllowedChainRpcUrl(rpc) || !registry || !isAddress(registry)) return null;
  return { rpc, registry } as const;
};

export function chainConfigured() { return settings() !== null; }

export function assertSepoliaChainId(chainId: number) {
  if (!Number.isSafeInteger(chainId) || chainId !== sepolia.id) {
    throw new Error(`RPC chain ID mismatch: expected Sepolia ${sepolia.id}, received ${chainId}`);
  }
}

async function assertSepoliaRpc(client: { getChainId(): Promise<number> }) {
  assertSepoliaChainId(await client.getChainId());
}

export function chainWriteConfigured() {
  const key = process.env.SEPOLIA_PRIVATE_KEY || '';
  if (!chainConfigured() || !/^0x[0-9a-fA-F]{64}$/.test(key)) return false;
  try {
    // Validate the secp256k1 scalar before any durable anchor intent is reserved.
    privateKeyToAccount(key as Hex);
    return true;
  } catch {
    return false;
  }
}

export function registryCaseId(caseId: string, claimType: ClaimType): Hex {
  return keccak256(toBytes(`methane-response:v2:${caseId}:${claimType}`));
}

export type AnchorEventMetadata = { caseId: Hex; issuer: string; bundleHash: Hex; version: bigint };
export type AnchorTransactionMetadata = { txHash: Hex; status: 'success' | 'reverted'; blockNumber: bigint };

export function anchorReceiptMatches(
  caseId: Hex,
  bundleHash: Hex,
  receipt: AuditReceipt,
  event: AnchorEventMetadata,
  transaction: AnchorTransactionMetadata,
): boolean {
  return transaction.status === 'success'
    && transaction.txHash.toLowerCase() === receipt.txHash.toLowerCase()
    && event.caseId.toLowerCase() === caseId.toLowerCase()
    && event.bundleHash.toLowerCase() === bundleHash.toLowerCase()
    && event.issuer.toLowerCase() === receipt.issuer.toLowerCase()
    && Number(event.version) === receipt.version
    && transaction.blockNumber.toString() === receipt.blockNumber;
}

export async function readReceipt(caseId: Hex) {
  const config = settings();
  if (!config) throw new Error('Sepolia RPC/contract is not configured');
  const client = createPublicClient({ chain: sepolia, transport: http(config.rpc) });
  await assertSepoliaRpc(client);
  const [issuer, hash, version, updatedAt] = await client.readContract({
    address: config.registry, abi, functionName: 'receipts', args: [caseId],
  });
  return { issuer, hash, version, updatedAt };
}

export async function anchorReceipt(caseId: Hex, bundleHash: Hex): Promise<AuditReceipt> {
  const config = settings();
  const secret = process.env.SEPOLIA_PRIVATE_KEY;
  if (!config || !secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) throw new Error('Chain issuer settings not configured');
  const reader = createPublicClient({ chain: sepolia, transport: http(config.rpc) });
  await assertSepoliaRpc(reader);
  const account = privateKeyToAccount(secret as Hex);
  const client = createWalletClient({ chain: sepolia, transport: http(config.rpc), account });
  const tx = await client.writeContract({ address: config.registry, abi, functionName: 'anchor', args: [caseId, bundleHash] });
  const receipt = await reader.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
  if (receipt.status !== 'success') throw new Error('Sepolia transaction reverted');
  const event = receipt.logs
    .filter((log) => log.address.toLowerCase() === config.registry.toLowerCase())
    .map((log) => {
      try { return decodeEventLog({ abi, data: log.data, topics: log.topics, strict: true }); }
      catch { return null; }
    })
    .find((log) => log?.eventName === 'Anchored');
  if (!event || event.eventName !== 'Anchored') throw new Error('Transaction did not emit the expected registry event');
  if (event.args.caseId.toLowerCase() !== caseId.toLowerCase() || event.args.bundleHash.toLowerCase() !== bundleHash.toLowerCase()) throw new Error('Registry event does not match the requested audit bundle');
  return {
    chainId: sepolia.id,
    registryAddress: config.registry,
    txHash: tx,
    issuer: event.args.issuer,
    version: Number(event.args.version),
    blockNumber: receipt.blockNumber.toString(),
  };
}

export async function verifyAnchorTransaction(caseId: Hex, bundleHash: Hex, receipt: AuditReceipt) {
  const config = settings();
  if (!config) throw new Error('Sepolia RPC/contract is not configured');
  if (receipt.chainId !== sepolia.id || receipt.registryAddress.toLowerCase() !== config.registry.toLowerCase()) {
    return { valid: false as const, reason: 'receipt_configuration_mismatch' };
  }
  const client = createPublicClient({ chain: sepolia, transport: http(config.rpc) });
  await assertSepoliaRpc(client);
  const transaction = await client.getTransactionReceipt({ hash: receipt.txHash });
  if (transaction.status !== 'success') return { valid: false as const, reason: 'transaction_failed' };
  const event = transaction.logs
    .filter((log) => log.address.toLowerCase() === config.registry.toLowerCase())
    .map((log) => {
      try { return decodeEventLog({ abi, data: log.data, topics: log.topics, strict: true }); }
      catch { return null; }
    })
    .find((log) => log?.eventName === 'Anchored');
  if (!event || event.eventName !== 'Anchored') return { valid: false as const, reason: 'anchor_event_missing' };
  const matches = anchorReceiptMatches(caseId, bundleHash, receipt, {
    caseId: event.args.caseId,
    issuer: event.args.issuer,
    bundleHash: event.args.bundleHash,
    version: event.args.version,
  }, {
    txHash: transaction.transactionHash,
    status: transaction.status,
    blockNumber: transaction.blockNumber,
  });
  return {
    valid: matches,
    reason: matches ? 'anchor_event_matches' : 'anchor_event_mismatch',
    issuer: event.args.issuer,
    version: Number(event.args.version),
    blockNumber: transaction.blockNumber.toString(),
    transactionHash: transaction.transactionHash,
  } as const;
}

