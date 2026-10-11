# MVP goals and remaining work

**Updated:** 2026-10-12 · **Target event deadline shown on Devpost:** 2026-10-25, subject to the unresolved event-page time conflict in [`research/event.md`](research/event.md).

## Local MVP milestones

| Milestone | Status | Evidence / boundary |
|---|---|---|
| Traceable real data | Complete for a narrow sample | Three MARS source cases, linked plume IDs, archive hash, attribution, license and limitations are recorded in `data/real/`. This is not a live or complete MARS feed. |
| Claim and audit API | Complete for the rules baseline | Real and synthetic inputs are separate; detection, source-level notification, and mitigation are different categories; missing evidence abstains. |
| Durable local and database storage | Implemented; local PostGIS integration test available | Local file store survives restart. PostgreSQL migrations, casebook seeding and audit revision persistence are exercised with a local PostGIS test database. Remote provider migrations remain untested. |
| Review dashboard | Complete for local acceptance; hardware map visual check remains | Chromium verified the pinned casebook, case selection, real/demo switching, detection audit/citation, mitigation abstention, JSON export, region filtering, API-503 fallback, and 390 px layout. Software WebGL and failed map-chunk fallbacks preserve case review. Actual satellite/globe rendering still needs a hardware-accelerated browser. |
| Baseline and bundle verifier | Complete as an exploratory conformance gate | 15 examples: 9 real casebook claims and 6 synthetic fixtures. Local digest tampering is rejected; no real mitigation is confirmed. Overall macro-F1 1.00 includes synthetic classes; the real-only subset is 0.6667 and has no contradiction examples. This is not a generalizable model benchmark. |
| CI and reproducible local gates | Complete locally | `bun run check:all` passed: frozen install, TS, API/web/verifier tests, 15 Python tests, baseline report, 4 Foundry tests, and production build. Four optional PostgreSQL tests were skipped in this gate; see [`delivery-notes.md`](delivery-notes.md) for separate DB evidence and the blocked final rerun. |

## Remaining goals by gate

### Gate A — local acceptance (complete with a documented map limit)

1. `bun run check:all` passed with the frozen lockfile.
2. Chromium verified the real casebook, source-level status, detection support/citation, mitigation abstention, JSON export, region filter, and mobile width. Actual raster/globe rendering remains unverified because the available Chromium renderer is SwiftShader; its fallback was verified.
3. File-store persistence was confirmed after an API restart. PostgreSQL integration passed earlier against the disposable PostGIS test database; the final repeat was blocked after an assumed DSN failed and automatic review rejected reading the container password.
4. The baseline report regenerated; the API conformance benchmark and valid/tampered digest CLI tests passed.

### Gate B — document evidence and evaluation

1. Confirm rights and access conditions for each linked UNEP item before downloading, extracting, quoting, or bundling document content. Argentina's item-level rights were not visible when checked.
2. Have a human reviewer inspect attributable report evidence and record claim-level citations and adjudication notes. Keep the current real mitigation claims at `insufficient_evidence` until then.
3. Expand to 40–80 human-reviewed claims from 10–20 source documents, with source-disjoint splits, contradiction/adversarial cases, citation correctness and a false mitigation confirmation review. The current 15-example set does not meet this target.
4. Only after this gate, decide whether a server-side model-assisted extraction path improves the rules baseline. No model/LLM is enabled now, and no model quality target is claimed.

### Gate C — optional remote services

1. Connect the owner's provider accounts, configure a durable PostgreSQL/PostGIS URL, deploy Pages/API, and verify migrations, CORS, cold start, persisted reads after restart, and the browser journey from the judge-facing origin.
2. If chain anchoring is needed, deploy the contract to Sepolia from an authorized funded account, configure a server-side issuer, record a real transaction, and verify its event and bundle hash independently.
3. Record public URLs and the provider plan limits. Free-tier availability, quotas and cold starts are not equivalent to production reliability.

These remote actions require service accounts, private credentials and in the chain case a funded transaction. They have not been run from this workspace.

### Gate D — competition delivery

1. Resolve event eligibility and the conflicting submission start/deadline instructions with the organizer. The official pages were reopened on 12 October; both conflicts remain recorded in [`research/event.md`](research/event.md).
2. Review asset redistribution rights. The interface image assets have no license manifest in this repository and are excluded from the project-code license by `NOTICE`.
3. Preserve the repository's private setting until the owner explicitly changes it; the published event checklist requests a public code repository.
4. Record a 3–5 minute demo, provide the final project description and accessible links, then submit from the participant's Devpost account.

No registration, public visibility change, video, or submission has been made.

## Blocker log

| Blocker | Current state | Action to resolve |
|---|---|---|
| AI/document audit | No licensed/reviewed report corpus or 40–80 claim benchmark; model-assisted path intentionally disabled | Verify report rights, review evidence, annotate and evaluate before selecting a model/provider |
| Hardware map visual check | Local Chromium reports software-only SwiftShader; map fallback works but live tiles/globe were not visually checked | Open `/dashboard` in a hardware-accelerated browser and verify satellite, grayscale, street, flat and globe modes before recording the demo |
| Remote database and deployment | No owned provider project or connection configured | Owner supplies/connects provider accounts; test the actual free-tier plan and migrations |
| Sepolia receipt | Contract is local-tested; no registry address, RPC, issuer key or transaction | Authorized deployer configures a funded issuer, deploys and performs end-to-end verification |
| Public source repo | Repository remains private by the user's prior request; asset rights unresolved | Review/replace interface images, then get an explicit visibility decision |
| Competition rules | Eligibility, track form, and start/deadline statements conflict | Obtain written organizer clarification and recheck the official page |
| Demo video and submission | Not created; requires a final running browser demo and participant account | Complete local acceptance, record 3–5 minutes, submit through participant account |
