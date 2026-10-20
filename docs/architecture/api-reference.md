# Referensi API

## Investigation capacity portfolios

`POST /api/investigations/portfolios` takes `{ datasetSnapshotId, inputFileSha256, parameters: { capacity, maxPerCountry, countries, sectors, recurrenceWeight } }`. Capacity/country limits are integers 1–50; recurrence weight is an integer 0–100; empty country/sector lists mean all. Request is strict, bounded to 8 KiB and limited to 20 requests/client/minute per process. Responses are `no-store`. Caller-supplied candidates, scores and document/team notes are not accepted.

The server validates pinned intelligence plus compressed input, joins exact source IDs to archive geography, and recomputes median flux/SD and distinct dates from linked records before comparing summaries. It returns a versioned unsigned allocation report: full candidate projection, four strategies, quota/scope/capacity dispositions (derived by the shared policy), allocation sensitivity, attribution, archive/input/intelligence hashes and deterministic SHA-256. Public-preview mode projects only its three allowlisted sources and labels the restricted scope; no audit is saved and no AI/chain write is performed. `409`: stale snapshot/hash; `400`: invalid constraints; `413`: body too large; `429`: limit; `503`: invalid/unavailable local inputs. Browser verifies both context bindings and policy replay before rendering. Existing audit schemas/endpoints remain compatible.

## Historical snapshot record transitions

`POST /api/investigations/snapshot-transition` accepts strict `{ datasetSnapshotId, inputFileSha256, sourceIds?, offset?, limit? }`. IDs bind the active normalized snapshot. Omitted or empty `sourceIds` means all changed linked sources; nonempty lists contain 1–50 unique original IDs. Offset defaults to 0 (0–100,000), limit to 20 (1–50). Unknown IDs are rejected; a removed source is allowed when present in the pinned transition. The browser does not submit an empty selected portfolio as unrestricted scope.

The response is `transitionPage`: policy/schema/digest, both original-input descriptors, aggregate record counts, unresolved-record counts, affected-source count, requested/unchanged source IDs and bounded source rows. Each source row retains original metadata values and observation changes; the source-page limit does not truncate its record history. UI observation pagination is separate. The complete pinned report is returned by `POST /api/investigations/snapshot-transition/export` with the same strict request contract. Responses are `no-store`. No AI call, reviewer write, upstream fetch or chain transaction occurs.

Inputs and generated report are fixed server paths with compressed-size/decompression bounds, original-file SHA-256 checks, manifest/report integrity and active snapshot/archive/input bindings. A stat-keyed cache shares concurrent loads; it invalidates on input/report/manifest file changes. Diff generation is offline; per-request source pagination does not recompute the full archive. HTTP cannot select files or URLs.

Both routes have a 16 KiB JSON body limit and a separate 20-request/client/minute process-local limiter. `400`: malformed/unknown/duplicate IDs; `403`: restricted public preview; `409`: stale active context; `413`: oversized body; `429`: rate limit; `503`: invalid/unavailable pinned inputs (redacted error). The full transition is not projected into the three-source preview. Policy `mars-normalized-record-delta/1` compares the explicitly enumerated publisher fields, exact original IDs, nulls, dates, units and uncertainties. Added/removed records are archive changes, not physical onset/cessation. [Replay and limitations](../evidence/snapshot-change-watch-2026-10-20/README.md).

## Versioned investigation-plan decisions

`GET /api/investigation-plans/:id` returns a full private `PlanJournal`; `PUT` creates (`201`) or appends (`200`) a decision. Both require signed `private_read` plus current operator-attested `source_detected` authority. PUT also requires `review`; legacy shared/admin tokens do not substitute. Public-preview mode rejects both (`403`). All responses use `no-store` and `Vary: Authorization`.

PUT accepts strict `{ request: { datasetSnapshotId, inputFileSha256, parameters }, reportDigest, strategy, decision, rationale, expectedRevision, expectedHead }`. The server rebuilds the report from pinned inputs and rejects a digest differing from the displayed report. `decision`: `accept|defer|reject`; trimmed rationale: 20–4,000 characters; ID: alphanumeric/underscore/hyphen, 1–80 characters. Actor and time are server-owned. Create uses revision `0`, head `null`; updates require both current revision and head. Authority/expiry are checked again before commit.

