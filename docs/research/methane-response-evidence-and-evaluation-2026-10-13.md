# Riset penerapan bukti dan evaluasi MethaneResponse

**Diperiksa:** 14 Oktober 2026 (WITA)

**Tujuan:** mengubah riset primer tentang MARS, observasi satelit, pengulangan emisi, dan sitasi AI menjadi keputusan produk yang dapat diuji. Catatan ini melengkapi [audit kandidat](methane-response-audit.md) dan [spesifikasi data/klaim](../data-and-claims.md); tidak mengklaim MethaneResponse telah mengurangi emisi.

## Temuan dan keputusan produk

### 1. Bedakan sumber, plume, notifikasi, feedback, dan mitigasi

UNEP mendefinisikan *plume* sebagai satu pengamatan methane dari satu lintasan satelit dan *source* sebagai lokasi di darat yang dapat memiliki beberapa plume dari waktu ke waktu. Snapshot proyek mempertahankan relasi ini, tanggal, ID, flux, unit, koordinat, ketidakpastian, dan provenance. Record plume tanpa `source_name` tetap tidak tertaut; aplikasi tidak menebak fasilitasnya.

Data dictionary MARS yang diperiksa pada 14 Oktober 2026 juga mencatat bahwa produk plume Sentinel-2, Landsat 8/9, EMIT, PRISMA, dan EnMAP telah dikuantifikasi ulang setelah 20 Februari 2026. Artinya, nilai historis dapat berubah antar-rilis dataset walaupun tanggal observasinya sama. MethaneResponse karena itu mengikat audit dan histori ke snapshot/hash tertentu, mempertahankan nilai serta metadata pada snapshot tersebut, dan tidak membandingkan angka lintas snapshot seolah-olah tidak pernah direvisi.

MARS sudah mendeteksi dan menguantifikasi emisi besar, menghubungi pemerintah/perusahaan, memantau lokasi, serta menyajikan feedback dan status tindak lanjut. Eye on Methane juga memperkenalkan persistency-weighted flux (PWF), yang menggabungkan frekuensi deteksi dan flux selama enam bulan berdasarkan kesempatan observasi berkualitas. Produk tidak boleh mengaku sebagai sistem deteksi atau menemukan celah operasional MARS yang belum dibuktikan. Ruang kerja MethaneResponse yang dapat diuji adalah pemeriksaan klaim dokumen terhadap record yang bisa dikutip, review manusia, riwayat revisi, dan pemeriksaan integritas.

`feedback` adalah metrik engagement yang menunjukkan feedback diterima untuk sumber yang dinotifikasi. Ia dapat memuat investigasi atau tindakan, tetapi bukan sertifikat bahwa perbaikan selesai. Non-deteksi juga tidak membuktikan emisi nol: sensor memiliki batas deteksi dan kesempatan pengamatan bergantung pada awan, cahaya, kondisi permukaan, satelit, serta kualitas observasi. Karena snapshot publik memuat deteksi, bukan panel seluruh kesempatan observasi yang konsisten, histori deteksi tidak cukup untuk merekonstruksi prevalensi emisi fisik.

**Keputusan di aplikasi:** tampilkan status asli UNEP dengan label dan tanggal; pisahkan metadata notification/feedback dari bukti dokumen; gunakan `insufficient_evidence` untuk klaim mitigasi tanpa bukti yang dapat diperiksa; pertahankan riwayat observasi dan ketidakpastian; jangan mengganti data hilang menjadi nol.

### 2. Validasi deteksi dan kuantifikasi satelit

Studi *single-blind controlled-release* Sherwin et al. menguji lima tim analisis dengan data hingga lima satelit pada lokasi uji gurun. Tim mengidentifikasi dengan benar 71% emisi yang dilepas dan tiga perempat estimasi kuantitatif berada dalam ±50% nilai meter; 12% kasus yang dinilai tidak menghasilkan estimasi karena cuaca, awan tebal, atau pemotongan citra. Kesalahan angin juga berpengaruh pada taksiran laju. Hasil tersebut adalah validasi sensor dalam satu eksperimen terkontrol, bukan akurasi MARS atau MethaneResponse dan tidak mewakili semua lokasi, sensor, atau kondisi.

**Keputusan di aplikasi:** pertahankan satuan dan ketidakpastian yang diterbitkan; beri ruang untuk “tidak ada estimasi”/data tidak tersedia; jangan menyimpulkan emisi nol dari tidak adanya deteksi. Peta konteks Esri bukan citra overpass dan tidak menggantikan footprint publisher MARS yang tersedia untuk observasi terpilih.

