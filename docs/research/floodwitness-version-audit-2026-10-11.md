# Audit FloodWitness: riwayat versi CEMS dan prior art

**Tanggal:** 11 Oktober 2026 (WITA)  
**Tujuan:** menguji klaim inti laporan FloodWitness dengan dokumentasi CEMS, probe API eksploratif, dan pencarian prior art. Ini bukan hasil eksperimen model dan bukan prediksi pemenang.

## Putusan singkat

FloodWitness mempunyai masalah yang masuk akal untuk diteliti: produk pemetaan CEMS dapat memiliki versi yang lebih baru setelah QC menemukan kesalahan, sedangkan portal hanya menampilkan versi terbaru. Namun, laporan yang menyebutnya “black-box recorder” belum membuktikan bahwa produk v1 yang ditolak pernah terlihat secara publik sebelum diganti.

Temuan paling mengubah penilaian kebaruan adalah **CEMS Flood Archive Ledger dari OCHA-DAP**. Halaman publiknya mendeskripsikan arsip produk banjir CEMS dengan SHA-256, inventaris file, metadata untuk unduhan yang gagal/tidak tersedia, harmonisasi geospasial, dan jurnal transfer append-only. Itu sangat dekat dengan bagian “arsip + integritas + transparansi ketersediaan” FloodWitness. Halaman tersebut tidak memperlihatkan kontrak blockchain atau model prediksi revisi.

**Kesimpulan saat ini:** FloodWitness layak mendapat proof sprint terbatas, tetapi bukan kandidat terbaik yang sudah terbukti. Posisikan ulang hanya bila dapat menunjukkan nilai tambahan yang spesifik: menangkap versi pertama saat pertama kali publik, menghubungkan revisi QC antarversi, menghitung diff spasial, dan memvalidasi triase revisi dengan fitur yang benar-benar tersedia sebelum revisi.

## Fakta CEMS yang dapat didukung sumber primer

