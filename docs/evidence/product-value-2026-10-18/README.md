# Penguatan manfaat produk — 18 Oktober 2026

[Rencana](../../plans/2026-10-18-product-value-strengthening.md) · [Panduan penggunaan](../../product/user-workflow.md) · [Tiga studi kasus](../../research/three-historical-decision-cases-2026-10-18.md)

## Hasil yang dapat digunakan

1. **Scope lebih jelas.** Preset rentang observasi dan hari event memakai normalisasi UTC; pengguna memeriksa lalu Apply. Baseline dinonaktifkan selama ada perubahan scope belum diterapkan. Draft scope pulih per konteks investigasi/tab; storage yang gagal ditandai. Preset tidak menebak tanggal tindakan/follow-up.
2. **Verifikasi tanpa CLI di Reports.** Pengguna mengunduh JSON dan memilihnya langsung di halaman yang sama. Konteks ekspor wajib secara default. Pilihan legacy eksplisit, hasil dihapus saat opsi berubah, dan file harus dipilih ulang. Bundle hash, konteks ekspor dan receipt tetap terpisah. Helper kode mempertahankan default legacy untuk kompatibilitas; UI meneruskan kebijakan ketat secara eksplisit.
3. **Tiga studi kasus historis lengkap.** Kazakhstan menekankan urutan tindakan/event; Libya keterbatasan pengukuran lanjutan; Kanada ketidakpastian dan larangan mengekstrapolasi avoided emissions. Masing-masing memuat fakta, celah bukti, keputusan, peran tindak lanjut, serta permintaan bukti.

Sasaran internal 18/20 adalah arah peningkatan, **bukan nilai yang diberikan oleh tes**. Paket ini tidak menjanjikan skor atau kemenangan.

## Perbandingan yang dilengkapi alat

Input, protokol, rubrik dan 118 file produksi dibekukan sebelum dua eksekusi pada [input-freeze.json](input-freeze.json). [Protokol](protocol.md) menetapkan 16 sel: sembilan pemeriksaan cakupan metadata dari tiga kasus historis, lima tantangan integritas DEMO, satu lineage DEMO dan satu normalisasi UTC DEMO. Agen baseline mendapat data identik, kebijakan, JSON/hash umum dan izin memakai CLI verifier yang sama. Tidak membaca rubrik, replay app atau scorer sebelum mengirim hasil, menurut laporan operator.

| Ukuran | Replay fungsi aplikasi | Operator AI pada alur manual dengan alat |
|---|---|---|
| Sel terjadwal / hilang | 16 / 0 | 16 / 0 |
| Cocok persis dengan rubrik beku | 16/16 | 11/16 |
| Perbedaan keputusan integritas | — | Tidak ada; lima mismatch adalah boolean dibanding enum string |
| Kecocokan setelah pemetaan format **post-hoc** | 16/16 | 16/16 |
| Overclaim pada dua field boolean yang dinilai | 0 | 0 |

**Kesimpulan: keputusan setara pada tugas kecil ini.** Prompt menamai `localDigest` tetapi tidak menjelaskan enum field tersebut. Operator menulis `true`/`false`, aplikasi `valid`/`invalid`. Ini kelemahan kontrak format penelitian, bukan bukti alur manual salah memeriksa file. [Analisis utama](comparison.json) dan [hasil manual asli](manual-results.json) dipertahankan. [Analisis sensitivitas format](format-sensitivity.json) diberi label post-hoc dan tidak mengganti hasil awal. Tidak boleh menyajikan 16 lawan 11 sebagai keunggulan ketepatan aplikasi.

Operator menggunakan Python standard library. Menurut catatan operator, upaya menjalankan CLI melalui alat `tsx`/`pnpm exec` tidak berhasil dan memicu fetch yang diblokir; tidak ada dependensi ditambahkan. Helper hash alternatif memang diizinkan protokol. [Helper dan log asli](manual-replay/manual_checks.py) disimpan; root menjalankan ulang helper dengan direktori fixture dipindahkan dan hasil log identik. Ini tidak menyamakan helper terbatas dengan seluruh cakupan validator aplikasi.

`criticalOverclaims` hanya menghitung dua field terstruktur (`physicalMitigationEstablished`, `authenticityEstablished`), bukan seluruh kalimat bebas. Root meninjau tools/deviations serta studi kasus secara terpisah. Komentar helper manual yang menyebut timestamp tanpa zona sebagai UTC dibaca sebagai konvensi parser; zona jam upstream belum diverifikasi.

**Manfaat yang ditunjukkan:** cakupan klaim, alasan, revisi dan pemeriksaan file dapat dikerjakan dalam alur produk yang sama. **Yang belum ditunjukkan:** keunggulan waktu/biaya manusia, usability oleh pengguna target, atau superioritas ilmiah. P5 lama tetap utuh: 15/24 pasangan memenuhi filter waktu; median manual-minus-app −33,914 detik, berarti aplikasi lebih lambat pada pasangan wall-time agent tersebut. Tidak digabung dengan hasil baru.

