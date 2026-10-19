# Agent memakai aplikasi lokal

**Pelaksana:** satu agent, Chromium dengan sandbox aktif. **Surface:** API lokal dan Vite dev di localhost, snapshot `unep-mars-675417694883`. Tidak ada peserta manusia. Agent membaca protokol/kode/petunjuk terlebih dahulu; ia bukan peserta baru yang dibutakan dari implementasi. Ketepatan di bawah adalah penilaian agent atas jawaban/tugasnya.

**Dilakukan:** T1–T4 pada KAZ, T1–T2 pada ARG. **Tidak dilakukan:** kondisi manual berpasangan, T3/T4 ARG, sesi manusia, provider AI, pengukuran waktu/confidence manusia. Tidak menyalin body laporan publisher. Enam task checks ini tidak dihitung sebagai enam peserta.

| Kasus | Tugas | Hasil aktual | Status |
|---|---|---|---|
| KAZ_S_159 | T1: source/observasi terakhir | Label NOT LIVE; 3 observasi tertaut; terakhir 2026-07-11, **496 ±226 kg/h**, EnMAP-DLR. Max sepanjang arsip 591 kg/h berbeda dari observasi terakhir | Selesai, jawaban agent sesuai metadata |
| ARG_S_055 | T1 | 2 observasi; terakhir 2023-03-06, **1.443 ±599 kg/h**, PRISMA-ASI. Max historis 3.929 kg/h; tidak menafsirkan sebagai kondisi saat ini | Selesai, sesuai metadata |
| KAZ_S_159 | T2: prioritas/alasan | 33,3/80 medium; panel menampilkan 3 tanggal, median flux 496 dan uncertainty 226 kg/h, persistency 0,67. Heuristik bukan forecast/mitigasi | Selesai, dengan batas |
| ARG_S_055 | T2 | 39,8/80 medium; 2 numeric/0 missing; median flux 2.686 dan uncertainty 1.056,5 kg/h; publisher persistency 0,00 absent. Tidak menyimpulkan absent = zero methane | Selesai, dengan batas |
| KAZ_S_159 | T3: scope mitigasi tanpa report body | Probe klaim perbaikan 2026-08-20 dengan follow-up hingga 2026-09-13. Baseline meminta rentang eksplisit, kemudian memberi **Insufficient reference coverage** | Selesai sebagai coverage probe; bukan exact natural-language document assessment |
| KAZ_S_159 | T4: export/verifier/tamper | Pilih revisi pada Reports → export JSON → Verification Center. Asli lolos digest. Perubahan reason menolak summary-vs-bundle; perubahan limitation bundle menolak checksum export/context | Selesai pada browser lokal |

Agent tidak menerima bantuan manusia; waktu dan confidence tidak diukur. Tidak terlihat salah tafsir fisik pada jawaban agent. Ini belum menjamin orang lain memahami UI dengan benar.

## Artefak dan arti verifikasi

[Export asli](agent-export/methane-report.json), [summary tampered](agent-export/methane-report-tampered.json), dan [bundle tampered](agent-export/methane-report-tampered-bundle.json) dipertahankan persis seperti hasil browser, termasuk salinan rusak yang sengaja dibuat. Mereka berisi baseline dan metadata publik, bukan private document assessment atau jawaban peserta. Jangan mengimpor dua berkas tampered sebagai hasil valid.

- Audit `929737e9-b558-464c-8ddf-6355d0793c64`, revision 1, insufficient evidence.
- Bundle SHA-256 `0xc7b842f1265c17627ac29e2749050abca5cb9c385f9512cb6f09e2f6540a5225`.
- Export checksum `0xacc632da7d9b66c95a49f3c06604f0fb3902070838822bf2e5a19eec4eb6a5b1`.
- Raw file SHA-256 `323c1aab64229902f67e2d66d990d584a5ffe7a0d2bd43ab091e959fb93ff2a0`.

Browser menyatakan checksum unsigned/unanchored, bukan autentikasi dokumen atau bukti mitigasi/reduksi emisi. Daftar observasi context berada di luar **bundle digest**; checksum export memeriksa context secara terpisah. Tidak ada receipt on-chain.

## Hambatan dan batas tugas

1. Uncertainty observasi terakhir memerlukan “View full case” → “Observations”; ringkasan peta menampilkan max, bukan pengganti detail observasi terakhir. Petunjuk task pack menyebutkan field yang harus dicari. Pengaruhnya bagi pengguna baru belum diukur.
2. Rincian alasan prioritas ditemukan pada panel Intelligence di step Document AI. Panel dapat dibaca tanpa melakukan panggilan provider. Potensi discoverability tetap observasi UX, belum temuan studi manusia.
3. Baseline meminta kategori/rentang/event, tidak menerima exact wording klaim. Karena itu T3 ini dilaporkan reference coverage. P6 mengharuskan wording/document input sama dan basis pembanding yang jujur.
4. Export di Reports aktif setelah revisi dipilih. Agent berhasil menyelesaikan langkahnya.

Percobaan sandbox awal tidak dapat membuka socket localhost/Chromium. Percobaan lokal dengan izin socket berhasil, sandbox Chromium tetap aktif; tidak memasang dependency atau membuka target eksternal. Browser dan kedua server milik agent sudah dihentikan. Log/snapshot sementara berada di `/tmp/methaneresponse-p5-walkthrough`; artefak export relevan dipertahankan di paket ini.

Sumber aplikasi yang dipakai adalah working tree pada HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` dengan perubahan lokal. Hash utama diperiksa terhadap manifest paket: App `7befca4f3608a9eb700eacb4a3af4ccf5fc555e2396d77a32f78d364294f22e5`, workflow `cf9b51fc71ae8fbbf59655782d812279d08d35c30c320c10b1c2f47e7b03fcd4`, browser verifier `5911a75306eba80def02ca056fab2d1b556be59c6a740f958fdf4fb3f099b487`, casebook `02601434e3ef431f6fa2432ae3e6a0069f52649df3f43a366cb203d41be56aa0`.
