# Status implementasi aktif

[Pusat dokumentasi](../README.md) · [Arsitektur](../architecture/overview.md) · [Indeks bukti](../evidence/README.md)

**Diperbarui: 18 Oktober 2026.** Acuan kode: local `main` pada `a82e2eee99bb79327f859f304f2f5d5939f07041`, ditambah perubahan working tree investigasi, trust/transparansi, demo/riset, perapian dokumentasi P1 shared casework, P2 durable anchor, P3 publication lifecycle dan remediasi riset P4. Perubahan working tree tersebut tidak dinyatakan sudah commit/push. Remote tidak di-refresh untuk perapian dokumentasi.

**Scope:** proof of concept lokal berfokus MARS, memakai snapshot versi tetap dan file audit JSON satu proses. Database, shared hosting persistence, serta operasi mitigasi lapangan tidak termasuk scope aktif. [ADR 15 Oktober](../architecture/decisions/2026-10-15-local-prototype-no-database.md) menggantikan asumsi database pada rencana lama; [ADR P1](../architecture/decisions/2026-10-17-shared-casework-single-writer.md) menambahkan kolaborasi tim kecil lokal tanpa database/deployment baru.

## Penguatan manfaat — 18 Oktober

Preset periode observasi/hari event memakai hari UTC dan perlu Apply; baseline tertahan jika scope masih draft. Draft scope pulih per konteks tab (terbatas ketersediaan SessionStorage). Reports kini memuat verifier file tanpa CLI dengan konteks ekspor wajib secara default, opsi legacy eksplisit, dan batas autentisitas yang terlihat. [Paket bukti](../evidence/product-value-2026-10-18/README.md) memuat perbandingan fungsional 16 sel; [tiga studi kasus](../research/three-historical-decision-cases-2026-10-18.md) menghasilkan keputusan metadata dan permintaan berikutnya. Ini tidak menggantikan hasil P5 lama atau pilot manusia. Target internal 18/20 bukan nilai yang otomatis dicapai oleh tes.

## Kemampuan saat ini

| Bagian | Implementasi lokal | Batas bukti/operasi |
|---|---|---|
| Historical explorer | Map, Cases, provenance, progressive source/history loading, geometri bulanan dan fallback | Snapshot historis; imagery geografis bukan pengukuran methane/plume pixel |
| Publisher indicators | Sembilan Top 50 bulanan, delapan periode respons negara, exact ID map handoff, history dan pagination | Tidak mengarang rank dari urutan CSV; feedback rate bukan repair rate |
| Investigation analysis | Ringkasan historis, anomaly screen, explainable priority heuristic, retrospective 365-day record recurrence dan ledger prospektif | Bukan ramalan emisi fisik; final retrospective window pernah dilihat selama development; belum ada outcome prospektif independen |
| Rules baseline | Tiga claim, abstention, scoped dates/event/recipient/action-follow-up dan citations | Pemeriksaan cakupan metadata, bukan autentikasi dokumen atau keputusan otoritas methane |
| Human assessment | Scope wajib, exact claim, referensi, determination, rationale, next request, immutable private schema 4 dan parent hash | Reviewer harus terkonfigurasi; keputusan tercatat tidak mengesahkan perbaikan fisik |
| Evidence/reviewer trust | Opt-in bounded HTTPS publisher retrieval/digest, directory attestation kategori/expiry/revocation, separate conflict declaration | Tidak ada reviewer nyata yang didaftarkan; attestation operator dan self-report bukan verifikasi identitas/independensi eksternal |
| Investigation continuity | Banyak work ID, local notes atau shared queue, owner/assignee/due date, CAS/history, draft tab, navigation guards dan explicit request handoff | Mode lokal tetap non-transactional antartab; mode bersama satu writer terotorisasi; bukan realtime atau multi-instance |
| History/reports | Immutable revisions, comparison, JSON/export verifier dan Markdown brief | Full schema 4/JSON privat; Markdown bukan artefak verifier atau publikasi Notion otomatis |
| Public transparency | Consent per revisi, correction/supersession/withdrawal atomik, current/history pagination, direct URL dan live status check | Summary historis tetap tersedia; private fields tidak dibuka; checksum offline tidak mengesahkan status kini atau issuer |
| Document AI | Provider interface, exact quote checks, source-level assessment dan review manusia terpisah | Provider tidak live-configured di workspace; mock tests bukan benchmark kualitas AI |
| Blockchain | Intent durabel, write opt-in, exact-intent recovery, UI target/pending/reconcile dan verifier CLI | Anvil lokal 31337 teruji dengan SIGKILL/revert dan verifier terpisah; receipt Sepolia publik belum tersedia |
| Storage/runtime | Audit dan casework privat terpisah, kernel writer lock, fsync state/marker, offline backup/restore dan lost-state detection | Tidak multi-instance/encrypted; hilangnya seluruh volume+marker tidak terdeteksi; hosted temporary filesystem tidak durable |