## Tiga keluaran historis yang bisa diperiksa

| Source | Scope analisis metadata | Hasil | Pemeriksaan file |
|---|---|---|---|
| [KAZ_S_159](kaz_s_159-mitigation-report.json) | 2024-06-07 → 2026-10-14 | insufficient_evidence | Bundle dan konteks valid |
| [LBY_S_143](lby_s_143-mitigation-report.json) | 2025-12-23 → 2026-10-14 | insufficient_evidence | Bundle dan konteks valid |
| [CAN_S_002](can_s_002-mitigation-report.json) | 2026-04-10 → 2026-10-14 | insufficient_evidence | Bundle dan konteks valid |

[Hasil pemeriksaan lengkap](case-reports.json). Scope studi kasus di atas lebih lebar daripada tugas pembanding yang sengaja dibatasi event pertama. Keduanya dicatat terpisah. Laporan dibuat lokal melalui fungsi produksi, tidak dimasukkan ke audit store API atau dipublikasikan. Link-only laporan UNEP bukan bukti tindakan/follow-up bertipe lengkap dalam baseline. `insufficient_evidence` berarti batas pemeriksaan metadata aplikasi, bukan penyangkalan terhadap konfirmasi UNEP.

## Verifikasi yang dijalankan

- `bun run check:all`: **716 tes** — 193 API, 253 web, 54 tooling, 212 Python, 4 Foundry; typecheck/build/bundle gate lulus. App entry 71.724 gzip bytes. [Log](logs/check-all.log).
- Chromium sandbox aktif, server web/API lokal terisolasi: **4 skenario** — preset/draft/Reports verifier, resume kerja, ekspor/verifikasi/tamper, dan investigasi terpisah. Desktop 1600×1000 serta viewport mobile 390×844; tidak ada pageerror pada skenario baru, tidak ada overflow horizontal. [Log](logs/browser.log), [desktop](screenshots/report-verification-desktop.png), [mobile](screenshots/report-verification-mobile.png).
- Dua tes scorer mempertahankan denominator/missing dan menolak ID duplikat/tambahan; termasuk 54 tooling di atas. Replay perbandingan 16 sel bukan 16 tes tambahan di `check:all`.
- Tiga laporan studi kasus menghasilkan `manifest_valid`/bundle valid. Replay helper manual menghasilkan log sama. Hash casebook, input, kode dan paket lama diperiksa pada penutupan.

Tahap red→green dicatat untuk helper scope, strict verifier dan komponen verifier. Percobaan browser awal tertahan browser bawaan tidak tersedia, lalu sandbox filesystem menolak socket Chromium; eksekusi memakai Chromium sistem dengan sandbox browser tetap aktif. Ekspektasi tanggal akhir awal juga dikoreksi setelah membaca fixture nyata (`2026-07-11`, bukan tanggal yang diasumsikan). Log gagal dipertahankan; tidak dihitung sebagai keberhasilan.

## Menjalankan ulang

```sh
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep 'scope presets|unsaved work|historical MARS case|analyst case work resumes'
bun run evaluate:product-value prepare /tmp/NEW_PRODUCT_VALUE_PACKET
# Berikan inputs.json + protocol.md kepada operator terpisah; simpan jawaban ke manual-results.json.
bun run evaluate:product-value run /tmp/NEW_PRODUCT_VALUE_PACKET
bun run evaluate:product-value analyze /tmp/NEW_PRODUCT_VALUE_PACKET
```

Jangan menimpa paket beku ini. `prepare` mengharuskan direktori baru; output memakai exclusive creation. Freeze menyimpan checksum casebook dan memverifikasi input/kode pada run/analyze; pengecekan casebook saat penutupan juga dicatat dalam [verification.json](verification.json). Untuk mengulang penilaian atas input lama, salin input/rubrik/protokol/freeze ke direktori baru dengan kode yang cocok, lalu jalankan run/analyze di salinan. Jangan mengubah rubrik setelah melihat hasil untuk mengklaim perbaikan performa.

[manifest.json](manifest.json) mengikat source ZIP, dataset, dokumen aktif dan material paket. [checksums.sha256](checksums.sha256) mendeteksi perubahan relatif terhadap paket ini; checksum tanpa trusted sender tidak mengautentikasi penerbit. Snapshot dataset dan ringkasan adaptasinya mengikuti CC BY-NC-SA 4.0 dengan atribusi UNEP IMEO; sumber tersedia di provenance input. Tidak ada isi laporan pihak ketiga direproduksi.

## Batas yang tetap berlaku

Pengamatan jarang bukan continuous monitoring. Tidak adanya plume bukan nol methane. Feedback bukan bukti repair. Hash dan receipt bukan physical truth. Satu operator AI bukan partisipan manusia. Tidak ada pakar/partisipan baru, provider eksternal, deployment publik, atau transaksi Sepolia dalam increment ini. Artefak screenshot adalah viewport emulation, bukan tes perangkat telepon fisik. Browser development dan build gate diverifikasi terpisah; browser production hosting belum diuji.
