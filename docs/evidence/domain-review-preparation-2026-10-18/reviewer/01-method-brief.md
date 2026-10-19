# Ringkasan metode untuk pakar

## Pertanyaan yang ingin diuji

Apakah metode dan bahasa MethaneResponse membantu peneliti/analis membedakan observasi historis, metadata notifikasi, respons pemangku kepentingan dan bukti tindakan/follow-up, tanpa mengubah ketiadaan bukti menjadi kesimpulan fisik?

Produk ini adalah proof of concept investigasi data historis. MARS/IMEO tetap penyedia data dan analisis asal. MethaneResponse tidak membuat deteksi satelit baru, tidak mengirim notifikasi resmi, tidak melakukan pengukuran lapangan, dan belum membuktikan pengurangan emisi atau manfaat pengguna.

## Masukan, scope dan provenance

- Kasus nyata memakai casebook empat sumber dalam snapshot `unep-mars-675417694883`; paket mengambil enam pertanyaan dari empat sumber tersebut. Tidak ada klaim sampel representatif.
- Source ID dan plume ID tidak dipertukarkan. Scope memuat tanggal mulai/akhir dan, bila dipilih, observation ID. Untuk klaim notifikasi yang spesifik, penerima juga diperlukan.
- Waktu observasi berbeda dari waktu pembaruan record atau tanggal terbit laporan. Paket mempertahankan timestamp asal; pembatasan periode aturan memakai hari kalender dari timestamp tersebut.
- Flux memakai kg/h; uncertainty yang dicantumkan adalah field standard deviation publisher, bukan interval kepercayaan atau uncertainty model aplikasi. Tidak ada asumsi distribusi atau interpolasi antarobservasi.
- `notified` dan `feedback` pada source merupakan metadata agregat. Paket tidak membentuk tanggal/penerima notifikasi spesifik dari flag itu.

Definisi field dapat dibandingkan dengan [kamus MARS](https://methanedata.unep.org/dict-mars-plumes). Data yang direview adalah snapshot tetap; pemeriksaan halaman referensi pada 18 Oktober tidak memperbarui arsip data.

## Aturan deterministik yang berjalan

| Claim category | Reference kind yang diperiksa | Batas operasional |
|---|---|---|
| `source_detected` | `detection` | Record relevan dengan tanggal/event; aplikasi tidak mengulang retrieval satelit |
| `operator_notified` | `notification` | Referensi bertanggal dan penerima/event yang cocok; source-level flag tidak cukup untuk penerima tertentu |
| `mitigation_confirmed` | `mitigation_confirmation` | Pada scope yang diterapkan, field tindakan, tanggal follow-up dan referensinya harus ada serta berada dalam periode yang sesuai |

`supported` berarti ada referensi metadata jenis yang diperlukan menurut aturan. `contradicted` memerlukan referensi contrary yang secara eksplisit cocok dengan claim category dan scope. Jika dukungan dan contrary sama-sama memenuhi syarat, aturan mengeluarkan `insufficient_evidence`. Referensi yang hilang atau di luar scope juga menghasilkan `insufficient_evidence`; hal itu tidak menyatakan klaim salah.

**Pertanyaan kritis:** kelengkapan field bukan pemeriksaan keaslian, kesesuaian isi atau kualitas pengukuran. Kasus D05 sengaja meminta Anda menilai apakah label `supported`/`mitigation_confirmed` masih berisiko disalahpahami walau batas ini dijelaskan. Rekomendasi mengubah label atau menambah gerbang substantif diterima. Nama kategori internal bukan sertifikasi otoritas MARS.

Baseline hanya menilai jenis referensi dan scope. Ia tidak membuktikan bahwa setiap kalimat bebas dalam exact claim didukung. Human assessment menyimpan claim wording, determination, rationale, referensi dan next evidence request; reviewer harus memeriksa hubungan substantif itu. Pertimbangkan apakah kontrol saat ini memadai atau memerlukan pemisahan klaim lebih ketat.

## Penilaian manusia, trust dan publikasi

Human assessment menghasilkan private schema 4 dengan parent hash. Reviewer dapat menyatakan insufficient meskipun metadata lolos aturan, atau menyelesaikan konflik dengan rationale. Pada hasil supported/contradicted, referensi bertipe dan scope yang sesuai tetap diperlukan. Aplikasi belum memiliki reviewer domain nyata yang didaftarkan.

Direktori operator mencatat kewenangan kategori, expiry/revocation; conflict of interest merupakan deklarasi terpisah. Ini tidak mengautentikasi kompetensi atau independensi secara eksternal. Publisher URL retrieval/digest opsional memeriksa origin/bytes sesuai batas teknis, bukan isi dokumen atau outcome fisik. AI opsional belum mempunyai benchmark independen dan tidak digunakan pada paket ini.

Ringkasan publik hanya field allowlist dengan consent per revisi. Koreksi/withdrawal menambah riwayat; full assessment tetap privat. Checksum dan receipt memeriksa integritas/versi. Checksum offline tidak menunjukkan status publikasi kini. Integrasi chain yang dibuktikan saat ini adalah jaringan lokal Anvil; belum ada receipt Sepolia publik.

## Perbandingan dengan kerangka publisher

[UNEP](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) menjelaskan empat komponen MARS: deteksi/atribusi, notifikasi/engagement, tindakan pemangku kepentingan, dan tracking/pembelajaran. [IEA–IMEO](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system) memisahkan penerimaan/penugasan, pemberitahuan operator, respons, verifikasi/follow-up, dan dokumentasi. Pemetaan produk ke bagian dokumentasi bukti merupakan keputusan desain tim; ini tidak menyatakan integrasi atau validasi resmi.

[FAQ IMEO](https://methanedata.unep.org/frequently-asked-questions) menjelaskan keterbatasan kesempatan deteksi dan respons stakeholder. Karena itu, penilaian fisik perlu mempertimbangkan konteks tindakan, kemampuan sensor dan bukti setelah tindakan. Paket tidak mengartikan tidak adanya record selanjutnya sebagai emisi nol.

## Hasil yang diminta

Tuliskan apakah interpretasi, scope, uncertainty dan label layak untuk prototipe ini; sertakan sumber/locator bila menolak suatu keputusan. Untuk tiap kelemahan, sebutkan kesimpulan yang berisiko berubah, perbaikan minimum, bukti yang masih diperlukan dan keahlian di luar cakupan Anda. Review dokumenter ini tidak meminta Anda mengesahkan keaslian laporan yang tidak disertakan atau fasilitas yang tidak Anda inspeksi.
