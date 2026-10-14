# MethaneResponse architecture

**Last reviewed:** 2026-10-14. This is a locally runnable hackathon MVP, not an operational methane-monitoring authority.

## Request flow

1. `data/real/mars_casebook_2026-10-13.json` provides three real, linked MARS source/plume cases pinned to snapshot `unep-mars-ccd8267c55ee`, with archive provenance and link-only report metadata. `MarsCasebook` validates records before they reach the API. The October 11 casebook remains a separately versioned historical input for the landing-page evidence review.
2. `GET /api/sources` serves the active pinned real casebook by default. `?mode=demo` serves separate synthetic fixtures. The dashboard uses the full browser snapshot, while an imported global source does not become a curated document-evidence case automatically.
3. `POST /api/audits` maps typed claim categories to referenced evidence, abstains on missing/conflicting evidence, includes provenance and limitations, and emits a canonical SHA-256 bundle digest.
4. The offline Python pipeline joins the full pinned MARS browser snapshot by explicit plume source IDs, then derives deterministic per-source summaries, a conservative anomaly screen, and a hash-bound 365-day model for recurrence of another linked MARS archive record. The API verifies the compressed input digest and upstream archive identity before returning map rankings or selected-source analysis. Physical-emissions forecasting remains withheld because the snapshot lacks a complete observation-opportunity panel and independent physical outcome labels.
5. Optional, consent-gated document assessment is server-side. It resolves full-snapshot source IDs against the validated data, records dataset/input/analysis hashes and original observation ID–timestamp pairs, and falls back to the curated casebook only when its source is not available from the current snapshot. Exact quotations are validated against submitted excerpts; human decisions create a separate v3 revision linked to the parent digest. A request for more evidence yields `insufficient_evidence`. V3 drafts are private by default; public v3 list/detail access requires approval and separate submitter and reviewer publication consent. V2 rule-baseline audits remain supported and readable through the public history endpoint.
6. The API persists immutable audit bundle versions and allows receipt metadata to be added without changing the bundle. The JSONB store contract accepts both v2 and v3 without audit-table changes; migration `0003` expands the evidence-kind constraint to match the shared schema. PostgreSQL loads and seeds the same validated active casebook as the API, then inserts a minimal source/provenance row in the same transaction when a validated full-snapshot source has not been seeded, preserving the existing source foreign key. A local file store supports offline work; configured PostgreSQL/PostGIS applies migrations and seeds the casebook.
7. If a trusted administrator explicitly configures a Sepolia registry and signer, a human-reviewed v3 bundle can be anchored. Read, write and verify paths check the RPC-reported chain ID is Sepolia (`11155111`); a verifier then checks the digest, transaction receipt/event and registry version. The receipt does not establish the physical truth of a claim.

## Components

- `apps/web`: React/Vite dashboard, adaptive MapLibre globe, casebook review, claim controls, exact AI citations, reviewer flow and receipt view.
- `apps/api`: Bun/Hono API, Zod request validation, conservative rules baseline, optional server-side document model, versioned intelligence endpoint, file/PostgreSQL audit stores and viem receipt operations.
- `packages/shared`: shared casebook, source, evidence, audit and receipt types.
- `services/data-pipeline`: standard-library MARS ZIP importer, reproducible full-snapshot and intelligence builders, training-readiness gate and baseline conformance evaluator.
- `platform/database/migrations`: PostGIS source geometry, optional source-linked observations, evidence provenance and immutable audit revisions.
- `contracts`: issuer-controlled append-only versioned SHA-256 commitments.

## Storage and runtime

- Local API runs without `DATABASE_URL` and writes to the path in `AUDIT_STORE_PATH` or the ignored default `data/state/audits.json`.
- Production refuses to start without `DATABASE_URL`. The configured PostgreSQL user needs permission to apply SQL migrations and enable PostGIS.
- Audit bundles are immutable. Chain receipt fields live alongside the bundle/result record, not inside the hashed evidence bundle.
- The file store serializes writes within one API process. It is for local development, not multi-instance production. Use PostgreSQL for concurrent hosted instances.
- `/api/health` reports storage readiness, backend type and whether the pinned casebook validates.

## Decision policy

The API applies a deterministic evidence coverage baseline only. Detection records map to `source_detected`; the source-level MARS `notified` value is retained as `metadata_notification` and is excluded from `operator_notified` support because it does not identify a recipient or exact time. Feedback is not mitigation evidence. Link titles are metadata, not reviewed document contents. Real operator-notification and mitigation claims therefore remain `insufficient_evidence` in this build.

Synthetic demo records test positive, negative and contradiction paths and remain visibly labelled. The 15-example rules benchmark is a small conformance check based on three real cases and synthetic fixtures. It is not a source-disjoint validation or a general estimate of model accuracy. An optional server-side excerpt-assessment path can be enabled only with provider and reviewer configuration; it validates exact citations but has no independent accuracy benchmark. Local PDF/TXT excerpt preparation is available, but OCR and automatic document upload to the provider are not.

## Privacy and trust boundaries

- AI credentials, `AI_REVIEW_TOKEN`, `HUMAN_REVIEW_TOKEN`, reviewer identity, RPC URLs, admin token, and signer keys are server-side environment settings. Never expose them as `VITE_*` variables or commit `.env` files. Browser-entered AI/reviewer tokens are held only in component state.
- The AI provider sees submitted excerpts only after explicit opt-in. Full excerpts are not persisted. Exact selected quotations and document hashes are private by default; author consent permits publication of citations and submitted document metadata, but a reviewer must also approve and separately publish the complete report. Published bundles include the reviewer note. Source URLs with embedded credentials are rejected.
- Human review uses one configured shared token and server-side reviewer ID; this is not individual identity proof or a multi-tenant authorization system. Approval additionally records a reviewer attestation that the original source was inspected and requires at least one exact validated quotation. Since full excerpts are not retained, the attestation is not independently provable by the application. The private history UI holds the entered token in page memory only and provides a lock action that clears the private query cache and selected private report.
- `GET /api/audits/history` and private v3 detail reads require only the configured reviewer capability and return `Cache-Control: no-store` with `Vary: Authorization`. AI assessment, review, anchor, and reconciliation responses use the same cache protections because they may contain private report material or privileged outcomes. The assessor token is write-only for assessments. Reviewer credentials grant service-wide reads, not per-user ownership. The public verifier exposes digest/receipt status but not private report contents. The reviewer token may anchor only a reviewed v3 report; the admin token may also anchor historical v2. Draft AI reports are refused.
- Versioned audit JSON exports keep audit-cited rows in `observations` only when they match the saved audit's bound observation IDs and dataset snapshot. `historicalContext` separately carries periodic source observations as context, never as claim evidence, and only when the selected source matches the audit's pinned snapshot; on mismatch, both row sets are omitted. The outer canonical SHA-256 checksum covers this export context, but is unsigned, is not part of the audit bundle digest, and is not equivalent to an on-chain receipt.
- The UI's full-snapshot importer is local to the browser. It does not upload the source archive to the API.
- MARS data, linked reports, basemap tiles, interface imagery and original software have separate rights; see [`data/real/README.md`](../data/real/README.md) and [`NOTICE`](../NOTICE).

## Deliberate exclusions

No independent satellite detector, real-time feed, OCR, identity provider, object-storage upload, remote deployment, live AI-provider response, or Sepolia transaction has been verified in this workspace. The AI route is implemented but stays disabled until server settings are supplied. Do not report model performance until a larger human-reviewed, source-disjoint benchmark measures citation accuracy and unsafe mitigation confirmations.
