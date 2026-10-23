# API reference

## Investigation capacity portfolios

`POST /api/investigations/portfolios` takes `{ datasetSnapshotId, inputFileSha256, parameters: { capacity, maxPerCountry, countries, sectors, recurrenceWeight } }`. Capacity/country limits are integers 1–50; recurrence weight is an integer 0–100; empty country/sector lists mean all. Request is strict, bounded to 8 KiB and limited to 20 requests/client/minute per process. Responses are `no-store`. Caller-supplied candidates, scores and document/team notes are not accepted.

The server validates pinned intelligence plus compressed input, joins exact source IDs to archive geography, and recomputes median flux/SD and distinct dates from linked records before comparing summaries. It returns a versioned unsigned allocation report: full candidate projection, four strategies, quota/scope/capacity dispositions (derived by the shared policy), allocation sensitivity, attribution, archive/input/intelligence hashes and deterministic SHA-256. Public-preview mode projects only its three allowlisted sources and labels the restricted scope; no audit is saved and no AI/chain write is performed. `409`: stale snapshot/hash; `400`: invalid constraints; `413`: body too large; `429`: limit; `503`: invalid/unavailable local inputs. Browser verifies both context bindings and policy replay before rendering. Existing audit schemas/endpoints remain compatible.

## Historical snapshot record transitions

`POST /api/investigations/snapshot-transition` accepts strict `{ datasetSnapshotId, inputFileSha256, sourceIds?, offset?, limit? }`. IDs bind the active normalized snapshot. Omitted or empty `sourceIds` means all changed linked sources; nonempty lists contain 1–50 unique original IDs. Offset defaults to 0 (0–100,000), limit to 20 (1–50). Unknown IDs are rejected; a removed source is allowed when present in the pinned transition. The browser does not submit an empty selected portfolio as unrestricted scope.

The response is `transitionPage`: policy/schema/digest, both original-input descriptors, aggregate record counts, unresolved-record counts, affected-source count, requested/unchanged source IDs and bounded source rows. Each source row retains original metadata values and observation changes; the source-page limit does not truncate its record history. UI observation pagination is separate. The complete pinned report is returned by `POST /api/investigations/snapshot-transition/export` with the same strict request contract. Responses are `no-store`. No AI call, reviewer write, upstream fetch or chain transaction occurs.

Inputs and generated report are fixed server paths with compressed-size/decompression bounds, original-file SHA-256 checks, manifest/report integrity and active snapshot/archive/input bindings. A stat-keyed cache shares concurrent loads; it invalidates on input/report/manifest file changes. Diff generation is offline; per-request source pagination does not recompute the full archive. HTTP cannot select files or URLs.

Both routes have a 16 KiB JSON body limit and a separate 20-request/client/minute process-local limiter. `400`: malformed/unknown/duplicate IDs; `403`: restricted public preview; `409`: stale active context; `413`: oversized body; `429`: rate limit; `503`: invalid/unavailable pinned inputs (redacted error). The full transition is not projected into the three-source preview. Policy `mars-normalized-record-delta/1` compares the explicitly enumerated publisher fields, exact original IDs, nulls, dates, units and uncertainties. Added/removed records are archive changes, not physical onset/cessation. [Replay and limitations](../evidence/snapshot-change-watch-2026-10-20/README.md).

## Versioned investigation-plan decisions

`GET /api/investigation-plans/:id` returns a full private `PlanJournal`; `PUT` creates (`201`) or appends (`200`) a decision. Both require signed `private_read` plus current operator-attested `source_detected` authority. PUT also requires `review`; legacy shared/admin tokens do not substitute. Public-preview mode rejects both (`403`). All responses use `no-store` and `Vary: Authorization`.

PUT accepts strict `{ request: { datasetSnapshotId, inputFileSha256, parameters }, reportDigest, strategy, decision, rationale, expectedRevision, expectedHead }`. The server rebuilds the report from pinned inputs and rejects a digest differing from the displayed report. `decision`: `accept|defer|reject`; trimmed rationale: 20–4,000 characters; ID: alphanumeric/underscore/hyphen, 1–80 characters. Actor and time are server-owned. Create uses revision `0`, head `null`; updates require both current revision and head. Authority/expiry are checked again before commit.

