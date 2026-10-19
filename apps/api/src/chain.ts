import { createPublicClient, createWalletClient, decodeEventLog, encodeFunctionData, http, isAddress, keccak256, toBytes, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry, sepolia } from 'viem/chains';
import { randomUUID } from 'node:crypto';
import type { AnchorDraft, AnchorIntent } from './anchor-intent';
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
  if (process.env.CHAIN_NETWORK === 'local') {
    const rpc = process.env.LOCAL_CHAIN_RPC_URL;
    const registry = process.env.LOCAL_REGISTRY_ADDRESS;
    if (process.env.NODE_ENV === 'production' || !rpc || !isAllowedChainRpcUrl(rpc) || !registry || !isAddress(registry)) return null;
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(rpc).hostname)) return null;
    return { rpc, registry, chain: foundry, secret: process.env.LOCAL_CHAIN_PRIVATE_KEY };
  }
  if (process.env.CHAIN_NETWORK && process.env.CHAIN_NETWORK !== 'sepolia') return null;
  const rpc = process.env.SEPOLIA_RPC_URL;
  const registry = process.env.AUDIT_REGISTRY_ADDRESS;
  if (!rpc || !isAllowedChainRpcUrl(rpc) || !registry || !isAddress(registry)) return null;
  return { rpc, registry, chain: sepolia, secret: process.env.SEPOLIA_PRIVATE_KEY } as const;
};

export function chainConfigured() { return settings() !== null; }

export function assertSepoliaChainId(chainId: number) {
  if (!Number.isSafeInteger(chainId) || chainId !== sepolia.id) {
    throw new Error(`RPC chain ID mismatch: expected Sepolia ${sepolia.id}, received ${chainId}`);
  }
}

async function assertConfiguredRpc(client: { getChainId(): Promise<number> }) {
  const expected = settings()?.chain.id ?? sepolia.id;
  const actual = await client.getChainId();
  if (actual !== expected) throw new Error(`RPC chain ID mismatch: expected ${expected}, received ${actual}`);
}

export function chainWriteConfigured() {
  const key = settings()?.secret || '';
  if (process.env.ENABLE_CHAIN_WRITES !== 'true' || !chainConfigured() || !/^0x[0-9a-fA-F]{64}$/.test(key)) return false;
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
  return Number.isSafeInteger(receipt.version) && receipt.version > 0 && transaction.status === 'success'
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
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(client);
  const [issuer, hash, version, updatedAt] = await client.readContract({
    address: config.registry, abi, functionName: 'receipts', args: [caseId],
  });
  return { issuer, hash, version, updatedAt };
}

