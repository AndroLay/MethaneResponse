# Investigation Operations — local prototype evidence

20 October 2026, Asia/Makassar. Builds on the existing capacity planner in the current working tree. No database, new dependency, deployment, publication or paid service. Earlier frozen evidence retains its original bytes. [Implementation checklist](../../plans/2026-10-20-investigation-operations.md) · [User walkthrough](../../product/user-workflow.md#operasikan-dan-tinjau-rencana) · [API contract](../../architecture/api-reference.md#versioned-investigation-plan-decisions).

## Implemented increment

- **Explicit active portfolio:** one verified strategy drives the same ordered queue and map rings. Queue pagination is ten rows; the planner is bounded to fifty selections. Changing capacity or strategy does not replace the active queue until activation. Context matches snapshot ID, archive and normalized-input hashes. A delayed replay cannot activate a strategy already changed by the analyst.
- **Map and evidence handoff:** each queued ID opens that source, clears hiding filters after navigation is accepted, and focuses its stored coordinates. Planned markers use one GeoJSON ring layer, without extra imagery, animation or shader. A single click dispatcher prioritizes a planned ring over overlapping source/observation/footprint/cluster hits. Its layer decision helper has linked/unlinked overlap regressions. The plan legend is inside the existing collapsible legend to avoid another persistent overlay.
- **Verified comparison:** import a bare plan or reviewed history with a separately recorded trusted digest. Replay and snapshot/publisher/visibility checks precede comparison. Capacity or strategy changes on one snapshot are labeled allocation changes. Different compatible snapshots can expose changed source summaries and selected sources to inspect.
- **Authenticated reviewer decisions:** signed private-read/review scopes and current operator-attested source-investigation authority are mandatory. The server recomputes the displayed report, owns actor/time and checks revision plus parent hash. Accept/defer/reject append immutable revisions; repeated report bodies are deduplicated. Conflicts retain browser drafts until the analyst explicitly reloads/reviews current history. Draft recovery keys include reviewer identity; this prevents accidental cross-reviewer restoration, not strong browser-storage isolation.
- **Independent command:** `verify:plan` requires an expected head from a separate trusted source, validates every revision/hash link and replays all referenced reports. Editing and recomputing a file's own checksums cannot defeat a different trusted expected head. It does not independently authenticate the reviewer or establish current status.

## Inspect the actual allocation

The complete pinned snapshot contains **4,218 historical source records**, joined by exact ID to **23,861 linked plume records**. The archive contains 30,414 plume records in total; unlinked records are not assigned to a source. Observation coverage is **2020-10-29–2026-09-13 UTC**, snapshot `unep-mars-675417694883`.

[Verification output](proof/verification.json) records the exact ten- and twenty-source selections. Default weighted strategy, maximum two per country and a 50/50 indicator blend: ten additional slots add ten IDs and remove none. There is **no dataset change** and no measured climate benefit. [Comparison](proof/comparison.json) reports zero changed selected summaries. [Reviewed history](proof/DEMO-reviewed-history.json) contains two versions with real historical inputs and explicitly **DEMO software reviewer decisions**, not human-study evidence.

The proof runner reopens the private file store and runs six separate CLI processes: original passes; edited, edited-and-rehashed, wrong head, missing head and unknown option fail. Exact exits are in the verification output. These are policy/integrity checks, not domain accuracy or a blockchain transaction.

## Reproduce

```bash
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/ai-review-workflow.spec.ts
bun run prove:operations --output /tmp/NEW-operations-proof
bun run verify:plan docs/evidence/investigation-operations-2026-10-20/proof/DEMO-reviewed-history.json --expected-head TRUSTED_HEAD_FROM_SEPARATE_RECORD
```

The proof command refuses an existing output directory. Replace the expected-head placeholder with an independently authenticated digest; copying an attacker's own digest proves only self-consistency. Browser tests require local process/socket permission. They use fresh production builds, isolated file state and ephemeral fixture credentials, with Chromium sandbox enabled locally. Main and private phases should run sequentially because each rebuilds the same dist directory. Keep different `PLAYWRIGHT_OUTPUT_DIR` paths when retaining captures from separate invocations.

## Review findings and failures retained

An independent read-only implementation review found stale strategy activation, mismatched restored country scope, recovery keys missing reviewer identity and duplicate click handlers on overlapping map layers. All four have source fixes and regressions. A follow-up source review found no remaining actionable issue within that scope; it did not execute tests or authenticate scientific claims.

Initial browser launches were blocked by environment socket restrictions, then a run encountered an occupied test port. Authorized local process execution and dedicated ports resolved those launch boundaries without disabling Chromium's sandbox. Reviewer browser attempts also exposed label lookup failures after a form value changed; explicit accessible labels and semantic combobox selection were added, then the full reviewer scenario passed. Earlier failed attempts are not counted as passing scenarios. Full trace/network archives remain temporary because they can contain ephemeral test tokens.

## Boundaries and next work

- Different-snapshot comparisons cover country, sector, median flux/reported SD, observation/date counts, missing flux and last observed date. They are **not a full observation-record, notification or feedback delta**. Actual next-snapshot acquisition/chronology and comparisons with a complete real second snapshot remain unverified; cross-snapshot logic currently uses explicit DEMO regression fixtures.
- Queue entries are proposed investigation allocations, not assignments or sent evidence requests. Priorities are heuristics, not calibrated future leakage probabilities or quantified avoided emissions. Feedback is not repair; missing later observations are not zero methane.
- Active selection is browser memory and does not survive refresh. Private reviewer history persists only while its local file volume persists. One writer, backups and file permissions are required. The companion JSON plus initialization marker detects partial lost state; losing the entire volume and marker is not detectable. No multi-instance or encryption claim is made.
- History is private, unsigned and **not blockchain anchored** by this increment. Existing audit receipts/contracts remain compatible. This run does not establish a Sepolia receipt, live AI quality, a real reviewer identity, human pilot benefit, physical repair or public deployment.
- Mobile captures emulate a viewport on desktop Chromium. External basemap requests are blocked for reproducibility; they do not verify live imagery quality, physical-phone performance or guaranteed FPS. Styling is inspected on actual rendered application captures.
- A competition result cannot be guaranteed or inferred from source line counts or test counts. The next product evidence should be a complete real second snapshot, document-grounded briefs with an available provider, and measured investigation decisions under a prospectively fixed comparison.

## Final verification

`bun run check:all` exited **0** on the final implementation: frozen dependency install (unchanged), API/web/E2E/evaluation type checks, **243 API + 267 web + 55 tooling + 217 Python + 4 Foundry = 786 main tests**, production build, bundle gate and rules conformance evaluation. No failing or skipped main tests were reported. Browser checks were run separately: **25 main + 10 private/team/publication/mock-AI = 35 unique scenarios**, zero failures, retries or skips. Five runner helper regressions also pass; repeated helper/focused runs are not added to unique coverage.

App entry is **72,831 gzip bytes** under its 75,000-byte budget; eight required lazy route chunks remain. MapPanel is independently lazy at **1,124,042 raw bytes**. Its large-chunk build advisory remains; passing the entry budget is not a phone FPS or production latency guarantee. There is no new dependency or database migration.

The compact-data proof runner also passed all six CLI scenarios in a fresh temporary directory. The repository-evidence journal was separately accepted by `verify:plan` against a separately supplied recorded head. This is a software fixture, not independent authentication of its publisher. All **72 artifacts** listed in the three earlier frozen manifests (25 Decision Lab, 30 Observation Cross-Check, 17 Capacity Planner) retain their original checksums. New records are bound to this uncommitted working tree, not a new GitHub release or live deployment.

[Command summary and source bindings](checks.json) · [Main-gate output summary](checks-output.txt) · [Browser results](browser-output.txt) · [Artifact checksums](artifact-manifest.json).

Actual browser captures inspected after rendering: [active-plan map and queue](active-plan-globe-desktop.png), [mobile queue](active-plan-queue-mobile.png), [review history desktop](plan-review-history-desktop.png), [review mobile](plan-review-mobile.png). The map capture includes rendered ring markers with external basemap imagery intentionally unavailable; it is not a claim of live imagery quality.

### Changed surfaces

| Surface | Main files | Compatibility |
|---|---|---|
| Shared policy/history | `packages/shared/src/investigation-planner.ts`, `plan-journal.ts` | Additive comparison/journal; planner policy/schema preserved |
| Private backend | `apps/api/src/plan-store.ts`, `app.ts`, `index.ts`, exported atomic-write utility | Companion JSON; existing audits/receipts unchanged; no migration |
| Workspace and styling | `InvestigationPlanner`, `PlanQueue`, `PlanComparisonPanel`, `PlanReviewPanel`, `plan-session`, `App`, `CasesWorkspace`, `MapPanel`, planner CSS | Existing routes retained; active selection is memory-only |
| Tooling and regressions | `verify-plan.ts`, `investigation-operations-proof.ts`, API/web/CLI tests and both E2E specs | CLI requires separately trusted head; mock reviewer/provider clearly distinguished |
| Guidance | Root README, user workflow, API reference, testing guide, current status and implementation checklist | Earlier evidence files preserved |
