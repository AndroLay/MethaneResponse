# P2 dan delivery — lanjutan 20 Oktober

Permintaan: lanjutkan daftar pekerjaan setelah Connected Investigations sampai hasil yang diizinkan selesai. Source aktif dan bukti beku dipertahankan. Baseline `8e19c03`; 137 path sudah berubah sebelum increment ini. Pemilik edit: agen utama, checkout yang sama.

## Urutan dan acceptance

- [x] Pemeriksaan bukti berulang: kandidat deterministik lintas investigasi yang diizinkan, scope/snapshot eksplisit, tidak menyatakan double counting atau mengubah verdict. UI dapat merekam tindak lanjut dalam riwayat pekerjaan yang sudah ada. Unit/API/browser dan permission revocation wajib.
- [x] Intake snapshot opt-in: stage input lokal dengan hash terpisah, replay perubahan lengkap dan manifest; tidak menimpa snapshot aktif atau paket beku. Uji hash, sumber tidak kompatibel, output existing dan dry run.
- [x] Delivery revisi terbaru: judging guide/story/paket bukti mencerminkan workflow terbaru; source ZIP allowlisted, tanpa secrets/state/cache, checksum dan batas ukuran. Materi v12 dipertahankan sebagai versi historis.
- [x] Gate final: frozen install, check/typecheck, API/web/verifier, Python/Foundry, build/budget, browser aktual dan Anvil bila tersedia. Bukti baru pada direktori baru, hitungan tidak menjumlahkan pengulangan.
- [ ] Publik: periksa source/CI dan preview khusus MethaneResponse. Workspace Render disetujui, free dahulu; jangan mengubah Evidrilo. Publikasi/deployment baru hanya sesudah hasil lokal konkret dan izin yang berlaku mencakup target.
- [ ] Tutup dengan status per deliverable, artefak yang dapat dibuka, blocker layanan/izin, dan pekerjaan eksternal yang memang belum terverifikasi.

## Batas eksternal

Pakar/pilot manusia tetap ditunda. Tidak ada klaim benefit manusia, akurasi AI atau emisi yang dihemat dari simulasi. Provider AI dan dokumen berizin diperlukan untuk benchmark nyata. Faucet/funding Sepolia belum terbukti tersedia. Public preview tidak membuka dossier privat dan filesystem free bersifat sementara. Notion bukan target.

## Pemeriksaan awal

GitHub connector mengonfirmasi repository `AndroLay/MethaneResponse` publik. Render workspace yang sama tersedia; daftar layanan hanya berisi dua layanan Evidrilo, tidak disentuh. Shell GitHub diblokir allowlist jaringan; connector read-only berfungsi. Belum ada mutasi eksternal pada pemeriksaan awal.

## Hasil aktual sebelum publikasi

Bukti P2: `docs/evidence/p2-delivery-2026-10-20/`. Gate 876 tes utama, 40 unique browser/Node checks, actual Anvil, operations, source pin dan replay lokal. Rilis UNEP 20 Oktober diunduh resmi, dinormalisasi dan dibandingkan tanpa aktivasi: 4.197 sumber/30.529 plume; dua implementasi cocok pada seluruh 8.415 source/60.943 plume records. Empat overlap CLI scenarios sesuai expected exits. Video teknis aktual 65,4 detik melengkapi presentasi historis v12; tidak mengganti narasi utamanya.

User menyetujui push main dan deploy hanya jika Rp0 terverifikasi. Konektor Render tidak menyediakan billing/spend cap; bukti dashboard diminta, belum ada resource baru. Matching lintas provider, AI quality, Sepolia, manusia/perangkat fisik dan submission publik tetap perlu input/layanan eksternal. Tidak dilabel selesai 100%.

## Delivery lokal final

Source ZIP dan judging attachment sudah dibuat serta lolos CRC/checksum. Attachment 14.431.613 bytes, di bawah batas konservatif 35 MB; source lengkap dikirim terpisah. Clean extracted-source gate exit 0 (876 tes), 602 runtime/input bindings identik. Video teknis aktual dan seluruh metadata source tersedia lokal. Push main telah disetujui; verifikasi CI dan preview publik dicatat sebagai status terpisah. Render belum dibuat karena Rp0 workspace belum terverifikasi.
