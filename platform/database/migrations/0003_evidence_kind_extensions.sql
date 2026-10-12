-- Keep the relational evidence constraint aligned with the shared EvidenceKind schema.
-- Existing rows remain valid; metadata notifications are provenance only and excerpts
-- are citations supplied for document-grounded assessments.
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_kind_check;
ALTER TABLE evidence ADD CONSTRAINT evidence_kind_check
  CHECK (kind IN (
    'detection',
    'notification',
    'mitigation_confirmation',
    'contradiction',
    'metadata_notification',
    'document_excerpt'
  ));
