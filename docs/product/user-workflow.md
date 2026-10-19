# Alur penggunaan MethaneResponse

[Pusat dokumentasi](../README.md) · [Setup lokal](../development/local-setup.md) · [Alur resmi MARS dan pemetaan produk](mars-response-workflow.md)

**Panduan aktif — 18 Oktober 2026.** Tujuan alur ini adalah mencatat apa yang dapat disimpulkan dari bukti tersedia dan apa yang masih perlu diperiksa. Aplikasi tidak mendeteksi metana baru, mengirim notifikasi operator, atau mengesahkan perbaikan lapangan.

## 1. Pilih dataset dan sumber

Jalankan web/API, lalu buka <http://localhost:5173>. Pilih sumber historis dari **Cases** atau **Map Explorer**; contoh: [KAZ_S_159](http://localhost:5173/dashboard/map?sourceId=KAZ_S_159).

Snapshot bawaan `unep-mars-675417694883` mencakup 4.218 source rows dan 30.414 plume rows sampai 13 September 2026. Sebanyak 6.553 plume rows tanpa source ID tetap tidak tertaut. Casebook empat sumber adalah subset dengan konteks referensi. **Synthetic demo** memakai fixture buatan yang terpisah.

| Workspace | Kegunaan |
|---|---|
| Map Explorer — `/dashboard/map` | Sumber/plume historis, layers, camera focus dan detail kasus |
| Cases — `/dashboard/cases` | Search/filter, 25/50/100 rows per halaman, antrean dan investigasi tersimpan |
| MARS Indicators — `/dashboard/indicators` | Sembilan rilis Top 50 bulanan dan delapan periode response rate negara |
| Evidence Auditor — `/dashboard/audit` | Scope, observasi, coverage, penilaian dan riwayat |
| Documents — `/dashboard/documents` | Referensi terkait source; tautan bukan berarti isi sudah diperiksa |
| Operators — `/dashboard/operators` | Antrean tinjauan metadata notified/feedback; tidak mengontak operator |
| Reports — `/dashboard/reports` | Laporan, brief dan ringkasan transparansi publik |
| Verification Center — `/dashboard/blockchain` | Hash lokal dan status receipt bila benar-benar tersedia |
| Settings — `/dashboard/settings` | Preferensi browser: workspace awal, basemap, kualitas Earth dan sidebar |

**View full case** membuka dialog detail sambil mempertahankan konteks peta. **Open in Map Explorer** memusatkan kamera pada koordinat tersimpan. Lokasi tidak diberi alamat/kota yang tidak disediakan penerbit. Import GeoJSON dibaca lokal browser dan tidak mengganti snapshot server.

## 2. Tinjau observasi dan konteks

Periksa tanggal, plume ID, flux dalam unit penerbit, uncertainty, nilai kosong dan provenance. Observasi adalah titik pengukuran diskret. Source density tidak mewakili konsentrasi metana; imagery lokasi bukan citra plume pada overpass tertentu. Legend/history peta dapat dibuka tanpa mengubah dataset.

MARS `notified` dan `feedback` tetap metadata administratif. Response rate negara menghitung feedback atas sumber yang dinotifikasi; tidak menghitung perbaikan. Top 50 tidak memiliki kolom rank eksplisit, sehingga urutan CSV tidak menjadi peringkat yang direka. Lihat [data dan claims](data-and-claims.md).

Insight recurrence/anomaly dan priority heuristic membantu memilih investigasi. Estimasi recurrence membahas record MARS tertaut berikutnya, bukan probabilitas kebocoran fisik. Prioritas hanya digunakan bila binding snapshot/archive cocok.

<a id="document-assessment-and-human-review"></a>

## 3. Tentukan claim dan scope

Di **Overview**, pilih `source_detected`, `operator_notified`, atau `mitigation_confirmed`. Isi **Period start**, **Period end**, optional **Observation event**, lalu **Apply assessment scope**. Event harus milik source dan berada dalam periode. Untuk notifikasi, sebutkan penerima. Periode perlu mencakup tindakan/follow-up yang ingin dinilai.

