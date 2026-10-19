# Workflow dan pembeda yang dapat ditunjukkan

[Indeks](README.md)

## Manual arsip publisher dibanding aplikasi

Pembanding manual di sini memakai packet metadata MARS lokal dengan snapshot yang sama. Ini bukan pengujian portal resmi live. Walkthrough agent memeriksa fungsi; ia belum mengukur manfaat atau waktu pengguna manusia.

| Tugas | Packet/manual | MethaneResponse | Nilai yang dapat ditunjukkan / batas |
|---|---|---|---|
| Menelusuri source/observasi | Baca field/ID/tanggal/flux/uncertainty dan provenance | Source detail, tabel observasi dan snapshot di satu alur | Mengurangi perpindahan struktur dokumen adalah hipotesis manfaat; belum time-saving manusia terukur |
| Memprioritaskan pemeriksaan | Susun alasan dari jumlah/tanggal/flux/uncertainty | Heuristik dan panel input/alasan | Skor dapat diinspeksi; bukan probabilitas emisi atau keputusan operasional otoritatif |
| Menilai respons/mitigasi | Tafsirkan kecukupan packet; minta isi bukti yang belum tersedia | Scope/event/recipient dan coverage checklist; penilaian manusia terpisah; Document AI opsional | Metadata alone tidak memutuskan kebenaran proposisi penuh. App tidak menambah bukti fisik yang tidak ada di packet |
| Handoff dan revisi | Catatan/file terpisah; proses/otorisasi tergantung tim | Shared casework, next action, CAS/history, audit revision serta consent publikasi | Kemampuan lokal sudah punya evidence P1/P3; bukan adopsi nyata atau layanan multi-instance |
| Koreksi publikasi | Mekanisme tergantung kanal penerbit | Status current/superseded/withdrawn, lineage, riwayat | Metadata publikasi server tidak bersignature; salinan lama yang sudah diunduh tidak dapat ditarik kembali |
| Memeriksa export | Gunakan tool/algoritma digest yang sesuai | Export dan browser/CLI verifier | Tamper check dapat dijalankan; integritas bukan autentisitas sumber atau kebenaran fisik |

## Pembanding publik terdekat

Sumbernya [riset 16 Oktober](../../research/competitive-landscape-2026-10-16.md). **Tidak diperiksa ulang pada increment 18 Oktober.** Tautan, keadaan repo/demo, dan klaim pembuat bisa berubah. Tidak ada produk pesaing yang dijalankan pada increment ini; tabel ini tidak menjadi ranking seluruh submission.

| Pembanding | Klaim pembuat yang dicatat pada 16 Oktober | Bukti yang diperiksa saat riset lama | Pelajaran untuk scope MethaneResponse |
|---|---|---|---|
| PLUME | Investigasi metana → escrow → verifikasi perbaikan → settlement | Halaman publik dan struktur/README repo dibaca; preview dan aksi demo dijelaskan sebagai simulasi. Tidak dieksekusi | Alur tindakan/pendanaan lebih luas; produk kita berfokus pada penelusuran kecukupan bukti, handoff dan koreksi |
| Kanopy | Kuantifikasi hutan/karbon, uncertainty dan registrasi | Deskripsi publik dan tautan verifier; transaksi/pengukuran tidak direproduksi | Tampilkan asal angka/uncertainty sebelum mengandalkan hash |
| CarbonTwin | Overlap registry, release steward/adjudikasi/versioning/anchor | Halaman publik dan tautan repo; cakupan rilis baru belum diaudit/diuji | Revision + AI + blockchain bukan kebaruan tersendiri |
| Mizan | Ekstraksi dokumen bersitasi, hitungan dan review manusia/Hedera | Halaman publik dan evaluasi yang dilaporkan pembuat; bukan audit independen atau eksekusi kita | Nilai AI perlu benchmark exact inputs; sitasi cocok teks belum mengautentikasi dokumen |

**Hipotesis pembeda:** satu jejak investigasi respons metana historis dari sumber/tanggal → scope → kecukupan bukti → penanggung jawab/next action → revisi → koreksi publikasi → verifier. Keberadaan alur tersebut dapat didemonstrasikan lokal. Keunggulan kegunaan terhadap manual dan kualitas AI terhadap rules masih perlu hasil studi yang sesuai.

Simpulan yang boleh dipakai sekarang: “Agent berhasil menjalankan bagian alur lokal dan menemukan batas bukti yang ditampilkan aplikasi.” Jangan mengubahnya menjadi klaim pengguna lebih cepat, AI lebih akurat, pengurangan emisi, atau peringkat kompetisi.
