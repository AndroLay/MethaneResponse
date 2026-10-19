import { randomUUID } from 'node:crypto';
import { constants, type BigIntStats } from 'node:fs';
import { mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AuditResult, WithdrawalReason } from '@methane/shared';
import { publicationEventsForCreate, withdrawalEvent, validatePublicationEvents, migrateLegacyPublications, PublicationError, type PublicationEvent, type PublicationSnapshot } from './publication';
import { AnchorDraft, AnchorIntent, receiptMatchesIntent } from './anchor-intent';
import { canonicalJson } from './canonical';
import { pageAuditRecords, type AuditPage, type AuditPageOptions } from './audit-pagination';

export type AuditStoreStatus = { backend: 'memory' | 'file'; persistent: boolean; ready: boolean };
export type AuditPageQuery = AuditPageOptions & { sourceId?: string; claimType?: AuditResult['claimType'] };

export interface AuditStore {
  create(caseId: string, sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string, authorize?: () => Promise<boolean>): Promise<AuditResult>;
  get(auditId: string): Promise<AuditResult | undefined>;
  list(sourceId?: string, claimType?: AuditResult['claimType']): Promise<AuditResult[]>;
  listPage(query: AuditPageQuery): Promise<AuditPage>;
  replace(audit: AuditResult): Promise<void>;
  publicationSnapshot(): Promise<PublicationSnapshot>;
  withdrawPublication(auditId: string, expectedVersion: number, reason: WithdrawalReason, actorId: string, authorize: () => Promise<boolean>): Promise<void>;
  reserveAnchor?(audit: AuditResult, draft?: AnchorDraft): Promise<boolean>;
  getAnchorIntent?(auditId: string): Promise<AnchorIntent | undefined>;
  markAnchorReverted?(auditId: string): Promise<void>;
  completeAnchor?(audit: AuditResult): Promise<void>;
  status(): Promise<AuditStoreStatus>;
}

function assertImmutableBundle(previous: AuditResult, next: AuditResult) {
  if (canonicalJson(previous.bundle) !== canonicalJson(next.bundle) || previous.bundleHash !== next.bundleHash) {
    throw new Error('Audit bundles are immutable');
  }
}

function assertReviewParent(history: AuditResult[], latest: AuditResult | undefined, expected?: string) {
  if (!expected) return;
  const parent = history.find(item => item.auditId === expected);
  const latestHuman = history.filter(item => item.bundle.schemaVersion === 4).sort((a, b) => b.revision - a.revision)[0];
  const matches = parent?.bundle.schemaVersion === 4 ? latestHuman?.auditId === expected
    : latest?.auditId === expected && latest.bundle.intelligence?.reviewStatus === 'unreviewed';
  if (!matches) throw new Error('Review parent is no longer the latest unreviewed audit');
}

export class MemoryAuditStore implements AuditStore {
  private records: AuditResult[] = [];
  private publicationEvents: PublicationEvent[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string, authorize?: () => Promise<boolean>) {
    return this.serialize(async () => {
      const history = this.records.filter((record) => record.caseId === caseId && record.claimType === claimType);
      const latest = history.reduce<AuditResult | undefined>((current, item) => !current || item.revision > current.revision ? item : current, undefined);
      assertReviewParent(history, latest, expectedParentAuditId);
      if (authorize && !await authorize()) throw new PublicationError(403, 'Current reviewer authority is required');
      const revision = (latest?.revision || 0) + 1;
      const audit = build(revision);
      if (audit.caseId !== caseId || audit.sourceId !== _sourceId || audit.claimType !== claimType || audit.revision !== revision) throw new Error('Audit revision does not match its persistence key');
      const events = publicationEventsForCreate(audit, this.records, this.publicationEvents, expectedParentAuditId);
      this.records.push(audit);
      this.publicationEvents = events;
      return audit;
    });
  }

