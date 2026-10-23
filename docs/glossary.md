# Glossary

[Documentation index](README.md) · [Data and claims](product/data-and-claims.md)

| Term | Meaning in this repository |
|---|---|
| MARS / IMEO | UNEP's Methane Alert and Response System, managed by the International Methane Emissions Observatory; the project's source of historical data |
| Source | Publisher-assigned source identifier; it does not necessarily correspond to one audited facility |
| Plume / observation | A dated observation record; a discrete measurement with its own coverage and uncertainty |
| Snapshot | A dataset copy from a specific retrieval, identified by ID/hash; it does not update itself |
| Provenance | Data origin, retrieval, license, transformation, and hashes used to trace an artifact |
| Casebook | A curated subset of real sources with reference context |
| DEMO / synthetic | A fabricated fixture for demonstration/testing; not evidence of a real event |
| Claim | A statement category: `source_detected`, `operator_notified`, or `mitigation_confirmed` |
| Scope | The period, event, and, where relevant, recipient that bound an assessment |
| Rules baseline / coverage | A deterministic check of how evidence metadata relates to a claim/scope |
| Determination | A reasoned human decision, separate from the coverage result |
| `insufficient_evidence` | The evidence does not support a stronger conclusion; this does not mean the claim is false or emissions are zero |
| Reference metadata | URL, locator, date, and evidence relationship; distinct from authenticated document contents |
| Investigation / case work | Questions, notes, next actions, evidence requests, and mutable work status; browser-local mode or an authorized shared workspace with server-side CAS/history |
| Audit revision / bundle | A stored assessment with fixed contents and version; a new revision does not overwrite an older bundle |
| Schema 2 / 3 / 4 | Bundle formats: rules baseline / document AI with review / private manual assessment |
| Parent hash | Digest reference to the original revision, used to trace assessment changes |
| Canonical JSON | Consistent JSON serialization before computing a digest |
| SHA-256 / digest / checksum | A cryptographic summary of content; checks for changes to the hashed data, not document truth |
| Reviewer scope | Capability token `private_read`, `review`, or `anchor`; distinct from the audit-period scope |
| Operator attestation | A service operator's reviewer-check record; not external verification of identity or independence |
| Public transparency summary | An approved summary with fields limited to one revision; the full bundle remains private |
| Export checksum | Checksum for the JSON report envelope, including export context; distinct from the bundle hash inside it |
| Receipt / anchor | Transaction evidence binding a hash to a registry; opt-in writes use durable intents and reconcile pending states; a local test is not a public Sepolia receipt |
| Recurrence | Estimate of the next linked MARS record; it does not measure physical leakage or mitigation outcomes |
| Priority heuristic | A rule for ordering investigations; not a claim-truth score or emissions forecast |
| LocalStorage / sessionStorage | Browser storage for notes/preferences and per-tab drafts; not encrypted or automatically shared |
| Atomic file store | Atomic file replacement and a single-process queue; it does not provide transactions across replicas |
