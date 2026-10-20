# P2: related evidence, next-release intake and delivery

**20 October 2026.** Local prototype verification. Read [checks.json](checks.json)
for exact commands/results, [source-bindings.json](source-bindings.json) for the
source bytes, and [artifact-manifest.json](artifact-manifest.json) for this package.
Earlier frozen evidence packages have not been rewritten.

## Implemented

- Authenticated comparison of at most 500 saved investigations in the same
  snapshot. Candidate reasons retain source/claim/period, declared document
  SHA-256, hashed reference pointer and assessment-bundle identity. Notes, full
  document text and raw URLs do not enter the comparison report.
- Ten-row pages, explicit reviewer interpretation, draft/save lifecycle,
  current-authority checks, stale-response guards, public-preview denial,
  bounded concurrency and per-process quotas. Legitimate reuse is an explicit
  option. There is no automatic verdict, facility merge or double-counted repair
  finding. The stored note retains the exact report and candidate revision IDs.
- Standalone report replay using an independently recorded expected digest.
- Opt-in publisher download with stable ETag/size/MD5, archive SHA-256, bounded
  bytes, fixed URL/redirect checks and restricted staging output. A separate
  stage command protects active/frozen trees, verifies both snapshot hashes,
  records a full diff and never promotes the candidate automatically.
- Allowlisted source ZIP and current judging attachment with per-file manifests,
  checksum/CRC verification and explicit exclusion of private runtime state.

[Runbook and commands](../../development/evidence-overlap-and-snapshot-intake.md).

## Actual later UNEP release

The official CSV ZIP was downloaded on **20 October 2026**, preserving the
publisher's archive bytes and metadata. Archive SHA-256:
`b65f695b516851c1eb0cae4a730615e64b909333dc0203dc15d90367d543a6fd`.
The normalized candidate is `unep-mars-b65f695b5168`: **4,197 sources, 30,529 plume
records, 23,954 exactly linked and 6,575 unresolved**, covering observations
through **19 September 2026 UTC**. Original identifiers, dates and uncertainties
are preserved; no proximity-based identity merge is introduced.

Compared with active `unep-mars-675417694883` (4,218/30,414):

| Record change | Count |
|---|---:|
| Sources added / removed / changed | 23 / 44 / 332 |
| Plumes added / removed / changed | 221 / 106 / 16 |
| Additions later than old coverage / historical backfill | 194 / 27 |
| Existing plume link reassigned | 4 |
| Affected source IDs across both inputs | 400 |

TypeScript canonical replay and a separate Python semantic implementation agree
on **8,415 source records and 60,943 plume records** across both inputs. See
[replay-verification.json](snapshot/replay-verification.json). These are archive
differences, not counts of newly leaking or repaired facilities. Source removals
and changed IDs make automatic promotion inappropriate without further review.

**The active map, intelligence and historical decisions remain on the old
snapshot.** This package retains the candidate for independent offline replay;
it is neither live monitoring nor an activated release. Original archive bytes
are retained in ignored local delivery output, not redistributed in this package.
Publisher transport hashes do not establish a publisher digital signature.
A redundant second acquisition with hardened final-URL checks was reset before
completion; it is not counted as another successful live download.

### Repeat the comparison

Run from repository root, with these hashes also obtained through a separately
trusted channel when verifying someone else's copy:

```sh
bun run verify:snapshot-transition docs/evidence/p2-delivery-2026-10-20/snapshot/report.json --before apps/web/public/data/mars-snapshot.json.gz --after docs/evidence/p2-delivery-2026-10-20/snapshot/candidate.json.gz --expected-before f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7 --expected-after dfd7bd61e032964ff09abfc61f0335b228be08e69baed8ee86cd19ba5382abc0 --expected-report 0x7382b7a110ee6f90d7ea7fd16d26f009bcf4d70f591c0b8126f9f03ba11dd20c
```

## Final local checks

- `bun run check:all`: **876 primary tests** (296 API, 277 web, 63 TypeScript
  tooling, 221 pipeline Python, 15 delivery-tool Python, 4 Foundry), frozen
  install, typecheck, production build and bundle budget pass. The final run used
  a clean extracted source ZIP and an offline dependency cache; all 602 runtime/input
  bindings match the current tree. Local Bun was 1.4.3; CI/Render pin 1.4.2 is
  checked separately on GitHub.
- Final separate browser invocations: **28 main + 12 private = 40 unique checks**,
  comprising 39 browser journeys and one Node schema check. No retries or skips.
  The five harness helper tests and recorded repeat are not counted again.
- Actual Anvil integration (1), casework crash/backup operations (2), publication
  crash/restart (1), current judging packager tests (9), video editor tests (3)
  and four standalone overlap CLI scenarios match their expected results.
- App entry is **74,673/75,000 gzip bytes**. Lazy MapPanel still has a raw-size
  advisory of 1,124,042 bytes. Viewport mobile checks are not physical-device FPS.
- **131 earlier frozen artifacts across six packages** still match their hashes.
  The technical video is 65.4 seconds; full decode and declared media targets
  pass. Human normal-speed audiovisual review remains unperformed.

## Runtime evidence and review

The retained desktop and mobile-viewport captures are real Chromium output.
The new journey compares two software DEMO investigations for a real historical
source, records legitimate reuse into draft notes, saves a later response, freezes
the exact decision, verifies the export and recommends review after another
response without changing the frozen determination. This is software testing;
the DEMO reviewer is not a recruited person, expert or independently enrolled
operator. Source metadata is real; questions, requests and responses are fixtures.

The Anvil proof calls the actual Solidity contract on disposable local chain
31337, checks events and historical/latest receipts, rejects altered content,
and recovers failed acknowledgement/crashes. It spends no public-chain funds.
The shared contract and old audit formats remain unchanged.

Static read-only review identified path/redirect and archive filtering issues;
regressions reproduce and close those findings. Residual limits include a
single-writer file store, process-local quotas, declared document hashes,
unsigned offline digests and a comparison limited to authorized current work.
This is not a comprehensive penetration test or distributed load benchmark.

## Delivery and external boundaries

- Current source and judging ZIPs are generated locally under `delivery-output/`.
  The full source ZIP is separate from the Devpost attachment size limit.
- Video v12 remains the **historical 19 October** presentation. A separate
  [technical supplement](../../demo/connected-2026-10-20/README.md) records the
  current connected investigation and overlap workflow in the actual browser.
  It has English chapter captions and the original instrumental; v12 retains
  its narrated presentation. Neither recording depicts a public-chain transaction.
- The user approved push and a Render Free preview **only if Rp0 can be verified**.
  The connector exposes workspace/services but not billing/spend caps, so no new
  Render resource is created on that evidence alone. Existing Evidrilo services
  are not modified. A free-plan label is not proof of a workspace-wide cost cap.
- Live provider quality, public Sepolia, physical mobile GPU performance,
  cross-provider facility matching and a real human pilot are not established.
  Expert/pilot recruitment remains deferred by the user. Video upload, Devpost
  submission and a publicly verified application are separate tasks.
- Feedback is not repair; missing later observations are not zero emissions;
  hash/receipt verification is not physical truth. No competitive ranking or
  environmental outcome is inferred from test counts.

## Rights

Software: MIT. The new normalized MARS candidate and record-diff material remain
attributed **UNEP IMEO Eye on Methane / MARS, CC BY-NC-SA 4.0**, with normalization
and comparison changes identified in the manifests. No third-party report body
or figure is reproduced. Screenshot data and basemap rights retain their original
conditions; no illustrative plume is presented as evidence.
