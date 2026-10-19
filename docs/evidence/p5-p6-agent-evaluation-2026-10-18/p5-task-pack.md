# P5 — paket tugas dan fasilitator

[Indeks](README.md) · [Protokol](../target-user-pilot-protocol.md)

**Status:** siap untuk persiapan sesi; belum ada peserta manusia. Contoh assignment adalah jadwal, bukan bukti rekrutmen. Jangan memakai hasil agent sebagai jawaban peserta.

## Persiapan yang dibekukan sebelum sesi

1. Pilih 5–8 peserta relevan, di luar penulis proyek. Simpan consent, pengalaman umum dan kontak di lokasi privat; cukup gunakan P01–P08 pada hasil. Tanpa rekaman secara default. Undangan lokal: “Kami menguji alat pemeriksaan bukti historis metana selama 30–40 menit. Yang diuji adalah alatnya. Anda boleh berhenti kapan pun. Kami mencatat tugas, durasi, bantuan dan pemahaman secara anonim; tidak mengukur kemampuan profesional Anda.” Pengiriman undangan dilakukan pemilik melalui kanal yang diizinkan.
2. Bekukan source archive SHA-256, snapshot/archive, waktu UTC, bahan tugas dan answer key. [Manifest engineering](manifest.json) mengidentifikasi sumber yang diperiksa pada increment ini; buat freeze sesi baru bila repo berubah. Catat browser/OS/viewport, URL lokal/remote, AI mati, status peta/fallback dan jaringan di catatan fasilitator privat.
3. Gunakan **LBY_S_143 (A)** dan **CAN_S_002 (B)** untuk calon pasangan: masing-masing satu plume, source flags dan tautan laporan tanpa body. Casebook aktif: `data/real/mars_casebook_2026-10-15.json`. Ini pasangan kompleksitas rekaman, bukan bukti kesetaraan kesulitan; pertanyaan exit juga menanyakan perbedaan kesulitan. KAZ/ARG pada eksplorasi agent tidak digabung dengan calon pasangan ini.
4. Siapkan packet manual dari field source/plume casebook yang sama, provenance dan lisensi. Akses body laporan tidak diperlukan/diizinkan oleh paket ini. AI/provider mati pada kedua kondisi. Jangan menyertakan kunci jawaban dalam lembar peserta. Packet berisi metadata publisher arsip, sehingga pembandingnya **manual pada arsip yang disediakan**, bukan uji layanan MARS live.
5. Lakukan technical rehearsal oleh fasilitator, di luar denominator peserta. Perbaikan build setelah sesi memerlukan freeze dan recheck terpisah.

## Assignment counterbalanced

| Kode | Kondisi pertama | Kondisi kedua |
|---|---|---|
| P01 | Manual A | App B |
| P02 | App A | Manual B |
| P03 | Manual B | App A |
| P04 | App B | Manual A |
| P05 | Manual A | App B |
| P06 | App A | Manual B |
| P07 | Manual B | App A |
| P08 | App B | Manual A |

Bekukan hanya 5–8 slot peserta yang benar-benar disepakati sebelum sesi pertama. Urutan workflow dan urutan kasus diseimbangkan secara terpisah. Peserta yang mulai lalu tidak menyelesaikan tugas tetap dicatat; jangan menghapus kasus sulit.

## Lembar peserta

**T1 — Cari sumber.** Temukan ID sumber, snapshot, tanggal observasi terakhir, flux, uncertainty dan unit. Apakah ini pengukuran saat ini? Sebutkan batas yang Anda lihat.

**T2 — Prioritaskan.** Tentukan apakah sumber layak diperiksa lebih lanjut. Jelaskan dua sinyal historis dan satu keterbatasan. Bila memakai skor aplikasi, jelaskan apa yang dihitung dan apa yang tidak dapat disimpulkan. Tidak ada satu jawaban prioritas “benar”; ketepatan menilai alasan dan batas, bukan memilih skor tertentu.

**T3 — Nilai bukti respons.** LBY: “Sebelum akhir April 2026, perbaikan sumber LBY_S_143 telah dikonfirmasi melalui pengukuran methane pascatindakan.” CAN: “Sebelum akhir Juli 2026, perbaikan sumber CAN_S_002 telah dikonfirmasi melalui pengukuran methane pascatindakan.” Dengan **metadata yang disediakan saja**, apakah bukti cukup? Sebutkan bukti yang dibutuhkan berikutnya. Pada app pilih mitigation coverage, rentang dari tanggal observasi hingga akhir bulan klaim. Baseline memeriksa cakupan referensi; ia tidak membaca atau memutuskan seluruh proposisi bahasa alami. Tidak membuka Document AI/provider.

