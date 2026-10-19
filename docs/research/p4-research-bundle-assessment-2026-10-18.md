# Pemeriksaan bundle riset P4 — 18 Oktober 2026

**Jenis:** triase riset berbantuan AI dan pemeriksaan implementasi lokal. **Status P4:** review manusia belum dilakukan. Dokumen ini mencatat hasil pemeriksaan bundle yang diberikan pengguna serta perbedaannya dengan konteks repo.

[Checklist P4](../testing/p4-review-checklist.md) · [Paket review yang dibekukan](../evidence/domain-review-preparation-2026-10-18/README.md) · [Protokol manusia](../testing/domain-expert-review.md)

## Bahan yang diterima

Arsip asal: `/home/andro/Downloads/MethaneResponse-P4-research-bundle-2026-10-18.zip`, 15.222 bytes.

SHA-256: `e4a014622a37933161e7449cf8c6bef80b66ff24aab8acdca905e29272223d73`.

Lima berkas berisi README, laporan riset, CSV 30 eksperimen, CSV 12 temuan OPEN, dan port JavaScript dari potongan metode reviewer ZIP. Integritas CRC arsip lulus; tidak ada path absolut/traversal atau anggota terenkripsi. Seluruh dokumen dan kode dibaca secara lokal. Skrip dalam arsip tidak dijalankan.

Laporan menyatakan penilainya berbantuan AI, tanpa akses repo lengkap atau paket baseline fase B. Batas tersebut konsisten dengan bahan awal yang diberikan. Pernyataan bahwa comparison ZIP tidak diterima bukan bukti bahwa comparison ZIP belum tersedia di repo.

## Pemeriksaan yang dilakukan

1. Membaca lima anggota arsip, termasuk seluruh perubahan M01–M18 dan ledger F01–F12.
2. Membandingkan temuan dengan fungsi `assess`/`claimEvidence`, schema evidence/scope/human input, route API dan penyajian web saat ini.
3. Merekonstruksi 12 kasus dan 18 perubahan dalam pemeriksa sementara buatan sendiri, lalu mengimpor fungsi TypeScript repo yang sebenarnya. Kode port dari ZIP tidak dipakai sebagai executable.
4. Membandingkan hasil fungsi dengan 30 keluaran pada CSV. Menguji parsing schema input manusia pada fixture DEMO; ini bukan catatan penilaian pakar.
5. Mereproduksi masalah URL pada handler Hono melalui `app.request`, otorisasi fixture dan `MemoryAuditStore`. Tidak ada server jaringan, deployment, penyimpanan persisten atau provider yang dipakai.
6. Memeriksa sumber primer untuk konteks kamus MARS dan metadata publikasi ilmiah yang disebut laporan. Tidak membaca atau menyalin PDF laporan publisher.

## Hasil utama

**30 dari 30 hasil fungsi mentah cocok** dengan CSV: 12 kasus dasar dan 18 perubahan. Ini mengonfirmasi perilaku program pada input tersebut. Angka itu bukan akurasi ilmiah, 30 observasi lapangan, gold label manusia, atau bukti bahwa 30 request API akan diterima.

### Perbedaan fungsi mentah dengan validasi aplikasi

| Kasus | Hasil fungsi mentah | Hasil pemeriksaan lapisan input saat ini |
|---|---|---|
| M03: reference dihapus | `supported` | Schema Evidence dan input manusia menolak reference yang hilang |
| M04: follow-up reference berisi spasi | `supported` | Validator input manusia melempar `TypeError`; ditemukan bug tambahan F13 di bawah |
| M08: scope dihapus | `supported` | `HumanAssessmentInput` mewajibkan scope. Baseline legacy memang menerima scope opsional |
| M09: reference bantahan dihapus | `contradicted` | Schema Evidence dan input manusia menolak reference yang hilang |
| M11: spasi ekstra pada scope recipient | `insufficient_evidence` | Schema scope memangkas spasi; baseline setelah parsing menjadi `supported` |
| M13: timestamp ber-offset pada reference manusia | `supported` | Input manusia menerima tanggal kalender, sehingga timestamp tersebut ditolak; fungsi evidence generik tetap mempunyai perilaku substring tanggal |

