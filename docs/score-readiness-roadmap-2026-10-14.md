# MethaneResponse score-readiness roadmap

- **Updated:** 2026-10-15
- **Purpose:** Track evidence needed to make an internal target of at least 18/20 per criterion defensible. This is a project plan, not an official score prediction. Devpost publishes five qualitative criteria without numeric weights or an 18/20 threshold.

For the task-by-task execution plan, expected artifacts, acceptance criteria, owners, dependencies, fallback paths, and revised estimates, see [`MASTER_EXECUTION_PLAN_2026-10-14.md`](MASTER_EXECUTION_PLAN_2026-10-14.md). This file remains the shorter status/evidence board.

## Current state

The local prototype uses the verified active MARS snapshot `unep-mars-675417694883` (4,218 sources, 30,414 plume rows through 2026-09-13 UTC), preserves earlier releases, and exposes source-bound observation geometry. Its deterministic claim-audit baseline, document-grounded assessment path, human review, immutable reports, and local hash verifier have local regression coverage. Chromium UAT covers source history → abstaining mitigation audit → API restart → digest verification, plus real marker selection, full-case handoff to Auditor, and changing the Auditor case through search. The 15 October browser workflows additionally cover mock AI assessment, exact citation, abstention, scoped review, private reports, and digest verification; they do not prove real-model quality. Seven screenshots and exact limits are recorded in [`live local UAT evidence`](evidence/live-local-uat-2026-10-14/README.md). A separate rehearsal covers report export and CLI verification. At the 15 October check, unauthenticated GitHub API and `git ls-remote` verified the public repository; `main` resolved to `e9cae42117aaa87d7c1c862f5242c00b3a0c64fd`. This proves source accessibility, not submission readiness. The read-only `check_mars_upstream.py` command now compares the pinned snapshot's archive headers against official CSV and GeoJSON objects; on 15 October both still match, so no new release was imported.

