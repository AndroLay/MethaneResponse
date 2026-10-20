# Alur penggunaan MethaneResponse

[Pusat dokumentasi](../README.md) · [Setup lokal](../development/local-setup.md) · [Alur resmi MARS dan pemetaan produk](mars-response-workflow.md)

**Panduan aktif — 20 Oktober 2026.** Tujuan alur ini adalah mencatat apa yang dapat disimpulkan dari bukti tersedia dan apa yang masih perlu diperiksa. Aplikasi tidak mendeteksi metana baru, mengirim notifikasi operator, atau mengesahkan perbaikan lapangan.

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

### Rencanakan kapasitas investigasi

Di **Cases → Plan investigation capacity**, isi 1–50 slot, batas per negara, negara/sektor dan bobot recurrence historis. **Compare investigation plans** membandingkan empat pilihan: percentile berbobot, median reported flux, distinct observed dates, serta greedy geographic/sector breadth. Semua memakai pool dan hard quota yang sama. Sumber tanpa linked observations dijelaskan sebagai excluded; tidak diperlakukan sebagai nol emisi. Periode planner mencakup seluruh snapshot, terpisah dari filter periode peta.

Kartu membandingkan jumlah sumber, negara/sektor yang diketahui, median dari median flux sumber, median tanggal observasi, overlap dan slot yang belum dapat diisi. Ini tradeoff deskriptif, bukan peringkat manfaat iklim. **Inspect rows** menampilkan selected/excluded/all, 20 baris per halaman; alasan eksklusi membedakan scope, riwayat kosong, kuota dan kapasitas. **Case**, **Map**, dan **Evidence** mempertahankan ID sumber; membuka sumber menghapus filter direktori/peta agar pilihan dan detail tetap konsisten.

**How stable is this allocation?** memperlihatkan perubahan saat satu asumsi diubah. **Download reproducible plan** menyimpan seluruh candidate projection, parameter, hasil, provenance dan hash. Tidak ada assignment/permintaan yang dikirim, audit yang disimpan atau transaksi blockchain. Verifikasi lokal: `bun run prove:planner --verify PATH --expected-digest TRUSTED_DIGEST`. Replay yang sah tidak membuktikan autentisitas input atau manfaat lapangan. Demo sintetis tidak menampilkan planner data nyata; public preview hanya memakai tiga sumber kurasi.

Periksa tanggal, plume ID, flux dalam unit penerbit, uncertainty, nilai kosong dan provenance. Observasi adalah titik pengukuran diskret. Source density tidak mewakili konsentrasi metana; imagery lokasi bukan citra plume pada overpass tertentu. Legend/history peta dapat dibuka tanpa mengubah dataset.

MARS `notified` dan `feedback` tetap metadata administratif. Response rate negara menghitung feedback atas sumber yang dinotifikasi; tidak menghitung perbaikan. Top 50 tidak memiliki kolom rank eksplisit, sehingga urutan CSV tidak menjadi peringkat yang direka. Lihat [data dan claims](data-and-claims.md).

Insight recurrence/anomaly dan priority heuristic membantu memilih investigasi. Estimasi recurrence membahas record MARS tertaut berikutnya, bukan probabilitas kebocoran fisik. Prioritas hanya digunakan bila binding snapshot/archive cocok.

### Operasikan dan tinjau rencana

