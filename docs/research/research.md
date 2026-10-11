# Riset Kompetisi — IEEE ClimateChain Global Hackathon 2026

**Tanggal riset:** 11 Oktober 2026 (WITA)  
**Cakupan:** afiliasi penyelenggara, aturan dan tenggat, konteks COP31, empat track, peluang prototype, serta risiko yang perlu dijawab panitia.  
**Metode swarm:** dua agen mengaudit secara paralel (afiliasi IEEE; aturan dan jadwal Devpost). Agen ketiga meriset masalah/data/MVP di empat track. Saya menyilangkan hasilnya dengan halaman sumber primer sebelum menyusun laporan. Tidak ada pendaftaran, submission, atau kontak kepada panitia dalam riset ini.

**Pembaruan riset kandidat:** audit swarm terpisah atas MethaneResponse/MARS dan Carbon Mapper tersedia di [audit MethaneResponse](methane-response-audit.md). Kesimpulannya: kandidat ini masih bersyarat; kebaruan alur alert-to-action belum terbukti karena sistem yang ada telah mencakup banyak fungsi serupa.

**Keputusan shortlist versi awal (sudah digantikan):** [memo perbandingan kandidat](candidate-decision.md) mula-mula menempatkan GridWitness sebagai kandidat pertama untuk diuji. Gunakan banner supersession di memo dan [audit mendalam](swarm-deep-research-2026-10-11.md) sebagai keputusan terbaru.

**Audit kandidat tahap sebelumnya, 11 Oktober:** [audit kandidat dengan bukti dan batas verifikasi](swarm-candidate-audit-2026-10-11.md) membandingkan kandidat lama dan menilai CurtailmentCapture; kesimpulan GridWitness-first di dokumen itu juga sudah digantikan.

**Pembaruan audit lebih mendalam, 11 Oktober:** [riset swarm mendalam](swarm-deep-research-2026-10-11.md) menemukan prior art langsung untuk inti GridWitness (GridCast), memeriksa data produk banjir CEMS, dan menambahkan audit CoolingProof. Catatan ini menggantikan keputusan GridWitness sebagai kandidat pertama; belum ada kandidat yang terbukti terbaik.

**Audit FloodWitness, 11 Oktober:** [audit versi CEMS dan prior art OCHA](floodwitness-version-audit-2026-10-11.md) menemukan bahwa arsip CEMS Flood OCHA-DAP sudah menyediakan inventaris produk, hash SHA-256, dan jurnal append-only. FloodWitness belum dapat disebut kandidat terbaik. Jalur AI revisi juga bersyarat karena data historis v1 sebelum revisi belum terbukti tersedia untuk backtest yang bebas kebocoran.

## Kesimpulan eksekutif

1. **Afiliasi IEEE didukung bukti resmi.** Kalender IEEE Blockchain Technical Community mencantumkan acara ini sebagai “IEEE BCTC Local Group Initiative” dan menautkan ke Devpost. IEEE Türkiye Section juga menampilkan IEEE Blockchain Türkiye Group sebagai local group dan menyatakan grup itu disetujui IEEE Blockchain dan IEEE Türkiye Section. Bukti ini mendukung keterlibatan unit IEEE; tidak membuktikan bahwa kantor pusat IEEE mengelola setiap detail atau menjamin pembayaran hadiah.
2. **Informasi administrasi belum konsisten.** Overview dan Rules berbeda soal kelayakan; jendela submission Devpost berkonflik dengan instruksi waktu mulai di Rules; sumber IEEE dan Devpost berbeda soal Antalya/online; Overview merinci hadiah sementara Rules menulis “Prizes TBD”. Pertanyaan batas waktu sudah muncul di Discussions dan belum terlihat jawaban panitia pada thread yang diperiksa.
3. **Halaman acara meminta demo 3–5 menit, repo publik, deskripsi yang menjelaskan track/masalah/solusi/pengguna/adopsi, dan prototype/mockup/PoC.** Lima kriteria penjurian dipublikasikan tanpa bobot.
4. **Jalur teknis paling masuk akal adalah satu track, satu pengguna, satu bukti end-to-end.** Blockchain cocok untuk jejak perubahan/transfer yang perlu diaudit; AI cocok bila mengurangi pekerjaan tertentu seperti ekstraksi atau triase. Keduanya jangan ditempelkan hanya demi label. Semua klaim impact harus dapat ditelusuri ke data dan batasannya.
5. **Track belum dipilih.** Catatan di bawah membandingkan kebutuhan dan demonstrasi yang layak, tanpa mengunci ide tim.

