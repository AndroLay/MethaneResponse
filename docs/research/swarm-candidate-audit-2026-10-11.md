# Audit Swarm Kandidat — IEEE ClimateChain 2026

> **Catatan status:** dokumen ini adalah audit tahap sebelumnya dan sudah disupersede. Riset mendalam menemukan repository GridCast yang sangat tumpang tindih dengan GridWitness serta mengaudit artefak CEMS; lihat [laporan terbaru](swarm-deep-research-2026-10-11.md) untuk keputusan sekarang.

**Tanggal:** 11 Oktober 2026 (WITA)  
**Tujuan:** menemukan kandidat yang paling cocok untuk rubrik hackathon tanpa menyamakan bukti sumber, hasil eksperimen, dan opini.  
**Metode:** dua agent bekerja pada jalur terpisah: audit kandidat yang sudah dibahas dan pencarian kandidat tambahan. Saya memeriksa ulang klaim kunci ke halaman resmi Devpost, pemilik data, standard owner, serta membuka salah satu endpoint data secara langsung. Agent tidak mengubah file proyek.

## Putusan singkat

**Belum ada kandidat yang terbukti terbaik atau berpeluang menang. GridWitness adalah kandidat yang paling layak diuji lebih dahulu; HourGuard adalah fallback yang paling mudah diverifikasi secara deterministik.** Ini keputusan tentang urutan eksperimen berdasarkan jalur pembuktian yang tersedia, bukan prediksi juri.