**T4 — Simpan dan periksa integritas.** Simpan hasil, periksa export yang disediakan, ubah salinan satu field lalu periksa kembali. Jelaskan perbedaan integritas file/versi dan kebenaran kejadian fisik. Pada app, export baseline yang baru dibuat dan gunakan verifier lokal. Pada manual, berikan export baseline identik yang disiapkan fasilitator pada freeze tersebut, lalu gunakan `bun run verify:audit <file.json>` dan salinan tampered. Catat waktu **verifikasi saja** untuk perbandingan T4; penciptaan/export app dicatat sebagai kemampuan tambahan secara terpisah. Memberikan export adalah perlakuan studi yang harus disebutkan pada laporan, bukan kemampuan native portal MARS.

## Kunci fasilitator — jangan diberikan sebelum tugas

| Field | A: LBY | B: CAN |
|---|---|---|
| Observasi terakhir dalam casebook | 2025-12-23T10:08:43 UTC | 2026-04-10T19:07:29 UTC |
| Flux ± uncertainty | 537 ± 240 kg/h | 1044 ± 370 kg/h |
| Jumlah plume tertaut | 1 | 1 |
| Snapshot | `unep-mars-675417694883` | Sama |
| Source notified / feedback | Yes / Yes | Yes / Yes |
| Body laporan | Tidak disertakan | Tidak disertakan |
| Jawaban T3 | Insufficient evidence / insufficient reference coverage; perlu isi bukti tindakan dan follow-up yang sesuai | Sama |
| Jawaban T4 | Export asli lolos digest; salinan dengan field berubah ditolak. Digest bukan bukti reparasi, autentisitas dokumen, atau emisi nol | Sama |

T1 benar bila menyebut ID/snapshot/tanggal/flux/uncertainty/unit serta historis. T2 benar bila alasan dapat ditelusuri, menangani ketidakpastian dan tidak menafsirkan heuristik sebagai probabilitas methane masa depan. T3 benar bila membatasi pada packet dan meminta bukti tindakan/follow-up; judul publisher bukan body yang telah diperiksa. T4 benar bila mendeteksi perubahan serta menyatakan batas hash. Koreksi source dapat mengubah kesimpulan kemudian; packet ini tidak membantah kesimpulan publisher di laporan yang belum dibaca.

## Pencatatan dan analisis

Mulai timer pada prompt, hentikan saat jawaban akhir/menyerah. Bantuan: `none`, `repeat_prompt`, `navigation_hint`, `substantive_hint`; ulang prompt boleh, jangan memberi jawaban. Ketepatan: `correct`, `partly_correct`, `incorrect`, `abstained`. Durasi tidak tercatat ditulis `null`, bukan nol. Minta confidence 1–5; agent tidak diberi confidence manusia buatan.

Setelah kedua kondisi tanyakan tiga pertanyaan exit: apakah (1) feedback, (2) hilangnya observasi, atau (3) skor/hash membuktikan perbaikan fisik? Simpan setiap jawaban sebagai Boolean belief; `true` berarti salah paham masih ada. Catat kebingungan/komentar terpisah secara privat. Kesalahan kritis selama tugas memerlukan perbaikan dan recheck pada freeze baru walau jawaban exit berubah benar.

Alat `services/data-pipeline/pilot_study.py` menerima study JSON, task JSONL dan exit JSONL di direktori **0700** di luar repo; file **0600**. Format tepat tersedia pada [tes yang dapat direproduksi](../../../services/data-pipeline/tests/test_pilot_study.py). Gunakan struktur, bukan data fixture tes, untuk hasil nyata. `studySha256` pada setiap task adalah hash canonical JSON study dari fungsi `study_digest`.

```bash
cd services/data-pipeline
uv run --locked python pilot_study.py \
  --study /restricted/study.json --tasks /restricted/tasks.jsonl \
  --exits /restricted/exits.jsonl --output /restricted/pilot-analysis.json
```

Analisis menampilkan scheduled/recorded/missing per T1–T4/kondisi, bantuan, ketepatan, confidence, durasi termasuk tugas gagal, pasangan lengkap/tidak lengkap dan selisih manual-minus-app (termasuk versi tanpa bantuan substantif). Nilai positif bukan klaim penghematan waktu populasi. Semua hasil dari build lain ditolak lewat hash study. Salah paham atau data tidak lengkap menghambat penutupan. Hasil agent selalu gagal gerbang manusia walau seluruh jawaban benar. Ringkasan masih privat sampai consent/disclosure review disetujui.

**Gerbang manusia:** 5–8 peserta relevan/independen, minimal `ceil(0.8*n)` penyelesaian benar tanpa bantuan substantif untuk setiap T1/T3/T4, nol exit belief kritis, seluruh tugas berpasangan tercatat dan temuan material ditutup. Nilai studi terbatas pada pemahaman/kegunaan tugas ini.

**Lisensi data:** UNEP IMEO Eye on Methane/MARS, CC BY-NC-SA 4.0; perubahan: pemilihan metadata kasus dan tugas evaluasi. Provenance lengkap pada [data/real](../../../data/real/README.md). Izin dataset tidak dianggap izin memproses body laporan linked.