Bounds: request 8 KiB; 20 decisions/reviewer/client/minute per process; at most 20 journals, 20 unique reports/journal, 100 revisions/journal and 32 MiB file. Reports are deduplicated by digest; old revisions are retained. `400`: invalid ID/body; `401`: no signed access; `403`: unauthorized; `404`: absent GET; `409`: stale report/dataset or CAS conflict; `413`: body/history capacity; `429`: limit; `503`: unavailable or inconsistent state. Existing audit schemas/receipts are unchanged.

Runtime stores a companion `${AUDIT_STORE_PATH}.plans.json` and `.initialized` marker with private permissions, atomic writes/fsync, and the existing API single-writer lock. Back up both offline; the test factory defaults to memory. Lost state is rejected after an initialization marker has been observed; loss of the entire volume and marker is not detectable. No database or multi-instance guarantees are introduced. Exported journals require an independently trusted expected head for meaningful offline verification; they are not independently signed reviewer identities or blockchain receipts. [User workflow](../product/user-workflow.md#operate-and-review-a-plan) and [schema](../../packages/shared/src/plan-journal.ts).

[Architecture](overview.md) · [Configuration](../development/configuration.md) · [Data flow](data-flow.md)

**Active contract: 20 October 2026.** Route implementations are in [app.ts](../../apps/api/src/app.ts); baseline/manual inputs are in [packages/shared](../../packages/shared/src/index.ts), while document-assessment/review inputs are in [ai-review.ts](../../apps/api/src/ai-review.ts). Local base URL: `http://localhost:3001`. The web development server accesses `/api` through the Vite proxy.

## Access and terminology

- **Public:** no bearer token is required, but data remains subject to relevant visibility and rate limits.
- **Private read:** reviewer token with `private_read` scope, subject to the directory policy for each claim category.
- **Review:** reviewer token with `review` scope, subject to the directory policy. The token alone is not proof of reviewer identity.
- **Assessment:** separate `AI_REVIEW_TOKEN`; it does not grant access to private history.
- **Admin:** `ADMIN_API_TOKEN` for supported operations; it does not replace all reviewer scopes.
- Scoped tokens are supplied in the `Authorization: Bearer …` header. Do not put them in URLs, commits, public examples, or logs.

## Dataset and analysis

| Method/path | Primary input | Result | Access |
|---|---|---|---|
| `GET /api/health` | — | Storage/casebook/rate-limiter readiness and chain configuration | Public; `200` or `503` |
| `GET /api/cases` | — | Curated casebook, provenance, limitations | Public |
| `GET /api/cases/:id` | Case ID | One curated case | Public |
| `GET /api/sources` | Optional `mode=demo` | Casebook sources; DEMO when requested | Public; not all browser sources |
| `GET /api/sources/:id` | Source ID; optional `mode=demo` | Casebook/DEMO source | Public |
| `GET /api/intelligence/status` | — | AI mode/configuration, human review, and chain | Public; contains no secrets |
| `GET /api/intelligence/insights` | Required `sourceId` | Source analysis and pinned-snapshot metadata | Public |
| `GET /api/intelligence/rankings` | — | Heuristic ranking and forecast/recurrence limits | Public |

Full map data, progressive shards, geometry, and publisher indicators come from static web assets. They are not fetched through `/api/sources`. Missing/corrupt/mismatched intelligence inputs produce `503`.

## Decision Lab: analysis without writing an audit

| Method/path | Input | Result | Access |
|---|---|---|---|
| `POST /api/investigations/plan` | Source ID, claim type, optional scope/snapshot | Eligibility trace, reference-removal sensitivity, next checks, and DecisionPlan digest | Public, preview restricted |
| `GET /api/investigations/challenges` | — | Five authored reference challenges labeled SYNTHETIC DEMO | Public; do not represent real operators |
| `POST /api/investigations/observation-check` | Source ID, snapshot ID, optional normalized input SHA-256, query | Exact-linked records, counterexamples, original values/SD, excluded dates, status, and ObservationCheck digest | Public, preview restricted; separate 20/minute limiter |

Both POST routes are limited to 16 KiB JSON, use a strict schema, and return `no-store`. Observation/reference data comes from the server snapshot; requests cannot inject evidence/observations. Analysis does not save, review, send, or anchor audits. The public preview uses the same source allowlist.

Example observation query:

```json
{
  "sourceId": "CAN_S_002",
  "datasetSnapshotId": "unep-mars-675417694883",
  "inputFileSha256": "f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7",
  "query": {
    "kind": "reported_flux_at_most",
    "startDate": "2026-04-10",
    "endDate": "2026-04-10",
    "thresholdKgHr": 1000
  }
}
```

`query.kind` also accepts `no_linked_detections` and `physical_mitigation`; `thresholdKgHr` is allowed only with `reported_flux_at_most`. Dates use inclusive UTC days. Different snapshot ID/input hash → `409`; unknown source → `404`; oversized body → `413`; request limit → `429`/Retry-After; invalid provenance/input → generic `503` without a server file path.

`counterexample_found` only contradicts an analyst-authored archive statement. `no_counterexample_in_archive`, `no_observations`, `incomplete_flux`, and `incomplete_window` are not repair confirmations; `physical_mitigation` always returns `requires_document_review`. The browser requires a matching normalized input SHA-256, policy replay, and checksum before displaying results. The [schema](../../packages/shared/src/observation-claims.ts) and [reproduction evidence](../evidence/observation-crosscheck-2026-10-19/README.md) contain the full format. An unsigned digest is not publisher authentication or a blockchain receipt.

## Shared investigations (P1)

| Method/path | Input | Result | Access |
|---|---|---|---|
| `GET /api/case-work/session` | — | `reviewerId`, authorized `claimTypes`, `canWrite`, `storage` | Signed `private_read`, at least one active claim authority |
| `GET /api/case-work` | Snapshot/mode/archive query; optional `sourceId` | `{ works }`, latest revision per authorized investigation | Signed `private_read`, filtered by current claim authority |
| `GET /api/case-work/:id` | Same query, required `sourceId` | `{ work, history }`, all revisions in order | Signed `private_read`; returns `404` without claim authority |
| `PUT /api/case-work/:id` | `SharedWorkInput`: `{ context, expectedRevision, draft }` | `{ work }`; `201` create, `200` update | Signed **`private_read` and `review`**, current claim authority; assignee must also be authorized |

P1 **always** requires directory assurance `operator_attested`; a legacy shared token, admin token alone, or audit compatibility flag does not grant access. All responses use `Cache-Control: no-store` and `Vary: Authorization`. A session without authority returns `403`; lists filter unauthorized records. Access is rechecked before commit.

`context` contains `sourceId`, `synthetic`, `datasetSnapshotId`, and `archiveSha256` for real data. Queries use `synthetic=true|false`; the archive value is lower-case SHA-256 without `0x`. DEMO writes must not include an archive. Source, snapshot, scope/event, and assessment links are checked against server data. IDs allow only alphanumeric/underscore/hyphen characters and are 1–128 characters long.

`draft` uses `CaseWorkDraft`: `claimType`, optional `scope`, `status`, `question`, `notes`, `evidenceRequest`, `nextAction`, optional `assessmentLink`, `assignee`, and `dueDate` (`YYYY-MM-DD`). A work ID's claim/scope cannot change; use a new ID for another context. The server sets the first owner, `updatedBy`, time, and revision. Actor/server-metadata fields in the request are rejected.

Create uses `expectedRevision: 0`; updates must use the latest revision. A `409` conflict does not overwrite history. Limits: 16 KiB request, 500 investigations, 100 revisions per investigation, 16 MiB file. A full body/capacity returns `413`; storage/permission/schema failures return `503`. After an uncertain response, read the latest revision before retrying. A write succeeds only after the state and initialization marker are flushed; previously saved state that is now missing is rejected until restored.

The official launcher holds the kernel lock for the API's lifetime. Health adds `caseWorkStorage: { backend, persistent, ready }`; `persistent` indicates a file backend, not certification of a remote volume. The API test factory may use a memory store, while the runtime entry point uses a file store. The [usage and recovery guide](../development/shared-casework.md) explains setup, explicit import, backup/restore, and single-writer limits.

## Writing audit assessments

| Method/path | Schema/input | Result | Access |
|---|---|---|---|
| `POST /api/audits` | `AuditInput`: source ID, claim, optional scope/snapshot | Saved schema 2 (`201`) | Open locally with rate limit; production requires admin unless public baseline is explicitly enabled |
| `POST /api/human-assessments` | `HumanAssessmentInput`: snapshot/scope, exact claim, references, rationale, inspection, optional parent/trust/consent | `{ audit }` private schema 4 (`201`) | Review |
| `POST /api/intelligence/assessments` | `DocumentAssessmentInput`: source/claim, excerpt/metadata/consent | `{ audit }` schema 3 (`201`) | Assessment token and configured provider |
| `POST /api/audits/:id/review` | `HumanReviewInput`: decision, notes, relevant inspection and consent | Schema 3 review revision | Review; document assessment only |
| `GET /api/reviewers/me` | Required `claimType` | Reviewer subject, category assurance, publisher hosts, and strict-mode flag | Review |

Example baseline body that contains no private data:

```json
{
  "sourceId": "KAZ_S_159",
  "claimType": "mitigation_confirmed"
}
```

Claim categories: `source_detected`, `operator_notified`, `mitigation_confirmed`. Scope uses `startDate`, `endDate`, optional `observationId`, and `recipient`. Human assessment requires scope and `datasetSnapshotId`; notification requires a recipient. Full field formats/ranges follow the schema, not the minimal JSON example above.

JSON request limits: baseline 16 KiB, human assessment 64 KiB, document assessment 40 KiB. Mismatched scope/snapshot/parent is rejected. Reference retrieval occurs only if `checkPublicReferences` is enabled on the request; a digest mismatch blocks a `supported`/`contradicted` determination.

## History, verification, and transparency

| Method/path | Filter/input | Result | Access |
|---|---|---|---|
| `GET /api/audits` | Optional `sourceId`, `claimType`, `limit`, `cursor` | Audits readable by the public | Public; private bundles are not listed |
| `GET /api/audits/history` | Same filters | History for authorized categories | Private read |
| `GET /api/audits/:id` | Audit ID | Full audit, if authorized | Public or private read according to visibility |
| `GET /api/audits/:id/verify` | Audit ID | Local digest and optional receipt status | Same visibility as the full audit |
| `GET /api/transparency` | Optional `sourceId`, `limit`, `cursor`, `view=current\|history` | `{ summaries, hasMore, nextCursor }`; defaults to latest public revision per scope/claim, including withdrawn | Public; consented summaries only |
| `GET /api/transparency/:id` | Audit ID | `{ summary, summaryHash, publication }` with redacted status/history and optional replacement ID | Public; `404` if unavailable, `503` if store fails |
| `GET /api/transparency/:id/verify` | Audit ID | `summaryHash`, `publication`, `checkedAt`, `limitation`; server-reported status at check time | Public; historical checksum is separate from live status |
| `POST /api/transparency/:id/withdraw` | `{ expectedVersion, reason }`; enum reason `consent_withdrawn`, `published_in_error`, `evidence_under_review`; 4 KiB limit | Updates public record; `409` stale/already withdrawn, `400` invalid, `401/403` access, `429` rate limit, `503` outcome unconfirmed | `review` scope and current `operator_attested` for the claim; rechecked in the writer queue |

Audit list/history without pagination parameters preserves the legacy `{ audits }` response. When pagination is requested, the response includes `hasMore` and `nextCursor`. A valid `limit` is an integer from 1–100. Treat the cursor as an opaque string; return it unchanged. Transparency lists are always paginated.

For a public schema 4 correction, send the latest **human** revision's `parentAuditId` when saving `POST /api/human-assessments`, with new consent. Version checking, audit creation, and supersession of the old publication occur in the same writer queue. The baseline for the same scope retains its own revision number and does not block the human parent. A private revision without consent does not change public status. Publication events retain the private actor; public responses contain no identity or free-text rationale. See [lifecycle and envelope compatibility](../development/publication-lifecycle.md).

Private audit detail/verification does not reveal whether a record exists to an unauthorized reader; it returns `404`. Private responses use `Cache-Control: no-store` and `Vary: Authorization`. Public summaries also use `no-store`. Directory approval is checked on private reads; a public summary stores historical status and is not proof of current approval.

## Receipts: routes exist, local writes are disabled

| Endpoint | Behavior |
|---|---|
| `GET /api/audits/:id/anchor-status` | Stored intent and read-only configured target (chain/registry/issuer/confirmation policy/writeEnabled), without signer/RPC credentials. Target is `null` if unavailable; intent remains readable. |
| `POST /api/audits/:id/anchor` | Preflight, local signing, fsync intent with tx hash/nonce, one broadcast, then receipt check. `200` anchored, `202` pending, `409` stale intent/nonce/version/target, `422` revert, `502` uncertain outcome; `503` unavailable preflight/storage/signing. Optional body `{chainId,registryAddress,issuer}` binds the UI-approved target; mismatch is rejected before reservation. |
| `POST /api/audits/:id/reconcile` | Body may be empty: check the same intent hash without submitting a transaction. `200` reconciled/already_reconciled/reverted, `202` pending. An optional manual receipt must match the exact intent and checked block; a receipt without an intent is not imported. |

All three require admin or `anchor` scope. Reviewers must also have a current directory attestation of **`operator_attested` for the claim**; compatibility-mode unverified/expired status does not grant chain permission. Baseline is admin-only; reviewers are limited to reviewed schema 3. Private schema 4 and unreviewed AI are always rejected. The full audit is returned only when private-read permission remains valid; otherwise, only receipt metadata is returned. Private responses use `no-store`. Writes require opt-in `ENABLE_CHAIN_WRITES=true`; reconciliation does not require a signing key. See the [P2 runbook](../development/blockchain-recovery.md).

`GET /api/audits/:id/verify` may report a valid local hash even when no receipt exists or the chain is not configured. Do not equate `localDigestValid` with receipt `integrityVerified`.

## Failure responses the UI must handle

| Status | General meaning |
|---|---|
| `400` | Invalid input/filter/scope |
| `401` / `403` | Invalid/insufficient token or directory policy denial |
| `404` | Source/audit unavailable or private record cannot be read |
| `409` | Parent/revision changed or operation state mismatch |
| `413` | Body exceeds limit |
| `422` | Semantic input/evidence/digest does not meet the path requirements |
| `429` | Rate limit; follow `Retry-After` when provided |
| `502` / `503` | Provider/transport, data, storage, or configuration unavailable |

Not every route returns every status in the table. Error messages are not a stable domain schema for determining claim truth; the UI should preserve drafts and clearly show save failures.


## Connected investigations and frozen decisions

Related check: `GET /api/case-work/:id/evidence-overlap` uses context
and `expectedRevision`, signed `private_read`, and current claim authority.
The public preview denies access; results are `no-store`, with up to 500 current work items
on the same snapshot and no private notes or raw URLs. This is a candidate-reuse check
for review, not a duplicate-mitigation finding. See [workflow and limits](../development/evidence-overlap-and-snapshot-intake.md).

[Workflow, configuration, and rollback](../development/connected-investigations.md). All endpoints below are private, `no-store`, and require signed `private_read` plus current directory authority. The public preview denies access. Required context query: `sourceId`, `synthetic`, `datasetSnapshotId`, and `archiveSha256` for real data. Dossier material paths/URLs are not accepted from the caller.

| Method / route after `/api/case-work/:id` | Function and additional permission |
|---|---|
| `GET /dossier` | Dossier history and exact material; CORS-exposed `X-Investigation-Digest` header |
| `POST /change-check` | Body `{ expectedRevision }`; comparison against the pinned historical archive; does not change the verdict |
| `GET /decisions` | Frozen-decision summaries and configured chain target; no full documents |
| `POST /decisions` | Freeze; additional `review`. Strict body: `expectedRevision`, `expectedDossierDigest`, `expectedDecisionDigest` (null for the first), `disposition`, `rationale`, `sourceInspected: true` |
| `POST /decisions/:digest/verify` | Frozen decision and receipt/revisit wrapper; chain receipt must be checked before setting verified status |
| `POST /decisions/:digest/anchor` | Additional `review`+`anchor`, backend signer opt-in. Strict body `{ chainId, registryAddress, issuer }` to approve the checked target |
| `POST /decisions/:digest/reconcile` | Additional `review`+`anchor`; inspect durable intent without a new broadcast |

`disposition` is `accept_assessment`, `request_more_evidence`, or `reject_assessment`; it is not a physical verdict. Scope and a saved assessment are required before freezing. Unreviewed model output is rejected. Receipts are outside the hashed payload. A previously attached plan requires `source_detected` authority throughout history/material access. Authority is rechecked after asynchronous work and before the response/commit.

Freeze body is limited to 4 KiB, target 1 KiB. Exports are limited to 16 MiB; two concurrent dossier/decision builds and a shared quota of 20 operations/minute per actor+client. Revision/head/dossier conflict `409`, access `401/403`, invalid input `400`, capacity `413`, rate limit `429`, unavailable service/storage `503`. An anchor with an uncertain `502` outcome must be reconciled; pending is `202`; a definitive revert is `422`. Terminal reconciliation is idempotent. A pending nonce is not released merely because no receipt was found.

New casework fields are optional: `planLink`, `changeReportDigest`, `acceptanceCriteria`, `requestEvents`. Request/response/review events cannot be deleted or replaced in later revisions. Casework body remains 16 KiB. The audit store uses envelope 3 after the first decision; readers still accept legacy arrays and envelopes 1/2.
