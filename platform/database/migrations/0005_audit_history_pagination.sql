-- Keyset pagination indexes for the saved-audit history API.
-- Keep older migrations immutable so existing installs can roll forward safely.
CREATE INDEX IF NOT EXISTS audits_source_page_idx
  ON audits (source_id, created_at DESC, audit_id DESC);

CREATE INDEX IF NOT EXISTS audits_claim_page_idx
  ON audits (claim_type, created_at DESC, audit_id DESC);

CREATE INDEX IF NOT EXISTS audits_created_page_idx
  ON audits (created_at DESC, audit_id DESC);