**Use loaded observation period** mengisi batas tanggal dari seluruh riwayat yang telah dimuat; **Use selected observation day** membatasi satu event. Periksa preview lalu tekan **Apply assessment scope**. Preset bukan tanggal perbaikan atau periode follow-up. Selama ada edit yang belum diterapkan, **Run rules baseline** dinonaktifkan. Draft scope disimpan per konteks investigasi di SessionStorage dan pulih saat kembali ke halaman ini; jika storage diblokir, peringatan menyebut draft akan hilang saat meninggalkan halaman. Draft scope tidak memunculkan dialog navigasi ketika dapat dipulihkan.

Coverage panel memperlihatkan syarat tipe bukti, referensi yang memenuhi, referensi yang dikeluarkan dan next checks. Preview dan API memakai selector yang sama. Metadata notified/feedback dan link-only reports tetap konteks. Memilih claim tidak otomatis menyimpan penilaian; **Run rules baseline** membuat revisi baseline.

Scoped rules mengeluarkan referensi tanpa tanggal, di luar periode, atau event yang tidak cocok. Notifikasi harus cocok penerima; mitigation-reference support memerlukan action, tanggal tindakan dan follow-up bertanggal sama/setelah tindakan dalam periode. Ini pemeriksaan hubungan metadata, bukan autentikasi referensi.

**Use source-level baseline** menghapus scope untuk jalur legacy. Setiap scope persis mempunyai history sendiri. Editor menunggu dataset selesai dimuat; fallback sementara DEMO tidak dapat diedit sebagai sumber nyata.

## 4. Simpan investigasi kerja

Di **Analyst case work**, isi pertanyaan, working notes, evidence request, next action, serta status: **Investigate**, **Awaiting evidence**, **Deferred**, atau **Review recorded**. **Save case work** menyimpan konteks claim/scope bersama catatan.

- **New investigation** membuat work ID lain untuk sumber/snapshot yang sama.
- **Saved investigations** / **Resume saved investigation** membuka work item tertentu dan memulihkan claim/scope-nya.
- Untuk menyimpan claim/periode berbeda, resume konteks yang dimaksud atau buat investigasi baru terlebih dahulu.
- Cases memfilter status dari seluruh investigasi tersimpan dan mempertahankan pilihan aktif dari Auditor.
- Status kerja adalah triage analis. Mengubah notes/status tidak membuat verdict, mengubah audit lama, atau menandakan perbaikan.

<a id="workflow-continuity-17-october-2026"></a>

### Melanjutkan investigasi bersama

Pilih **Open shared workspace**, lalu hubungkan signed reviewer token yang berwenang di directory tim. **Shared investigations** memuat antrean server; **New shared investigation** membuat pekerjaan lain. Catat assignee, due date dan next action, lalu **Save shared work**. Anggota lain memakai token sendiri untuk melanjutkannya pada API yang sama. Cases menggunakan antrean tim selama terhubung; pembaruan dimuat melalui refresh eksplisit.

Save yang stale ditolak; draft tetap ada. **Review latest revision** memperlihatkan versi server untuk dibandingkan. Pilih versi terbaru, atau tinjau seluruh field sebelum **Keep my draft on this revision** dan save lagi. Riwayat merekam aktor/versi. Jika refresh gagal, data server lama disembunyikan dan save dinonaktifkan; draft dipertahankan.

Untuk notes browser yang sudah ada, **Preview browser import → Import as new shared investigation** membuat ID baru tanpa menghapus notes lokal atau menimpa server. Token hilang saat reload; reconnect diperlukan. Penggunaan bersama masih satu API/file privat lokal, bukan layanan hosted yang sudah diuji. Setup, akses dan pemulihan ada di [runbook](../development/shared-casework.md).

### Recovery draft dan batas penyimpanan

Dalam mode browser-local, notes tersimpan di LocalStorage, terikat real/DEMO mode, source, snapshot/archive dan work ID. Legacy v1 masih dapat dibaca; record v2 tidak menghapus aslinya. SessionStorage menyimpan recovery draft per tab untuk notes dan metadata human assessment yang belum selesai. Navigasi/pergantian konteks dan browser unload memiliki guard untuk edit belum tersimpan.