  async get(auditId: string) { return this.records.find((record) => record.auditId === auditId); }
  async publicationSnapshot() { return structuredClone({ audits: this.records, events: this.publicationEvents }); }
  async withdrawPublication(auditId: string, expectedVersion: number, reason: WithdrawalReason, actorId: string, authorize: () => Promise<boolean>) {
    return this.serialize(async () => {
      const event = withdrawalEvent({ audits: this.records, events: this.publicationEvents }, auditId, expectedVersion, reason, actorId);
      if (!await authorize()) throw new PublicationError(403, 'Current reviewer authority is required');
      this.publicationEvents = [...this.publicationEvents, event];
    });
  }
  async list(sourceId?: string, claimType?: AuditResult['claimType']) {
    return this.records.filter((record) => (!sourceId || record.sourceId === sourceId) && (!claimType || record.claimType === claimType));
  }
  async listPage(query: AuditPageQuery) {
    const records = this.records.filter((record) =>
      (query.sourceId === undefined || record.sourceId === query.sourceId)
      && (query.claimType === undefined || record.claimType === query.claimType));
    return pageAuditRecords(records, query);
  }
  async replace(audit: AuditResult) {
    const index = this.records.findIndex((record) => record.auditId === audit.auditId);
    if (index < 0) throw new Error('Audit not found');
    assertImmutableBundle(this.records[index], audit);
    this.records[index] = audit;
  }
  async status(): Promise<AuditStoreStatus> { return { backend: 'memory', persistent: false, ready: true }; }
}

export class FileAuditStore implements AuditStore {
  private queue: Promise<unknown> = Promise.resolve();
  private cache: { stamp: string; records: AuditResult[]; intents: AnchorIntent[]; publicationEvents: PublicationEvent[] } | null = null;
  private intents: AnchorIntent[] = [];
  private publicationEvents: PublicationEvent[] = [];
  private observed = false;

  constructor(readonly path: string) {}

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private stamp(info: BigIntStats) {
    return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  }

