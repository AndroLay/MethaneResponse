import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AuditResult, MarsCasebook as MarsCasebookType } from '@methane/shared';
import type { AuditStore, AuditStoreStatus, AuditPageQuery } from './store';
import { canonicalJson } from './canonical';
import { loadCasebook, sourceFromCase } from './casebook';
import { pageAuditRecords, type AuditPage } from './audit-pagination';
import type { RateLimitDecision, RateLimitScope } from './rate-limit';

type Sql = ReturnType<typeof postgres>;
const migrationsDirectory = resolve(import.meta.dir, '../../../platform/database/migrations');

function asUtc(value: string) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
}

async function applyMigrations(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS methane_schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const files = (await readdir(migrationsDirectory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
  for (const filename of files) {
    const alreadyApplied = await sql`SELECT filename FROM methane_schema_migrations WHERE filename = ${filename}`;
    if (alreadyApplied.length) continue;
    const migration = await readFile(resolve(migrationsDirectory, filename), 'utf8');
    await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext('methane-response:migrations'))`;
      const raced = await transaction`SELECT filename FROM methane_schema_migrations WHERE filename = ${filename} FOR UPDATE`;
      if (raced.length) return;
      await transaction.unsafe(migration);
      await transaction`INSERT INTO methane_schema_migrations (filename) VALUES (${filename})`;
    });
  }
}

async function seedCasebook(sql: Sql, book: MarsCasebookType) {
  await sql.begin(async (transaction) => {
    for (const item of book.cases) {
      const source = item.source;
      await transaction`
        INSERT INTO sources (
          source_id, case_id, name, sector, source_type, location, synthetic,
          original_dataset_url, source_license, retrieved_at, raw_sha256,
          notified, feedback, feedback_operator, feedback_government, feedback_scope,
          provenance, case_metadata
        ) VALUES (
          ${item.sourceId}, ${item.caseId}, ${item.sourceId}, ${source.sector}, ${source.sourceType},
          ST_SetSRID(ST_MakePoint(${source.lon}, ${source.lat}), 4326), FALSE,
          ${book.provenance.downloadUrl}, ${book.provenance.license}, ${book.provenance.retrievedAt}, ${book.provenance.archiveSha256},
          ${source.notified}, ${source.feedback}, ${source.feedbackOperator}, ${source.feedbackGovernment}, ${source.feedbackScope},
          ${transaction.json(book.provenance as never)}, ${transaction.json({ purpose: item.purpose, externalEvidence: item.externalEvidence, limitations: book.limitations } as never)}
        ) ON CONFLICT (source_id) DO UPDATE SET
          case_id = EXCLUDED.case_id, name = EXCLUDED.name, sector = EXCLUDED.sector, source_type = EXCLUDED.source_type,
          location = EXCLUDED.location, synthetic = FALSE, original_dataset_url = EXCLUDED.original_dataset_url,
          source_license = EXCLUDED.source_license, retrieved_at = EXCLUDED.retrieved_at, raw_sha256 = EXCLUDED.raw_sha256,
          notified = EXCLUDED.notified, feedback = EXCLUDED.feedback, feedback_operator = EXCLUDED.feedback_operator,
          feedback_government = EXCLUDED.feedback_government, feedback_scope = EXCLUDED.feedback_scope,
          provenance = EXCLUDED.provenance, case_metadata = EXCLUDED.case_metadata`;

      for (const plume of item.plumes) {
        await transaction`
          INSERT INTO observations (plume_id, source_id, observed_at, flux_kg_hr, flux_std_kg_hr, notified, provenance)
          VALUES (
            ${plume.plumeId}, ${item.sourceId}, ${asUtc(plume.tileDate)}, ${plume.fluxKgHr}, ${plume.fluxStdKgHr}, ${plume.notified},
            ${transaction.json({ satellite: plume.satellite, tile: plume.tile, actionable: plume.actionable, detectionInstitution: plume.detectionInstitution, linkStatus: plume.linkStatus } as never)}
          ) ON CONFLICT (plume_id) DO UPDATE SET
            source_id = EXCLUDED.source_id, observed_at = EXCLUDED.observed_at,
            flux_kg_hr = EXCLUDED.flux_kg_hr, flux_std_kg_hr = EXCLUDED.flux_std_kg_hr,
            notified = EXCLUDED.notified, provenance = EXCLUDED.provenance`;
      }

      const reviewSource = sourceFromCase(item, book.provenance.catalogUrl, book.provenance);
      for (const evidence of reviewSource.evidence) {
        await transaction`
          INSERT INTO evidence (evidence_id, source_id, kind, claim_type, title, source_url, date, synthetic)
          VALUES (${evidence.id}, ${item.sourceId}, ${evidence.kind}, ${evidence.claimType || null}, ${evidence.title}, ${evidence.reference}, ${evidence.date?.slice(0, 10) || null}, FALSE)
          ON CONFLICT (evidence_id) DO UPDATE SET
            source_id = EXCLUDED.source_id, kind = EXCLUDED.kind, claim_type = EXCLUDED.claim_type,
            title = EXCLUDED.title, source_url = EXCLUDED.source_url, date = EXCLUDED.date, synthetic = FALSE`;
      }
    }
  });
}

export class PostgresAuditStore implements AuditStore {
  private constructor(private readonly sql: Sql) {}
  private nextRateLimitPruneAt = 0;

  static async connect(databaseUrl: string) {
    const sql = postgres(databaseUrl, { max: 5, connect_timeout: 10, idle_timeout: 20, prepare: false });
    const store = new PostgresAuditStore(sql);
    try {
      await sql`SELECT 1`;
      await applyMigrations(sql);
      await seedCasebook(sql, await loadCasebook());
      return store;
    } catch (error) {
      await sql.end({ timeout: 2 });
      throw error;
    }
  }

  async create(caseId: string, sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult, expectedParentAuditId?: string) {
    return this.sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${caseId}:${claimType}`}, 0::BIGINT))`;
      const [latest] = await transaction`
        SELECT audit_id, revision, result_json FROM audits
        WHERE case_id = ${caseId} AND claim_type = ${claimType}
        ORDER BY revision DESC LIMIT 1`;
      if (expectedParentAuditId && (latest?.audit_id !== expectedParentAuditId
          || (latest.result_json as AuditResult).bundle.intelligence?.reviewStatus !== 'unreviewed')) {
        throw new Error('Review parent is no longer the latest unreviewed audit');
      }
      const nextRevision = Number(latest?.revision || 0) + 1;
      const audit = build(nextRevision);
      if (audit.caseId !== caseId || audit.sourceId !== sourceId || audit.claimType !== claimType || audit.revision !== nextRevision) throw new Error('Audit revision does not match its persistence key');
      const provenance = audit.bundle.provenance;
      await transaction`
        INSERT INTO sources (
          source_id, case_id, name, synthetic, original_dataset_url, source_license,
          retrieved_at, raw_sha256, provenance, case_metadata
        ) VALUES (
          ${sourceId}, ${caseId}, ${sourceId}, ${audit.synthetic},
          ${provenance?.downloadUrl || provenance?.catalogUrl || null}, ${provenance?.license || null},
          ${provenance?.retrievedAt || null}, ${provenance?.archiveSha256 || null},
          ${transaction.json((provenance || {}) as never)},
          ${transaction.json({ registeredFromAudit: true, caseId } as never)}
        ) ON CONFLICT (source_id) DO NOTHING`;
      const [sourceRow] = await transaction`SELECT synthetic FROM sources WHERE source_id = ${sourceId}`;
      if (!sourceRow || Boolean(sourceRow.synthetic) !== audit.synthetic) throw new Error('Audit source record is missing or conflicts with the audit classification');
      await transaction`
        INSERT INTO audits (
          audit_id, case_id, source_id, claim_type, revision, result, reason,
          bundle_sha256, bundle_json, result_json, created_at
        ) VALUES (
          ${audit.auditId}, ${audit.caseId}, ${audit.sourceId}, ${audit.claimType}, ${audit.revision},
          ${audit.result}, ${audit.reason}, ${audit.bundleHash}, ${transaction.json(audit.bundle as never)},
          ${transaction.json(audit as never)}, ${audit.generatedAt}
        )`;
      return audit;
    });
  }

  async get(auditId: string) {
    const [row] = await this.sql`SELECT result_json FROM audits WHERE audit_id = ${auditId}::UUID`;
    return row?.result_json as AuditResult | undefined;
  }

  async list(sourceId?: string, claimType?: AuditResult['claimType']) {
    let rows;
    if (sourceId && claimType) rows = await this.sql`SELECT result_json FROM audits WHERE source_id = ${sourceId} AND claim_type = ${claimType}`;
    else if (sourceId) rows = await this.sql`SELECT result_json FROM audits WHERE source_id = ${sourceId}`;
    else if (claimType) rows = await this.sql`SELECT result_json FROM audits WHERE claim_type = ${claimType}`;
    else rows = await this.sql`SELECT result_json FROM audits`;
    return rows.map((row) => row.result_json as AuditResult);
  }

  async listPage(query: AuditPageQuery): Promise<AuditPage> {
    const filters = this.sql`
      ${query.sourceId !== undefined ? this.sql`AND source_id = ${query.sourceId}` : this.sql``}
      ${query.claimType !== undefined ? this.sql`AND claim_type = ${query.claimType}` : this.sql``}
      ${query.before ? this.sql`AND (created_at, audit_id) < (${new Date(query.before.generatedAt)}::TIMESTAMPTZ, ${query.before.auditId}::UUID)` : this.sql``}
      ${query.visibility === 'public' ? this.sql`AND (
        bundle_json->>'schemaVersion' = '2'
        OR (
          bundle_json->>'schemaVersion' = '3'
          AND bundle_json->'intelligence'->>'reviewStatus' = 'approved'
          AND bundle_json->'intelligence'->'citationPublication'->>'status' = 'public'
          AND bundle_json->'intelligence'->'citationPublication'->>'authorConsent' = 'true'
          AND (
            NOT (bundle_json->'intelligence' ? 'claimText')
            OR (
              bundle_json->'intelligence'->'claimPublication'->>'status' = 'public'
              AND bundle_json->'intelligence'->'claimPublication'->>'authorConsent' = 'true'
            )
          )
        )
      )` : this.sql``}
    `;
    const rows = await this.sql`
      SELECT result_json FROM audits
      WHERE TRUE ${filters}
      ORDER BY created_at DESC, audit_id DESC
      LIMIT ${query.limit + 1}
    `;
    return pageAuditRecords(rows.map(row => row.result_json as AuditResult), query);
  }

  private async pruneExpiredRateLimitBuckets() {
    const currentTime = Date.now();
    if (currentTime < this.nextRateLimitPruneAt) return;
    this.nextRateLimitPruneAt = currentTime + 60_000;
    try {
      await this.sql`
        WITH expired AS (
          SELECT ctid FROM api_rate_limit_buckets
          WHERE reset_at <= now() - interval '1 minute'
          ORDER BY reset_at
          LIMIT 500
          FOR UPDATE SKIP LOCKED
        )
        DELETE FROM api_rate_limit_buckets AS buckets
        USING expired
        WHERE buckets.ctid = expired.ctid`;
    } catch (error) {
      this.nextRateLimitPruneAt = 0;
      throw error;
    }
  }

  async consumeRateLimit(scope: RateLimitScope, clientKeyHash: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    if (!/^[0-9a-f]{64}$/.test(clientKeyHash)) throw new TypeError('Client key must be a lowercase SHA-256 HMAC');
    if (!['audit_write', 'ai_assessment'].includes(scope)) throw new TypeError('Unknown API rate-limit scope');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 2_147_483_646) throw new RangeError('Rate limit must fit a positive PostgreSQL integer');
    if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new RangeError('Rate-limit window must be a positive integer');
    await this.pruneExpiredRateLimitBuckets();

    const [row] = await this.sql`
      INSERT INTO api_rate_limit_buckets AS current_bucket (scope, client_key_hash, request_count, reset_at, updated_at)
      VALUES (${scope}, ${clientKeyHash}, 1, now() + (${windowMs} * interval '1 millisecond'), now())
      ON CONFLICT (scope, client_key_hash) DO UPDATE SET
        request_count = CASE
          WHEN current_bucket.reset_at <= now() THEN 1
          ELSE LEAST(current_bucket.request_count + 1, ${limit} + 1)
        END,
        reset_at = CASE
          WHEN current_bucket.reset_at <= now() THEN now() + (${windowMs} * interval '1 millisecond')
          ELSE current_bucket.reset_at
        END,
        updated_at = now()
      RETURNING request_count, ROUND(EXTRACT(EPOCH FROM reset_at) * 1000)::BIGINT AS reset_at_ms`;
    const count = Number(row.request_count);
    const resetAt = Number(row.reset_at_ms);
    const allowed = count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - count),
      resetAt,
      ...(allowed ? {} : { reason: 'limit' as const }),
    };
  }

  async replace(audit: AuditResult) {
    await this.sql.begin(async (transaction) => {
      const [row] = await transaction`SELECT result_json FROM audits WHERE audit_id = ${audit.auditId}::UUID FOR UPDATE`;
      if (!row) throw new Error('Audit not found');
      const previous = row.result_json as AuditResult;
      if (canonicalJson(previous.bundle) !== canonicalJson(audit.bundle) || previous.bundleHash !== audit.bundleHash) throw new Error('Audit bundles are immutable');
      const receipt = audit.receipt;
      await transaction`
        UPDATE audits SET result_json = ${transaction.json(audit as never)},
          chain_tx_hash = ${audit.chainTxHash || null},
          chain_id = ${receipt?.chainId || null},
          registry_address = ${receipt?.registryAddress || null},
          issuer_address = ${receipt?.issuer || null},
          chain_version = ${receipt?.version || null},
          chain_block_number = ${receipt?.blockNumber || null}
        WHERE audit_id = ${audit.auditId}::UUID`;
    });
  }

  /** A pending intent is durable across API restarts and is never auto-expired.
   * On ambiguous sends, callers must inspect and reconcile the real chain event. */
  async reserveAnchor(audit: AuditResult): Promise<boolean> {
    return this.sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${audit.caseId}:${audit.claimType}`}, 0::BIGINT))`;
      const [row] = await transaction`
        SELECT bundle_sha256, result_json FROM audits
        WHERE audit_id = ${audit.auditId}::UUID FOR UPDATE`;
      if (!row || row.bundle_sha256 !== audit.bundleHash) return false;
      const current = row.result_json as AuditResult;
      if (current.anchored || current.bundleHash !== audit.bundleHash
          || canonicalJson(current.bundle) !== canonicalJson(audit.bundle)) return false;
      if (current.bundle.schemaVersion === 3
          && (!current.bundle.intelligence?.review
            || !['approved', 'rejected', 'needs_more_evidence'].includes(current.bundle.intelligence.reviewStatus))) return false;
      const inserted = await transaction`
        INSERT INTO audit_anchor_intents(audit_id, case_id, claim_type, bundle_hash)
        VALUES (${audit.auditId}::UUID, ${audit.caseId}, ${audit.claimType}, ${audit.bundleHash})
        ON CONFLICT DO NOTHING RETURNING audit_id`;
      return inserted.length === 1;
    });
  }

  async completeAnchor(audit: AuditResult): Promise<void> {
    const receipt = audit.receipt;
    const chainTxHash = audit.chainTxHash;
    if (!audit.anchored || !receipt || !chainTxHash
        || receipt.chainId !== 11155111
        || receipt.txHash.toLowerCase() !== chainTxHash.toLowerCase()
        || !/^0x[a-fA-F0-9]{40}$/.test(receipt.registryAddress)
        || !/^0x[a-fA-F0-9]{40}$/.test(receipt.issuer)
        || !/^0x[a-fA-F0-9]{64}$/.test(receipt.txHash)
        || !Number.isSafeInteger(receipt.version) || receipt.version < 1
        || !/^\d{1,19}$/.test(receipt.blockNumber)) {
      throw new Error('A valid verified Sepolia receipt is required');
    }
    await this.sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${audit.caseId}:${audit.claimType}`}, 0::BIGINT))`;
      const [intent] = await transaction`
        SELECT bundle_hash, status FROM audit_anchor_intents
        WHERE audit_id = ${audit.auditId}::UUID FOR UPDATE`;
      if (!intent || intent.bundle_hash !== audit.bundleHash || intent.status !== 'pending') {
        throw new Error('Pending anchor reservation not found');
      }
      const [row] = await transaction`
        SELECT bundle_sha256, result_json FROM audits
        WHERE audit_id = ${audit.auditId}::UUID FOR UPDATE`;
      if (!row || row.bundle_sha256 !== audit.bundleHash) throw new Error('Audit not found or stored digest changed');
      const previous = row.result_json as AuditResult;
      if (previous.anchored || canonicalJson(previous.bundle) !== canonicalJson(audit.bundle)
          || previous.bundleHash !== audit.bundleHash) throw new Error('Audit mismatch or previously anchored');
      await transaction`
        UPDATE audits SET result_json = ${transaction.json(audit as never)},
          chain_tx_hash = ${chainTxHash}, chain_id = ${receipt.chainId},
          registry_address = ${receipt.registryAddress}, issuer_address = ${receipt.issuer},
          chain_version = ${receipt.version}, chain_block_number = ${receipt.blockNumber}
        WHERE audit_id = ${audit.auditId}::UUID`;
      await transaction`
        UPDATE audit_anchor_intents SET status = 'anchored', transaction_hash = ${receipt.txHash}, updated_at = now()
        WHERE audit_id = ${audit.auditId}::UUID`;
    });
  }

  async status(): Promise<AuditStoreStatus> {
    try {
      await this.sql`SELECT 1 FROM api_rate_limit_buckets LIMIT 0`;
      return { backend: 'postgres', persistent: true, ready: true };
    } catch {
      return { backend: 'postgres', persistent: true, ready: false };
    }
  }

  async close() { await this.sql.end({ timeout: 5 }); }
}
