# Keputusan Kandidat Proyek

> **Status: seluruh ranking di bawah adalah snapshot historis.** Reassessment bertanggal 11 Oktober 2026 setelah audit dataset UNEP, NYC, NESO, dan CEMS berada pada bagian paling bawah. Belum ada kandidat yang terbukti terbaik lewat eksperimen pada data mentah.

**Tanggal:** 11 Oktober 2026 (WITA)  
**Konteks keputusan:** sekitar dua minggu sampai deadline Devpost 25 Oktober 2026, pukul 17.00 MSK / 22.00 WITA. Target yang dipakai: prototype tanpa survei lapangan, bukti teknis yang bisa direproduksi, dan satu demo end-to-end.  
**Catatan:** kriteria resmi mencakup Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, dan Presentation & Communication, tanpa bobot numerik yang dipublikasikan. Urutan ini penilaian risiko/kelayakan kami, bukan skor juri atau peluang menang.

## Pilihan saya

**Uji GridWitness terlebih dahulu.** Dari kandidat yang dibahas, ini yang paling seimbang untuk menghasilkan bukti terukur dalam waktu terbatas: ada forecast dan actual carbon intensity dari NESO, ada arsip forecast-vintage pihak ketiga, dan keputusan penjadwalan bisa diputar ulang tanpa klaim survei lapangan.

Ini **belum berarti GridWitness sudah terbukti paling baik**. NESO menyediakan data dan API, tetapi forecast-aware scheduling sendiri sudah dikerjakan Carbon Aware SDK. Pembeda GridWitness harus dibuktikan sebagai hasil tambahan: keputusan dikomit sebelum outcome, uncertainty dipakai secara benar, lalu performa historis dibandingkan dengan baseline sederhana. Arsip forecast-vintage yang ditemukan adalah proyek pihak ketiga; pembuatnya menyatakan API NESO tidak menyimpan riwayat forecast dan scraper-nya kehilangan sebagian capture. Data integrity, coverage, dan metodologi split wajib diperiksa sebelum angka dipakai.

