# Runbook demo lokal (Bahasa Indonesia)

## Tujuan dan batas

Video story v4 berdurasi **4:50** dan memperagakan alur aktual: pilih kasus historis KAZ_S_159 → periksa rujukan UNEP → lihat observasi diskret → tetapkan cakupan 11 Juli 2026 UTC → jalankan baseline rules untuk klaim mitigasi → catat tindak lanjut lokal → ekspor dan verifikasi laporan → ubah salinan → pilih ulang file asli. Ini bukan demo AI live, receipt blockchain, keputusan regulator, maupun validasi fisik perbaikan.

## Menjalankan capture ulang

Prasyarat lokal pada run ini: Bun, Chromium (`/usr/bin/chromium`), ffmpeg/ffprobe, Python 3, NumPy, dan font DejaVu Sans. Model Kokoro ONNX lokal diperlukan untuk membuat suara. Jangan menambahkan kredensial ke shell atau browser.

1. Dari root repository, jalankan `bun run build:web`.
2. Rekam UI aktual: `METHANE_DELIVERY_DURATION_SECONDS=290 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bash scripts/capture-delivery-demo.sh`. Capture menggunakan API preview ephemeral, environment terisolasi, Chromium sandbox, dan direktori temp workspace dengan alias pendek agar tidak bergantung pada kuota `/tmp`.
3. Buat musik orisinal: `python3 scripts/generate-demo-music.py delivery-output/story-v4/original-instrumental.wav 290`.
4. Buat narasi dengan `scripts/generate-demo-narration.py` menggunakan `narration-en.json`, model dan voice pack Kokoro lokal, lalu tulis ke `delivery-output/story-v4/narration-story-v4-final.wav`.
5. Render dengan `METHANE_DELIVERY_DURATION_SECONDS=290 METHANE_DELIVERY_OPENING_STILL_SECONDS=2 METHANE_DELIVERY_OPENING_STILL=delivery-output/story-v4/assets/01-case-directory.png bash scripts/render-delivery-narrated-demo.sh`. Screenshot aplikasi nyata menutup dua detik pemuatan awal; UI interaktif kemudian berjalan sesuai capture. Script memeriksa durasi, codec, frame count, sample rate, dan decode penuh.

Script menolak menimpa output video yang sudah ada. Gunakan `METHANE_DELIVERY_OUTPUT_DIR` untuk direktori output baru. Capture terbaru disimpan di `delivery-output/story-v4/`; paket lama 16 dan 18 Oktober tidak ditimpa.

## Alur presenter bila menjalankan ulang secara manual

1. Buka halaman lokal hasil production build dan pastikan badge menyebut preview/historical data.
2. Pilih `KAZ_S_159`; pertahankan atribusi peta. Jangan menyebut feed “live”.
3. Di Case, tampilkan tiga observasi EnMAP dan nilai ±. Jelaskan sebagai observasi diskret dengan ketidakpastian yang dilaporkan.
4. Di Evidence Auditor, tunjukkan bahwa katalog UNEP memberi bulan tindakan di Juli 2026, sedangkan isi laporan dan hari tindakan tepat tidak ada di bundle.
5. Pilih event 2026-07-11, gunakan hari observasi dan tekan Apply. Jalankan `mitigation_confirmed` saja. Jelaskan bahwa `insufficient evidence` berlaku pada bundle dan scope ini; hasil itu tidak membantah ringkasan UNEP atau membuktikan tindakan gagal.
6. Simpan casework lokal yang meminta tanggal aksi dan bukti lanjutan yang sesuai metode. Jangan menyebutnya sebagai permintaan yang telah dikirim.
7. Unduh JSON dari Reports, pilih file yang sama di verifier, lalu tampilkan digest dan checksum konteks yang cocok. Sebutkan bahwa tidak ada receipt blockchain.
8. Pilih salinan JSON yang diubah pada field yang masuk ke bundle hash; tampilkan kegagalan. Pilih ulang file asli dan tunjukkan validasi lokal kembali cocok.
9. Tutup: pemeriksaan membuktikan konsistensi terhadap hash yang tersimpan pada file, bukan identitas penerbit atau kebenaran fisik.

## Reset dan fallback

- Capture otomatis memakai store API sementara baru; tutup browser/API setelah proses selesai. Untuk menjalankan lagi, pilih output folder baru.
- Jika external tiles gagal, jangan menyamarkan fallback. Tampilkan source ID, koordinat, provenance dan banner status tile. Gambar tetap konteks lokasi, bukan bukti plume.
- Jika menu, source record atau baseline tidak muncul, hentikan capture dan periksa log di `/tmp`; jangan membuat overlay seolah aksi berhasil.
- Jika file JSON gagal diverifikasi, unduh kembali laporan asli. Jangan meneruskan adegan tamper jika kondisi awal belum lulus.

## Hasil delivery

Materi presentasi disiapkan lokal untuk review/submission; tidak ada langkah impor atau publikasi Notion. MP4 dibuat lokal; belum diunggah. Render Blueprint berstatus siap diperiksa tetapi layanan belum dibuat. Public deployment memerlukan persetujuan terhadap exact source commit dan pembuatan layanan.
