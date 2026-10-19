# Pemeriksaan persiapan oleh penulis paket

**Tanggal:** 18 Oktober 2026. **Jenis:** pemeriksaan dokumenter/implementasi, **bukan temuan pakar manusia**. Tidak ada record pada findings-template.csv yang diisi sebagai hasil reviewer.

## Koreksi yang dilakukan

| ID | Observasi | Perubahan dan batas hasil |
|---|---|---|
| PREP-01 | `docs/product/data-and-claims.md` masih menyatakan anchor/reconcile tidak aktif pada file store, meski P2 sudah mendukung intent durabel dengan opt-in | Uraian diselaraskan dengan runbook P2: Anvil lokal teruji, private/unreviewed audit ditolak, receipt Sepolia belum ada. Tidak ada fungsi chain atau konfigurasi operasional yang diubah |
| PREP-02 | `docs/product/mars-response-workflow.md` masih membatasi continuity pada catatan browser setelah P1 shared queue tersedia | Tabel menyebut mode browser atau shared queue terotorisasi satu writer; pengiriman pesan ke operator/IMEO tetap bukan fungsi aplikasi. Tidak ada klaim hosting/layanan remote baru |

Koreksi ini menutup inkonsistensi panduan. Ia tidak menyelesaikan review domain P4. Hash dokumen setelah koreksi terikat pada paket persiapan; bukti lama tetap sesuai tanggal asal.

## Pertanyaan yang sengaja masih terbuka untuk pakar

- Kecukupan dan risiko bahasa `supported`, `contradicted` dan `mitigation_confirmed` ketika aturan hanya membaca metadata. D02/D03/D05 merupakan kontrol kritik, bukan jawaban benar yang harus diikuti.
- Hubungan exact claim bebas dengan jenis evidence/scope yang diperiksa baseline; kelengkapan metadata tidak memvalidasi semua kalimat.
- Syarat bukti tindakan/follow-up yang layak, cara mengomunikasikan uncertainty dan batas non-detection.
- Pembedaan status laporan publisher dari kemampuan penilaian independen atas bahan yang benar-benar diberikan; tautan saja bukan pemeriksaan isi, dan insufficiency paket tidak membantah laporan publisher.
- Kegunaan next evidence request dan mandat reviewer dalam konteks pengguna yang relevan.

Pertanyaan ini belum dinilai manusia dan tidak diberi status resolved. Jika ada temuan material, lakukan perbaikan nyata yang relevan dan minta recheck; disclaimer saja tidak menutupnya.

## Review kelengkapan paket

Review agent read-only memeriksa risiko klaim hasil pakar, formulir yang memandu jawaban, fase baseline terpisah, source/scope, hak bahan dan consent. Tidak ditemukan masalah konsekuensial pada isi yang ditinjau. Reviewer menandai tautan ledger persiapan yang belum ada ketika proses penulisan berlangsung; berkas ini dan artefak ZIP/manifest kemudian dilengkapi dan diperiksa. Agent tidak bertindak sebagai pakar, tidak memberi gold label dan tidak menggantikan consent manusia.

Pemeriksaan mekanis akhir tercatat dalam manifest: reproduksi kasus/baseline, TypeScript utility, binding sumber P3, path/fences dokumen, integritas isi ZIP dan checksum. Ini membuktikan kesiapan paket, bukan validitas ilmiah metode.
