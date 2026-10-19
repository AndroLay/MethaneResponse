# Peta repository

[Pusat dokumentasi](README.md) · [Arsitektur](architecture/overview.md) · [Setup lokal](development/local-setup.md)

Bun mengelola workspace TypeScript di `apps/*` dan `packages/*`. Pipeline Python dan kontrak Solidity mempunyai toolchain sendiri. Tabel berikut menunjukkan tempat memulai penelusuran; bukan daftar seluruh file.

Untuk evaluasi manfaat/AI, mulai dari [paket P5/P6](evidence/p5-p6-agent-evaluation-2026-10-18/README.md): `services/data-pipeline/pilot_study.py` mengolah tugas berpasangan secara privat; `evaluate_evidence_ai.py` menilai prediksi dengan hash input dan memisahkan threshold/manfaat/aktivasi; `scripts/freeze-ai-assessment-inputs.ts` dan `scripts/run-ai-benchmark.ts` menangani freeze serta runner berizin. Hasil agent dibedakan dari studi manusia/provider.

## Struktur utama

```text
MethaneResponse/
├── apps/
│   ├── web/                 React + Vite; antarmuka dan aset publik
│   └── api/                 Bun + Hono; validasi dan penyimpanan audit
├── packages/shared/         Skema Zod, tipe, aturan bukti, fixture DEMO
├── services/data-pipeline/  Import, transformasi, analisis, evaluasi Python
├── data/
│   ├── real/                Arsip/provenance MARS dan casebook nyata
│   ├── fixtures/            Data sintetis untuk demo/tes
│   ├── processed/           Analisis; sebagian artefak versi tetap dilacak Git
│   ├── raw/                 Area kerja input lokal
│   └── state/               File audit runtime lokal; diabaikan Git
├── contracts/               Solidity EvidenceRegistry dan tes Foundry
├── scripts/                 Verifier, runner dan alat persiapan/evaluasi
├── e2e/                     Skenario browser Playwright
├── docs/                    Panduan aktif, riset, rencana dan bukti
└── .github/workflows/       Pemeriksaan CI
```

Direktori runtime seperti `data/state/` dapat baru muncul saat aplikasi dijalankan. Dependensi dan output build (`node_modules`, `.venv`, `dist`, output Foundry) bukan sumber implementasi.

## Web: dari route ke fitur

| File/modul | Peran |
|---|---|
| [main.tsx](../apps/web/src/main.tsx) · [App.tsx](../apps/web/src/App.tsx) | Bootstrap, shell dashboard, routing, sumber aktif dan hubungan API |
| [LandingPage.tsx](../apps/web/src/LandingPage.tsx) | Pengantar produk dan tautan workspace |
| [MapPanel.tsx](../apps/web/src/MapPanel.tsx) | MapLibre, sumber/plume, layers, kamera dan fallback |
| [progressive-mars-loader.ts](../apps/web/src/progressive-mars-loader.ts) · [mars-snapshot-loader.ts](../apps/web/src/mars-snapshot-loader.ts) | Memuat snapshot bertahap dan memeriksa integritas |
| [CasesWorkspace.tsx](../apps/web/src/CasesWorkspace.tsx) · [CaseDetailsDialog.tsx](../apps/web/src/CaseDetailsDialog.tsx) | Tabel sumber, antrean kerja dan detail |
| [EvidenceAuditorWorkflow.tsx](../apps/web/src/EvidenceAuditorWorkflow.tsx) | Overview → Observations → penilaian → Review → Report |
| [AssessmentScopeEditor.tsx](../apps/web/src/AssessmentScopeEditor.tsx) · [EvidenceCoveragePanel.tsx](../apps/web/src/EvidenceCoveragePanel.tsx) | Periode/kejadian dan preview kelayakan bukti |
| [HumanAssessmentPanel.tsx](../apps/web/src/HumanAssessmentPanel.tsx) · [AssessmentTrustPanel.tsx](../apps/web/src/AssessmentTrustPanel.tsx) | Penilaian manual, referensi, reviewer dan persetujuan |
| [CaseWorkPanel.tsx](../apps/web/src/CaseWorkPanel.tsx) · [case-work.ts](../apps/web/src/case-work.ts) · [session-draft.ts](../apps/web/src/session-draft.ts) | Investigasi browser dan draft per tab |
| [SharedCaseWorkPanel.tsx](../apps/web/src/SharedCaseWorkPanel.tsx) · [shared-work-api.ts](../apps/web/src/shared-work-api.ts) · [team-session.ts](../apps/web/src/team-session.ts) | Editor/queue/history tim, client CAS, token memori dan reconnect |
| [AuditHistoryPanel.tsx](../apps/web/src/AuditHistoryPanel.tsx) · [AuditRevisionComparison.tsx](../apps/web/src/AuditRevisionComparison.tsx) | Riwayat dan perbandingan revisi |
| [report-export.ts](../apps/web/src/report-export.ts) · [investigation-brief.ts](../apps/web/src/investigation-brief.ts) | Ekspor JSON dan Markdown |
| [ImportedAuditVerifier.tsx](../apps/web/src/ImportedAuditVerifier.tsx) · [TransparencyPanel.tsx](../apps/web/src/TransparencyPanel.tsx) | Verifikasi impor dan ringkasan publik |
| [MarsPublisherInsights.tsx](../apps/web/src/MarsPublisherInsights.tsx) | Top 50 dan respons negara dari rilis penerbit |