1. Klik **Use this plan on map & queue** setelah memilih strategi. Antrean **Active investigation plan** menampilkan ID yang dipilih, 10 per halaman, dan ring cyan pada koordinat sumber. Ring menandai alokasi, bukan intensitas metana. **Map** memusatkan sumber; **Evidence →** membuka sumber yang sama di auditor. Penetapan assignee dan pengiriman permintaan tetap langkah terpisah.
2. **Edit capacity & strategy**, ubah 10 menjadi 20, lalu bandingkan lagi. Antrean lama tetap aktif sampai penggantian disetujui melalui tombol aktivasi. Parameter, scope dan strategi diperiksa ulang setelah replay; respons yang terlambat tidak boleh mengaktifkan pilihan lama.
3. Pada **Compare an earlier plan or snapshot**, pilih ekspor plan atau reviewed history (maksimal 16 MB) dan isi digest SHA-256 dari catatan tepercaya terpisah. File dibaca lokal browser; history lebih besar dapat diperiksa dengan CLI hingga 32 MiB. Sistem memverifikasi replay sebelum membandingkan. Perubahan strategi/kuota pada snapshot yang sama dilabeli perubahan asumsi, bukan kedatangan observasi baru. Snapshot lain memerlukan file lengkap yang kompatibel; aplikasi tidak otomatis mengunduh snapshot baru atau menganggap ID lain berarti tanggal yang lebih baru.
4. Perbandingan menyoroti sumber masuk/keluar dan perubahan ringkasan negara, sektor, median flux/SD, jumlah record/tanggal, missing flux, serta tanggal terakhir. Ini **bukan diff seluruh plume, notifikasi atau feedback**. Buka sumber yang perlu ditinjau dan periksa rekaman asli; koreksi metadata juga dapat mengubah ringkasan.
5. Pada **Human review & version history**, sambungkan signed reviewer token melalui koneksi tim yang sama. Token hanya di memori; backend mensyaratkan `private_read`, tambahan `review` untuk menulis, serta current directory authority `source_detected`. Isi Plan ID, keputusan dan alasan. Backend menghitung ulang plan dari arsipnya, menetapkan actor/waktu dan menyimpan revisi dengan compare-and-swap. Konflik tidak menimpa catatan; muat history terbaru, bandingkan lalu simpan lagi. Keputusan menerima alokasi tidak mengesahkan mitigasi.
6. **Download reviewed plan history**, simpan head digest secara terpisah, lalu verifikasi: `bun --no-env-file scripts/verify-plan.ts history.json --expected-head 0xTRUSTED_SHA256`. CLI memeriksa semua revisi dan replay terhadap digest itu. Riwayat yang diubah lalu dihash ulang juga ditolak jika head tepercaya berbeda. Hash ini bukan tanda tangan reviewer atau anchor blockchain.

Rencana aktif hanya bertahan selama tab/aplikasi masih hidup, termasuk navigasi antarworkspace; refresh menghapusnya. Draft rationale memakai recovery tab bernama reviewer, tetapi SessionStorage bukan penyimpanan terenkripsi atau isolasi pengguna yang kuat. Riwayat server berada di `${AUDIT_STORE_PATH}.plans.json` beserta marker `.initialized`, maksimal 20 plan, 20 report berbeda/plan dan 100 revisi/plan, total 32 MiB. Cadangkan keduanya saat API berhenti; jangan mengubah file, menjalankan beberapa writer, atau mengandalkan filesystem preview sementara sebagai durabilitas hosting. Public preview tidak membuka private plan history.

### Tinjau perubahan dua snapshot historis