## Data aktif

Snapshot `unep-mars-675417694883`: **4.218 source rows, 30.414 plume rows**, observasi 29 Oktober 2020–13 September 2026 UTC; retrieval 14 Oktober. Casebook aktif mempunyai empat sumber. Provenance, lisensi, histori rilis, hash dan perintah rebuild ada di [data/real/README.md](../../data/real/README.md). Pemeriksaan upstream yang dicatat 15 Oktober tidak menjadikan snapshot feed live.

Laporan mitigasi September 2026 tetap link-only publisher metadata. Konten PDF, tabel, gambar, dan counts report berlisensi terpisah tidak disalin. Fixture sintetis tetap berlabel DEMO.

## Pemeriksaan pengembangan terakhir yang dicatat

[Bukti P1 shared casework 17 Oktober](../evidence/shared-casework-2026-10-17/README.md) mencatat hasil aktual berikut pada source manifest increment P1:

- **`bun run check:all` lulus:** TypeScript API/web/E2E, 138 API, 234 web, 34 verifier, production build/bundle, 160 Python, baseline conformance, dan 4 Foundry tests. Install frozen tidak mengubah dependency/lockfile.
- Pemeriksaan terpisah: **2 casework operations** (backup/restore/lock dan actual API crash/restart) serta **1 actual local TLS transport** lulus. Test runner menyaring environment induk; real provider tidak dipanggil.
- **13 main + 5 private/manual/shared/mock-AI = 18 skenario Chromium** lulus dalam satu invocation lengkap, termasuk dua browser context dan draft yang dipertahankan setelah refresh gagal. Tiga helper regression runner juga lulus; focused repeats tidak ditambahkan ke jumlah skenario.
- Desktop dan viewport mobile shared work captures diperiksa; tidak ada page error atau horizontal overflow pada skenario P1. Ini bukan uji telepon fisik atau GPU performance benchmark.
- Bundle gate: App **74.537 gzip bytes**, budget 75.000; delapan required route chunks lulus. MapPanel tetap lazy dengan advisory raw-size 1.122.953 bytes.
- Review statis independen menemukan lost-state reset, stale queue saat refresh dan respons history yang terlambat. Ketiganya diperbaiki dengan regresi red/green dan diperiksa melalui suite akhir. Batas volume remote tetap dicatat.

Run menggunakan Bun 1.4.3 (pin repo tetap 1.4.2), Python proyek 3.12.13, Chromium 153 dengan sandbox aktif, Linux `flock`, serta data/credential DEMO disposable. Full local gate ini tidak memverifikasi hosted persistence, testnet atau model nyata. [Bukti trust/transparansi sebelumnya](../evidence/trust-transparency-2026-10-17/README.md) tetap menyimpan hitungan dan source hash saat run asal; tidak ditimpa oleh hasil P1.

## Pemeriksaan P2 sesudah P1