export async function chainTarget() {
  const config = settings();
  if (!config) return null;
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(client);
  if (!(await client.getCode({ address: config.registry }))) throw new Error('Registry bytecode is missing');
  let issuer: string | null = null;
  try { if (config.secret) issuer = privateKeyToAccount(config.secret as Hex).address; } catch {}
  return { chainId: config.chain.id, registryAddress: config.registry, issuer, confirmations: confirmationPolicy(), writeEnabled: chainWriteConfigured() };
}
export type PreparedAnchor = { draft: AnchorDraft; serializedTransaction: Hex };
export function confirmationPolicy() {
  const value = Number(process.env.CHAIN_CONFIRMATIONS || '2');
  if (!Number.isInteger(value) || value < 1 || value > 64) throw new Error('Invalid chain confirmation policy');
  return value;
}
/** Does not broadcast. Hash is derived from the exact signed bytes before durable reservation. */
export async function prepareAnchor(auditId: string, caseId: Hex, bundleHash: Hex): Promise<PreparedAnchor> {
  const config = settings();
  if (!config?.secret || !chainWriteConfigured()) throw new Error('Chain writes are disabled or signer is not configured');
  const reader = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(reader);
  if (!(await reader.getCode({ address: config.registry }))) throw new Error('Registry bytecode is missing');
  const account = privateKeyToAccount(config.secret as Hex);
  const current = await readReceipt(caseId);
  if (current.version > 0n && current.issuer.toLowerCase() !== account.address.toLowerCase()) throw new Error('Registry case belongs to another issuer');
  const expectedVersion = Number(current.version + 1n);
  if (!Number.isSafeInteger(expectedVersion)) throw new Error('Registry version exceeds safe range');
  const wallet = createWalletClient({ account, chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  const request = await wallet.prepareTransactionRequest({ account, type: 'eip1559', to: config.registry,
    data: encodeFunctionData({ abi, functionName: 'anchor', args: [caseId, bundleHash] }) });
  const serializedTransaction = await account.signTransaction({ type: 'eip1559', chainId: config.chain.id, nonce: request.nonce, gas: request.gas, maxFeePerGas: request.maxFeePerGas, maxPriorityFeePerGas: request.maxPriorityFeePerGas, to: config.registry, data: request.data, value: 0n });
  return { serializedTransaction, draft: { operationId: randomUUID(), auditId, chainId: config.chain.id,
    registryAddress: config.registry, issuer: account.address, nonce: request.nonce,
    txHash: keccak256(serializedTransaction), expectedVersion, confirmations: confirmationPolicy() } };
}
export async function broadcastAnchor(prepared: PreparedAnchor) {
  const config = settings();
  if (!config || !chainWriteConfigured() || config.chain.id !== prepared.draft.chainId
    || config.registry.toLowerCase() !== prepared.draft.registryAddress.toLowerCase()
    || keccak256(prepared.serializedTransaction) !== prepared.draft.txHash) throw new Error('Prepared transaction configuration mismatch');
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(client);
  const hash = await client.sendRawTransaction({ serializedTransaction: prepared.serializedTransaction });
  if (hash.toLowerCase() !== prepared.draft.txHash.toLowerCase()) throw new Error('RPC returned a different transaction hash');
}
export type AnchorOutcome = { status: 'pending' } | { status: 'reverted' } | { status: 'confirmed'; receipt: AuditReceipt };
/** Read only, including after timeouts/restarts. Missing/replaced transactions never release the reservation. */
export async function inspectAnchorIntent(intent: AnchorIntent, wait = false): Promise<AnchorOutcome> {
  const config = settings();
  if (!config || config.chain.id !== intent.chainId || config.registry.toLowerCase() !== intent.registryAddress.toLowerCase()) throw new Error('Intent configuration mismatch');
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(client);
  const hash = intent.txHash as Hex;
  let transaction;
  try {
    transaction = wait ? await client.waitForTransactionReceipt({ hash, confirmations: intent.confirmations, timeout: 30_000, pollingInterval: 500 })
      : await client.getTransactionReceipt({ hash });
  } catch (error) {
    if ((error as Error).name === 'TransactionReceiptNotFoundError') return { status: 'pending' };
    throw error;
  }
  const original = await client.getTransaction({ hash });
  const expectedData = encodeFunctionData({ abi, functionName: 'anchor', args: [registryCaseId(intent.caseId, intent.claimType as ClaimType), intent.bundleHash as Hex] });
  if (original.from.toLowerCase() !== intent.issuer.toLowerCase() || original.to?.toLowerCase() !== intent.registryAddress.toLowerCase()
    || original.input.toLowerCase() !== expectedData.toLowerCase() || original.nonce !== intent.nonce || transaction.transactionHash.toLowerCase() !== intent.txHash.toLowerCase()) throw new Error('Transaction does not match intent');
  const canonical = await client.getBlock({ blockNumber: transaction.blockNumber });
  const head = await client.getBlockNumber({ cacheTime: 0 });
  if (canonical.hash !== transaction.blockHash || head - transaction.blockNumber + 1n < BigInt(Math.max(intent.confirmations, confirmationPolicy()))) return { status: 'pending' };
  if (transaction.status === 'reverted') return { status: 'reverted' };
  const receipt: AuditReceipt = { chainId: intent.chainId, registryAddress: intent.registryAddress as Hex,
    txHash: hash, issuer: intent.issuer as Hex, version: intent.expectedVersion, blockNumber: transaction.blockNumber.toString(),
    blockHash: transaction.blockHash, confirmations: intent.confirmations };
  const check = await verifyAnchorTransaction(registryCaseId(intent.caseId, intent.claimType as ClaimType), intent.bundleHash as Hex, receipt);
  if (!check.valid) throw new Error('Receipt does not match intent');
  return { status: 'confirmed', receipt };
}

export async function verifyAnchorTransaction(caseId: Hex, bundleHash: Hex, receipt: AuditReceipt) {
  const config = settings();
  if (!config) throw new Error('Sepolia RPC/contract is not configured');
  if (receipt.chainId !== config.chain.id || receipt.registryAddress.toLowerCase() !== config.registry.toLowerCase()) {
    return { valid: false as const, reason: 'receipt_configuration_mismatch' };
  }
  const client = createPublicClient({ chain: config.chain, transport: http(config.rpc, { retryCount: 0, timeout: 10_000 }) });
  await assertConfiguredRpc(client);
  const transaction = await client.getTransactionReceipt({ hash: receipt.txHash });
  const canonical = await client.getBlock({ blockNumber: transaction.blockNumber });
  const head = await client.getBlockNumber({ cacheTime: 0 });
  if (canonical.hash !== transaction.blockHash || (receipt.blockHash && receipt.blockHash !== canonical.hash)) return { valid: false as const, reason: 'block_not_canonical' };
  if (head - transaction.blockNumber + 1n < BigInt(Math.max(confirmationPolicy(), receipt.confirmations || 1))) return { valid: false as const, reason: 'confirmations_pending' };
  if (transaction.status !== 'success') return { valid: false as const, reason: 'transaction_failed' };
  const event = transaction.logs
    .filter((log) => !log.removed && log.address.toLowerCase() === config.registry.toLowerCase())
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