Token, konfirmasi inspeksi, pilihan retrieval dan consent publikasi tidak dipulihkan. URL berisi userinfo ditolak dari persistence draft; jangan simpan credential, signed-access URL atau isi dokumen di text fields. Draft pulih memerlukan konfirmasi inspeksi baru. **Lock private history** membersihkan recovery manusia dan cache/seleksi privat.

Penyimpanan browser tidak terenkripsi, tidak dibagikan antardevice dan tidak dicadangkan remote. Menutup tab dapat menghapus recovery. Jika storage penuh/diblokir, save ditandai gagal dan draft terlihat tetap tersedia; salinan lama mungkin masih ada. Per-item revision menolak save stale berurutan, tetapi write simultan antartab tidak transactional. Batas tersebut berlaku pada mode lokal; workspace bersama menggunakan CAS dan history server terpisah. Draft kedua mode tetap per tab dan tidak terenkripsi.

## 5. Catat human assessment tanpa AI

Setelah menerapkan scope, buka **Human assessment**:

1. Masukkan exact claim, determination dan rationale yang menjelaskan keputusan.
2. Daftarkan maksimal 12 referensi yang sudah diperiksa: URL HTTPS tanpa credential, page/record locator, tanggal, dan metadata event/penerima/action/follow-up bila relevan. Source terikat ke form dan divalidasi API.
3. Gunakan **Check reviewer approval** untuk melihat status directory kategori; deklarasikan konflik secara terpisah.
4. Bila diinginkan, masukkan expected SHA-256 dan aktifkan **Check public publisher references when saving** untuk URL penerbit yang didukung. Follow-up dapat memiliki URL/digest tersendiri.
5. Isi optional next evidence request, konfirmasi source-inspection, lalu save memakai token scope `review`.

Penilaian manual tidak mengunggah isi laporan atau memanggil model. Retrieval URL hanya dilakukan bila dipilih eksplisit. Status retrieved/digest matched membuktikan asal/bytes yang diperiksa, bukan kebenaran isi. Mismatch digest menghalangi save supported/contradicted; unknown/failed checks tetap terlihat.

Reviewer menentukan outcome sendiri, terpisah dari rules coverage. Supported membutuhkan tipe referensi yang sesuai scope; contradicted membutuhkan matching contrary record; insufficient dapat disimpan tanpa referensi. Konflik bukti memerlukan alasan manusia yang jelas.

Save menghasilkan **schema 4 privat** dengan parent hash, hasil coverage, reviewer assurance, status reference checks dan deklarasi konflik. Revisi berikutnya tidak menimpa revisi lama; parent stale ditolak sampai versi terbaru dibuka. History/digest privat memerlukan token `private_read`, termasuk kebijakan directory yang berlaku. [Panduan konfigurasi](../development/configuration.md) menjelaskan penerbitan capability dan strict mode.

## 6. Tinjau riwayat dan lanjutkan permintaan bukti

Di **Saved audit history**, buka revisi yang diizinkan. **Compare saved assessments** membandingkan dua revisi source/claim/mode yang sama: determination, alasan, review, citations, scope dan binding dataset/dokumen. Memilih perbandingan tidak mengganti laporan yang sedang dibuka. Perubahan verdict/dataset tidak otomatis membuktikan perubahan emisi.

**Add saved request to follow-up** menambahkan permintaan tersimpan ke draft kerja secara eksplisit dengan audit ID/hash lineage. Source, mode, claim, scope, snapshot dan archive harus cocok. Status kerja tidak berubah; save tetap eksplisit. Field penuh dilaporkan tanpa menimpa teks yang sudah ada.

## 7. Ekspor dan bagikan hasil yang sesuai

| Keluaran | Penggunaan |
|---|---|
| JSON audit report | Artefak verifikasi; full human assessment berlabel privat dengan filename `PRIVATE-…` |
| Markdown investigation brief | Ringkasan terbaca/optional import Notion; menghilangkan detail privat dan tidak mereproduksi kutipan dokumen |
| Public transparency summary JSON | Artefak publik allowlist bila consent revisi diberikan; checksum terpisah |