[Bukti P2 17 Oktober](../evidence/blockchain-recovery-2026-10-17/README.md) mencatat intent durabel sebelum broadcast, pemulihan exact tx, issuer serialization, receipt canonical/minimum konfirmasi, UI target/pending dan verifier `--require-chain`. Tes memakai Anvil lokal chain 31337 dan signer acak disposable, termasuk actual process SIGKILL sebelum/sesudah broadcast serta transaksi revert. Verifier proses lain menerima receipt latest/historical dan menolak report/issuer yang diubah. Reviewer implementasi independen menutup temuan otorisasi reviewer saat ini, immutability receipt dan target approval.

Full gate P2: 151 API, 236 web, 35 verifier, 160 Python dan 4 Foundry lulus; operasi casework serta chain integration diuji terpisah. App 74.704 gzip bytes masih di bawah budget 75.000. Browser: 14 main + 5 private/manual/shared/mock-AI = 19 skenario Chromium lulus. Capture P2 desktop/mobile menggunakan respons UI DEMO; transaksi blockchain sebenarnya dibuktikan terpisah pada Anvil. [Runbook](../development/blockchain-recovery.md) mendokumentasikan pending yang belum dapat dibatalkan otomatis, konfirmasi/reorg, issuer khusus dan batas backup.

[Persiapan Sepolia lanjutan](../evidence/sepolia-preparation-2026-10-17/README.md): RPC publik diperiksa, issuer khusus dan konfigurasi disimpan privat, serta baseline historis `source_detected` sudah dipersist pada state operasional terpisah dan lolos hash verifier offline. Registry masih alamat prediksi, belum deployed; signing default mati. Pengguna sudah menyetujui satu klaim faucet, satu deployment dan satu anchor dengan batas biaya. Faucet awal memerlukan CAPTCHA, kemudian pengguna melaporkan syarat 0,001 ETH Mainnet; issuer baru tidak cocok. QuickNode juga ditolak menurut formulir aktual yang dilaporkan pengguna; FAQ sebelumnya tidak membuktikan eligibility. Faucet PoW kemudian dicoba langsung oleh agent dua kali atas permintaan pengguna; kedua start ditolak `[INVALID_CAPTCHA]`. Mining/claim belum berhasil. Pembacaan RPC pada percobaan itu mengonfirmasi saldo 0 SepETH dan pending nonce 0. Status P2 tetap **in progress** sampai funding, deployment, anchor dan verifikasi receipt Sepolia nyata selesai. Persetujuan yang sama tidak perlu diminta ulang. Ini tidak menutup P3–P6.

**Solusi testing tanpa faucet:** sesudah pertanyaan pengguna, [31 tes terfokus dan satu integrasi Anvil dijalankan ulang dan lulus](../evidence/p2-local-testing-2026-10-17/README.md). Kontrak benar-benar dideploy secara lokal, crash/recovery serta verifier terpisah diuji dengan data DEMO. Pengembangan dapat dilanjutkan tanpa funding atau perubahan konfigurasi Sepolia privat. Profil lokal terverifikasi; receipt Sepolia yang menjadi target awal tetap belum tersedia.

## Pemeriksaan P3 sesudah P2

[Bukti P3 18 Oktober](../evidence/publication-lifecycle-2026-10-18/README.md) menutup enam kriteria koreksi/penarikan ringkasan schema 4. Event privat dan publikasi baru disimpan atomik dalam envelope versi 2; full schema 4 tetap privat, bundle/hash lama tidak diubah. Revisi tanpa consent tidak mengubah publikasi. Reviewer berwenang saat mutasi, CAS stale/repeat ditolak, consent ulang dan pemulihan parent manusia setelah baseline tersedia.

