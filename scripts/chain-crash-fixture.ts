// Invoked only by the isolated disposable-chain integration test.
import { createApp } from '../apps/api/src/app';
import { FileAuditStore } from '../apps/api/src/store';
import { broadcastAnchor } from '../apps/api/src/chain';
if (process.env.CHAIN_NETWORK !== 'local' || process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_PRIVATE_KEY) throw Error('Local fixture only');
const [path, auditId, phase] = process.argv.slice(2);
if (!path || !auditId || !['before-broadcast', 'after-broadcast'].includes(phase)) throw Error('Invalid fixture');
const app = createApp(new FileAuditStore(path), undefined, { broadcastAnchor: async prepared => {
  if (phase === 'after-broadcast') await broadcastAnchor(prepared);
  process.kill(process.pid, 'SIGKILL');
  throw Error('Unreachable');
} });
await app.request(`/api/audits/${encodeURIComponent(auditId)}/anchor`, { method: 'POST', headers: { authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` } });
process.exit(3); // A crash fixture must never return normally.
