# Materi demo dan presentasi

[Pusat dokumentasi](../README.md) · [Status implementasi](../release/current-implementation-status.md)

Direktori ini menyimpan artefak persiapan lokal. Script/caption tidak membuktikan video publik atau submission selesai.

## Cut final v12 — manfaat lebih awal dan presentasi lebih jelas

[Paket produksi v12](delivery-2026-10-19-final-v12/README.md) memulai cerita dari keputusan seorang analis, lalu menjelaskan manfaat produk sekitar detik ke-8. Diagram MARS, ketidakpastian observasi, kalender tindakan, permintaan bukti dan fingerprint memakai bentuk visual berbeda. Panduan aksi diperbesar menjadi 40 px, istilah disederhanakan, zoom formulir diperjelas, dan transisi pengenalan aplikasi dipakai satu kali. Durasi **4:27.92**, dengan seluruh delapan cuplikan aksi aplikasi asli tetap 114 detik. Ekspor, subtitle, manifest dan pemeriksaan baru ada di `delivery-output/story-v12/`. Hasil tetap lokal, suara sintetis, dan batas review audiovisual dicatat dalam paket.

## Cut final v11 — narasi dan timing lebih rapat

[Paket produksi v11](delivery-2026-10-19-final-v11/README.md) memperbarui suara neural Inggris, menyusun 48 cue ucapan, mengikat angka/diagram ke timestamp kata, dan mempertahankan seluruh aksi aplikasi nyata. Durasi **4:08.48**; jeda antarucapan maksimal **2,91 detik**, dibanding 15,25 detik pada audio terdahulu. Cursor, zoom yang stabil, transisi melalui bingkai aplikasi, serta musik instrumental orisinal dipertahankan dan diselaraskan dengan cut baru. Video, subtitle, manifest, dan bukti pemeriksaan berada di `delivery-output/story-v11/`. Ini hasil lokal; belum ada unggahan. Suara tetap sintetis. Batas pemeriksaan artistik dan listening dicatat dalam paket; ekspor teknis tidak berarti penilaian manusia sudah dilakukan.

## Video v10 — zoom, transisi, dan panduan investigasi

[Paket produksi v10](delivery-2026-10-19-directed-v10/README.md) memuat rekaman ulang aplikasi, kamera dengan koordinat pecahan dan jeda membaca, cursor dari event browser, model penjelas, serta transisi melalui satu bingkai aplikasi. Alurnya **Inspect → Scope → Assess → Request → Verify**. Narasi Inggris dan musik story v4 dipertahankan; durasi tetap 4:50. Pemeriksaan teknis, inspeksi frame, dan keterbatasan review dicatat terpisah dalam paket tersebut. Ekspor tetap lokal di `delivery-output/story-v10/`; belum diunggah atau diterbitkan.

## Story v4 — 19 Oktober

[Materi story v4](delivery-2026-10-19-story-v4/README.md) menyusun ulang narasi demo menjadi alur 4:50: mengapa pemeriksaan klaim mitigasi diperlukan, apa yang ditambahkan MethaneResponse pada data historis MARS, bagaimana satu kasus KAZ_S_159 ditinjau, dan apa yang dibuktikan oleh pemeriksaan digest lokal. Materi berisi presentasi, claim ledger, storyboard, runbook, caption, dan screenshot browser dari production build. Voice-over dan musik dibuat lokal; MP4 story v4 terbaru dan bukti teknisnya berada di direktori `delivery-output/story-v4/` yang diabaikan Git.

Materi presentasi tetap lokal dan dapat dipakai untuk Devpost atau review. Tidak ada impor atau publikasi Notion yang menjadi target. Versi 16, 18, dan checkpoint sebelumnya tetap dipertahankan sebagai arsip.

## Arsip materi sebelumnya

[Materi 16 Oktober](notion/README.md) berisi narasi satu kasus, runbook 4:30, claim/evidence ledger, publisher appendix, serta repository decision brief. Materi itu dipertahankan sebagai arsip dan merekam kondisi sebelum increment human investigation dan trust 17 Oktober. Untuk arsitektur/fitur saat ini, gunakan [peta repo](../repository-map.md), [workflow](../product/user-workflow.md) dan status aktif.

Markdown brief dari Reports adalah file lokal yang bisa dipakai dalam dokumen apa pun.

## Script dan caption terdahulu

| File | Status/pemakaian |
|---|---|
| [Caption 3:43](IEEE-ClimateChain-3m43-captions-2026-10-15.srt) | Untuk cut lokal pada checkpoint 15 Oktober; MP4 di luar repo dan belum diunggah dari workspace |
| [Draft caption 4:18](IEEE-ClimateChain-4m18-caption-draft-2026-10-15.srt) | Timing draft terdahulu |
| [Caption 4:38](IEEE-ClimateChain-4m38-captions-2026-10-15.srt) | Hanya dipakai jika sesuai cut yang dipilih |
| [Script 4:40](IEEE-ClimateChain-4m40s-script-2026-10-14.md) | Narasi walkthrough versi 14 Oktober |

Setiap caption mempertahankan timing asli dan perlu diselaraskan sebelum dipakai pada script baru. Perapian dokumentasi tidak mengubah file paket/caption atau membuat video baru.

Rekaman alur asal ada di [checkpoint 15 Oktober](../history/execution-checkpoint-2026-10-15.md) dan [UAT browser](../evidence/live-local-uat-2026-10-14/README.md). Ketentuan kompetisi dicatat di [event requirements](../release/event-requirements.md); tanggal/eligibility mengikuti sumber resmi yang perlu diperiksa pada saat submission.