1. **Versi produk dan monitoring bukan hal yang sama.** Manual CEMS menyatakan produk Rapid Mapping yang ditolak pada pemeriksaan QC mendapat versi baru untuk memperbaiki error; v2 dibuat bila v1 ditolak, dan v3 bila v2 juga ditolak. Manual juga menyatakan hanya versi terbaru yang tersedia pada website. [CEMS Quality Control](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/quality-control/)
2. **API terdokumentasi memuat status versi terkini.** Skema Rapid Mapping menjelaskan satu objek `version` per produk dengan `uuid`, `number`, `reason`, `deliveryTime`, dan `statusCode`, serta satu `downloadPath` untuk ZIP produk tersebut. Dokumentasi tidak menerangkan endpoint riwayat versi lengkap. [CEMS Emergency Response API](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/emergency-response-data/)
3. **Monitoring operasional memakai field tersendiri.** Skema API memuat `monitoring` dan `monitoringNumber`; manual menyebut produk post-event dapat menerima monitoring update sesuai dinamika kejadian. Jangan menganggap monitoring baru sebagai koreksi QC v2/v3. [CEMS What is a Product?](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-a-product/)
4. **Publikasi terjadi setelah analisis produk selesai.** Dokumentasi menyatakan produk dikirim kepada pemohon dan dipublikasikan setelah analisis difinalkan, kecuali aktivasi sensitif. Sumber yang diperiksa tidak memastikan apakah versi yang kemudian ditolak QC pernah tersedia untuk publik lebih dahulu. [CEMS What is a Product?](https://mapping.emergency.copernicus.eu/about/rapid-mapping-manual/product-overview/what-is-a-product/)

Karena itu, klaim yang akurat adalah: “API publik yang terdokumentasi memperlihatkan metadata versi terkini; CEMS menyatakan situs menampilkan versi terbaru.” Belum ada bukti bahwa seluruh byte versi lama dihapus atau bahwa setiap v1 sempat dapat diunduh publik.

## Probe API eksploratif

Seorang agen melakukan GET live pada daftar aktivasi dan detail 100 aktivasi pertama dalam urutan API, dengan jeda permintaan dan retry setelah 429. Daftar memberi 267 aktivasi. Pada 100 aktivasi itu, agen menghitung 1.135 produk yang tampil pada metadata terkini: 962 versi 1, 156 versi 2, dan 17 versi 3. Pada subset Flood terdapat 476 produk: 417 versi 1, 53 versi 2, dan 6 versi 3.

Angka ini **probe eksploratif agen, bukan dataset beku atau hasil independen saya**. Respons mentah tidak disimpan; subset 100 aktivasi mengikuti urutan API, bukan sampel acak atau protokol preregistrasi. Jumlah versi >1 tidak sama dengan prevalensi revisi dalam populasi produk awal, karena endpoint menampilkan kondisi terkini, mencampur jenis produk/monitoring, dan tidak merekonstruksi fitur pada saat v1 pertama kali terlihat. Jangan pakai angka ini sebagai metrik submission sebelum kode probe dan respons mentah disimpan, skema unit ditetapkan, lalu hitungan direproduksi.

Dalam probe yang sama, agen menguji satu produk yang sekarang v2: ranged GET ke URL ZIP kanonis v1 untuk `EMSR930_AOI02_GRA_PRODUCT` mengembalikan HTTP 404 setelah redirect, sedangkan v2 mengembalikan HTTP 206 dengan awal berkas ZIP. Ini **membuktikan hanya bahwa satu URL v1 yang diuji tidak lagi dapat diambil saat probe**; tidak membuktikan apakah berkas itu pernah terlihat publik sebelum revisi, dan tidak menggeneralisasi ke semua URL lama.

Probe status live berikutnya menunjukkan bahwa dari 267 aktivasi pada indeks, hanya dua berstatus terbuka saat itu: satu gempa dan satu banjir. Produk banjir terbuka tersebut masih berstatus versi 1; tidak ada produk banjir `W` (menunggu data) pada respons yang diperiksa. Ini agent-run snapshot sekitar 11 Oktober 2026 pukul 04:20 WITA, tidak disimpan sebagai artefak mentah. Konsekuensinya, polling 48 jam dapat membuktikan uptime dan mekanisme tangkap/hash, tetapi tidak menjamin transisi produk banjir v1→v2. Banyak poll terhadap produk yang sama juga bukan banyak contoh model independen.

Pada 59 produk Flood dengan versi terkini >1, `reason` tidak membentuk satu label tematik yang bersih: 12 reason kosong; alasan lain mencakup koreksi layer/footprint, tetapi juga judul peta, legenda, SLD/visualisasi, nama AOI, dan metadata. Hitungan ini juga agent-run dan memakai subset yang sama. Artinya, “pernah mendapat v2/v3” lebih tepat mewakili **pekerjaan ulang/revisi QC** daripada kesalahan luasan banjir. Jika model menargetkan revisi tematik saja, reason perlu ditaksonomikan dan dianotasi secara konsisten; reason kosong/ambigu jangan dipaksa menjadi label negatif.

## Prior art yang terlewat dalam laporan FloodWitness

Halaman **CEMS Flood Archive Ledger** di situs OCHA-DAP, bertanggal generasi 4 September 2026, melaporkan 302 aktivasi banjir, 3.611 baris ledger, 2.884 dari 2.888 ZIP yang diarsip, hash SHA-256 dan inventaris anggota ZIP, serta 2.963 upaya transfer dalam jurnal `transfers.jsonl` append-only. Halaman juga menunjukkan data harmonisasi poligon dan katalog label banjir. Repository publik menyebut pipeline `cems_flood`. [Halaman arsip](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-archive/) · [Repository OCHA-DAP](https://github.com/OCHA-DAP/ds-geospatial-impact-estimates) · [Viewer label banjir](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-labels/)

Angka dan kelengkapan arsip di atas adalah **hasil yang dipublikasikan pemilik sistem**; audit ini tidak mengunduh arsip/parquet atau menghitung ulang hash dan jumlah. Halaman menandai lingkungan sebagai `dev`. Temuan tersebut membuktikan adanya prior art publik yang sangat dekat, bukan bahwa sistem itu sudah menjadi layanan produksi atau menyelesaikan seluruh kebutuhan FloodWitness.

### Dampak pada diferensiasi

FloodWitness tidak seharusnya mengklaim kebaruan untuk:

- mengarsipkan produk banjir CEMS;
- mencatat hash SHA-256 dan isi ZIP;
- menunjukkan file yang gagal/tidak tersedia;
- menyimpan jurnal transfer append-only;
- menampilkan label atau geometri banjir CEMS sepanjang waktu.

Kemungkinan diferensiasi yang belum dibuktikan sama dengan OCHA ialah: komitmen timestamp publik lintas organisasi, graf supersession yang secara khusus menghubungkan koreksi QC v1→v2/v3, diff geometri antarversi untuk produk yang sama, dan model triase sebelum koreksi terjadi. OCHA menyimpan file bernama dengan penanda versi dan memiliki log; audit ini belum memeriksa kode/data cukup untuk menyatakan OCHA tidak mempunyai graf versi atau perbandingan tertentu.

Selain itu, ESA telah menyelesaikan EO-Claim Ledger: MVP untuk klaim asuransi berbasis citra satelit dan blockchain. Jadi “citra bumi + banjir + hash/kontrak” juga bukan kebaruan. [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger)

## Masalah validasi AI

Target `revised later` masuk akal sebagai **proxy koreksi/penolakan QC**, bukan label “peta awal salah” atau “banjir terdeteksi keliru”. Tetapi model membutuhkan dua hal berbeda:

1. outcome yang menunjukkan produk akhirnya mempunyai versi QC lebih tinggi; dan
2. fitur yang benar-benar diketahui saat produk awal pertama kali diterbitkan.

Metadata terkini dapat menunjukkan nomor versi akhir, tetapi tidak dengan sendirinya menyimpan snapshot lengkap fitur v1. Jika fitur yang dipakai berasal dari v2/v3, model mengalami kebocoran masa depan. Untuk tiap baris training, harus ada bukti waktu tangkap v1, metadata dan berkas versi awal, serta waktu revisi berikutnya. Jika itu tidak dapat direkonstruksi, jangan melaporkan backtest revision-risk.

Target juga perlu mengecualikan aktivasi sensitif, produk yang belum selesai, status `N`, produk baru yang ditambahkan setelah aktivasi, dan monitoring operasional. Produk tanpa revisi sampai waktu snapshot belum tentu negatif; sebagian masih dapat disensor karena belum cukup waktu untuk direvisi. Gunakan split berdasarkan waktu dan aktivasi, bukan pengacakan produk/poll.

Gerbang data pada laporan awal belum cukup hanya dengan jumlah “produk berlabel”. Tambahkan syarat:

- dapat mengambil atau memulihkan versi awal beserta timestamp pertamakalinya terlihat;
- tiap prediktor dibuktikan tersedia sebelum outcome;
- label v2/v3 berasal dari revisi QC, bukan produk monitoring atau release parsial;
- status belum selesai/sensitif dipisahkan atau disensor secara tepat;
- baseline dan hasil diuji pada aktivasi yang tidak muncul di train.

Polling 48 jam dapat menguji apakah recorder, hashing, dan verifier bekerja; ia tidak membuktikan prevalensi revisi atau mutu model, dan revisi nyata mungkin tidak terjadi selama periode itu.

## Batas nilai blockchain

Kontrak Sepolia dapat membuktikan bahwa hash tertentu tercatat oleh suatu wallet sebelum waktu blok tertentu dan bahwa file yang diubah tidak lagi cocok dengan hash tersebut. Ia tidak membuktikan bahwa bytes berasal dari CEMS, bahwa timestamp tangkap benar, bahwa semua versi tercatat, atau bahwa peta menggambarkan banjir dengan benar. `INGESTER_ROLE` mengesahkan wallet menurut kontrak, bukan menurut Copernicus.

OCHA sudah menunjukkan hash SHA dan jurnal append-only di penyimpanan cloud. Untuk menjustifikasi blockchain, FloodWitness perlu menunjukkan siapa pihak independen yang akan memverifikasi atau menulis bukti dan mengapa tanda tangan/log transparansi biasa tidak cukup. Kalau seluruh collector, storage, wallet, dan model dikendalikan tim yang sama, klaim manfaat ledger harus dibatasi pada verifikasi publik independen atas timestamp/hash.

## Rekomendasi keputusan

**Belum GO untuk FloodWitness sebagai rekomendasi final.** Jalankan sprint falsifikasi hanya jika delapan jam pertama dapat:

1. menghitung produk Flood terkini menurut jenis produk, status, `monitoringNumber`, dan versi;
2. menguji langsung apakah ZIP v1 untuk contoh yang kini berstatus v2 dapat diunduh, tanpa mengasumsikan URL lama valid;
3. mengukur berapa produk yang mempunyai bukti first-seen v1 dan revisi QC sesudahnya;
4. membandingkan fitur pra-revisi yang dapat dipulihkan dengan fitur final untuk mendeteksi kebocoran;
5. meminta atau memeriksa artefak OCHA-DAP yang relevan dan membandingkan cakupan/fitur secara eksplisit.

Jika versi awal dan prediktor pra-revisi tidak dapat direkonstruksi, hentikan klaim AI revision-risk. FloodWitness masih dapat menjadi demo provenance, tetapi harus bersaing langsung dengan arsip OCHA yang sudah ada; itu belum cukup membuktikan keunggulan di aspek Innovation atau Practical Usefulness. Bandingkan kembali dengan CoolingProof dan ShiftProof menggunakan bukti data aktual, bukan skor heuristik.

## Pemisahan status bukti

| Status | Pernyataan |
|---|---|
| Terverifikasi dari dokumentasi resmi | v2/v3 dibuat setelah penolakan QC; situs menampilkan versi terbaru; API mendokumentasikan satu objek versi terkini; monitoring operasional memiliki field terpisah. |
| Terlihat pada halaman OCHA-DAP | Arsip mengklaim ZIP, hash, manifest/inventaris, jurnal append-only, dan harmonisasi data CEMS flood. Tidak diverifikasi ulang dari storage/parquet. |
| Probe agen | Hitungan API untuk 100 aktivasi terpilih dan subhimpunan Flood; non-random, tidak disimpan sebagai snapshot mentah, bukan hasil model. |
| Inferensi | FloodWitness dapat berbeda melalui first-seen public commitment, QC supersession graph, geospatial version diff, atau prediksi risiko revisi. Belum ada evaluasi/pengguna yang membuktikannya. |
| Belum diketahui | Apakah v1 yang ditolak pernah dapat diakses publik; apakah URL lama lain masih hidup (satu URL EMSR930 v1 menghasilkan 404); jumlah seluruh produk Flood yang benar-benar direvisi; apakah ada fitur historis yang bebas kebocoran; serta apakah pengguna memerlukan blockchain. |
