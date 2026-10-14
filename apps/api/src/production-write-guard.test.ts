import { expect, test } from 'bun:test';
import { createApp } from './app';
import { MemoryAuditStore } from './store';

test('production baseline audit writes require explicit public opt-in or an admin token', async () => {
  const names = ['NODE_ENV', 'ENABLE_PUBLIC_BASELINE_AUDITS', 'ADMIN_API_TOKEN'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const body = JSON.stringify({ sourceId: 'DEMO-001', claimType: 'source_detected' });
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ENABLE_PUBLIC_BASELINE_AUDITS;
    delete process.env.ADMIN_API_TOKEN;
    const denied = await createApp(new MemoryAuditStore()).request('/api/audits', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
    });
    expect(denied.status).toBe(401);

    process.env.ENABLE_PUBLIC_BASELINE_AUDITS = 'true';
    const optedIn = await createApp(new MemoryAuditStore()).request('/api/audits', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
    });
    expect(optedIn.status).toBe(201);
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
