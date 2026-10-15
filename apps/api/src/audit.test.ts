import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { DEMO_SOURCES } from '@methane/shared';
import { assess, createAudit } from './audit';
import { app, createApp } from './app';
import { canonicalJson } from './canonical';
import { getIntelligenceSnapshot } from './intelligence-data';
import { loadCasebook } from './casebook';
import { MemoryAuditStore } from './store';

describe('conservative evidence baseline', () => {
  test('notification is not repair confirmation', () => {
    expect(assess(DEMO_SOURCES[0], 'mitigation_confirmed').result).toBe('insufficient_evidence');
    expect(assess(DEMO_SOURCES[0], 'operator_notified').result).toBe('supported');
  });
  test('synthetic explicit contrary record can yield contradiction', () => {
    expect(assess(DEMO_SOURCES[1], 'operator_notified').result).toBe('contradicted');
  });
  test('synthetic confirmation must be typed confirmation', () => {
    expect(assess(DEMO_SOURCES[1], 'mitigation_confirmed').result).toBe('supported');
  });
  test('claim-specific evidence cannot support a different claim type', () => {
    const detectionTaggedForNotification = {
      ...DEMO_SOURCES[0].evidence[0]!,
      claimType: 'operator_notified' as const,
    };
    const source = { ...DEMO_SOURCES[0], evidence: [detectionTaggedForNotification] };
    expect(assess(source, 'source_detected')).toMatchObject({
      result: 'insufficient_evidence',
      evidenceIds: [],
    });
  });
  test('no evidence means unknown not false', () => {
    const empty = { ...DEMO_SOURCES[0], evidence: [] };
    expect(assess(empty, 'source_detected').result).toBe('insufficient_evidence');
  });
});

