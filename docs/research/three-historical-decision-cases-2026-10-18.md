# Tiga studi kasus: dari informasi methane menuju keputusan yang dapat ditelusuri

**18 Oktober 2026 · analisis metadata historis, bukan validasi lapangan.**

Tujuan MethaneResponse adalah membantu analis menyatakan dengan jelas apa yang diketahui, apa yang belum terbukti, dan bukti apa yang perlu diminta. Pengguna utama: analis lingkungan, penelaah bukti, dan koordinator tindak lanjut. Hasil kerja yang dituju adalah keputusan beserta alasan, periode, referensi, pemilik tindak lanjut, dan versi yang dapat diperiksa.

## Dasar data dan cara membaca

Ketiga kasus berasal dari [casebook tetap](../../data/real/mars_casebook_2026-10-15.json), snapshot `unep-mars-675417694883`, diambil 14 Oktober 2026. Atribusi dan lisensi dataset CC BY-NC-SA 4.0 dipertahankan; normalisasi dan pemilihan kasus dijelaskan dalam [README data](../../data/real/README.md). Ketiganya sektor minyak dan gas, bukan sampel representatif seluruh sumber emisi.

Satu plume adalah satu observasi dari lintasan satelit; source adalah lokasi yang dapat memiliki beberapa plume. `notified` tingkat sumber dan `feedback` tidak mengikat penerima, waktu pengiriman, atau hasil fisik pada setiap event. Nilai flux adalah kg/h saat observasi; `±` di bawah menampilkan simpangan baku yang tercatat, bukan interval kepercayaan 95%. Rujukan: [kamus data UNEP MARS](https://methanedata.unep.org/dict-mars-plumes).

Timestamp upstream tanpa zona disimpan apa adanya. Aplikasi memperlakukannya sebagai UTC untuk batas hari, sebagai **konvensi parser aplikasi**; dokumentasi upstream yang diperiksa menyebut ISO 8601 untuk `tile_date`, tanpa menegaskan zona pada field tersebut. Tidak mengklaim jam upstream telah diverifikasi sebagai UTC.

Halaman katalog UNEP diperiksa 18 Oktober 2026 untuk ringkasan/tanggal/lisensi. Item laporan mencantumkan CC BY-NC-ND 3.0 IGO. Di sini hanya diparafrasekan fakta katalog secara singkat dan ditautkan; PDF, gambar, serta isi laporan tidak direproduksi. Keputusan aplikasi di bawah hanya memakai metadata casebook. Pernyataan UNEP tentang mitigasi tetap diatribusikan kepada UNEP; hasil metadata aplikasi tidak menyangkalnya.

## 1. Kazakhstan — jangan menebak urutan tindakan dan observasi

**Kasus:** `KAZ_S_159`, Uzen Field menurut [katalog UNEP](https://wedocs.unep.org/handle/20.500.11822/49949). Katalog bertanggal 23 September 2026 menyatakan IMEO mengonfirmasi tindakan mitigasi pada Juli 2026.

| Tanggal raw observasi | Satelit | Flux ± simpangan baku, kg/h | Plume notified |
|---|---|---|---|
| 2024-06-07T08:05:04 | EnMAP | 591 ± 335 | false |
| 2026-06-05T07:40:02 | EnMAP | 307 ± 66 | true |
| 2026-07-11T08:12:14 | EnMAP | 496 ± 226 | true |

**Masalah keputusan:** bolehkah observasi 11 Juli disebut sebagai pengukuran setelah perbaikan? Bulan tindakan saja tidak menentukan apakah tindakan terjadi sebelum atau sesudah tanggal 11. Pengamatan 2024 tidak boleh dipindahkan ke event 2026 hanya karena source ID sama.

**Yang tersedia:** tiga rekaman plume bertanggal, provenance snapshot, flag sumber notified/feedback Yes, serta tautan katalog. **Yang belum tersedia dalam casebook:** tanggal/jam tindakan, catatan tindakan, bukti pengiriman kepada penerima tertentu, dan pengukuran lanjutan yang terhubung ke tindakan tersebut.

**Keputusan yang dapat dibuat:** simpan kronologi tiga observasi dan pertahankan status mitigasi sebagai pertanyaan terbuka dalam penilaian metadata. Jangan mengklasifikasikan plume 11 Juli sebagai kegagalan perbaikan atau keberhasilan verifikasi setelah perbaikan. Untuk cakupan mitigasi `2024-06-07 → 2026-10-14`, aturan aplikasi menghasilkan `insufficient_evidence`, bukan `contradicted`.

**Tindak lanjut siap dipindahkan ke Case work:**

- Pemilik yang disarankan: koordinator bukti/operator liaison; ini saran peran, belum penugasan kepada pihak eksternal.
- Pertanyaan: kapan tindakan dilakukan dan observasi mana yang benar-benar setelah tindakan?
- Permintaan: log tindakan dengan tanggal/jam dan identitas sumber; referensi bukti pengiriman; pengukuran setelah tindakan dengan metode, kondisi observasi, ketidakpastian dan cakupan fasilitas yang sama.
- Kriteria penutupan pertanyaan: urutan waktu dapat diperiksa dan bukti lanjutan terikat ke tindakan. Ini belum berarti aplikasi mengesahkan pengurangan emisi.

[Laporan JSON yang dapat diperiksa](../evidence/product-value-2026-10-18/kaz_s_159-mitigation-report.json)

## 2. Libya — satu observasi tidak menetapkan keadaan setelah tindakan

**Kasus:** `LBY_S_143`. Casebook memuat satu observasi EnMAP `2025-12-23T10:08:43`, **537 ± 240 kg/h**. Plume notified true dan sumber feedback Yes. [Katalog UNEP April 2026](https://wedocs.unep.org/handle/20.500.11822/49430) menyatakan IMEO mengonfirmasi tindakan mitigasi di Intisar A pada Januari 2026.

**Masalah keputusan:** dapatkah analis menyatakan emisi sudah nol karena tidak ada plume berikutnya dalam casebook? Tidak. Casebook ini tidak mencantumkan pengukuran setelah tindakan ataupun daftar lengkap kesempatan pengamatan yang berhasil/tidak berhasil mendeteksi emisi.

**Yang tersedia:** satu pengukuran historis beserta ketidakpastian, flag administratif, provenance dan tautan laporan. **Yang belum tersedia:** waktu tindakan yang rinci, hasil pengukuran lanjutan, batas deteksi, kondisi angin/awan atau alasan tidak tersedianya pengamatan.

**Keputusan yang dapat dibuat:** beri status pertanyaan *awaiting evidence* dan minta bukti pengukuran setelah tindakan; jangan menggunakan status ini sebagai penilaian kepatuhan operator. Cakupan mitigasi `2025-12-23 → 2026-10-14` menghasilkan `insufficient_evidence` pada pemeriksaan metadata lokal.

**Tindak lanjut:** koordinator bukti meminta log tindakan, pengukuran methane setelah tindakan pada lokasi yang sama, metode/batas deteksi/ketidakpastian, dan daftar kesempatan pengamatan. Pertanyaan dapat ditinjau lagi ketika data tersebut tersedia. Tidak mengekstrapolasi 537 kg/h sepanjang periode yang tidak diamati.

[Laporan JSON yang dapat diperiksa](../evidence/product-value-2026-10-18/lby_s_143-mitigation-report.json)

## 3. Kanada — pertahankan ketidakpastian dan batasi klaim manfaat

**Kasus:** `CAN_S_002`. Casebook memuat satu observasi EMIT `2026-04-10T19:07:29`, **1.044 ± 370 kg/h**. Plume notified true dan sumber feedback Yes. [Katalog UNEP Juli 2026](https://wedocs.unep.org/handle/20.500.11822/49811) menyatakan IMEO mengonfirmasi tindakan mitigasi di southeastern Alberta pada Juli 2026.

**Masalah keputusan:** dapatkah angka observasi ini dijadikan ton methane yang berhasil dicegah oleh MethaneResponse? Belum. Pengukuran saat lintasan tidak menyediakan durasi emisi, counterfactual tanpa tindakan, atau besaran hasil setelah tindakan. Aplikasi ini juga tidak melakukan tindakan lapangan.

**Yang tersedia:** satu estimasi flux dan simpangan bakunya, ID observasi/sumber, provenance dan tautan katalog. **Yang belum tersedia dalam casebook:** waktu tindakan rinci, pengukuran setelah tindakan, durasi dan baseline pembanding yang diperlukan untuk menghitung avoided emissions.

**Keputusan yang dapat dibuat:** mempertahankan ketidakpastian dalam brief; menolak penghitungan ton emisi yang dicegah dari satu angka kg/h; meminta data lanjutan. Cakupan mitigasi `2026-04-10 → 2026-10-14` menghasilkan `insufficient_evidence` dalam aplikasi.

**Tindak lanjut:** penelaah pengukuran meminta metode kuantifikasi, cakupan temporal, log tindakan, serta pengukuran berulang setelah tindakan. Hasilnya dapat menjadi bahan review domain; tidak otomatis menjadi kredit karbon atau dampak yang diklaim tim.

[Laporan JSON yang dapat diperiksa](../evidence/product-value-2026-10-18/can_s_002-mitigation-report.json)

## Apa manfaat dan kontribusi produk yang ditunjukkan?

| Kebutuhan analis | Keluaran MethaneResponse | Bukti yang tersedia |
|---|---|---|
| Menghubungkan klaim ke event dan periode | Scope eksplisit, tanggal UTC, referensi yang diterima/dikecualikan | Tes scope dan replay 9 tugas historis |
| Menjaga informasi yang belum diketahui | Abstention dan permintaan bukti berikutnya | Ketiga laporan mitigasi di atas |
| Menelaah perubahan keputusan | Revisi tetap, hash induk, alasan dan perbandingan | Skenario revisi **DEMO**, terpisah dari kasus nyata |
| Membagikan laporan yang dapat diperiksa | Ekspor JSON dengan checksum konteks, verifier browser di Reports | Browser desktop/mobile dan tantangan perubahan file |

Kontribusi yang diperlihatkan adalah penggabungan scope, alasan, tindak lanjut, revisi dan pemeriksaan integritas dalam satu alur. Pembanding manual yang dilengkapi alat juga dapat melakukan pekerjaan tersebut. Lihat [perbandingan fungsional dan batasnya](../evidence/product-value-2026-10-18/README.md); tidak mengklaim kebaruan ilmiah global, keunggulan waktu manusia, atau hasil fisik methane.

**Batas dampak:** yang telah diperagakan ialah transparansi keputusan dan kemampuan memeriksa hasil. Belum ada bukti bahwa penggunaan aplikasi mengubah tindakan operator, mengurangi durasi kebocoran, atau mengurangi ton emisi. Studi kasus ini melengkapi, bukan menggantikan, review pakar dan pilot manusia.
