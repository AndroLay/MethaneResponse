# Riset Swarm Mendalam: Kandidat IEEE ClimateChain 2026

**Tanggal pemeriksaan:** 11 Oktober 2026 (WITA)  
**Tujuan:** memilih kandidat dengan bukti yang dapat diperiksa, bukan berdasarkan nama, skor buatan, atau cerita yang terdengar menarik.  
**Status:** tidak ada pemenang kandidat yang dapat dinyatakan terbukti. GridWitness versi awal diturunkan menjadi **NO-GO**. Kandidat yang paling siap untuk sprint pembuktian berikutnya adalah **Flood Evidence QA**, tetapi statusnya masih kandidat bersyarat, bukan rekomendasi final untuk menang.

**Pembaruan setelah pemeriksaan FloodWitness:** jangan baca shortlist Flood Evidence QA sebagai keputusan terkini. [Audit versi CEMS dan prior art OCHA-DAP](floodwitness-version-audit-2026-10-11.md) menemukan arsip CEMS flood yang sangat dekat serta ketidakpastian fitur v1 sebelum revisi. FloodWitness juga belum terbukti menjadi kandidat terbaik; status semua kandidat tetap bersyarat.

## Kesimpulan eksekutif

Audit swarm mengubah kesimpulan sebelumnya.