Enam variasi ditolak melalui hasil validasi schema: M03/M05/M08/M09/M12/M13. M04 menghasilkan exception, bukan penolakan validasi yang tertangani. Ini perlu dibedakan saat melaporkan hasil.

Input manusia dibentuk dari fixture DEMO dengan locator dan field wajib untuk memeriksa parsing. Keberhasilan parsing tidak membuktikan autentikasi, source resolution atau penerimaan endpoint. Route baseline juga tidak menerima array evidence sewenang-wenang dari request; evidence diambil dari sumber server.

## Triase F01–F12

Seluruh disposition berikut adalah penilaian implementer atas laporan; bukan status resolved atau recheck oleh pakar.

| ID | Hasil pencocokan dengan repo | Tindak lanjut |
|---|---|---|
| F01 | Risiko makna label relevan. Baseline hanya membaca jenis/scope metadata; UI dan bundle sudah menyatakan batasnya serta memisahkan human assessment | Prioritaskan penilaian kecukupan bahasa/status dan gerbang substantif oleh pakar. Jangan menganggap field lengkap sebagai verifikasi fisik |
| F02 | Tag bantahan memang menentukan hasil fungsi; varian tanpa reference ditolak pada schema. Substansi dokumen tetap belum diperiksa otomatis | Pertahankan kontrol input; review hubungan exact claim, isi bantahan dan pertanggungjawaban reviewer |
| F03 | Bypass pada fungsi tanpa scope dapat direproduksi. Human input wajib scope; kompatibilitas baseline tanpa scope tercatat pada tes yang sudah ada | Evaluasi penguatan fungsi tanpa merusak bundle/API legacy secara diam-diam; jangan menyebutnya bypass human endpoint |
| F04 | Teks tindakan tidak diuji semantiknya oleh baseline. Human input sudah memeriksa sourceId; pembuat assessment juga memeriksa observation membership | Review kecukupan hubungan tindakan/aset/isi dokumen. Klaim bahwa seluruh linkage tidak ada perlu dipersempit |
| F05 | R02 memang insufficient. Notifikasi agregat dipisahkan dari bukti penerima pada kode dan UI | Masukkan ke review interpretasi; event log sent/delivered/received merupakan usulan fungsi/integrasi lanjutan, belum kewajiban baru yang disepakati |
| F06 | Publisher links, metadata dan assessed references sudah dibedakan; tidak ditemukan reproduksi pencampuran otomatis dari bahan ini | Minta pakar menilai kecukupan penyajian. Jangan langsung menyatakan bug pencampuran terkonfirmasi |
| F07 | Batas non-detection, feedback dan klaim pengurangan emisi sudah dijelaskan. Paket ini tidak menyediakan denominator pengamatan valid atau estimasi penurunan | Review kecukupan penjelasan/next request. Perhitungan MRV tambahan memerlukan data dan metode tersendiri |
| F08 | Substring tanggal terkonfirmasi pada fungsi generik; varian timestamp manusia ditolak oleh schema tanggal | Tetapkan kontrak waktu sebelum mengubah normalisasi; bedakan tanggal kalender manusia dari instant observasi publisher |
| F09 | Asimetri trim terdapat pada pemanggilan fungsi langsung; schema scope sudah trim | Tidak direproduksi pada input yang telah diparse. Penguatan fungsi langsung boleh dievaluasi sebagai pertahanan tambahan |
| F10 | Lisensi dataset dan batas penggunaan sudah dicatat pada data serta paket | Pertahankan atribusi dan batas hak; keputusan penggunaan komersial memerlukan pemeriksaan tersendiri sesuai tujuan penggunaan |
| F11 | Perbedaan bulan pada metadata ARG belum berhasil diverifikasi ulang dari halaman primer pada pemeriksaan ini | Tetap unverified. Pertahankan periode kasus dan jangan menambahkan bulan konfirmasi hasil dugaan |
| F12 | Pakar/hasil/recheck manusia memang belum ada. Comparison ZIP sudah tersedia dan sengaja diberikan setelah fase A | P4 tetap in progress; jalankan fase manusia sesuai protokol setelah pakar tersedia |