Sumber: [NESO National Carbon Intensity Forecast](https://www.neso.energy/data-portal/national-carbon-intensity-forecast/national_carbon_intensity_forecast), [Carbon Intensity API resmi](https://carbon-intensity.github.io/api-definitions/), [arsip forecast-vintage](https://github.com/nmpowell/carbon-intensity-forecast-tracking), [Carbon Aware SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/overview), [forecast handler/historical replay SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library).

## Urutan kandidat menurut tujuan di atas

| Urutan | Kandidat | Mengapa | Gerbang utama |
|---|---|---|---|
| **1** | **GridWitness** | Paling mudah membuat eksperimen kuantitatif yang dapat dibantah; AI, optimizer, dan audit precommit berpotensi punya fungsi jelas. | Backtest bebas look-ahead harus memberi manfaat terukur dibanding Immediate dan NESO-Greedy; kalau tidak, jangan teruskan klaim keunggulan. |
| **2** | **HourGuard** | Paling mudah membuktikan hasil benar/salah secara deterministik dan membuat demo stabil. | Hourly matching sudah dijelaskan dalam standar EnergyTag; kebaruan harus datang dari kasus audit/duplikasi yang spesifik, bukan rumus matching saja. |
| **3** | **MethaneResponse** | Cerita dampak iklim dan visualisasi sangat kuat; observasi nyata tersedia. | Banyak fungsi inti sudah ada di MARS/Eye on Methane dan Carbon Mapper; kandidat hanya lanjut bila ada kebutuhan pengguna yang belum tertangani. Lihat [audit rinci](methane-response-audit.md). |
| **4** | **MangroveProof** | Dampak ekosistem dan demo peta mudah dipahami; data GMW tersedia. | Global Mangrove Watch sudah menyediakan perubahan habitat/alert dan Mangrove Restoration Tracker Tool untuk baseline, intervensi, serta monitoring. Tanpa validasi lapangan, jangan klaim keberhasilan restorasi atau karbon terserap. |
| **5** | **ForestPassport** | Masalah traceability relevan dan cocok dengan track supply chain. | Tanpa data batch/pemasok atau mitra, alur rantai pasok cenderung simulasi; analisis lahan saja belum membuktikan provenance produk. |
| **6** | **DeforestResponse** | Dapat membangun alur alert–tindak lanjut untuk hutan. | Kuat overlap dengan platform dan alert deforestasi yang telah tersedia; butuh pembeda serta data respons lokal. |

Rujukan utama: [EnergyTag Granular Certificate Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/), [Global Mangrove Watch](https://www.globalmangrovewatch.org/), [Mangrove Restoration Tracker Tool](https://mrtt.globalmangrovewatch.org/), [UNESCO tentang MRTT](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt).

## Syarat sebelum GridWitness menjadi pilihan final

Jalankan eksperimen dulu, bukan bangun dashboard dulu:

1. Rekonstruksi forecast yang benar-benar tersedia pada setiap waktu keputusan dari arsip forecast-vintage; hitung kehilangan capture dan keluarkan periode yang tidak memenuhi syarat.
2. Bandingkan Immediate, NESO-Greedy, GridWitness, dan Oracle (Oracle hanya batas teoritis). Gunakan pemisahan kronologis serta larang fitur yang timestamp-nya melewati waktu keputusan.
3. Laporkan hasil berpasangan: perubahan metrik intensity-weighted, proporsi keputusan yang memburuk, tail regret, dan pelanggaran deadline. Jangan menyebutnya emisi kausal yang dihindari.
4. AI harus diuji melawan forecast NESO dan baseline sederhana. Kalau tidak memberi nilai pada akurasi atau risiko, ubah perannya atau hentikan konsep ini.
5. Blockchain hanya menyimpan komitmen keputusan/bukti sebelum hasil diketahui. Demo harus menunjukkan perubahan artefak gagal diverifikasi; jangan mengklaim ledger membuktikan dampak iklim.

**Keputusan setelah gerbang:** jika GridWitness tidak menunjukkan manfaat berarti terhadap NESO-Greedy, pindah ke HourGuard untuk prototype yang lebih deterministik. Jika tidak ada tim pengguna/aktor dan blockchain tetap kosmetik, sederhanakan atau pilih masalah lain; jangan mempertahankan konsep karena sudah terlanjur dibuat.

## Kesimpulan

**Pilihan pertama saya: GridWitness untuk diuji. Pilihan cadangan: HourGuard.** MethaneResponse kini bukan pilihan nomor satu karena bukti terbaru memperlihatkan overlap sistem yang kuat. Tidak ada bukti yang cukup untuk menjamin kandidat mana pun akan menang; pembeda praktis GridWitness baru terbentuk bila eksperimennya lolos baseline.

## Reassessment setelah audit data publik — 11 Oktober 2026

Bagian ini menggantikan ranking historis di atas. Sumber resmi mengonfirmasi bahwa kelima kandidat memiliki dataset atau struktur pengujian yang relevan, tetapi belum ada pemrosesan arsip penuh/backtest untuk kelimanya. Peringkat berikut adalah urutan kandidat yang paling layak diuji dahulu, bukan prediksi pemenang atau skor resmi.

| Urutan uji | Kandidat | Alasan saat ini | Gerbang sebelum dipilih final |
|---|---|---|---|
| **1** | **MethaneResponse** | Data UNEP benar-benar memuat observasi plume dan ringkasan sumber, termasuk flux, persistensi, notifikasi, feedback, dan status emisi. IEA melaporkan sekitar 12% notifikasi MARS 2025 memperoleh respons. Ini metrik respons/engagement, bukan mitigasi berhasil. | Unduh dan profilkan payload asli; fokuskan produk pada audit independen atas status/tindak lanjut. Jangan mengklaim sistem baru mendeteksi metana atau membuktikan perbaikan, sebab MARS sudah menjalankan deteksi, atribusi, notifikasi dan pemantauan. Pastikan fitur/label temporal tidak bocor dan penggunaan mematuhi lisensi CC BY-NC-SA 4.0. |
| **2** | **ShiftProof / GridWitness** | Kandidat paling siap untuk eksperimen kuantitatif: arsip pihak ketiga menyimpan snapshot API NESO dua kali per jam dan menyatakan API asal menimpa forecast lama. | Bekukan rentang dan kelengkapan data; bandingkan Immediate, forecast-greedy, dan kebijakan usulan dengan split kronologis. Existing carbon-aware schedulers membuat algoritma scheduler sendiri bukan pembeda. Hasil intensity-weighted bukan bukti emisi kausal yang dihindari. |
| **3** | **CoolingProof** | NYC mengonfirmasi 618 poligon restorasi hutan dan 20.513 segmen jalan yang ditanami. Evaluasi pasca-intervensi mungkin berbeda dari tool WRI yang memodelkan potensi intervensi. | Periksa tahun aktual `IniPlntSn`, luas poligon, citra layak dan kontrol sebelum menjalankan DiD. Tindakan restorasi mencakup penghilangan tanaman invasif dan penanaman; Landsat ST memiliki masalah data hilang, blockiness pada target kecil, dan bias saat NDVI berubah. Hasil awal hanya perubahan LST teramati, bukan suhu udara atau dampak kausal. |
| **4** | **FloodWitness** | API CEMS memperlihatkan metadata versi, alasan, waktu pengiriman dan unduhan saat ini; QC memang dapat menghasilkan v2/v3. | Belum ada bukti cukup bahwa pasangan berkas versi asli tersedia. OCHA-DAP sudah memiliki arsip ZIP CEMS, hash SHA-256 dan jurnal transfer append-only yang dilaporkan publik. Lanjut hanya bila ditemukan pasangan v1→v2 yang asli dan diff/graf supersession memberi manfaat tambahan yang nyata. |
| **5** | **HourGuard** | Rules engine dapat diuji secara deterministik dengan kasus konsumsi, interval, wilayah, dan duplikasi. | EnergyTag telah memiliki standar matching granular dan organisasi penerbit terakreditasi; dataset konsumsi/generasi bukan bukti sertifikat asli diterbitkan atau dibatalkan. Jangan klaim menemukan fraud pasar bila seluruh kasus sertifikat adalah fixture uji. |

### Penilaian sumber dan batas bukti

- **MethaneResponse:** dokumentasi UNEP mengonfirmasi field tetapi feedback adalah indikator UNEP menerima informasi, bukan bukti perbaikan fisik. `Potentially ceased` berarti beberapa pengamatan hyperspectral tanpa plume tervalidasi, bukan atribusi kausal ke tindakan operator. Data publik umumnya ditunda sekitar 30 hari. MARS sendiri sudah menjalankan deteksi, atribusi, notifikasi, pelacakan, dan menggunakan model AI.
- **ShiftProof:** repositori arsip menyatakan menangkap API dua kali per jam; sekitar 90% slot normal dan celah diperlakukan sebagai celah. Ini menjadikan snapshot-vintage memungkinkan, tetapi belum berarti backtest kita sudah dijalankan atau lolos.
- **CoolingProof:** hitungan baris dataset adalah metadata sumber, bukan bukti bahwa semua situs memiliki tanggal yang cukup, citra bersih, atau kontrol yang sebanding.
- **FloodWitness:** dokumentasi CEMS menyebut situs menampilkan versi terbaru; API menjelaskan versi terkini, bukan endpoint riwayat lengkap. Hitungan OCHA adalah angka yang dipublikasikan pemilik arsip dan belum dihitung ulang oleh tim.
- **HourGuard:** data smart meter dan pembangkitan dapat mendukung simulasi matching, sementara audit sertifikat sungguhan memerlukan registry dan status retirement yang belum ditemukan.

### Keputusan kerja

**Uji MethaneResponse terlebih dahulu sebagai kandidat dampak tinggi, dengan ShiftProof sebagai fallback paling aman untuk bukti eksperimen.** Bila setelah profiling data UNEP proyek hanya mengulang dashboard/alert MARS atau tidak dapat menunjukkan pembeda pengguna, pindah ke ShiftProof. CoolingProof dapat naik ke dua teratas jika screening sekitar 20 situs menemukan cukup lokasi dan kontrol yang layak. FloodWitness tidak dipilih pertama sebelum arsip versi lama dan diferensiasi terhadap OCHA terbukti.

Rujukan primer: [rubrik dan track Devpost](https://ieee-climatechain-hack.devpost.com/), [kamus data MARS](https://methanedata.unep.org/dict-mars-plumes), [angka response 2025 dan panduan IEA](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [arsip forecast NESO](https://github.com/nmpowell/carbon-intensity-forecast-tracking), [NYC forest restoration sites](https://data.cityofnewyork.us/Environment/NYC-Parks-Forest-Restoration-Planting-Sites/ifu9-zqkd), [caveat suhu permukaan USGS](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature), [API CEMS](https://mapping.emergency.copernicus.eu/about/how-to-harvest-cems-mapping-data/emergency-response-data/), [arsip banjir OCHA-DAP](https://ocha-dap.github.io/ds-geospatial-impact-estimates/cems-flood-archive/), dan [standar EnergyTag](https://energytag.org/standards/granular-certificate-matching-standard_v1/).

**Batas audit:** dokumentasi/metadata sumber telah dicek dan dua audit dataset dijalankan paralel. Arsip CSV/ZIP UNEP belum diunduh dan dihitung, belum ada backtest ShiftProof, screening Citra/LST CoolingProof, atau pemrosesan pasangan versi CEMS. Karena itu ranking ini masih keputusan untuk urutan eksperimen, bukan klaim hasil.