### 3. Visualisasi sumber dan footprint

Publisher MARS menyediakan geometri plume bersama ID, tanggal, koordinat, dan atribut emisi. Arsip proyek yang dipin memiliki 30.319 record: 29.112 geometri MultiPolygon dan 1.207 record dengan geometri kosong. Geometri kosong harus tetap kosong. Footprint resmi bukan permukaan konsentrasi atmosfer atau citra satelit mentah; warnanya mengkodekan estimasi flux yang dilaporkan dalam kg/h, bukan konsentrasi.

Basemap Esri pada Evidence Auditor adalah **konteks lokasi** dan waktu akuisisinya dapat berbeda dari tanggal record. Ia tidak membuktikan adanya plume. Bila geometri untuk record yang dipilih tersedia, cara yang lebih tepat adalah menampilkannya sebagai footprint publisher yang diverifikasi terhadap index/shard dan snapshot MARS aktif, dengan tanggal, flux, ketidakpastian, dan label keterbatasan. Bila tidak tersedia, pertahankan citra konteks dan histori, lalu nyatakan bahwa footprint tidak dipublikasikan. Jangan membuat gambar plume sintetis atau mengunduh berkas gambar terpisah per case.

Untuk keseluruhan casebook dan snapshot global, peta lokasi dapat dibentuk langsung dari koordinat sumber. Mosaic Esri tiga tile pada zoom bertingkat 16/13/10/7 memberi konteks on-demand; tidak ada aset citra per case yang disimpan. Pembentukan URL untuk seluruh 4.211 sumber telah diuji. Permintaan tile di browser dan fallback membuktikan perilaku untuk lokasi sampel, bukan SLA bahwa penyedia akan selalu melayani setiap tile.

### 4. Prioritas dan prediksi

UNEP PWF telah menggabungkan persistensi dan magnitudo flux untuk tujuan visualisasi, dengan penyebut berdasarkan observasi berkualitas dan periode enam bulan. MARS secara eksplisit menyebut PWF sebagai metrik visual yang tidak ditujukan untuk interpretasi fisik langsung. Karena itu, skor prioritas MethaneResponse harus mengidentifikasi fitur serta cakupannya dan tidak disajikan sebagai probabilitas masa depan atau pengganti PWF.

IEA 2026 menjelaskan bahwa sensor satelit, pesawat, drone, tower, dan alat lapangan melihat rentang skala serta batas deteksi berbeda. Ia juga mencatat perlunya pengukuran multi-skala; tidak ada satu teknologi yang menangkap seluruh rentang emisi. Ini mendukung penjelasan bahwa archive recurrence model yang dilatih pada data MARS memprediksi kemunculan record arsip sesuai definisi targetnya, bukan besarnya methane yang belum diamati atau kepastian kebocoran mendatang.

**Gerbang evaluasi:** buat prediksi hanya dari data sebelum cutoff; pisahkan waktu secara prospektif; kelompokkan ketergantungan menurut sumber/lokasi; bandingkan dengan baseline sederhana; laporkan coverage, kalibrasi, interval ketidakpastian, abstention, dan perubahan terhadap baseline. Jangan menyebut hasil pengujian historis sebagai validasi prospektif atau eksternal. Snapshot MARS berikutnya dan lisensi yang mengizinkan evaluasi diperlukan untuk menguji apakah model masih bekerja pada data yang belum dilihat.

### 5. AI yang menjelaskan sitasi

Benchmark ALCE (EMNLP 2023) mengevaluasi kelancaran, kebenaran, dan kualitas sitasi sebagai dimensi terpisah. Dalam eksperimen mereka, bahkan sistem terbaik pada salah satu set panjang tidak memberi dukungan sitasi lengkap pada sekitar separuh jawaban. Hasil benchmark umum ini bukan estimasi kinerja MethaneResponse, tetapi memperkuat alasan untuk tidak menyamakan jawaban fasih atau sitasi yang ada dengan bukti yang mendukung.

