# MethaneResponse architecture

**Last reviewed:** 2026-10-12. This is a locally runnable hackathon MVP, not an operational methane-monitoring authority.

## Request flow

1. `data/real/mars_casebook_2026-10-11.json` provides three real, linked MARS source/plume cases with archive provenance and link-only report metadata. `MarsCasebook` validates records before they reach the API.
2. `GET /api/sources` serves the pinned real casebook by default. `?mode=demo` serves separate synthetic fixtures. A full locally imported GeoJSON is a map snapshot and does not become an auditable curated case automatically.
3. `POST /api/audits` maps typed claim categories to referenced evidence, abstains on missing/conflicting evidence, includes provenance and limitations, and emits a canonical SHA-256 bundle digest.
4. The API persists immutable audit bundle versions and allows receipt metadata to be added without changing the bundle. A local file store supports offline work; a configured PostgreSQL/PostGIS store applies migrations and seeds the casebook.
5. If a trusted administrator explicitly configures a Sepolia registry and signer, the API can anchor the bundle digest. A verifier checks the digest, exact transaction receipt/event and registry version. The receipt does not establish the physical truth of a claim.

## Components

- `apps/web`: React/Vite dashboard, MapLibre source explorer, casebook review, claim controls, evidence citations and receipt view.
- `apps/api`: Bun/Hono API, Zod request validation, conservative rules baseline, file/PostgreSQL audit stores and viem receipt operations.
- `packages/shared`: shared casebook, source, evidence, audit and receipt types.
- `services/data-pipeline`: standard-library MARS ZIP importer, reproducible casebook selector and baseline conformance evaluator.
- `platform/database/migrations`: PostGIS source geometry, optional source-linked observations, evidence provenance and immutable audit revisions.
- `contracts`: issuer-controlled append-only versioned SHA-256 commitments.

## Storage and runtime

- Local API runs without `DATABASE_URL` and writes to the path in `AUDIT_STORE_PATH` or the ignored default `data/state/audits.json`.
- Production refuses to start without `DATABASE_URL`. The configured PostgreSQL user needs permission to apply SQL migrations and enable PostGIS.
- Audit bundles are immutable. Chain receipt fields live alongside the bundle/result record, not inside the hashed evidence bundle.
- The file store serializes writes within one API process. It is for local development, not multi-instance production. Use PostgreSQL for concurrent hosted instances.
- `/api/health` reports storage readiness, backend type and whether the pinned casebook validates.

## Decision policy

The API applies a deterministic evidence coverage baseline only. A detection record maps to `source_detected`; the source-level MARS `notified` value maps to a separate notification evidence item with no invented timestamp. Feedback is not mitigation evidence. Link titles are metadata, not reviewed document contents. Real mitigation claims therefore remain `insufficient_evidence` in this build.

Synthetic demo records test positive, negative and contradiction paths and remain visibly labelled. The initial 15-example benchmark is a small conformance check based on three real cases and synthetic fixtures. It is not a source-disjoint validation or a general estimate of model accuracy. No LLM, OCR or document extraction path is enabled.

## Privacy and trust boundaries

- RPC URLs, `ADMIN_API_TOKEN`, and signer keys are server-side environment settings. Never expose them as `VITE_*` variables or commit `.env` files.
- Only the admin-token-protected anchor route can submit a transaction. Bundle and receipt reads are public API operations.
- The UI's full-snapshot importer is local to the browser. It does not upload the source archive to the API.
- MARS data, linked reports, basemap tiles, interface imagery and original software have separate rights; see [`data/real/README.md`](../data/real/README.md) and [`NOTICE`](../NOTICE).

## Deliberate exclusions

No independent satellite detector, real-time feed, document OCR/LLM auditor, identity provider, object-storage upload, remote deployment, or Sepolia transaction is included in the locally verified state. Do not add a model until a larger human-reviewed, source-disjoint benchmark can measure citation accuracy and unsafe mitigation confirmations.