## Temuan tambahan F13 — URL invalid menghasilkan error server

**Status:** confirmed lokal, belum diperbaiki. **Jenis:** bug penanganan input; prioritas teknis pertama dari intake ini.

`SecureReference` menjalankan `new URL(value)` di dalam `.refine` tanpa menangani kegagalan parsing. Pada dependency Zod yang terpasang, pemeriksaan lanjutan itu masih dapat berjalan ketika string telah gagal pemeriksaan URL sebelumnya. Akibatnya `safeParse` melempar `TypeError`.

Reproduksi memakai dua request DEMO terotorisasi ke handler `/api/human-assessments` dengan input selain URL yang berbentuk benar:

| Field yang diubah menjadi lima spasi | Status aktual | Perilaku yang diharapkan |
|---|---|---|
| `evidence[0].reference` | **HTTP 500** | Penolakan input invalid, **HTTP 400** |
| `evidence[0].followUpReference` | **HTTP 500** | Penolakan input invalid, **HTTP 400** |

Error terjadi saat parsing, sebelum penyimpanan assessment. Ini tidak membuktikan bypass yang menghasilkan assessment valid atau kebenaran fisik. Request lokal menggunakan identitas fixture dalam proses sementara, bukan identitas pakar atau perubahan konfigurasi operasional.

**Acuan:** [validator](../../packages/shared/src/index.ts:236), [route parsing](../../apps/api/src/app.ts:650).

**Perbaikan yang perlu diuji:** parsing URL harus menghasilkan validation failure secara aman untuk string invalid; pertahankan syarat HTTPS dan penolakan credentials dalam URL. Regresi mencakup reference utama/follow-up, string kosong/spasi/malformed, skema terlarang, URL berisi credentials dan URL HTTPS yang valid. Temuan ini belum boleh diberi status fixed sebelum perubahan dan pemeriksaan dilakukan.

## Sumber primer dan batas pembacaan

- [Kamus MARS](https://methanedata.unep.org/dict-mars-plumes), diperiksa 18 Oktober 2026: mendukung pemisahan source/plume, satuan flux/SD, flag agregat, catatan requantification dan notice lisensi. Dokumen ini tidak mengubah snapshot kasus yang dibekukan.
- [Record PubMed penelitian Reuland dkk.](https://pubmed.ncbi.nlm.nih.gov/42875571/): judul/DOI, tanggal publikasi serta jumlah 746 events dan 12 satelit pada abstrak mendukung identitas penelitian yang disebut bundle. Angkanya tidak ditransfer menjadi performa MethaneResponse. Artikel penuh Nature gagal diakses melalui alat karena redirect autentikasi; tidak dilakukan review penuh metodologi atau supplementary data.
- [Item publisher ARG](https://wedocs.unep.org/handle/20.500.11822/44120) gagal dibuka ulang melalui alat; dugaan perbedaan March/May tidak diangkat menjadi fakta terverifikasi.

## Urutan tindak lanjut

1. Perbaiki F13 dengan regresi input dan pemeriksaan handler; catat bukti baru tanpa menimpa evidence lama.
2. Evaluasi penguatan kelengkapan reference/follow-up pada fungsi mentah dan kompatibilitas scope legacy. Uji lapisan fungsi dan lapisan input secara terpisah.
3. Bawa risiko F01/F02/F04 serta kecukupan bahasa F05–F08 ke review domain. Perubahan status/schema memerlukan desain kompatibilitas dan bukti yang sesuai.
4. Lanjutkan fase A/B/C manusia, perbaikan material dan recheck. Riset ini menjadi bahan kerja tambahan; hasil pakar tetap belum tersedia.

Pada intake ini fungsi aplikasi tidak diubah. Dokumen dan ZIP P4 yang sudah dibekukan mempertahankan bytes, versi dan checksum asal. Pemeriksaan lokal ini tidak menjalankan ulang full gate/browser P3 atau memenuhi pilot P5/benchmark P6.