describe('API contract', () => {
  test('health endpoint checks both durable storage status and pinned casebook availability', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const health = await res.json();
    expect(health.status).toBe('ok');
    expect(health.casebookReady).toBe(true);
    expect(health.storage.backend).toBe('memory');
  });

  test('serves the pinned non-synthetic MARS casebook separately from demo fixtures', async () => {
    const res = await app.request('/api/cases');
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.synthetic).toBe(false);
    expect(payload.cases.map((item: { sourceId: string }) => item.sourceId)).toEqual(['KAZ_S_159', 'LBY_S_143', 'ARG_S_055', 'CAN_S_002']);
    expect(payload.provenance.archiveSha256).toBe('675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43');
  });

  test('keeps the active curated casebook on the same versioned MARS snapshot as intelligence', async () => {
    const [casebook, snapshot] = await Promise.all([loadCasebook(), getIntelligenceSnapshot()]);
    const datasetSnapshotId = snapshot.datasetSnapshotId;
    const archiveSha256 = snapshot.upstreamArchiveSha256;
    if (typeof datasetSnapshotId !== 'string' || typeof archiveSha256 !== 'string') {
      throw new Error('Active intelligence snapshot is missing its dataset binding');
    }
    expect(casebook.provenance.snapshotId).toBe(datasetSnapshotId);
    expect(casebook.provenance.archiveSha256).toBe(archiveSha256);
  });

  test('preserves UNEP persistency fields in the source record instead of recomputing them', async () => {
    const res = await app.request('/api/cases');
    const payload = await res.json();
    const source = payload.cases[0].source;
    expect(source.persistency).toBe(0.67);
    expect(source.persistencyStd).toBe(0.27);
    expect(source.persistencyCategory).toBe('frequent');
    expect(payload.cases[0].plumes[0].tileDate).toBe('2024-06-07T08:05:04');
    expect(payload.cases[0].plumes[0].fluxKgHr).toBe(591);
    expect(payload.cases[0].plumes[0].fluxStdKgHr).toBe(335);
  });

  test('publishes ranked-source metadata as heuristic and explicitly withholds an unvalidated forecast', async () => {
    const res = await app.request('/api/intelligence/rankings');
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.snapshot.modelVersion).toBe('transparent-priority-v5');
    expect(payload.snapshot.observedTrendMethod.methodVersion).toBe('theil-sen-event-trend-v1');
    expect(payload.snapshot.recordRecurrenceModel.status).toBe('historical_backtest_passed');
    expect(payload.snapshot.recordRecurrenceModel.testCohort.rocAuc).toBeGreaterThan(0.80);
    expect(payload.snapshot.publisherIndicatorComparison).toMatchObject({
      status: 'available', datasetSnapshotId: 'unep-mars-675417694883', horizonDays: 365,
      persistencyCoverage: { numericReportedCount: 3059, emissionStatusReportedCount: 0 },
    });
    expect(payload.rankings.length).toBeGreaterThan(0);
    expect(payload.rankings.every((row: { priorityType: string }) => row.priorityType === 'heuristic_not_probability')).toBe(true);
    const dza = payload.rankings.find((row: { sourceId: string }) => row.sourceId === 'DZA_S_012');
    expect(dza.recordRecurrenceForecast).toMatchObject({ status: 'available', horizonDays: 365, target: 'at_least_one_future_linked_mars_detection_record' });
    expect(dza.recordRecurrenceForecast.probability).toBeCloseTo(0.918307, 6);
    expect(payload.forecast.status).toBe('not_available');
    expect(payload.forecast.reason).toContain('independent');
    expect(payload.forecast.missingRequirements).toEqual([
      'complete_observation_opportunities', 'independent_future_outcome_labels', 'held_out_temporal_validation',
    ]);
  });

  test('source API keeps the observation timestamp, plume coordinates, units, uncertainty, and provenance fields', async () => {
    const res = await app.request('/api/sources/KAZ_S_159');
    const source = await res.json();
    expect(source.maxFluxKgHr).toBe(591);
    expect(source.observations[0]).toMatchObject({
      id: '82758651-76f4-4e06-b4ab-c247ce765192',
      date: '2024-06-07T08:05:04',
      fluxKgHr: 591,
      uncertaintyKgHr: 335,
      fluxUnit: 'kg/h',
      lat: 43.41337,
      lon: 52.91829,
      tile: 'ENMAP01-____L1B-DT0000076517_20240607T080504Z_001_V010402_20240610T205144Z',
      detectionInstitution: 'UNEP IMEO MARS',
    });
    expect(source.provenance.archiveSha256).toBe('675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43');
  });

  test('audits observed MARS detections with plume-level citations', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }) });
    expect(res.status).toBe(201);
    const audit = await res.json();
    expect(audit.result).toBe('supported');
    expect(audit.synthetic).toBe(false);
    expect(audit.bundle.citedEvidence.map((item: { id: string }) => item.id)).toContain('7529d451-018f-4da3-9114-59b76c3a3bcd');
    expect(audit.bundle.provenance.archiveSha256).toBe('675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43');
  });

  test('lets a non-curated pinned MARS source audit its recorded detection without inferring notification or mitigation', async () => {
    const snapshot = await getIntelligenceSnapshot();
    const casebook = await loadCasebook();
    const curatedIds = new Set(casebook.cases.map((item) => item.sourceId));
    const row = snapshot.sources.find((item) => !curatedIds.has(item.sourceId) && item.observationIds.length > 0);
    expect(row).toBeDefined();
    const sourceId = row!.sourceId;

    const detectionResponse = await app.request('/api/audits', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId, claimType: 'source_detected' }),
    });
    expect(detectionResponse.status).toBe(201);
    const detection = await detectionResponse.json();
    expect(detection.result).toBe('supported');
    expect(detection.caseId).toBe(`mars:${snapshot.datasetSnapshotId}:${sourceId}`);
    expect(detection.bundle.provenance.snapshotId).toBe(snapshot.datasetSnapshotId);
    expect(detection.bundle.provenance.archiveSha256).toBe(snapshot.upstreamArchiveSha256);
    expect(row!.observationIds).toContain(detection.bundle.citedEvidence[0].id);
    const verificationResponse = await app.request(`/api/audits/${detection.auditId}/verify`);
    expect(verificationResponse.status).toBe(200);
    expect(await verificationResponse.json()).toMatchObject({ integrityVerified: false, localDigestValid: true, status: 'not_configured' });

    for (const claimType of ['operator_notified', 'mitigation_confirmed'] as const) {
      const response = await app.request('/api/audits', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId, claimType }),
      });
      expect(response.status).toBe(201);
      const audit = await response.json();
      expect(audit.result).toBe('insufficient_evidence');
      expect(audit.bundle.citedEvidence).toEqual([]);
      expect(audit.bundle.provenance.snapshotId).toBe(snapshot.datasetSnapshotId);
    }
  });

  test('does not infer mitigation from notification, feedback, or link-only publisher records', async () => {
    for (const sourceId of ['KAZ_S_159', 'CAN_S_002']) {
      const res = await app.request('/api/audits', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId, claimType: 'mitigation_confirmed' }),
      });
      expect(res.status).toBe(201);
      const audit = await res.json();
      expect(audit.result).toBe('insufficient_evidence');
      expect(audit.bundle.citedEvidence).toEqual([]);
      expect(audit.bundle.externalEvidence[0].contentIncluded).toBe(false);
      expect(audit.bundle.limitations).toContain('Linked report content is not included or independently reviewed.');
    }
  });

  test('source-level notified metadata does not prove that the operator was notified', async () => {
    const sourcesResponse = await app.request('/api/sources');
    const sources = await sourcesResponse.json();
    const source = sources.sources.find((item: { sourceId: string }) => item.sourceId === 'KAZ_S_159');
    expect(source.notified).toBe('Yes');
    expect(source.evidence).toContainEqual(expect.objectContaining({
      id: 'KAZ_S_159:notification-status',
      kind: 'metadata_notification',
    }));

    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'operator_notified' }) });
    expect(res.status).toBe(201);
    const audit = await res.json();
    expect(audit.result).toBe('insufficient_evidence');
    expect(audit.bundle.citedEvidence).toHaveLength(0);
  });

  test('rejects malformed inputs', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'magic' }) });
    expect(res.status).toBe(400);
  });
  test('rejects an oversized streamed JSON body before parsing it', async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(pulls === 1 ? 16_385 : 1));
        if (pulls === 3) controller.close();
      },
      cancel() { cancelled = true; },
    });
    const request = new Request('http://localhost/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(request.headers.has('content-length')).toBe(false);
    const response = await app.fetch(request);
    expect(response.status).toBe(413);
    // WHATWG streams may prefetch one chunk while delivering the first read;
    // the guard must still cancel before it drains the complete body.
    expect(pulls).toBeLessThan(3);
    expect(cancelled).toBe(true);
  });
  test('reports a casebook outage instead of disguising it as an unknown real source', async () => {
    const unavailable = async () => { throw new Error('casebook unavailable'); };
    const unavailableApp = createApp(new MemoryAuditStore(), {
      load: unavailable,
      list: unavailable,
      find: unavailable,
    });
    const response = await unavailableApp.request('/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceId: 'ZZZ_S_999999', claimType: 'source_detected' }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('casebook is unavailable');
    const health = await unavailableApp.request('/api/health');
    expect(health.status).toBe(503);
    expect((await health.json()).casebookReady).toBe(false);
  });
  test('creates an explicitly unanchored synthetic audit', async () => {
    const res = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'mitigation_confirmed' }) });
    expect(res.status).toBe(201);
    const result = await res.json();
    expect(result.result).toBe('insufficient_evidence');
    expect(result.synthetic).toBe(true);
    expect(result.anchored).toBe(false);
    expect(result.bundleHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect('0x' + createHash('sha256').update(canonicalJson(result.bundle)).digest('hex')).toBe(result.bundleHash);
  });

  test('lists immutable audit revisions for a source claim', async () => {
    const created = await app.request('/api/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceId: 'DEMO-001', claimType: 'source_detected' }) });
    const audit = await created.json();
    const res = await app.request('/api/audits?sourceId=DEMO-001&claimType=source_detected');
    expect(res.status).toBe(200);
    const history = await res.json();
    expect(history.audits.some((item: { auditId: string }) => item.auditId === audit.auditId)).toBe(true);
    expect(audit.revision).toBe(1);
    expect(audit.bundle.revision).toBe(1);
  });

  test('supports stable audit cursor pages and keeps the legacy unpaged response shape', async () => {
    const store = new MemoryAuditStore();
    for (const claimType of ['source_detected', 'operator_notified', 'mitigation_confirmed'] as const) {
      await store.create('DEMO-001', 'DEMO-001', claimType, revision =>
        createAudit(DEMO_SOURCES[0], { sourceId: 'DEMO-001', claimType }, { revision }));
    }
    const pagedApp = createApp(store);
    const first = await pagedApp.request('/api/audits?sourceId=DEMO-001&limit=2');
    expect(first.status).toBe(200);
    const firstPage = await first.json();
    expect(firstPage.audits).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(typeof firstPage.nextCursor).toBe('string');

    const second = await pagedApp.request(`/api/audits?sourceId=DEMO-001&limit=2&cursor=${encodeURIComponent(firstPage.nextCursor)}`);
    const secondPage = await second.json();
    expect(secondPage.audits).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);
    expect(new Set([...firstPage.audits, ...secondPage.audits].map((item: { auditId: string }) => item.auditId)).size).toBe(3);

    const legacy = await pagedApp.request('/api/audits?sourceId=DEMO-001');
    const legacyBody = await legacy.json();
    expect(Object.keys(legacyBody).sort()).toEqual(['audits']);
    expect(legacyBody.audits).toHaveLength(3);
    expect((await pagedApp.request('/api/audits?limit=0')).status).toBe(400);
    expect((await pagedApp.request('/api/audits?cursor=invalid')).status).toBe(400);
  });
  test('anchoring requires a secret even when no chain configured', async () => {
    const res = await app.request('/api/audits/unknown/anchor', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  test('throttles anonymous audit writes by socket client and ignores spoofed forwarding headers', async () => {
    let now = 1_000;
    const store = new MemoryAuditStore();
    const limitedApp = createApp(store, undefined, undefined, {
      auditRateLimit: { limit: 1, windowMs: 60_000, now: () => now },
    });
    const write = (clientAddress: string, forwardedFor: string) => limitedApp.fetch(new Request('http://localhost/api/audits', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': forwardedFor },
      body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }),
    }), { clientAddress });

    const first = await write('192.0.2.10', '203.0.113.10');
    expect(first.status).toBe(201);
    expect(first.headers.get('x-ratelimit-limit')).toBe('1');
    expect(first.headers.get('x-ratelimit-remaining')).toBe('0');

    const blocked = await write('192.0.2.10', '203.0.113.11');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect(await blocked.json()).toEqual({ error: 'Too many audit requests; try again later.' });
    expect((await store.list()).length).toBe(1);

    expect((await write('192.0.2.11', '203.0.113.10')).status).toBe(201);
    now += 60_000;
    expect((await write('192.0.2.10', '203.0.113.10')).status).toBe(201);
  });

  test('keeps the prototype API healthy in production mode with process-local rate limits', async () => {
    const names = ['NODE_ENV', 'ENABLE_PUBLIC_BASELINE_AUDITS'] as const;
    const previous = new Map(names.map(name => [name, process.env[name]]));
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_PUBLIC_BASELINE_AUDITS = 'true';
    try {
      const store = new MemoryAuditStore();
      const productionApp = createApp(store);
      const health = await productionApp.request('/api/health');
      expect(health.status).toBe(200);
      expect((await health.json()).rateLimits).toEqual({ backend: 'process-local', shared: false, required: false, ready: true });
      const response = await productionApp.fetch(new Request('http://localhost/api/audits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId: 'KAZ_S_159', claimType: 'source_detected' }),
      }), { clientAddress: '192.0.2.70' });

      expect(response.status).toBe(201);
      expect((await store.list()).length).toBe(1);
    } finally {
      for (const [name, value] of previous) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});
