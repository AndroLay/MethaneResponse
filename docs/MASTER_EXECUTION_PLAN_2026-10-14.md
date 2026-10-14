# MethaneResponse — Rencana Eksekusi Induk

- **Versi rencana:** 1.4
- **Tanggal pemeriksaan:** 14 Oktober 2026 (WITA)
- **Tujuan:** memberi jalur kerja yang dapat diperiksa dari kondisi repo sekarang sampai submission hackathon, lalu sampai target internal kesiapan berbukti.
- **Status:** rencana disetujui; pelaksanaan bertahap berjalan. Rencana ini bukan klaim bahwa seluruh pekerjaan di bawah sudah selesai. Bukti progres terbaru ada di [`docs/EXECUTION_CHECKPOINT_2026-10-14.md`](EXECUTION_CHECKPOINT_2026-10-14.md).
- **Sumber status teknis:** repository dan catatan uji lokal yang ditautkan di dokumen ini. Status yang berubah cepat harus diperiksa kembali pada release candidate.

## 1. Keputusan utama

MethaneResponse sudah memiliki MVP lokal yang luas. Pekerjaan berikutnya tidak dimulai dengan menambah banyak fitur. Urutannya adalah menjaga perubahan aktif tetap aman, membuktikan ulang satu alur lengkap pada source saat ini, menutup ketidakakuratan klaim, lalu menambahkan bukti eksternal yang saat ini belum ada.

Ada dua sasaran yang berbeda:

1. **Submission sebelum jendela resmi 25 Oktober 2026:** demo yang dapat diulang dan jujur tentang data historis, hasil audit, keterbatasan AI/prediksi, penyimpanan, dan status blockchain.
2. **Target internal “minimal 18/20” pada setiap kriteria:** kumpulan bukti teknis dan evaluasi pengguna yang lebih kuat. Skala 20 poin dan ambang 18 bukan rubrik resmi Devpost; juri hanya mempublikasikan lima kriteria kualitatif. Rencana ini dapat menaikkan kesiapan bukti, tetapi tidak menjamin skor.

Kata **selesai** dalam dokumen ini berarti seluruh kriteria penerimaan yang relevan memiliki artefak bukti dan batasannya dipublikasikan. Kata itu tidak berarti perangkat lunak bebas bug, model memprediksi kebocoran fisik dengan pasti, atau MethaneResponse telah menyebabkan pengurangan emisi.

## 2. Snapshot kondisi repo saat rencana disusun

| Area | Yang telah tersedia menurut source/catatan repo | Yang belum dibuktikan |
|---|---|---|
| Dataset | Snapshot UNEP MARS aktif `unep-mars-ccd8267c55ee`, archive SHA-256 `ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2`: **4.213 source, 30.357 plume** (23.810 linked, 6.547 tanpa source ID, 1.050 tanpa flux terkuantifikasi), observasi 29 Okt 2020–12 Sep 2026. Manifest gzip/decoded hash, jumlah, ID plume unik, status real, dan rentang tanggal cocok dengan riwayat snapshot. Rilis 11–12 Oktober tetap disimpan sebagai versi historis. | Feed bukan live dan tidak mengukur cakupan satelit secara kontinu. Update baru harus menjadi snapshot baru; audit terdahulu tetap terikat ke hash yang dicatat saat audit dibuat. |
| Cases dan peta | Tabel/paginasi, pemilih source, navigasi ke Map Explorer, observasi historis, geometri plume penerbit, layer flux historis, context imagery dan fallback tersedia di source. | Esri/OpenFreeMap bergantung jaringan/ketentuan eksternal; context imagery bukan citra overpass. Browser headless memakai SwiftShader, bukan bukti performa GPU ponsel. |
| Intelligence | Pipeline offline membuat tren deskriptif, anomaly screen dan model recurrence. Model v5 secara spesifik memperkirakan apakah ada **record MARS tertaut berikutnya dalam 365 hari**, bukan kebocoran, flux masa depan, atau mitigasi. | Evaluasi terakhir retrospektif; test window pernah terlihat saat pengembangan. Belum ada validasi prospektif pada rilis setelah cutoff. Tidak boleh dipasarkan sebagai probabilitas kebocoran. |
| Baseline dan AI | Rules baseline, parser excerpt lokal, AI opsional di server, pencocokan kutipan exact, abstention, hash dokumen, review manusia, revisi audit v3, serta evaluator benchmark sudah ada. Baseline berisi 15 contoh (9 casebook nyata, 6 DEMO); subset real macro-F1 tercatat 0,6667. | Tidak ada benchmark AI independen. Tiga referensi casebook yang disaring: 0 sudah cleared untuk provider input. Belum ada panggilan provider live atau hasil akurasi model. |
| Audit dan database | File store persisten lokal; migrasi PostgreSQL/PostGIS dan tes integrasi pernah lulus pada PostGIS sementara; audit append-only/revisi dan hash tersedia. | Tidak ada database cloud yang dikonfigurasi. File store pada host ephemeral bukan storage produksi. Shared reviewer token bukan identitas atau ownership per pengguna. |
| Blockchain | EvidenceRegistry, compatibility receipt v2/v3, review-before-anchor, intent/recovery path dan verifier transaksi telah diimplementasikan; tes Foundry lokal tercatat lulus. | Tidak ada deployment Sepolia, alamat registry, transaksi, atau event live yang diverifikasi. Tidak boleh ada transaksi sebelum otorisasi eksplisit. |
| Rilis dan otomasi | Workflow GitHub Actions yang sekarang menjalankan typecheck, API/web/verifier, build, bundle budget, Python/baseline, dan Foundry. Job API memakai service PostGIS dan `CI=true`. `scripts/check-local.sh` memberi gate lokal agregat. | Tes API dengan PostGIS exact-CI sudah lulus lokal; run GitHub Actions untuk revision working tree ini belum diverifikasi. Tidak ada deployment live. |
| Presentasi | Ada dokumentasi alur, matriks bukti, README yang mencatat status publik dan batas akses, serta tangkapan browser lokal pada `/tmp`. Anonymous `git ls-remote` dan shallow clone sebelumnya berhasil pada commit publik `99662e6de86b1d745e6ce3589ce37a9ed6c0d66c`. | Perubahan lokal setelah commit itu belum tampak pada revision publik yang diverifikasi. Tidak ada video final 3–5 menit atau bukti submission; eligibility dan konflik jam resmi belum diselesaikan. |

**Perhatian perubahan aktif:** saat audit awal, `git status` menunjukkan **148 path berubah/tidak terlacak** di bawah `main` pada commit `99662e6`; diff tercatat sekitar 87.995 baris tambahan dan snapshot intelligence sekitar 16,4 MB. Ini bukan alasan untuk membuang perubahan. Sebelum pekerjaan implementasi dimulai, catat manifest status dan hash artefak besar; jangan melakukan reset, clean, squash, atau regenerasi snapshot tanpa membandingkan hasil deterministik dan menjaga perubahan pemilik.

### Status pelaksanaan terkini — 14 Oktober 2026

Bagian 2 di atas sengaja menyimpan **baseline saat rencana pertama ditulis**. Itu bukan inventaris dataset atau status repo terkini. Setelah pekerjaan lanjutan pada 14 Oktober, gunakan checkpoint eksekusi sebagai sumber bukti terperinci dan ringkasan berikut sebagai indeks status:

