# Pembanding publik IEEE ClimateChain dan posisi MethaneResponse

**Tanggal pemeriksaan:** 16 Oktober 2026, WITA.  
**Baseline repo:** `a82e2eee99bb79327f859f304f2f5d5939f07041`, dengan perubahan dokumentasi lokal yang belum di-commit.  
**Kesimpulan:** implementasi inti prototype lokal sudah tersedia, tetapi belum ada bukti bahwa fitur, penelitian, atau manfaat MethaneResponse paling unggul di antara seluruh peserta.

## Cakupan dan cara membaca hasil

- Sepuluh halaman proyek di bawah dapat ditelusuri secara publik dan pada pemeriksaan ini menampilkan **Submitted to → IEEE ClimateChain Global Hackathon**, dengan tautan ke domain acara yang benar.
- [Galeri resmi](https://ieee-climatechain-hack.devpost.com/project-gallery) masih menampilkan pemberitahuan bahwa penyelenggara belum memublikasikannya. Ini bukan inventaris seluruh submission, daftar final yang memenuhi syarat, atau hasil penjurian.
- Pemeriksaan dibagi kepada dua penelaah independen, lalu digabungkan dengan pemeriksaan PLUME, Kanopy, sumber domain, dan status repo oleh koordinator. Ini bukan penilaian oleh juri kompetisi.
- Deskripsi pesaing dan hasil eksperimennya berasal dari halaman atau repo yang dikelola pembuat. Tautan repo/demo yang tercantum tidak berarti kodenya sudah dijalankan atau hasilnya direproduksi. Akses beberapa preview gagal melalui reader; kegagalan reader tidak membuktikan situs mati.
- Tidak ada pengujian produk, transaksi, deployment, kontak peserta/panitia, atau submission yang dilakukan dalam riset ini. Bukti pemeriksaan lokal MethaneResponse tetap mengikuti tanggal dan revisi pada [status implementasi](../release/current-implementation-status.md).

## Sepuluh proyek publik yang terkonfirmasi

| No. | Proyek / sumber Devpost | Fokus yang dipublikasikan | Artefak yang ditautkan | Batas bukti penting |
|---|---|---|---|---|
| 1 | [Kanopy](https://devpost.com/software/kanopy) | Pengukuran hutan dan stok karbon dari data satelit, ketidakpastian, serta registrasi hasil di blockchain. | [Verifier](https://kamhq.com/kanopy/verify/). Repo terpisah tidak terlihat pada halaman yang diperiksa. | Hash memeriksa integritas hasil; akurasi pengukuran tetap membutuhkan validasi. Klaim transaksi dan pengujian belum direproduksi. |
| 2 | [PLUME: Earth's First Climate Bug-Bounty Network](https://devpost.com/software/plume-earth-s-first-climate-bug-bounty-network) | Data metana historis, investigasi, pendanaan escrow, bukti perbaikan, keputusan verifier, dan settlement. | [GitHub](https://github.com/KaavinB/PLUME); halaman/repo juga menautkan preview. | Intervensi, peserta dan dana demo disimulasikan. README membatasi preview sebagai snapshot tanpa backend aktif dan AI sebagai pengujian provider palsu. |
| 3 | [CarbonTwin](https://devpost.com/software/carbontwin) | Pencarian overlap lintas registry dan release steward: pembaruan versi data, rescreening, adjudikasi AI, validasi, serta Merkle anchor. | [Demo](https://hyunsikparker.github.io/carbontwin/), [GitHub proyek asli](https://github.com/HyunsikParker/carbontwin), video; halaman menyebut pengembangan rilis baru di GitLab. | Shared vintage tanpa serial number belum membuktikan double counting. Cakupan rilis baru belum diaudit dari kode/eksekusi. |
| 4 | [CarbonShield](https://devpost.com/software/carbonshield) | Stress test asumsi verifikasi kredit REDD+ pada enam dimensi. | [GitHub](https://github.com/saideeksha19/carbonshield), video. | README masih menyebut fase riset/data sedang berjalan; klaim implementasi Devpost belum direproduksi. Keluaran bukan label fraud. |
| 5 | [Mizan — the carbon passport for EU-bound exports](https://devpost.com/software/mizan-the-carbon-passport-for-eu-bound-exports) | Paspor emisi per pengiriman: ekstraksi dokumen dengan sitasi, perhitungan, review manusia, dan pencatatan Merkle di Hedera. | [Demo](https://mizan-cbam.vercel.app/), [GitHub](https://github.com/abubokkor-cse/Mizan), video. | Evaluasi yang dilaporkan memakai tujuh dokumen; belum independen. Mode demo memakai chain simulasi. Klaim live/testnet tidak diverifikasi dalam riset ini. |
| 6 | [Uncounted: Verifiable Ledger for Wildfire & War Emissions](https://devpost.com/software/uncounted-verifiable-ledger-for-wildfire-war-emissions) | Estimasi emisi kebakaran dan atribusi konflik dari data NASA FIRMS, model, ketidakpastian, dan ledger. | [GitHub](https://github.com/mlkmas/uncounted), video. | Atribusi konflik merupakan hasil model, bukan pengukuran langsung. Public testnet dan tambahan cuaca disebut sebagai pengembangan berikutnya. |
| 7 | [Grounded — Test Tomorrow Before It Arrives](https://devpost.com/software/grounded-test-tomorrow-before-it-arrives) | Digital twin untuk menguji ketahanan microgrid rumah sakit dan komunitas Jaipur pada skenario iklim/gangguan listrik. | [Demo](https://grounded-peach.vercel.app/), [GitHub](https://github.com/codewithanshuman/grounded). | Eksperimen 500 skenario dan konsekuensi cadangan baterai adalah simulasi yang dilaporkan pembuat; belum validasi rumah sakit nyata. |
| 8 | [AquaQuest](https://devpost.com/software/aquaquest) | Citizen science perairan: penjelajahan lokasi, observasi/foto, informasi One Health, dan kontribusi komunitas. | [Demo](https://luzaynarahman-dot.github.io/AquaQuest/), [GitHub](https://github.com/luzaynarahman-dot/AquaQuest). | Versi yang dijelaskan memakai konten demo, mock API, dan penyimpanan lokal. Observasi visual bukan pengganti uji laboratorium. |
| 9 | [AION V3 — Sovereign Value OS](https://devpost.com/software/aion-v3-sovereign-value-os) | Memisahkan nilai peluang yang diperkirakan dari nilai yang dibuktikan setelah tindakan. | Video tersemat; repo/demo terpisah tidak terlihat pada halaman yang diperiksa. | Verifikasi dampak lingkungan masih arah pengembangan. Implementasi sulit dinilai dari deskripsi dan video saja. |
| 10 | [CarbonLens](https://devpost.com/software/carbonlens-vo3hut) | Memeriksa klaim kredit hutan dengan citra multispektral, membatasi penerbitan, dan mencatat hasil di blockchain. | Label GitHub terlihat; URL repo tidak berhasil diuraikan oleh penelaah. | Halaman menyatakan citra satelit disimulasikan dan proyeknya fiktif. Ini belum validasi kredit karbon nyata. |

### Koreksi terhadap daftar awal

- **PLUME:** `/software/plume` adalah proyek lain. Gunakan alamat lengkap pada tabel.
- **Cloud, Climate, Chain / RANTAI 3C:** tidak dihitung dalam sepuluh terkonfirmasi. Indeks pencarian mengaitkannya dengan ClimateChain, tetapi bagian Submitted to pada [halaman Cloud, Climate, Chain](https://devpost.com/software/cloud-climate-chain) yang dibuka langsung hanya menampilkan Dev Season of Code; [halaman RANTAI 3C lainnya](https://devpost.com/software/3c-cloud-climate-chain) menampilkan Hack-Earth dan Snow Fest. Ini ketidakcocokan yang belum terselesaikan, bukan bukti bahwa pembuat tidak pernah mendaftar.
- **CarbonTwin release steward:** [halaman terpisah ini](https://devpost.com/software/carbontwin-release-steward) menautkan Life After Code; jangan menghitungnya sebagai submission ClimateChain kedua.

## Pembanding yang paling relevan

Ini pilihan untuk belajar, bukan urutan peringkat.

1. **PLUME — pembanding masalah paling dekat.** Ceritanya menghubungkan penemuan emisi dengan pendanaan dan keputusan tindakan. Dari deskripsi dan struktur repo, cakupan workflow tindakannya lebih luas daripada MethaneResponse. Itu belum membuktikan manfaat lapangan; demo lokal dan perbaikannya tetap simulasi. Jangan menyimpulkan bahwa PLUME telah membuktikan AI live atau mitigasi nyata.
2. **Kanopy — pembanding penjelasan metode.** Ketidakpastian pengukuran, hasil komputasi, dan integritas registrasi memberi bahan demo yang dapat diperiksa. Pelajarannya untuk kita: tunjukkan asal angka dan batas maknanya sebelum menjelaskan hash.
3. **Mizan dan CarbonTwin — pembanding audit dan revisi.** Sitasi sumber/review manusia pada Mizan serta pembaruan versi, adjudikasi, dan anchor pada CarbonTwin beririsan dengan rancangan MethaneResponse. Kombinasi AI, sitasi, manusia, snapshot, dan blockchain belum cukup sebagai klaim kebaruan. Pemeriksaan klaim respons metana dalam konteks record MARS adalah hipotesis pembeda yang perlu diuji, bukan keunikan yang sudah terbukti.
4. **Grounded — pembanding demonstrasi keputusan.** Pilihan cadangan baterai dihubungkan dengan kegagalan layanan kritis dan beban lain yang dikorbankan. Kita membutuhkan hasil tugas pengguna yang sama konkretnya, dengan label yang jelas apakah hasil berasal dari simulasi, evaluasi tugas, atau pengukuran lapangan.

## Urgensi dan landasan penelitian

### Masalahnya kuat; manfaat aplikasi masih hipotesis yang harus diukur

[IEA Global Methane Tracker 2026](https://www.iea.org/reports/global-methane-tracker-2026/key-findings) memperkirakan emisi metana operasi bahan bakar fosil pada 2025 sebesar **124 juta ton per tahun**. Sekitar **70% dari emisi metana bahan bakar fosil tersebut** dapat dikurangi dengan teknologi yang tersedia. Angka ini menjelaskan skala masalah dan peluang mitigasi sektor; angka tersebut bukan pengurangan emisi yang disebabkan aplikasi.

Panduan [IEA–IMEO tentang respons notifikasi MARS](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system), diterbitkan 4 Mei 2026, melaporkan sekitar **12% notifikasi pada 2025 menerima respons** dan menguraikan lima tahap dari penerimaan alert, notifikasi operator, respons, verifikasi, hingga dokumentasi. Angka respons itu bukan persentase perbaikan, bukan respons periode dataset negara di aplikasi, dan tidak boleh dipindahkan ke denominator lain.

**Inferensi untuk produk:** dokumentasi dan pemeriksaan bukti respons adalah masalah yang layak diuji. Rendahnya respons global belum membuktikan bahwa kurangnya dashboard/audit tool merupakan penyebabnya, atau bahwa MethaneResponse akan menaikkan respons. Wewenang, biaya, organisasi, dan tindakan lapangan juga memengaruhi hasil.

### Akui sistem yang sudah ada

[UNEP MARS](https://www.unep.org/en/what-we-do/energy/methane/methane-alert-and-response-system-mars) sudah menggabungkan data satelit, keahlian ilmiah, AI, notifikasi, dan tindak lanjut. [FAQ MARS](https://www.unep.org/en/what-we-do/energy/methane/international-methane-emissions-observatory/mars-frequently-asked) menjelaskan batas observasi, termasuk awan dan cahaya. Klaim “pertama menggunakan satelit + AI untuk respons metana” tidak tepat bagi MethaneResponse. Tidak adanya record berikutnya juga tidak membuktikan emisi nol.

[Catatan metode repo](methane-response-evidence-and-evaluation-2026-10-13.md) sudah menghubungkan studi controlled release dan evaluasi sitasi AI ke keputusan produk. Catatan itu bertanggal lebih lama: jumlah record di dalamnya bukan jumlah snapshot aktif. Sumber ilmiah eksternal mendukung desain pengujian, bukan otomatis memvalidasi produk kita.

### Bedakan tiga evaluasi

| Evaluasi | Bukti yang sudah ada pada repo | Kekurangan saat ini |
|---|---|---|
| Ketepatan rekayasa | Baseline deterministik, regresi, build/browser dan CI bertanggal, manifest/hash, exact source IDs. | Pemeriksaan tersebut tidak mengukur kegunaan bagi orang independen atau kebenaran setiap kasus fisik. Tidak diulang pada pass riset ini. |
| Model dan penilaian bukti | Model archive recurrence dibanding baseline; protocol anotasi dan pemeriksaan kutipan tersedia. | ROC AUC sekitar 0,808 adalah hasil retrospektif kemunculan record arsip; window telah diperiksa saat development. AI dokumen belum memiliki benchmark independen/provider live. |
| Manfaat dan dampak | [Protokol pilot](../evidence/target-user-pilot-protocol.md) siap digunakan. | Belum ada peserta, hasil tugas, penghematan waktu terukur, atau dampak pengurangan emisi yang diatribusikan kepada aplikasi. |

Metrik dari tugas yang berbeda—misalnya atribusi kebakaran, ekstraksi dokumen, simulasi microgrid, dan archive recurrence—tidak dapat dipakai membuat satu peringkat akurasi.

## Posisi MethaneResponse terhadap kriteria kompetisi

Kriteria mengacu pada [overview resmi](https://ieee-climatechain-hack.devpost.com/); tidak ditemukan bobot numerik. Penilaian di bawah adalah analisis kerja, bukan skor juri atau prediksi kemenangan.

| Kriteria | Kekuatan yang bisa ditunjukkan sekarang | Yang menahan klaim keunggulan |
|---|---|---|
| Climate Impact | Masalah metana dan kesenjangan respons didukung sumber primer; histori sumber, notifikasi, feedback, dan klaim mitigasi dibedakan. | Belum ada bukti aplikasi menyebabkan tindakan lebih baik atau pengurangan emisi. |
| Innovation & Creativity | Pemeriksaan klaim tertentu terhadap bukti, abstention, snapshot, review dan revisi yang dapat ditelusuri. | Komponen audit/AI/blockchain juga muncul pada pembanding. Nilai tambah terhadap workflow publisher/manual belum diukur. |
| Technical Execution | Explorer 4.218 source/30.414 plume, indikator publisher, penyimpanan file atomik, audit aturan, laporan dan verifier lokal. | Tidak ada layanan publik yang diklaim; provider AI belum dievaluasi; anchoring API tidak aktif dengan file store. Kode kontrak saja belum menjadi alur on-chain aktif. |
| Practical Usefulness | Tugas peneliti/auditor jelas; alur lokal dan protokol pilot tersedia. | Belum ada penggunaan independen, hasil pilot, atau bukti adopsi. |
| Presentation & Communication | Satu kasus dapat memperlihatkan record, keputusan yang menahan klaim, revisi, dan pemeriksaan export. | Paket Notion lokal belum membuktikan video final atau halaman presentasi terbit. Terlalu banyak workspace dapat mengaburkan keputusan utama. |

Dasar status: [status implementasi aktif](../release/current-implementation-status.md), [data dan klaim](../product/data-and-claims.md), [registrasi prospektif](../product/prospective-recurrence.md), serta [keputusan tanpa database](../architecture/decisions/2026-10-15-local-prototype-no-database.md). Pemeriksaan kode pada `apps/api/src/app.ts` menegaskan API membutuhkan operasi reservation/completion yang tidak tersedia pada local file store untuk anchoring.

**Kesimpulan komparatif:** MethaneResponse memiliki fondasi audit lokal dan provenance yang dapat diperiksa. Bukti yang tersedia belum cukup untuk menyebutnya terbaik pada salah satu kriteria di antara seluruh peserta. Menambah jumlah fitur bukan ukuran langsung kualitas penelitian atau manfaat.

## Prioritas pengembangan dan validasi berikutnya

Urutan ini adalah rekomendasi dari riset; belum berarti implementasi baru atau kegiatan eksternal sudah dijalankan.

1. **Siapkan paket bukti kasus yang sah dan dapat dinilai orang lain.** Gunakan klaim dan sumber yang tetap, izin pemrosesan yang jelas, label detection/notification/mitigation terpisah, dan contoh ketika bukti memang tidak cukup. Untuk kasus nyata, bedakan “bukti belum dimasukkan ke audit” dari “kejadian fisik tidak terjadi”. Jangan menyalin laporan pihak ketiga yang haknya belum jelas.
2. **Jalankan evaluasi tugas pengguna sesuai protokol yang ada.** Rekrut 5–8 peneliti/auditor/analyst dengan persetujuan; bandingkan workflow publisher/manual dan MethaneResponse secara counterbalanced. Catat waktu, penyelesaian, bantuan, dan salah pengertian. Ini studi formatif kecil; belum membuktikan penghematan waktu populasi atau dampak iklim.
3. **Buktikan tambahan manfaat AI sebelum mempromosikannya.** Ikuti [protokol benchmark](../testing/ai-benchmark-annotation.md): setidaknya 40 klaim held-out dari 10 source, label independen, hak pemrosesan, dan baseline aturan pada input yang sama. Target internal macro-F1 ≥0,80, citation precision ≥0,90, serta nol false-supported adalah gerbang proyek, bukan hasil yang sudah dicapai. Bila korpus/provider belum siap, tampilkan baseline aturan yang benar-benar tersedia.
4. **Perkuat satu alur demo yang dapat diperiksa juri.** Source historis → klaim tepat → bukti/sitasi atau alasan abstain → keputusan reviewer → export → verifikasi versi/integritas. Tampilkan batas data dan integrasi. Klaim integritas harus menjelaskan keterbatasan hash tanpa tanda tangan terhadap penggantian seluruh paket.
5. **Jaga batas integrasi yang sudah diputuskan.** Sesuai ADR aktif, anchoring API tidak tersedia pada file store. Kontrak, pemeriksaan receipt, dan verifikasi digest lokal adalah komponen terpisah. Jika pemilik meminta alur blockchain baru, perlukan keputusan scope yang eksplisit sebelum implementasi dan otorisasi sebelum transaksi. Jangan mengaktifkan kembali database untuk menyamai pesaing. Hosting dibahas hanya bila ada kebutuhan demo remote konkret, dengan sifat persistensi ephemeral dijelaskan.

Posisi yang layak diuji dalam presentasi: **“MethaneResponse membantu peneliti menelusuri apakah klaim respons metana didukung bukti yang cukup, dengan sumber, keputusan, dan revisi yang dapat diperiksa.”** Ini deskripsi tujuan dan kemampuan lokal; klaim manfaat terukur menunggu evaluasi.

## Pemantauan galeri

- Permintaan pengguna: beri tahu ketika galeri resmi dipublikasikan.
- Otomasi **IEEE ClimateChain: pantau galeri publik** dibuat dan diaktifkan untuk **09.00 dan 21.00 Asia/Makassar** setiap hari, memakai workspace ini dan sesi Codex baru.
- Instruksi membedakan belum terbit, sudah terbit, dan akses tidak dapat diverifikasi. Otomasi diminta menonaktifkan dirinya setelah pembukaan benar-benar terkonfirmasi.
- Hasil tersedia dalam otomasi Orca. Ketersediaan host/runtime dan provider tetap diperlukan; ini bukan janji notifikasi ChatGPT, email, atau push perangkat.
- Status konfigurasi dibaca ulang dari runtime setelah diaktifkan. Eksekusi manual pertama juga diverifikasi melalui layar terminal khusus otomasi: tugas benar-benar membuka URL galeri dan pada **16 Oktober 2026, 13.19 WITA** melaporkan **BELUM DIPUBLIKASIKAN**; jadwal dipertahankan. Bukti ini melampaui status dispatch, tetapi belum membuktikan bahwa eksekusi terjadwal berikutnya atau notifikasi perangkat telah terjadi.

## Batas penggunaan laporan

Halaman publik bisa berubah sebelum batas submission. Segarkan bukti bila galeri terbit atau materi pesaing berubah. Jangan menggunakan daftar ini sebagai audit keamanan, sertifikasi ilmiah, peringkat final, atau alasan untuk menyebut seluruh pengembangan selesai.