- **Full gate exit 0:** 164 API, 240 web, 36 verifier, 160 Python, baseline conformance 15 kasus dan 4 Foundry; typecheck/build/bundle lulus. App **74.957 gzip bytes**, budget 75.000; ruang sisa hanya 43 bytes, delapan required route chunks lulus.
- **23 skenario Chromium** lulus dalam satu invocation lengkap: 14 main + 9 private/manual/shared/mock-AI, termasuk empat skenario P3 baru. Tiga runner helper regressions juga lulus. Screenshot DEMO desktop/mobile diperiksa, dengan credential dibersihkan dan tanpa overflow/page error pada skenario lifecycle utama.
- Operasi terpisah: 1 publication SIGKILL/restart, 2 casework backup/restore/lock/crash, 1 actual Anvil integration serta 1 TLS loopback transport lulus. Regresi P1/P2 tetap berfungsi setelah perubahan envelope.
- Review implementasi read-only menutup temuan parent/authorization/event serta pemulihan UI. Ini bukan review pakar domain P4. [Runbook P3](../development/publication-lifecycle.md) menjelaskan consent, status/offline checksum dan migrasi; binary P2 lama tidak membaca envelope versi 2, sehingga roll-forward dan backup lengkap diperlukan.

Tidak ada deployment/publikasi eksternal, real enrollment, provider AI nyata atau transaksi Sepolia pada increment ini. Hasil P1/P2 lama tetap terikat pada manifest/tanggal asal dan tidak ditimpa.

## P4 — perbaikan riset dan paket v2

Pengguna meminta seluruh masalah intake riset ditangani. [Disposition F01–F13](../research/p4-research-remediation-2026-10-18.md) mencatat perbaikan URL/HTTP 400, pointer dan scope, kalender/hari UTC, normalisasi recipient, serta basis assessment dan physical verification yang terikat hash. UI/riwayat/report/brief kini membedakan metadata coverage dari human/model determination. Bundle lama dan proyeksi ringkasan publik schema 1 tidak diubah.

[Paket P4 v2](../evidence/domain-review-remediation-2026-10-18/README.md) menjadi versi untuk review baru; [v1](../evidence/domain-review-preparation-2026-10-18/README.md) dipertahankan historis. Bukti pemeriksaan aplikasi dan paket ada di halaman evidence v2. Field referensi yang lengkap tetap bukan bukti dokumen asli atau outcome fisik. Pertanyaan bulan konfirmasi ARG tetap belum terverifikasi pada sumber primer; tanggal publikasi tidak dipakai sebagai tanggal aksi.

**Engineering P4 selesai lokal:** full gate 193 API / 247 web / 37 verifier / 160 Python / 4 kontrak, 23 skenario browser aplikasi dan 4 pemeriksaan terfokus lulus; rincian dan batasnya ada di evidence v2.

**P4 in progress:** perbaikan engineering tidak menggantikan review domain; **0 pakar terkonfirmasi, 0 sesi, 0 hasil manusia**. Tidak ada pihak eksternal dihubungi. Kelima checklist hasil manusia tetap belum dicentang. [Protokol P4](../testing/domain-expert-review.md) mengatur kompetensi, consent, temuan material dan recheck.

## P5/P6 — cakupan agent selesai, 18 Oktober

Pengguna meminta P4 dibiarkan menunggu lalu menuntaskan P5/P6 melalui agent. [Paket hasil terbaru](../evidence/p5-p6-agent-completion-2026-10-18/README.md) menyelesaikan [rencana eksekusi agent](../plans/2026-10-18-p5-p6-agent-execution.md):

