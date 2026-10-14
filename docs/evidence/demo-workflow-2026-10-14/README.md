# Browser rehearsal evidence — 14 October 2026

This records one isolated local run of the historical-source → baseline audit → JSON export → independent digest verification workflow. It is implementation evidence for a research prototype, not proof of methane mitigation, live AI, or blockchain anchoring.

## Run conditions

- Browser: sandboxed Chromium driven by the installed Playwright CLI.
- Web route: `/dashboard/audit?sourceId=KAZ_S_159` on local Vite port 5178.
- API: local Hono on loopback port 3004 with an isolated file store at `/tmp/methane-response-demo/audits.json`.
- `DATABASE_URL`, AI provider credentials, reviewer credentials, RPC settings, and registry address were explicitly empty. No cloud database, model provider, reviewer endpoint, or blockchain transaction was used.
- Data snapshot: `unep-mars-675417694883`, archive SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`, 4,218 source records and 30,414 plume records, dates 2020-10-29 through 2026-09-13 UTC.

## Observed workflow

1. Opened the real `KAZ_S_159` source in Evidence Auditor. The UI showed three linked observations; latest was 496 ± 226 kg/h at 2026-07-11 08:12 UTC from EnMAP - DLR. It labeled the plume outline as a publisher-supplied historical geometry, not raw imagery or concentration.
2. The UI listed one official report link but did not include its text in this assessment. Ran the deterministic `mitigation_confirmed` baseline against the evidence bundle. It returned `insufficient_evidence` with: “No evidence of the required type. Absence does not prove the claim is false.” No AI assessment or human review ran.
3. Exported `audit-report.json`. Export file SHA-256: `60c2f87a829f564553d5d2d2b2329c68680afdfcd7c1dbd8b2cefb94798f8233`.
4. Used the app’s saved-digest control. It displayed `Local SHA-256 valid · no on-chain verification (not_configured)`.
5. Restarted the local API with the same temporary `AUDIT_STORE_PATH`; Saved audit history then displayed one loaded revision for `KAZ_S_159`. This proves survival across a local API process restart with this file store, not cloud or multi-instance durability.
6. Imported the exported JSON into the browser’s independent report verifier. It reported `Audit bundle SHA-256 digest matches` and `No blockchain receipt is included in this file.` The file was parsed locally; the UI states it is not uploaded.
7. Independently checked the JSON with `bun run verify:audit docs/evidence/demo-workflow-2026-10-14/audit-report.json`. Result: `bundle_hash: VALID`, audit ID `242a2305-622b-487d-a8a9-f230e944cf3b`, revision 1, bundle SHA-256 `0xdb89dbff4aa52645819f0bcd695f7099f8f8e27f3b4bea14491f2111f41305a3`, `chain_receipt: ABSENT`.
8. Changed the result only in a disposable copy under `/tmp`; the same independent verifier returned exit code 1 and `bundle_hash: INVALID`. The evidence report itself was not changed.

The browser console had zero errors at inspection. At a 390 × 844 viewport, document width was 390 px and the verifier panel width was 368 px; no horizontal overflow was detected. This was a local Chromium run, not a physical-device, public-network, cloud, AI-provider, or Sepolia test. Screenshots show first-party verifier UI only and contain no satellite imagery.

## Artifacts

- [`audit-report.json`](audit-report.json) — unmodified JSON exported by the app, bound to the current MARS snapshot.
- [`audit-integrity-verification.png`](audit-integrity-verification.png) — browser screenshot after the saved local digest passed.
- [`audit-import-verification.png`](audit-import-verification.png) — desktop screenshot of the imported JSON and browser verifier result.
- [`audit-import-verification-mobile.png`](audit-import-verification-mobile.png) — 390 × 844 responsive screenshot of the imported result.
- [`demo script`](../../demo/IEEE-ClimateChain-4m40s-script-2026-10-14.md) — timed narration draft; still requires a clean rehearsal on a frozen release before recording.