Bounds: request 8 KiB; 20 decisions/reviewer/client/minute per process; at most 20 journals, 20 unique reports/journal, 100 revisions/journal and 32 MiB file. Reports are deduplicated by digest; old revisions are retained. `400`: invalid ID/body; `401`: no signed access; `403`: unauthorized; `404`: absent GET; `409`: stale report/dataset or CAS conflict; `413`: body/history capacity; `429`: limit; `503`: unavailable or inconsistent state. Existing audit schemas/receipts are unchanged.

Runtime stores a companion `${AUDIT_STORE_PATH}.plans.json` and `.initialized` marker with private permissions, atomic writes/fsync and the existing API single-writer lock. Back up both offline; test factory defaults to memory. Lost state is rejected after an initialization marker has been observed; loss of the entire volume and marker is not detectable. No database or multi-instance guarantees are introduced. Exported journals require an independently trusted expected head for meaningful offline verification; they are not independently signed reviewer identities or blockchain receipts. [User workflow](../product/user-workflow.md#operasikan-dan-tinjau-rencana) and [schema](../../packages/shared/src/plan-journal.ts).

[Arsitektur](overview.md) · [Konfigurasi](../development/configuration.md) · [Alur data](data-flow.md)

**Kontrak aktif: 20 Oktober 2026.** Implementasi route ada di [app.ts](../../apps/api/src/app.ts); input baseline/manual ada di [packages/shared](../../packages/shared/src/index.ts), sedangkan input document assessment/review ada di [ai-review.ts](../../apps/api/src/ai-review.ts). Base URL lokal: `http://localhost:3001`. Web development mengakses `/api` melalui proxy Vite.

## Akses dan istilah

- **Publik:** tidak memerlukan bearer token, tetapi data tetap tunduk pada visibility dan rate limit yang relevan.
- **Private read:** reviewer token dengan scope `private_read`, disertai kebijakan direktori per claim category.
- **Review:** reviewer token dengan scope `review`, disertai kebijakan direktori. Token ini sendiri bukan bukti identitas reviewer.
- **Assessment:** token terpisah `AI_REVIEW_TOKEN`; tidak memberi akses baca private history.
- **Admin:** `ADMIN_API_TOKEN` untuk operasi yang didukung; bukan pengganti semua reviewer scopes.
- Token berscope dimasukkan melalui header `Authorization: Bearer …`. Jangan menaruhnya dalam URL, commit, contoh hasil publik atau log.

## Dataset dan analisis

| Method/path | Input utama | Hasil | Akses |
|---|---|---|---|
| `GET /api/health` | — | Kesiapan storage/casebook/rate limiter dan konfigurasi chain | Publik; `200` atau `503` |
| `GET /api/cases` | — | Casebook terkurasi, provenance, limitations | Publik |
| `GET /api/cases/:id` | Case ID | Satu kasus terkurasi | Publik |
| `GET /api/sources` | `mode=demo` opsional | Sumber casebook; DEMO bila diminta | Publik; bukan seluruh source browser |
| `GET /api/sources/:id` | Source ID; optional `mode=demo` | Sumber casebook/DEMO | Publik |
| `GET /api/intelligence/status` | — | Mode/configuration AI, human review dan chain | Publik; tidak berisi secret |
| `GET /api/intelligence/insights` | `sourceId` wajib | Analisis sumber dan metadata snapshot yang dipin | Publik |
| `GET /api/intelligence/rankings` | — | Ranking heuristic dan batas forecast/recurrence | Publik |

Data peta penuh, progressive shards, geometri dan publisher indicators berasal dari aset statis web. Dataset tersebut tidak diambil melalui `/api/sources`. Input intelligence hilang/rusak/tidak cocok menghasilkan `503`.

## Decision Lab: analisis tanpa menulis audit

| Method/path | Input | Hasil | Akses |
|---|---|---|---|
| `POST /api/investigations/plan` | Source ID, claim type, optional scope/snapshot | Eligibility trace, reference-removal sensitivity, next checks dan digest DecisionPlan | Publik, preview dibatasi |
| `GET /api/investigations/challenges` | — | Lima authored reference challenges berlabel SYNTHETIC DEMO | Publik; tidak mewakili operator nyata |
| `POST /api/investigations/observation-check` | Source ID, snapshot ID, optional normalized input SHA-256, query | Exact-linked records, counterexamples, original values/SD, excluded dates, status dan digest ObservationCheck | Publik, preview dibatasi; limiter terpisah 20/menit |

Kedua POST dibatasi JSON 16 KiB, strict schema dan no-store. Data observasi/referensi diambil dari snapshot server; request tidak boleh menyuntikkan evidence/observations. Analisis tidak menyimpan, meninjau, mengirim atau meng-anchor audit. Public preview tetap memakai source allowlist yang sama.

Contoh query observasi:

```json
{
  "sourceId": "CAN_S_002",
  "datasetSnapshotId": "unep-mars-675417694883",
  "inputFileSha256": "f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7",
  "query": {
    "kind": "reported_flux_at_most",
    "startDate": "2026-04-10",
    "endDate": "2026-04-10",
    "thresholdKgHr": 1000
  }
}
```

`query.kind` juga menerima `no_linked_detections` dan `physical_mitigation`; threshold hanya boleh/harus hadir pada `reported_flux_at_most`. Dates memakai hari UTC inklusif. ID snapshot/hash input berbeda → `409`; source tidak dikenal → `404`; body terlalu besar → `413`; batas request → `429`/Retry-After; provenance/input tidak valid → `503` generik tanpa file path server.

Hasil `counterexample_found` hanya menyangkal pernyataan arsip buatan analis. `no_counterexample_in_archive`, `no_observations`, `incomplete_flux`, `incomplete_window` bukan konfirmasi repair; `physical_mitigation` selalu `requires_document_review`. Browser baru memerlukan kecocokan normalized input SHA-256, replay policy dan checksum sebelum menampilkan hasil. [Skema](../../packages/shared/src/observation-claims.ts) dan [bukti reproduksi](../evidence/observation-crosscheck-2026-10-19/README.md) memuat format lengkap. Digest unsigned bukan autentikasi penerbit atau blockchain receipt.

## Investigasi bersama (P1)

| Method/path | Input | Hasil | Akses |
|---|---|---|---|
| `GET /api/case-work/session` | — | `reviewerId`, authorized `claimTypes`, `canWrite`, `storage` | Signed `private_read`, minimal satu claim authority aktif |
| `GET /api/case-work` | Query snapshot/mode/archive; optional `sourceId` | `{ works }`, revisi terbaru per investigasi yang diizinkan | Signed `private_read`, difilter current claim authority |
| `GET /api/case-work/:id` | Query yang sama, `sourceId` wajib | `{ work, history }`, seluruh revisi urut | Signed `private_read`; tanpa claim authority hasil `404` |
| `PUT /api/case-work/:id` | `SharedWorkInput`: `{ context, expectedRevision, draft }` | `{ work }`; `201` create, `200` update | Signed **`private_read` dan `review`**, current claim authority; assignee juga harus berwenang |

P1 **selalu** memerlukan directory assurance `operator_attested`; legacy shared token, admin token sendiri, dan flag compatibility audit tidak memberi akses. Seluruh respons memakai `Cache-Control: no-store` dan `Vary: Authorization`. Session tanpa authority `403`; list menyaring record yang tidak diizinkan. Akses diperiksa ulang sebelum commit.

`context` berisi `sourceId`, `synthetic`, `datasetSnapshotId`, dan `archiveSha256` untuk data nyata. Query menggunakan `synthetic=true|false`; archive berupa lower-case SHA-256 tanpa `0x`. Write DEMO tidak boleh membawa archive. Source, snapshot, scope/event dan assessment link diverifikasi terhadap data server. ID hanya alnum/underscore/hyphen, 1–128 karakter.

`draft` memakai `CaseWorkDraft`: `claimType`, optional `scope`, `status`, `question`, `notes`, `evidenceRequest`, `nextAction`, optional `assessmentLink`, `assignee` dan `dueDate` (`YYYY-MM-DD`). Claim/scope satu work ID tidak berubah; gunakan ID baru untuk konteks lain. Server menetapkan owner pertama, `updatedBy`, waktu dan revision. Field actor/metadata server dari request ditolak.

Create memakai `expectedRevision: 0`; update harus memakai revision terkini. Konflik `409` tidak menimpa history. Batas: 16 KiB request, 500 investigasi, 100 revisi per investigasi, 16 MiB file. Body/kapasitas penuh `413`; storage/izin/schema gagal `503`. Setelah respons tidak pasti, baca revisi terkini sebelum retry. Write berhasil hanya setelah flush state dan marker inisialisasi; state hilang setelah pernah disimpan ditolak sampai restore.

Launcher resmi memegang kernel lock sepanjang hidup API. Health menambahkan `caseWorkStorage: { backend, persistent, ready }`; field persistent menunjukkan backend file, bukan sertifikasi volume remote. API test factory dapat memakai memory store, sedangkan entry point runtime memakai file store. Panduan [penggunaan dan recovery](../development/shared-casework.md) menjelaskan setup, impor eksplisit, backup/restore dan batas single-writer.

## Menulis penilaian audit

| Method/path | Skema/input | Hasil | Akses |
|---|---|---|---|
| `POST /api/audits` | `AuditInput`: source ID, claim, optional scope/snapshot | Schema 2 tersimpan (`201`) | Lokal terbuka dengan rate limit; production memerlukan admin kecuali public baseline diaktifkan eksplisit |
| `POST /api/human-assessments` | `HumanAssessmentInput`: snapshot/scope, exact claim, references, rationale, inspection, optional parent/trust/consent | `{ audit }` schema 4 privat (`201`) | Review |
| `POST /api/intelligence/assessments` | `DocumentAssessmentInput`: source/claim, excerpt/metadata/consent | `{ audit }` schema 3 (`201`) | Assessment dan provider terkonfigurasi |
| `POST /api/audits/:id/review` | `HumanReviewInput`: keputusan, catatan, inspection dan consent yang relevan | Revisi review schema 3 | Review; khusus document assessment |
| `GET /api/reviewers/me` | `claimType` wajib | Reviewer subject, assurance kategori, publisher hosts dan strict-mode flag | Review |

Contoh body baseline yang tidak berisi data privat:

```json
{
  "sourceId": "KAZ_S_159",
  "claimType": "mitigation_confirmed"
}
```

Kategori claim: `source_detected`, `operator_notified`, `mitigation_confirmed`. Scope menggunakan `startDate`, `endDate`, optional `observationId` dan `recipient`. Human assessment mewajibkan scope dan `datasetSnapshotId`; notification mewajibkan penerima. Format/rentang field lengkap mengikuti skema, bukan contoh JSON minimal di atas.

Batas JSON request: baseline 16 KiB, human assessment 64 KiB, document assessment 40 KiB. Scope/snapshot/parent tidak cocok ditolak. Retrieval referensi hanya dilakukan bila `checkPublicReferences` disetujui pada request; mismatch digest menghalangi determination supported/contradicted.

## History, verifikasi dan transparansi

| Method/path | Filter/input | Hasil | Akses |
|---|---|---|---|
| `GET /api/audits` | Optional `sourceId`, `claimType`, `limit`, `cursor` | Audit yang boleh dibaca publik | Publik; private bundle tidak masuk list |
| `GET /api/audits/history` | Filter sama | History kategori yang diizinkan | Private read |
| `GET /api/audits/:id` | Audit ID | Full audit, bila diizinkan | Publik atau private read sesuai visibility |
| `GET /api/audits/:id/verify` | Audit ID | Local digest dan optional receipt status | Visibility sama dengan full audit |
| `GET /api/transparency` | Optional `sourceId`, `limit`, `cursor`, `view=current\|history` | `{ summaries, hasMore, nextCursor }`; default latest public revision per scope/claim, termasuk withdrawn | Publik; hanya ringkasan ber-consent |
| `GET /api/transparency/:id` | Audit ID | `{ summary, summaryHash, publication }` dengan status/history redaksi dan optional replacement ID | Publik; `404` bila tidak tersedia, `503` bila store gagal |
| `GET /api/transparency/:id/verify` | Audit ID | `summaryHash`, `publication`, `checkedAt`, `limitation`; status menurut server saat check | Publik; checksum historis terpisah dari status live |
| `POST /api/transparency/:id/withdraw` | `{ expectedVersion, reason }`; alasan enum `consent_withdrawn`, `published_in_error`, `evidence_under_review`; batas 4 KiB | Record publik diperbarui; `409` stale/sudah withdrawn, `400` invalid, `401/403` akses, `429` rate limit, `503` hasil belum terkonfirmasi | Scope `review` dan current `operator_attested` untuk claim; recheck di antrean writer |

Audit list/history tanpa parameter pagination mempertahankan respons legacy `{ audits }`. Jika pagination diminta, respons menyertakan `hasMore` dan `nextCursor`. `limit` valid adalah integer 1–100. Perlakukan cursor sebagai opaque string; kirim nilainya kembali tanpa mengubah format. List transparency selalu paginated.

Untuk koreksi publik schema 4, kirim `parentAuditId` revisi **manusia** terbaru saat save `POST /api/human-assessments` beserta consent baru. Pemeriksaan versi, pembuatan audit, dan supersession publikasi lama dilakukan dalam antrean writer yang sama. Baseline pada scope sama tetap punya nomor revisi sendiri tanpa menghalangi parent manusia. Revisi privat tanpa consent tidak mengubah status publik. Publication event menahan actor privat; respons publik tidak memuat identitas atau alasan free text. Detail [lifecycle dan kompatibilitas envelope](../development/publication-lifecycle.md).

Detail/verifikasi audit privat tidak membuka keberadaan record kepada pembaca tanpa izin: hasilnya `404`. Respons privat memakai `Cache-Control: no-store` dan `Vary: Authorization`. Public summaries juga memakai `no-store`. Approval direktori diperiksa pada private read; summary publik menyimpan status historis dan bukan proof approval terkini.

## Receipt: route ada, write lokal tidak aktif

| Endpoint | Perilaku |
|---|---|
| `GET /api/audits/:id/anchor-status` | Intent tersimpan dan target konfigurasi yang diperiksa read-only (chain/registry/issuer/confirmation policy/writeEnabled), tanpa signer/RPC credential. Target `null` bila tidak tersedia; intent tetap terbaca. |
| `POST /api/audits/:id/anchor` | Preflight, sign lokal, fsync intent dengan tx hash/nonce, broadcast sekali, lalu periksa receipt. `200` anchored, `202` pending, `409` intent/nonce/version/target stale, `422` revert, `502` hasil tidak pasti; `503` preflight/storage/signing tidak tersedia. Body opsional `{chainId,registryAddress,issuer}` mengikat target yang disetujui UI; mismatch ditolak sebelum reservasi. |
| `POST /api/audits/:id/reconcile` | Body boleh kosong: periksa hash intent yang sama tanpa mengirim transaksi. `200` reconciled/already_reconciled/reverted, `202` pending. Receipt manual opsional harus cocok exact intent dan block hasil pemeriksaan; tidak mengimpor receipt tanpa intent. |

Ketiganya memerlukan admin atau scope `anchor`. Reviewer juga harus memiliki attestation direktori **operator_attested yang masih berlaku untuk claim**; compatibility unverified/expired tidak memberikan izin chain. Baseline hanya admin; reviewer terbatas schema 3 reviewed. Schema 4 privat dan AI unreviewed selalu ditolak. Full audit hanya dikembalikan bila hak baca privat masih berlaku; selain itu receipt metadata saja. Respons privat `no-store`. Write perlu opt-in `ENABLE_CHAIN_WRITES=true`; rekonsiliasi tidak perlu signing key. Lihat [runbook P2](../development/blockchain-recovery.md).

`GET /api/audits/:id/verify` dapat melaporkan validitas hash lokal walaupun receipt tidak ada atau chain belum terkonfigurasi. Jangan menyamakan `localDigestValid` dengan `integrityVerified` untuk receipt.

## Respons kegagalan yang perlu ditangani UI

| Status | Makna umum |
|---|---|
| `400` | Input/filter/scope tidak valid |
| `401` / `403` | Token tidak sah/tidak cukup atau kebijakan direktori menolak |
| `404` | Source/audit tidak tersedia atau private record tidak boleh dibaca |
| `409` | Parent/revisi berubah atau state operasi tidak sesuai |
| `413` | Body melampaui batas |
| `422` | Input semantis/bukti/digest tidak memenuhi syarat jalur |
| `429` | Rate limit; ikuti `Retry-After` bila disediakan |
| `502` / `503` | Provider/transport, data, storage atau konfigurasi tidak tersedia |

Tidak semua route mengeluarkan seluruh status di tabel. Pesan error bukan schema domain yang stabil untuk menentukan kebenaran klaim; UI harus mempertahankan draft dan menampilkan kegagalan save secara jelas.


## Connected investigations dan frozen decisions

Pemeriksaan terkait: `GET /api/case-work/:id/evidence-overlap` memakai context
dan `expectedRevision`, signed `private_read` serta current claim authority.
Public preview menolak akses; hasil `no-store`, maksimal 500 current work items
pada snapshot yang sama, tanpa private notes atau raw URL. Ini kandidat reuse
untuk review, bukan temuan duplicate mitigation. [Workflow dan batas](../development/evidence-overlap-and-snapshot-intake.md).

[Workflow, konfigurasi dan rollback](../development/connected-investigations.md). Semua endpoint berikut privat, `no-store`, signed `private_read` dan current directory authority. Public preview menolak akses. Query context wajib: `sourceId`, `synthetic`, `datasetSnapshotId`, `archiveSha256` untuk data real. Tidak menerima path/URL material dossier dari caller.

| Method / route setelah `/api/case-work/:id` | Fungsi dan tambahan permission |
|---|---|
| `GET /dossier` | Dossier riwayat dan material exact; header CORS-exposed `X-Investigation-Digest` |
| `POST /change-check` | Body `{ expectedRevision }`; perbandingan arsip historis yang dipin; tidak mengubah verdict |
| `GET /decisions` | Ringkasan keputusan beku dan configured chain target; tanpa dokumen penuh |
| `POST /decisions` | Freeze; tambahan `review`. Body strict: `expectedRevision`, `expectedDossierDigest`, `expectedDecisionDigest` (null untuk pertama), `disposition`, `rationale`, `sourceInspected: true` |
| `POST /decisions/:digest/verify` | Keputusan beku dan wrapper receipt/revisit; chain receipt harus diperiksa sebelum status verified |
| `POST /decisions/:digest/anchor` | Tambahan `review`+`anchor`, signer backend opt-in. Body strict `{ chainId, registryAddress, issuer }` untuk menyetujui target yang diperiksa |
| `POST /decisions/:digest/reconcile` | Tambahan `review`+`anchor`; inspeksi intent durabel tanpa broadcast baru |

`disposition` adalah `accept_assessment`, `request_more_evidence`, atau `reject_assessment`; bukan verdict fisik. Scope dan assessment tersimpan wajib sebelum freeze. Model yang belum direview ditolak. Receipt berada di luar hashed payload. Plan yang pernah dilampirkan memerlukan authority `source_detected` sepanjang akses riwayat/materialnya. Authority diperiksa lagi setelah pekerjaan async dan sebelum respons/commit.

Body freeze maksimal 4 KiB, target 1 KiB. Ekspor maksimal 16 MiB; dua pembuatan dossier/keputusan serentak dan quota bersama 20 operasi/menit/actor+client. Konflik revisi/head/dossier `409`, akses `401/403`, input `400`, kapasitas `413`, pembatasan `429`, layanan/storage belum tersedia `503`. Anchor dengan outcome tidak pasti `502` harus direkonsiliasi; pending `202`; revert definitif `422`. Terminal reconcile idempotent. Tidak melepas nonce pending hanya karena receipt belum ditemukan.

Field casework baru bersifat opsional: `planLink`, `changeReportDigest`, `acceptanceCriteria`, `requestEvents`. Event request/response/review tidak dapat dihapus atau diganti pada revisi berikutnya. Body casework tetap 16 KiB. Audit store memakai envelope 3 sesudah keputusan pertama; reader tetap menerima array legacy serta envelope 1/2.
