# Observation Claim Cross-Check

Extend the existing Decision Lab with an analyst-defined, falsifiable archive question. Preserve the earlier frozen Decision Lab evidence; new source hashes and checks belong in a new dated evidence directory. Local prototype, no database, new contract, paid resource or external publication.

## Acceptance

- [x] Server loads linked observations from the original pinned web snapshot, verifies its compressed SHA-256 against the existing validated intelligence input, and preserves original IDs/dates/coordinates/units/uncertainties. Reject mismatches/duplicates rather than silently fabricating certainty.
- [x] Two precise claims: no linked records in an inclusive UTC window; all reported point estimates at most a declared kg/h threshold. Return explicit counterexamples, excluded records, missing-flux and archive-window limitations. Never infer continuous emissions or physical repair.
- [x] Physical-mitigation questions always require document review, regardless of archived detections or their absence.
- [x] Frontend shows discrete points, a threshold when relevant, exact witness records and a practical follow-up draft. Input/context changes invalidate pending/old output. Load lazily and page the witness table.
- [x] Export input, policy version, source/dataset/file hashes, attribution and trace. Replay independently; unsigned checksums do not establish publisher identity or physical truth.
- [x] Regression tests cover uncertain estimates, equality, null/zero, UTC boundaries, wrong source/link, duplicate IDs, snapshot mismatch, invalid/oversized requests and stale responses. Verify real historical data, desktop/mobile, and existing workflows.
- [x] Record factual query results separately from operator allegations, model evaluations and human validation. No claim of guaranteed competition ranking.

Completed locally: [source bindings, 753 main tests, 27 browser scenarios, 11 historical examples and exhaustive same-input Python conformance](../evidence/observation-crosscheck-2026-10-19/README.md). No remote publication or physical validation is implied.

## Design

Bounded extension of Decision Lab with a second tool; retain the established navy/cyan visual design. A counterexample must be visible as an exact record, its date, reported flux and standard deviation. A discrete-point plot locates it in the selected period; do not draw continuous emissions. A selected scenario is authored by the analyst and is not attributed to any company. Source-linked MARS records describe a location; they do not uniquely establish equipment ownership or causality.

Re-use Hono limits/no-store, backend-only snapshot access, Zod, browser WebCrypto and the existing follow-up/review navigation. Additive subpath export; do not change legacy audit schemas or the earlier DecisionPlan policy. New report format is separate from an anchored audit.

Scientific references checked 19 October: [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars-plumes), [How MARS works](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works). The dictionary search excerpt distinguishes a single-overpass plume from a source location. Direct dictionary fetch timed out; preserve local raw-field definitions and do not infer probabilities from reported standard deviations.
