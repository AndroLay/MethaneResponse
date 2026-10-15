# Verification evidence

These records describe checks that were actually run, including their data snapshot, runtime, and limits. A local pass does not imply that a cloud service, physical device, model provider, or blockchain transaction was tested.

| Evidence | What it covers | Important boundary |
|---|---|---|
| [MARS publisher indicators — 15 October 2026](mars-publisher-indicators-2026-10-15/README.md) | Publisher archive import, exact source joins, country-period values, local API/UI test gates, browser workflow and desktop/mobile captures | Historical local snapshots only; no live AI, hosted persistence, blockchain transaction, or physical-device test |
| [15 October execution checkpoint](../history/execution-checkpoint-2026-10-15.md) | Latest dated source, CI, browser, data, performance, and external-service status recorded in the repository | Chronological engineering log; read the result's revision and run conditions |
| [Full local quality gate](local-quality-gate-2026-10-14.md) | API/PostGIS, web, verifier, Python, Foundry, build, and baseline reproducibility | Disposable local PostGIS, not cloud database durability |
| [Live local browser UAT](live-local-uat-2026-10-14/README.md) | MARS map → case → observations → baseline audit → local history and digest verification | Local file store; AI and Sepolia were not configured |
| [Audit export and tamper-detection demo](demo-workflow-2026-10-14/README.md) | JSON export, local digest verification, process restart, and rejection of a modified bundle | No on-chain receipt; local SHA-256 is not physical-truth evidence |
| [UI workspace captures](ui-workflows-2026-10-14/README.md) | Cases pagination, Map Explorer, Evidence Auditor, Operators, Settings, map styles, and fallback states | Chromium screenshots from a dated UI revision |
| [Performance measurements](map-performance-amd-radeon-680m-windowed-2026-10-15.json) | Recorded renderer metrics for the named hardware/runtime scenario | Do not generalize to other GPUs, phones, networks, or FPS targets |
| [Map performance on public revision `9ab1daf`](map-performance-amd-radeon-680m-windowed-2026-10-15-9ab1daf.json) | Five fresh contexts each at 1280×800 and 390×844 viewport emulation on Chromium 153 / AMD Radeon 680M using the production preview | Desktop GPU and viewport emulation only; not a physical phone or deployed CDN measurement |
| [Target-user pilot protocol](target-user-pilot-protocol.md) | Reproducible task prompts, consent/privacy limits, measures, and reporting template | Protocol only; no participants or user-study results have been collected |

## Read evidence correctly

- Treat the snapshot ID and archive hash in each record as part of its result.
- Treat an AI browser run against a deterministic mock provider as workflow coverage, not as an AI quality score.
- Treat a disposable PostGIS test as migration/integration coverage, not a cloud backup or multi-region test.
- Treat a local report digest or blockchain receipt as evidence of bundle integrity and chronology, not proof that a leak was repaired.
- For current source behavior, start with the root [README](../../README.md); for historical data provenance, use [`data/real/README.md`](../../data/real/README.md).
