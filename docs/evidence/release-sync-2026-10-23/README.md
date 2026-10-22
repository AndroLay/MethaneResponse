# Release alignment — 23 October 2026

This increment brings the existing UI polish, r12 recovery tooling, v18 production
sources, take8 proof and current submission materials into one reviewable source
release. It does not repeat the 48 model episodes or establish user productivity.

## What changed

- The current submission is **v18, 4:57**, with primary source **TKM_S_021**.
  Its take8 export, separately retained digest and Anvil local receipt stay together.
  The archived DeepSeek **KAZ_S_159 DEMO** is a separate integration example.
- README, documentation entry points, story, fields, judges' guide and attachment
  builder use that same scope. Older dated evidence is retained, not relabeled.
- The real-snapshot staging integration test has a 20-second timeout. Two full
  runs exceeded Bun's five-second unit-test default; the same assertions passed
  alone in 4.314 seconds. Assertions and production behavior are unchanged.
- CI now runs the agent tooling regressions after installing its pinned Chromium.
  Locally, the existing executable override selects `/usr/bin/chromium`; the
  missing bundled headless-shell executable caused the initial four failures.
- The source ZIP allowlist now retains the six root configurations needed by
  agent typecheck and Playwright. Its new regression failed before the fix;
  all 16 Python packaging/tooling tests pass after it.
- Publication is allowlisted and scanned for recognizable credential material.
  Test logs and frozen replay inputs are included where checksums require them;
  raw agent transcripts, model credentials, private state and movies are excluded.

## Verification

[validation.json](validation.json) records new results and their boundaries.
Local Bun is **1.4.3**; CI and the deployment pin **1.4.2**. Tests use local mock
models or scripted protocol clients: no paid model call or public transaction.

Fresh passes: **301 API, 282 web, 66 verifier, 16 Python tooling, 221 pipeline,
4 Foundry, 78 agent tooling**, 12 deterministic gates, 17 submission tests and
12 v18 revision tests. Frozen install, typecheck, production build and bundle
budget pass. **42 E2E checks pass**: 29 main plus 13 private/mock-AI checks
(41 browser journeys and one Node schema check). The rules evaluation is
byte-identical to the committed baseline. These counts describe software checks,
not independent model accuracy or measured organizational effectiveness.

The 340 acceptance-bound source hashes, 57 artifact hashes and 73 frozen recovery
input files remain unchanged. Frozen r12 is still **0/48** according to its scorer.
Its [findings](../agent-practical-usefulness-2026-10-21-r12/findings.md),
[recovery audit](../r12-recovery-2026-10-21/README.md) and
[follow-up](../r12-blocker-followup-2026-10-21/README.md) have distinct scopes.

## Publication target and operation

Owner: **AndroLay**. Approved target: GitHub `AndroLay/MethaneResponse`, `main`,
and the existing Render **methaneresponse-preview** in **Andro's workspace**,
Singapore, **Free**, auto-deploy **off**. No new database, disk, signing key or
paid service is introduced. A Free service plan does not establish a workspace-wide
zero-cost billing cap.

Use the [GitHub CI workflow](https://github.com/AndroLay/MethaneResponse/actions/workflows/ci.yml)
and [Render service dashboard](https://dashboard.render.com/web/srv-dbbumltg1s2s73e8cct0)
to inspect the exact published commit. A committed local-gate record is not itself
proof of deployment. Dated [access observations](../../release/devpost-submission/access-status.json)
retain the revision actually checked. Fresh publication/deployment checks are
saved separately under `delivery-output/release-sync-2026-10-23/`.

Stop deployment for failed CI, a changed target/plan or unexpected resource charge.
Rollback target before this release is the retained successful deployment
`dep-dbbunbv4695c73eb958g`, runtime commit
`98b25ca0af1e3e2df7ca9084c1569db1b6712a1e`.
Use **Rollback** on that deployment in the service dashboard, verify `/api/health`,
`/api/intelligence/status` and `/dashboard`, and retain both deployment IDs.
The service uses temporary `/tmp` state; export working records before deployment
or rollback. No permanent shared data store is promised.

## What the public preview provides

The [preview](https://methaneresponse-preview.onrender.com/dashboard) serves the
historical map. Anonymous baseline operations are restricted to KAZ_S_159,
LBY_S_143 and CAN_S_002. Private review and blockchain writes remain disabled;
the full TKM workflow in the video runs locally. A configured model is not evidence
of a new successful provider assessment during this release.

The MP4 remains a local artifact until uploaded and checked anonymously.
Normal-speed playback/listening, human productivity, field repairs and emissions
reduction remain unverified. See the [current submission](../../release/devpost-submission/README.md).
