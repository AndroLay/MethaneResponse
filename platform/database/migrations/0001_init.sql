-- TARGET SCHEMA ONLY. Initial Hono API still uses synthetic in-memory fixtures.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT,
  location extensions.geometry(Point, 4326),
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  original_dataset_url TEXT,
  source_license TEXT,
  retrieved_at TIMESTAMPTZ,
  raw_sha256 TEXT
);
CREATE INDEX IF NOT EXISTS sources_location_gist ON sources USING GIST(location);

CREATE TABLE IF NOT EXISTS observations (
  plume_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  observed_at TIMESTAMPTZ NOT NULL,
  flux_kg_hr NUMERIC,
  flux_std_kg_hr NUMERIC,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (flux_kg_hr IS NULL OR flux_kg_hr >= 0)
);
CREATE INDEX IF NOT EXISTS observations_source_time_idx ON observations(source_id,observed_at);

CREATE TABLE IF NOT EXISTS evidence (
  evidence_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  kind TEXT NOT NULL CHECK (kind IN ('detection','notification','mitigation_confirmation','contradiction')),
  claim_type TEXT,
  title TEXT NOT NULL,
  source_url TEXT,
  source_sha256 TEXT,
  date DATE,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS audits (
  audit_id UUID PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(source_id),
  claim_type TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('supported','insufficient_evidence','contradicted')),
  reason TEXT NOT NULL,
  bundle_sha256 TEXT NOT NULL CHECK (bundle_sha256 ~ '^0x[0-9a-f]{64}$'),
  bundle_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chain_id INTEGER,
  registry_address TEXT,
  chain_tx_hash TEXT
);