| Paket | Status terkini | Batas atau langkah tersisa |
|---|---|---|
| WP-0 — Baseline | **RELEASE PUBLISHED; LOCAL/REMOTE GATES PASS** | Manifest baseline memiliki 304 entry hash. Candidate 338 path dipertahankan; 330 path diterbitkan dalam source release `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d`, delapan PNG mockup tetap lokal. Anonymous no-credential `git ls-remote` memverifikasi commit publik, local tree bersih, dan GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) sukses. Sembilan aset UI tanpa hak redistribusi dihapus dari current tree; commit lama tidak di-rewrite. Rincian di [`execution checkpoint`](EXECUTION_CHECKPOINT_2026-10-14.md). |
| WP-1 — Aturan dan submission | **OPEN; LATEST PUBLIC SOURCE VERIFIED** | Public `main` kini berada di dokumentasi follow-up `59ac59e`; no-credential `git ls-remote` memverifikasi HEAD dan branch sama. Source release `37169eeb35de5ad4e3217f08ae2ab8d9ccffa48d` memiliki CI sukses. Konflik waktu/eligibility Devpost, video final dan bukti submission masih terbuka. |
| WP-2 — Data | **PASS LOCAL; UPSTREAM OBJECT AND CONTENT MATCHED (14 OCT)** | Snapshot UNEP `unep-mars-675417694883`: 4.218 source, 30.414 plume, cutoff 2026-09-13 UTC. Pada 14 Oktober 13:22 UTC, HEAD CSV/GeoJSON resmi mengembalikan 200 serta ETag, `Content-MD5`, ukuran, dan `Last-Modified` yang sama dengan arsip. Arsip lokal lengkap telah diperoleh melalui range request yang dipatok ke ETag; ukuran, MD5 terhadap header aktif, SHA-256 manifest, ZIP CRC, dan anggota CSV wajib lulus. Satu percobaan GET berurutan yang timeout tidak membatalkan arsip lengkap tersebut. Tidak ada rilis upstream lebih baru pada pemeriksaan ini; data tetap historical, bukan feed live. |
| WP-3 — UI/map/workflow | **PASS LOCAL, DEVICE PENDING** | Cases diuji dengan 25/50/100 baris, filter, empty state, detail dan perpindahan source ke peta; Operators dan Settings dihubungkan serta diuji di Chromium. Evidence Auditor mencari 4.218 source dengan maksimal 20 hasil dan tetap aksesibel lewat keyboard. UAT pada snapshot aktif membuktikan `KAZ_S_159` → full case → observasi/uncertainty → geometri overpass → auditor. UAT tambahan mengklik marker Libya hingga `LBY_S_098`, membuka full case dan meneruskan source ke Auditor, lalu mengganti case ke `LBY_S_143` melalui pencarian. Screenshot 01–07 dan batas uji: [`live local UAT`](evidence/live-local-uat-2026-10-14/README.md). Error MapLibre/tile ditangani dengan notice/fallback; tile eksternal/GPU ponsel nyata belum terverifikasi. |
| WP-4 — Intelligence | **PASS RETROSPECTIVE, PROSPECTIVE PENDING** | Analisis memprediksi record MARS tertaut berikutnya, bukan methane leak. Ledger 365 hari sudah dibekukan; belum ada label/outcome untuk mengukur performa prospektif. |
| WP-5 — AI benchmark | **BLOCKED ON RIGHTS/ANNOTATORS/PROVIDER** | Rules baseline tersedia; benchmark AI independen belum dijalankan. Jangan menampilkan AI live sebagai tervalidasi sebelum dokumen, hak pemrosesan, anotator, provider dan evaluasi tersedia. |
| WP-6 — Review/persistensi | **PASS LOCAL, CLOUD PENDING** | Revision, private review, restart lokal dan digest diuji; layanan PostgreSQL cloud serta identitas per pengguna belum tersedia. |
| WP-7 — Blockchain | **PASS LOCAL, SEPOLIA NOT CONFIGURED** | Kontrak/verifier dan receipt lokal diuji. Belum ada alamat/receipt Sepolia; tidak ada anchor live tanpa otorisasi. |
| WP-8 — Deployment | **NOT LIVE** | Target cloud, kredensial dan backup/restore belum diverifikasi. File store lokal tidak boleh disebut cloud persistence. |
| WP-9 — Pilot | **NOT RUN** | Belum ada peserta sasaran; walkthrough pengembang tidak menggantikan pilot. |
| WP-10 — Verifikasi | **PASS LOCAL AND GITHUB ACTIONS FOR SOURCE RELEASE** | `TMPDIR=/dev/shm bun run check:all:postgis` exit 0 dengan PostGIS disposable: API 112 pass/0 fail/0 skip/649 assertions, web 174, verifier 20/96 assertions, Python 122, Foundry 4, typecheck, build dan bundle guard. GitHub Actions run [38569058427](https://github.com/AndroLay/MethaneResponse/actions/runs/38569058427) untuk commit source release berakhir `success`. Runner lokal loopback/tempfiles; local dev disk membutuhkan `TMPDIR=/dev/shm` karena kuota `/tmp`. Cloud database, provider AI dan deployment tetap belum diverifikasi. |
| WP-11 — Demo | **LOCAL ANIMATIC TECHNICALLY VALID; NOT SUBMISSION READY** | Alur lokal dan verifier direhearsal; animatic screenshot 94 detik lulus pemeriksaan decode/codec/dimensi, tetapi bukan rekaman layar berkesinambungan dan belum memenuhi durasi 3–5 menit. Narasi, review artistik penuh, pemeriksaan hak citra konteks, video final, upload, dan submission masih belum selesai; lihat checkpoint 21.57 WITA. |
| WP-12 — Pasca-hackathon | **FUTURE WORK** | Kesiapan operasional, evaluasi prospektif 365 hari dan atribusi dampak memerlukan layanan, pengguna, serta waktu pengamatan. |

Gate lokal terbaru pada 14 Oktober: `bun run check:all:postgis` dengan PostGIS API **112 tes / 649 assertions / 0 skip**, web **174 / 164.716 assertions**, verifier/workflow **20 / 96 assertions**, Python **122**, Foundry **4**, typecheck, production build, bundle budget dan baseline reproducibility lulus. Runner memulai image PostGIS yang sama dengan CI pada port loopback acak, memakai tmpfs, dan membersihkan container berdasarkan label acak khusus proses; gate manual mewajibkan `TEST_DATABASE_URL`, menjalankan tes API dengan `CI=true`, menolak URL kosong serta URL yang cocok dengan `DATABASE_URL`. Rules baseline hasil regenerasi identik byte dengan artefak tracked (SHA-256 `395414c365ce4e322596048dce622836e49132a917d3cdd1fea0440454f726a8`). Build memberi warning nonfatal untuk chunk MapPanel **1.122.112 byte raw / sekitar 306,76 kB gzip**, sementara bundle guard terkonfigurasi lulus. Ini bukti pada working tree lokal, bukan pada revision GitHub, layanan live, perangkat fisik, atau penggunaan oleh pihak luar.

Rujukan status rinci yang sudah ada: [`next-steps.md`](next-steps.md), [`workflow-verification-2026-10-13.md`](workflow-verification-2026-10-13.md), [`data-and-claims.md`](data-and-claims.md), [`AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`](AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md), dan [`research/event.md`](research/event.md).

## 3. Tujuan produk dan kriteria penerimaan ujung ke ujung

Alur yang harus dapat dicoba reviewer secara berurutan:

1. Membuka peta dengan label **historical**, snapshot ID, tanggal observasi terbaru, satuan, dan provenance yang konsisten.
2. Memilih source dan membaca record plume tertaut serta record tanpa source ID secara terpisah; record tanpa relasi tidak dipaksakan ke fasilitas.
3. Membaca tren/priority dengan label metode yang tepat. Heuristik disebut prioritas investigasi; recurrence disebut peluang **record arsip** sesuai horizon dan cutoff yang tertera.
4. Membuka evidence excerpt hanya setelah hak pemrosesan dan persetujuan dinyatakan; source URL, tanggal, halaman/section, hash file asal, dan status hak terlihat.
5. Menjalankan AI hanya bila provider dan izin telah disiapkan server-side. Setiap kutipan harus persis cocok ke excerpt yang dikirim; kutipan gagal, dokumen tidak cukup, provider gagal, atau sumber tak terverifikasi menghasilkan abstention/error yang terlihat.
6. Meminta review manusia melalui scope yang benar. Approval wajib menunjukkan inspeksi sumber asli dan tidak sama dengan konfirmasi fisik mitigasi.
7. Membuat revisi baru, menyimpan provenance/model/snapshot/citation hash, mengekspor laporan dan memverifikasi digest lokal.
8. Jika dan hanya jika chain diaktifkan dengan otorisasi, anchor revisi yang telah direview dan cocokkan receipt/event/issuer/version/hash lewat verifier independen.

Untuk **setiap** langkah, ekspektasi error/empty/fallback adalah: jangan mengubah unknown menjadi nol; jangan menampilkan partial snapshot seolah lengkap; jangan menghapus revisi lama; jangan mengirim dokumen otomatis; jangan membocorkan audit privat; jangan mengulang transaksi yang hasil broadcast-nya tidak pasti; dan jangan memakai warna peta sebagai bukti konsentrasi atau mitigasi.

## 4. Sasaran terukur per kriteria

Angka di bawah adalah **gate internal** untuk menghasilkan bukti yang layak dinilai, bukan janji nilai juri.

| Kriteria | Hasil yang harus dicapai | Bukti minimum dan batas interpretasi |
|---|---|---|
| **Climate Impact** | Menunjukkan masalah nyata dan cara alat membantu menelusuri observasi serta klaim tindak lanjut. | Kasus MARS nyata; asal, tanggal, flux/uncertainty bila tersedia; minimal 5 pengguna sasaran dalam pilot formatif; setidaknya 4/5 menyelesaikan tugas inti tanpa bantuan fasilitator. Laporkan waktu, kesalahan, bantuan dan komentar. Ini membuktikan kegunaan awal/transparansi, bukan pengurangan emisi. |
| **Innovation & Creativity** | Menunjukkan pembeda yang dapat diuji: klaim → kutipan → abstention/kontradiksi → review → revisi → verifier. | Benchmark independen yang haknya jelas, target 40–80 klaim dari 10–20 dokumen dan sedikitnya 10 source; dua anotator independen plus adjudikasi; source- dan document-disjoint. Gate awal: macro-F1 ≥0,80, exact-citation precision ≥0,90, nol false-supported pada set terbatas, dan hasil AI dibanding rules baseline pada klaim yang sama. Gagal gate berarti model tidak diiklankan unggul. |
| **Technical Execution** | Satu implementasi yang dapat direproduksi dari clone publik sampai laporan tersimpan dan dapat diverifikasi. | Semua CI/local gate lulus pada revision yang dibekukan; workflow browser lulus; PostgreSQL dapat direstart tanpa kehilangan audit; bila blockchain ditampilkan, receipt Sepolia dan event cocok secara independen. Layanan/provider live tetap diberi label terpisah dari mock/local. |
| **Practical Usefulness** | Pengguna sasaran dapat menyelesaikan workflow tanpa operator teknis. | Pilot dengan tugas yang ditentukan sebelum sesi; minimal 4/5 sukses mandiri, tingkat error/bantuan dicatat, waktu median dibanding alur manual dilaporkan tanpa menghapus kasus gagal. Sampel lima orang hanya formative. |
| **Presentation & Communication** | Demo menjelaskan masalah, alur, manfaat yang berpotensi, dan batas klaim dengan jelas. | Video 3–5 menit dari release candidate yang sama dengan kode/video; mencakup satu kasus nyata, satu klaim, satu keputusan, hash/verifier, serta disclosure historical/mock/provider/chain. Link repo/video dapat dibuka tanpa login khusus. |

**Bukti yang tidak cukup untuk menaikkan klaim:** jumlah tes saja, UI yang terlihat, skor retrospective pada data yang telah dilihat, jawaban AI fasih, feedback MARS, tidak adanya deteksi berikutnya, atau receipt blockchain. Tidak ada satu pun yang sendiri membuktikan mitigasi fisik ataupun impact emisi.

## 5. Paket kerja rinci

### WP-0 — Lindungi baseline dan bekukan ruang lingkup

- **Target:** semua perubahan aktif tetap terpelihara dan ada revision demonstrasi yang jelas.
- **Tindakan:** catat HEAD, status, daftar file, hash dataset/snapshot besar, dependensi, dan hasil uji terakhir; pisahkan perubahan source, data hasil generate, dokumentasi, dan bukti sementara. Tandai area P0 (source selection, provenance, audit/review, report/verifier) versus P1 (globe kosmetik, fitur tambahan).
- **Lokasi:** `git status`, `git diff --stat`, `data/processed/intelligence-snapshot.json`, `docs/next-steps.md`, `docs/workflow-verification-2026-10-13.md`.
- **Hasil yang diharapkan:** baseline yang dapat dipulihkan tanpa membuang perubahan pemilik; satu daftar blocker dengan owner dan due date.
- **Lulus bila:** setiap perubahan tetap utuh; baseline test yang dikutip memiliki tanggal dan scope; ada changelog untuk setiap perubahan setelah freeze.
- **Owner/estimasi:** engineer 3–5 jam; proyek owner menyetujui scope demo.
- **Jika gagal:** hentikan refactor/optimasi besar; lakukan hanya perbaikan yang menghalangi alur inti dan simpan diff terpisah.

### WP-1 — Pastikan aturan event dan jalur submission

- **Target:** deadline, waktu buka, eligibility, deliverable dan akses juri jelas sebelum pengiriman.
- **Pemeriksaan ulang 14 Okt 2026:** [overview Devpost](https://ieee-climatechain-hack.devpost.com/) dan [schedule](https://ieee-climatechain-hack.devpost.com/details/dates) menampilkan deadline 25 Okt pukul 17.00 MSK; schedule membuka periode submission pada 5 Okt pukul 07.00 MSK. [Rules](https://ieee-climatechain-hack.devpost.com/rules) masih memuat larangan submit sebelum “official start time” 08.00 PT pada 25 Okt, sehingga jendela authoritative tetap ambigu. Overview membatasi peserta menjadi “students only”, sedangkan bagian Eligibility di Rules juga mencantumkan akademisi, developer independen/startup, dan profesional lingkungan. [Thread klarifikasi](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window) memuat pertanyaan peserta tentang konflik ini, tetapi tidak menampilkan jawaban penyelenggara pada saat pemeriksaan. `git ls-remote` dari lingkungan ini masih berstatus `UNVERIFIED_NETWORK_OR_AUTH`; local `origin/main` bukan bukti revision publik saat ini.
- **Tindakan:** proyek owner meminta konfirmasi tertulis tentang window UTC, eligibility peserta Indonesia, public repo, dan video. Engineer memeriksa anonymous clone/read; koreksi `README.md` agar tidak lagi mengatakan private setelah akses publik benar-benar diverifikasi. Buat bukti berupa URL, waktu pengecekan, tangkapan layar/hasil clone tanpa credential.
- **Hasil yang diharapkan:** satu jawaban resmi atau bukti form peserta yang menyelesaikan konflik; daftar submission wajib dan akses repo.
- **Lulus bila:** tidak ada dua waktu yang saling bertentangan pada catatan release dan semua link dapat diakses publik.
- **Owner/estimasi:** proyek owner 0,5–1 jam + waktu tunggu; engineer 1–2 jam.
- **Fallback:** siapkan semua bahan sebelum 24 Okt; jangan menebak waktu jika sumber resmi tetap bertentangan. Jangan mengubah visibility repo dari workspace ini.

### WP-2 — Kunci integritas data dan riwayat snapshot

- **Target:** peta, case, API, intelligence, audit dan export merujuk pada snapshot yang sama dan tetap dapat menampilkan snapshot lama.
- **Files to inspect/update:** `services/data-pipeline/ingest_mars.py`, `build_web_snapshot.py`, `build_intelligence.py`, `build_plume_geometries.py`, `data/real/`, `apps/web/public/data/mars-*manifest.json`, `apps/web/src/mars-snapshot-integrity.ts`, `mars-snapshot-loader.ts`, `apps/api/src/intelligence-data.ts`, `packages/shared/src/index.ts`.
- **Tindakan:** validasi uniqueness source/plume ID; join hanya melalui `sourceId` eksplisit; timestamp UTC; koordinat batas WGS84; flux dan uncertainty tidak negatif serta satuan eksplisit; bedakan null, nol, geometri null, unlinked dan DEMO; cocokkan counts dan hash di manifest, index, API, web, report. Verifikasi pipeline ulang ke direktori sementara dan bandingkan byte/hash sebelum mengganti artefak aktif. Jika ada release UNEP baru yang resmi/berizin, tambahkan snapshot versi baru; jangan menulis ulang binding audit historis.
- **Hasil yang diharapkan:** manifest release yang menyimpan publisher, license, retrieval date, source archive hash, snapshot ID/hash, rentang tanggal, counts, catatan perubahan antar-release, dan langkah reproduce.
- **Lulus bila:** expected source/plume counts cocok dengan snapshot yang dipilih; seluruh join dan hash lulus; record lama tetap dapat diverifikasi; dashboard tidak menyebut feed live; statistik dapat dibangun ulang deterministik.
- **Owner/estimasi:** engineer 8–12 jam; provider data/izin adalah dependency eksternal jika release baru dipakai.
- **Fallback:** gunakan snapshot aktif `unep-mars-675417694883` yang berakhir 13 Sep 2026 UTC dan nyatakan cutoff-nya. Jika arsip itu tidak tersedia, gunakan hanya snapshot historis lain yang hash dan provenance-nya lolos verifikasi; jangan mengisi data yang tidak tersedia dengan hasil sintetis.

### WP-3 — Stabilkan Map Explorer, Cases, Operators dan Settings

- **Target:** ribuan sumber tetap dapat dijelajahi tanpa membingungkan metadata, observasi, geometri, dan bukti.
- **Files:** `apps/web/src/MapPanel.tsx`, `CasesWorkspace.tsx`, `CaseDetailsDialog.tsx`, `EvidenceObservationPanel.tsx`, `PublisherFootprintCard.tsx`, `OperatorsWorkspace.tsx`, `SettingsWorkspace.tsx`, `case-table.ts`, `workspace-preferences.ts`, `earth-rendering.ts`, `map-marker-style.ts`.
- **Tindakan dan hasil:**
  1. Uji search/filter/paginasi 25/50/100, page reset saat filter berubah, baris kosong/error, pemilihan source dari page lain, dan tombol View/koordinat. Hasil harus membuka dialog yang benar atau Map Explorer di source ID/koordinat yang sama.
  2. Verifikasi marker berkode flux sebagai flux tertinggi snapshot (kg/h), bukan konsentrasi; unlinked plume tidak berubah menjadi source; geometri `VERIFIED` hanya untuk record publisher yang hash-bound.
  3. Uji layer satelit/grayscale/street/dark, globe/flat, pengaturan Eco/Balanced/Quality/Auto, persistensi preferensi lokal, dan keadaan WebGL/tile unavailable. Kontrol Settings harus terlihat efeknya; Operators hanya menampilkan metadata MARS, bukan komunikasi operator.
  4. Pertahankan progressive load: route awal mengambil katalog; source detail memuat bucket yang diperlukan; full-history overlay menunggu semua shard terverifikasi; kegagalan shard menampilkan 0 data parsial dan retry.
  5. Ukur 5 cold runs per viewport (desktop dan 390×844) pada perangkat/browser yang disebutkan; catat transfer, waktu siap kanvas, long task, error dan fallback. Pengukuran lama 1,99–2,08 detik hanya satu run software WebGL dan bukan baseline performa hardware.
- **Lulus bila:** browser desktop/mobile tanpa overflow/error pemblokir; ID dan koordinat konsisten sepanjang navigasi; tidak ada metadata yang ditampilkan sebagai bukti perbaikan; hasil load lengkap atau fail-closed; hasil ukur dibanding baseline pada mesin yang sama.
- **Owner/estimasi:** engineer 8–14 jam termasuk regresi UI; perangkat fisik jika ada disediakan owner.
- **Fallback:** jika tiles/globe gagal, history, table, koordinat, dan jalur audit tetap dapat dipakai; matikan efek berat Auto/Eco.

### WP-4 — Presentasikan intelligence/prediksi secara ilmiah

- **Target:** pengguna memahami tepat apa yang dianalisis dan tidak menganggap prioritas sebagai prediksi pasti.
- **Files:** `services/data-pipeline/build_intelligence.py`, `record_recurrence.py`, `train_redetection.py`, `evaluate_baseline.py`, `apps/api/src/intelligence-data.ts`, `apps/api/src/app.ts`, `apps/web/src/IntelligencePanel.tsx`, `record-recurrence-view.ts`, `docs/data-and-claims.md`.
- **Tindakan:** tampilkan dataset ID, as-of cutoff, target horizon, baseline, evaluasi dan warning pada setiap view/export/API. Pertahankan `not_available` bila coverage/validation gate gagal. Pastikan anomaly screen berstatus kandidat statistik, bukan confirmed leak. Tambahkan uji regression yang memastikan istilah “future leak/emission probability” tidak digunakan untuk model archive-record recurrence. Bekukan model/hash sebelum prospective window baru; simpan prediction ledger sebelum label masa depan dibuka.
- **Hasil yang diharapkan:** lembar model-card ringkas (target, fitur, waktu asal, window evaluasi, pembanding, CI, cakupan, bias, abstention dan batasan); API/UI/export konsisten.
- **Lulus bila:** model tidak mengeluarkan probability untuk target fisik; semua prediction terikat ke snapshot dan versi model; status retro vs prospective terlihat jelas; indikator MARS yang bukan label outcome tidak dilatih seolah ground truth.
- **Owner/estimasi:** 4–8 jam untuk pembatasan klaim dan regression lokal; pipeline prospective 12–20 jam setelah snapshot baru tersedia.
- **Dependency/jadwal:** pengujian prospektif 365 hari tidak mungkin selesai sebelum hackathon hanya dengan memperbaiki UI; perlu model dibekukan dan outcome window baru lengkap serta dirilis.

### WP-5 — Tutup evidence benchmark AI dengan hak dan anotasi benar

- **Target:** bukti AI berasal dari dokumen yang boleh diproses dan gold labels independen, dibandingkan secara adil dengan baseline aturan.
- **Files:** `docs/AI_BENCHMARK_ANNOTATION_PROTOCOL_2026-10-14.md`, `docs/research/mars-casebook-document-rights-inventory-2026-10-14.md`, `services/data-pipeline/evaluate_evidence_ai.py`, `scripts/run-ai-benchmark.ts`, `apps/api/src/ai-review.ts`, `apps/api/src/app.ts`.
- **Tindakan:** temukan 10–20 dokumen dengan izin eksplisit untuk excerpt, provider processing, evaluasi dan publikasi metrik; simpan hanya metadata/hash bila naskah lengkap tidak boleh masuk repo. Dua annotator memberi label dan exact citation secara independen; adjudicator menyelesaikan perbedaan tanpa melihat prediksi. Bekukan split source/document-disjoint sebelum inference. Jalankan rules dan AI pada claim/input sama; gunakan provider hanya setelah hak, token backend, budget, dan data minimization disetujui.
- **Hasil yang diharapkan:** dataset versi privat/berizin, manifest rights, anotasi dan adjudication audit, baseline/AI output, seed, model/prompt, source/document counts, per-label precision/recall/F1, exact-citation precision, abstention, false-supported mitigation, interval source-cluster dan paired delta AI−rules.
- **Lulus bila:** sekurangnya 40 held-out claim dari ≥10 source, target ideal 80 dari 10–20 dokumen; seluruh tiga label terwakili; tidak ada document/source overlap lintas split; macro-F1 ≥0,80 dan citation precision ≥0,90 sebagai gate internal; zero false-supported pada set terbatas; manfaat atas rules dijelaskan dengan CI. Zero false-positive pada sampel kecil tetap bukan jaminan keamanan dunia nyata.
- **Owner/estimasi:** engineer 25–40 jam; reviewer manusia kira-kira 20–40 jam gabungan; izin dan jadwal penilai dapat memperpanjang tanggal tanpa batas pasti.
- **Fallback:** jika satu prasyarat gagal, AI provider tetap mati untuk klaim produk; demo gunakan rules baseline, contoh abstention, dan kutipan MARS yang sah. Jangan mengisi benchmark dengan synthetic rows atau menurunkan ambang.

### WP-6 — Bukti workflow audit, reviewer dan persistensi

- **Target:** assessment draft, review, revisi, export, akses privat/publik dan restart tidak merusak riwayat atau mengungkap kutipan privat.
- **Files:** `apps/api/src/{audit.ts,ai-review.ts,reviewer-auth.ts,store.ts,postgres-store.ts,app.ts,audit-pagination.ts,audit-visibility.ts}`, `platform/database/migrations/0001_init.sql`–`0005_audit_history_pagination.sql`, `apps/web/src/{App.tsx,AuditHistoryPanel.tsx,ImportedAuditVerifier.tsx}`.
- **Tindakan:** uji scenario matrix untuk dokumen valid/tampered/no citation/contradictory; status approved/rejected/needs-more-evidence; consent publik/privat; token scope salah/expired; concurrent review/revision; store restart; DB reconnect; export tampered; pagination revisions. Audit harus selalu append-only; klaim tanpa kutipan valid abstain; `needs_more_evidence` tidak mengubah hasil jadi supported.
- **Hasil yang diharapkan:** matriks transisi dan log API/browser, bukti store reopen/restart, digest, status permission/cache-control dan revision chain.
- **Lulus bila:** draft privat tidak terlihat tanpa token; publikasi butuh consent yang diperlukan; setiap perubahan adalah revision baru dengan parent hash; recovery tidak menggandakan audit; report dari restart tetap dapat diverifikasi.
- **Owner/estimasi:** engineer 8–12 jam untuk rerun workflow dan menutup temuan; integrasi remote masuk WP-8.
- **Fallback:** bila identity provider/database remote belum siap, batasi demo pada file store lokal yang memang persisten pada mesin demo; jangan menyebut shared-token workflow sebagai per-user access atau file-store sebagai cloud durability.

### WP-7 — Blockchain independen dan kompatibilitas historis

- **Target:** bukti versi/hash dapat diverifikasi pada chain tanpa menyatakan kebenaran fisik.
- **Files:** `contracts/src/EvidenceRegistry.sol`, `contracts/test/EvidenceRegistry.t.sol`, `apps/api/src/chain.ts`, `apps/api/src/app.ts`, `scripts/verify-audit.ts`, `apps/web/src/ImportedAuditVerifier.tsx`.
- **Tindakan:** pertahankan receipt v2; uji v3 canonical serialization/hash; auth scope `anchor`; review wajib sebelum anchor AI; intent durable sebelum send; transaksi timeout tidak auto-retry; reconcile hanya setelah event cocok dengan registry, chainId, issuer, version, block, tx hash dan bundle digest. Verifikator harus bekerja tanpa mempercayai state UI/API.
- **Hasil yang diharapkan:** laporan cocokkan local hash, on-chain event, explorer/RPC, issuer dan revision; dokumentasi menyatakan blockchain membuktikan integritas/urutan catatan saja.
- **Lulus bila:** Foundry/regression lulus; receipt lama tetap verify; satu transaksi Sepolia nyata diverifikasi dari sumber kedua bila chain ditampilkan sebagai live.
- **Owner/estimasi:** engineer 5–8 jam; testnet deployment, funded signer dan transaksi hanya oleh owner yang mengotorisasi. Tidak ada deployment/transaksi dalam rencana tanpa izin baru.
- **Fallback:** tunjukkan digest lokal dan label `Not anchored`; jangan menampilkan receipt sintetis seolah publik.

### WP-8 — Deployment dan pengamanan operasional MVP

- **Target:** satu origin yang dapat dijangkau juri dengan storage tahan restart dan endpoint yang tidak terbuka tanpa kontrol.
- **Files:** `render.yaml`, `.env.example`, `docs/deployment.md`, `apps/api/src/store.ts`, `apps/api/src/postgres-store.ts`, `apps/api/src/rate-limit.ts`, `apps/api/src/app.ts`, `platform/database/migrations/0006_shared_api_rate_limits.sql`, `.github/workflows/ci.yml`.
- **Tindakan:** owner memilih provider/account/region/plan; konfirmasi biaya dan retention sebelum resource dibuat. Konfigurasikan `DATABASE_URL`, `RATE_LIMIT_HASH_SECRET` yang sama pada semua replika, origin CORS yang tepat, reviewer/provider secrets hanya di backend; jalankan migrasi additive, seed snapshot, health check lalu audit/review/restart/verify dari URL publik. Tambahkan gateway rate limit dan verifikasi client-IP tepercaya bila API publik; counter PostgreSQL bersama tidak menggantikan perlindungan ingress. Uji backup/restore sebelum menyebut durability.
- **Hasil yang diharapkan:** runbook deploy/rollback, service URLs, health response yang menyebut `postgres` + persistent, hasil restart read, migrasi, auth denial, CORS dan backup/restore.
- **Lulus bila:** API/browser journey tetap berjalan setelah restart, database remote mempertahankan revisions, secret tidak masuk bundle/log, akses privat ditolak, limit tersedia di ingress.
- **Owner/estimasi:** engineer 10–16 jam + proyek owner 2–4 jam/akses provider; biaya/kuota harus diverifikasi pada akun aktual.
- **Fallback:** tetap local demo; jangan menyebut persistence cloud atau production available. Free-tier tidak disamakan dengan SLA/industrial readiness.

### WP-9 — Pilot kegunaan dan manfaat yang bisa diklaim

- **Target:** menguji apakah workflow membantu pengguna target memeriksa satu klaim lebih terstruktur daripada alur manual.
- **Protokol:** minimal 5 peneliti/auditor/analis lingkungan; consent singkat; data peserta anonim; kasus dan instruksi yang sama; tugas: menemukan source, membaca riwayat, menilai klaim, menyebut bukti yang kurang, menghasilkan/verifikasi report. Catat waktu, sukses/gagal, kesalahan source/citation, bantuan, dan umpan balik. Bandingkan dengan metode manual tanpa menyembunyikan urutan belajar atau efek fasilitator.
- **Hasil yang diharapkan:** protokol sebelum sesi, catatan agregat, jumlah peserta, median/rentang waktu, task success, errors, assistance, kutipan feedback anonim dan keterbatasan sampel.
- **Lulus bila:** minimal 4/5 peserta menyelesaikan tugas inti secara mandiri; tak ada kesalahan kritis yang menyebabkan bukti administratif ditampilkan sebagai mitigasi; temuan usability diprioritaskan dan diperbaiki atau dicatat.
- **Owner/estimasi:** engineer/fasilitator 8–12 jam; penjadwalan realistis 1–3 minggu. Penggunaan aplikasi bukan bukti pengurangan metana.
- **Fallback:** bila partisipan belum ada, laporkan “pilot belum dilakukan”; internal developer walkthrough tidak menggantikannya.

### WP-10 — Verifikasi penuh, CI dan release candidate

- **Target:** gate yang pernah lulus diulang pada revision yang benar-benar akan didemokan.
- **Tindakan:** tambah `bun run check:web-bundle` ke GitHub Actions; sediakan PostGIS service disposable pada CI agar `TEST_DATABASE_URL` tidak kosong; tampilkan skipped DB tests sebagai status gagal gate, bukan pass. Pertimbangkan browser smoke terotomasi hanya memakai tooling repo yang sudah tersedia. Jalankan benchmark rules deterministik dan periksa generated output tidak mengubah snapshot/history tanpa niat.
- **Commands:** `bun install --frozen-lockfile`; `bun run check`; `bun run test:api`; `bun run test:web`; `bun run test:verifier`; `bun run build:web`; `bun run check:web-bundle`; `bun run test:data`; `cd services/data-pipeline && uv run python evaluate_baseline.py --output /tmp/mr-baseline.json`; `bun run test:contracts`; kemudian `bash scripts/check-local.sh` dengan `TEST_DATABASE_URL` PostGIS terpisah bila gate DB penuh diminta.
- **Hasil yang diharapkan:** ringkasan per command, commit/revision/hash, jumlah lulus/gagal/skipped, versi runtime, screenshot browser desktop/mobile, console/network summary dan test service cleanup.
- **Lulus bila:** tidak ada kegagalan tersembunyi/skipped yang diklaim lulus; working tree setelah check hanya berubah pada artefak output yang memang dimaksudkan dan hash-nya dibandingkan; release candidate bisa diulang dari clone publik.
- **Owner/estimasi:** engineer 6–10 jam termasuk perbaikan P0/P1; satu siklus gagal dan fix dapat menambah 4–8 jam.
- **Fallback:** jika runner CI tidak menyediakan PostGIS/browser, tandai gate itu `NOT RUN` di CI dan simpan bukti terpisah dari run disposable lokal; jangan menyamakan hasil lokal dengan status CI.

**Status implementasi lokal pada saat rencana ini disusun, sebelum promosi rilis arsip 14 Oktober:** gate penuh baru pada working tree aktif selesai dengan PostGIS disposable dan tanpa tes DB dilewati: typecheck lulus; API **111 tes / 648 assertions / 0 skip**; web **169 / 164.451**; verifier **9 / 53**; Python **119**; Foundry **4 / 0 skip**; production build, bundle budget, dan baseline reproduksi lulus. Output baseline hasil gate identik dengan laporan tracked (SHA-256 `44fad3fedcbc80bb9b9874540ee5ac5476383556fe11228a108bd74e4866bb96`). Analisis snapshot kini menyandingkan estimasi retrospektif record MARS linked berikutnya dalam 365 hari dengan metadata persistensi penerbit: 3.057/4.213 sumber numerik, Spearman 0,726, top-decile overlap 149/306, dan `emissionStatus` kosong 4.213/4.213. Ini statistik deskriptif pada snapshot yang sama, bukan validasi model independen atau prediksi emisi. Smoke Chromium memeriksa Evidence Auditor desktop/mobile, tabel kategori, tanpa overflow dan nol page error; sembilan warning WebGL/ReadPixels serta fallback sebagian tile tetap dicatat. Katalog UNEP MARS saat dibuka ulang masih menautkan data CSV/GeoJSON tetapi tidak mencantumkan tanggal/hash rilis; reader menolak arsip ZIP `application/octet-stream`, sehingga snapshot berakhir 2026-09-12 UTC tetap dipakai sebagai versi historis terverifikasi tanpa klaim bahwa ini paling baru. Rincian ada di [`evidence/local-quality-gate-2026-10-14.md`](evidence/local-quality-gate-2026-10-14.md) dan checkpoint eksekusi. Status jalur berikutnya: AI independen menunggu dokumen berizin/anotator/provider; cloud Postgres menunggu target/akses/biaya owner; Sepolia menunggu otorisasi owner; pilot menunggu peserta; GitHub Actions dan clone release pada revision aktif belum dibuktikan; video dan submission belum tersedia. Hasil lokal ini tidak mengubah public HEAD `99662e6` dan tidak membuktikan layanan live atau dampak emisi.

**Pembaruan eksekusi terbaru setelah promosi arsip:** gate lokal `bun run check:all:postgis` lulus dengan snapshot `unep-mars-675417694883`: API/PostGIS **112 tes / 649 assertions / 0 skip**, web **174 / 164.716 assertions**, verifier/workflow **20 / 96 assertions**, Python **122**, Foundry **4**; typecheck, build dan bundle guard juga lulus. Browser UAT 14 Oktober sekarang membuktikan source real `KAZ_S_159` → full-case popup → observasi/uncertainty → geometry publisher bertanggal → abstention rules untuk klaim mitigasi → audit tersimpan dan digest valid setelah restart API lokal. Artefak: [`live local UAT`](evidence/live-local-uat-2026-10-14/README.md). Ini menggantikan ringkasan gate dan dataset yang lebih lama di paragraf riwayat di atas; layanan eksternal, AI provider/benchmark independen, cloud Postgres, Sepolia, GitHub Actions untuk revision aktif, pilot, perangkat fisik, video dan submission tetap belum diverifikasi.

**Tambahan WP-3, 20:10 WITA:** Chromium juga membuktikan klik cluster → klik source marker `LBY_S_098` → full-case dialog → Evidence Auditor → pencarian dan pemilihan `LBY_S_143`. Dua screenshot dengan hash dan batas UAT ada di berkas bukti yang sama. Sesi ini memakai renderer WebGL software dan menghasilkan 38 warning; ini bukan pengukuran performa perangkat GPU/ponsel.

### WP-11 — Paket submission dan demo

- **Target:** satu cerita singkat dan semua klaim pada video cocok dengan build/source revision.
- **Rangka demo 3–5 menit:** (0:00–0:35) masalah + bukan pengganti MARS; (0:35–1:25) pilih source dan snapshot historical; (1:25–2:10) histori, flux/uncertainty/geometri serta priority yang benar labelnya; (2:10–3:10) evidence claim, exact citation/insufficient evidence dan human review; (3:10–4:00) versi report, hash dan verifier; (4:00–4:40) nilai untuk pengguna, keterbatasan, status AI/DB/chain. Sesuaikan agar durasi akhir tetap 3–5 menit.
- **Artefak:** video dapat dibuka publik; deskripsi masalah/solusi/target user/track/scalability/adoption; GitHub public URL; credits/license; instructions; screenshot; manifest revision yang direkam; risk/limitations statement.
- **Lulus bila:** fresh browser/clone dapat mengulang demo tanpa data developer rahasia; video tidak menyebut live AI/cloud/Sepolia/pilot jika tidak live; setiap angka terlihat punya snapshot, unit dan cutoff.
- **Owner/estimasi:** engineer 8–12 jam; proyek owner mengunggah video dan menekan Submit dari akunnya setelah window confirmed.
- **Fallback:** jika window belum diklarifikasi, paket tetap siap di lokal dan status submission tetap `NOT SUBMITTED`; jangan menulis timestamp perkiraan sebagai bukti berhasil.

### WP-12 — Kesiapan riset/industri setelah hackathon

- **Target:** memisahkan produk hackathon dari sistem yang dapat dipakai operasional.
- **Pekerjaan:** per-user identity dan ownership; policy akses, retensi dan penghapusan evidence; secret rotation; gateway rate limiting; logging/metrics tanpa data sensitif; backup/restore dan incident runbook; accessibility; load/budget tests; provider terms; data license review; vulnerability/dependency review; device testing; prospective recurrence study; pilot lebih besar; longitudinal climate-impact design.
- **Lulus bila:** security owner mengesahkan controls; restore drill berjalan; workload dan availability targets ditetapkan dari kebutuhan nyata; prospective model diuji pada rilis setelah freeze; impact claim punya data outcome dan desain atribusi.
- **Estimasi:** di luar estimasi hackathon; minimal 3–6 minggu pekerjaan rekayasa tambahan setelah layanan/prasyarat ada. Prospective recurrence horizon memerlukan sekurangnya 365 hari setelah model/cutoff dibekukan plus jeda publikasi MARS; evaluasi impact emisi memerlukan observasi tindak lanjut yang independen.

## 6. Urutan dependency dan gerbang Go/No-Go

```text
WP-0 baseline freeze ─┬─ WP-1 event/public access ────────────────┐
                      ├─ WP-2 data/snapshot ─┬─ WP-3 UI workflow ──┤
                      │                      └─ WP-4 intelligence ──┤
                      ├─ rights + annotators ───── WP-5 AI benchmark│
                      ├─ owner credentials ─ WP-8 deployment ───────┤
                      ├─ owner chain approval ─ WP-7 Sepolia ───────┤
                      └─ pilot participants ─ WP-9 pilot ──────────┤
                                                   WP-10 RC ─ WP-11 submission
```

| Gate/tanggal WITA | Keputusan | GO bila | NO-GO / fallback |
|---|---|---|---|
| **14–15 Okt — G0** | Scope dan hak akses | Baseline file/status tercatat; organizer clarification diminta; source demo dipilih. | Freeze fitur; semua blocker diberi owner; jangan mengubah repo atau layanan eksternal. |
| **16 Okt — G1** | Bukti ilmiah/dokumen | Snapshot/history konsisten; ada dokumen dengan izin pemrosesan dan reviewer bila AI hendak ditampilkan. | Data lama saja; rules baseline dan abstention; AI live tidak diklaim. |
| **19 Okt — G2** | Jalur produk lokal | Map→case→history→assessment→review→report→verifier berjalan pada source saat ini; error P0/P1 tertutup. | Demo dipersempit ke jalur yang dapat diulang; jangan menutupi step gagal dengan video/editorial. |
| **20 Okt — G3** | Layanan luar | Owner mengonfigurasi target Postgres/provider dan memberikan akses secara aman; belum ada biaya/deploy tanpa persetujuan. | Lokal file store; status cloud/provider unverified. |
| **22 Okt — G4** | Freeze fitur dan klaim | Tidak ada P0/P1 terbuka; data/AI/prediction labels benar; hasil pilot/test yang ada tercatat. | Hentikan fitur baru; lanjutkan perbaikan release-blocker dan dokumentasi limit. |
| **24 Okt — G5** | Release candidate | Fresh-session dry run dan tautan repo/video siap; build sama dengan revision demo; klaim dan attribution cocok. | Jangan submit dengan link rusak atau jendela waktu yang masih bertentangan; owner ambil keputusan via sumber resmi. |
| **25 Okt — G6** | Submit | Jendela/waktu resmi dikonfirmasi dari Devpost/organizer dan akun owner menunjukkan status Submitted. | Simpan bukti konflik dan jangan menyatakan submit berhasil bila belum ada confirmation. |

## 7. Estimasi dan jalur kritis

### Kapasitas sampai hackathon

Asumsi kerja untuk perencanaan adalah **satu engineer × 5 jam fokus/hari**, 14–24 Oktober: 55 jam kotor, 20% (11 jam) buffer untuk gangguan/revisi, sekitar **44 jam terencana**. Ini asumsi, bukan komitmen jam pemilik atau guarantee. Tidak memasukkan waiting time organizer, izin, akun layanan, reviewers, peserta, atau jaringan.

| Paket submission | Jam maksimum | Catatan |
|---|---:|---|
| WP-0/1: baseline, scope, rules, akses publik | 4 | Sebagian tindakan milik proyek owner. |
| WP-2: pilih kasus dan cek provenance/data | 4 | Tidak membangun release baru tanpa sumber resmi dan izin. |
| WP-3/6/10: workflow regression, browser check, P0/P1 fixes | 14 | Dahulukan end-to-end, fail-closed dan restart; jangan refactor kosmetik. |
| WP-8: live Postgres/provider jika akses sudah tersedia | 0–6 | Jika tidak siap, alihkan waktu ke local hardening; jangan buat akun/billing otomatis. |
| WP-9: pilot bila peserta nyata tersedia | 0–5 | Tanpa peserta, siapkan protokol; jangan klaim hasil. |
| WP-11: video, description, credits, clean dry run | 8 | Perubahan sesudah video memicu review ulang. |
| Buffer | 3 | Tidak digunakan untuk fitur tambahan. |
| **Total batas** | **44** | AI benchmark penuh dan Sepolia tidak diasumsikan selesai dalam kapasitas ini. |

### Target internal berbukti setelah submission

WP-0 sampai WP-11 diperkirakan membutuhkan **94–151 jam rekayasa**, kira-kira 19–31 hari kerja fokus pada asumsi 5 jam/hari, ditambah sekitar 20–40 jam anotasi manusia dan penjadwalan pihak luar. Dengan mulai 26 Oktober, prasyarat segera tersedia, dan pekerjaan eksternal berjalan paralel, jalur realistis sekitar **4–8 minggu kalender (sekitar 23 November–21 Desember 2026)**. Hak dokumen, akun layanan, reviewer atau peserta yang terlambat akan mendorong tanggal melewati rentang itu. Ini estimasi kasar dengan risiko tinggi di WP-5, WP-8 dan WP-9, bukan tanggal janji.

Prediksi prospective 365 hari dan bukti pengurangan emisi bukan bagian yang bisa “dikejar” dengan lebih banyak coding sebelum event: keduanya memerlukan waktu/data tindak lanjut setelah freeze, metode outcome yang sah, dan publikasi snapshot kemudian.

### Urutan kritis

1. Menjaga perubahan repo → memastikan event/public access → memilih kasus dan klaim yang aman.
2. Memastikan snapshot dan workflow lokal → menutup P0/P1 → feature freeze.
3. Menyiapkan video dan release candidate sebelum jendela submission.
4. Setelah itu: rights + anotator → benchmark AI; credentials → PostGIS/provider; approval → Sepolia; peserta → pilot. Jalur ini paralel setelah akses tersedia, tetapi tidak boleh digantikan dengan mock tanpa label.

## 8. Matriks verifikasi dan bukti yang harus diarsipkan

| ID | Gate | Artefak bukti | Kriteria lulus |
|---|---|---|---|
| V1 | Data | Snapshot ID, archive SHA, manifest counts/rentang tanggal, output generator repeatability, hash verification log. | Hash dan counts cocok di pipeline, browser, API dan report; unlinked/null/unknown tetap terbedakan. |
| V2 | Workflow | Browser recording/screenshots dari source → history → evidence → review → revisions → export → verifier; HAR/error summary tanpa credential. | Jalur dapat diulang pada revision yang sama; tidak ada page error pemblokir atau klaim hasil palsu. |
| V3 | AI | Rights manifest, gold labels/adjudication, split report, model/prompt, evaluator JSON, confidence intervals. | Sampel memenuhi minimum, split benar, thresholds terlihat, false-supported dianalisis; bila gagal mode AI tidak diiklankan valid. |
| V4 | Persistence/auth | Migrasi, store backend/health (tanpa connection string), create/review/restart/read, permission matrix dan backup/restore record. | Data bertahan setelah proses restart; akses privat tertutup; tidak ada rahasia di frontend/log. |
| V5 | Chain | Local bundle digest, tx receipt, event, chainId, registry, issuer, version, external verifier output. | Semua field cocok untuk report revision; tanpa transaksi, label tetap local/not anchored. |
| V6 | Prediction | Frozen model card, input snapshot, target definition, cutoff, retrospective report; kemudian prospective report. | Target record archive disebut eksplisit; tidak ada interpretasi methane-zero atau physical leak. |
| V7 | UX/perf | Browser version, OS/device/GPU, 5 cold runs, transfer bytes, canvas-ready timings, long tasks, mobile overflow and fallback screenshots. | Klaim performa berasal dari pengukuran berulang pada perangkat tertera; bukan janji FPS global. |
| V8 | Pilot | Protocol, consent, anonymous task sheets, aggregated outcomes and limitations. | Minimal 5 peserta; ≥4 sukses mandiri sebagai gate formatif internal; kesalahan serius ditindaklanjuti. |
| V9 | Submission | Public clone check, video URL/durasi, description, attribution, event window evidence, submission confirmation. | Link dapat dibuka; video cocok dengan RC; submission timestamp di window resmi. |

## 9. Risiko, pemicu dan respons

| Risiko | Dampak | Pemicu | Tindakan |
|---|---|---|---|
| Waktu/eligibility Devpost bertentangan | Submission tidak eligible/terlambat | Overview, Rules, schedule/form tidak konsisten | Minta jawaban tertulis; simpan capture/form. Jangan menebak timezone. |
| Worktree 148 file berubah | Kehilangan fitur, data atau pekerjaan baru | Perubahan source sebelum baseline dibuat | Manifest/hash dulu; diff per kelompok; hindari cleanup dan generated rewrite. |
| Dataset terakhir 12 Sep 2026 | UI dapat disalahartikan sebagai feed live | Label Live atau statistik tanpa cutoff | Tetapkan label historical/date pada setiap route; update hanya dengan release resmi baru. |
| Rights dokumen belum clear | Pelanggaran lisensi/privasi dan benchmark tidak sah | Provider menerima report/excerpt | Jangan download/process/send; cari sumber izin eksplisit atau fallback baseline. |
| Sampel benchmark kecil | Kinerja AI tampak lebih pasti daripada kenyataan | Macro-F1 tinggi pada sedikit source | CI cluster, split source/document, false-positive review; nyatakan exploratory. |
| Model recurrence disangka methane forecast | Keputusan investigasi salah | UI menyebut kebocoran/flux akan datang | Label archive-record target; tambah linter/test/copy gate; prospective study terpisah. |
| Storage host ephemeral | Audit hilang setelah restart | Deploy tanpa Postgres | Production startup harus fail closed tanpa DB; uji restart/backup sebelum demo publik. |
| Shared reviewer token / ingress identity / rate-limit configuration | Akses lintas pengguna dan abuse | Public API di belakang beberapa replica atau proxy | Jangan expose draft tanpa kontrol; siapkan per-user identity untuk operasional, shared Postgres limiter memakai HMAC secret yang sama, dan gateway limit/client-IP trust yang diverifikasi. |
| Sepolia write ambigu | Duplicate atau receipt salah | RPC timeout setelah broadcast | Durable intent + reconcile; jangan auto retry; operator verifikasi exact event. |
| Tile/GPU bergantung perangkat | Map hilang/lambat atau tampak berbeda | Tile outage/SwiftShader/mobile low-end | Retry/fallback; data history tetap usable; laporkan environment dan tidak menjanjikan FPS. |
| README dan status GitHub tidak konsisten | Juri mendapat instruksi salah | README berkata private; owner melapor public | Verifikasi anonim, lalu update README dan tes clean clone. |
| Perubahan pasca-video | Video tidak lagi cocok dengan source | Fix dilakukan setelah rekaman final | Rebuild dan review ulang video atau batasi fix pada release blocker dan rekam ulang bagian terdampak. |

## 10. Progress reporting dan aturan perubahan

Setiap akhir hari, perbarui satu baris: **WP/target · keluaran nyata · path/URL bukti · PASS/FAIL/BLOCKED · jam dipakai · blocker/owner · tindakan berikutnya**. Jangan menggabungkan status menjadi persen. Gunakan tag `LOCAL`, `LIVE`, `MOCK`, `EXTERNAL`, `UNVERIFIED`.

Satu paket hanya `PASS` bila artefaknya ada dan acceptance criteria terpenuhi. `BLOCKED` berarti ada prasyarat luar yang spesifik dan owner-nya disebut; pekerjaan independen tetap berjalan. `NOT RUN` tidak boleh ditulis sebagai PASS. Perbaikan regression selalu merujuk tes yang menangkapnya. Perubahan format data, kontrak, public claims, provider, permissions atau chain memerlukan impact review terhadap audit lama.

## 11. Hal yang belum dilakukan saat rencana ini ditulis

- Tidak ada source code atau dataset yang diubah oleh rencana ini.
- Tidak ada test/build/browser run yang dijalankan pada giliran penyusunan rencana ini; hasil yang disebut berasal dari catatan bertanggal di repo dan harus diulang pada release candidate.
- Tidak ada organizer yang dihubungi; tidak ada rekening/provider baru, biaya, deployment, perubahan GitHub, file upload ke AI, atau transaksi blockchain dilakukan.
- Tidak ada angka skor juri 18/20 yang dapat dijanjikan. Hanya judges dapat memberi nilai resmi.

## 12. Referensi

- [Devpost overview](https://ieee-climatechain-hack.devpost.com/) — deadline yang terlihat, track dan submission overview.
- [Devpost Rules](https://ieee-climatechain-hack.devpost.com/rules) — eligibility, instruksi submission dan lima kriteria; pada pemeriksaan 14 Okt ada perbedaan dengan overview.
- [Devpost schedule](https://ieee-climatechain-hack.devpost.com/details/dates) — dibuka pada pemeriksaan 14 Okt; menampilkan submission 5–25 Okt, yang tetap bertentangan dengan larangan waktu pada Rules.
- [UNEP MARS data dictionary](https://methanedata.unep.org/dict-mars-emission-sources-plumes), [MARS methodology](https://methanedata.unep.org/approach-methodology), dan [MARS frequently asked questions](https://www.unep.org/index.php/topics/energy/methane/international-methane-emissions-observatory/mars-frequently-asked-questions) — definisi record, metode dan batas interpretasi.
- [`research/methane-response-evidence-and-evaluation-2026-10-13.md`](research/methane-response-evidence-and-evaluation-2026-10-13.md) — penelitian yang memandu target, baseline, citasi dan batas klaim.
