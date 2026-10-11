import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AuditResult } from '@methane/shared';
import { canonicalJson } from './canonical';

export type AuditStoreStatus = { backend: 'memory' | 'file' | 'postgres'; persistent: boolean; ready: boolean };

export interface AuditStore {
  create(caseId: string, sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult): Promise<AuditResult>;
  get(auditId: string): Promise<AuditResult | undefined>;
  list(sourceId?: string, claimType?: AuditResult['claimType']): Promise<AuditResult[]>;
  replace(audit: AuditResult): Promise<void>;
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

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult) {
    return this.serialize(async () => {
      const revision = Math.max(0, ...this.records.filter((record) => record.caseId === caseId && record.claimType === claimType).map((record) => record.revision)) + 1;
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

  constructor(readonly path: string) {}

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async readAll(): Promise<AuditResult[]> {
    try {
      const contents = await readFile(this.path, 'utf8');
      const records = JSON.parse(contents) as unknown;
      if (!Array.isArray(records)) throw new Error('Audit store file must contain a JSON array');
      return records as AuditResult[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeAll(records: AuditResult[]) {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(records, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await rename(temporary, this.path);
  }

  async create(caseId: string, _sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult) {
    return this.serialize(async () => {
      const records = await this.readAll();
      const revision = Math.max(0, ...records.filter((record) => record.caseId === caseId && record.claimType === claimType).map((record) => record.revision)) + 1;
      const audit = build(revision);
      if (audit.caseId !== caseId || audit.sourceId !== _sourceId || audit.claimType !== claimType || audit.revision !== revision) throw new Error('Audit revision does not match its persistence key');
      records.push(audit);
      await this.writeAll(records);
      return audit;
    });
  }

  async get(auditId: string) { return (await this.readAll()).find((record) => record.auditId === auditId); }
  async list(sourceId?: string, claimType?: AuditResult['claimType']) {
    return (await this.readAll()).filter((record) => (!sourceId || record.sourceId === sourceId) && (!claimType || record.claimType === claimType));
  }
  async replace(audit: AuditResult) {
    await this.serialize(async () => {
      const records = await this.readAll();
      const index = records.findIndex((record) => record.auditId === audit.auditId);
      if (index < 0) throw new Error('Audit not found');
      assertImmutableBundle(records[index], audit);
      records[index] = audit;
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

export async function createConfiguredAuditStore(): Promise<AuditStore> {
  if (process.env.DATABASE_URL) {
    const { PostgresAuditStore } = await import('./postgres-store');
    return PostgresAuditStore.connect(process.env.DATABASE_URL);
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production; file storage may be ephemeral.');
  const path = process.env.AUDIT_STORE_PATH || resolve(import.meta.dir, '../../../data/state/audits.json');
  return new FileAuditStore(path);
}