## 1. Afiliasi dan kredibilitas

### Bukti resmi yang ditemukan

- Kalender [IEEE Blockchain Technical Community](https://blockchain.ieee.org/events/) mencantumkan hackathon pada 5–25 Oktober 2026 di Antalya, dengan engagement type “IEEE BCTC Local Group Initiative”, dan menautkan ke Devpost.
- Situs resmi [IEEE Türkiye Section](https://www.ieee.org.tr/ieee-blockchain-turkiye-group/) menempatkan IEEE Blockchain Türkiye Group di daftar *Local Groups*. Halaman grup menyatakan kelompok tersebut dibentuk dan disetujui oleh IEEE Blockchain dan IEEE Türkiye Section.
- Acara pelatihan dengan nama ClimateChain juga tercatat pada [IEEE vTools](https://events.vtools.ieee.org/m/571960). Halaman tersebut memuat pemimpin/host program yang sama dengan daftar panitia Devpost.

### Batas kesimpulan

Bukti silang itu membuat afiliasi IEEE lokal terlihat kuat dan lebih dari sekadar penggunaan nama pada halaman Devpost. Akan tetapi, kalender BCTC menyebut **Antalya**, sementara [Devpost](https://ieee-climatechain-hack.devpost.com/) menyebut **Online | Public**. Konferensi COP31 sendiri dijadwalkan UNFCCC berlangsung di Antalya pada 9–20 November 2026, sedangkan hackathon berakhir pada 25 Oktober. Mungkin kota di kalender berkaitan dengan konteks COP31 atau acara finalis; sumber yang diperiksa belum menerangkan kaitan tersebut. Halaman Devpost menyebut keselarasan dengan COP31, tetapi bukti yang diperiksa belum menunjukkan bahwa hackathon ini disponsori atau disahkan oleh UNFCCC/COP31.

**Penilaian riset:** acara ini kemungkinan besar merupakan kegiatan yang berafiliasi dengan IEEE Blockchain Türkiye/BCTC. Status itu mendukung kredibilitas penyelenggara lokal; detail eligibility, jadwal, lokasi, dan hadiah tetap harus dikonfirmasi.

## 2. Aturan, jadwal, dan celah yang berpengaruh

### Jadwal yang ditampilkan Devpost

MSK = UTC+3; WITA = UTC+8.

| Tahap | Waktu Devpost (MSK) | Waktu WITA |
|---|---:|---:|
| Submission mulai | 5 Okt 2026, 07.00 | 5 Okt, 12.00 |
| Batas submission | 25 Okt 2026, 17.00 | **25 Okt, 22.00** |
| Penjurian | 26 Okt, 09.00 – 8 Nov, 17.00 | 26 Okt, 14.00 – 8 Nov, 22.00 |
| Pemenang diumumkan | 20 Nov, 09.00 | 20 Nov, 14.00 |

Sumber: [Jadwal Devpost](https://ieee-climatechain-hack.devpost.com/details/dates).

### Register konflik dan status bukti

| Prioritas | Temuan | Bukti dan dampak |
|---|---|---|
| **Kritis** | Eligibility berbeda antara Overview dan Rules. | Overview menyebut “students only”, usia di atas usia dewasa hukum, perusahaan/professional organizations dikecualikan, dan ada negara terlarang. Rules membuka juga akademisi/fakultas, developer independen/startup, profesional lingkungan/ilmuwan iklim. Daftar negara terlarang tidak terlihat. Ini dapat menentukan apakah peserta sah ikut. [Overview](https://ieee-climatechain-hack.devpost.com/) · [Rules](https://ieee-climatechain-hack.devpost.com/rules) |
| **Kritis** | Waktu “mulai” submission bertabrakan dengan jendela resmi. | Jadwal memberi rentang 5 Okt–25 Okt, ditutup 17.00 MSK (22.00 WITA). Rules berkata “Don’t submit before official start time which 8 AM PT on October 25.” Pada tanggal itu 08.00 PDT = 23.00 WITA, satu jam setelah batas tutup yang ditampilkan. [Jadwal](https://ieee-climatechain-hack.devpost.com/details/dates) · [Rules](https://ieee-climatechain-hack.devpost.com/rules) |
| **Tinggi** | Mode/lokasi tidak selaras. | Devpost mengklasifikasikan Online/Public; kalender IEEE BCTC memberi lokasi Antalya. Belum jelas apakah ada komponen hybrid, kehadiran finalis, atau lokasi itu sekadar label kalender. |
| **Tinggi** | Hadiah belum dinyatakan konsisten/final. | Overview merinci US$1.500/US$1.000/US$500; Rules menulis “Prizes TBD”. Tidak tampak aturan payout, distribusi hadiah tim, pajak, atau proses klaim. |
| **Menengah** | Jadwal pelatihan dan nomor sesi bergeser. | Rules mencatat beberapa tanggal Agustus–Oktober; update panitia menyebut sesi yang direncanakan tidak terlaksana lalu menjanjikan detail baru. VTools memiliki entri sesi pengantar tetapi kolom tanggal di halaman menampilkan rentang 9–20 Agustus. Periksa Updates untuk rekaman/pengganti. |
| **Menengah** | Form submission mungkin memiliki field/unggahan tambahan. | Di [thread Discussions](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window), seorang peserta melaporkan tidak ada pemilih track dan ada upload wajib maksimum 35 MB, serta menanyakan konten file. Ini **laporan peserta, bukan instruksi resmi yang terverifikasi**. Pada thread yang diperiksa belum tampak jawaban panitia untuk pertanyaan tersebut. |
| **Belum diterbitkan/terlihat** | Kebijakan karya, AI, dan atribusi. | Sumber publik yang diperiksa belum menjelaskan batas pekerjaan/kode yang sudah dibuat sebelumnya, kebijakan penggunaan AI, lisensi/IP, izin data/aset, atau ketentuan visibilitas repo selain permintaan tautan repo publik. Jangan menganggap kebijakan hackathon lain berlaku di sini. |

Forum sudah berisi pertanyaan eksplisit dari peserta tentang jendela submission dan apakah blockchain wajib untuk Climate Data. Gunakan jawaban tertulis resmi sebagai dasar; jangan memakai spekulasi peserta sebagai aturan.

## 3. Empat track: kebutuhan, MVP, dan cara membuktikan

Semua MVP di bawah adalah **arah riset**, bukan tuntutan resmi dan bukan pilihan final untuk tim.

### A. Carbon Markets & Emissions Transparency

**Kebutuhan yang didukung sumber:** Article 6 Paris Agreement mengatur kerja sama dan perdagangan hasil mitigasi; Article 6.2 mencakup pelaporan dan akuntansi ITMO. UNFCCC menjelaskan kebutuhan *robust accounting*, *corresponding adjustments*, serta sistem yang melacak ITMO dari penerbitan hingga penggunaan/transfer. Untuk pasar karbon sukarela, ICVCM menyebut pula identifikasi unik, transparansi, verifikasi independen, additionality, permanence, kuantifikasi kuat, dan pencegahan double counting sebagai bagian dari Core Carbon Principles. Article 6 dan pasar sukarela berkaitan dengan konteks karbon, tetapi jangan menyamakan aturan keduanya.

**MVP yang bisa didemokan:** alur catatan proyek/credit dengan ID unik, sumber bukti, verifier, status “draft–verified–transferred–retired”, dan pemeriksaan duplikasi sederhana. Simpan hash/riwayat perubahan di ledger; simpan dokumen sensitif/off-chain. Tampilkan audit log dan satu kasus penolakan/duplikasi.

**Bukti penilaian:** pengujian duplicate-ID, perubahan yang tertangkap, jumlah record dengan provenance lengkap; jelaskan pengguna (project operator, verifier, buyer) dan keputusan yang dibantu.

**Risiko:** jangan mengklaim aplikasi “menjamin kredit karbon valid”, compliance Article 6, tambahan (additionality), atau mencegah seluruh double counting dari satu prototype. Ledger tidak membuktikan bahwa pengukuran emisi di lapangan benar; verifikasi metodologi dan otoritas tetap diperlukan.

Sumber: [UNFCCC Article 6](https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6), [UNFCCC Article 6.2](https://unfccc.int/process-and-meetings/the-paris-agreement/article-6/article-62), [Article 6 Reference Manual](https://unfccc.int/sites/default/files/resource/Article_6.2_Reference_Manual.pdf), [ICVCM Core Carbon Principles](https://icvcm.org/core-carbon-principles/), [GHG Protocol Scope 3 Standard](https://ghgprotocol.org/sites/default/files/standards/Corporate-Value-Chain-Accounting-Reporing-Standard_041613_2.pdf?pdf=download).

### B. Renewable Energy & Energy Trading

**Kebutuhan yang didukung sumber:** IEA Electricity 2026 menyebut kapasitas jaringan sebagai bottleneck untuk menghubungkan pasokan, beban, dan storage, sementara integrasi angin/surya membutuhkan fleksibilitas. Demand response, baterai, DER, dan koordinasi pasar bisa membantu. Model peer-to-peer tetap bergantung pada kesiapan teknologi, kebijakan, dan pasar setempat.

**MVP yang bisa didemokan:** simulator microgrid kecil dengan beberapa prosumer, produksi/permintaan per interval, pencocokan surplus/defisit, dan ringkasan biaya/emisi berdasarkan asumsi yang transparan. Data historis OPSD bisa dipakai untuk replay; akses API ENTSO-E memerlukan pendaftaran/token sehingga berisiko menghabiskan waktu setup. Ledger dapat menyimpan transaksi dan sertifikat sumber energi; gunakan data sintetis hanya jika diberi label dan tampilkan skenario kegagalan pasokan.

**Bukti penilaian:** uji saldo energi (energi masuk/keluar), transaksi cocok/tidak cocok, dan perbandingan baseline tanpa koordinasi. Jelaskan bahwa ini simulasi pasar; belum mengendalikan grid atau membuat transaksi listrik legal.

**Risiko:** jangan mengklaim stabilitas jaringan, penghematan tagihan nyata, atau operasi P2P yang sah tanpa data meter, operator, dan aturan yurisdiksi. Blockchain menambah nilai jika mengaudit klaim asal/settlement antar pihak; ia tidak mengganti smart meter atau kontrol grid.

Sumber: [IEA Electricity 2026 — Grids](https://www.iea.org/reports/electricity-2026/grids), [IEA Electricity 2026 — Flexibility](https://www.iea.org/reports/electricity-2026/flexibility), [IEA — Unlocking the Potential of Distributed Energy Resources](https://www.iea.org/reports/unlocking-the-potential-of-distributed-energy-resources/executive-summary), [IEA — Digitalisation and Energy](https://www.iea.org/reports/digitalisation-and-energy), [IEA — Global Observatory on P2P Energy Trading](https://www.iea.org/articles/global-observatory-on-peer-to-peer-energy-trading), [Open Power System Data](https://data.open-power-system-data.org/time_series/), [ENTSO-E API token guide](https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2FAPI-Token-Management.pdf).

### C. Sustainable Supply Chains

**Kebutuhan yang didukung sumber:** program [FAO AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en) memakai pemantauan hutan dan data geospasial terverifikasi sebagai dasar transparansi rantai komoditas. Laporan FAO tentang traceability menggarisbawahi kesenjangan traceability dan kebutuhan akses informasi bagi para pelaku. Untuk komoditas yang berada dalam cakupannya, EUDR mencakup informasi geolokasi dalam mekanisme due diligence; penerapan kewajiban hukumnya perlu diperiksa terpisah dan tidak diasumsikan berlaku ke semua komoditas.

**MVP yang bisa didemokan:** satu komoditas dan beberapa tahapan lot (kebun → agregator → pengolah → pembeli) dengan ID lot, lokasi/provenance, bukti serah-terima, serta pemeriksaan risiko geospasial dari sumber publik. Tampilkan lineage lot dan tandai bukti yang hilang/bertentangan. AI bisa mengekstrak field dari satu dokumen contoh, lalu minta konfirmasi manusia.

**Bukti penilaian:** tampilkan kemampuan menelusuri satu lot ke sumbernya, mencatat custody transfer, menolak field wajib yang hilang, dan membuka sumber peta/bukti. Ukur waktu penelusuran sebelum/sesudah pada fixture demo jika benar-benar diuji.

**Risiko:** *traceability* tidak otomatis membuktikan legalitas atau nihil deforestasi. Koordinat, identitas pemasok, kualitas peta, resolusi citra, dan tanggal observasi menentukan makna risk flag. Jangan menerbitkan klaim “deforestation-free” hanya karena hash dokumen ada di blockchain.

Sumber: [FAO AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en), [FAO — Traceability and Transparency in Supply Chains](https://www.fao.org/transparent-supply-chains/news---events/news/detail/new-report--traceability-and-transparency-in-supply-chains/), [Regulation (EU) 2023/1115](https://eur-lex.europa.eu/legal-content/en/ALL/?uri=CELEX%3A32023R1115).

### D. Climate Data & Environmental Monitoring

**Kebutuhan yang didukung sumber:** laporan [WMO Hydromet Gap 2024](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all) menyoroti kekurangan dalam pengumpulan, kualitas, ketersediaan, dan pertukaran data cuaca/iklim/hidrologi, termasuk keterbatasan infrastruktur dan layanan peringatan dini di negara yang dinilai. WMO membangun GBON untuk memperkuat pertukaran observasi dasar yang lebih merata. Dataset publik untuk prototipe mencakup NOAA GHCNd (rekaman harian stasiun dengan cakupan/periode yang bervariasi) dan Copernicus ERA5 (reanalisis; estimasi grid dari model dan pengamatan, bukan pembacaan sensor lokal).

**MVP yang bisa didemokan:** pilih satu hazard dan satu pengguna—misalnya pengelola fasilitas, petani, atau petugas komunitas. Gabungkan satu sumber observasi/perkiraan yang dapat diakses, validasi timestamp/unit/lokasi/missing values, tampilkan provenance dan ketidakpastian, lalu hasilkan alert yang menyarankan tindakan spesifik. Tunjukkan kondisi saat data terlambat atau hilang.

**Bukti penilaian:** uji sampel normal, outlier, timestamp lama, dan sumber tidak tersedia; tunjukkan bagaimana keputusan berubah dan asal setiap data. Ukur kualitas klasifikasi/alert pada set uji kecil yang dijelaskan, bukan hanya jumlah grafik.

**Risiko:** korelasi historis bukan ramalan; sensor murah dapat bias; data sintetis harus diberi label; tidak menjanjikan prediksi bencana/kerugian tanpa evaluasi. Blockchain cocok untuk jejak asal/perubahan data, sedangkan analisis dan prediksi harus tetap divalidasi terpisah.

Sumber: [WMO Hydromet Gap Report 2024](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all), [WMO GBON](https://public.wmo.int/activities/global-basic-observing-network-gbon), [NOAA GHCNd](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily), [Copernicus ERA5 hourly time series](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-timeseries?tab=overview), [IPCC AR6 WGII Chapter 17: Adaptation Monitoring, Evaluation & Learning](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-17/).

## 4. Cara menghubungkan prototype ke rubric

Devpost mempublikasikan lima kriteria: **Climate Impact, Innovation & Creativity, Technical Execution, Practical Usefulness, Presentation & Communication/Storytelling**. Bobot tidak dipublikasikan; jangan memperlakukan semuanya berbobot sama sebagai fakta.

| Kriteria | Bukti yang layak disiapkan |
|---|---|
| Climate impact | Pengguna nyata, keputusan yang berubah, metrik dan baseline yang jelas, serta asumsi yang dapat diperiksa. Hindari mengubah aktivitas aplikasi menjadi klaim ton CO₂ tanpa metodologi. |
| Innovation | Jelaskan titik macet yang ada dan alasan solusi ini berbeda. Terangkan peran AI/ledger secara spesifik. |
| Technical execution | Jalankan satu alur data → validasi/analisis → tindakan → audit. Siapkan error case, reset demo, test fixture, dan sumber data yang tercatat. |
| Practical usefulness | Ceritakan proses adopsi, kebutuhan data/alat, pihak yang harus menyetujui, dan batas prototype. |
| Presentation | Video 3–5 menit: masalah/pengguna → demo → bukti kerja → dampak dan keterbatasan → repo/tautan. Pastikan akses juri berfungsi. |

**Arsitektur argumen yang disarankan:** bukti lapangan/data → provenance dan pemeriksaan kualitas → keputusan/action → catatan audit. AI dan blockchain bernilai bila berada pada bagian alur yang mengurangi pekerjaan atau meningkatkan keterlacakan; keduanya tidak membuktikan kebenaran input dunia nyata dengan sendirinya.

## 5. Perbandingan arah prototype (analisis, bukan skor resmi)

| Track | Yang paling mudah diperagakan | Tantangan utama | Peran blockchain yang masuk akal |
|---|---|---|---|
| Carbon markets | Status lifecycle credit dan pemeriksaan catatan ganda pada contoh terbatas. | Istilah/metodologi/otorisasi Article 6 kompleks; risiko klaim compliance. | Jejak ID, bukti, transfer, dan retirement. |
| Renewable energy | Simulasi pencocokan produksi-permintaan pada microgrid kecil. | Data meter/grid dan aturan nyata; simulasi harus dinyatakan. | Audit transaksi/atribut sertifikat energi. |
| Supply chains | Pelacakan satu lot dengan provenance dan satu lapisan risiko geospasial. | Bukti fisik asal barang dan akurasi lokasi/peta. | Riwayat custody dan perubahan bukti. |
| Climate data | Dashboard satu hazard dengan pemeriksaan kualitas data dan alert. | Memilih sumber yang dapat dipakai dan menguji error/ketidakpastian. | Jejak asal, timestamp, dan perubahan data. |

**Cara memilih setelah kelayakan dan form dipastikan:** prioritaskan track yang memberi akses ke pengguna/data dan bisa ditutup dengan satu demo alur. Jika tim belum memiliki akses meter/mitra energi, gunakan simulator yang jujur. Jika memilih karbon, batasi ke audit/provenance, bukan sertifikasi. Jika memilih supply chain, tunjukkan lokasi/bukti, bukan label keberlanjutan otomatis. Jika memilih climate data, fokus pada satu keputusan lokal dan uji data yang gagal.

## 6. Pertanyaan panitia yang perlu dijawab sebelum mengunci kerja

1. Eligibility final: apakah hanya mahasiswa; apakah akademisi, startup, developer independen, dan profesional iklim diperbolehkan; usia minimum; daftar negara terlarang; status Indonesia.
2. Submission window yang otoritatif: arti “8 AM PT Oct 25”, jam/timezone mulai dan tutup, serta apakah periode 5–25 Oktober benar.
3. Mode final: online saja, hybrid, atau wajib hadir di Antalya bagi finalis/pemenang.
4. Requirement form: apakah ada track selector; file upload maksimum 35 MB yang ditanyakan peserta itu untuk apa, format/isi file apa, dan apakah semua submission harus mengunggahnya.
5. Stack: apakah blockchain dan AI wajib keduanya; apakah simulasi/mockup cukup untuk setiap track.
6. Ketentuan proyek: kode/komponen yang dibuat sebelum hackathon, IP/lisensi, AI use, data/aset pihak ketiga, dan repository publik.
7. Hadiah: apakah nominal US$3.000 final, aturan distribusi per tim, pajak/biaya, tata cara dan waktu pembayaran.
8. Penjurian: bobot/skala, jumlah finalis, demo/presentasi langsung, tie-break, dan jadwal komunikasi hasil.
9. Sesi belajar: daftar sesi terbaru, rekaman/slide, mentorship yang masih bisa diakses.

Tab [Discussions Devpost](https://ieee-climatechain-hack.devpost.com/discussions) adalah kanal tanya-jawab yang dirujuk oleh update panitia. Diskusi spesifik yang sudah menanyakan waktu dan form: [thread submission window](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window).

## 7. Sumber primer dan otoritatif

### Acara dan penyelenggara

- [Devpost overview](https://ieee-climatechain-hack.devpost.com/)
- [Devpost rules](https://ieee-climatechain-hack.devpost.com/rules)
- [Devpost schedule](https://ieee-climatechain-hack.devpost.com/details/dates)
- [Devpost announcements](https://ieee-climatechain-hack.devpost.com/updates)
- [Devpost discussion: window, track, blockchain, upload](https://ieee-climatechain-hack.devpost.com/forum_topics/45102-session-1-recording-and-clarification-on-submission-window)
- [IEEE BCTC event calendar](https://blockchain.ieee.org/events/)
- [IEEE Türkiye Section: IEEE Blockchain Türkiye Group](https://www.ieee.org.tr/ieee-blockchain-turkiye-group/)
- [IEEE vTools: ClimateChain Session 1](https://events.vtools.ieee.org/m/571960)
- [UNFCCC COP31](https://unfccc.int/cop31)

### Domain dan teknis

- [UNFCCC Article 6](https://unfccc.int/process-and-meetings/the-paris-agreement/the-paris-agreement/cooperative-implementation/article-6)
- [UNFCCC Article 6.2](https://unfccc.int/process-and-meetings/the-paris-agreement/article-6/article-62)
- [UNFCCC Article 6.2 Reference Manual](https://unfccc.int/sites/default/files/resource/Article_6.2_Reference_Manual.pdf)
- [ICVCM Core Carbon Principles](https://icvcm.org/core-carbon-principles/)
- [GHG Protocol Scope 3 Standard](https://ghgprotocol.org/sites/default/files/standards/Corporate-Value-Chain-Accounting-Reporing-Standard_041613_2.pdf?pdf=download)
- [IEA Electricity 2026 — Grids](https://www.iea.org/reports/electricity-2026/grids)
- [IEA Electricity 2026 — Flexibility](https://www.iea.org/reports/electricity-2026/flexibility)
- [IEA: Unlocking the Potential of Distributed Energy Resources](https://www.iea.org/reports/unlocking-the-potential-of-distributed-energy-resources/executive-summary)
- [IEA: Digitalisation and Energy](https://www.iea.org/reports/digitalisation-and-energy)
- [IEA: Global Observatory on Peer-to-Peer Energy Trading](https://www.iea.org/articles/global-observatory-on-peer-to-peer-energy-trading)
- [Open Power System Data](https://data.open-power-system-data.org/time_series/)
- [ENTSO-E API token guide](https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2FAPI-Token-Management.pdf)
- [FAO: AIM4Commodities](https://www.fao.org/transparent-supply-chains/aim4commodities/en)
- [FAO: Traceability and Transparency in Supply Chains](https://www.fao.org/transparent-supply-chains/news---events/news/detail/new-report--traceability-and-transparency-in-supply-chains/)
- [EU Regulation 2023/1115](https://eur-lex.europa.eu/legal-content/en/ALL/?uri=CELEX%3A32023R1115)
- [WMO: Hydromet Gap Report 2024](https://wmo.int/news/media-centre/hydromet-gap-report-launch-collaboration-needed-ensure-early-warnings-all)
- [WMO Global Basic Observing Network](https://public.wmo.int/activities/global-basic-observing-network-gbon)
- [NOAA GHCNd](https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily)
- [Copernicus ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-timeseries?tab=overview)
- [IPCC AR6 WGII Chapter 17: Adaptation Monitoring, Evaluation & Learning](https://www.ipcc.ch/report/ar6/wg2/chapter/chapter-17/)

**Batas riset:** semua temuan acara mencerminkan halaman yang diperiksa pada 11 Oktober 2026. Situs dan aturan dapat berubah; jawaban tertulis panitia dan form submission yang sedang berlaku harus diperiksa lagi sebelum mengirim. Materi ini bukan konfirmasi pendaftaran, kelayakan pribadi, hadiah, atau endorsement COP31.