  private async readState(): Promise<{ stamp: string; records: AuditResult[]; intents: AnchorIntent[]; publicationEvents: PublicationEvent[] }> {
    let initialized = false;
    try {
      const marker = await open(`${this.path}.initialized`, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await marker.stat();
        if (!info.isFile() || info.size !== Buffer.byteLength('methane-audit-v1\n') || (info.mode & 0o077) !== 0 || await marker.readFile('utf8') !== 'methane-audit-v1\n') throw new Error('Invalid audit initialization marker');
        initialized = true;
      } finally { await marker.close(); }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let before: BigIntStats;
      try {
        before = await stat(this.path, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        if (this.observed || initialized) throw new Error('Initialized audit store is missing');
        this.intents = [];
        this.publicationEvents = [];
        this.cache = { stamp: 'missing', records: [], intents: [], publicationEvents: [] };
        return this.cache;
      }
      const beforeStamp = this.stamp(before);
      if (!before.isFile() || (before.mode & 0o077n) !== 0n || before.size > 64n * 1024n * 1024n) throw new Error('Unsafe audit store file');
      if (this.cache?.stamp === beforeStamp) { this.intents = this.cache.intents; this.publicationEvents = this.cache.publicationEvents; return this.cache; }

      const file = await open(this.path, constants.O_RDONLY | constants.O_NOFOLLOW);
      let contents: string;
      try { contents = await file.readFile('utf8'); } finally { await file.close(); }
      const after = await stat(this.path, { bigint: true });
      const afterStamp = this.stamp(after);
      if (beforeStamp !== afterStamp) continue;
      const parsed = JSON.parse(contents) as unknown;
      const envelope = parsed as { schemaVersion?: number; audits?: AuditResult[]; anchorIntents?: unknown[]; publicationEvents?: unknown[] };
      const records = Array.isArray(parsed) ? parsed : [1, 2].includes(envelope?.schemaVersion!) && Array.isArray(envelope.audits) ? envelope.audits : null;
      if (!records) throw new Error('Invalid audit store envelope');
      this.intents = Array.isArray(parsed) ? [] : AnchorIntent.array().parse(envelope.anchorIntents);
      this.observed = true;
      const legacy = Array.isArray(parsed) || (envelope.schemaVersion === 1 && envelope.publicationEvents === undefined);
      this.publicationEvents = legacy ? migrateLegacyPublications(records as AuditResult[])
        : validatePublicationEvents(envelope.publicationEvents, records as AuditResult[]);
      this.cache = { stamp: afterStamp, records: records as AuditResult[], intents: this.intents, publicationEvents: this.publicationEvents };
      return this.cache;
    }
    throw new Error('Audit store changed repeatedly while it was being read');
  }

  private async readAll(): Promise<AuditResult[]> { return (await this.readState()).records; }

  private async writeAll(records: AuditResult[], intents = this.intents, publicationEvents = this.publicationEvents) {
    validatePublicationEvents(publicationEvents, records);
    const contents = JSON.stringify({ schemaVersion: 2, audits: records, anchorIntents: intents, publicationEvents });
    if (Buffer.byteLength(contents) > 64 * 1024 * 1024) throw new Error('Audit store capacity exceeded');
    const persist = async (path: string, text: string) => {
      const temporary = `${path}.${randomUUID()}.tmp`;
      try {
        const file = await open(temporary, 'wx', 0o600);
        try { await file.writeFile(text, 'utf8'); await file.sync(); } finally { await file.close(); }
        await rename(temporary, path);
        const directory = await open(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY);
        try { await directory.sync(); } finally { await directory.close(); }
      } finally { await unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
    };
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    this.cache = null;
    await persist(this.path, contents);
    await persist(`${this.path}.initialized`, 'methane-audit-v1\n');
    this.observed = true;
    this.intents = intents;
    this.publicationEvents = publicationEvents;
  }

  async publicationSnapshot(): Promise<PublicationSnapshot> {
    const state = await this.readState();
    return structuredClone({ audits: state.records, events: state.publicationEvents });
  }
  async withdrawPublication(auditId: string, expectedVersion: number, reason: WithdrawalReason, actorId: string, authorize: () => Promise<boolean>) {
    return this.serialize(async () => {
      const audits = await this.readAll();
      const events = this.publicationEvents;
      const event = withdrawalEvent({ audits, events }, auditId, expectedVersion, reason, actorId);
      if (!await authorize()) throw new PublicationError(403, 'Current reviewer authority is required');
      await this.writeAll(audits, this.intents, [...events, event]);
    });
  }

  async getAnchorIntent(auditId: string) {
    await this.readAll();
    return structuredClone([...this.intents].reverse().find(i => i.auditId === auditId));
  }
  async reserveAnchor(audit: AuditResult, input?: AnchorDraft) {
    return this.serialize(async () => {
      const records = await this.readAll();
      const stored = records.find(r => r.auditId === audit.auditId);
      if (!stored) throw new Error('Audit not found');
      assertImmutableBundle(stored, audit);
      if (stored.anchored || this.intents.some(i => i.state === 'pending')) return false;
      const draft = AnchorDraft.parse(input);
      if (draft.auditId !== audit.auditId || audit.bundle.schemaVersion === 4 || audit.bundle.intelligence?.reviewStatus === 'unreviewed') throw new Error('Invalid anchor intent');
      // One dedicated issuer. Previously consumed nonces and case versions cannot be reused.
      if (this.intents.some(i => i.chainId === draft.chainId && i.issuer.toLowerCase() === draft.issuer.toLowerCase() && i.nonce >= draft.nonce)) return false;
      if (this.intents.some(i => i.chainId === draft.chainId && i.registryAddress.toLowerCase() === draft.registryAddress.toLowerCase()
        && i.caseId === audit.caseId && i.claimType === audit.claimType && i.state === 'confirmed' && i.expectedVersion >= draft.expectedVersion)) return false;
      const intent = AnchorIntent.parse({ ...draft, caseId: audit.caseId, claimType: audit.claimType, bundleHash: audit.bundleHash,
        state: 'pending', createdAt: new Date().toISOString() });
      await this.writeAll(records, [...this.intents, intent]);
      return true;
    });
  }
  async completeAnchor(audit: AuditResult) {
    await this.serialize(async () => {
      const records = [...await this.readAll()];
      const index = records.findIndex(r => r.auditId === audit.auditId);
      const intent = [...this.intents].reverse().find(i => i.auditId === audit.auditId);
      if (index < 0 || !intent || intent.state === 'reverted' || !receiptMatchesIntent(audit, intent)) throw new Error('Receipt does not match anchor intent');
      assertImmutableBundle(records[index], audit);
      if (intent.state === 'confirmed') {
        if (canonicalJson(records[index]) !== canonicalJson(audit)) throw new Error('Confirmed receipt is immutable');
        return;
      }
      records[index] = structuredClone(audit);
      await this.writeAll(records, this.intents.map(i => i.operationId === intent.operationId ? { ...i, state: 'confirmed' } : i));
    });
  }
  async markAnchorReverted(auditId: string) {
    await this.serialize(async () => {
      const records = await this.readAll();
      const intent = [...this.intents].reverse().find(i => i.auditId === auditId);
      if (!intent || intent.state !== 'pending') throw new Error('No pending intent');
      await this.writeAll(records, this.intents.map(i => i.operationId === intent.operationId ? { ...i, state: 'reverted' } : i));
    });
  }

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string, authorize?: () => Promise<boolean>) {
    return this.serialize(async () => {
      const records = [...await this.readAll()];
      const history = records.filter((record) => record.caseId === caseId && record.claimType === claimType);
      const latest = history.reduce<AuditResult | undefined>((current, item) => !current || item.revision > current.revision ? item : current, undefined);
      assertReviewParent(history, latest, expectedParentAuditId);
      if (authorize && !await authorize()) throw new PublicationError(403, 'Current reviewer authority is required');
      const revision = (latest?.revision || 0) + 1;
      const audit = build(revision);
      if (audit.caseId !== caseId || audit.sourceId !== _sourceId || audit.claimType !== claimType || audit.revision !== revision) throw new Error('Audit revision does not match its persistence key');
      const events = publicationEventsForCreate(audit, records, this.publicationEvents, expectedParentAuditId);
      records.push(audit);
      await this.writeAll(records, this.intents, events);
      return structuredClone(audit);
    });
  }

  async get(auditId: string) {
    const record = (await this.readAll()).find((item) => item.auditId === auditId);
    return record ? structuredClone(record) : undefined;
  }
  async list(sourceId?: string, claimType?: AuditResult['claimType']) {
    const records = (await this.readAll()).filter((record) =>
      (sourceId === undefined || record.sourceId === sourceId)
      && (claimType === undefined || record.claimType === claimType));
    return structuredClone(records);
  }
  async listPage(query: AuditPageQuery) {
    const records = (await this.readAll()).filter((record) =>
      (query.sourceId === undefined || record.sourceId === query.sourceId)
      && (query.claimType === undefined || record.claimType === query.claimType));
    const page = pageAuditRecords(records, query);
    return { ...page, audits: structuredClone(page.audits) };
  }
  async replace(audit: AuditResult) {
    await this.serialize(async () => {
      const records = [...await this.readAll()];
      const index = records.findIndex((record) => record.auditId === audit.auditId);
      if (index < 0) throw new Error('Audit not found');
      assertImmutableBundle(records[index], audit);
      records[index] = structuredClone(audit);
      await this.writeAll(records);
    });
  }
  async status(): Promise<AuditStoreStatus> {
    try {
      await this.readAll();
      return { backend: 'file', persistent: true, ready: true };
    } catch {
      return { backend: 'file', persistent: true, ready: false };
    }
  }
}

export function createFileAuditStore(): AuditStore {
  const path = process.env.AUDIT_STORE_PATH || resolve(import.meta.dir, '../../../data/state/audits.json');
  return new FileAuditStore(path);
}
