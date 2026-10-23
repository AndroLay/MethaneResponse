# Non-Render Completion — 20 October 2026

User request: complete open work other than Render. Baseline
`173bbb8`; the working tree was clean before this increment. Preserve frozen evidence,
the active snapshot, audit compatibility, and the no-database prototype boundary.

## Sequence and acceptance evidence

1. [ ] **CI fix and local map handoff.** Deterministically reproduce the capacity 10→20
   queue-to-map failure, fix the cause without weakening assertions,
   add viewport/loading regressions, and run the gate. The gate passed 877 tests and 40 browser
   checks; public CI for the new revision must be checked after an authorized push.
2. [x] **AI readiness; user deferred live Luna.** Inspect available configuration/model without printing
   secrets. Run only an authorized endpoint with authorized inputs and the stated
   cost limit. Separate transport/model checks from an
   independent benchmark; do not fabricate human review or independent labels.
3. [x] **Local blockchain.** Read-only Sepolia inspection showed balance
   0, nonce 0, and no registry. The user then chose an unfunded prototype:
   active acceptance uses Anvil 31337. Transaction integration, receipts,
   historical versions, tamper rejection, and crash recovery were rerun and passed.
   No public broadcast occurred. Sepolia is optional, not a local completion requirement.
4. [x] **Data and advanced capabilities.** Review the 20 October release candidate and
   dependency readiness before activation; do not partially replace the snapshot/intelligence
   or prior decisions. Cross-provider matching scope must
   remain distinct from proven facility identity.
5. [x] **Latest materials and packager.** Align status, demo, source/judging ZIP, and
   manifest to the tested revision. Preserve v12 and the historical supplement.
   Prepare a concrete publication package before seeking approval that has not yet been given;
   do not automatically submit to Devpost or contact anyone.
6. [ ] **Local verification and closure package.** Local gate, desktop/mobile browser viewports,
   reproducible artifacts, source bindings, the approved push, and new CI.
   Record anything not verified without model/rights review,
   upload access, people, or physical equipment; ETH tests are needed only if
   a Sepolia transaction is later chosen, not for the local prototype.

## Initial findings

CI `39419272105`: data-pipeline and contracts passed; 27/28 main workflows
passed. The `.plan-map-caption` assertion in `audit-workflow.spec.ts:129` did not
find "20 planned sources". A reproduction that held IntersectionObserver only
for the map wrapper produced the same failure: the map had not mounted.
Explicit Locate now loads and scrolls to the map without waiting for the observer;
lazy loading still applies without a focus request. Unit and browser checks went red→green.

AI configuration and YouTube upload were unavailable in the process environment.
The project's private Sepolia configuration was present but not printed or moved. Historical
authorization was available for one deployment target and one anchor with a 0.004 SepETH limit;
funding and target conditions were checked read-only. Render was excluded.

## Latest decisions and work intentionally left unforced

- **Luna:** the user will provide model configuration later. No replacement model
  was downloaded, paid provider called, or independent benchmark fabricated. The
  [integration contract](../development/luna-integration.md) is ready;
  compatibility/live-model verification will occur when access is available.
- **Dataset candidate:** independent read-only review recommended keeping
  staging. Activation requires rebuilding all derivatives/geometry/intelligence and
  replaying versioned transitions so old audits are not retargeted. Records with
  deleted/relinked sources are not proof of repair. The complete staging results were retained.
- **Publication:** a source push was authorized. The read-only Devpost connector's
  `list_my_projects` returned internal error `-32603`; no target form was successfully
  read. Software tests do not establish that video upload, submission, human pilot, or physical
  equipment work is complete. No Render action occurred.
- **Review:** the Locate path received independent read-only review; no blocker was found
  in supported browsers. This browser gate does not test a DOM shim without
  `scrollIntoView`.

Final increment results are recorded in a new dated evidence package; P2 evidence
and older packages remain byte-for-byte unchanged.

**Local results:** 877 main tests, 40 browser/schema checks, one Anvil integration, and
11 submission-packager tests passed. 170 prior frozen artifacts still match. The source
push and public CI have separate timestamps/commits; this local status does not
claim application publication or real-model success. [New evidence](../evidence/non-render-completion-2026-10-20/README.md).

## Public checks after push — follow-up

The local gate and Anvil proof above still apply to the recorded source bytes.
However, public CI runs `39424647485` and `39427086280` still failed on the map handoff
caption. The explicit focus fix addressed the local observer reproduction, but was not
enough to conclude that the CI root cause was resolved. In the second run, the caption for 20
sources was present when the failure handler read the DOM after the deadline; the queue remained
20, with no page error or React boundary fallback.

The CI-pinned browser (Chrome Headless Shell 156.0.8078.4) passed the focused test,
the repeat with 8× CPU throttling, and the first four workflow sequence.
A one-CPU experiment in host Chromium also passed. Run `39428246566` then
showed the caption entered the DOM 0.44 seconds after Locate and the module finished
in about 90 ms, but map mounting was followed by a 20.715-second long task. The late-import
hypothesis did not explain that run. The test failure remains recorded; the timeout was not increased.

Source inspection found a WebGL probe on a temporary canvas, context loss,
then the actual MapLibre context. Browser regression confirmed two contexts before
the fix and one after. The implementation now detects the renderer using the actual
canvas and catches MapLibre construction failures for fallback. Bootstrap pixel
ratio ≤1 preserves the selected quality ceiling/cache; the quality effect
raises resolution after initialization. No new permanent quality limit was added. Native
method timers were only a CI fixture experiment, not product code; the final gate does not
replace the WebGL method. Record the gate/browser results separately from CI for the final revision;
a local fix does not automatically close CI. Frozen evidence remains unchanged.

## Screenshot follow-up after the context fix

Revision `e7b1845` resolved the map handoff stall in two CI attempts: all
28 main workflows passed. Both attempts then failed on overlapping captures
in the private reviewer suite, after earlier functional assertions had passed.
The 20-second capture failure was reproduced using pinned Chromium and
one CPU. Animation, caret, and frame-diagnostic experiments did not resolve it, and
all experimental spec changes were reverted.

Architecture review found that the private suite, which has no WebGL interaction, used the same
SwiftShader override as the globe suite. Graphics settings are now limited to the
geospatial suite; the private suite uses Chromium defaults. The sandbox,
timeout, network isolation, and assertions are unchanged. The same one-CPU reproduction then
passed in 44.6 seconds, including desktop/mobile screenshots. The graphics-selection unit regression
went RED→GREEN. The full gate and CI for the new revision must still be
checked from actual results; passing this focused test does not imply they passed.