Lihat [catatan UI](development/ui-implementation.md) untuk route dan [arsitektur peta](architecture/real-map.md) untuk pemuatan data/layers.

## API dan kontrak bersama

| File/modul | Peran |
|---|---|
| [index.ts](../apps/api/src/index.ts) | Entry point Bun, host/port dan file store |
| [app.ts](../apps/api/src/app.ts) | Route, validasi, otorisasi dan orkestrasi |
| [audit.ts](../apps/api/src/audit.ts) · [scoped-source.ts](../apps/api/src/scoped-source.ts) | Rules baseline dan resolusi source/scope/snapshot |
| [human-assessment.ts](../apps/api/src/human-assessment.ts) | Bundle penilaian manusia dan lineage revisi |
| [ai-review.ts](../apps/api/src/ai-review.ts) | Model opsional dan pemeriksaan kutipan |
| [reviewer-auth.ts](../apps/api/src/reviewer-auth.ts) · [reviewer-directory.ts](../apps/api/src/reviewer-directory.ts) | Token berscope dan attestation direktori operator |
| [evidence-check.ts](../apps/api/src/evidence-check.ts) | Retrieval HTTPS terbatas dan content digest |
| [store.ts](../apps/api/src/store.ts) | Store file/in-memory, urutan revisi dan envelope versi 2 berisi audit/intent/event publikasi durabel satu writer |
| [publication.ts](../apps/api/src/publication.ts) | Migrasi consent, validasi event, CAS penarikan dan proyeksi status publik tanpa aktor privat |
| [case-work.ts](../apps/api/src/case-work.ts) · [case-work-file.ts](../apps/api/src/case-work-file.ts) | State tim terpisah, CAS/history, private atomic file dan initialization marker |
| [canonical.ts](../apps/api/src/canonical.ts) · [integrity.ts](../apps/api/src/integrity.ts) · [audit-visibility.ts](../apps/api/src/audit-visibility.ts) | Canonical JSON, hash dan akses |
| [casebook.ts](../apps/api/src/casebook.ts) · [intelligence-data.ts](../apps/api/src/intelligence-data.ts) | Pembacaan dan pemeriksaan artefak yang dipin |
| [anchor-intent.ts](../apps/api/src/anchor-intent.ts) | Identitas operasi, target, pending/confirmed/reverted dan kecocokan receipt |
| [chain.ts](../apps/api/src/chain.ts) | Persiapan/sign lokal, broadcast sekali, pemeriksaan intent/receipt canonical dan viem |
| [shared/index.ts](../packages/shared/src/index.ts) | Skema domain, input, scope dan selector cakupan bukti |
| [shared/trust.ts](../packages/shared/src/trust.ts) · [shared/transparency.ts](../packages/shared/src/transparency.ts) | Assurance dan allowlist ringkasan publik |

