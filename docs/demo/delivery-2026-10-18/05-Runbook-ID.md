# Runbook demo lokal (Bahasa Indonesia)

## Tujuan dan batas

Video memperagakan alur yang ada di aplikasi: pilih kasus historis KAZ_S_159 → lihat observasi → tetapkan cakupan → jalankan baseline rules → catat tindak lanjut → ekspor → verifikasi digest → ubah salinan dan pastikan gagal. Ini bukan demo AI live, receipt blockchain, keputusan regulator, maupun validasi fisik perbaikan.

## Menjalankan capture ulang

Prasyarat lokal yang sudah tersedia pada run ini: Bun, Chromium (`/usr/bin/chromium`), ffmpeg/ffprobe, Python 3, NumPy, dan font DejaVu Sans. Jangan menambahkan kredensial ke shell atau browser.

1. Dari root repository, jalankan `bun run build:web`.
2. Jalankan `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bash scripts/capture-delivery-demo.sh`. Wrapper hanya membuat symlink sementara dari system ffmpeg ke lokasi executable yang dicari Playwright; tidak mengunduh atau memasang binary baru.
3. Script memakai direktori state sementara baru di `/tmp`, menyaring environment agar tidak mewariskan token/secret, menjalankan API dalam mode preview, merekam browser dengan sandbox Chromium, lalu berhenti.
4. Jalankan `python3 scripts/generate-demo-music.py /tmp/MethaneResponse-delivery-2026-10-18/original-instrumental.wav`.
5. Dari root repo, render: `bash scripts/render-delivery-demo.sh`.

Script menolak menimpa output video yang sudah ada. Gunakan `METHANE_DELIVERY_OUTPUT_DIR` untuk direktori output baru. Capture screenshot PNG tersimpan pada `docs/demo/delivery-2026-10-18/assets/`; jangan timpa manifest atau evidence paket yang lama.

## Alur presenter bila harus merekam manual

1. Buka halaman lokal hasil production build dan pastikan badge menyebut preview/historical data.
2. Pilih `KAZ_S_159`; pertahankan atribusi peta. Jangan menyebut feed “live”.
3. Di Case, tampilkan tiga observasi EnMAP dan nilai ±. Jelaskan sebagai observasi diskret.
4. Di Evidence Auditor, gunakan event 2024-06-07, tetapkan scope dan tekan Apply. Jalankan `source_detected`; sebut hasilnya sebagai kecukupan referensi metadata, bukan autentikasi sumber.
5. Jalankan `mitigation_confirmed`; jelaskan bahwa insufficient hanya berlaku untuk scope/referensi yang dimuat. Metadata UNEP yang menyebut aksi Juli 2026 tetap atribusi terpisah; waktu aksinya tidak diketahui.
6. Simpan casework lokal dengan pertanyaan waktu aksi dan permintaan bukti lanjutan. Jangan menyebutnya sudah dikirim ke operator.
7. Unduh JSON dari Reports, pilih file yang sama di verifier, lalu tampilkan digest cocok tanpa receipt blockchain.
8. Pilih salinan JSON yang diubah pada field bundle `reason`; tampilkan kegagalan verifikasi.
9. Tutup: pemeriksaan integritas menjaga perubahan isi terlihat, tetapi tidak membuktikan kebenaran fisik atau mitigasi.

## Reset dan fallback

- Capture otomatis memakai store API sementara baru; tutup browser/API setelah proses selesai. Untuk menjalankan lagi, pilih output folder baru.
- Jika external tiles gagal, jangan menyamarkan fallback. Tampilkan source ID, koordinat, provenance dan banner status tile. Gambar tetap konteks lokasi, bukan bukti plume.
- Jika menu, source record atau baseline tidak muncul, hentikan capture dan periksa log di `/tmp`; jangan membuat overlay seolah aksi berhasil.
- Jika file JSON gagal diverifikasi, unduh kembali laporan asli. Jangan meneruskan adegan tamper jika kondisi awal belum lulus.

## Hasil delivery

ZIP Notion disiapkan lokal; halaman Notion belum diimpor atau diterbitkan. MP4 dibuat lokal; belum diunggah. Render Blueprint berstatus siap diperiksa tetapi layanan belum dibuat. Public deployment memerlukan persetujuan terhadap exact source commit dan pembuatan layanan.