1. **GridWitness tidak lagi layak disebut kandidat utama.** Repositori publik [GridCast](https://github.com/Ahmed-KA-Abdalla/gridcast) sudah mengerjakan hampir seluruh inti yang diusulkan: mengambil forecast NESO dari waktu penerbitan, membangun keputusan beban fleksibel dua jam, menilai regret terhadap outcome, menguji baseline dan model gradient boosting, serta menjalankan evaluasi berkala. Repo publik itu bukan peserta yang diketahui di IEEE ClimateChain; ia adalah prior art produk/engineering yang membuat klaim kebaruan GridWitness jauh lebih lemah. README GridCast menyatakan hasil uji tertentu, tetapi angka tersebut belum saya reproduksi sendiri.

2. **Eksperimen mini GridWitness benar-benar berhasil direkonstruksi, tetapi membuktikan hal yang sempit.** Untuk 208 keputusan pada arsip satu bulan, strategi “pilih jendela dengan forecast NESO terendah” menghasilkan skor intensitas rata-rata lebih rendah daripada langsung menjalankan pekerjaan. Ini bukan uji AI, bukan hasil on-chain, bukan bukti emisi marginal yang dihindari, dan bukan perbandingan terhadap GridCast.

3. **Flood Evidence QA memiliki bukti data paling konkret saat ini.** Paket Copernicus EMS untuk satu kejadian dapat dibaca, hash arsip diverifikasi, arsip lolos pemeriksaan ZIP, dan layer flood berisi 1.291 poligon. Namun label dibuat dengan ekstraksi semi-otomatis; metadata menyebut RMSE 30 m dan skala 1:50.000. Ini referensi operasional yang berguna, bukan ground truth lapangan. CEMS sendiri sudah memetakan banjir, dan [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger) pernah membuat MVP blockchain untuk pengelolaan klaim berbasis citra satelit. Jadi varian Flood Evidence QA belum terbukti baru atau berguna bagi pengguna.

4. **CoolingProof layak menjadi kandidat riset, belum kandidat pemenang.** NYC menyediakan inventaris pohon dengan lokasi dan `PlantedDate`; USGS menyediakan Landsat surface temperature; WRI sudah menyediakan pemetaan risiko panas dan simulasi efek intervensi pohon/cool roof. Peluang yang tersisa adalah audit hasil setelah penanaman. Belum ada analisis kohort, data citra yang dipasangkan, atau hasil counterfactual yang diuji. Surface temperature juga tidak sama dengan suhu udara, thermal comfort, paparan manusia, atau manfaat kesehatan.

5. **MethaneResponse punya masalah iklim yang terukur, tetapi solusi workflow-nya bertumpang tindih dengan MARS.** IEA menyebut sekitar 12% notifikasi MARS pada 2025 menerima respons dan menerbitkan kerangka lima tahap untuk proses respons. Itu membuktikan adanya masalah respons, bukan bahwa aplikasi baru atau blockchain akan meningkatkan angka respons.

6. **Daftar submission belum lengkap, tetapi sekarang ada proyek peserta yang terlihat.** Galeri Devpost masih belum diterbitkan. Pencarian halaman proyek publik menemukan tiga halaman yang terkait dengan acara ini: CarbonShield, AION V3, dan BioCyclic. Temuan ini bukan daftar resmi lengkap; BioCyclic adalah proyek lama yang tercantum di banyak hackathon.

### Putusan yang bisa dipertanggungjawabkan

- **GridWitness lama:** hentikan sebagai pilihan utama.
- **Kandidat paling siap diuji dari bukti yang sudah ada:** Flood Evidence QA, karena ada artefak data nyata yang telah diperiksa.
- **Kandidat dengan pembeda potensial yang patut diuji:** CoolingProof, yaitu audit hasil pascaintervensi pohon, bukan peta prioritas penanaman.
- **Belum ada dasar untuk mengatakan salah satunya paling kuat secara keseluruhan atau menjanjikan Top 3.** Nilai pengguna, kebaruan yang cukup, dan manfaat blockchain belum dibuktikan pada kandidat mana pun.

## Metode dan batas audit

### Cara membedakan bukti dari klaim

Label yang dipakai dalam catatan ini:

- **Diverifikasi langsung:** halaman primer dibuka atau artefak data diunduh/diperiksa dalam audit ini.
- **Diverifikasi swarm:** agen memeriksa sumber/artefak; saya menandai jika pemeriksaan independen saya belum mengulang akses yang sama.
- **Klaim pemilik proyek:** angka atau kemampuan dinyatakan pemilik repositori/produk; belum saya ukur ulang.
- **Inferensi:** penilaian kecocokan dengan rubrik atau dugaan manfaat untuk pengguna.
- **Belum diketahui:** data pengguna, lisensi, dampak, atau pembeda belum diverifikasi.

Empat subagen mengerjakan audit berbeda: reproduksi kandidat energi, validasi dataset banjir, red-team kebaruan/rubrik, dan pencarian kandidat alternatif secara independen. Saya memeriksa ulang halaman sumber primer dan menghitung ulang beberapa properti artefak data lokal. Agen tidak mengedit workspace.

### Rubrik resmi

Devpost mencantumkan lima kriteria: **Climate Impact**, **Innovation & Creativity**, **Technical Execution**, **Practical Usefulness**, dan **Presentation & Communication**. Tidak ada bobot numerik yang ditampilkan. Submission meminta penjelasan masalah/solusi/pengguna/adopsi, demo video 3–5 menit, repository publik, dan prototype/mockup/PoC. Deadline yang ditampilkan adalah 25 Oktober 2026 pukul 17.00 MSK (22.00 WITA). Tidak ada persyaratan survei lapangan yang tercantum. Sumber: [halaman resmi hackathon](https://ieee-climatechain-hack.devpost.com/).

Halaman [Project Gallery](https://ieee-climatechain-hack.devpost.com/project-gallery) masih menampilkan pesan bahwa pengelola belum menerbitkan galeri. Pencarian publik tetap menemukan halaman proyek yang mengaitkan diri dengan hackathon. Menurut [panduan Devpost tentang galeri](https://help.devpost.com/article/80-what-is-the-project-gallery), proyek tampil di galeri setelah pengelola mengaktifkan dan memoderasi galeri, biasanya setelah deadline. Jadi halaman yang terindeks dapat ditelaah, tetapi daftar peserta/submission lengkap belum dapat dipastikan.

## Temuan yang paling mengubah keputusan: GridWitness dan GridCast

### Apa yang sudah ada

Halaman publik [GridCast](https://github.com/Ahmed-KA-Abdalla/gridcast) memperlihatkan struktur source, test, workflow, dan README yang membahas:

- capture forecast NESO beserta waktu capture agar evaluasi tidak memakai forecast revisi yang datang setelah keputusan;
- pemilihan slot kerja fleksibel dua jam dalam jendela 24 jam;
- perbandingan forecast dengan outcome, immediate, oracle, dan seasonal baselines;
- koreksi forecast, gradient boosting, evaluasi regret, drift, dan halaman evaluasi berkala;
- pembagian waktu kronologis untuk menghindari kebocoran informasi.

Agen red-team memeriksa riwayat Git dan melaporkan commit awal pada **20 Agustus 2026** (`a90ebab…`), sehingga pendekatan tersebut sudah ada sebelum periode submission hackathon dimulai. Agen juga melihat CI publik yang lulus pada 24 September ([GitHub Actions run](https://github.com/Ahmed-KA-Abdalla/gridcast/actions/runs/35946027076)). Saya sendiri membuka repository dan membaca spesifikasi/README di GitHub, tetapi tidak menjalankan clone atau test suite dari repository itu.

README repo menyebut angka seperti 48.048 settled half-hours, 363 forecast issues, 322 keputusan, hasil model, serta 328 tests. Itu adalah **laporan pemilik repo**. Dalam audit ini saya belum menjalankan suite atau mereproduksi semua angka tersebut. Agen red-team menginspeksi source/test/workflow dan memeriksa GitHub Actions publik; hasil eksekusi tersebut bukan hasil pengujian lokal saya.

Ini adalah tumpang tindih pada hipotesis dan pipeline evaluasi, bukan klaim bahwa implementasi kedua proyek sama. GridCast tidak mendokumentasikan blockchain precommit/reveal, multi-job capacity optimizer, atau executor workload yang diusulkan GridWitness. Fitur-fitur itu masih dapat dibedakan, tetapi nilainya bagi pengguna belum terbukti. Khususnya, belum ada bukti bahwa pengguna memerlukan ledger publik untuk fungsi precommit, atau bahwa komitmen on-chain menambah hasil di atas rekaman bertanda tangan dan audit biasa.

Selain itu, NESO menjelaskan intensitas nasional sebagai rata-rata emisi pembangkit berbobot produksi terhadap permintaan, dengan koreksi rugi-rugi transmisi. WattTime membedakan sinyal rata-rata untuk accounting dari sinyal marginal yang ditujukan untuk menilai perubahan akibat load shifting. Jadi hasil GridWitness berbasis NESO harus disebut **metrik operasional berbobot intensitas rata-rata**, bukan emisi kausal yang dihindari. Sumber: [metodologi NESO](https://www.neso.energy/document/373936/download), [WattTime signal overview](https://watttime.org/data-science/data-signals/).

Carbon Aware SDK juga sudah mengidentifikasi jendela forecast dengan intensitas yang diperkirakan lebih rendah dan menerima durasi workload; dokumentasi menjelaskan forecast serta hasil `optimal carbon intensity windows`. Sumber: [Carbon Aware Library](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library).

### Hasil reproduksi terbatas atas arsip forecast

Saya membaca ulang artefak SQLite yang dibuat dalam spike agen dan menghitung ulang hash serta skenario ringkasnya:

| Atribut | Hasil pemeriksaan |
|---|---:|
| Berkas | `national_2026-09.sqlite` |
| SHA-256 | `980847c5f39cadd425808726a4d61a9f38589d9e7e18620e7b680cebde588d6e` |
| Ukuran | 606.208 byte |
| Baris vintage | 29.563 |
| Target setengah jam | 1.440 |
| Waktu capture | 234 |
| Episode yang memenuhi aturan ketersediaan data | 208, dalam 30 hari |
| Skenario | Beban empat setengah-jam; horizon pilihan 12 jam |
| Skor mean Immediate | 422,81 |
| Skor mean NESO-Greedy | 331,97 |
| Greedy menang / kalah / seri | 144 / 29 / 35 |
| Pelanggaran waktu forecast setelah keputusan | 0 pada episode yang dihitung |

Rekonstruksi memilih forecast terbaru dengan `capture_utc <= decision_time`, lalu menilai empat slot beban terhadap nilai actual terakhir yang tersedia. Angka skor adalah jumlah nilai intensitas per slot; tidak menjadi ton CO₂ tanpa profil energi, dan tetap tidak menyatakan dampak kausal marginal. Episode berulang/korelasi waktunya tinggi; tidak ada interval keyakinan atau evaluasi lintas musim dalam spike ini.

**Kesimpulan:** angka di atas membuktikan bahwa dataset dapat mendukung demonstrasi perbandingan baseline tertentu. Angka itu tidak membuktikan GridWitness sebagai produk berbeda, AI memberi nilai tambah, blockchain dibutuhkan, atau proyek mengurangi emisi aktual.

### Status keputusan GridWitness

**NO-GO untuk pitch “AI carbon-aware scheduler + blockchain” dalam bentuk awal.** Varian bernama ShiftProof dapat diuji hanya jika fokusnya audit klaim berbasis sinyal marginal dan komitmen sebelum outcome. WattTime menyediakan akses riset nonkomersial gratis dengan persetujuan; halaman data meminta pengguna mengajukan akses dan syaratnya melarang redistribusi data. Jadi akses sinyal, region, forecast historis, ketentuan demo/repo publik, dan adanya pihak yang membutuhkan audit harus dipastikan lebih dahulu. Sumber: [WattTime for Research](https://watttime.org/data-science/for-research/), [Noncommercial Agreement](https://watttime.org/noncommercial-agreement/), [Data Plans](https://watttime.org/docs-dev/data-plans/).

## Flood Evidence QA: data benar-benar ada, tetapi bukan ground truth

### Pemeriksaan artefak EMSR838

Agen validasi mengunduh produk resmi Copernicus EMS untuk EMSR838 AOI01. Saya memeriksa ulang berkas hasil unduhan yang tersedia di workspace sementara:

| Atribut | Hasil pemeriksaan |
|---|---|
| ZIP | 20.563.514 byte |
| SHA-256 | `2ae69c2a70da00d4a78361cde7879f3004d4c8d24ea708b98d63fd8a910b0fe0` |
| Uji arsip | `zipfile.testzip()` = OK |
| Anggota arsip | 37 |
| GeoJSON layer `observedEventA` | 1.291 fitur |
| Atribut tiap fitur | `5-Flood`, `Riverine flood`, `Flooded area`, `Semi-automatic extraction` |
| Keterangan kualitas di metadata XML | Skala analisis 1:50.000; MMU 5.625 m²; RMSE 30 m |

Sumber produk: [API aktivasi EMSR838](https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR838), [GeoJSON observed flood extent AOI01](https://rapidmapping-viewer.s3.eu-west-1.amazonaws.com/EMSR838/AOI01/DEL_PRODUCT/EMSR838_AOI01_DEL_PRODUCT_observedEventA_v1.json), [panduan API CEMS](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/).

Ini bukti adanya layer referensi yang dapat diolah; **bukan** validasi lapangan, bukan label piksel 10 m, dan bukan hasil pengujian model. Agen menemukan input Sentinel-1 yang terkait berdekatan dengan waktu produk. Jika citra yang sama menjadi input dan peta CEMS menjadi target, hasil hanya mengukur kesesuaian dengan produk CEMS, bukan akurasi independen.

### Pemeriksaan status produk EMSR933

Saya memeriksa ulang respons API yang diunduh agen (`GET ...public-activations/?code=EMSR933`): ukuran 34.456 byte, SHA-256 `07f5dc5818c94e1f2326cf9eb22b9edc7e49b8292df4b209b348bb5049b933ae`. Hitungan pada `results[0].aois[*].products[*]`:

- 8 AOI, 18 item produk;
- 7 berstatus `F`;
- 11 berstatus `N`;
- dari status `N`, 10 alasannya `Because of remote sensing limitations`, dan 1 `Because of no change of situation detected`.

Ini satu aktivasi yang sedang berlangsung, bukan tingkat kegagalan seluruh CEMS. Nilainya menunjukkan bahwa sistem audit perlu membedakan hasil, keterbatasan sensor, dan data yang tidak tersedia. Dokumentasi CEMS menjelaskan API memuat metadata produk, tautan unduhan, serta metadata versi/kualitas; sumber: [CEMS data harvesting](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/).

### Prior art dan ruang pembeda

- CEMS sendiri sudah membuat dan menerbitkan produk delineasi/kerusakan banjir. “AI detector banjir dari citra satelit” generik langsung berhadapan dengan pekerjaan layanan tersebut.
- [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger) menyatakan proyeknya selesai pada Maret 2020, telah membuat MVP untuk pengelolaan klaim otomatis berbasis penginderaan jauh, data GNSS kunjungan lapangan, dan kontrak blockchain.
- [Floodbase](https://www.floodbase.com/use-cases-old/parametric-flood-insurance) menawarkan pemanfaatan intelijen banjir untuk underwriting dan trigger asuransi parametrik. Klaim kinerja di halaman vendor adalah klaim vendor; audit ini tidak menguji produknya.

Pembeda yang masih mungkin diuji ialah lapisan **audit kualitas dan ketidakpastian bukti lintas versi/sumber**: memperlihatkan apa yang terpetakan, apa yang tidak dapat dianalisis, input sensor apa yang dipakai, dan perubahan data setelah review manusia. Ini belum terbukti dibutuhkan oleh lembaga tanggap darurat. Jangan memosisikannya sebagai prediksi banjir, bukti kerugian, auto-payout, atau pengurangan kerugian.

### Gerbang Flood Evidence QA

Lanjutkan hanya jika sprint data singkat menghasilkan semua ini:

1. Minimal lima aktivasi banjir berbeda memiliki produk dan metadata yang bisa diproses. Ambang lima ini adalah gerbang engineering yang kami pilih untuk menguji pembagian berbasis kejadian, bukan standar industri.
2. Uji pisah per aktivasi; jangan mengacak piksel dari kejadian yang sama ke train dan test.
3. Jika model memakai citra Sentinel-1 yang sama dengan input produk CEMS, laporkan metrik sebagai **agreement with CEMS reference**, bukan akurasi ground-truth. Untuk klaim independen diperlukan sumber evaluasi yang berbeda atau data lapangan yang berizin.
4. Klasifikasikan `flooded`, `not analysed/limited`, dan `unknown` secara eksplisit. Area tanpa label tidak boleh diperlakukan sebagai area kering.
5. Uji bahwa versi bukti yang diubah mengubah hash, dan bahwa alur review tidak menghapus rekaman awal.
6. Jika tak ada penggunaan lintas pihak yang memerlukan ledger dan AI tidak mengalahkan baseline yang jelas, jangan pertahankan AI/blockchain hanya agar memenuhi daftar teknologi.

## Kandidat baru: CoolingProof

NYC Open Data menyajikan dataset [Forestry Tree Points](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap) dengan 1,12 juta baris menurut laman dataset, termasuk field `PlantedDate` dan `Location`; dataset [MillionTreesNYC Block Planting Locations](https://data.cityofnewyork.us/Environment/MillionTreesNYC-Block-Planting-Locations/vr8g-vfny) mencatat sekitar 20.513 segmen jalan dengan musim tanam. USGS menyediakan [Landsat Collection 2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature) secara global.

Peluang produknya ialah **audit hasil pascapenanaman**, memakai kohort lokasi/tanggal tanam dan lokasi kontrol yang dipraregistrasikan. AI dapat membantu membangun kontrol/counterfactual, lalu ledger mencatat cohort, protokol, input, versi model, dan hasil agar perubahan laporan terlihat.

Namun, [WRI Cool Cities Lab](https://www.wri.org/data/cool-cities-lab) sudah mengidentifikasi lokasi prioritas dan mensimulasikan potensi dampak tree planting/cool roofs; tool itu diluncurkan 17 Maret 2026 dan dikembangkan dengan masukan pejabat kota. Cool Cities Lab mengestimasi sejumlah indikator thermal stress/suhu udara; CoolingProof hanya berbeda jika benar-benar mengukur hasil pascaintervensi dengan desain yang kredibel.

Batas validasi:

- Saya belum menghitung berapa banyak record pohon yang memiliki tanggal tanam dan lokasi valid, atau berapa banyak pasangan scene Landsat bersih sebelum/sesudah tersedia. Probe API via shell pada lingkungan ini gagal karena DNS tidak tersedia; angka ketersediaan lengkap belum diverifikasi.
- Landsat mengukur **land surface temperature**, bukan suhu udara atau paparan tubuh. Produk USGS memiliki QA/uncertainty band dan caveat retrieval; gunakan mask QA, skala konversi resmi, dan jangan menyamakan LST dengan kesehatan.
- Perubahan LST setelah penanaman bukan dengan sendirinya efek kausal pohon. Cuaca, kanopi yang bertahan, perubahan permukaan, waktu akuisisi, dan seleksi lokasi perlu ditangani. Desain matched controls/difference-in-differences dapat menghasilkan estimasi observasional; bukan eksperimen acak.
- Blockchain hanya bermakna jika ada pihak berbeda yang perlu menyetujui/mengaudit protokol dan hasil. Belum ada bukti pengguna menuntut blockchain untuk audit pohon.

**Putusan:** jalankan hanya gate data 24 jam; jangan mengumumkan CoolingProof sebagai kandidat terbaik sebelum cukup lokasi bertanggal dan citra berpasangan ditemukan. Pembeda potensialnya lebih jelas daripada dashboard mangrove, tetapi kesulitan validasinya lebih tinggi.

## Pemeriksaan kandidat lain

| Kandidat | Bukti yang terverifikasi | Mengapa belum menjadi pilihan utama |
|---|---|---|
| **MethaneResponse** | IEA melaporkan sekitar 12% notifikasi MARS menerima respons pada 2025 dan menyusun alur lima tahap dari penugasan hingga dokumentasi; [laporan IEA](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system). | MARS sudah menjalankan notifikasi, status respons, tindak lanjut, dan publikasi hasil. Ledger tidak membuktikan operator merespons. Probe STAC Carbon Mapper dan jumlah record attribution yang dilaporkan agen belum saya reproduksi; treat sebagai belum diverifikasi root. Lanjut hanya jika pengguna mengonfirmasi celah interoperabilitas tertentu. |
| **HourGuard** | [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/) secara eksplisit memuat matching per jam/sub-jam, data meter/timestamp, dan aspek pencegahan fraud. | Matching per jam dan audit sertifikat sudah menjadi domain standar. Peluang ada pada integrasi atau bukti kasus lintas registry, tetapi belum tersedia bukti akses registry/sertifikat nyata untuk MVP ini. |
| **MangroveProof** | UNESCO [Mangrove Restoration Tracker Tool](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt) memuat baseline sebelum restorasi, intervensi, serta monitoring sesudahnya. | Monitoring mangrove dasar sudah ada. Citra tanpa data lapangan tidak membuktikan survival bibit atau karbon terserap. |
| **ForestPassport** | Komisi Eropa memiliki [EUDR Information System](https://green-forum.ec.europa.eu/deforestation-regulation-implementation/information-system-deforestation-regulation_en); FAO WHISP melakukan plot-level risk screening. | Tanpa data lot/pemasok sungguhan, traceability berakhir sebagai simulasi; blockchain tidak membuktikan pengiriman fisik. |
| **FlexReceipt / Demand Response M&V** | FERC menjelaskan demand response dan program metering; OpenADR menerbitkan protokol sinyal. | Dalam pencarian ini belum ditemukan dataset publik yang menyatukan waktu event, meter aktual peserta, dan periode pembanding. Dataset profil beban sintetis tidak membuktikan kWh yang benar-benar dilepas saat event. |
| **CurtailmentCapture** | IEA mengakui pertumbuhan curtailment dan kebutuhan fleksibilitas. | Data ex-post tidak membuktikan beban yang dijadwalkan akan menghindari curtailment. Data/settlement CAISO belum diuji di audit ini. |

## Matriks keputusan tanpa skor buatan

“Tinggi/sedang/rendah” di bawah adalah penilaian kualitatif berdasarkan bukti yang disebutkan, bukan skor juri atau peluang menang.

| Aspek rubrik | Flood Evidence QA | CoolingProof | ShiftProof | MethaneResponse |
|---|---|---|---|---|
| Climate impact | Masalah adaptasi banjir nyata; manfaat prototype terhadap kerugian belum terbukti | Panas kota dan penanaman pohon relevan; perubahan LST bukan manfaat kesehatan/kausal | Dapat dikaitkan dengan reduksi emisi hanya jika pakai marginal MOER dan lisensinya sesuai | Problem response gap terukur; aplikasi belum membuktikan respons tambahan |
| Innovation | Rendah–sedang sampai membuktikan nilai QA yang tidak ada pada produk CEMS/EO-Claim Ledger | Potensial pada audit hasil pascaintervensi; overlap dengan WRI pada planning/pre-impact | Rendah untuk scheduler; lebih potensial untuk audit marginal claim, tetapi blockchain need belum ada | Rendah jika mengulang workflow MARS |
| Technical execution | Dataset operasional sudah diambil/diinspeksi; model dan evaluasi lintas kejadian belum dibuat | Dataset ada di portal; pasangan citra dan analisis belum dijalankan | Baseline dapat diuji; akses MOER serta legalitas data untuk repo/demo jadi gate | Data plume tersedia menurut probe agen; attribution/AI belum diverifikasi root |
| Practical usefulness | Target: tim pemetaan/tanggap darurat; kebutuhan ledger belum dibuktikan | Target: pemerintah kota/funder; WRI telah melayani sebagian kebutuhan perencanaan | Target: auditor/operator workload; pengguna/claim dispute belum dikonfirmasi | Target: focal point/operator; alur otoritas dan MARS sudah ada |
| Presentation | Kuat secara visual dan menunjukkan keterbatasan data | Kuat jika menghasilkan pasangan before/after yang valid | Jelas secara teknis, tetapi serupa produk lain | Cerita dampak kuat, namun risiko overclaim tinggi |
| Status | **Proof sprint pertama** | **Gate data 24 jam, lalu putuskan** | **NO-GO sebelum akses marginal legal dan kebutuhan pengguna** | **Bersyarat pada gap pengguna yang belum ditangani MARS** |

## Rekomendasi tindakan

### Jika harus memilih satu untuk mulai dibangun sekarang

Mulai **Flood Evidence QA** sebagai proof-of-concept kecil, bukan sebagai janji produk final. Alasan yang dapat dibuktikan adalah adanya dataset CEMS operasional yang telah diinspeksi secara nyata, termasuk peta referensi, metadata kualitas, dan status “remote sensing limitations”. Itu membuat demo bisa jujur tentang bukti dan hal yang tidak diketahui.

Batasi klaim proyek pada:

> “Kami mengaudit kelengkapan, sumber, versi, dan keterbatasan produk bukti peta banjir agar reviewer dapat melihat apa yang terukur dan apa yang belum diketahui.”

Jangan klaim “memprediksi banjir”, “menentukan kebenaran banjir”, “membuktikan kerugian”, “memicu payout yang aman”, atau “mengurangi korban/kerugian”. Untuk mempertahankan kandidat ini, perlu ada model atau triage AI yang mengalahkan baseline dan satu manfaat pengguna yang jelas. Kalau tidak, jangan mengirimkannya dengan AI/ledger kosmetik.

### Syarat keputusan final sebelum mengunci ide

Pilih kandidat hanya jika lulus keempat gerbang berikut:

1. **Data:** ingestion dapat direproduksi, asal/lisensi jelas, dan target evaluasi tidak memakai input yang sama secara bocor.
2. **Nilai algoritme:** AI/ML mengalahkan baseline sederhana pada holdout yang benar; bila tidak, hilangkan klaim bahwa AI menjadi pembeda.
3. **Kegunaan:** ada aktor dan keputusan nyata yang dibantu; tanpa ini, narasi pengguna adalah hipotesis.
4. **Blockchain:** ada batas kepercayaan lintas pihak atau kebutuhan komitmen sebelum hasil. Tampilkan serangan/perubahan yang dapat dideteksi dan jelaskan apa yang ledger tidak jamin.

Jika tidak ada kandidat yang lulus, pilihan jujur ialah submission PoC yang mengakui ruang lingkup sempit, bukan mengganti nama kandidat atau menyisipkan angka dampak yang tidak terukur.

## Hal yang tetap tidak diketahui

- Daftar lengkap submission belum terlihat. Pencarian publik menemukan tiga halaman proyek terkait, tetapi gallery Devpost belum diterbitkan dan pencarian web tidak dapat membuktikan kelengkapan.
- Tidak ada bobot numerik resmi untuk lima kriteria, jadi ranking rubrik berbobot tidak dapat dihitung dari sumber resmi.
- Belum dilakukan wawancara pengguna, dan tidak ada operator/mitra yang menyetujui penggunaan produk.
- Belum diuji apakah hash on-chain diperlukan oleh pengguna dibanding signed artifacts, database audit, atau timestamped repository.
- Belum ada hasil model/AI untuk Flood Evidence QA, CoolingProof, atau MethaneResponse.
- Belum ada klaim penurunan emisi, pengurangan kerugian banjir, atau manfaat kesehatan yang terverifikasi untuk proyek yang kita bahas.
- Tidak ada kandidat yang memiliki peluang menang atau Top 3 yang dapat dihitung dari data yang tersedia.

## Addendum 11 Oktober 2026: audit halaman submission publik

### Batas cakupan

Saya memeriksa halaman gallery resmi dan mencari halaman proyek Devpost yang secara eksplisit mengaitkan proyeknya dengan IEEE ClimateChain. Galeri masih tersembunyi; tab peserta meminta login. Hasil berikut adalah **tiga halaman publik yang ditemukan**, bukan jumlah keseluruhan submission. Diskusi peserta tentang analisis ENSO tidak dihitung sebagai submission karena itu hanya pertanyaan di forum.

### Proyek yang ditemukan

| Proyek | Yang tampak di halaman publik | Penilaian awal terhadap rubrik | Bukti yang belum cukup |
|---|---|---|---|
| [CarbonShield](https://devpost.com/software/carbonshield) | Audit sensitivitas keputusan verifikasi kredit REDD+; model ex-ante; enam dimensi stress test; hash audit dan anchor EVM. Halaman mencantumkan repo serta video demo. Track Carbon Markets adalah pemetaan paling dekat, tetapi halaman tidak menandai track secara eksplisit. | **Submission publik dengan bukti implementasi terkuat yang kami temukan.** Masalahnya memiliki dasar ilmiah kuat: studi *Nature Communications* atas 44 proyek REDD+ melaporkan bahwa klaim agregat penghindaran deforestasi jauh lebih besar daripada estimasi independen. Repo memiliki source, test files, hasil model, 44 audit records, frontend, dan kontrak. | Hasil yang dipublikasikan pemilik belum semuanya direproduksi independen. Dataset model hanya 43 outcome berlabel; hasil LOCO lebih lemah daripada LOPO. Artefak deployment menyebut `local-dev`, bukan jaringan publik. README utama masih mengatakan Phase 1 sedang berjalan, sementara dokumen Phase 2 menyatakan tes selesai. Kontrak source mengimpor OpenZeppelin lewat path Windows absolut; `client.py` memuat fungsi placeholder; suite tidak dijalankan ulang dalam audit ini. Jadi keberadaan kode nyata tidak sama dengan verifikasi bahwa semua klaim halaman berjalan baik dari checkout bersih.
| [AION V3 — Sovereign Value OS](https://devpost.com/software/aion-v3-sovereign-value-os) | Menggambarkan alur data → peluang → keputusan → eksekusi → bukti → nilai terverifikasi. Contoh yang terlihat berfokus pada inventori, logistik, pemasok, margin, dan modal; lingkungan dibingkai sebagai perluasan. Halaman menyebut stack teknologi, termasuk Ethereum/Hyperledger dan AI. | Cerita “expected value vs verified value” mudah dipahami; bisa cocok ke supply chain bila use case iklim dibuat spesifik. | Pada halaman publik yang kami periksa, dampak iklim masih berupa perluasan masa depan. Kami tidak menemukan repo atau demo publik yang dapat digunakan untuk menguji stack dan hasilnya. Ini berarti bukti tidak terlihat di halaman yang diperiksa, bukan bukti bahwa artefak tersebut tidak ada.
| [BioCyclic HealthNet](https://devpost.com/software/biocyclic) | Mengusulkan bioleaching baterai menggunakan asam dari limbah citrus, pemulihan logam, dan pemetaan risiko kesehatan. Halaman berisi video, tetapi proyek dimulai Mei 2026 dan tercantum pada banyak hackathon. | Masalah limbah baterai dan kimia sirkular menarik untuk storytelling; namun proyek ini lebih berpusat pada proses kimia daripada AI/blockchain. | Klaim efisiensi pemulihan `>90%`, proyeksi laba, dan payback belum didukung data eksperimen atau model ekonomi yang dapat diperiksa di halaman. “Digital layer” disebut masih konseptual; blockchain tidak tercantum pada teknologi yang digunakan. Waktu pengaitan dengan IEEE ClimateChain tidak jelas, jadi kami menandainya sebagai proyek lintas-event lama.

### Apa artinya untuk kandidat kita

- **CarbonShield mengubah baseline kompetitif.** Flood Evidence QA tidak cukup menjadi “data lingkungan + stress test + hash”. Agar berbeda, ia perlu membuktikan manfaat audit yang spesifik pada produk banjir: misalnya klasifikasi terukur antara hasil pemetaan, keterbatasan sensor, dan keadaan yang tidak diketahui; konflik antarversi/sumber; serta alur review yang dapat diuji lintas beberapa aktivasi.
- **Flood Evidence QA masih punya peluang domain**, karena submission CarbonShield yang terlihat berfokus pada kredit REDD+, bukan pemetaan banjir. Tetapi saat ini CarbonShield lebih siap secara teknis; Flood Evidence QA baru punya dataset operasional dan belum memiliki model, evaluasi lintas-kejadian, atau pengguna tervalidasi.
- **CoolingProof berpotensi lebih berbeda dari tiga halaman yang ditemukan**, tetapi belum punya hasil kohort atau pasangan citra yang sudah diuji. Keunikan domain saja tidak mengisi kekosongan technical execution.
- **GridWitness/ShiftProof, MethaneResponse, dan HourGuard** tetap menghadapi prior art eksternal yang sudah dicatat di atas. Tidak ditemukannya submission serupa pada indeks web bukan bukti bahwa peserta lain tidak mengerjakannya.

**Kesimpulan sementara:** dari submission publik yang berhasil kami telusuri, CarbonShield memiliki bukti artefak paling tebal. Itu bukan bukti bahwa ia akan menang. Untuk proyek kita, kandidat yang paling masuk akal untuk diuji lanjut tetap Flood Evidence QA, tetapi hanya bila proof sprint menunjukkan nilai QA yang berbeda dan terukur. Periksa ulang setelah gallery dibuka atau setelah indeks publik menemukan halaman baru.

## Sumber utama

- [IEEE ClimateChain: aturan, rubrik, dan submission](https://ieee-climatechain-hack.devpost.com/)
- [Galeri submission Devpost](https://ieee-climatechain-hack.devpost.com/project-gallery)
- [Panduan Devpost: kapan proyek muncul di gallery](https://help.devpost.com/article/80-what-is-the-project-gallery)
- [CarbonShield submission](https://devpost.com/software/carbonshield)
- [CarbonShield public repository](https://github.com/saideeksha19/carbonshield)
- [AION V3 submission](https://devpost.com/software/aion-v3-sovereign-value-os)
- [BioCyclic project page](https://devpost.com/software/biocyclic)
- [Swinfield et al., Nature Communications (2026)](https://www.nature.com/articles/s41467-026-71552-3)
- [GridCast public repository](https://github.com/Ahmed-KA-Abdalla/gridcast)
- [NESO carbon intensity methodology](https://www.neso.energy/document/373936/download)
- [WattTime marginal/average data signals](https://watttime.org/data-science/data-signals/)
- [WattTime research access](https://watttime.org/data-science/for-research/)
- [CEMS API harvesting guide](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/)
- [EMSR838 activation metadata](https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/?code=EMSR838)
- [EMSR838 AOI01 flood GeoJSON](https://rapidmapping-viewer.s3.eu-west-1.amazonaws.com/EMSR838/AOI01/DEL_PRODUCT/EMSR838_AOI01_DEL_PRODUCT_observedEventA_v1.json)
- [ESA EO-Claim Ledger](https://business.esa.int/projects/eo-claim-ledger)
- [IEA MARS response framework](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system)
- [NYC Forestry Tree Points](https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap)
- [NYC MillionTreesNYC planted blocks](https://data.cityofnewyork.us/Environment/MillionTreesNYC-Block-Planting-Locations/vr8g-vfny)
- [USGS Landsat Collection 2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature)
- [WRI Cool Cities Lab](https://www.wri.org/data/cool-cities-lab)
- [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/)