**Download investigation brief** mencakup provenance tersimpan, konteks historis yang diizinkan (hingga 50 baris beserta jumlah total), next checks dan batas. Nilai tidak tersedia tetap unavailable. Brief dapat diedit dan bukan laporan tersertifikasi. Tidak ada integrasi/publikasi Notion otomatis atau PDF generation.

JSON memisahkan baris observasi yang dikutip audit dari `historicalContext`. Jika source/snapshot yang dimuat tidak cocok dengan audit tersimpan, konteks tidak dipaksakan ke laporan. Verifikasi JSON langsung di **Reports → Verify an exported report** atau Verification Center: pilih file hasil unduhan. **Require complete export context** aktif secara default dan memerlukan checksum konteks selain hash bundle. Berkas legacy/raw hanya diperiksa setelah opsi itu dimatikan secara eksplisit; perubahan opsi menghapus hasil dan meminta pilih file lagi. CLI alternatif: `bun run verify:audit path/to/report.json --require-context`. Helper kode tetap kompatibel dengan raw/legacy secara default; kebijakan ketat diteruskan eksplisit oleh UI. Unduhan pada waktu berbeda dapat mempunyai checksum luar berbeda; bundle hash tetap mengidentifikasi revisi yang sama. Checksum tidak ditandatangani dan bukan bukti kebenaran fisik.

### Ringkasan transparansi publik

Saat save human assessment, **I authorize a public redacted summary of this revision** bersifat unchecked secara default, reset setelah save, dan tidak dipulihkan dari draft. Consent membuka field terbatas seperti source/category/outcome/period, counts, status assurance/conflict historis, dan hash bundle. Exact claim, penerima, identitas reviewer, metadata referensi dan rationale tetap privat.

Publik dapat membuka **Reports → Public transparency summaries** tanpa token, menelusuri halaman, mengunduh, dan memverifikasi checksum summary. Default memilih revisi publik terakhir per scope/claim; **Show publication history** membuka versi lama beserta penanda penggantian/penarikan. Koreksi berconsent baru menggantikan versi publik aktif sebelumnya; revisi privat tidak mengubahnya. Reviewer yang masih berwenang dapat menandai **Withdraw publication** dengan alasan baku dan konfirmasi. Salinan lama tetap mungkin tersedia. Checksum offline tidak membuktikan status publikasi saat ini; gunakan **Check current publication status**. [Panduan koreksi/penarikan](../development/publication-lifecycle.md) menjelaskan langkah, izin, konflik versi dan batasnya.

<a id="optional-document-ai"></a>

## Jalur opsional: Document AI

Jalur ini source-level; hapus scope terikat bila ingin memakainya. Import manifest excerpt PDF/TXT atau excerpt rights-cleared. File asli dapat tetap lokal; browser memeriksa manifest dan document hash. Consent pemrosesan eksternal serta provider/token server wajib sebelum excerpt dikirim.

API memvalidasi kutipan persis, dapat abstain, dan membuat schema 3 privat secara default. Reviewer berwenang kemudian approve, reject, atau request more evidence sebagai revisi terpisah. Publikasi lengkap mengikuti consent submitter/reviewer dan aturan schema 3; consent summary manual tidak menggantikannya. Tidak ada klaim benchmark AI independen atau bukti mitigasi dari output model.

## Batas akhir alur

File audit API mendukung satu proses lokal dan restart bila file sama masih tersedia; hosted temporary files dapat hilang. API memiliki anchoring/reconciliation dengan intent durabel; signing nonaktif secara default dan perlu konfigurasi server. Profil Anvil sudah diuji lokal; receipt Sepolia publik belum tersedia. Proyek belum membuktikan manfaat pengguna terukur, perbaikan fisik, atau pengurangan emisi yang disebabkan penggunaan MethaneResponse. Lihat [status implementasi](../release/current-implementation-status.md).


## Contoh keputusan dan bukti manfaat

[Tiga studi kasus historis](../research/three-historical-decision-cases-2026-10-18.md) menghubungkan fakta, celah bukti, keputusan dan permintaan berikutnya. [Paket penguatan alur dan perbandingan fungsi](../evidence/product-value-2026-10-18/README.md) mencatat pemeriksaan browser serta pembanding manual dengan data/alat yang sama. Hasil agent tidak disebut pilot pengguna manusia.