**Gerbang AI:** klaim dipecah menjadi unit yang dapat diperiksa; kutipan harus merupakan substring persis dari dokumen berizin; validasi deterministik menolak offset/kutipan yang tidak cocok; hasil harus dapat abstain; reviewer manusia menerima keputusan terpisah. Benchmark MethaneResponse harus mencatat label oleh penilai independen, exact-citation validity, evidence support/contradiction, abstention, serta salah konfirmasi mitigasi sebagai metrik keselamatan. Laporkan baseline aturan dengan data dan prompt tetap. Provider model tetap dinonaktifkan sampai korpus dan persetujuan pemrosesan tersedia.

## Hubungan dengan penilaian kompetisi

| Kriteria | Klaim yang dapat diuji | Bukti yang perlu ditampilkan | Klaim yang harus dihindari |
|---|---|---|---|
| Climate Impact | Riwayat satelit dan bukti tindak lanjut lebih mudah ditelusuri dalam satu case. | Sumber nyata, lineage data, tanggal, satuan, ketidakpastian, pengguna sasaran dan batas dampak. | Emisi berkurang karena aplikasi atau semua alert berarti mitigasi. |
| Innovation & Creativity | Workflow audit independen mengikat klaim, kutipan, keputusan reviewer, revisi, dan digest. | Demo kasus yang menunjukkan kutipan mendukung/bertentangan/tidak cukup serta apa yang disimpan on-chain. | Mengklaim AI deteksi atau pelacakan notifikasi yang menggantikan MARS. |
| Technical Execution | Pemetaan ID, manifest hash, baseline deterministik, batas akses, dan verifikasi receipt dapat direproduksi. | Test output, versi snapshot, hash, fail-closed state, serta hasil browser/runtime. | Menyamakan build yang lulus dengan layanan cloud/provider live. |
| Practical Usefulness | Peneliti/auditor dapat memilih sumber, membuka histori, menilai excerpt berizin, meminta review, dan memeriksa revisi. | Waktu penyelesaian task dan kesalahan dibanding workflow tanpa produk yang diukur pada pilot. | Mengklaim penghematan waktu sebelum studi pengguna. |
| Presentation | Tampilkan satu source dari deteksi ke bukti, keputusan, laporan, dan verifier. | Demo nyata 3–5 menit, citation panel, keterbatasan, dan status integrasi yang jujur. | Menampilkan simulasi synthetic/mock sebagai tindakan perusahaan sungguhan. |

Nilai rubrik juri tidak diprediksi di sini. Bukti teknis dan uji pengguna harus dilaporkan terpisah; penilaian subjektif 18/20 tidak dapat disimpulkan hanya dari checklist fitur.

## Sumber primer yang diperiksa

- UNEP, [MARS and Eye on Methane](https://methanedata.unep.org/methane-alert-response-system) — alur detect/notify/mitigate/track, jeda publikasi, batas observasi satelit, dan PWF.
- UNEP, [MARS methane plumes and sources data dictionary](https://methanedata.unep.org/dict-mars-emission-sources-plumes) — arti record plume/source, ID, tanggal, koordinat, `notified`, `feedback`, flux, uncertainty, persistency, status observasi, dan catatan requantifikasi setelah 20 Februari 2026.
- UNEP, [MARS response rates data dictionary](https://methanedata.unep.org/dict-mars-response-rates) — denominator response rate dan perbedaan feedback dengan bukti pengurangan emisi.
- UNEP IMEO, [Technical Documentation for Methane Satellite Detection and Quantification](https://wedocs.unep.org/items/c77a439f-9689-4164-874d-49045e6d097) — metode dan batas kuantifikasi.
- Sherwin et al., [Single-blind validation of space-based point-source detection and quantification of onshore methane emissions](https://pmc.ncbi.nlm.nih.gov/articles/PMC9992358/) — eksperimen terkontrol untuk mengukur deteksi, kuantifikasi, pengaruh angin, dan kasus tanpa retrieval; hasil tidak diperlakukan sebagai metrik aplikasi.
- UNEP, [Persistency-weighted median flux rate](https://methanedata.unep.org/persistency-weighted-flux) — formula PWF, observasi berkualitas, cakupan enam bulan dan peringatan interpretasi.
- IEA, [Global Methane Tracker 2026: Recent insights from methane emissions studies](https://www.iea.org/reports/global-methane-tracker-2026/recent-insights-from-methane-emissions-studies-2) — kemampuan dan batas beberapa keluarga sensor serta perlunya pengukuran multi-skala.
- Gao et al., [Enabling Large Language Models to Generate Text with Citations](https://aclanthology.org/2023.emnlp-main.398/) — benchmark citation support dan dimensi penilaian; bukan bukti kinerja MethaneResponse.
