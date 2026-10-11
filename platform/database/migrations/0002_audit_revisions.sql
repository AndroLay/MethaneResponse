-- Preserve source-unlinked plume rows and append-only audit revisions.
ALTER TABLE observations ALTER COLUMN source_id DROP NOT NULL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS notified BOOLEAN;

ALTER TABLE sources ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS notified TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS feedback_operator TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS feedback_government TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS feedback_scope TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS provenance JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE sources ADD COLUMN IF NOT EXISTS case_metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE audits ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS revision INTEGER;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS result_json JSONB;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS issuer_address TEXT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS chain_version BIGINT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS chain_block_number BIGINT;

UPDATE audits SET case_id = source_id WHERE case_id IS NULL;
WITH numbered AS (
  SELECT audit_id, row_number() OVER (PARTITION BY case_id, claim_type ORDER BY created_at, audit_id)::INTEGER AS revision
  FROM audits
)
UPDATE audits AS target SET revision = numbered.revision
FROM numbered WHERE target.audit_id = numbered.audit_id AND target.revision IS NULL;

UPDATE audits SET result_json = jsonb_build_object(
  'auditId', audit_id::TEXT,
  'caseId', case_id,
  'revision', revision,
  'sourceId', source_id,
  'claimType', claim_type,
  'result', result,
  'reason', reason,
  'evidenceIds', COALESCE((SELECT jsonb_agg(evidence->>'id') FROM jsonb_array_elements(bundle_json->'citedEvidence') AS cited(evidence)), '[]'::JSONB),
  'bundleHash', bundle_sha256,
  'generatedAt', created_at,
  'synthetic', COALESCE((bundle_json->>'synthetic')::BOOLEAN, FALSE),
  'bundle', bundle_json,
  'anchored', chain_tx_hash IS NOT NULL,
  'chainTxHash', chain_tx_hash
) WHERE result_json IS NULL;

ALTER TABLE audits ALTER COLUMN case_id SET NOT NULL;
ALTER TABLE audits ALTER COLUMN revision SET NOT NULL;
ALTER TABLE audits ALTER COLUMN revision SET DEFAULT 1;
ALTER TABLE audits ALTER COLUMN result_json SET NOT NULL;
ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_revision_positive;
ALTER TABLE audits ADD CONSTRAINT audits_revision_positive CHECK (revision > 0);
ALTER TABLE observations DROP CONSTRAINT IF EXISTS observations_source_id_fkey;
ALTER TABLE observations ADD CONSTRAINT observations_source_id_fkey FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS audits_case_claim_revision_idx ON audits(case_id, claim_type, revision);
CREATE INDEX IF NOT EXISTS audits_source_created_idx ON audits(source_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sources_case_id_idx ON sources(case_id) WHERE case_id IS NOT NULL;
