import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AuditResult, MarsCasebook as MarsCasebookType } from '@methane/shared';
import { MarsCasebook } from '@methane/shared';
import type { AuditStore, AuditStoreStatus } from './store';
import { canonicalJson } from './canonical';
import { sourceFromCase } from './casebook';

type Sql = ReturnType<typeof postgres>;
const migrationsDirectory = resolve(import.meta.dir, '../../../platform/database/migrations');
const bundledCasebook = resolve(import.meta.dir, '../../../data/real/mars_casebook_2026-10-11.json');

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

async function readCasebook(): Promise<MarsCasebookType> {
  const json = JSON.parse(await readFile(bundledCasebook, 'utf8')) as unknown;
  const parsed = MarsCasebook.safeParse(json);
  if (!parsed.success) throw new Error('Bundled MARS casebook failed validation before database seed.');
  return parsed.data;
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

  static async connect(databaseUrl: string) {
    const sql = postgres(databaseUrl, { max: 5, connect_timeout: 10, idle_timeout: 20, prepare: false });
    const store = new PostgresAuditStore(sql);
    try {
      await sql`SELECT 1`;
      await applyMigrations(sql);
      await seedCasebook(sql, await readCasebook());
      return store;
    } catch (error) {
      await sql.end({ timeout: 2 });
      throw error;
    }
  }

  async create(caseId: string, sourceId: string, claimType: AuditResult['claimType'], build: (revision: number) => AuditResult) {
    return this.sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${`${caseId}:${claimType}`}, 0::BIGINT))`;
      const [{ revision: nextRevision }] = await transaction`
        SELECT (COALESCE(MAX(revision), 0) + 1)::INTEGER AS revision
        FROM audits WHERE case_id = ${caseId} AND claim_type = ${claimType}`;
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

  async status(): Promise<AuditStoreStatus> {
    try {
      await this.sql`SELECT 1`;
      return { backend: 'postgres', persistent: true, ready: true };
    } catch {
      return { backend: 'postgres', persistent: true, ready: false };
    }
  }

  async close() { await this.sql.end({ timeout: 5 }); }
}
