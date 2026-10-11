# MVP delivery and verification status

**Updated:** 2026-10-12 · **Scope:** local hackathon MVP · **Deployment:** not performed.

This report replaces the starter-package status recorded before the API, data, persistence, benchmark, and dashboard work was completed.

## Delivered locally

- The API and dashboard use a traceable, hash-pinned UNEP MARS casebook with three real sources and six linked plume observations. Synthetic fixtures remain separate and explicitly marked.
- Claim categories keep detections, source-level notification metadata, feedback, and mitigation distinct. Real mitigation claims abstain because linked report contents have not been included or reviewed.
- The deterministic baseline emits cited evidence and provenance. Audit bundle revisions persist to an atomic local file or configured PostgreSQL/PostGIS. Production startup requires `DATABASE_URL`.
- The bundle verifier checks canonical SHA-256 integrity. The Solidity registry and receipt verifier are locally tested; there is no Sepolia contract or transaction configured.
- The dashboard supports case/source review, historical map import, region and sector filters, a synthetic demo, audit citations, JSON export, and receipt status. A failed map chunk or unavailable/software WebGL renderer now leaves the rest of the dashboard usable.
- Root docs, data rights notices, CI configuration, deployment guidance, and a reproducible local quality script are present.

## Verification evidence

`bun run check:all` passed on 2026-10-12:

| Check | Result |
|---|---|
| Frozen Bun install | Passed; 138 installs / 211 packages, no lockfile change |
| API and web TypeScript | Passed |
| API tests | 25 passed; 4 optional PostgreSQL tests skipped because no `TEST_DATABASE_URL` was set for the root gate |
| Web tests | 10 passed |
| Local audit verifier tests | 1 passed |
| Data pipeline | 15 Python tests passed; baseline report regenerated |
| Foundry | 4 contract tests passed |
| Vite production build | Passed; map chunk is 1,063.13 kB raw / 290.33 kB gzip and triggers Vite's 500 kB advisory; two upstream Zod annotation notices are non-fatal |

The 15-row conformance report has macro-F1 1.00 across all rows, 10/10 cited supported predictions, and zero false mitigation confirmations. The real-casebook subset alone has macro-F1 0.6667 because it contains no `contradicted` examples; the six synthetic fixtures supply that class. These annotations encode the project's rule policy. They are not a human-adjudicated, independent, or generalizable AI benchmark and do not satisfy the 40–80 claim / 10–20 source target.

Local Chromium acceptance at `/dashboard` passed for the real casebook banner, selecting another case, switching to the synthetic demo and back, a supported detection claim with plume citation, mitigation `insufficient_evidence`, unanchored receipt wording, JSON export, Kazakhstan region filtering, API-503 fallback, and a 390 px viewport without horizontal overflow. A forced lazy-chunk failure also preserved the dashboard. Chromium exposed SwiftShader; the WebGL preflight and software-renderer fallback were verified. Actual raster/globe rendering on hardware-accelerated WebGL has not been visually verified in this environment; third-party tile requests were blocked during the local test.

An isolated file-store restart check created a real-case audit, stopped and restarted the API, then read the same audit ID successfully. `/api/health` reported `backend=file`, `persistent=true`, and `ready=true` after restart.

The PostgreSQL integration suite previously passed against the disposable local PostGIS container (2 tests, 8 expectations). The root gate skips these tests by default. A final repeat with an assumed connection password was rejected by PostgreSQL authentication. Automatic approval review then rejected the proposed action to read `POSTGRES_PASSWORD` from the container configuration, describing it as credential probing from an unapproved source and explicitly disallowing an indirect workaround. No password was printed or retained. The earlier passing integration result remains the available evidence, but it was not repeated after the final root gate.

## Limits and unresolved work

| Area | Current state / blocker |
|---|---|
| AI document review | No OCR, document extraction, or LLM is enabled. The three linked UNEP report pages are link-only; rights and claim-level evidence still need review. Keep the rules baseline until a larger human-reviewed benchmark exists. |
| Benchmark | 15 examples from three real sources plus six synthetic fixtures; no source-disjoint test split and not the blueprint's target size. |
| Blockchain testnet | Registry contract tests pass locally, but no Sepolia deployment, issuer, RPC configuration, funded transaction, or remote verification exists. |
| Public deployment | Cloudflare Pages, Render, and Neon accounts and environment are not configured. No hosted migrations, CORS, cold-start, or browser test was performed. |
| Map visual verification | Software WebGL is handled with a visible fallback. Verify satellite, grayscale, street, and globe rendering in a hardware-accelerated browser before recording the final demo. |
| Asset rights | The user-supplied UI artwork has no source/license manifest. `NOTICE` excludes it from the software license; replace it or verify redistribution rights before making the repository public. |
| Hackathon submission | The repository remains private as previously requested. Devpost currently asks for a public code repository and a 3–5 minute demo. Registration/submission are not confirmed, the event still has eligibility and start-time conflicts, and no video has been recorded. |

No external deployment, public visibility change, transaction, participant registration, organizer message, or Devpost submission was performed. See [`next-steps.md`](next-steps.md), [`deployment.md`](deployment.md), and [`research/event.md`](research/event.md) for the remaining decisions and setup steps.
