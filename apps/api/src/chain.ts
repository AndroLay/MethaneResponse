import { createPublicClient, createWalletClient, http, isAddress, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

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
] as const;

const settings = () => {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const registry = process.env.AUDIT_REGISTRY_ADDRESS;
  if (!rpc || !registry || !isAddress(registry)) return null;
  return { rpc, registry } as const;
};

export function chainConfigured() { return settings() !== null; }

export async function readReceipt(caseId: Hex) {
  const config = settings();
  if (!config) throw new Error('Sepolia RPC/contract is not configured');
  const client = createPublicClient({ chain: sepolia, transport: http(config.rpc) });
  const [issuer, hash, version, updatedAt] = await client.readContract({
    address: config.registry, abi, functionName: 'receipts', args: [caseId],
  });
  return { issuer, hash, version, updatedAt };
}

export async function anchorReceipt(caseId: Hex, bundleHash: Hex): Promise<Hex> {
  const config = settings();
  const secret = process.env.SEPOLIA_PRIVATE_KEY;
  if (!config || !secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) throw new Error('Chain issuer settings not configured');
  const account = privateKeyToAccount(secret as Hex);
  const client = createWalletClient({ chain: sepolia, transport: http(config.rpc), account });
  const tx = await client.writeContract({ address: config.registry, abi, functionName: 'anchor', args: [caseId, bundleHash] });
  const reader = createPublicClient({ chain: sepolia, transport: http(config.rpc) });
  const receipt = await reader.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
  if (receipt.status !== 'success') throw new Error('Sepolia transaction reverted');
  return tx;
}