1. Di **Cases → Plan investigation capacity**, bandingkan rencana. Buka **Which investigations need another look?** dan pilih **Sources in this allocation**. **Check historical snapshot changes** membandingkan rilis yang diambil 12 dan 14 Oktober, terikat input aktif; pilihan strategi menentukan ID yang diperiksa. Ini tidak mengganti antrean aktif atau keputusan reviewer.
2. Periksa jumlah source/record yang ditambah, dihapus atau diubah. **82 added records** bertanggal setelah akhir cakupan arsip sebelumnya; **13 historical backfill** berada dalam cakupan lama. Record baru dalam arsip tidak otomatis berarti emisi yang baru terjadi. Sebanyak 6.534→6.553 record tanpa source tetap unresolved.
3. Alokasi default weighted, kapasitas 10 atau 20, maksimum dua per negara dan bobot 50 menghasilkan tiga ID terdampak: `DZA_S_011`, `IRN_S_065`, `TKM_S_021`. Buka **Original record changes** untuk nilai penerbit sebelum/sesudah; nilai kosong tidak menjadi nol. Perubahan persistency, tanggal, flux atau reported SD perlu dibaca sesuai field aslinya. Feedback/notifikasi tetap metadata, bukan repair.
4. **Inspect evidence →** dan **Map ↗** membuka sumber dengan ID yang sama. Pilih **All changed sources** untuk seluruh 178 ID terdampak, 20 sumber per halaman; perubahan observasi di dalam tiap sumber juga dipaginasi. Perubahan record unresolved tetap ada dalam ekspor lengkap dan tidak dikaitkan ke sumber berdasarkan kedekatan lokasi.
5. **Download complete change report** menyimpan seluruh diff dengan kedua descriptor input, field policy dan digest. Jalankan [verifier replay](../evidence/snapshot-change-watch-2026-10-20/README.md#reproduce) menggunakan dua file gzip asli serta expected hashes yang diperoleh terpisah. Browser memvalidasi konteks dan digest ekspor; full replay dilakukan CLI. Ini tidak mengautentikasi penerbit atau membuktikan kebenaran pengukuran.

Pergantian strategi/kapasitas membatalkan hasil lama. Error mempunyai retry; scope kosong tidak membuka seluruh katalog secara diam-diam. Public preview menolak diff penuh agar batas tiga sumbernya tetap berlaku. Dataset rusak/tidak cocok ditolak backend. Tidak ada pembaruan upstream otomatis, prediksi prospektif, assignment atau anchor chain pada langkah ini.

<a id="document-assessment-and-human-review"></a>

## 3. Tentukan claim dan scope

Untuk alur lengkap **alokasi → investigasi → permintaan/respons → review → keputusan beku → verify/revisit**, ikuti [investigasi terhubung](../development/connected-investigations.md). Panel tersebut memakai konteks sumber, snapshot dan scope yang sama di workspace bersama; status pekerjaan tidak menjadi verdict mitigasi.

Di **Overview**, pilih `source_detected`, `operator_notified`, atau `mitigation_confirmed`. Isi **Period start**, **Period end**, optional **Observation event**, lalu **Apply assessment scope**. Event harus milik source dan berada dalam periode. Untuk notifikasi, sebutkan penerima. Periode perlu mencakup tindakan/follow-up yang ingin dinilai.

**Use loaded observation period** mengisi batas tanggal dari seluruh riwayat yang telah dimuat; **Use selected observation day** membatasi satu event. Periksa preview lalu tekan **Apply assessment scope**. Preset bukan tanggal perbaikan atau periode follow-up. Selama ada edit yang belum diterapkan, **Run rules baseline** dinonaktifkan. Draft scope disimpan per konteks investigasi di SessionStorage dan pulih saat kembali ke halaman ini; jika storage diblokir, peringatan menyebut draft akan hilang saat meninggalkan halaman. Draft scope tidak memunculkan dialog navigasi ketika dapat dipulihkan.

Coverage panel memperlihatkan syarat tipe bukti, referensi yang memenuhi, referensi yang dikeluarkan dan next checks. Preview dan API memakai selector yang sama. Metadata notified/feedback dan link-only reports tetap konteks. Memilih claim tidak otomatis menyimpan penilaian; **Run rules baseline** membuat revisi baseline.

Scoped rules mengeluarkan referensi tanpa tanggal, di luar periode, atau event yang tidak cocok. Notifikasi harus cocok penerima; mitigation-reference support memerlukan action, tanggal tindakan dan follow-up bertanggal sama/setelah tindakan dalam periode. Ini pemeriksaan hubungan metadata, bukan autentikasi referensi.

**Use source-level baseline** menghapus scope untuk jalur legacy. Setiap scope persis mempunyai history sendiri. Editor menunggu dataset selesai dimuat; fallback sementara DEMO tidak dapat diedit sebagai sumber nyata.

## Decision Lab: jelaskan keputusan dan permintaan bukti

Setelah menerapkan claim/scope, pilih langkah **Decision Lab → Explain current evidence**. API memuat referensi dari snapshot server; pengguna tidak dapat menyuntikkan referensi melalui endpoint ini. Analisis tidak menyimpan revisi audit atau memanggil AI.

- **Inspect reference eligibility** menunjukkan referensi pendukung, contrary, serta alasan eksklusi seperti tanggal di luar scope atau follow-up yang tidak tersedia.
- **What changes if a reference is removed?** menjalankan kembali aturan yang sama setelah menghapus satu ID referensi. Maksimal delapan dependency individual ditampilkan, ditambah penghapusan seluruh referensi eligible. Ini mengukur ketergantungan keputusan pada metadata, bukan probabilitas repair atau ramalan emisi.
- **Download evidence request** membuat draft Markdown berisi source/scope, snapshot/hash, attribution/license dan acceptance checks. Permintaan tidak dikirim; tinjau lalu salin secara eksplisit ke pekerjaan follow-up.
- **Download reproducible analysis** menyimpan input, trace, sensitivity, kebijakan dan SHA-256. Browser memeriksa checksum serta menjalankan ulang policy sebelum menampilkan hasil. Checksum unsigned tidak mengautentikasi penerbit.
- **Continue to human assessment** dan **Open follow-up work** mempertahankan investigasi terpilih. Simpan keputusan reviewer melalui jalur terotorisasi yang sudah ada.

**Open synthetic evidence challenges** memisahkan lima skenario authored DEMO: lengkap, follow-up hilang, di luar periode, contrary, dan konflik. Skenario ini menguji aturan menggunakan metadata buatan; tidak mewakili operator atau repair nyata dan tidak masuk ke audit kasus MARS. Kembali memakai **Return to selected MARS source**.

Perubahan source/claim/scope/snapshot membuang hasil lama dan membatalkan request yang belum selesai. Scope draft, source yang tidak tersedia pada API, perubahan snapshot, error, dan rate limit memiliki status tersendiri. Bukti dan perintah replay ada di [paket Decision Lab](../evidence/decision-lab-2026-10-19/README.md).

### Observation cross-check: cari rekaman penyangkal

1. Pilih sumber historis di Evidence Auditor, buka **Decision Lab → Observation cross-check**.
2. Pilih pernyataan: tidak ada linked detection; setiap point estimate paling tinggi ambang kg/h; atau keberhasilan mitigasi fisik. Ini skenario buatan analis, bukan klaim yang diatribusikan kepada operator.
3. Tentukan hari awal/akhir UTC yang inklusif. **Use loaded observation period** mengisi rentang riwayat yang dimuat tanpa mengubah scope audit utama.
4. Jalankan **Check observation claim**. API membaca snapshot terpin, bukan observasi kiriman pengguna. Browser mencocokkan source ID, pertanyaan, snapshot, hash arsip hulu dan hash input terverifikasi, lalu menghitung ulang kebijakan dan SHA-256.
5. Periksa exact plume IDs, timestamp asli, flux kg/h, reported SD, satelit dan koordinat. Titik/batang pada grafik adalah observasi diskret dan ±SD, bukan emisi kontinu atau peluang melampaui ambang fisik. Tabel menampilkan 20 record per batch; seluruh record, termasuk yang di luar periode, tersedia dalam replay JSON.
6. Unduh follow-up draft dan replay file. Draf belum dikirim; penilaian manusia dan publikasi audit tetap perlu dilakukan secara terpisah. Navigasi ke Observations/Human assessment/follow-up tidak otomatis menyimpan kesimpulan exploratory ini.

Contoh Kanada `CAN_S_002`: estimasi 1.044 kg/h menyangkal skenario bahwa semua estimasi paling tinggi 1.000 kg/h, tetapi SD 370 kg/h melintasi ambang. Tidak ada inferensi bahwa emisi fisik pasti melampaui ambang. Pilihan **Physical methane mitigation succeeded** selalu meminta review dokumen, termasuk ketika tidak ada rekaman dalam periode.

Hasil lama langsung dibuang dan request dibatalkan ketika pertanyaan/periode/ambang berubah. Source/snapshot/hash/context baru mereset panel. Batas archive-window, missing flux, error, public preview dan rate limit ditampilkan. Hanya rekaman dengan source ID yang terhubung digunakan; record tanpa linkage tidak dialokasikan berdasarkan kedekatan lokasi. [Bukti dan walkthrough](../evidence/observation-crosscheck-2026-10-19/README.md).

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
