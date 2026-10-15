import { randomUUID } from 'node:crypto';
import { type BigIntStats } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AuditResult } from '@methane/shared';
import { canonicalJson } from './canonical';
import { pageAuditRecords, type AuditPage, type AuditPageOptions } from './audit-pagination';

export type AuditStoreStatus = { backend: 'memory' | 'file'; persistent: boolean; ready: boolean };
export type AuditPageQuery = AuditPageOptions & { sourceId?: string; claimType?: AuditResult['claimType'] };

export interface AuditStore {
  create(caseId: string, sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string): Promise<AuditResult>;
  get(auditId: string): Promise<AuditResult | undefined>;
  list(sourceId?: string, claimType?: AuditResult['claimType']): Promise<AuditResult[]>;
  listPage(query: AuditPageQuery): Promise<AuditPage>;
  replace(audit: AuditResult): Promise<void>;
  reserveAnchor?(audit: AuditResult): Promise<boolean>;
  completeAnchor?(audit: AuditResult): Promise<void>;
  status(): Promise<AuditStoreStatus>;
}

function assertImmutableBundle(previous: AuditResult, next: AuditResult) {
  if (canonicalJson(previous.bundle) !== canonicalJson(next.bundle) || previous.bundleHash !== next.bundleHash) {
    throw new Error('Audit bundles are immutable');
  }
}

export class MemoryAuditStore implements AuditStore {
  private records: AuditResult[] = [];
  private queue: Promise<unknown> = Promise.resolve();

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string) {
    return this.serialize(async () => {
      const history = this.records.filter((record) => record.caseId === caseId && record.claimType === claimType);
      const latest = history.reduce<AuditResult | undefined>((current, item) => !current || item.revision > current.revision ? item : current, undefined);
      if (expectedParentAuditId && (latest?.auditId !== expectedParentAuditId || latest.bundle.intelligence?.reviewStatus !== 'unreviewed')) {
        throw new Error('Review parent is no longer the latest unreviewed audit');
      }
      const revision = (latest?.revision || 0) + 1;
      const audit = build(revision);
      if (audit.caseId !== caseId || audit.sourceId !== _sourceId || audit.claimType !== claimType || audit.revision !== revision) throw new Error('Audit revision does not match its persistence key');
      this.records.push(audit);
      return audit;
    });
  }

  async get(auditId: string) { return this.records.find((record) => record.auditId === auditId); }
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
  private cache: { stamp: string; records: AuditResult[] } | null = null;

  constructor(readonly path: string) {}

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private stamp(info: BigIntStats) {
    return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  }

  private async readAll(): Promise<AuditResult[]> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let before: BigIntStats;
      try {
        before = await stat(this.path, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        if (this.cache?.stamp === 'missing') return this.cache.records;
        this.cache = { stamp: 'missing', records: [] };
        return this.cache.records;
      }
      const beforeStamp = this.stamp(before);
      if (this.cache?.stamp === beforeStamp) return this.cache.records;

      const contents = await readFile(this.path, 'utf8');
      const after = await stat(this.path, { bigint: true });
      const afterStamp = this.stamp(after);
      if (beforeStamp !== afterStamp) continue;
      const parsed = JSON.parse(contents) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Audit store file must contain a JSON array');
      this.cache = { stamp: afterStamp, records: parsed as AuditResult[] };
      return this.cache.records;
    }
    throw new Error('Audit store changed repeatedly while it was being read');
  }

  private async writeAll(records: AuditResult[]) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await rename(temporary, this.path);
    try {
      const info = await stat(this.path, { bigint: true });
      this.cache = { stamp: this.stamp(info), records };
    } catch {
      this.cache = null;
    }
  }

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string) {
    return this.serialize(async () => {
      const records = [...await this.readAll()];
      const history = records.filter((record) => record.caseId === caseId && record.claimType === claimType);
      const latest = history.reduce<AuditResult | undefined>((current, item) => !current || item.revision > current.revision ? item : current, undefined);
      if (expectedParentAuditId && (latest?.auditId !== expectedParentAuditId || latest.bundle.intelligence?.reviewStatus !== 'unreviewed')) {
        throw new Error('Review parent is no longer the latest unreviewed audit');
      }
      const revision = (latest?.revision || 0) + 1;
      const audit = build(revision);
      if (audit.caseId !== caseId || audit.sourceId !== _sourceId || audit.claimType !== claimType || audit.revision !== revision) throw new Error('Audit revision does not match its persistence key');
      records.push(audit);
      await this.writeAll(records);
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