Rubrik resmi memiliki lima kriteria: Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, dan Presentation & Communication. Devpost tidak menampilkan bobot angka. Maka, skor numerik buatan atau peluang Top 3 tidak digunakan. Halaman acara juga meminta prototype/PoC, repo publik, dan video demo 3–5 menit. [Devpost](https://ieee-climatechain-hack.devpost.com/)

## Apa yang sudah diperiksa

| Pernyataan | Status bukti | Sumber/batas |
|---|---|---|
| Rubrik dan deliverable acara | **Terverifikasi langsung** | Halaman resmi Devpost mencantumkan kelima kriteria dan submission items; bobot numerik tidak ditampilkan. |
| NESO punya carbon-intensity forecast dan estimated actual | **Terverifikasi dokumentasi; endpoint juga diprobe** | [Dokumentasi resmi NESO](https://www.neso.energy/data-portal/national-carbon-intensity-forecast/national_carbon_intensity_forecast) menyebut forecast dan actual dalam gCO₂/kWh. Respons satu kali dari [API resmi](https://api.carbonintensity.org.uk/intensity) yang dibuka pada riset ini memuat satu interval 30 menit dengan `forecast` dan `actual`. Ini hanya membuktikan endpoint merespons dan format data tersedia saat probe, bukan mutu dataset historis atau manfaat scheduler. |
| Arsip forecast-vintage yang dibutuhkan untuk replay historis | **Sumber pihak ketiga; belum diaudit independen** | [Carbon Intensity Forecast Tracking](https://github.com/nmpowell/carbon-intensity-forecast-tracking) mengatakan NESO tidak menyimpan riwayat forecast dan scraper menangkap sekitar 90% slot normal; slot yang terlewat hilang. Angka/coverage itu adalah laporan pemilik repo, belum dihitung ulang atau diverifikasi dari database dalam audit ini. |
| Penjadwalan berdasarkan forecast karbon sudah tersedia | **Terverifikasi pada dokumentasi produk** | [Carbon Aware SDK](https://carbon-aware-sdk.greensoftware.foundation/docs/overview) memang mendukung pemilihan waktu/lokasi. [Dokumentasi forecast](https://carbon-aware-sdk.greensoftware.foundation/docs/tutorial-extras/carbon-aware-library) menunjukkan pemilihan jendela optimal dan replay forecast historis berdasarkan `requestedAt`. Ini membuat novelty scheduler biasa lemah; belum membuktikan semua metode GridWitness telah ditiru produk tersebut. |
| Hourly clean-energy matching sudah distandarkan | **Terverifikasi pada standard owner** | [EnergyTag Matching Standard](https://energytag.org/standards/granular-certificate-matching-standard_v1/) mendefinisikan pencocokan temporal pada interval satu jam atau lebih rapat, dengan aspek geografis dan atribut. Ini melemahkan kebaruan HourGuard jika hanya menerapkan rumus matching. |
| Proses respons alert metana sudah punya sistem/panduan nyata | **Terverifikasi pada UNEP/IEA** | [UNEP MARS](https://methanedata.unep.org/methane-alert-response-system) menerangkan notifikasi, tindak lanjut, monitoring, dan publikasi data dengan jeda; [IEA](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system) menetapkan lima langkah respons. [Carbon Mapper](https://carbonmapper.org/articles/product-guide) juga menyediakan produk plume/source serta atribusi dan persistensi. Carbon Mapper meminta pendaftaran akun untuk mengintegrasikan API ([data access](https://carbonmapper.org/data)); akses akun dan jumlah record usable belum diuji. |
| Monitoring restorasi mangrove sudah ada | **Terverifikasi oleh UNESCO/GMW** | [UNESCO MRTT](https://www.unesco.org/en/unesco-digital-innovation-hub/mangrove-restoration-tracker-tool-mrtt) menjelaskan pencatatan baseline pra-restorasi, intervensi, dan pemantauan pascarestorasi. Itu tidak berarti proyek baru mustahil, tetapi dashboard monitoring mangrove umum bukan pembeda yang cukup. |
| EUDR sudah memiliki sistem pernyataan uji tuntas | **Terverifikasi oleh Komisi Eropa** | [EU Information System](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/information-system-deforestation-regulation_en) memungkinkan operator membuat pernyataan dan memasukkan asal produk. Tanpa pemasok/lot nyata, ForestPassport tidak dapat mendemonstrasikan provenance fisik end-to-end. |
| Curtailment renewable adalah masalah dan ada laporan publik CAISO | **Masalah terverifikasi; data extraction belum diuji** | IEA menyebut curtailment surplus renewables EU >10 TWh pada 2024 ([Demand Flexibility](https://www.iea.org/reports/the-value-of-demand-flexibility/executive-summary)). [CAISO report index](https://www.caiso.com/library/daily-renewable-reports) memuat laporan harian/real-time curtailment; satu [contoh laporan](https://www.caiso.com/documents/daily-renewable-report-oct-04-2026.html) menampilkan bagian “Hourly VER Generation Curtailment Energy in MWh”. Chart/CSV belum diunduh atau diuji oleh agent maupun audit ini; data ex-post tidak membuktikan curtailment berhasil dicegah. |

## Perbandingan kualitatif kandidat

Ini penilaian analitis terhadap lima kriteria resmi, bukan skor atau fakta hasil uji.

| Kandidat | Kekuatan yang didukung bukti | Risiko yang belum teratasi | Putusan saat ini |
|---|---|---|---|
| **GridWitness** | Data forecast/actual punya API resmi; keputusan kerja fleksibel dapat dibandingkan terhadap outcome aktual; AI, penjadwalan, dan komitmen blockchain dapat diuji secara terpisah. | Forecast history yang diperlukan berasal dari arsip pihak ketiga dan belum diaudit; belum ada backtest, uplift AI, pengguna tervalidasi, atau transaksi precommit; carbon-aware scheduling sudah tersedia. | **Uji pertama.** Jangan tetapkan sebagai pilihan final sebelum menang atas baseline atau menurunkan risiko secara terukur. |
| **HourGuard** | Matching dan duplikasi dapat diuji deterministik dengan kasus valid/tidak valid; demo mudah dijelaskan. | Matching per jam sudah tercakup standar EnergyTag; akses data registry/sertifikat nyata belum terbukti. | **Fallback paling mudah diverifikasi**, dengan risiko novelty. |
| **MethaneResponse** | Masalah iklim kuat dan visual data satelit berpotensi menarik. | Banyak fungsi inti—alert, analisis, respons, dan verifikasi—sudah ada pada MARS/IEA atau Carbon Mapper; API perlu registrasi; AI baru dan manfaat ledger belum dibuktikan. | **Bersyarat.** Lanjut hanya jika kebutuhan pengguna dan pembeda baru ditemukan. |
| **MangroveProof** | Peta perubahan dapat memberi demo yang jelas; relevansi ekosistem kuat. | MRTT/GMW sudah melayani monitoring terkait; analisis satelit saja tidak membuktikan keberhasilan restorasi atau karbon terserap. | **Bukan pilihan utama** tanpa data referensi/mitra yang memperkuat validasi. |
| **ForestPassport** | Traceability asal produk masuk akal sebagai masalah rantai pasok. | Sistem resmi EUDR sudah menerima asal produk; tanpa data pemasok dan lot nyata, bagian paling penting tetap simulasi. | **Risiko demo end-to-end tinggi.** |
| **CurtailmentCapture** (kandidat tambahan) | Mencoba menjadwalkan beban saat ada curtailment, sehingga cerita dampaknya lebih spesifik daripada sekadar memilih jam dengan grid rendah karbon. IEA mendukung relevansi demand flexibility. | Laporan CAISO yang diperiksa bersifat historis; ekstraksi data belum diuji; keselarasan waktu tidak membuktikan beban tambahan mengurangi curtailment secara kausal; novelty dan fungsi blockchain/AI masih hipotesis. | **Eksperimen kecil saja**, belum menggantikan GridWitness. |

## Yang belum terbukti

- GridWitness meningkatkan hasil dibanding Immediate atau NESO-Greedy.
- Model AI menambah manfaat di atas forecast NESO dan aturan sederhana.
- Arsip forecast-vintage cukup lengkap dan sesuai untuk evaluasi bebas look-ahead.
- Commit blockchain telah dijalankan sebelum outcome diketahui atau mengubah kualitas keputusan.
- MethaneResponse menaikkan tingkat respons/mitigasi.
- MangroveProof membuktikan restorasi atau penyerapan karbon.
- ForestPassport membuktikan asal fisik komoditas.
- CurtailmentCapture menghindari curtailment atau emisi.
- Kandidat mana pun memiliki peluang Top 3 tertentu.

Tidak ada hasil backtest kandidat, uji kontrak, wawancara pengguna, atau evaluasi juri yang dihasilkan dalam riset ini. Interpretasi atas kecocokan tiap proyek dengan kriteria adalah inferensi kami.

## Gerbang keputusan GridWitness

Uji dulu pipeline paling kecil dan jangan membuat klaim hasil sebelum angka keluar:

1. Audit arsip: hitung rentang waktu, kelengkapan slot, duplikasi, actual yang hilang, dan aturan rekonstruksi forecast yang tersedia pada saat keputusan.
2. Jalankan evaluasi kronologis tanpa kebocoran masa depan. Bandingkan **Immediate**, **NESO-Greedy**, dan **GridWitness**; Oracle hanya batas teoritis.
3. Laporkan hasil berpasangan: metrik intensity-weighted, proporsi keputusan yang memburuk, tail regret, dan deadline miss. Gunakan istilah estimasi berbobot intensitas karbon, bukan emisi yang terbukti dihindari.
4. Tahan test set sampai model/policy dibekukan. Jika AI tidak menambah akurasi atau mengurangi risiko, hapus klaim AI sebagai pembeda.
5. Pastikan smart contract menolak perubahan artefak serta menyimpan komitmen sebelum waktu outcome. Hash membuktikan integritas artefak setelah dicatat, bukan kebenaran data sumber.

**Keputusan:** GridWitness adalah kandidat yang paling layak diuji lebih dulu karena paling falsifiable dengan data yang terdokumentasi. Jika hasil tidak menunjukkan nilai tambah terhadap baseline, jangan mempertahankan konsep berdasarkan narasi; pilih fallback atau lakukan pivot. Ini bukan pernyataan bahwa GridWitness telah terbukti paling cocok untuk seluruh rubrik.
