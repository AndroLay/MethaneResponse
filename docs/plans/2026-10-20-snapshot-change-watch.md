# Snapshot Change Watch — implementation contract

Continue Investigation Operations using the current working tree. Preserve earlier frozen evidence. No database, new dependency, paid service, publication or chain transaction.

## Acceptance

- [x] Restore the complete historical `unep-mars-e0721015e925` browser projection from Git object `99662e6`; record compressed SHA-256 and provenance. Keep the active snapshot unchanged.
- [x] Compare exact source and plume IDs across both complete normalized snapshots, including unresolved records, corrections, relinking and removed records. Distinguish later-dated observations from historical backfill. Source feedback/notification changes remain metadata.
- [x] Produce a deterministic versioned report bound to both input hashes. Independent CLI replay requires separately supplied expected input and report digests. Verify with a separately implemented Python oracle.
- [x] Serve a bounded cached result through Hono with active-snapshot binding, pagination, public-preview restrictions and safe failure behavior. Never accept arbitrary input paths or URLs over HTTP.
- [x] Connect selected plan sources to changed records in the existing Cases planner, with explicit loading/error/empty states, original IDs, field values, UTC dates, units, pagination and direct evidence/map handoff. Reject stale responses.
- [x] Add regressions and actual browser checks, inspect desktop/mobile captures, retain command results and immutable source/artifact bindings.

## Verification record

[Frozen local evidence](../evidence/snapshot-change-watch-2026-10-20/README.md): final full gate 808 main tests, typecheck/build/bundle; 28 main + 10 private/team/publication/mock-AI browser scenarios; eight separate CLI outcomes; Python semantic oracle matches 8,429 source and 60,733 observation records. Desktop/mobile viewport captures inspected. Four earlier manifests retain all 87 artifact checksums. No new provider, live feed, public transaction, commit/push or deployment is claimed.

## Limits

This compares two historical dataset releases retrieved in October 2026; it is not live monitoring or a prospective validation. A record added to the archive is not necessarily a newly occurring emission. Missing records are not zero methane; metadata feedback is not repair evidence. Dataset hashes establish identity, not independent publisher authentication. No human benefit, avoided emissions or competition ranking follows from these checks.
