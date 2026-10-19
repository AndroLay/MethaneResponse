# Urutan penyelesaian enam paket MethaneResponse

[Indeks rencana](README.md) · [Status implementasi](../release/current-implementation-status.md) · [Peta repo](../repository-map.md)

**Disusun:** 17 Oktober 2026, WITA.  
**Status:** P1 verified lokal; P2 implementasi/pemulihan terverifikasi lokal, integrasi Sepolia publik pending; P3 verified lokal; P4 menunggu review sesuai arahan pengguna; **P5–P6 selesai dalam cakupan agent**, penelitian manusia/provider masih pending. [Hasil P5/P6](../evidence/p5-p6-agent-completion-2026-10-18/README.md) tidak menggantikan studi manusia atau gold independen.  
**Target internal:** seluruh pekerjaan dan keputusan hasil selesai paling lambat **20 Oktober 2026, 23.59 WITA**, sebelum 21 Oktober. Bekukan perubahan fitur pada 20 Oktober pukul 16.00 agar ada waktu pemeriksaan akhir.  
**Baseline:** HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` beserta perubahan lokal yang tercatat pada status implementasi. HEAD saja belum mengidentifikasi seluruh kode aktif karena working tree belum bersih.

## Tujuan dan batas pekerjaan

Menyelesaikan enam paket yang sudah disepakati dengan hasil yang dapat diperiksa: alur kerja tim, blockchain yang benar-benar berjalan, tata kelola publikasi, review pakar, manfaat bagi pengguna, serta evaluasi AI. Perbaikan UX, privasi, reliabilitas, tes, dokumentasi dan penyelarasan demo menjadi kriteria penerimaan setiap paket; bukan paket fitur tambahan.

Rencana ini mengatur pekerjaan berikutnya. Penulisan rencana tidak menjalankan deployment, transaksi, provider berbayar, kontak pakar/peserta, publikasi Notion, atau submission. Persiapan lokal dapat dikerjakan dahulu; tindakan eksternal mengikuti otorisasi yang berlaku ketika hasilnya sudah konkret untuk ditinjau.

**Kompatibilitas eksekusi:** pertahankan stack dan perubahan pengguna; satu penulis per file. Review agent boleh memeriksa desain/kode, tetapi tidak menggantikan pakar domain, anotator independen atau peserta pilot. Tidak ada kewajiban membuat branch, commit, worktree atau layanan baru hanya untuk menjalankan rencana ini.

### Spesifikasi yang menjadi acuan

- [Status implementasi aktif](../release/current-implementation-status.md), [alur pengguna](../product/user-workflow.md), dan [alur respons MARS](../product/mars-response-workflow.md).
- [Keputusan tanpa database](../architecture/decisions/2026-10-15-local-prototype-no-database.md), [arsitektur](../architecture/overview.md), dan [API](../architecture/api-reference.md).
- [Protokol pilot](../evidence/target-user-pilot-protocol.md) dan [protokol anotasi/evaluasi AI](../testing/ai-benchmark-annotation.md).
- [Pembanding publik bertanggal 16 Oktober](../research/competitive-landscape-2026-10-16.md), [persyaratan acara](../release/event-requirements.md), dan [paket Notion lokal](../demo/notion/README.md).

## 1. Hubungan pekerjaan dengan penilaian

Pemeriksaan 17 Oktober terhadap [Overview resmi](https://ieee-climatechain-hack.devpost.com/) dan [Rules](https://ieee-climatechain-hack.devpost.com/rules) menemukan lima kriteria kualitatif berikut; bobot angka tidak dicantumkan. Gerbang di dokumen ini adalah keputusan internal, bukan rumus nilai resmi atau jaminan kemenangan.

| Kriteria | Pekerjaan yang mendukung | Bukti yang harus tersedia |
|---|---|---|
| Climate Impact | P4 dan P5 | Masalah/tugas yang disahkan pakar, hasil pemahaman dan pemeriksaan bukti; batas hubungan dengan tindakan lapangan |
| Innovation & Creativity | P3, P5 dan P6 | Perbandingan alur dengan sistem yang sudah ada serta nilai tambahan yang terukur; bukan klaim unik karena memakai AI/blockchain |
| Technical Execution | P1, P2 dan P3 | Kerja lintas sesi, konflik/restart/pemulihan, receipt nyata dan verifier terpisah, koreksi/penarikan tanpa mengubah riwayat |
| Practical Usefulness | P1, P4 dan P5 | Pengguna sasaran menyelesaikan tugas, akses yang sesuai, hasil dibanding cara manual, batas skala dan biaya operasional |
| Presentation & Communication | Penutupan seluruh paket | Satu alur 3–5 menit, angka dan screenshot sesuai versi final, tautan bukti, batas klaim mudah dipahami |

**Hasil utama yang ditawarkan:** investigasi atas sumber historis dapat dilanjutkan bersama, penilaian punya dasar yang dapat ditelusuri, publikasi bisa dikoreksi, dan integritas versi dapat diperiksa. Feedback bukan bukti perbaikan; hilangnya observasi bukan emisi nol; receipt bukan bukti kebenaran fisik. Jangan mengklaim pengurangan emisi yang belum diukur.

Kelayakan dan jendela submission adalah prasyarat administrasi. Overview dan Rules masih memuat teks yang bertentangan tentang kategori peserta serta waktu mulai/penutupan. Catat dan siapkan pertanyaan untuk pemilik; jangan menganggap konflik selesai atau mengirim pesan otomatis. Target internal sebelum 21 Oktober tetap digunakan.

## 2. Urutan dan jadwal

ID P1–P6 mempertahankan enam paket. Nomor urutan pelaksanaan berbeda karena ada dependensi dan pekerjaan paralel.

| Urutan | Waktu target WITA | Pekerjaan | Hasil yang diharapkan |
|---|---|---|---|
| Persiapan | 17 Oktober, sejak awal | Tetapkan kasus/tugas dan penanggung jawab; siapkan materi pakar, peserta, hak dokumen, provider dan testnet | Ketersediaan serta izin nyata diketahui lebih awal; tidak menunggu semua kode selesai |
| 1 | 17–18 Oktober | **P1 — Kolaborasi dan penyimpanan bersama** | Dua sesi beridentitas dapat melanjutkan investigasi yang sama; konflik dan restart aman |
| 2 | 18 Oktober | **P3 — Koreksi dan penarikan publikasi** | Ringkasan publik punya status terkini serta riwayat yang tetap dapat diperiksa |
| 3 | 18–19 Oktober | **P2 — Anchor, receipt dan verifikasi** | Intent durabel, pemulihan lokal, lalu bukti testnet nyata setelah otorisasi |
| 4 | Mulai 17; target tutup temuan 20 Oktober sebelum 12.00 | **P4 — Review pakar domain** | Review tertulis atas metode/kasus, daftar temuan, perbaikan dan pemeriksaan ulang |
| 5 | Persiapan 17–18; sesi 19 hingga 20 Oktober pukul 12.00 | **P5 — Evaluasi manfaat dan pembeda** | Pilot 5–8 pengguna serta pembanding manual dengan build dan tugas yang dibekukan |
| 6 | Persiapan/anotasi mulai 17; hasil paling lambat 20 Oktober pukul 12.00 | **P6 — Evaluasi AI nyata terhadap rules** | Corpus berizin, label independen, hasil berpasangan dan keputusan kelayakan model |
| Penutupan | 20 Oktober, 16.00–23.59 | Perbaikan penghambat, pemeriksaan akhir, pembekuan bukti dan penyelarasan docs/demo | Enam status jelas; build, laporan, Notion dan klaim menunjuk hasil yang sama |

**Jalur teknis:** P1 → P3 dan fondasi pemulihan P2 → build stabil untuk P5 → penutupan. P2 dan P3 tidak perlu saling menunggu setelah antarmuka penyimpanan disepakati. Bila dikerjakan paralel, `store.ts`/`app.ts` tetap punya satu penulis dan perubahan digabung berurutan.

**Jalur manusia/data:** izin dan pemilihan kasus → P4 serta anotasi P6; P5 memerlukan peserta dan build stabil. Review metode dan pengumpulan dokumen boleh berjalan sebelum P1 selesai. Bekukan protokol penilaian sebelum melihat hasil peserta/model.

Jadwal empat hari ini agresif dan bergantung pada ketersediaan manusia, hak dokumen, akses serta izin eksternal. Ini target kerja, bukan janji bahwa semua gerbang akan lulus. Bila prasyarat belum tersedia, lanjutkan pekerjaan mandiri dan laporkan paket terkait belum selesai; jangan mengganti hasil nyata dengan simulasi.

## 3. Persiapan awal dan titik keputusan

- [ ] Pilih satu alur utama: sumber historis → scope klaim → penilaian dan permintaan bukti → handoff tim → revisi → ringkasan publik → verifikasi. Pilih juga kasus bukti tidak cukup, konflik revisi dan penarikan publikasi.
- [ ] Bekukan definisi tugas dan batas klaim. Pisahkan kasus ilustrasi/demo, corpus evaluasi AI dan kasus pilot; jangan biarkan hasil gold bocor ke pengembangan model.
- [ ] Siapkan paket review pakar dan undangan pilot lokal; konfirmasi ketersediaan melalui pemilik/kanal yang diotorisasi. Identitas dan consent tetap di penyimpanan privat.
- [ ] Susun daftar dokumen dengan hak per penggunaan: pemeriksaan, kutipan, penyimpanan privat, pemrosesan provider dan publikasi metrik. URL publik tidak otomatis memberikan semua hak tersebut.
- [ ] Periksa kesiapan target API, volume persisten, identitas reviewer, provider, batas biaya, RPC, registry dan issuer tanpa mencetak secret. Backend menyimpan secret; tidak ada secret di `VITE_*`.
- [ ] Pada **17 Oktober**, putuskan kelayakan jadwal P6 dari hak dokumen, ketersediaan dua anotator/adjudikator, corpus dan provider. Bila belum siap, catat risiko keterlambatan dan pekerjaan yang dapat dilanjutkan; jangan menjanjikan benchmark selesai empat hari tanpa prasyarat tersebut. **18 Oktober pukul 12.00** menjadi pemeriksaan ulang seluruh manusia/izin/akses, bukan pemeriksaan pertama. Jangan menurunkan ambang evaluasi agar jadwal tampak tercapai.

## 4. P1 — Kolaborasi dan penyimpanan bersama

**Pemilik:** implementer API untuk persistensi/otorisasi; implementer web untuk sinkronisasi setelah kontrak API disepakati. Reviewer memeriksa konflik, pemulihan dan kebocoran akses.

**Keputusan desain accepted untuk P1 lokal:** satu proyek tim kecil melalui **satu proses API**, file privat pada penyimpanan yang bertahan saat proses restart, serta pemeriksaan versi atomik saat menulis. Server menjadi sumber state bersama; browser menyimpan draft/cache. Tetap memakai Bun/Hono, TypeScript dan file store; tidak menambahkan PostgreSQL, Supabase, SSO atau beberapa instance.

Ini memperluas batas prototipe lokal pada ADR 15 Oktober melalui [ADR P1 accepted](../architecture/decisions/2026-10-17-shared-casework-single-writer.md), yang membedakan scope kolaborasi yang diminta dari infrastruktur hosted baru. Target hosted, volume atau biaya baru membutuhkan keputusan pemilik sebelum digunakan. Tes lokal dua sesi tidak dihitung sebagai bukti layanan remote.

**File yang dituju:** `apps/api/src/store.ts`, modul baru `apps/api/src/case-work.ts` dan tesnya, `apps/api/src/app.ts`, `packages/shared/src/index.ts`; `apps/web/src/case-work.ts`, `CaseWorkPanel.tsx`, `CasesWorkspace.tsx` dan tes terkait. Pisahkan antarmuka casework dari audit bundle immutable. Dokumentasikan API, konfigurasi, backup dan ADR lanjutan.

### Langkah dan kriteria selesai

- [x] Tetapkan kontrak minimal: ID investigasi, scope klaim, versi, aktor, owner/assignee, status, next action, due date dan riwayat perubahan. Aktor berasal dari otorisasi server, bukan identitas bebas dari request.
- [x] Gunakan reviewer directory dan otoritas claim type yang sudah ada; tulis matriks baca/tulis. Token kedaluwarsa/dicabut dan akses di luar otoritas ditolak.
- [x] Tambahkan tes konflik sebelum implementasi: dua penulis pada versi sama hanya menghasilkan satu perubahan; penulis kedua menerima konflik dan dapat memuat ulang tanpa kehilangan draft.
- [x] Serialisasikan mutasi pada satu writer; dokumentasikan/cegah proses kedua memakai state yang sama. Jangan menyamakan antrean satu proses dengan penguncian lintas proses.
- [x] Sediakan migrasi/import eksplisit dengan preview dari casework browser lama; jangan menimpa state server atau menghapus draft pengguna otomatis.
- [x] Buktikan dua sesi terotorisasi membaca perubahan yang sama, melanjutkan next action dan mempertahankan state setelah restart API. Nyatakan permukaan uji: lokal atau origin target yang sebenarnya.
- [x] Uji file rusak, write gagal/disk penuh, izin file, backup dan restore pada salinan disposable. Sukses hanya dikembalikan setelah state tersimpan; riwayat/bundle lama tetap utuh.

**Bukti P1:** [hasil, matriks penerimaan, screenshot dan manifest](../evidence/shared-casework-2026-10-17/README.md); [runbook akses/backup/restore](../development/shared-casework.md). Seluruh pemeriksaan dilakukan lokal; target hosted tidak digunakan.

**Batas:** tim kecil satu instance; bukan multi-tenant/multi-region atau jaminan ketersediaan produksi. Ephemeral filesystem tidak memenuhi kebutuhan persistensi target.

## 5. P3 — Koreksi dan penarikan publikasi

**Pelaksanaan 18 Oktober: verified lokal.** [Bukti penerimaan dan pemeriksaan akhir](../evidence/publication-lifecycle-2026-10-18/README.md). Scope adalah siklus ringkasan publik schema 4; bundle penuh tetap privat, laporan legacy/v3 mempertahankan aturan aksesnya. Implementasi memakai event publikasi append-only dalam envelope audit yang sama, sehingga pembuatan revisi berconsent dan penggantian versi publik lama disimpan atomik. Revisi tanpa consent tidak mengubah/menyingkap state publik. Penarikan memakai token review yang masih berwenang, versi publikasi yang diharapkan dan alasan baku tanpa free text. Default daftar menampilkan revisi publik terbaru per scope/claim, dengan pilihan riwayat; direct URL dan pemeriksaan live tetap menunjukkan status versi lama. Checksum offline hanya memeriksa ringkasan historis. Penulis seluruh file implementasi: agent utama; review independen read-only. Verifikasi: tes lifecycle/store/auth, unit web/verifier, typecheck/build dan Chromium lokal; tidak ada deployment/publikasi eksternal.

**Pemilik:** implementer API untuk log/status publikasi; implementer web untuk tampilan setelah kontrak disepakati. Bergantung pada mutasi versi atomik P1.

**File implementasi:** `apps/api/src/publication.ts`, `app.ts`, `store.ts`; `packages/shared/src/trust.ts`; `apps/web/src/TransparencyPanel.tsx`, `transparency.ts`, `HumanAssessmentPanel.tsx`, `human-history.ts`, verifier CLI dan tes terkait.

- [x] Tambahkan tes publish → correction → withdrawal, permintaan stale, penarikan berulang, akses tanpa izin dan daftar/detail/verify yang tidak konsisten.
- [x] Simpan perubahan status publikasi sebagai catatan tambahan dengan aktor, waktu, alasan publik yang aman dan versi pengganti bila ada. Koreksi penilaian menghasilkan revisi baru; jangan mengedit bundle/hash lama.
- [x] Tampilan default mengarah ke versi terkini; versi ditarik menampilkan penanda penarikan dan hubungan riwayat. Ringkasan privat, kutipan atau alasan internal tidak bocor melalui API, cache maupun export.
- [x] Pertahankan consent dan allowlist setiap revisi; jangan menyalin persetujuan publikasi ke isi baru secara otomatis.
- [x] Pisahkan verifikasi digest historis dari status publikasi saat ini. Checksum export offline tidak membuktikan bahwa publikasi masih aktif.
- [x] Uji reload, pagination dan permintaan langsung ke URL versi lama; semua menyampaikan status dengan benar tanpa mengubah bukti historis.

**Batas:** penarikan tidak menghapus salinan yang pernah diunduh atau data/hash yang sudah berada di blockchain. Schema 4 penuh tetap privat.

## 6. P2 — Blockchain aktif, pemulihan dan verifikasi

**Pemilik:** implementer API/chain dan reviewer independen atas intent, otorisasi serta receipt. Bergantung pada jaminan penyimpanan P1; tidak bergantung pada keberhasilan AI P6.

**File yang dituju:** `apps/api/src/store.ts`, `chain.ts`, `app.ts`, `anchor-intent.test.ts`, `anchor-idempotency.test.ts`; `apps/web/src/anchor-result.ts` dan UI receipt; `scripts/verify-audit.ts`; tes verifier serta kontrak di `contracts/` bila ada perubahan kontrak yang benar-benar diperlukan.

- [x] Tetapkan state intent durabel sebelum mengaktifkan `reserveAnchor`/`completeAnchor`: identitas audit/case/claim, hash bundle dan identitas operasi. Reservasi dan penyelesaian audit harus konsisten setelah crash, bukan dua file bebas tanpa pemulihan.
- [x] Tambahkan tes crash sebelum broadcast, timeout setelah broadcast, restart sebelum receipt tersimpan, dua permintaan serentak, revisi berbeda pada case yang sama, transaksi revert, chain salah dan receipt palsu.
- [x] Selesaikan jaminan durabilitas write termasuk flush yang diperlukan; atomic rename saja belum membuktikan intent bertahan terhadap crash. Simpan metadata transaksi segera setelah tersedia, sebelum menunggu receipt.
- [x] Jaga status tidak pasti tetap pending. Jangan mengirim ulang otomatis setelah timeout; rekonsiliasi transaksi/event yang cocok lebih dahulu. Dokumentasikan cara menemukan transaksi bila crash terjadi sebelum hash tersimpan; bila belum dapat dipastikan, operasi tetap diblokir.
- [x] Verifikasi chain ID, registry, issuer, case ID, hash, versi, status transaksi dan block. Serialisasikan operasi yang berbagi issuer/case; batasi issuer operasional agar penulis lain tidak mengubah urutan di luar kontrol prototipe.
- [x] Pertahankan larangan anchor schema 4 privat dan AI belum direview. Gunakan audit baseline yang memang publik dan tidak memuat data sensitif untuk bukti chain pertama; jangan membuat hasil mitigasi fiktif.
- [ ] Setelah lokal lulus dan target/operasi diotorisasi, lakukan anchor Sepolia nyata. Catat tx hash, alamat registry, chain ID, issuer publik, bundle hash, versi, block serta kebijakan konfirmasi.
- [x] Jalankan verifier dari proses/klien terpisah terhadap jaringan, lalu ubah salinan report untuk menunjukkan penolakan. Bedakan hasil jaringan lokal, testnet publik, metadata receipt dan verifikasi on-chain.

**Hasil lokal 17 Oktober:** [bukti P2](../evidence/blockchain-recovery-2026-10-17/README.md), [ADR](../architecture/decisions/2026-10-17-durable-anchor-intents.md) dan [runbook](../development/blockchain-recovery.md). FileAuditStore nyata, Anvil chain 31337, SIGKILL sebelum/sesudah broadcast, revert, UI pending/target dan verifier proses terpisah telah diperiksa. Kandidat baseline publik `source_detected` disiapkan; belum di-anchor. Checklist verifier di atas selesai pada jaringan lokal; bukti jaringan Sepolia publik tetap bagian item transaksi yang belum dicentang. Default konfirmasi 2, fixture lokal 1; receipt diperiksa lagi untuk canonicality/reorg. Review implementasi independen menutup temuan izin reviewer, immutability receipt dan persetujuan target.

**Persiapan publik lanjutan 17 Oktober:** [target, audit operasional dan batas biaya](../evidence/sepolia-preparation-2026-10-17/README.md) sudah dibekukan. RPC publik nyata diperiksa; issuer baru tersimpan privat, saldo masih 0, registry masih alamat prediksi. Ketiga operasi sudah disetujui pengguna; faucet awal berhenti di CAPTCHA lalu, menurut laporan pengguna, mensyaratkan 0,001 ETH Mainnet. QuickNode juga kemudian dilaporkan menolak saldo Mainnet kosong, bertentangan dengan FAQ. PoW kemudian dicoba langsung oleh agent dua kali atas permintaan pengguna; kedua percobaan ditolak CAPTCHA invalid. RPC mengonfirmasi saldo 0 SepETH dan nonce 0; funding belum berhasil. Belum ada deployment/anchor publik.

**Selesai fungsional:** reservasi/pemulihan dan verifier lulus regresi. **Selesai integrasi:** receipt testnet nyata terverifikasi dari target yang dicatat. Konfigurasi RPC/key atau tes mock saja tidak menyelesaikan integrasi.

**Jalur testing tanpa faucet, 17 Oktober:** menindaklanjuti pertanyaan pengguna, [integrasi lokal dijalankan ulang](../evidence/p2-local-testing-2026-10-17/README.md): 31 tes terfokus dan satu skenario Anvil dengan kontrak nyata, crash/recovery serta verifier terpisah lulus. Profil testing lokal sudah terverifikasi dan dapat digunakan untuk melanjutkan pengembangan tanpa funding. Definisi integrasi publik pada rencana awal dan checkbox Sepolia di atas tetap belum terpenuhi; receipt lokal tidak menggantikannya.

## 7. P4 — Review pakar domain dan penutupan temuan

**Pemilik:** pakar manusia independen untuk penilaian; tim untuk menyiapkan materi dan memperbaiki temuan. Mulai pada 17 Oktober agar tidak menunggu kode.

**Pelaksanaan 18 Oktober: engineering terverifikasi lokal; P4 domain tetap in progress.** Pengguna mengonfirmasi belum ada pakar. [Paket review versi tetap](../evidence/domain-review-remediation-2026-10-18/README.md) berisi 12 kasus, bahan penilaian awal, baseline perbandingan terpisah, protokol, formulir dan ledger. Draft undangan disiapkan; tidak ada pihak eksternal dihubungi. Review manusia dan penutupan temuan tetap menjadi syarat P4 selesai. Kelima checklist berikut tetap belum dicentang karena belum ada hasil manusia.

**Artefak:** paket review versi tertentu, protokol review pakar, ledger temuan/respons dan ringkasan review yang mendapat izin publikasi. Simpan identitas/kontak/consent dan dokumen terbatas di luar repo publik.

- [ ] Konfirmasi setidaknya satu pakar relevan pada metana/MRV, remote sensing atau audit bukti; nyatakan kompetensi, hubungan dengan tim dan konflik kepentingan. Reviewer implementasi tidak otomatis menjadi pakar domain.
- [ ] Minta review atas pemisahan detection/notification/response/mitigation, scope waktu/sumber/klaim, ketidakpastian, dasar status supported/contradicted/insufficient, serta next evidence request.
- [ ] Sertakan kasus bukti tidak cukup dan pembanding terhadap interpretasi publisher. Review mencakup metode, bukan sekadar menyatakan UI terlihat baik.
- [ ] Catat temuan beserta dampak, keputusan menerima/menolak dan alasannya; perbaiki masalah material dan minta pakar memeriksa ulang bagian yang berubah.
- [ ] Bekukan ringkasan hasil beserta versi, tanggal, batas review dan status temuan. Masalah yang mengubah kesimpulan atau berpotensi membocorkan data tidak boleh ditutup dengan disclaimer saja.

**Selesai:** review benar-benar dilakukan dan temuan material ditutup/direview ulang; undangan, template atau pendapat agent bukan hasil review pakar. Review dokumenter juga belum membuktikan perbaikan fisik.

## 8. P5 — Manfaat pengguna, alur manual dan pembeda

**Pelaksanaan agent selesai, 18 Oktober:** [48 tugas manual/app](../evidence/p5-p6-agent-completion-2026-10-18/README.md) oleh dua agent dalam enam sesi berulang; 40 correct/8 partly, timing/bantuan/deviasi dicatat. Median 15 pasangan memenuhi filter: manual-minus-app −33,914 detik, tidak menunjukkan penghematan waktu manusia. CLI export diperbaiki setelah seluruh sesi dan direplay pada berkas yang sama. [Rencana agent](2026-10-18-p5-p6-agent-execution.md) selesai; checklist penelitian manusia berikut tetap belum terpenuhi.

**Pemilik:** fasilitator studi dan 5–8 peserta independen sesuai [protokol pilot](../evidence/target-user-pilot-protocol.md). Tim menindaklanjuti masalah yang ditemukan.

**File/artefak:** protokol yang ada, ringkasan agregat bertanggal, pembanding publik baru bila diperiksa ulang, dan ledger perbaikan. Jangan mengubah catatan pembanding 16 Oktober menjadi seolah-olah hasil pemeriksaan tanggal baru.

- [ ] Rekrut 5–8 peneliti/auditor/analis atau orang berpengalaman relevan; bukan penulis proyek. Siapkan dua kasus sepadan, kunci jawaban, manual publisher/source packet dan urutan yang diseimbangkan.
- [ ] Bekukan build/source archive hash, snapshot, tugas, bantuan yang diperbolehkan dan metrik sebelum sesi. Arsip sumber memakai daftar file yang aman dan tidak menyertakan `.env`, secret atau state/corpus privat. Sediakan 30–40 menit per peserta; lima sesi membutuhkan setidaknya 2,5–3,3 jam fasilitasi di luar persiapan/analisis.
- [ ] Ukur completion, waktu, ketepatan, bantuan dan salah paham pada tugas T1–T4. Sertakan tugas tidak selesai dan penyebut setiap angka; jangan hanya memilih hasil terbaik.
- [ ] Gunakan gerbang protokol: sedikitnya 80% peserta, dibulatkan ke atas, menyelesaikan tiap T1/T3/T4 tanpa bantuan substantif; tidak ada peserta meninggalkan sesi dengan anggapan feedback/missing observations/skor/hash membuktikan mitigasi fisik.
- [ ] Bandingkan alur manual dan aplikasi secara berpasangan dengan kasus/urutan/bantuan dicatat. Laporkan kelemahan dan kasus aplikasi tidak membantu, bukan hanya penghematan waktu.
- [ ] Periksa pembeda terhadap alur manual/MARS dan pembanding publik terdekat dari riset yang sudah ada. Pisahkan fitur yang diklaim pembuat, kode yang diperiksa dan fungsi yang benar-benar dijalankan. Jangan membuat peringkat seluruh submission dari sampel halaman publik.
- [ ] Perbaiki salah paham/hambatan material; perubahan yang memengaruhi tugas perlu pemeriksaan ulang yang dicatat. Jangan menggabungkan hasil dari build berbeda menjadi satu denominator tanpa penjelasan.
- [ ] Akhiri sesi utama paling lambat **20 Oktober pukul 12.00**; gunakan pukul 12.00–16.00 untuk analisis, perbaikan dan pemeriksaan ulang. Bila waktu tidak cukup, catat temuan sebagai belum ditutup. Temuan material setelah freeze tetap ditangani dan memerlukan pembekuan/pemeriksaan ulang; jangan memakai hasil lama untuk build baru secara diam-diam.

**Selesai:** sesi nyata, analisis agregat dan penutupan temuan tersedia. Sampel kecil mendukung kesimpulan kegunaan terbatas, bukan efek kausal/populasi atau penurunan emisi.

## 9. P6 — Evaluasi AI nyata terhadap rules baseline

**Pelaksanaan agent selesai, 18 Oktober:** [72 test claims/12 source](../evidence/p5-p6-agent-completion-2026-10-18/README.md), tiga kelas, dua konteks agent, reference authored dari isi rekaman dan pembanding rules pada input sama. Masing-masing agent 71/72 benar (macro-F1 0,9861), rules 72/72. Kesalahan bersama dipertahankan; 216 input/raw/grounding binding direplay. Keputusan: tidak ada manfaat tambahan yang ditunjukkan dan tidak memberi kelayakan aktivasi. Ini diagnostik DEMO metadata, bukan gold manusia atau benchmark provider. Checklist penelitian berikut tetap belum terpenuhi.

**Pemilik:** dua anotator manusia independen, adjudikator ketiga untuk sengketa, penanggung jawab hak dokumen dan operator benchmark. Mulai pengumpulan/anotasi sejak 17 Oktober; inferensi menunggu izin dan data siap.

**File yang digunakan:** `scripts/freeze-ai-assessment-inputs.ts`, `scripts/run-ai-benchmark.ts`, `services/data-pipeline/annotator_agreement.py`, `evaluate_evidence_ai.py`, serta [protokol anotasi](../testing/ai-benchmark-annotation.md). Ubah tooling hanya bila ditemukan gap konkret dan sertakan regresinya.

- [ ] Periksa hak setiap dokumen dan seluruh scope yang disyaratkan runner. Simpan excerpt, anotasi, gold, prediksi dan catatan hak pada lokasi privat; repo publik hanya memuat ringkasan yang diizinkan.
- [ ] Tetapkan train/dev/test yang terpisah berdasarkan source dan document; bekukan claim wording serta input dokumen sebelum anotasi/inferensi dengan tool freeze yang sudah tersedia.
- [ ] Dua manusia memberi label tanpa melihat keluaran model; hitung kesepakatan dan adjudikasi sengketa secara manusia. Gold tidak dibuat dari prediksi model atau label penulis proyek sendiri.
- [ ] Siapkan minimal **40 klaim held-out dari 10 sumber**, mencakup ketiga label, sesuai protokol. Jalankan rules baseline dan AI pada **klaim/input yang sama**. Bekukan model, prompt, batas biaya, timeout dan aturan abstention.
- [ ] Jalankan provider hanya setelah hak, target dan panggilan berbayar diotorisasi. Persiapan corpus/tooling bukan izin mengirim excerpt.
- [ ] Laporkan per-label precision/recall/F1, macro-F1, citation precision, false-supported/false mitigation confirmations, abstention, kegagalan provider, latensi/biaya yang dapat dicatat dan interval source-cluster; sertakan selisih berpasangan terhadap rules.
- [ ] Terapkan gerbang internal yang sudah ada: macro-F1 ≥0,80; citation precision ≥0,90; setidaknya satu supported yang benar dan grounded; **nol false-supported** pada set tersebut; seluruh syarat corpus terpenuhi.
- [ ] Pisahkan kelulusan ambang absolut dari manfaat tambahan AI terhadap baseline. Jika AI tidak memberi manfaat yang didukung hasil, pertahankan rules sebagai jalur utama dan laporkan hasil tersebut.
- [ ] Bila gagal, perbaiki menggunakan dev set. Jangan mengutak-atik prompt pada test set lalu menampilkan hasilnya sebagai held-out baru; evaluasi ulang membutuhkan set yang tetap independen.

**Selesai evaluasi:** data/label/hasil nyata dan keputusan model tersedia, termasuk hasil negatif. **Lulus aktivasi model:** gerbang keselamatan dan manfaatnya terpenuhi. Bila gagal, model tetap nonaktif; evaluasi yang selesai tidak berarti model layak dipakai. Bila corpus/provider/manusia belum tersedia, evaluasi tetap belum selesai.

## 10. Penutupan lintas paket

**Tanggal 20 Oktober, pukul 16.00:** hentikan penambahan fitur. Setelah itu perbaiki hanya penghambat, regresi dan ketidaksesuaian bukti; perubahan material memerlukan pemeriksaan ulang bagian terdampak.

- [ ] Jalankan pemeriksaan kecil setiap perubahan. Sebelum penutupan jalankan `bun run check:all`, `bun run test:e2e` dan `bun test scripts/evidence-transport.test.ts` serta `bun run test:case-work-operations`; tiga command terakhir tidak tercakup `check:all`. Lihat [matriks pengujian](../testing/README.md). Catat hasil aktual, skip, environment dan hash sumber; jangan memakai hitungan suite lama sebagai hasil baru.
- [ ] Periksa alur browser dua sesi, desktop/mobile, keyboard, pesan konflik, pending chain, kegagalan jaringan dan pemulihan. Uji dari origin target untuk setiap klaim remote; keberhasilan localhost tidak membuktikan deployment.
- [ ] Periksa bahwa data historis/DEMO, akses privat, consent, reviewer, public withdrawal, export dan receipt menyatakan batas yang konsisten. Audit schema 4 privat tidak menjadi publik atau dapat di-anchor karena perubahan UI.
- [ ] Buat folder evidence baru, misalnya `docs/evidence/six-package-completion-2026-10-20/`, berisi ringkasan hasil, manifest versi dan daftar temuan/status. Jangan menimpa evidence/checksum historis; jangan memasukkan secret, identitas peserta atau corpus privat.
- [ ] Selaraskan status implementasi, API, arsitektur, konfigurasi, batas produk dan indeks docs. Status terencana, implementasi lokal, integrasi nyata dan hasil manusia harus dibedakan.
- [ ] Cocokkan kembali paket Notion lokal, script/Q&A dan screenshot dengan versi final. Pertahankan satu cerita: masalah → kasus → keputusan bukti → tindakan berikut → versi/verifikasi → hasil evaluasi serta batasnya. Video 3–5 menit adalah persyaratan resmi; paket lokal tidak sama dengan halaman Notion/video yang sudah dipublikasikan.
- [ ] Sisihkan pukul **20.00–23.59** untuk pemeriksaan artefak, akses yang diotorisasi, rehearsal dan cadangan perbaikan. Catat revision publik bila ada; working tree lokal bukan otomatis kode yang dapat dilihat juri.
- [ ] Kunci daftar klaim yang boleh dipresentasikan dan status setiap paket. Siapkan tindakan eksternal tersisa secara konkret; publikasi, deployment dan submission tetap mengikuti otorisasi serta aturan acara yang telah diklarifikasi.

## 11. Status dan keputusan selesai

| Paket | Status pelaksanaan terkini | Bukti penutupan / pekerjaan tersisa |
|---|---|---|
| P1 | **Verified — implementasi dan integrasi lokal, 17 Oktober** | [Evidence P1](../evidence/shared-casework-2026-10-17/README.md): akses dua sesi, CAS/history, import, crash/restart, backup/restore dan fail-closed recovery; remote belum diuji |
| P2 | **Profil testing lokal verified, 17 Oktober; target Sepolia awal belum terpenuhi** | [Pengulangan tanpa faucet](../evidence/p2-local-testing-2026-10-17/README.md): 31 tes terfokus dan satu integrasi kontrak nyata lulus; [bukti full gate terdahulu](../evidence/blockchain-recovery-2026-10-17/README.md). [Persiapan publik](../evidence/sepolia-preparation-2026-10-17/README.md) dipertahankan; belum ada deployment/receipt Sepolia |
| P3 | **Verified — implementasi dan integrasi lokal, 18 Oktober** | [Evidence P3](../evidence/publication-lifecycle-2026-10-18/README.md): koreksi/withdrawal atomik, consent ulang, status/history/direct URL, pagination, private parent recovery dan SIGKILL/restart; kronologi server tidak ditandatangani |
| P4 | **Menunggu review manusia; ditunda atas arahan pengguna, 18 Oktober** | [Paket kirim P4](../evidence/domain-review-remediation-2026-10-18/README.md) tetap; 0 pakar/0 sesi/0 hasil manusia. Dilanjutkan saat pemilik siap |
| P5 | **Verified — cakupan agent selesai; pilot manusia pending** | [48 tugas, dua agent/enam sesi berulang](../evidence/p5-p6-agent-completion-2026-10-18/p5-analysis.json); 40 correct/8 partly, bantuan/timing tersimpan; perbaikan CLI direcheck. Tidak ada manfaat manusia yang dibuktikan |
| P6 | **Verified — cakupan agent selesai; benchmark manusia/provider pending** | [72 authored test claims/12 source/dua konteks agent](../evidence/p5-p6-agent-completion-2026-10-18/diagnostic-analysis.json); masing-masing 71/72 vs rules 72/72; tidak memberi kelayakan aktivasi AI |

Gunakan status **pending**, **in progress**, **verified**, atau **blocked** pada ledger pelaksanaan dengan penyebab, pemilik dan bukti bertanggal. Jangan menandai verified hanya karena kode, template atau jadwal tersedia. Pada batas waktu, laporkan hasil aktual per paket; target “poin maksimal” tidak mengubah hasil yang belum terbukti menjadi selesai.

Rencana ini mempertahankan enam paket. Tambahan hanya menjadi perubahan scope bila ada kebutuhan material di luar keenamnya, beserta alasan dan dampak jadwal; temuan bug atau kelengkapan penerimaan tetap diselesaikan dalam paket terkait.