Latest complete aggregate local evidence recorded in the 15 October checkpoint passed API/PostGIS **116 tests / 679 assertions / 0 skips**, web **180 / 164,729 assertions**, verifier/workflow **27 / 120 assertions** at that full-gate checkpoint, Python **140**, Foundry **4**, typecheck, production build, bundle budget, and baseline reproduction. The subsequent matched-renderer tool change passed `bun run check`, `bun run test:verifier` (**40 / 161 assertions**), `bun run test:map-performance` (**13 / 40 assertions**), and Bun bundling. Latest source-code commit [`2b62634`](https://github.com/AndroLay/MethaneResponse/commit/2b6263492bb1901e342abf4764c282145c028f1a) passed all CI jobs in [run 38659420168](https://github.com/AndroLay/MethaneResponse/actions/runs/38659420168): API/PostGIS **117 tests / 688 assertions**, web **181 / 164,731 assertions**, verifier **40 / 161 assertions**, three browser workflows, Foundry **4 tests**, and data pipeline **143 passed / 1 skipped** because Poppler PDF tools were unavailable. The local pipeline suite passed **144/144**. The documentation update at `e9cae42` also passed all three CI jobs in [run 38660037167](https://github.com/AndroLay/MethaneResponse/actions/runs/38660037167). The remaining score-critical evidence is external: rights-cleared human-adjudicated AI benchmark data, a live provider run, a judge-accessible deployment with durable storage, an independently verified testnet receipt, and a target-user pilot. Local checks establish software behavior, not real-world audit accuracy, user benefit, or methane reductions.

## Phases and gates

Latest evidence refresh on 15 October: public `main` now points to [`f7effb6`](https://github.com/AndroLay/MethaneResponse/commit/f7effb6808e631881477f306a2e530326b9f5c0f), and all three jobs passed in [CI run 38664825202](https://github.com/AndroLay/MethaneResponse/actions/runs/38664825202). The previous source revision added streamed MARS byte verification: the local Python pipeline passed **151 tests / 0 skips**, and both archive hashes, lengths and `Content-MD5` values matched the active snapshot. This revision also restricts legacy reviewer credentials to private-read/review scopes; anchoring and receipt reconciliation require a dedicated anchor scope or admin capability. The remaining external gates are still the rights-cleared human benchmark, live AI provider, durable cloud deployment, independent Sepolia receipt, and target-user pilot; see the [execution checkpoint](EXECUTION_CHECKPOINT_2026-10-15.md) for exact scope and limits.

| Phase | Status | Deliverable and acceptance evidence | Score connection |
|---|---|---|---|
| **0. Local foundation** | **Complete on active snapshot** | Active snapshot `unep-mars-675417694883` was checked against archive/gzip/decoded hashes, history, counts, unique IDs, row semantics and date range; earlier snapshots remain preserved. Historical and demo data stay distinct; the local workflow runs from source history through audit, review, report, and verifier. Latest API/web/Python/Foundry gates are recorded in the execution checkpoint. | Technical baseline; protects all criteria from unsupported claims. |
| **1. Evaluation reporting** | **Implemented; 140 full Python pipeline tests pass** | AI evaluator computes seeded, source-cluster 95% intervals for macro-F1 and citation precision, and a paired interval for AI-minus-rules macro-F1. One-source evaluations explicitly return no interval. It rejects documents reused across splits and gold citations to documents absent from a claim's inputs. Default: 400 replicates, seed `20261014`. The release gate enforces macro-F1 ≥0.80 and records all active thresholds. | Makes Innovation/Technical evaluation more transparent and prevents weak macro-F1 or document leakage from being treated as release-ready; it does not raise an AI score without benchmark data. |
| **2. Independent evidence benchmark** | **Protocol ready; 3 casebook references rights-screened and 13 research-paper candidates inventoried; 0 cleared for provider input** | See [`AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`](AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md) and [`MARS casebook document-rights inventory`](research/mars-casebook-document-rights-inventory-2026-10-14.md). Kazakhstan and Libya item pages list CC BY-NC-ND 3.0 IGO; Argentina's inspected item page does not show an item-level license. Thirteen paper candidates have visible open-license metadata, but no PDFs were downloaded and no provider-processing scope was cleared. Target: 40–80 held-out claims from 10–20 authorized documents, source- and document-disjoint splits, all three verdict labels, independent source inspection, exact accepted citations, and matched rules predictions. | Main gate for Innovation; also supports Technical Execution. |
| **3. Judge-accessible live workflow** | **Local only; external configuration not present** | Configure an owner-authorized backend AI provider, reviewer identity, and PostgreSQL/PostGIS deployment; verify source → assessment → exact-citation validation → review → new report revision → persistence after restart. If blockchain is in the demo, anchor only an authenticated human-reviewed report and verify transaction/event/hash independently on Sepolia. | Main gate for Technical Execution; supports Practical Usefulness. |
| **4. Target-user pilot** | **Pending participant access** | Run a small formative pilot with researchers, auditors, or environmental analysts on real cases. Record task completion, assistance, errors, review time, provenance/citation completeness, and user feedback against a documented manual baseline. A small pilot is usability evidence, not a population-wide or emissions-impact estimate. | Main gate for Climate Impact and Practical Usefulness. |
| **5. Submission proof** | **Not ready** | Produce and review the required 3–5 minute demo, prepare the project description and architecture/limitations, complete license checks, and provide a current public repository revision as required by the event. Confirm the conflicting eligibility and submission-time instructions with the organizer. | Main gate for Presentation and submission completeness. |

## Progress log

### 2026-10-15 — AI/reviewer browser workflow and public CI

- Added an isolated mock-provider browser path for document excerpt → exact citation → skeptical second pass → abstention → scoped reviewer decision → immutable revision → private report → export digest verification. The excerpt is explicitly synthetic and is omitted from the exported report.
- Hardened Playwright process boundaries with an allowlisted environment, disabled Bun dotenv autoload, and isolated Vite env loading. Regression tests cover filtering and file-specific phase routing; worker assertions check for ambient credentials. A full local run with disposable `GH_TOKEN`, `AI_API_KEY`, `DATABASE_URL`, and `VITE_TEST_SECRET` sentinels passed all 3 runner tests and both browser journeys.
- `bun run check` passed. At the 15 October public-main check, workflow commit `0f52ac280ffab8567e684e0ca19ccdff57e102dd` was present; its CI run [38606971136](https://github.com/AndroLay/MethaneResponse/actions/runs/38606971136) passed all three jobs on Ubuntu 24.04/Node 24. Application code commit `962fa4443a619c5ed1b96d855a5c7016a4472e45` passed [run 38604021117](https://github.com/AndroLay/MethaneResponse/actions/runs/38604021117).
- This improves evidence for local workflow integration and technical execution only. No real-model accuracy, legal document permission, real reviewer identity, cloud persistence, Sepolia receipt, user benefit, or physical emission reduction is established.

### 2026-10-15 — CI runtime and runner migration

- Updated the hosted workflow to Node 24-compatible action versions and pinned all jobs to Ubuntu 24.04 ahead of the `ubuntu-latest` migration window.
- Public CI run [38606971136](https://github.com/AndroLay/MethaneResponse/actions/runs/38606971136) passed all three jobs, including Chromium E2E. This hardens submission-week CI reproducibility; it does not change evidence quality or close external service gates.

### 2026-10-15 — Competition requirements rechecked

- The current Devpost overview still says “students only” and lists a 25 October deadline at 17:00 MSK; Rules list broader participant categories and say not to submit before 08:00 PT that day. Overview lists US$3,000 in prizes while Rules still say “Prizes TBD”. The schedule endpoint returned 403 on this read-only check; its last successful contents were recorded on 14 October.
- The updates page and the existing submission-window discussion were inspected. The visible thread contains participant questions about timing, blockchain, track selection, and the submission form, but no organizer answer was visible. No message was sent.
- These discrepancies remain a submission eligibility/timing blocker. Public project source and code CI are verified separately above; neither resolves the event rules.

### 2026-10-14 — WP-1/WP-2 current-state recheck

- Public `main` and anonymous GitHub `HEAD` both resolve to `59ac59e76d0ce59686ee783690ec0f99a15ae822`. The source release ancestor `37169ee` has a successful Actions run; no CI result is claimed for this documentation-only follow-up.
- Fresh official CSV/GeoJSON HEAD requests returned HTTP 200 and the same active ETags, lengths, `Content-MD5`, and `Last-Modified`. Local complete archives match the live `Content-MD5`, pinned SHA-256, size, ZIP CRC, and required CSV member checks.
- Devpost overview/schedule and Rules still conflict on the submission start/deadline by one hour and on participant eligibility. This remains an organizer clarification blocker; no message was sent.

### 2026-10-14 — WP-2 upstream archive revalidation

- Direct HEAD requests to the official UNEP CSV and GeoJSON download objects returned the same Last-Modified timestamp, ETags, byte lengths, and Content-MD5 values recorded in the active snapshot history.
- Recomputed local archive SHA-256 and MD5 values matched the active manifests for both files. The active dataset already contains this release, so no replacement snapshot or duplicate archive was created.
- A bounded CSV GET attempt stopped early and a later sequential retry timed out; those partial transfers were discarded. They do not invalidate the complete archive acquired earlier with ETag-pinned byte ranges and verified against the live size/Content-MD5 and the manifest SHA-256. Do not treat either partial response as an archive.
- The full offline data-pipeline suite passed **122/122**. The recheck does not indicate that the historical snapshot is live or that UNEP has an exact monthly cadence for the full combined source/plume archive.

### 2026-10-14 — WP-3 supplemental Chromium UAT

- Verified mouse selection through Libya's source clusters: individual marker `LBY_S_098` changed the selected case and URL, its full-case dialog opened, and the dialog handed the same case to Evidence Auditor.
- Verified the Auditor picker against the same pinned snapshot: searching `LBY_S_143` returned one match, and selecting it updated the source, evidence inventory, coordinates and URL.
- Captured screenshots 06–07 with SHA-256 in the UAT evidence README. The isolated API used a RAM-backed file store; no live provider, human reviewer credentials, cloud DB or chain was configured.
- Chromium recorded zero JavaScript errors and 38 software-WebGL/MapLibre warnings, including ReadPixels stalls. Physical GPU/mobile behavior remains untested.

### 2026-10-14 — Phase 1 implementation

- Added deterministic source-cluster bootstrap intervals for AI benchmark macro-F1 and exact-citation precision.
- Added paired resampling of identical source clusters for the AI-versus-rules macro-F1 difference.
- Added explicit `insufficient_source_clusters` status when fewer than two held-out sources exist.
- Added document-disjoint split validation and rejected accepted citation hashes for documents not supplied to that claim's model input.
- A regression fixture first demonstrated that macro-F1 0.5556 could pass the release gate when citation precision was 1.0; the evaluator now blocks that result below 0.80 and records the active thresholds.
- Focused evaluator tests: 13 passed; full Python pipeline suite: **67 passed, 0 failed** (`PYTHONPATH=. UV_CACHE_DIR=/tmp/methaneresponse-uv-cache uv run --no-sync pytest -q`).
- No provider was called, no report content was added, and no external service was changed.
- Benchmark corpus and labels remain absent, so no AI quality claim or criterion score has been increased.

### 2026-10-14 — Phase 2 rights screen

- Inspected only the three item landing pages linked by the local MARS casebook; no PDFs were downloaded or processed.
- Kazakhstan and Libya pages list CC BY-NC-ND 3.0 IGO. The Argentina page inspected does not show item-level license metadata.
- Recorded the results and exact next checks in [`research/mars-casebook-document-rights-inventory-2026-10-14.md`](research/mars-casebook-document-rights-inventory-2026-10-14.md).

### 2026-10-14 — Benchmark output safety and upstream provenance refresh

- The billable AI benchmark runner now buffers only the bounded result set, writes it to a mode-`0600` temporary file, and publishes it atomically without overwriting an existing output. An exclusive sibling lock prevents simultaneous invocations from making duplicate provider calls. Failure tests verify that a mid-batch provider error leaves no prediction file or temporary artifacts; the provider is injected in tests and was not called live.
- The regression also verifies overwrite rejection happens before provider use, the complete output is mode `0600`, successful runs remove lock/temp artifacts, and output paths under public assets are rejected.
- Verification: `bun test scripts/run-ai-benchmark.test.ts` **5 passed / 33 assertions**; `bun run test:verifier` **7 passed / 45 assertions**; `bun run check` (API and web TypeScript) passed; `git diff --check` passed.
- The current UNEP catalog and dictionary were reread. The catalog describes monthly updates but exposes no publication timestamp/checksum in the page text; the current dictionary states that listed satellite classes were requantified after 2026-02-20. The local archive hash still matches the 2026-10-13 provenance. Refetching the official ZIP was blocked by DNS failure in this workspace, so the snapshot is latest locally verified, not asserted to be newest upstream. The official pages currently differ on license wording; the dataset-specific archive license remains the applied term.
- No billable AI provider, external database, deployment, blockchain transaction, or GitHub action was run.

### 2026-10-14 — Full local gate after runner hardening

- `UV_CACHE_DIR=/tmp/methane-response-uv-cache bash scripts/check-local.sh` exited 0. Frozen install had no dependency changes; API/web typecheck passed; web **161/161**, benchmark + verifier **9/9**, Python **117/117**, Foundry **4/4**, production build and bundle budget passed.
- API suite was **97 pass / 13 skipped / 0 fail / 552 assertions**; the skips require PostgreSQL. This is not a cloud database or fresh PostGIS integration result. Bundle warnings and browser/GPU limitations remain as documented in the execution checkpoint.
- No provider, cloud, chain transaction, GitHub Actions run, or new browser session was used. No criterion score or AI quality claim is increased by this gate.

### 2026-10-14 — PostgreSQL integration gate without skips

- Reran `bun run test:api` with `CI=true` and a disposable `postgis/postgis:17-3.5-alpine` database after the aggregate run had skipped DB tests. Result: **108 pass / 0 fail / 633 assertions**. The suite exercised persistent store reconnect/revision paths and cross-instance PostgreSQL quotas.
- Verified that the container was removed after the command. This closes the local PostGIS integration gate for the tested code; cloud persistence, backup/restore, public-origin browser path, and GitHub Actions on the working revision remain unverified.

### 2026-10-14 — Shared API write quotas and asset-rights inventory

- Added additive migration `0006_shared_api_rate_limits.sql` and an atomic PostgreSQL counter shared across API store connections. Audit writes use the existing 20/minute limit; document assessments use 6/minute.
- Keys are HMAC-SHA-256 pseudonyms scoped by endpoint and, for AI, a token fingerprint. Raw socket addresses and bearer tokens are not written to the database. Expired counters are pruned in bounded batches.
- Production health degrades and writes fail closed with HTTP 503 if the PostgreSQL limiter is available but its 32+ character `RATE_LIMIT_HASH_SECRET` is not configured, or the counter query fails. The deployment blueprint now declares the secret but has not been deployed.
- Regression evidence: the API unit suite covers missing-secret fail-closed behavior, shared keys across API instances, ignored spoofed forwarding headers, and backend outage. PostGIS integration tests cover concurrent requests through two independent database connections and two production API instances; see the execution checkpoint.
- The `public/assets/*.webp` bundle was inventoried by exact SHA-256 and source references. The files' redistribution rights remain unresolved; unused files remain unmodified and must be cleared or excluded before a public release. See [`interface asset rights inventory`](research/interface-asset-rights-inventory-2026-10-14.md).
- Residual boundary: application quotas do not replace a gateway limit, and the true client IP behind the intended proxy has not been verified. No cloud service or external endpoint was changed.
- **Benchmark status remains blocked:** 0 of the 3 references are cleared for provider processing; the target corpus needs 10–20 authorized documents and independent adjudication.

### 2026-10-14 — Prospective recurrence cohort frozen

- Added `prospective_recurrence.py` to register source-level recurrence predictions against exact snapshot, archive, model/calibration, feature, and source-code hashes. Existing files cannot be silently replaced; an evaluation runner is ready for a later publisher release.
- Frozen 4,213 predictions from `unep-mars-ccd8267c55ee` for `(2026-09-12, 2027-09-12]`. v5 replays byte-identically: SHA-256 `b5c026828d2691ac327e5218ee1a020cf835bcf789ba13702f1d6951412f6742`; prediction hash remains `147d0075aaaf146536db933d31695c1d38e89f1286bf3b81ee49abc29ddb1906`. v4 remains preserved but is superseded because a review found its historical gate-result field contained thresholds rather than boolean results.
- Freeze rejects inconsistent model/calibrator-to-prediction values, wrong bootstrap seed, impossible cluster counts, invalid optimizer/calibrator metadata, inconsistent metric relationships, and malformed intervals. All 116 Python tests pass (47 recurrence tests); API/web typechecks pass.
- A full rebuild still produces 4,213 sources and exactly matches active artifact SHA-256 `15e7248a4efe480c057252fd0a396b305eaee7510468cfe825796d774ab74d`. v5 replay returns `already_identical`; same-snapshot evaluation returns `not_available` with 0 labels and is stored in the repository.
- The same-snapshot evaluator output is saved and hashed; it returns `not_available` with zero labels. This is expected abstention, not prospective accuracy. No future outcome has been opened or used; a qualifying later snapshot is not yet available.
- The retrospective development backtest remains a same-dataset, previously inspected holdout and must not be called prospective. See [`prospective recurrence registration`](prospective-recurrence.md) for commands, metrics, artifacts, and limits.

### 2026-10-14 — full local gate rerun and event-page refresh

- Frozen install: 138 installs / 211 packages checked, no dependency changes. API/web typecheck, web **152/152**, verifier **4/4 (31 assertions)**, Python **117/117**, Foundry **4/4**, production build, and bundle budget all passed.
- API without a database: **93 pass / 10 skipped** (PostgreSQL integration only). Exact CI PostGIS image on a disposable loopback container: **101 pass / 0 skipped / 589 assertions**; the test container was removed afterward. This is local integration evidence, not cloud persistence or GitHub Actions.
- Production build warning remains for the raw 1,121,285-byte MapPanel chunk; its gzip size is 306.52 kB and the configured budget passed. Zod/Rollup annotation warnings are nonfatal. No physical-device FPS claim follows from this build.
- Devpost overview, schedule and Rules were directly reopened at 12:44 WITA. The Rules start-time instruction still lands one hour after the overview/schedule deadline, and eligibility remains inconsistent. GitHub could not be fetched by the available browser (cache miss); the owner reports public visibility, but current anonymous access is unverified. No organizer contact or submission was made.
- The active MARS gzip and intelligence snapshot SHA-256 values stayed unchanged. No browser session, external provider, cloud service, deployment, GitHub push, or chain transaction was run in this gate.

## Next actions

1. Obtain processing rights for source documents and independent human adjudication before creating benchmark rows.
2. Configure provider, database, reviewer identity, and testnet only with authorized credentials and any required cost approval.
3. Recruit pilot participants and record results; keep measurements anonymous and separate from methane measurements.
4. Complete and inspect the demo video and public submission package before the event deadline.

No phase completion implies a guaranteed judge score. The official rubric remains qualitative; only judge feedback can establish an actual competition score.

## Execution plan and time estimate — 2026-10-14

### Definition of done

“Selesai” berarti MVP dapat diuji secara independen dan klaim produknya didukung bukti yang sesuai; bukan berarti sistem bebas dari seluruh bug atau telah membuktikan pengurangan emisi. Target `18/20` per kriteria adalah ambang internal untuk kesiapan, bukan skala atau skor resmi dari penyelenggara. Devpost mempublikasikan lima kriteria kualitatif.

Untuk target internal tersebut, syarat penutupnya adalah:

- **Climate Impact:** sedikitnya lima pengguna sasaran mengikuti uji formatif pada kasus nyata; catat penyelesaian tugas, kesalahan, waktu, dan kebutuhan bantuan dibandingkan alur manual. Hasil pilot kecil hanya mendukung kegunaan/transparansi, bukan klaim pengurangan emisi.
- **Innovation & Creativity:** benchmark independen berisi 40–80 klaim dari 10–20 dokumen yang diizinkan, terpisah menurut sumber dan dokumen, mencakup tiga label audit. Laporkan macro-F1, ketepatan kutipan, interval ketidakpastian, false confirmation, dan selisih berpasangan terhadap baseline aturan. Ambang internal: macro-F1 ≥0,80, exact-citation precision ≥0,90, dan nol false-supported pada set terbatas. Jika model tidak menunjukkan nilai tambah terhadap baseline, jangan mengklaim peningkatan AI.
- **Technical Execution:** alur dari origin yang dapat diakses sampai observasi, penilaian, validasi kutipan, review manusia, revisi laporan, penyimpanan setelah restart, dan verifier berjalan; semua gate lokal yang relevan lulus. Jika demo menyertakan blockchain, satu receipt testnet harus diverifikasi independen dari event dan digest.
- **Practical Usefulness:** pengguna sasaran dapat menyelesaikan alur inti tanpa operator teknis; hasil pilot mencatat tingkat keberhasilan, waktu, kesalahan, dan umpan balik. Ukuran sampel kecil harus disebut sebagai pilot, bukan bukti efektivitas populasi.
- **Presentation & Communication:** video 3–5 menit memperlihatkan satu alur yang benar-benar berjalan, menjelaskan batas data historis, AI, prediksi, dan blockchain, serta selaras dengan revision/build yang diserahkan.

### Paket kerja, gerbang, dan durasi

Durasi di bawah adalah **hari kerja rekayasa**; waktu menunggu izin, akun, reviewer, peserta, dan layanan dihitung terpisah. Beberapa paket bisa berjalan paralel setelah gerbang awal.

| Urutan | Paket dan kriteria selesai | Status saat ini | Estimasi |
|---|---|---|---:|
| 0 | **Gerbang kompetisi dan akses:** penyelenggara mengonfirmasi waktu mulai/tutup dan kelayakan peserta; ada jalur dokumen yang sah serta jadwal reviewer/pilot; revision repo yang akan dinilai dapat diakses tanpa login. | **Belum ditutup.** Konflik window submission dan eligibility masih butuh jawaban resmi. Source release `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d` telah dipush; anonymous no-credential `git ls-remote` membuktikan public `main` dapat diakses. GitHub Actions sukses. Video final, jadwal reviewer/pilot, dan bukti submission belum ada. | 0,5–1 hari kerja + waktu tunggu eksternal |
| 1 | **Benchmark bukti independen:** pilih 10–20 dokumen yang hak pemrosesan/kutipannya jelas; dua penilai memberi label dan kutipan exact; adjudikasi; pisahkan train/dev/test menurut sumber dan dokumen; jalankan AI dan baseline dengan evaluator serta interval yang sudah ada. | **Protokol dan evaluator tersedia; korpus belum.** 0 dari 3 referensi yang ditinjau sudah dibersihkan untuk input provider. | 5–8 hari kerja setelah sumber berizin dan penilai tersedia; izin dapat memperpanjang tanpa batas pasti |
| 2 | **Layanan live dan persistensi:** konfigurasi provider di backend, Postgres/PostGIS, autentikasi reviewer, deployment yang disetujui; buktikan cold start/restart dan alur end-to-end pada origin target. | **Belum dikonfigurasi.** Kredensial dan target layanan belum tersedia di repo yang diperiksa. | 2–3 hari kerja setelah akses tersedia |
| 3 | **Verifikasi blockchain eksternal:** hanya jika akan dijadikan bukti demo; dengan otorisasi pemilik, konfigurasi issuer/RPC, anchor laporan yang telah disetujui reviewer, lalu cocokkan receipt, event, dan digest melalui verifier independen. | **Kontrak diuji lokal; Sepolia belum dibuktikan.** Tidak ada transaksi yang dikirim. | 1–2 hari kerja setelah otorisasi dan akun testnet tersedia |
| 4 | **Pilot manfaat dan kegunaan:** rekrut minimal lima pengguna sasaran; jalankan tugas yang sama pada alur manual dan MethaneResponse; catat waktu, keberhasilan, kesalahan, bantuan, serta komentar; tulis batas generalisasi. | **Belum dijalankan.** Partisipan belum tersedia. | 2–4 hari kerja untuk sesi dan analisis + sekitar 2–7 hari kalender untuk penjadwalan |
| 5 | **Validasi perangkat, peta, dan pemulihan:** periksa desktop dan ponsel fisik bila tersedia; ukur metrik yang benar-benar dapat direkam; uji kegagalan imagery/provider dan retry; jangan membuat klaim FPS tanpa perangkat/GPU yang diukur. | **Browser Chromium lokal lulus; akselerasi GPU dan perangkat fisik belum terverifikasi.** | 1–2 hari kerja jika perangkat tersedia |
| 6 | **Freeze dan submission:** jalankan ulang seluruh gate, periksa attribution/izin aset, pastikan revision source dapat dibuka juri, rekam dan tinjau video 3–5 menit, cocokkan build, URL, screenshots, dan klaim, lalu submit melalui akun peserta. | **Belum siap.** Repo publik terbukti pada commit lama saja; perubahan aktif belum terbit. Video belum dibuat dan izin/attribution aset masih perlu ditinjau. | 1,5–2 hari kerja setelah isi demo stabil |

### ETA dan skenario

- **Perkiraan kerja untuk target internal berbukti:** sekitar **14–22 hari kerja rekayasa**. Dengan akses, dokumen, reviewer, dan peserta tersedia segera, waktu kalender yang paling mungkin sekitar **4 minggu dari 14 Oktober 2026 (sekitar 11 November 2026)**; rentang yang masuk akal **3–6 minggu (sekitar 4–25 November)** karena sebagian pekerjaan menunggu pihak luar.
- **Paket submission sebelum tanggal yang sedang ditampilkan Devpost:** dari 14 Oktober tersisa sekitar 11 hari kalender. Dalam waktu itu sasaran realistis adalah demo/entry yang jujur dan teruji lokal; tidak aman menjanjikan benchmark independen plus pilot dan layanan live lengkap kecuali semua akses eksternal tersedia segera. Tenggat dan waktu mulai harus diklarifikasi terlebih dahulu karena informasi halaman yang diperiksa tidak konsisten.
- **Jika hak dokumen, provider/database, atau peserta belum tersedia:** tanggal target bergeser sesuai waktu pemenuhan gerbang tersebut. Untuk izin dan rekrutmen, tidak ada tanggal selesai yang bisa dijanjikan dengan akurat sebelum respons pihak terkait.

Perkiraan tanggal adalah rencana kerja, bukan janji skor. Angka `18/20` tidak dapat dijamin: rubrik resmi tidak mempublikasikan bobot atau skala numerik tersebut dan hanya juri yang menetapkan nilai.

### Prioritas eksekusi

1. Tutup Gerbang 0: minta konfirmasi aturan/waktu kepada penyelenggara dan verifikasi akses repo tanpa login; pemilik melaporkan repo sudah publik.
2. Secara paralel, identifikasi dokumen alternatif yang hak penggunaan untuk pemrosesan dan kutipannya benar-benar jelas; jadwalkan dua penilai dan lima peserta pilot. Jangan mengirim konten laporan ke provider sebelum izin sesuai penggunaan diperoleh.
3. Selesaikan benchmark dan live workflow hanya saat prasyaratnya lolos; pertahankan abstention bila kutipan atau bukti tidak cukup.
4. Anchor testnet hanya setelah otorisasi; bukti blockchain tetap dibatasi sebagai integritas dan kronologi, bukan kebenaran mitigasi fisik.
5. Bekukan demo berdasarkan hasil yang benar-benar teruji, lalu lengkapi video, attribution, akses repo, dan submission.

## Jadwal kerja teroptimasi — 14 sampai 25 Oktober 2026

### Asumsi kapasitas dan cara menjaga fokus

- Kapasitas rencana: satu engineer dengan **5 jam fokus per hari** sampai 24 Oktober. Itu memberi sekitar 55 jam tersedia; 20% (11 jam) disimpan sebagai buffer perbaikan dan masalah submission, sehingga kapasitas kerja terencana sekitar **44 jam**.
- Dalam estimasi ini, satu hari kerja rekayasa berarti satu blok fokus 5 jam. Target penuh berbukti memerlukan sekitar **14–22 blok (70–110 jam)**, ditambah waktu menunggu pihak luar. Dengan kapasitas 44 jam sebelum tenggat, target seluruh gerbang 18/20 tidak realistis dijanjikan sebelum 25 Oktober. Jalur sampai tenggat berfokus pada satu alur demo yang dapat dibuktikan; benchmark independen, pilot, layanan cloud, dan Sepolia hanya masuk jika prasyaratnya benar-benar tersedia.
- Hindari perubahan visual/fitur baru setelah **22 Oktober** kecuali ada bug P0/P1 atau alur utama gagal. Sediakan 24 Oktober untuk akses juri, perbaikan terakhir, dan dry run; jangan memakai hari tenggat sebagai hari build.
- Item yang menunggu orang/izin dimulai pertama dan berjalan paralel. Tidak ada konten dokumen yang dikirim ke AI dan tidak ada klaim pilot sebelum izin/hasilnya ada.

### Anggaran 44 jam sampai release candidate

| Blok kerja | Batas waktu | Anggaran | Urutan nilai |
|---|---|---:|---|
| Aturan event, akses repo publik, hak aset/dokumen, dan pemilihan kasus demo | Mulai 14 Okt; keputusan korpus 16 Okt | 4 jam | Menghindari submission tidak memenuhi syarat atau penggunaan materi yang tidak berizin. |
| Audit alur lokal dari snapshot sampai verifier dan perbaikan blocker P0/P1 | 17–19 Okt | 12 jam | Menjamin demo tetap bisa diulang walaupun layanan eksternal tidak tersedia. |
| Provider/PostGIS dan review auth bila akses pemilik sudah tersedia | 18–20 Okt | Maks. 8 jam | Hanya dilakukan jika kredensial/target tersedia; selain itu, waktu dipakai untuk hardening alur lokal dan dokumentasi batas layanan. |
| Uji pengguna terjadwal atau persiapan protokol uji | 20–22 Okt | Maks. 5 jam | Jalankan sesi hanya dengan peserta nyata; jika belum cukup peserta, simpan protokol dan laporkan pilot tertunda. |
| Video, deskripsi, attribution, runbook, dan dry run submission | 23–24 Okt | 10 jam | Video direkam dari release candidate; satu revisi setelahnya berarti pemeriksaan ulang. |
| Buffer insiden, jaringan, browser, atau form submission | 14–24 Okt | 5 jam | Tidak dialihkan untuk fitur baru. |

Jumlah batas waktu kerja terencana: **44 jam**. Waktu engineer benchmark AI penuh tidak diberi slot palsu di jalur tenggat: benchmark baru dinyatakan selesai setelah korpus, anotasi independen, dan hasil evaluasi lengkap. Jika reviewer sudah bekerja paralel dan seluruh materi berizin tersedia, hasil benchmark boleh masuk submission hanya setelah semua kriteria penerimaan lulus.

### Klarifikasi panitia siap kirim

Pemilik dapat mengirim pertanyaan ini melalui kanal resmi Devpost. Pesan belum dikirim dari workspace.

> Hello, could you please confirm the submission window and eligibility rules in writing? The event overview lists October 25, 2026 at 5:00 PM MSK, while the Rules page says not to submit before 8:00 AM PT on October 25. Please confirm the exact opening and closing timestamps in UTC. The overview says “students only,” while the Rules page also lists researchers, faculty, independent developers/startups, and environmental professionals. Could you confirm whether an individual participant residing in Indonesia is eligible and whether any country restrictions apply? Finally, are a public source repository and a 3–5 minute demo video required for every submission?

### Jalur submission sebelum tenggat

| Tanggal (WITA) | Fokus utama | Keluaran yang harus tersimpan | Gerbang keputusan / fallback |
|---|---|---|---|
| **14 Okt** | Kunci satu alur demo: pilih sumber historis dengan observasi dan geometri yang bisa ditelusuri; inventarisasikan klaim yang dapat dan tidak dapat dibuktikan. Susun pertanyaan klarifikasi event untuk dikirim pemilik melalui kanal resmi. Mulai penjadwalan calon reviewer/pilot. | Naskah alur 5 langkah, daftar bukti dan batas klaim, daftar blocker dengan pemilik dan tanggal keputusan. | Jika eligibility atau submission window masih kabur, catat risiko; jangan mengasumsikan aturan. |
| **15 Okt** | Verifikasi akses repo publik dari sesi tanpa login saat koneksi tersedia; cek instruksi run, lisensi/attribution aset, dan tautan demo. Secara paralel inventarisasi dokumen yang jelas hak pemrosesannya dan minta akses/konfirmasi layanan bila memang akan dipakai. | Bukti akses publik (URL/hasil clone tanpa token), daftar aset berlisensi, daftar kandidat dokumen beserta status haknya, daftar kredensial yang dibutuhkan tanpa menaruh secret di repo. | Jika akses GitHub belum dapat diuji dari workspace, pemilik menyimpan bukti tampilan incognito/clone; status tetap “dilaporkan publik” sampai ada verifikasi. |
| **16 Okt — Gate A** | Tutup keputusan korpus: hak dokumen, dua penilai independen, dan kasus yang cukup untuk anotasi. Jalankan benchmark hanya jika semua syarat tersedia. | Jika lolos: dataset label berizin, sumber/dokumen terpisah, laporan baseline dan AI dengan interval. Jika tidak: catatan bahwa benchmark belum ada. | Tanpa dokumen berizin dan label independen, **AI tetap nonaktif/tidak diklaim tervalidasi**; demo memakai baseline aturan, kutipan yang tersedia, atau abstention. Jangan menurunkan ambang evaluasi agar terlihat lulus. |
| **17–19 Okt** | Buktikan ulang alur hero secara lokal dari data MARS sampai detail sumber, histori, submission bukti yang diizinkan, review manusia, revisi laporan, ekspor, dan verifier. Perbaiki hanya kegagalan alur. Jalankan benchmark terbatas jika Gate A lolos. | Rekaman langkah, hasil gate API/web/Python/Foundry/verifier, screenshot browser, dan log kegagalan/retry yang relevan. | Jika provider tidak ada, gunakan mode lokal yang diberi label jelas; jangan menyebut mock sebagai AI live. Jika dokumen nyata tidak berizin, tampilkan metadata MARS dan status bukti tidak cukup. |
| **18–20 Okt — Gate B** | Jika kredensial pemilik tersedia, hubungkan satu target Postgres/PostGIS dan provider backend; uji restart, reviewer auth, CORS/origin, dan privasi draft. Mulai sesi pilot yang telah dijadwalkan secara paralel. | URL environment uji, bukti persistensi setelah restart, hasil auth dan alur dari browser, lembar hasil pilot anonim bila ada. | Tanpa kredensial/otorisasi, tetap pada local file-store/PostGIS disposable yang sudah diuji; nyatakan cloud dan provider belum terverifikasi. Tanpa lima peserta, catat pilot sebagai tertunda dan jangan mengklaim manfaat pengguna. |
| **20–22 Okt — Gate C dan feature freeze** | Selesaikan sesi pengguna yang tersedia; ukur penyelesaian tugas, waktu, kesalahan, kebutuhan bantuan, dan komentar. Uji browser desktop/mobile, fallback peta, dan pemulihan. Gunakan Sepolia hanya jika otorisasi serta akun testnet telah siap. Bekukan fitur pada 22 Oktober. | Ringkasan pilot dengan ukuran sampel dan batas, laporan browser/perangkat, bukti transaksi independen bila benar-benar ada, daftar bug tersisa dan keputusan freeze. | Jika tidak ada GPU/perangkat fisik, laporkan uji browser/software-rendering saja. Jika tidak ada transaksi, verifier tetap lokal; jangan tampilkan receipt demo sebagai transaksi nyata. |
| **23 Okt** | Rekam video demo 3–5 menit dari build yang dibekukan. Ceritakan satu kasus dan satu klaim; tampilkan sumber/tanggal/ketidakpastian, hasil review, dan verifikasi digest. | Video draft, deskripsi submission, attribution dan daftar batasan. | Jangan masukkan langkah yang hanya berjalan pada mesin pengembang tetapi tidak bisa diulang juri. |
| **24 Okt — Release candidate** | Dry run penuh dari browser bersih/perangkat lain; uji akses repo, instruksi instalasi, link, video, metadata, dan konsistensi setiap klaim. Simpan build/hash yang ditampilkan. Sisakan hari ini sebagai buffer. | Release checklist bertanda lulus/gagal, video final, project description, URL repo publik, dan manifest revision/demo. | Hanya perbaiki blocker submission atau bug yang menggagalkan alur. Perubahan sesudah rekaman mengharuskan video dan pemeriksaan terkait diulang. |
| **25 Okt — Submission window** | Submit melalui akun peserta hanya setelah window yang sah dikonfirmasi; jangan menunggu menit terakhir. | Bukti submission dan timestamp yang dapat diperiksa. | Overview mencantumkan 17:00 MSK, sedangkan Rules memberi larangan submit sebelum 08:00 PT pada tanggal yang sama. Minta konfirmasi penyelenggara; jangan menebak window yang berlaku. |

### Urutan bukti untuk menjaga waktu

1. **Wajib untuk demo:** kasus MARS historis dengan ID, tanggal, lokasi, flux/ketidakpastian jika tersedia, sumber data, dan batas bahwa feed bukan live.
2. **Wajib untuk klaim mitigasi:** dokumen dengan hak penggunaan jelas, kutipan tepat, validasi kutipan, status reviewer, serta abstention ketika bukti kurang. Jika dokumen tidak tersedia, demo berhenti pada “bukti mitigasi belum cukup”.
3. **Wajib untuk integritas hasil:** laporan berversi, digest SHA-256, dan verifier lokal. Klaim Sepolia hanya jika ada transaksi/event nyata.
4. **Wajib untuk submission:** video 3–5 menit, public repository yang dapat dibuka, deskripsi track/target user/impact, attribution, cara menjalankan, serta batasan yang sama dengan build demo.
5. **Tidak dikerjakan sebelum release candidate:** fitur tambahan, perombakan globe tanpa bug terukur, model forecasting baru, atau deployment yang mengharuskan akun/biaya/izin yang belum tersedia.

### Jalur setelah submission menuju target berbukti

Setelah demo diserahkan, lanjutkan blocker score-critical dengan urutan dependency, bukan menambah fitur acak:

1. **Korpus dan benchmark (5–8 hari kerja setelah izin):** 10–20 dokumen yang jelas haknya; dua penilai; 40–80 klaim; source/document-disjoint split; jalankan rules dan AI pada klaim sama; simpan dataset versi, seed, interval, dan error review.
2. **Origin live (2–3 hari setelah kredensial):** provider server-side, Postgres/PostGIS, reviewer auth, migrasi, restart persistence, dan browser check dari origin yang dapat diakses juri.
3. **Pilot (2–4 hari sesi/analisis + penjadwalan):** minimal lima pengguna sasaran; bandingkan task inti dengan baseline manual; publikasikan hanya hasil anonim dan batas sampelnya.
4. **Sepolia dan perangkat nyata (1–2 hari masing-masing, setelah akses):** anchor hanya laporan yang disetujui; cocokkan receipt/event/digest; ukur map pada GPU/perangkat fisik yang tersedia.
5. **Regression dan paket bukti (1,5–2 hari):** rerun checks yang terdampak, audit klaim submission, simpan bukti runtime dan batasan.

Rencana ini menjaga tanggal submission dan target pengembangan penuh sebagai dua sasaran berbeda. Bila salah satu prasyarat eksternal belum terpenuhi, pekerjaan yang tidak bergantung padanya tetap maju; status yang tertunda dicatat tanpa membuat bukti pengganti.

### Penyelesaian produk setelah hackathon

Target hackathon bukan bukti kesiapan produksi. Jika produk akan dipakai di luar demo, tambahkan gerbang terpisah berikut setelah jalur benchmark/live/pilot:

- **Keamanan operasional:** identitas reviewer per pengguna, ownership laporan, rate limit lintas-replica, log audit akses tanpa menyimpan rahasia, prosedur rotasi secret, backup dan uji restore, kebijakan retensi/penghapusan dokumen, serta penanganan insiden.
- **Prediksi:** pertahankan skor prioritas sebagai heuristik sampai ada snapshot MARS berikutnya untuk evaluasi prospektif. Bekukan prediksi sebelum periode tindak lanjut, bandingkan dengan indikator persistensi/status MARS, laporkan coverage dan kalibrasi hanya jika didukung label; jangan menyebut peluang kebocoran terkalibrasi tanpa validasi independen.
- **Dampak iklim:** ukur perbaikan traceability dan workflow secara terpisah dari hasil emisi. Klaim pengurangan metana memerlukan bukti tindak lanjut fisik dan desain atribusi longitudinal; penggunaan aplikasi saja tidak membuktikan pengurangan.
- **Kesiapan layanan:** uji beban dan batas biaya provider, pemantauan error/latency, backup dan pemulihan, aksesibilitas, kompatibilitas ponsel, serta lisensi data/citra pada deployment aktual.

Paket pasca-hackathon ini memerlukan estimasi dan keputusan deployment tersendiri. Ia tidak mengubah batas klaim atau kriteria release candidate yang sudah ditetapkan di atas.

## Penanggung jawab, prasyarat, dan bukti penutupan

### Pembagian tanggung jawab

| Peran | Tanggung jawab | Batas akses/keputusan |
|---|---|---|
| **Codex/engineer repo** | Audit source, perubahan kode yang diperlukan, evaluator, dokumentasi, gate lokal, browser run dan pencatatan hasil. | Tidak menghubungi panitia/peserta, mengubah visibilitas repo, membuat deployment, mengirim dokumen ke provider, atau membuat transaksi tanpa otorisasi terpisah. |
| **Pemilik proyek** | Mengirim pertanyaan aturan ke kanal resmi, mengonfirmasi submission dari akunnya, mengatur izin provider/database bila dipilih, merekrut reviewer/pilot, dan memberi keputusan biaya/visibility. | Kredensial dikirim melalui secret manager/environment yang aman; jangan dimasukkan ke Git, prompt log, atau `VITE_*`. |
| **Dua penilai independen** | Melabeli klaim dan kutipan tanpa melihat label satu sama lain; menyelesaikan perbedaan melalui adjudikasi yang dicatat. | Hanya memakai dokumen yang hak pemrosesan, kutipan, penyimpanan, dan redistribusinya jelas. |
| **Pengguna pilot** | Menjalankan tugas yang sama pada alur manual dan MethaneResponse; memberi umpan balik sukarela. | Data peserta dianonimkan; lima peserta hanya pilot formatif dan tidak membuktikan manfaat populasi. |
| **Panitia** | Memberi jawaban tertulis untuk konflik waktu, kelayakan, dan deliverable. | Tidak ada asumsi tentang aturan sampai jawaban atau form peserta menyelesaikan konflik. |

### Daftar prasyarat dengan tanggal keputusan

| Prasyarat | Pemilik tindakan | Batas keputusan | Jika belum tersedia |
|---|---|---|---|
| Waktu mulai/tutup dan eligibility yang benar | Pemilik proyek mengirim draf klarifikasi di atas; simpan jawaban/form | **15 Okt** | Submission tetap berisiko; siapkan paket pada 24 Okt dan jangan mengandalkan waktu yang bertentangan. |
| Akses repo tanpa login dan lisensi aset | Engineer mencoba clone/read anonim saat jaringan tersedia; pemilik dapat memberi bukti akses dari browser tanpa login | **15 Okt** | Catat sebagai belum diverifikasi; aset tanpa hak jelas diganti/dihilangkan sebelum final package. |
| Dokumen untuk benchmark dan penggunaan AI | Engineer memeriksa lisensi/izin; pemilik memperoleh persetujuan tertulis bila syarat tidak jelas | **16 Okt** | Benchmark AI tidak dirilis; gunakan rules baseline dan abstention. |
| Dua penilai independen | Pemilik menjadwalkan penilai dan satu adjudicator | **16 Okt** | Tidak ada klaim benchmark independen; lanjutkan tooling dan submission lain. |
| Provider/PostGIS/origin demo | Pemilik memilih layanan dan mengonfigurasi secrets secara aman | **17 Okt** | Jalankan alur lokal; tandai provider dan cloud belum aktif. |
| Lima pengguna pilot dan perangkat uji | Pemilik mengatur sesi serta perangkat yang tersedia | **18 Okt** | Tandai pilot/perangkat fisik tertunda; jangan mengganti dengan evaluasi internal. |
| Sepolia issuer/RPC dan otorisasi transaksi | Pemilik memberi otorisasi serta menyiapkan akun testnet | **20 Okt** | Jangan anchor; demo hanya verifier lokal dan penjelasan digest. |

Tanggal keputusan adalah batas untuk memilih jalur, bukan janji bahwa pihak eksternal akan merespons. Setelah batas lewat, gunakan fallback yang tercatat agar pekerjaan lokal tetap bergerak.

### Gate verifikasi final yang harus menghasilkan artefak

| Gate | Pemeriksaan | Artefak bukti yang disimpan | Lulus jika |
|---|---|---|---|
| **Data** | Validasi hash/manifes snapshot; cek ID sumber, tanggal UTC, koordinat, unit, uncertainty, dan label historis vs demo. | Log pemeriksaan, snapshot ID/hash, daftar sumber dan tanggal yang tampil pada demo. | Peta, detail kasus, dan laporan memakai snapshot yang sama; data kosong tidak diperlakukan sebagai nol. |
| **Audit** | Jalankan kasus dengan kutipan valid, kutipan yang tidak cocok, dokumen yang tidak tersedia, dan bukti yang kontradiktif. | Hasil API/browser serta ID revisi laporan. | Kutipan tepat terikat ke input; tanpa bukti sistem abstain; `feedback` tidak menjadi bukti repair; perubahan laporan membuat revisi baru. |
| **Persistence/reviewer** | Simpan audit, tutup proses, hidupkan lagi; coba read draft tanpa token, token salah, dan token reviewer yang benar. | Log restart/read permission dan hasil status HTTP. | Revisi tetap ada; akses terlarang tidak membocorkan isi; izin tidak berasal dari sekadar UI. |
| **Integrity** | Ekspor report, validasi digest, ubah satu byte/field, verifikasi ulang. Jika Sepolia aktif, cocokkan transaction receipt, event, issuer, dan hash bundle. | Berkas export, digest, output verifier, dan tx hash bila nyata. | Perubahan terdeteksi; label lokal/testnet/public dibedakan; receipt hanya membuktikan integritas/urutan revisi. |
| **Browser** | Jalankan alur utama pada desktop dan viewport 390×844; cek peta, case selection, evidence panel, audit, review, report, verifier, fallback tile/API. | Screenshot dari browser aktual, versi/build, console/network error summary. | Alur utama dapat diulang tanpa error pemblokir atau overflow; kegagalan imagery/provider menunjukkan fallback yang jelas. |
| **Kualitas repo** | Jalankan `bun install --frozen-lockfile`, `bash scripts/check-local.sh`, lalu `bun run check:web-bundle`; ulangi gate terkait setelah setiap perbaikan. | Output ringkas bertanggal dan status pass/fail untuk setiap command. | Semua gate lulus atau setiap kegagalan/blocker ditulis dan tidak disamarkan sebagai lulus. |
| **Submission** | Periksa repo publik tanpa login, project description, track, attribution, video 3–5 menit dan form submission dari akun pemilik. | Checklist, URL, durasi/hash video, confirmation/timestamp submission. | Semua link dapat diakses, video sesuai build, klaim cocok dengan bukti, dan timestamp berada di dalam window yang dikonfirmasi. |

Untuk pilot, ambang formatif yang diusulkan adalah **minimal 4 dari 5** peserta menyelesaikan tugas inti tanpa bantuan fasilitator. Laporkan waktu median, error, dan bantuan bersama jumlah peserta; ambang ini adalah aturan evaluasi internal, bukan jaminan nilai 18/20 atau bukti statistik umum.

### Status board pada 14 Oktober 2026

| Gate | Status berbasis catatan yang tersedia | Tindakan berikutnya |
|---|---|---|
| Data dan alur lokal | **PASS lokal untuk jalur MARS → PostGIS → restart → report → verifier.** Browser memilih `KAZ_S_159`, rules baseline abstain pada klaim mitigasi, audit dan hash bertahan setelah API restart, dan ekspor memisahkan tiga observasi historis sebagai konteks. | Ulangi pada release candidate dan origin publik; jangan menyamakan status lokal dengan AI live atau mitigasi terverifikasi. |
| Evaluator | **PASS untuk tooling; 117 tes pipeline Python lulus pada rerun 14 Okt.** Belum ada gold set independen atau provider run. | Buat hasil benchmark hanya sesudah dokumen berizin dan anotasi independen tersedia. |
| GitHub | **Dilaporkan publik oleh pemilik; akses remote belum diverifikasi pada sesi ini.** Base workspace menunjuk `AndroLay/MethaneResponse`; perubahan aktif lokal belum dipastikan terbit. | Uji anonymous clone/read dan samakan revision release candidate sebelum submission. |
| Hak dokumen | **BLOCKED untuk 3 referensi yang disaring; 0 sudah cleared untuk provider input.** | Cari sumber alternatif berlisensi jelas; minta izin bila perlu. |
| Provider dan database cloud | **Belum dikonfigurasi/UNVERIFIED live.** | Pemilik memilih target dan menyiapkan secrets; uji cold start serta restart persistence. |
| Sepolia | **Belum ada alamat registry/receipt transaksi live.** | Gunakan hanya setelah otorisasi; jika belum siap, jangan tampilkan status on-chain. |
| Pilot/perangkat fisik | **Belum ada sesi pengguna/performa GPU fisik tercatat.** | Jadwalkan lima peserta dan device test; bila tidak tersedia, laporkan gap. |
| Submission | **Belum ada video atau timestamp submission.** Window dan eligibility memerlukan klarifikasi. | Freeze 24 Okt; submit hanya pada waktu yang dikonfirmasi. |

### Gerbang kualitas lokal terbaru — 14 Oktober 2026

`bash scripts/check-local.sh` lulus dengan PostGIS disposable aktif: API 108 tes / 633 assertions / 0 skip; web 164 / 164.424 assertions; verifier 9 / 53 assertions; Python 117; Foundry 4 / 0 skip; typecheck, build, bundle budget, dan baseline reproducible lulus. Detail dan batas run ada di [`bukti gerbang lokal`](evidence/local-quality-gate-2026-10-14.md). Ini menguatkan bukti implementasi lokal; tidak membuktikan CI remote, cloud, model AI, receipt blockchain, manfaat pengguna, atau pengurangan emisi.

### Format laporan progress harian

Catat satu baris per tanggal dengan kolom: **rencana hari ini · keluaran yang benar-benar ada · path/link bukti · gate PASS/FAIL/BLOCKED · jam terpakai · blocker dan pemiliknya · tindakan 24 jam berikutnya**. Jangan memakai persentase gabungan; hitung gate yang benar-benar PASS dan tampilkan blocker secara terpisah. Jika hasil bergantung pada layanan eksternal, tandai `LOCAL`, `LIVE`, atau `UNVERIFIED`.

### Progress update — repository visibility

- Pemilik menyatakan repository GitHub sudah publik.
- Pemeriksaan metadata melalui GitHub CLI dari workspace gagal karena koneksi ke `api.github.com` tidak tersedia. Tidak ada perubahan GitHub yang dilakukan dari sini.
- Status kerja: **dilaporkan publik; akses anonim/juri dan hak redistribusi aset masih perlu diverifikasi**.

### 2026-10-14 — Cold-run peta dan fallback imagery

- Menjalankan lima konteks Chromium headless baru pada desktop 1280×800 dan viewport ponsel 390×844. Median status siap MapLibre **1.069 ms** dan **1.022 ms**, masing-masing; tiap pembukaan mengukur sekitar **5,96 MB** resource browser. Ini development server + software WebGL, bukan benchmark GPU/perangkat fisik atau CDN produksi.
- Reproduksi kegagalan semua tile Esri menemukan kasus tetap bisa dipilih tetapi tidak ada penjelasan imagery gagal. Menambahkan notice aksesibel dan retry; tes helper red/green, browser menunjukkan source/koordinat tetap ada dan notice terlihat. Saat eksternal masih gagal setelah retry, notice tetap tampil; pemulihan provider tidak diklaim.
- Gate: typecheck, web **161/161**, production build, dan bundle budget lulus. Detail per-run, resource, long task, fallback, dan screenshot tercatat di [`execution checkpoint`](EXECUTION_CHECKPOINT_2026-10-14.md) dan [`hasil cold-run peta`](evidence/map-performance-cold-runs-2026-10-14.json).
- Berikutnya pada jalur lokal: evaluasi long task 257–374 ms jika ada kesempatan profiling yang valid; uji fisik tetap memerlukan ponsel nyata. Gate eksternal benchmark berizin, layanan cloud, reviewer/pilot, Sepolia dan submission masih pending sesuai board di atas.

### 2026-10-14 — Browser proof untuk AI-review revision dan private persistence

- Alur Evidence Auditor pada fixture sintetik yang diberi label menghasilkan kutipan exact dan verdict `insufficient_evidence`; reviewer test meminta bukti tambahan, sehingga laporan menjadi revision 2 tanpa dipromosikan ke `supported`.
- API restart mempertahankan kedua revisi di file store lokal. Uji scope privat, no-store headers, token scope salah, parent hash, race dua keputusan reviewer, serta ekspor valid/tampered memberi hasil yang diharapkan. Bukti rinci ada pada [`execution checkpoint`](EXECUTION_CHECKPOINT_2026-10-14.md).
- Ini menaikkan bukti alur kode lokal pada technical execution/usefulness; tidak menaikkan bukti akurasi AI, dampak iklim, atau validasi pengguna. Provider yang dipakai adalah mock loopback; reviewer identitas uji; file store bukan cloud; receipt blockchain tidak ada.
- Status berikutnya: hasil rules baseline tetap satu-satunya basis AI komparatif yang tersedia. Untuk menyatakan AI berguna secara empiris dibutuhkan dokumen yang haknya jelas, anotasi independen, evaluasi pada contoh yang sama dengan baseline, lalu pilot pengguna sasaran.

### 2026-10-14 — Provenance baseline diperbarui

- Evaluator rules dan fixture intelijen kini terikat ke snapshot MARS 13 Oktober (`unep-mars-ccd8267c55ee`); report menyertakan hash benchmark/casebook dan metadata provenance lengkap. Report dan tes reproducibility ada di `services/data-pipeline/reports/baseline-evaluation.json` dan `services/data-pipeline/tests/`.
- Gate Python aktif: **117/117 lulus**; verifier **4/4 lulus**. Angka baseline tidak berubah menjadi bukti AI: 15 klaim (9 nyata, 6 DEMO), macro-F1 real **0,6667**, dan label `contradicted` tetap tidak terwakili pada subset real.
- Prioritas berikutnya tidak berubah: tambah korpus berizin dan label independen sebelum menilai model AI; siapkan origin/provider dan pilot hanya ketika pemilik menyediakan akses serta persetujuan yang diperlukan.

### 2026-10-14 — Rerun release gates lokal

- Gate agregat `scripts/check-local.sh` berakhir **exit 0**. Typecheck, 161 web tests, 4 verifier tests, 117 Python tests, 4 Foundry tests, production build dan bundle budget lulus.
- API: 97 pass, 13 PostgreSQL tests **skip** karena koneksi DB tidak tersedia pada run ini. Akses Docker socket ditolak sandbox, jadi saya tidak membuat container baru; tes tersebut tidak dihitung sebagai lulus pada rerun ini. Hasil PostGIS disposable dari checkpoint terdahulu tetap merupakan bukti lokal terpisah, bukan layanan cloud.
- Build masih mencatat warning ukuran chunk MapPanel raw di atas 500 kB; ukuran gzip dan budget yang dikonfigurasi lulus. GPU fisik, GitHub Actions pada perubahan lokal, AI provider, Postgres cloud, Sepolia, pilot, dan dampak emisi belum diverifikasi.

### 2026-10-14 — Shortlist hak benchmark diperluas

- Pemeriksaan laman primer Copernicus menambah delapan karya teks kandidat; inventaris sekarang memuat **13 dokumen/karya shortlist** dan menyebut lisensi yang terlihat serta kasus yang cocok untuk claim-level review.
- Tidak ada kandidat yang otomatis cleared untuk provider, dan jumlah dokumen bukan jumlah source cluster. Benchmark masih memerlukan hak tiap lingkup penggunaan, peninjauan provider, 40+ klaim held-out, dua anotator independen, serta adjudikasi. Tidak ada PDF/suplemen yang diunduh atau provider yang dipanggil.
- Catatan rinci beserta tautan dan batas masing-masing kandidat ada di [inventaris hak dokumen](/home/andro/dev/projects/Devpost/iEEE-Methane-response/docs/research/mars-casebook-document-rights-inventory-2026-10-14.md). AI tetap di belakang rules baseline sampai benchmark memenuhi protokol.

### 2026-10-14 — PostGIS browser E2E dan konteks laporan

- Pada aplikasi lokal, `KAZ_S_159` dimuat dari snapshot UNEP MARS `unep-mars-ccd8267c55ee`; tiga plume historis ditampilkan. Klaim mitigasi yang sama dijalankan melalui rules baseline dan menghasilkan `insufficient_evidence`, bukan sukses mitigasi.
- Audit disimpan ke PostGIS disposable lalu dibaca lagi sesudah API restart dengan audit ID dan bundle SHA-256 tetap sama. Browser membuka histori revisi, mengekspor JSON, dan CLI verifier menerima bundle dengan status chain `ABSENT`.
- Ekspor kini membawa tiga observasi dalam `historicalContext` yang ditandai `context_only_not_claim_evidence`; `observations` tetap kosong karena tidak ada citation deteksi pada audit mitigasi. Verifier browser menunjukkan jumlah konteks tersebut. Perubahan nilai flux pada konteks menyebabkan checksum ekspor ditolak. Snapshot mismatch mengeluarkan kedua set observasi.
- Gate sebelum perubahan indikator status historis: web **163/163**, verifier **9/9**, typecheck, build production, bundle budget, dan `git diff --check` lulus. Hasil itu superseded oleh rerun terbaru di atas dengan web 164/164. Warning chunk MapPanel raw **1.121,94 kB** tetap ada; batas gzip terkonfigurasi lulus.
- Ini membuktikan alur software lokal dan persistensi pada container sementara, bukan PostgreSQL cloud, provider AI, reviewer independen, Sepolia, atau dampak mitigasi. Gate berikutnya tetap hak korpus dan label independen, deployment yang dipilih pemilik, pilot pengguna, serta bukti chain hanya setelah otorisasi.

### 2026-10-14 20.50 WITA — Public base dan gate release candidate

- Anonymous `git ls-remote` membuktikan `HEAD` dan `main` repo publik menunjuk `99662e6de86b1d745e6ce3589ce37a9ed6c0d66c`, sama dengan basis lokal; perubahan pada working tree belum dipublikasikan.
- Perbandingan terhadap manifest awal mencatat 338 path status saat file tak terlacak dihitung satu per satu, 34 path di luar manifest, 20 file baseline yang ukuran/hash-nya berubah, dan tidak ada entry baseline yang hilang. Semua perubahan tetap dipertahankan. High-confidence scanner untuk private-key headers dan token GitHub/AWS/OpenAI/Stripe/Slack menemukan 0 file kandidat; pemindaian pola bukan jaminan universal.
- `bun install --frozen-lockfile` tidak mengubah dependency. Gate agregat tanpa pengaturan temp awalnya gagal dengan `EDQUOT` pada penulisan file store di `/tmp`; API suite dan dua assessment terkait lulus saat `TMPDIR=/dev/shm`. `TMPDIR=/dev/shm bun run check:all:postgis` kemudian berakhir exit 0, dengan API/PostGIS **112/112 (649 assertions, 0 skip)**, web **174/174 (164.716 assertions)**, verifier **20/20 (96 assertions)**, Python **122/122**, Foundry **4/4**, typecheck, production build dan bundle budget.
- Asset guard **2/2 (23 assertions)** lulus dan 0/10 aset tanpa izin redistribusi muncul di production `dist/assets`. Sembilan file tracked dihapus dari revision lokal; tidak dilakukan force-push, sehingga file pada commit historis tetap dapat diakses.
- Perkiraan payload file berubah sekitar **57,5 MB**. Snapshot browser yang dilisensikan tetap disertakan; arsip raw dikecualikan. CI GitHub untuk revision kandidat dan seluruh layanan live masih belum diverifikasi.

### 2026-10-14 21.08 WITA — Source release dipublikasikan dan CI terverifikasi

- Commit `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d` dipush ke public `main` sebagai fast-forward dari `99662e6`. GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) untuk commit tersebut berakhir `success`.
- `git ls-remote` dengan system/global Git config, credential helper, dan HTTP extraheader dinonaktifkan mengembalikan commit yang sama untuk `HEAD` dan `refs/heads/main`; `git status --short` kosong sesudah push.
- Release berisi implementasi, data browser berlisensi, migrations, tests, dokumentasi dan bukti browser. Sembilan UI assets dihapus dari current tree; delapan mockup PNG disimpan lokal dan di-ignore. Riwayat lama tidak di-rewrite, sehingga file yang pernah dipublikasikan masih dapat diakses pada commit terdahulu.
- Ini menutup akses source publik dan remote CI untuk source release, bukan submission competition. Konflik jadwal/eligibility, video, provider/benchmark AI, database cloud, Sepolia, pilot dan pengukuran perangkat masih terbuka.

### 2026-10-15 — Matched WebGL measurement, public CI, and submission recheck

- Added separate `--browser-mode=headless|windowed` selection to the map benchmark. On exact runner revision `f5a832c`, five fresh contexts per desktop/mobile viewport used one windowed display, Chromium 153, and the same pinned MARS snapshot. Renderer identity was verified as SwiftShader in all 11 software contexts and AMD Radeon 680M in all 11 system-renderer contexts.
- Median readiness was SwiftShader **2,544 ms desktop / 1,831 ms mobile viewport emulation** versus Radeon **1,732 ms / 1,703 ms**. Maximum Long Task was **452/130 ms** versus **75/80 ms**. Normal samples had no page errors, overflow, or failed requests. Encoded bytes varied, caches were not reset, and the order was sequential; these results do not isolate GPU causation, prove FPS, or represent physical mobile hardware. Per-run evidence and these limits are in the [checkpoint](EXECUTION_CHECKPOINT_2026-10-15.md) and the [software](evidence/map-performance-software-windowed-2026-10-15.json)/[Radeon](evidence/map-performance-amd-radeon-680m-windowed-2026-10-15.json) reports.
- Commit `b9c18f562eca0715fa89754df1ec6246025a4ec8` is on public `main`; CI [38652944182](https://github.com/AndroLay/MethaneResponse/actions/runs/38652944182) passed JavaScript, data-pipeline, and contracts jobs. The runner-specific local checks passed `bun run check`, `test:verifier` (**40/40, 161 assertions**), `test:map-performance` (**13/13, 40 assertions**), and runner bundling.
- A fresh technical audit of local demo v14, SHA-256 `a08bf76a85d037bd4656a1fb3e185b29a1bb36fc37d4fb8f870fb85100556650`, again passed dimensions, cadence, duration, H.264/yuv420p, silent-track spec, and full decode. Contact-sheet/selected-frame inspection was completed, but the creative verdict remains **not reviewed** and `delivery_ready=false`: `orca-ide` returned `runtime_unavailable`, so no full normal-speed playback was observed. The cut has no audio; imagery-rights review and upload also remain open. No video was uploaded or submitted.
- The current Devpost overview still says “students only” and 25 October, 17:00 MSK; direct Rules, Dates, and forum reads returned 403 in this recheck. Search-indexed discussion shows a participant follow-up but no organizer response, so eligibility and the submission-time conflict remain unresolved. No organizer was contacted and no submission was made.
