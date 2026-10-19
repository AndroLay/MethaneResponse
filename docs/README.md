# Panduan repository MethaneResponse

Dokumentasi ini menjelaskan produk, susunan kode, arsitektur, dan cara bekerja di repo. **Panduan aktif diselaraskan dengan working tree pada 18 Oktober 2026.** Bukti tes, riset, dan materi demo mempertahankan tanggal serta revisi asalnya.

## Urutan membaca

### Baru mengenal proyek

1. [README produk](../README.md): masalah yang ditangani, kemampuan, quick start, dan batas.
2. [Alur penggunaan](product/user-workflow.md): perjalanan dari memilih sumber hingga laporan dan tindak lanjut.
3. [Peta repository](repository-map.md): lokasi kode, data, konfigurasi, dan alat bantu.
4. [Arsitektur sistem](architecture/overview.md): hubungan web, API, pipeline, penyimpanan, dan layanan opsional.
5. [Aliran data dan audit](architecture/data-flow.md): bagaimana data berubah menjadi penilaian yang dapat ditelusuri.
6. [Status implementasi](release/current-implementation-status.md): kemampuan saat ini dan bukti yang tersedia.

### Akan menjalankan atau mengembangkan kode

Ikuti [setup lokal](development/local-setup.md) → [konfigurasi](development/configuration.md) → [panduan perubahan](development/contributing.md) → [referensi API](architecture/api-reference.md) → [pengujian](testing/README.md). Gunakan [glosarium](glossary.md) untuk istilah domain dan teknis.

### Akan memeriksa klaim atau keputusan proyek

Mulai dari [data dan claims](product/data-and-claims.md), [trust dan transparansi](product/trust-and-transparency.md), serta [keputusan tanpa database](architecture/decisions/2026-10-15-local-prototype-no-database.md). Lanjutkan ke [riset](research/README.md) dan [bukti bertanggal](evidence/README.md).

Untuk review pakar P4, gunakan [checklist pemeriksaan](testing/p4-review-checklist.md): 12 area, fokus tiap kasus, format temuan dan syarat pemeriksaan ulang.

P5/P6 sudah [selesai dalam cakupan agent](evidence/p5-p6-agent-completion-2026-10-18/README.md): 48 tugas manual/app, 72 klaim test per konteks agent, analisis hasil, perbaikan verifier serta 708 tes lokal lulus. Studi pengguna manusia/gold independen/provider benchmark tetap belum terpenuhi. [Paket awal dan runbook](evidence/p5-p6-agent-evaluation-2026-10-18/README.md) dipertahankan sebagai bukti historis.

[Hasil pemeriksaan bundle riset P4](research/p4-research-bundle-assessment-2026-10-18.md) mencatat 30 replay yang dicocokkan dengan kode, triase temuan dan bug input tambahan; hasil manusia masih menunggu pelaksanaan.

## Isi dokumentasi

| Bagian | Isi | Titik masuk |
|---|---|---|
| Product | Alur pengguna, arti data, MARS, recurrence, dan batas kepercayaan | [product](product/README.md) |
| Architecture | Komponen, data lifecycle, kontrak API, peta, dan keputusan | [architecture](architecture/README.md) |
| Development | Setup, konfigurasi, cara mengubah kode, UI dan performa | [development](development/README.md) |
| Testing | Perintah pemeriksaan, browser terisolasi, dan protokol benchmark | [testing](testing/README.md) |
| Release | Status lokal, opsi hosting, serta persyaratan kompetisi | [release](release/README.md) |
| Research | Sumber ilmiah, inventaris hak, riset kandidat, dan landscape bertanggal | [research](research/README.md) |
| Demo | Skrip, caption, dan paket presentasi Notion lokal | [demo](demo/README.md) |
| Evidence | Rekaman tes, screenshot, manifest dan checksum dari run tertentu | [evidence](evidence/README.md) |
| Plans | Rencana implementasi beserta status dan referensi hasil | [plans](plans/README.md) |
| History | Keputusan/pekerjaan lama, checkpoint, serta asumsi yang digantikan | [history](history/README.md) |

## Sumber kebenaran dan cara membaca arsip

| Pertanyaan | Acuan |
|---|---|
| Apa yang dijalankan saat ini? | Source code dan manifest, dibantu [status aktif](release/current-implementation-status.md) |
| Mengapa desain ini dipilih? | [Keputusan arsitektur](architecture/decisions/2026-10-15-local-prototype-no-database.md) dan rencana bertanggal |
| Dataset mana yang dipakai? | [Provenance aktif](../data/real/README.md) dan manifest/hash yang dirujuk |
| Apa yang benar-benar diperiksa? | Rekaman run di [evidence](evidence/README.md), berikut revisi, tanggal, kondisi dan keterbatasannya |
| Apa persyaratan acara terkini? | Sumber resmi yang ditautkan dalam [catatan acara](release/event-requirements.md); halaman itu mencatat pemeriksaan terdahulu |

Dokumen **panduan aktif** menjelaskan working tree; perubahan lokal belum tentu sudah masuk commit publik. Dokumen **arsip** menjelaskan kondisi pada tanggalnya. Proposal arsitektur lama yang menyebut PostgreSQL/PostGIS tidak menjadi instruksi setup saat ini. Catatan **protokol/rencana** menjelaskan pekerjaan yang direncanakan; hasil hanya ada bila ditautkan ke bukti pelaksanaan.

Manifest evidence menyimpan checksum file yang diperiksa pada run asal. Perubahan dokumentasi dapat membuat checksum dokumen saat ini berbeda dari snapshot tersebut; checksum lama tetap dipertahankan sebagai bukti historis dan tidak diperbarui untuk menyerupai run baru.

## Konvensi

- Bahasa panduan utama: Bahasa Indonesia. Label UI, identifier, nama layanan, kutipan, dan arsip dapat berbahasa Inggris.
- Jalankan perintah dari root repo kecuali dinyatakan lain. Path relatif di panduan mengikuti root saat disebut sebagai path kode.
- Data asli, data turunan, dan fixture **DEMO** memiliki peran berbeda; lihat [peta repo](repository-map.md).
- Untuk memperbarui dokumentasi, ikuti [pemeliharaan dokumentasi](development/contributing.md#pemeliharaan-dokumentasi).


**P4 terbaru:** [perbaikan riset F01–F13](research/p4-research-remediation-2026-10-18.md) dan [paket review v2](evidence/domain-review-remediation-2026-10-18/README.md). Bukti engineering dipisahkan dari review domain manusia yang belum dilakukan.
