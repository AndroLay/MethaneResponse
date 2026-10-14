-- Shared API quotas across PostgreSQL-backed replicas. Client identifiers are HMACs,
-- never raw addresses or bearer tokens. Expired rows are pruned opportunistically.
CREATE TABLE IF NOT EXISTS api_rate_limit_buckets (
  scope TEXT NOT NULL CHECK (scope IN ('audit_write', 'ai_assessment')),
  client_key_hash TEXT NOT NULL CHECK (client_key_hash ~ '^[0-9a-f]{64}$'),
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, client_key_hash)
);

CREATE INDEX IF NOT EXISTS api_rate_limit_buckets_expiry_idx
  ON api_rate_limit_buckets (reset_at);
