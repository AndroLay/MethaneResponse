# Audit Kandidat MethaneResponse

**Diperiksa:** 11 Oktober 2026 (WITA)  
**Metode:** dua audit agen independen (MARS/IEA dan Carbon Mapper), lalu pemeriksaan silang ke sumber resmi.  
**Tujuan:** menguji klaim bahwa MethaneResponse adalah pilihan terbaik dan cukup berbeda untuk IEEE ClimateChain.

## Putusan singkat

**Masalahnya nyata dan datanya menjanjikan; klaim bahwa konsep ini paling baru atau pilihan terbaik belum terbukti.** Versi proposal yang berfokus pada deteksi AI, atribusi, alert-to-action, pelacakan respons, dan verifikasi satelit mengulang banyak fungsi yang sudah dijalankan MARS/Eye on Methane dan Carbon Mapper. Jangan mengunci MethaneResponse sebagai pilihan utama hanya berdasarkan skor heuristik seperti 9,18/10; skor itu bukan rubrik resmi, bukan hasil uji, dan tidak membuktikan peluang menang.

MethaneResponse masih layak menjadi **kandidat bersyarat** jika dipersempit ke kebutuhan yang benar-benar belum terlayani dan dibuktikan dalam dua hari pertama. Saat ini belum ada bukti bahwa ledger blockchain atau AI tambahan akan meningkatkan respons atau mitigasi.

## Fakta yang terverifikasi

### 1. Angka 12% bukan angka mitigasi

IEA menyatakan sekitar 12% notifikasi MARS pada 2025 menerima respons. Angka ini menggambarkan *feedback/response*, bukan 12% mitigasi berhasil atau 88% kasus yang dibiarkan tanpa mitigasi. Dalam metrik publik UNEP, respons dihitung dari sumber emisi yang menerima respons dibanding sumber yang diberi alert pada periode bergulir 12 bulan; data dirilis dengan jeda sekitar dua bulan. Respons dapat memuat investigasi, penyebab emisi, status, dan tindakan mitigasi yang dilakukan, sedang berlangsung, atau direncanakan. **Respons tidak otomatis berarti tindakan telah selesai dan diverifikasi.**

Laporan resmi MARS Agustus 2026 secara terpisah menyebut lebih dari 40 sumber besar telah mengalami mitigasi yang dikonfirmasi. UNEP mengatakan kasus tersebut melibatkan penilaian teknis atas respons dan pengamatan satelit sesudahnya yang tidak lagi mendeteksi emisi. Jadi narasi yang akurat adalah “tingkat respons masih rendah, sementara ada pula kasus mitigasi yang telah dikonfirmasi,” bukan “MARS tidak mengubah alert menjadi tindakan.”

