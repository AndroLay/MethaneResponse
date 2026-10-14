import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_SOURCES } from '@methane/shared';
import { createAudit } from './audit';
import { createConfiguredAuditStore, FileAuditStore, MemoryAuditStore } from './store';

describe('file-backed audit store', () => {
  test('keeps audit bundles and assigns increasing revisions after reopening', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-response-store-'));
    const path = join(directory, 'audits.json');
    try {
      const firstStore = new FileAuditStore(path);
      const first = await firstStore.create('DEMO-001', 'DEMO-001', 'source_detected', (revision) => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
      const reopened = new FileAuditStore(path);
      expect((await reopened.get(first.auditId))?.bundle).toEqual(first.bundle);
      const second = await reopened.create('DEMO-001', 'DEMO-001', 'source_detected', (revision) => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
      expect(second.revision).toBe(2);
      expect(second.bundle.revision).toBe(2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('serializes concurrent revisions and rejects bundle replacement', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-response-store-'));
    const path = join(directory, 'audits.json');
    try {
      const store = new FileAuditStore(path);
      const audits = await Promise.all(Array.from({ length: 6 }, () => store.create('DEMO-001', 'DEMO-001', 'source_detected', (revision) => createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }))));
      expect(audits.map((item) => item.revision).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
      await expect(store.replace({ ...audits[0], bundle: { ...audits[0].bundle, reason: 'tampered' } })).rejects.toThrow('Audit bundles are immutable');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('invalidates cached reads when another store instance atomically replaces the file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-response-store-cache-'));
    const path = join(directory, 'audits.json');
    try {
      const firstStore = new FileAuditStore(path);
      const first = await firstStore.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
      expect(await firstStore.list()).toHaveLength(1);

      const otherStore = new FileAuditStore(path);
      await otherStore.create('DEMO-001', 'DEMO-001', 'operator_notified', revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'operator_notified' }, { revision }));

      expect((await firstStore.list()).map(item => item.auditId)).toHaveLength(2);
      expect((await firstStore.get(first.auditId))?.auditId).toBe(first.auditId);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('serves bounded source audit pages in stable order', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'methane-response-store-page-'));
    try {
      const store = new FileAuditStore(join(directory, 'audits.json'));
      await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
      await store.create('DEMO-001', 'DEMO-001', 'operator_notified', revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'operator_notified' }, { revision }));
      await store.create('DEMO-001', 'DEMO-001', 'mitigation_confirmed', revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'mitigation_confirmed' }, { revision }));

      const first = await store.listPage({ sourceId: 'DEMO-001', limit: 2, visibility: 'all' });
      expect(first.audits).toHaveLength(2);
      expect(first.hasMore).toBe(true);
      expect(first.nextCursor).not.toBeNull();
      const second = await store.listPage({ sourceId: 'DEMO-001', limit: 2, visibility: 'all', before: first.nextCursor });
      expect(second.audits).toHaveLength(1);
      expect(second.hasMore).toBe(false);
      expect(new Set([...first.audits, ...second.audits].map(item => item.auditId)).size).toBe(3);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('uses durable local file storage by default and refuses ephemeral production storage', async () => {
    const env = { nodeEnv: process.env.NODE_ENV, databaseUrl: process.env.DATABASE_URL, auditPath: process.env.AUDIT_STORE_PATH };
    const directory = await mkdtemp(join(tmpdir(), 'methane-response-config-'));
    try {
      delete process.env.NODE_ENV;
      delete process.env.DATABASE_URL;
      process.env.AUDIT_STORE_PATH = join(directory, 'audits.json');
      const localStore = await createConfiguredAuditStore();
      expect(await localStore.status()).toEqual({ backend: 'file', persistent: true, ready: true });

      process.env.NODE_ENV = 'production';
      await expect(createConfiguredAuditStore()).rejects.toThrow('DATABASE_URL is required in production');
    } finally {
      if (env.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env.nodeEnv;
      if (env.databaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = env.databaseUrl;
      if (env.auditPath === undefined) delete process.env.AUDIT_STORE_PATH; else process.env.AUDIT_STORE_PATH = env.auditPath;
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test('a review cannot append to a parent that is no longer the latest audit revision', async () => {
  const store = new MemoryAuditStore();
  const parent = await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
    createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
  await store.create('DEMO-001', 'DEMO-001', 'source_detected', revision =>
    createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision }));
  let staleBuilderCalled = false;

  await expect(store.create('DEMO-001', 'DEMO-001', 'source_detected', revision => {
    staleBuilderCalled = true;
    return createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType: 'source_detected' }, { revision });
  }, parent.auditId)).rejects.toThrow('Review parent is no longer the latest unreviewed audit');
  expect(staleBuilderCalled).toBe(false);
  expect((await store.list('DEMO-001', 'source_detected')).map(item => item.revision)).toEqual([1, 2]);
});