- **P5:** dua agent, enam sesi berulang, 48 tugas manual/app pada LBY/CAN; 40 correct/8 partly. Waktu aktual, bantuan dan deviasi dicatat. Dari 24 pasangan, 15 memenuhi filter ketepatan/tanpa bantuan substantif; median manual-minus-app −33,914 detik (app lebih lambat pada subset waktu wall agent ini). Tidak ada bukti penghematan waktu manusia; dua agent bukan enam peserta. Confidence tetap null. Temuan CLI konteks diperbaiki setelah sesi; 25 export asli/tamper direplay, 50/50 pemeriksaan sesuai ekspektasi.
- **P6:** challenge metadata berlisensi dengan klaim **DEMO authored**, 96 train/dev/test probes pada 2/2/12 source terpisah; test 72 klaim/tiga kelas. Dua konteks agent tanpa label masing-masing 71/72 benar, macro-F1 0,9861; rules grammar-aware 72/72. Kedua agent salah pada claim yang sama walau kutipan exact match. Tidak ada manfaat tambahan AI yang ditunjukkan; aktivasi tidak diberi kelayakan. 216 binding rules/agent direplay dari input beku; bukan human gold atau benchmark provider aplikasi, mutu alasan/relevansi kutipan belum diberi skor.
- **Verifikasi akhir:** `bun run check:all` exit 0 — 193 API, 247 web, 52 verifier/tooling, 212 Python dan 4 Foundry (**708 tes**); typecheck/build/bundle lulus, App 71.689 gzip bytes. Review agent berbeda memeriksa CLI, binding P6 serta konsistensi raw/scoring/agregat P5. Tidak ada deploy/transaksi/provider live.

Seluruh pelaksanaan, analisis dan penutupan temuan dalam cakupan agent selesai. P5/P6 penelitian manusia/provider asli tetap belum selesai; hasil negatif tidak diubah menjadi klaim manfaat. [Increment awal](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md) dan P4 v1/v2 tetap historis; review pakar manusia menunggu.

## Simulasi tiga integrasi melalui peran agent

[Paket simulasi 18 Oktober](../evidence/integration-role-simulation-2026-10-18/README.md) menggunakan tiga agent pendamping dengan peran analis, reviewer skeptis, provider bermasalah, pengunjung tanpa hak, operator, issuer dan verifier. **13 skenario** provider HTTPS fixture → API production lokal lulus (satu test/116 assertions), termasuk dua pass dengan payload berbeda, consent/rights, kegagalan HTTP/JSON/schema/ukuran, dan stalled body **40.198 ms**. Kesepakatan provider yang sengaja salah tetap menjadi saran privat/unreviewed dan tidak boleh langsung di-anchor; ini bukan bukti model berkualitas atau prompt injection teratasi.

Satu integrasi Anvil tambahan mensimulasikan node menerima transaksi lalu acknowledgment diganti HTTP 502. Intent pending tetap ada, retry ditolak, hash yang sama dipulihkan tanpa nonce tambahan. Dua operasi casework dan satu publication, 34 tes terfokus, typecheck/build/bundle serta empat pemeriksaan HTTP build production lokal lulus. **39 tes pada increment ini**, bukan pengulangan seluruh 708 tes/E2E sebelumnya. Tidak ada perubahan runtime API/web/shared; panduan deployment yang usang diperbaiki. Provider eksternal, deployment publik dan receipt Sepolia tetap belum terverifikasi.

## Urutan pengembangan yang telah diselesaikan

