# Penguatan manfaat dan alur investigasi

**Status:** verified dalam cakupan lokal · 18 Oktober 2026. Root menjadi satu-satunya penulis repo; agen membantu analisis dan review secara read-only.

**Otorisasi:** pengguna menyetujui tiga keluaran dan memberikan kebebasan implementasi. Tes telah diizinkan. Eksekusi mengikuti adapter `adaptive-engineering/references/persistent-plans.md`; tidak melakukan commit/deploy/publikasi eksternal.

**Tujuan:** meningkatkan kegunaan dan bukti nilai Climate Impact, Innovation, dan Practical Usefulness. Target 18/20 merupakan aspirasi penilaian internal, bukan keluaran tes atau jaminan nilai juri.

**Baseline:** HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` dengan 201 perubahan working tree yang dipertahankan. Paket P5/P6 dan integration-role-simulation tetap beku. Temuan P5 yang lambat/parsial tidak diganti hasil baru.

## Desain yang dikerjakan

1. Gunakan editor scope yang ada: preset rentang observasi UTC dan satu hari event, preview sebelum Apply, penanda draft belum diterapkan, serta blokir baseline ketika periodenya masih draft. Preset hanya membantu input, tidak menentukan tanggal tindakan/mitigasi.
2. Tempatkan verifikasi file langsung dalam Reports. Mode default meminta checksum konteks ekspor lengkap, dengan opsi eksplisit untuk berkas legacy. Tampilkan integritas bundle, konteks, dan keterbatasan secara terpisah. Tidak membutuhkan CLI untuk pemeriksaan file lokal.
3. Bekukan tugas/rubrik sebelum perbandingan. Baseline manual memperoleh data/provenance/aturan dan alat hash yang sama; laporkan hasil fungsional dan langkah, bukan penghematan waktu manusia. Jangan membatasi kemampuan manual secara artifisial atau mengklaim baseline MARS asli diuji.
4. Tiga studi kasus historis: fakta snapshot, masalah keputusan, bukti yang ada, yang belum ada, hasil aturan untuk scope eksplisit, dan permintaan bukti berikutnya. Tidak mereproduksi isi laporan pihak ketiga.

## Milestone dan penerimaan

- [x] **M1 — alur scope dan verifier.** Files: `AssessmentScopeEditor.tsx`, helper scope/tests, `EvidenceAuditorWorkflow.tsx`, `ImportedAuditVerifier.tsx`, `imported-audit-verifier.ts`/tests, Reports di `App.tsx`, CSS dan E2E. Red→green untuk perilaku baru; Chromium desktop/mobile mencakup preset/apply, draft guard, export/import utuh dan tamper.
- [x] **M2 — perbandingan fungsional.** Files: paket baru `docs/evidence/product-value-2026-10-18/`, harness/tooling tests jika diperlukan. Inputs/protocol/rubric di-hash sebelum eksekusi; hasil baseline dan app mentah dipertahankan, kegagalan tidak disembunyikan. Agen tidak dihitung sebagai responden manusia.
- [x] **M3 — tiga studi kasus dan dokumentasi.** Files: `docs/research/` studi kasus; product workflow, status, indeks bukti/rencana. Semua fakta numerik direplay dari dataset tetap. Dokumentasikan batas lama dan baru.
- [x] **M4 — review dan bukti akhir.** Jalankan focused tests → typecheck → browser → build/bundle. Review independen terhadap perubahan/hasil. Bekukan file hashes, raw logs, screenshot terpilih dan commands dalam paket baru. Full gate hanya jika sebanding dengan perubahan lintas komponen; jangan menyebut hasil lama sebagai rerun.

## Batas kesimpulan

Tidak ada pakar/partisipan manusia baru, provider AI eksternal, deployment publik, atau transaksi Sepolia baru dalam pekerjaan ini. Studi kasus menghasilkan keputusan transparan yang dapat ditelusuri, bukan bukti pengurangan emisi. Checksum tanpa penerbit tepercaya tidak membuktikan autentisitas. Nilai akan dinilai dari hasil, tidak otomatis dinaikkan.

## Hasil verifikasi

- Full `bun run check:all` exit 0: 193 API + 253 web + 54 tooling + 212 Python + 4 Foundry = **716 tes**, typecheck/build/bundle lulus (App 71.724 gzip bytes).
- Empat skenario Chromium lokal lulus, termasuk desktop/mobile, preset/draft recovery, strict Reports verifier dan regresi investigasi. Browser sandbox tetap aktif.
- Perbandingan beku: aplikasi 16/16 exact; manual 11/16 exact karena lima nilai boolean dibanding enum (tipe enum tidak dijelaskan prompt). Hasil mentah tetap. Analisis format post-hoc 16/16; **paritas keputusan**, bukan keunggulan ketepatan atau waktu manusia.
- Tiga laporan historis mitigation scope menghasilkan insufficient_evidence dengan bundle/context valid; studi kasus mengatribusikan ringkasan UNEP, tanpa mereproduksi PDF.
- Review independen menemukan draft scope hilang saat navigasi: diperbaiki dan diregresikan. Batas mode legacy helper, storage gagal, dan metrik overclaim terstruktur didokumentasikan. Hash 118 file produksi dan 204 checksum paket sebelumnya cocok.

[Paket hasil dan perintah replay](../evidence/product-value-2026-10-18/README.md). Tidak ada temuan material yang masih memerlukan perubahan kode pada scope ini. Review manusia dan integrasi eksternal tetap pada ledger sebelumnya. Tidak melakukan commit/push/deploy.
