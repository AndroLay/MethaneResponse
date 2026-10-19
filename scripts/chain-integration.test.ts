import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createPublicClient, createWalletClient, http, type Hex } from '../apps/api/node_modules/viem';
import { generatePrivateKey, privateKeyToAccount } from '../apps/api/node_modules/viem/accounts';
import { foundry } from '../apps/api/node_modules/viem/chains';
import { DEMO_SOURCES } from '../packages/shared/src';
import { createAudit } from '../apps/api/src/audit';
import { FileAuditStore } from '../apps/api/src/store';
import { createApp } from '../apps/api/src/app';
import { broadcastAnchor, inspectAnchorIntent, registryCaseId, verifyAnchorTransaction } from '../apps/api/src/chain';

// Disposable loopback chain only. Never inherits real signer/RPC variables (.env disabled by runner).
test('local chain: lost RPC acknowledgement, independent verifier, historical receipt and process crash recovery', async () => {
  if (process.env.SEPOLIA_PRIVATE_KEY || process.env.SEPOLIA_RPC_URL) throw Error('Use the isolated test:chain-integration runner');
  const probe = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response('probe') });
  const port = probe.port!; probe.stop(true);
  const rpc = `http://127.0.0.1:${port}`;
  const anvil = Bun.spawn(['anvil', '--host', '127.0.0.1', '--port', String(port), '--chain-id', '31337', '--silent'], { stdout: 'ignore', stderr: 'ignore' });
  const dir = await mkdtemp(join(tmpdir(), 'methane-local-chain-'));
  const names = ['CHAIN_NETWORK', 'LOCAL_CHAIN_RPC_URL', 'LOCAL_REGISTRY_ADDRESS', 'LOCAL_CHAIN_PRIVATE_KEY', 'ENABLE_CHAIN_WRITES', 'CHAIN_CONFIRMATIONS', 'ADMIN_API_TOKEN'];
  const old = names.map(n => process.env[n]);
  let rpcProxy: ReturnType<typeof Bun.serve> | undefined;
  try {
    const reader = createPublicClient({ chain: foundry, transport: http(rpc, { retryCount: 0, timeout: 1000 }) });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if (await reader.getChainId() === 31337) { ready = true; break; } } catch {}
      await Bun.sleep(100);
    }
    expect(ready).toBe(true);
    const build = Bun.spawnSync(['forge', 'build', '--quiet'], { cwd: resolve(import.meta.dir, '../contracts'), stdout: 'pipe', stderr: 'pipe' });
    expect(build.exitCode).toBe(0);
    const artifact = JSON.parse(await readFile(resolve(import.meta.dir, '../contracts/out/EvidenceRegistry.sol/EvidenceRegistry.json'), 'utf8'));
    const secret = generatePrivateKey();
    const account = privateKeyToAccount(secret);
    await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'anvil_setBalance', params: [account.address, '0x8ac7230489e80000'] }) });
    const wallet = createWalletClient({ account, chain: foundry, transport: http(rpc) });
    const deployed = await reader.waitForTransactionReceipt({ hash: await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object as Hex }) });
    const registry = deployed.contractAddress!;
    Object.assign(process.env, { CHAIN_NETWORK: 'local', LOCAL_CHAIN_RPC_URL: rpc, LOCAL_REGISTRY_ADDRESS: registry,
      LOCAL_CHAIN_PRIVATE_KEY: secret, ENABLE_CHAIN_WRITES: 'true', CHAIN_CONFIRMATIONS: '1', ADMIN_API_TOKEN: 'DEMO-local-admin-'.padEnd(48, 'x') });
    const store = new FileAuditStore(join(dir, 'audits.json'));
    const create = (s = store) => s.create('DEMO-001', 'DEMO-001', 'source_detected', revision => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
    const audit = await create();
    const opts = { method: 'POST', headers: { authorization: `Bearer ${process.env.ADMIN_API_TOKEN}` } };
    const crash = (path: string, id: string, phase: string) => Bun.spawnSync([process.execPath, '--no-env-file', resolve(import.meta.dir, 'chain-crash-fixture.ts'), path, id, phase], { env: process.env, stdout: 'pipe', stderr: 'pipe' });
    const killed = crash(store.path, audit.auditId, 'after-broadcast');
    expect(killed.signalCode).toBe('SIGKILL');
    expect((await store.get(audit.auditId))?.anchored).toBe(false);
    const restartedStore = new FileAuditStore(store.path), restarted = createApp(restartedStore);
    expect((await restarted.request(`/api/audits/${audit.auditId}/anchor`, opts)).status).toBe(409);
    const reconciled = await restarted.request(`/api/audits/${audit.auditId}/reconcile`, opts);
    expect(reconciled.status).toBe(200);
    const anchored = (await restartedStore.get(audit.auditId))!;
    expect(anchored.anchored).toBe(true);

    const report = join(dir, 'report.json'); await writeFile(report, JSON.stringify(anchored));
    const verify = (path: string) => Bun.spawnSync([process.execPath, '--no-env-file', resolve(import.meta.dir, 'verify-audit.ts'), path, '--require-chain'], { env: { ...process.env, LOCAL_CHAIN_PRIVATE_KEY: '', ENABLE_CHAIN_WRITES: 'false' }, stdout: 'pipe', stderr: 'pipe' });
    const checked = verify(report);
    expect(checked.exitCode).toBe(0);
    expect(new TextDecoder().decode(checked.stdout)).toContain('chain_receipt: VALID_LATEST');
    const tampered = join(dir, 'tampered.json');
    await writeFile(tampered, JSON.stringify({ ...anchored, bundle: { ...anchored.bundle, reason: 'DEMO tampered after export' } }));
    expect(verify(tampered).exitCode).toBe(1);
    await writeFile(tampered, JSON.stringify({ ...anchored, receipt: { ...anchored.receipt, issuer: registry } }));
    expect(verify(tampered).exitCode).toBe(1);
    const next = await create(restartedStore);
    const posted = await restarted.request(`/api/audits/${next.auditId}/anchor`, opts);
    expect(posted.status).toBe(200);
    expect((await restartedStore.get(next.auditId))?.receipt?.version).toBe(2);
    expect(new TextDecoder().decode(verify(report).stdout)).toContain('VALID_HISTORICAL');
    // The real chain accepts the transaction, but the issuer never receives its hash.
    // This differs from SIGKILL after a successful broadcast acknowledgement.
    let acceptedButUnacknowledged = 0;
    let acceptedHash: Hex | undefined;
    rpcProxy = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
      const body = await request.text();
      const forwarded = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (JSON.parse(body).method === 'eth_sendRawTransaction') {
        const result = await forwarded.json() as { result?: Hex };
        if (result.result) { acceptedButUnacknowledged++; acceptedHash = result.result; }
        return new Response('DEMO proxy lost acknowledgement after chain acceptance', { status: 502 });
      }
      return new Response(await forwarded.arrayBuffer(), { status: forwarded.status, headers: { 'content-type': 'application/json' } });
    } });
    const uncertain = await create(restartedStore);
    const nonceBeforeUncertain = await reader.getTransactionCount({ address: account.address, blockTag: 'pending' });
    process.env.LOCAL_CHAIN_RPC_URL = `http://127.0.0.1:${rpcProxy.port}`;
    const uncertainResponse = await restarted.request(`/api/audits/${uncertain.auditId}/anchor`, opts);
    expect(uncertainResponse.status).toBe(502);
    expect((await uncertainResponse.json()).error).toContain('Do not rebroadcast');
    expect(acceptedButUnacknowledged).toBe(1);
    const pendingIntent = (await restartedStore.getAnchorIntent(uncertain.auditId))!;
    expect(pendingIntent.state).toBe('pending'); expect(pendingIntent.txHash).toBe(acceptedHash!);
    expect((await restartedStore.get(uncertain.auditId))?.anchored).toBe(false);
    expect((await restarted.request(`/api/audits/${uncertain.auditId}/anchor`, opts)).status).toBe(409);
    expect(acceptedButUnacknowledged).toBe(1);
    process.env.LOCAL_CHAIN_RPC_URL = rpc;
    const uncertainReopened = new FileAuditStore(store.path);
    expect((await createApp(uncertainReopened).request(`/api/audits/${uncertain.auditId}/reconcile`, opts)).status).toBe(200);
    const recoveredUncertain = (await uncertainReopened.get(uncertain.auditId))!;
    expect(recoveredUncertain.receipt?.txHash).toBe(acceptedHash!);
    expect(recoveredUncertain.receipt?.version).toBe(3);
    expect(await reader.getTransactionCount({ address: account.address, blockTag: 'pending' })).toBe(nonceBeforeUncertain + 1);
    const uncertainReport = join(dir, 'uncertain-report.json'); await writeFile(uncertainReport, JSON.stringify(recoveredUncertain));
    expect(verify(uncertainReport).exitCode).toBe(0);
    const code = await reader.getCode({ address: registry });
    const revertedAudit = await create(restartedStore);
    const reverting = createApp(restartedStore, undefined, { broadcastAnchor: async prepared => {
      await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'anvil_setCode', params: [registry, '0x60006000fd'] }) });
      await broadcastAnchor(prepared);
    } });
    expect((await reverting.request(`/api/audits/${revertedAudit.auditId}/anchor`, opts)).status).toBe(422);
    expect((await restartedStore.getAnchorIntent(revertedAudit.auditId))?.state).toBe('reverted');
    expect((await restartedStore.get(revertedAudit.auditId))?.anchored).toBe(false);
    await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'anvil_setCode', params: [registry, code] }) });
    const crashStore = new FileAuditStore(join(dir, 'crash.json')), unsent = await create(crashStore);
    const beforeNonce = await reader.getTransactionCount({ address: account.address, blockTag: 'pending' });
    expect(crash(crashStore.path, unsent.auditId, 'before-broadcast').signalCode).toBe('SIGKILL');
    const reopened = new FileAuditStore(crashStore.path), intent = (await reopened.getAnchorIntent(unsent.auditId))!;
    expect(await inspectAnchorIntent(intent)).toEqual({ status: 'pending' });
    expect(await reader.getTransactionCount({ address: account.address, blockTag: 'pending' })).toBe(beforeNonce);
    expect((await createApp(reopened).request(`/api/audits/${unsent.auditId}/anchor`, opts)).status).toBe(409);
    // Independent matching rejects metadata even for a genuine mined transaction.
    expect((await verifyAnchorTransaction(registryCaseId(audit.caseId, audit.claimType), audit.bundleHash, { ...anchored.receipt!, version: 99 })).valid).toBe(false);
    if (process.env.METHANE_CHAIN_EVIDENCE_PATH) await writeFile(process.env.METHANE_CHAIN_EVIDENCE_PATH, JSON.stringify({
      label: 'DEMO — disposable local Anvil, not public Sepolia evidence', recordedAt: new Date().toISOString(), chainId: 31337,
      auditId: anchored.auditId, bundleHash: anchored.bundleHash, receipt: anchored.receipt,
      independentVerifier: 'VALID_LATEST then VALID_HISTORICAL', modifiedBundle: 'REJECTED', forgedIssuer: 'REJECTED',
      crashBeforeBroadcast: 'SIGKILL; pending; no nonce consumed', crashAfterBroadcast: 'SIGKILL; confirmed by reconciliation', revertedTransaction: 'REVERTED; audit unanchored',
      lostRpcAcknowledgement: { transport: 'real loopback RPC proxy replaces acknowledgement with HTTP 502 after Anvil acceptance',
        acceptedTransactions: acceptedButUnacknowledged, apiStatus: 502, retryStatus: 409,
        recovery: 'reopened store; exact stored hash reconciled; one nonce consumed; independent CLI exit 0', receipt: recoveredUncertain.receipt },
    }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

  } finally {
    rpcProxy?.stop(true);
    anvil.kill(); await anvil.exited;
    names.forEach((n, i) => { if (old[i] === undefined) delete process.env[n]; else process.env[n] = old[i]; });
    await rm(dir, { recursive: true, force: true });
  }
}, 60_000);
