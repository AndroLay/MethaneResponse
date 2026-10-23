# ADR: correction and withdrawal of public summaries

**Date:** 18 October 2026 · **Status:** accepted for a local single-writer prototype · **Package:** P3

## Decision

Consent in the private schema 4 bundle remains immutable. Audit envelope version 2 adds required `publicationEvents` alongside `audits` and `anchorIntents`. Creation of a consented revision and supersession of the previous active publication for a scoped case/claim are saved atomically. Private revisions do not change public state or expose their IDs.

Publication events record the version, time, enum reason, and private actor derived from server authentication. Withdrawal compares the expected version and rechecks the claim's operator attestation inside the writer queue. Readers use one audit/event snapshot. The current list selects the latest public revision before pagination, including withdrawn tombstones; history and direct URLs retain older versions.

The summary hash covers only the immutable summary. Publication status comes from the server at read time; it is unsigned and not authenticated by an offline checksum. Withdrawal does not delete downloaded copies or blockchain receipts/hashes. The full schema 4 bundle remains private and cannot be anchored.

## Compatibility and limits

Legacy audit arrays and version 1 envelopes are read using a deterministic migration from historical consent; migration provenance is stored privately. The next write stores version 2. Incomplete/corrupt event metadata or two active publications for the same scope are rejected. Historical hashes/bundles are not changed.

The version 1 envelope decision in the [P2 ADR](2026-10-17-durable-anchor-intents.md) is superseded only for the storage format. Older P2 binaries cannot read version 2. A complete backup must include the envelope, marker, and casework; use roll-forward. Deleting events, downgrading the schema, or restoring an old backup may lose withdrawals/intents.

One supported process using the Linux writer lock remains the operational boundary. Pagination across requests is not a frozen snapshot. An operator replacing all state can still change chronology. This does not certify identity, documents, or physical methane outcomes.

[User/operator runbook](../../development/publication-lifecycle.md) · [P3 evidence](../../evidence/publication-lifecycle-2026-10-18/README.md)
