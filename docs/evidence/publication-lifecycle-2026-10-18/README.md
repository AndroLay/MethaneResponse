# P3: public-summary correction and withdrawal

[Status](../../release/current-implementation-status.md) ·
[Plan](../../plans/2026-10-17-six-package-completion.md) ·
[Runbook](../../development/publication-lifecycle.md) ·
[ADR](../../architecture/decisions/2026-10-18-publication-lifecycle.md)

**18 October 2026, WITA: six P3 criteria verified locally.** Disposable API, filesystem
and Chromium only; no external publication/deployment. Base HEAD
`a82e2eee99bb79327f859f304f2f5d5939f07041` plus working-tree hashes in
[implementation-files.sha256](implementation-files.sha256), not a new public commit.
Earlier P1/P2 evidence remains retained.

## Acceptance

Memory/file APIs verify publish→correct→withdraw with immutable hashes and
supersession. Actual HTTP processes were killed after correction/withdrawal and
restarted; status/private actor survived. Envelope 2 atomically stores audits,
intents and events; actor is server-derived, public reasons are enums, and old
bundles remain unchanged. Legacy arrays/envelope 1 migrate; missing envelope 2
events fail closed.

Current publication is selected per scope/claim **before** pagination, including
withdrawal tombstones. History/direct URLs disclose old status and public successor
without leaking private revision IDs. Each revision needs fresh consent; inspection
is not automatically restored. Interposed private revisions do not affect public
records. Anonymous full schema 4 is 404. Actor, private wording, rationale, recipient
and URLs are excluded.

Offline CLI accepts valid historical summary checksums with
`publication_status: NOT_CHECKED`; tamper and missing required chain fail. UI checks
live status before download and verifies imported summaries. Browser tests cover
11 revisions/two pages, reload, direct detail, keyboard cancellation/confirmation,
failed refresh clearing old rows, human parent after baseline, and concurrent correction.
Stale writes admit only one mutation; repeated withdrawal returns 409. Anonymous,
read-only, revoked, expired, out-of-authority or unavailable-directory requests fail;
authority is rechecked inside the writer queue. Parent loading validates
scope, dataset, digest, pagination and confirmation before replacing a draft.

## Recorded checks

|Command|Result|
|---|---|
|`bun --no-env-file run check:all`|164 API/29 files/975 assertions; 240 web/50 files/164,951 assertions; 36 verifier/6 files/150 assertions; 160 Python; 4 Foundry; 15 baseline-conformance cases; typecheck/build/bundle passed|
|`bun --no-env-file run check:e2e`|Passed after browser-selector adjustment|
|`test:publication-operations`|One pass, 15 assertions; HTTP API and two-stage SIGKILL/restart|
|`test:case-work-operations`|Two passes, 17 assertions; backup/restore/lock/crash|
|`test:chain-integration`|One pass, 22 assertions; Anvil 31337, real contract, crash, pending, revert, latest/historical, separate CLI|
|`bun --no-env-file test scripts/evidence-transport.test.ts`|One pass, 10 assertions; loopback TLS, IP/hostname/size/redirect|
|Sandboxed Chromium E2E|14 main+9 private/manual/shared/mock AI=23 passed; four new P3 journeys; three runner-helper regressions/six assertions also passed, focused repeats not added|

Frozen install changed no dependency/lockfile. App 74,957 gzip bytes against 75,000,
eight required route chunks; lazy MapPanel 1,122,953 raw bytes advisory. A 43-byte
bundle margin is not device performance. Runtime: Bun 1.4.3 (repository pin 1.4.2),
Python 3.12.13, Chromium 153 sandboxed, Forge/Anvil 1.8.5, Linux `flock`. Environment was
allowlisted/dotenv disabled; temporary test credentials and operational state were
not included in artifacts.

## Iteration and review

Initial tests failed before lifecycle status/private loader existed. Regressions
then covered legacy consent, missing events, human parent after baseline, queued
revocation and duplicate current publication. Browser scenarios needed explicit
DEMO navigation after reload and matching claim selection; those were fixture
corrections, not ignored application passes. Read-only review prompted fixes for
parent blocking, queued authorization, current-publication uniqueness, parent loading
and list refresh after withdrawal. Rereview found no further consequential issue
in scope; this is neither methane-expert review nor security certification.

[Manifest](manifest.json),[source binding](implementation-files.sha256),
[baseline conformance](baseline-conformance.json),[documentation path check](documentation-path-check.json),
[checksums](checksums.sha256),[desktop](DEMO-publication-desktop.png),
[mobile](DEMO-publication-mobile.png). DEMO captures were visually inspected with
credentials cleared. Viewport emulation is not a physical phone. Sensitive traces
were excluded. Historical hashes remain unchanged; original pre-translation
narratives are available at `9d38ad2`.

P3 cannot erase downloads/blockchain, sign server chronology, authenticate physical
documents or establish repair/emissions reduction. One writer and persistent local
disk remain assumptions. Pagination needs refresh after changes. Older P2 binaries
cannot read envelope 2; roll forward and retain complete backup. No old backup was
restored or operational state changed in this run. Public Sepolia, P4 experts, P5
human pilots and P6 real-model benchmarks are not completed by P3.
