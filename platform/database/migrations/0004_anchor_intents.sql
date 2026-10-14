-- Fail-closed intent records prevent duplicate chain writes after API restarts.
-- A pending intent is retained until a verified receipt is reconciled.
CREATE TABLE IF NOT EXISTS audit_anchor_intents (
  audit_id UUID PRIMARY KEY REFERENCES audits(audit_id) ON DELETE RESTRICT,
  case_id TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  bundle_hash TEXT NOT NULL CHECK (bundle_hash ~ '^0x[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'anchored')),
  transaction_hash TEXT CHECK (transaction_hash IS NULL OR transaction_hash ~ '^0x[0-9a-fA-F]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_anchor_one_pending_per_case
  ON audit_anchor_intents(case_id, claim_type) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS audit_anchor_intents_status
  ON audit_anchor_intents(status, created_at);