Kontrak HTTP ada di [referensi API](architecture/api-reference.md). Tes TypeScript umumnya dekat modul sebagai `*.test.ts`/`*.test.tsx`.

## Pipeline, data, dan kontrak

| Lokasi | Kapan digunakan |
|---|---|
| [ingest_mars.py](../services/data-pipeline/ingest_mars.py) · [build_web_snapshot.py](../services/data-pipeline/build_web_snapshot.py) | Membentuk artefak MARS; ikuti [provenance](../data/real/README.md) |
| [build_intelligence.py](../services/data-pipeline/build_intelligence.py) | Ringkasan sumber, prioritas dan analisis snapshot |
| [record_recurrence.py](../services/data-pipeline/record_recurrence.py) · [prospective_recurrence.py](../services/data-pipeline/prospective_recurrence.py) | Model record recurrence, ledger dan evaluasi horizon tetap |
| [build_publisher_indicators.py](../services/data-pipeline/build_publisher_indicators.py) | Top 50 dan respons negara; [petunjuk rebuild](../data/real/mars_publisher_archives/README.md) |
| [build_plume_geometries.py](../services/data-pipeline/build_plume_geometries.py) | Shard geometri bulanan dengan binding snapshot |
| [evaluate_baseline.py](../services/data-pipeline/evaluate_baseline.py) · [evaluate_evidence_ai.py](../services/data-pipeline/evaluate_evidence_ai.py) | Conformance rules dan evaluasi keluaran AI berlabel |
| [apps/web/public/data](../apps/web/public/data/) | Snapshot statis, manifest, shard, indikator dan geometri untuk browser |
| [data/processed](../data/processed/) | Artefak API, model dan ledger prospektif versi tetap |
| [EvidenceRegistry.sol](../contracts/src/EvidenceRegistry.sol) | Komitmen hash append-only, terpisah dari audit lokal |

Artefak turunan yang diberi versi tetap tidak diedit untuk mengganti hasil analisis. Gunakan builder beserta provenance yang sesuai. Ledger prospektif memakai path versi baru dan tidak ditimpa. Fixture DEMO dan data nyata tetap terpisah. Detail transformasi ada di [aliran data](architecture/data-flow.md).

## Konfigurasi dan alat

[package.json](../package.json) dan [bun.lock](../bun.lock) mengatur workspace Bun. [.bun-version](../.bun-version) memin Bun; [pyproject.toml](../services/data-pipeline/pyproject.toml)/[uv.lock](../services/data-pipeline/uv.lock) mengatur Python; [foundry.toml](../contracts/foundry.toml) mengatur Solidity.

[.env.example](../.env.example) mendokumentasikan API; [apps/web/.env.example](../apps/web/.env.example) hanya untuk pengaturan web yang boleh terlihat publik. [playwright.config.ts](../playwright.config.ts), [runner E2E](../scripts/run-e2e.sh), dan [check-local.sh](../scripts/check-local.sh) mengoordinasikan pemeriksaan. [start-api.ts](../scripts/start-api.ts) / [api-writer-lock.ts](../scripts/api-writer-lock.ts) menjaga writer lock; [case-work-maintenance.ts](../scripts/case-work-maintenance.ts) menyediakan backup/restore offline. [render.yaml](../render.yaml) adalah opsi preview; keberadaannya tidak menyatakan service sudah dideploy.

P2: [AnchorControls.tsx](../apps/web/src/AnchorControls.tsx) dan [chain-client.ts](../apps/web/src/chain-client.ts) mengelola target/status/reconcile pada Verification Center. [chain-integration.test.ts](../scripts/chain-integration.test.ts) menjalankan jaringan lokal disposable; [runbook](development/blockchain-recovery.md) menjelaskan otorisasi publik dan pemulihan.
