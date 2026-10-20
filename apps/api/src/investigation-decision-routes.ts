import type { Hono, Context } from 'hono';
import { z } from 'zod';
import type { AuditReceipt, SharedCaseWork, SharedWorkContext } from '@methane/shared';
import { SharedWorkId } from '@methane/shared';
import { InvestigationDecisionInput, buildInvestigationDecision, verifyInvestigationDecision } from '@methane/shared/investigation-decision';
import { buildInvestigationDossier } from '@methane/shared/investigation-dossier';
import type { SnapshotTransition } from '@methane/shared/snapshot-transition';
import { investigationDecisionRevisit } from '@methane/shared/investigation-revisit';
import { DecisionStateError, DecisionReceipt } from './investigation-decision-state';
import { registryInvestigationId } from './chain';
import * as chain from './chain';
import type { AuditStore } from './store';
import type { CaseWorkStore } from './case-work';
import type { InvestigationMaterials } from '@methane/shared/investigation-dossier';
import type { ApiBindings } from './app';
import { InvestigationExportLimitError, MAX_INVESTIGATION_BYTES } from './investigation-dossier';
type C = Context<{ Bindings: ApiBindings }>;
type Options = { store: AuditStore; workStore: CaseWorkStore; publicPreview: boolean; inFlight: Set<string>;
  context(c: C): SharedWorkContext | null; identity(c: C): { reviewerId: string; scopes: string[] } | null;
  allowed(c: C, work: SharedCaseWork, required?: 'review' | 'anchor'): Promise<boolean>;
  rate(c: C, actor: string): Promise<boolean>;
  read(c: C, bytes: number): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; error: string }>;
  materials(context: SharedWorkContext, history: SharedCaseWork[]): Promise<InvestigationMaterials>;
  beginBuild(): boolean; endBuild(): void;
  transition(): Promise<SnapshotTransition>;
  chain: Pick<typeof chain, 'chainConfigured' | 'chainWriteConfigured' | 'chainTarget' | 'prepareAnchor' | 'broadcastAnchor' | 'inspectRegistryIntent' | 'readReceipt' | 'verifyAnchorTransaction'>;
};
const Target = z.object({ chainId: z.union([z.literal(31337),z.literal(11155111)]), registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/), issuer: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }).strict();
export function registerInvestigationDecisions(app: Hono<{ Bindings: ApiBindings }>, o: Options) {
  const base = '/api/case-work/:id/decisions';
  for (const action of ['list','freeze','anchor','reconcile','verify'] as const) {
    const path = action === 'list' || action === 'freeze' ? base : `${base}/:digest/${action}`;
    app.on(action === 'list' ? 'GET' : 'POST', path, async c => {
      c.header('Cache-Control','no-store'); c.header('Vary','Authorization');
      if (o.publicPreview) return c.json({ error: 'Private investigation decisions are unavailable in public preview.' },403);
      const actor = o.identity(c); if (!actor) return c.json({ error: 'Signed private-read access required.' },401);
      const context = o.context(c), workId = c.req.param('id') || '';
      if (!context || !SharedWorkId.safeParse(workId).success) return c.json({ error: 'Invalid investigation context.' },400);
      if (!await o.rate(c,actor.reviewerId)) { c.header('Retry-After','60'); return c.json({ error: 'Too many investigation operations.' },429); }
      let reserved = false, entered = false, building = false;
      try {
        const history = await o.workStore.history(context,workId), work = history.at(-1);
        const authorityWork = work && history.some(row => row.planLink) ? { ...work, planLink:history.find(row => row.planLink)!.planLink } : work;
        const required = action === 'freeze' ? 'review' : action === 'anchor' || action === 'reconcile' ? 'anchor' : undefined;
        if (!work || !authorityWork || !await o.allowed(c,authorityWork,required)) return c.json({ error: 'Current reviewer authority or required scopes unavailable.' },403);
        if (!o.store.listInvestigationDecisions || !o.store.saveInvestigationDecision) return c.json({ error: 'Durable decision storage is unavailable. Configure the existing file store.' },503);
        const records = await o.store.listInvestigationDecisions(context,workId);
        if (action === 'list') {
          const summaries = records.map(r => ({ digest:r.decision.digest, revision:r.decision.revision, workRevision:r.decision.dossier.history.at(-1)!.revision, reviewerId:r.decision.reviewerId, reviewedAt:r.decision.reviewedAt, disposition:r.decision.disposition, receipt:r.receipt || null }));
          const target = await o.chain.chainTarget().catch(() => null);
          if (!await o.allowed(c,authorityWork!)) return c.json({ error: 'Reviewer authority changed.' },403);
          return c.json({ decisions:summaries, target });
        }
        if (action === 'freeze') {
          const body = await o.read(c,4096); if (!body.ok) return c.json({ error:body.error },body.status);
          const parsed = InvestigationDecisionInput.safeParse(body.value); if (!parsed.success) return c.json({ error:'Inspect the exact dossier, scoped assessment and decision head before reviewing.' },400);
          if (parsed.data.expectedRevision !== work.revision || parsed.data.expectedDecisionDigest !== (records.at(-1)?.decision.digest || null)) return c.json({ error:'Investigation or decision changed; reload before reviewing.' },409);
          if (!o.beginBuild()) { c.header('Retry-After','2'); return c.json({error:'Investigation exports are busy. Retry shortly.'},429); }
          building = true;
          const dossier = await buildInvestigationDossier(context,workId,history,await o.materials(context,history));
          if (dossier.digest !== parsed.data.expectedDossierDigest) return c.json({ error:'Dossier materials changed; inspect and approve the new digest.' },409);
          if (!work.scope || !work.assessmentLink) return c.json({ error:'A scoped assessment with human review is required.' },422);
          const decision = await buildInvestigationDecision(dossier,parsed.data,actor.reviewerId,records.at(-1)?.decision);
          if (Buffer.byteLength(JSON.stringify(decision)) > MAX_INVESTIGATION_BYTES) throw new InvestigationExportLimitError();
          await o.store.saveInvestigationDecision(decision,parsed.data.expectedDecisionDigest,async () => {
            const head = (await o.workStore.history(context,workId)).at(-1);
            return Boolean(head?.revision === work.revision && await o.allowed(c,{...head,planLink:authorityWork!.planLink},'review'));
          });
          if (!await o.allowed(c,authorityWork!)) return c.json({ error:'Decision saved; authority changed. Reconnect to inspect its status.' },403);
          c.header('X-Investigation-Digest',decision.digest); return c.json({ decision },201);
        }
        const digest = c.req.param('digest'), record = records.find(r => r.decision.digest === digest);
        if (!record || !await verifyInvestigationDecision(record.decision,record.decision.digest)) return c.json({ error:'Frozen decision not found or failed integrity checks.' },404);
        const key = registryInvestigationId(context,workId);
        if (action === 'verify') {
          let chainStatus = 'not_anchored';
          if (record.receipt) {
            if (!o.chain.chainConfigured()) return c.json({ error:'Chain verification is not configured; no chain claim accepted.' },503);
            const event = await o.chain.verifyAnchorTransaction(key,record.decision.digest as `0x${string}`,record.receipt as AuditReceipt);
            const head = await o.chain.readReceipt(key);
            if (!event.valid || head.version < BigInt(record.receipt.version)) return c.json({ error:'Chain event or registry head does not match the frozen decision.' },409);
            chainStatus = head.version === BigInt(record.receipt.version) && head.hash.toLowerCase() === record.decision.digest ? 'verified_latest' : head.version > BigInt(record.receipt.version) ? 'verified_historical' : 'invalid';
            if (chainStatus === 'invalid') return c.json({ error:'Registry head mismatch.' },409);
          }
          const revisit = investigationDecisionRevisit(record.decision,work,await o.transition().catch(() => undefined));
          if (!await o.allowed(c,authorityWork!)) return c.json({ error:'Authority changed.' },403);
          c.header('X-Investigation-Digest',record.decision.digest); return c.json({ ...record, registryKey:key, chainStatus, revisit, physicalOutcomeEstablished:false });
        }
        if (!o.store.reserveDecisionAnchor || !o.store.getDecisionAnchorIntent || !o.store.finishDecisionAnchor) return c.json({ error:'Durable anchor coordinator is unavailable.' },503);
        if (!o.chain.chainConfigured()) return c.json({ error:'Chain is not configured.' },503);
        if (o.inFlight.size) return c.json({ error:'Issuer operation in progress.' },409);
        o.inFlight.add(`investigation:${digest}`); entered = true;
        let intent = await o.store.getDecisionAnchorIntent(record.decision.digest);
        if (action === 'anchor') {
          if (record.receipt || intent?.state === 'pending') return c.json({ error:'Already anchored or pending. Verify or reconcile; do not rebroadcast.' },409);
          if (!o.chain.chainWriteConfigured()) return c.json({ error:'Chain writes are disabled or no signer is configured.' },503);
          if (context.synthetic && process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_CHAIN_ANCHORS !== 'true') return c.json({ error:'Synthetic anchors disabled.' },422);
          const body = await o.read(c,1024); if (!body.ok) return c.json({ error:body.error },body.status);
          const target = Target.safeParse(body.value); if (!target.success) return c.json({ error:'Explicitly approve the inspected chain, registry and issuer.' },400);
          const prepared = await o.chain.prepareAnchor(`investigation:${digest}`,key,record.decision.digest as `0x${string}`);
          if (target.data.chainId !== prepared.draft.chainId || target.data.registryAddress.toLowerCase() !== prepared.draft.registryAddress.toLowerCase() || target.data.issuer.toLowerCase() !== prepared.draft.issuer.toLowerCase()) return c.json({ error:'Chain target changed before reservation.' },409);
          if (!await o.store.reserveDecisionAnchor(record.decision.digest,key,prepared.draft,() => o.allowed(c,authorityWork!,'anchor'))) return c.json({ error:'Pending operation or stale issuer nonce blocks this write.' },409);
          reserved = true; await o.chain.broadcastAnchor(prepared); intent = await o.store.getDecisionAnchorIntent(record.decision.digest);
        }
        if (!intent) return c.json({ error:'No durable intent exists; no transaction was sent.' },409);
        if (intent.state !== 'pending') {
          if (!await o.allowed(c,authorityWork!,'anchor')) return c.json({error:'Authority changed.'},403);
          return c.json({status:intent.state,txHash:intent.txHash,physicalOutcomeEstablished:false},intent.state === 'reverted' ? 422 : 200);
        }
        const outcome = await o.chain.inspectRegistryIntent(intent);
        if (outcome.status !== 'pending') await o.store.finishDecisionAnchor(record.decision.digest,outcome.status === 'confirmed' ? { status:'confirmed', receipt:DecisionReceipt.parse(outcome.receipt) } : outcome);
        if (!await o.allowed(c,authorityWork!,'anchor')) return c.json({ error:'Operation recorded; authority changed. Reconnect to inspect status.' },403);
        return c.json({ status:outcome.status, txHash:intent.txHash, ...(outcome.status === 'confirmed' ? { receipt:outcome.receipt } : {}), physicalOutcomeEstablished:false },outcome.status === 'pending' ? 202 : outcome.status === 'reverted' ? 422 : 200);
      } catch (error) {
        if (error instanceof DecisionStateError) return c.json({error:error.code === 'conflict' ? 'Decision changed. Reload its head before reviewing.' : error.code === 'authority' ? 'Reviewer authority changed before commit.' : 'Frozen decision capacity reached; existing decisions are retained.'},error.code === 'conflict' ? 409 : error.code === 'authority' ? 403 : 413);
        if (error instanceof InvestigationExportLimitError) return c.json({ error:error.message },413);
        return c.json({ error:reserved ? 'Anchor outcome uncertain. Reconcile; do not rebroadcast.' : 'Decision operation unavailable or conflicted. Reload saved revisions before retrying.' },reserved ? 502 : 503);
      } finally { if (building) o.endBuild(); if (entered) o.inFlight.delete(`investigation:${c.req.param('digest')}`); }
    });
  }
}