| Tanggal | Increment | Rencana/hasil |
|---|---|---|
| 15 Oktober | Publisher indicators: import deterministik, exact source joins, responsive UI, archive/manifest checks | [Rencana selesai](../superpowers/plans/2026-10-15-mars-publisher-indicators.md) · [bukti](../evidence/mars-publisher-indicators-2026-10-15/README.md) |
| 16 Oktober | Evidence requirements/next checks, revision comparison, Markdown brief dan stale-response boundaries | [Bukti workflow](../evidence/investigation-workflow-2026-10-16/README.md) |
| 17 Oktober | Human assessment tanpa AI, bounded scope dan browser-local analyst work | [Rencana](../plans/2026-10-17-human-investigation-workspace.md) · [bukti](../evidence/human-investigation-workspace-2026-10-17/README.md) |
| 17 Oktober | Draft recovery, manual route, shared coverage, explicit follow-up lineage dan banyak work item | [Rencana](../plans/2026-10-17-workflow-continuity.md) · [bukti](../evidence/workflow-continuity-2026-10-17/README.md) |
| 17 Oktober | P1 kolaborasi tim, CAS/history, explicit import, private file recovery dan writer lock | [Rencana enam paket](../plans/2026-10-17-six-package-completion.md#4-p1--kolaborasi-dan-penyimpanan-bersama) · [bukti P1](../evidence/shared-casework-2026-10-17/README.md) |
| 17 Oktober | P2 intent/recovery, target approval dan verifikasi jaringan lokal | [Bukti P2](../evidence/blockchain-recovery-2026-10-17/README.md) · integrasi Sepolia publik pending |
| 18 Oktober | P3 koreksi/penarikan ringkasan publik, migrasi/event durabel dan private parent recovery | [ADR](../architecture/decisions/2026-10-18-publication-lifecycle.md) · [bukti](../evidence/publication-lifecycle-2026-10-18/README.md) |
| 17 Oktober | Reference checks, reviewer assurance dan redacted public transparency | [Rencana](../plans/2026-10-17-trust-transparency.md) · [bukti](../evidence/trust-transparency-2026-10-17/README.md) |

Angka dan asumsi dalam [checkpoint](../history/README.md), [judge matrix](judge-evidence-matrix.md), [score roadmap](score-readiness-roadmap.md) dan rencana lama terikat pada tanggal asal. Halaman ini menjadi acuan status aktif; estimasi internal bukan skor juri atau jaminan menang.

## Hal di luar implementasi lokal yang belum dibuktikan

| Kebutuhan | Kondisi |
|---|---|
| Benchmark AI independen | [P6 agent selesai](../evidence/p5-p6-agent-completion-2026-10-18/README.md): 72 authored record claims, dua konteks, tidak mengungguli rules. Corpus event/perbaikan berizin, label manusia independen serta provider comparison belum tersedia |
| Manfaat pengguna | [P5 agent selesai](../evidence/p5-p6-agent-completion-2026-10-18/p5-analysis.json): hasil manual/app berpasangan dan waktu wall agent tersedia; pilot pengguna manusia serta penghematan waktu manusia belum dibuktikan |
| Reviewer/dokumen nyata | Kontrol software ada; enrollment, pemeriksaan independen, dan penerapan pada dokumen nyata belum menjadi evidence increment trust |
| Layanan publik | Belum dideploy dari workspace; optional Render preview memakai `/tmp`, bukan durable audit storage |
| Chain demo publik | Profil testing Anvil tanpa faucet sudah diverifikasi ulang; target/operasi Sepolia disimpan bila dilanjutkan, belum ada deployment/receipt publik |
| Perangkat fisik | Desktop GPU evidence tersedia pada revisi bertanggal; mobile viewport emulation tidak menggantikan telepon fisik |
| Paket kompetisi | Ketentuan/eligibility perlu dikonfirmasi, rights/video diperiksa dan submission melalui akun pemilik; paket Notion lokal belum berarti halaman Notion dipublikasikan |
| Dampak iklim | Tidak ada perbaikan atau pengurangan emisi yang terbukti disebabkan penggunaan produk |

**Ledger enam paket:** P1 verified lokal; implementasi P2 diverifikasi lokal, integrasi Sepolia publik pending; P3 verified lokal; P4 menunggu sesuai arahan pengguna; P5/P6 **selesai dalam cakupan agent**, studi manusia/benchmark provider independen masih pending sesuai [rencana](../plans/2026-10-17-six-package-completion.md#11-status-dan-keputusan-selesai). Pemeriksaan agent tidak menyelesaikan review pakar, pilot manusia atau benchmark AI independen.

Tidak adanya plume lanjutan bukan bukti emisi nol. Feedback bukan bukti repair. Hash/receipt membuktikan aspek integritas/kronologi, bukan kebenaran fisik. Panduan operasi trust lengkap ada di [trust dan transparansi](../product/trust-and-transparency.md).