Sumber: [IEA, panduan respons MARS (4 Mei 2026)](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [metrik respons UNEP](https://methanedata.unep.org/story-MARS-snapshot), [snapshot MARS Agustus 2026](https://methanedata.unep.org/downloads/top50_emitters/latest/mars_snapshot_latest.pdf), [kamus data MARS](https://methanedata.unep.org/dict-mars-plumes).

### 2. Alur inti yang diusulkan sudah menjadi bagian dari sistem dan panduan yang ada

MARS sudah mendeteksi dan menguantifikasi emisi, menggunakan model AI bersama analisis pakar, mengaitkan sumber dengan fasilitas/operator, memberi notifikasi kepada pemerintah/perusahaan, meminta umpan balik, memantau lokasi setelah notifikasi, dan menerbitkan status respons melalui Eye on Methane. Data publik umumnya baru muncul setelah 30 hari. Portal Eye on Methane // INSIGHTS juga memberi pengguna pemerintah yang berwenang akses ke riwayat notifikasi dan status umpan balik yang lebih rinci.

Panduan IEA–IMEO tanggal 4 Mei 2026 sudah mengusulkan lima langkah yang hampir sama dengan alur MethaneResponse: menerima/menugaskan/mengklasifikasikan alert; menghubungi operator; menerima respons; memverifikasi tindak lanjut; lalu mendokumentasikan kasus. Panduan itu bersifat non-mengikat dan menegaskan kebutuhan kewenangan serta sumber daya pemerintah.

Carbon Mapper juga sudah memiliki deteksi, triase mutu, pengelompokan sumber berulang/persistensi, atribusi sektor/sumber, API, dan STAC. API-nya mencantumkan *limited beta* untuk laporan operator, termasuk investigasi, perbaikan, dan status verifikasi. Carbon Mapper secara eksplisit menyatakan laporan operator itu sukarela, tidak diverifikasi atau disahkan olehnya, dan mungkin bukan data emisi tervalidasi. Pada 2025, Carbon Mapper melaporkan 60 notifikasi untuk lebih dari 50 sumber dan mitigasi 10 sumber yang dikonfirmasi dengan verifikasi lembaga negara, operator, dan pengamatan lanjutan. Carbon Mapper juga mengumumkan kemitraan dengan IMEO/MARS pada Juni 2026.

Sumber: [cara kerja MARS](https://methanedata.unep.org/methane-alert-response-system), [FAQ MARS](https://www.unep.org/topics/energy/methane/international-methane-emissions-observatory/mars-frequently-asked-questions), [panduan IEA–IMEO](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), [Carbon Mapper Product Guide](https://carbonmapper.org/articles/product-guide), [API Carbon Mapper](https://api.carbonmapper.org/api/v1/docs), [riwayat program Carbon Mapper](https://carbonmapper.org/articles/tanager-1-two-years-of-turning-satellite-data-into-methane-action).

### 3. Data nyata tersedia, tetapi API bukan integrasi tanpa gesekan

Carbon Mapper menyediakan observasi plume dan sumber dengan waktu, koordinat, sektor, estimasi emisi, ketidakpastian, serta metrik pengulangan/persistensi. Product Guide menyatakan produk plume/source biasa dipublikasikan sekitar 30 hari setelah akuisisi; produk PHME yang lebih cepat bersifat eksperimental dan rilisnya berdasarkan upaya terbaik. Ini cocok untuk replay historis, tetapi tidak menjamin alert real-time.

Carbon Mapper meminta developer mendaftar untuk memulai akses API; dokumentasi tutorialnya menyebut banyak endpoint membutuhkan autentikasi/token, sementara beberapa endpoint STAC mempunyai konfigurasi autentikasi opsional. Dengan demikian akses katalog bukan bukti bahwa seluruh query/item dapat diambil tanpa akun. Dalam audit ini belum dilakukan pengambilan data terautentikasi dan **belum diverifikasi angka 200+ record yang dapat dipakai**.

Syarat penggunaan Carbon Mapper membatasi penggunaan data ke tujuan nonkomersial yang selaras dengan pengurangan emisi, meminta atribusi, dan membatasi redistribusi/produk turunan. Data MARS berlisensi CC BY-NC-SA 4.0. Lisensi dan waktu publikasi perlu dimasukkan ke desain demo/repo.

Sumber: [Carbon Mapper Data](https://carbonmapper.org/data), [tutorial autentikasi API resmi](https://github.com/carbon-mapper/platform-public/blob/main/tutorials/README.md), [Product Guide](https://carbonmapper.org/articles/product-guide), [Terms of Use](https://carbonmapper.org/terms), [lisensi/data MARS](https://methanedata.unep.org/dict-mars-plumes).

## Koreksi terhadap klaim proposal

| Klaim/komponen proposal | Hasil audit |
|---|---|
| “Hanya 12% respons” membuktikan sistem tidak menghasilkan mitigasi | Tidak tepat. Itu metrik feedback; MARS juga melaporkan kasus mitigasi yang dikonfirmasi. |
| Alur alert → penugasan → respons → verifikasi adalah inovasi baru | Tidak terbukti. Itu sudah ada pada MARS dan menjadi lima langkah panduan IEA–IMEO. |
| AI akan mengidentifikasi sumber dan pengulangan | Tidak cukup sebagai pembeda. MARS dan Carbon Mapper sudah menjalankan atribusi dan analisis pengulangan. Model baru memerlukan label dan evaluasi melawan baseline. |
| Blockchain membuat mitigasi dapat dipercaya | Terlalu luas. Hash dapat membantu membuktikan berkas/riwayat tidak berubah setelah dikomit; ia tidak membuktikan kebenaran laporan operator, identitas pengirim, atau mitigasi fisik. |
| Data Carbon Mapper dapat dipakai untuk demo langsung dan bebas hambatan | Belum terbukti. Ada panduan pendaftaran/token, keterbatasan rilis data, rate limiting, dan pembatasan lisensi. |
| Prototype tanpa survei dapat membuktikan pengurangan metana | Tidak. Replay satelit dapat menunjukkan pola observasi; klaim mitigasi butuh respons lapangan dan verifikasi yang sesuai. Respons yang disimulasikan wajib diberi label simulasi. |

## Ruang pembeda yang mungkin, tetapi masih hipotesis

Jika ingin mempertahankan tema ini, jangan membangun “detektor MARS baru”. Uji versi yang lebih sempit: **paket bukti lintas sumber untuk audit perubahan kasus**. Sistem mengambil satu observasi nyata, menyimpan referensi sumber dan versi, membentuk satu timeline peristiwa, mencatat respons/berkas sebagai masukan pihak terkait, lalu menunjukkan apakah bukti berubah setelah komit.

Nilai tambahnya baru masuk akal jika pengguna tertentu perlu menggabungkan catatan dari beberapa penyedia/otoritas yang belum tersambung, atau memeriksa perubahan bukti tanpa akses ke portal pemerintah tertutup. Kedua kebutuhan ini belum divalidasi lewat wawancara atau penggunaan nyata. Blockchain harus dibatasi pada integritas urutan dan isi artefak; AI harus punya tugas yang terukur. Bila data publik sudah terstruktur, AI mungkin tidak dibutuhkan. Bila hanya satu organisasi yang memperbarui catatan, ledger biasa bisa cukup.

## Gerbang lanjut/tidak lanjut 48 jam

Lanjutkan hanya jika tim bisa menunjukkan bukti untuk semua pertanyaan berikut:

1. **Akses:** satu skrip dapat mengambil/membaca data yang akan dipakai; jumlah, rentang waktu, field, keterlambatan, dan lisensinya dicatat. Jangan mengandalkan hitungan katalog atau klaim “200+” sebelum diekstrak.
2. **Pembeda:** ada satu tindakan pengguna yang tidak sudah disediakan Eye on Methane/MARS atau Carbon Mapper, dengan alasan pengguna yang spesifik. Jika belum ada, hentikan klaim “alert-to-action gap” sebagai inovasi.
3. **AI:** tentukan satu target yang punya label/ground truth dan bandingkan AI dengan baseline sederhana. Jika tidak ada manfaat terukur, hilangkan klaim AI atau gunakan hanya sebagai alat bantu yang dijelaskan batasnya.
4. **Ledger:** demonstrasikan dua pihak/aktor yang menambahkan bukti, urutan waktu yang dapat diaudit, dan kegagalan verifikasi setelah artefak diubah. Tampilkan bahwa mekanisme ini membuktikan integritas rekaman, bukan kebenaran emisi.
5. **Demo jujur:** tampilkan observasi satelit nyata dan bedakan tegas data nyata, input operator yang disimulasikan, serta hasil verifikasi. Jangan klaim pengurangan emisi dari demo.

## Rekomendasi keputusan

**Status: kandidat bersyarat, belum terpilih.** Bukti yang tersedia mendukung urgensi problem dan ketersediaan data, tetapi membantah bahwa komponen utama proposal—deteksi/atribusi AI, alur respons, dan verifikasi—merupakan ruang kosong. Sebelum membangun UI, lakukan gerbang 48 jam di atas. Bila pembeda pengguna atau akses data tidak terbukti, pivot ke ide lain yang sudah diteliti; jangan mempertahankan MethaneResponse karena skor subjektif atau sunk cost.

Jangan menyatakan peluang Top 3 lebih tinggi daripada kandidat lain. Tidak ada data kompetitor submission yang lengkap atau bobot juri yang terpublikasi untuk membuktikannya. Penilaian pemenang tetap belum dapat diprediksi.
