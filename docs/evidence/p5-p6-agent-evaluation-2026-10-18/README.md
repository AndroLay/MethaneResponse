# P5–P6: evaluasi berbantuan agent dan paket pelaksanaan

**Tanggal:** 18 Oktober 2026. **Jenis bukti:** pemeriksaan agent dan engineering lokal. Pengguna meminta P4 dibiarkan menunggu dan agent digunakan untuk melanjutkan P5/P6.

Paket ini memuat tugas yang dapat dijalankan, sumber/kunci jawaban, alat analisis, hasil agent dan batasnya. Tidak ada sesi manusia, anotasi manusia independen, atau benchmark provider nyata yang ditambahkan. Keputusan aktivasi AI tetap **tidak memenuhi syarat**.

## Mulai dari sini

| Keperluan | Berkas |
|---|---|
| Jalankan pilot P5 | [Panduan tugas dan fasilitator](p5-task-pack.md) |
| Baca hasil agent memakai aplikasi | [Walkthrough agent](p5-agent-walkthrough.md) |
| Bandingkan workflow dan pembeda | [Matriks kemampuan dan bukti](workflow-comparison.md) |
| Jalankan P6 setelah input tersedia | [Runbook evaluasi AI](p6-runbook.md) |
| Periksa label agent sementara | [12 klaim metadata](p6-agent-claims.json) |
| Ulangi coverage rules pada 12 klaim | [Reproducer TypeScript](repeat-agent-metadata.ts) |
| Temuan dan tindak lanjut | [Ledger](findings.md) |
| Periksa hasil teknis dan versi | [Verifikasi](verification.md) · [manifest](manifest.json) · [checksums](checksums.sha256) |

## Arti status selesai

- **P4:** menunggu review manusia; tidak dikerjakan lebih lanjut pada increment ini.
- **P5 engineering/agent:** lihat hasil aktual pada walkthrough dan verifikasi. Alat memisahkan agent dari manusia dan mempertahankan tugas tidak lengkap dalam denominator.
- **P6 engineering/agent:** freeze partition, hash pembanding, ledger kegagalan/latensi dan keputusan manfaat diperkuat. Dua belas label agent hanya menguji pembacaan metadata, bukan gold dokumen.
- **P5/P6 penelitian asli:** tetap belum selesai: perlu peserta nyata untuk P5 serta hak dokumen, dua anotator/adjudikator dan inferensi provider yang diotorisasi untuk P6. Gerbang asli tidak diturunkan.

Paket sumber dan hash adalah binding engineering bertanggal. Sesi manusia harus memakai freeze baru tepat sebelum pelaksanaan dan memeriksa bahwa app/data/material belum berubah. Hasil dari versi berbeda disimpan terpisah.
