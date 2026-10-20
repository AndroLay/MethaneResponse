import { InvestigationDecision, verifyInvestigationDecision } from '../packages/shared/src/investigation-decision';
import { DecisionReceipt } from '../apps/api/src/investigation-decision-state';
import { chainConfigured, readReceipt, registryInvestigationId, verifyAnchorTransaction } from '../apps/api/src/chain';
import type { AuditReceipt } from '../packages/shared/src';
/** No secrets or writes. Use a separately trusted digest or a configured chain receipt. */
if (import.meta.main) {
  try {
    const [path, flag, expected, ...rest] = process.argv.slice(2);
    if (!path || path.startsWith('-') || flag !== '--expected-digest' || !/^0x[a-f0-9]{64}$/.test(expected || '') || rest.length > 1 || rest.some(v => v !== '--require-chain')) throw new Error('Usage: bun --no-env-file scripts/verify-investigation-decision.ts <decision.json> --expected-digest <trusted 0x SHA-256> [--require-chain]');
    const file = Bun.file(path); if (file.size > 16 * 1024 * 1024) throw new Error('Decision exceeds 16 MiB.');
    const raw = JSON.parse(await file.text()), decisionRaw = raw.decision || raw;
    if (!await verifyInvestigationDecision(decisionRaw,expected)) throw new Error('Frozen decision failed trusted digest, dossier replay or assessment checks.');
    const value = InvestigationDecision.parse(decisionRaw); let chainStatus = 'NOT_VERIFIED';
    if (rest.includes('--require-chain') || raw.receipt && chainConfigured()) {
      if (!raw.receipt || !chainConfigured()) throw new Error('A receipt and configured read-only chain target are required.');
      const receipt = DecisionReceipt.parse(raw.receipt) as AuditReceipt, key = registryInvestigationId(value.dossier.context,value.dossier.workId);
      if (!await verifyAnchorTransaction(key,value.digest as `0x${string}`,receipt).then(v => v.valid)) throw new Error('Chain event does not match this frozen decision.');
      const head = await readReceipt(key);
      if (head.version < BigInt(receipt.version) || head.version === BigInt(receipt.version) && head.hash.toLowerCase() !== value.digest) throw new Error('Registry head does not match decision receipt.');
      chainStatus = head.version === BigInt(receipt.version) ? 'VERIFIED_LATEST' : 'VERIFIED_HISTORICAL';
    }
    console.log(JSON.stringify({ valid:true, digest:value.digest, revision:value.revision, workId:value.dossier.workId, sourceId:value.dossier.context.sourceId,
      chainStatus, physicalOutcomeEstablished:false, limitation:'Canonical JSON integrity relative to the supplied trusted digest; formatting alone may normalize. Blockchain verifies chronology and integrity, not physical repair or independent reviewer identity.' }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Decision verification failed.'); process.exitCode = 1; }
}
