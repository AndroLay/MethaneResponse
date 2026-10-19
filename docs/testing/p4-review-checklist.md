# Checklist pemeriksaan pakar P4

**Versi:** P4-checklist-2026-10-18-v1. **Tanggal:** 18 Oktober 2026. Pendamping [paket P4-2026-10-18-v1](../evidence/domain-review-remediation-2026-10-18/README.md). Catat kedua versi jika checklist ini dipakai dalam sesi.

Tujuan pemeriksaan: menilai apakah metode, interpretasi data dan bahasa MethaneResponse layak untuk prototipe investigasi bukti historis. Pemeriksaan dilakukan oleh pakar manusia sesuai kompetensinya; tim menyiapkan bahan dan menangani temuan.

## Cara memakai

1. Fasilitator memeriksa prasyarat dan menyerahkan reviewer ZIP.
2. Pakar membaca brief, menilai kasus dan mengisi formulir **sebelum melihat baseline per kasus**.
3. Fasilitator memberikan comparison ZIP; pakar mencatat perbedaan beserta alasannya.
4. Tim memperbaiki temuan material; pakar memeriksa ulang perubahan.
5. Ringkasan akhir mencatat hasil, bagian yang belum dinilai dan izin publikasi.

Gunakan status **memadai untuk scope / perlu perbaikan / belum dapat dinilai** disertai alasan. Jika bagian di luar kompetensi atau bahan tidak tersedia, catat batas dan pemeriksa/bukti tambahan yang dibutuhkan. Centang berarti butir sudah diperiksa, bukan otomatis benar atau lulus. Semua kotak di bawah masih kosong; ini belum merupakan hasil review.

## 1. Kualifikasi, independensi dan versi

**Penanggung jawab:** fasilitator bersama pakar.

- [ ] Pengalaman yang relevan pada metana/MRV, remote sensing atau audit bukti dapat ditunjukkan; scope keahlian dan bagian di luar kompetensi dicatat.
- [ ] Hubungan dengan tim, peran dalam pengembangan dan konflik kepentingan dinyatakan. Pakar independen bukan penulis produk atau agent AI.
- [ ] Versi paket, snapshot data, checksum, tanggal dan bahan yang benar-benar diperiksa dicatat.
- [ ] Kesediaan berpartisipasi diperoleh sebelum review; identitas, kontak dan consent disimpan privat.

**Keluaran:** catatan kualifikasi/scope privat dan identitas versi review. Nama/afiliasi publik mengikuti izin tersendiri.

## 2. Asal data dan keterlacakan

**Pertanyaan:** dapatkah setiap informasi ditelusuri ke sumber dan record asalnya?

- [ ] Metadata historis UNEP IMEO/MARS terpisah jelas dari enam kasus rekaan berlabel DEMO.
- [ ] Source ID, plume/observation ID, timestamp, satuan dan nilai pada kasus cocok dengan data asal yang dirujuk.
- [ ] Snapshot historis dan tanggal pemeriksaan halaman referensi dibedakan; pembacaan halaman baru tidak dianggap pembaruan dataset.
- [ ] Atribusi, lisensi dataset dan batas hak laporan publisher dicatat. Tautan laporan tidak diperlakukan sebagai izin menyalin isinya.

**Bahan:** [kasus](../evidence/domain-review-remediation-2026-10-18/reviewer/03-cases.md), [JSON](../evidence/domain-review-remediation-2026-10-18/reviewer/cases.json), [register sumber](../evidence/domain-review-remediation-2026-10-18/reviewer/05-source-register.md).

## 3. Pemisahan tahap respons

**Pertanyaan:** apakah kesimpulan tetap sesuai tahap bukti yang tersedia?

- [ ] Deteksi, atribusi sumber, notifikasi, respons stakeholder, tindakan mitigasi dan follow-up dibedakan.
- [ ] Flag `feedback` tidak dipakai sendirian untuk menyatakan perbaikan peralatan atau pengurangan emisi.
- [ ] Flag notifikasi agregat tidak berubah menjadi klaim bahwa penerima tertentu menerima notifikasi kejadian tertentu.
- [ ] Fungsi produk dijelaskan sesuai pekerjaan yang benar-benar dilakukan: pengorganisasian dan penilaian bukti historis.

**Keluaran:** bagian alur/kalimat yang memadai atau perlu diperbaiki, beserta alasan domain.

## 4. Scope sumber, kejadian, periode dan penerima

- [ ] Bukti merujuk sumber dan, bila ditentukan, observation ID yang sama dengan klaim.
- [ ] Tanggal observasi, notifikasi, tindakan, follow-up dan terbit laporan tidak dipertukarkan.
- [ ] Bukti di luar periode dinyatakan dengan tepat; batas hari kalender pada aturan diperiksa dampaknya.
- [ ] Penerima notifikasi dan tingkat spesifikasi klaim sesuai bukti yang tersedia.
- [ ] Setiap kalimat pada exact claim diperiksa secara substantif. Jenis referensi dan scope yang cocok saja tidak membuktikan seluruh kalimat bebas.

**Keluaran:** scope yang benar, bukti yang tidak cocok dan usulan pemisahan klaim jika diperlukan.

## 5. Arti label keputusan

**Pertanyaan:** apakah `supported`, `contradicted` dan `insufficient_evidence` sesuai bahan dan cukup jelas bagi pembaca?

- [ ] `supported` tidak menimbulkan keyakinan fisik yang melebihi bahan yang diperiksa.
- [ ] `contradicted` mempunyai dasar yang relevan dan dapat diperiksa; ketiadaan bukti bukan bukti bantahan.
- [ ] Konflik dukungan/bantahan ditangani dengan alasan yang jelas, tanpa memilih hasil yang menguntungkan proyek.
- [ ] Bukti tidak cukup dan ketidakmampuan menilai dapat dilaporkan tanpa dipaksa menjadi ya/tidak.
- [ ] Nama `mitigation_confirmed` dan risiko kasus D05 dinilai secara kritis. Pakar boleh meminta perubahan label atau gerbang bukti substantif.

**Bahan:** brief dan potongan metode dalam reviewer ZIP. Keluaran baseline dibaca setelah penilaian awal.

## 6. Kecukupan bukti tindakan dan follow-up

- [ ] Hubungan klaim, tindakan, waktu, lokasi/sumber, dokumen rujukan dan pengamatan setelah tindakan diperiksa.
- [ ] Field metadata yang lengkap dibedakan dari autentisitas dokumen, isi yang relevan dan kualitas pengukuran.
- [ ] D02/D03/D05 dipakai untuk menilai risiko bukti rekaan, konflik dan kelengkapan administratif.
- [ ] Jika pemeriksaan fisik memerlukan isi laporan, data sensor atau inspeksi yang tidak disertakan, kebutuhan itu dicatat tanpa membuat kesimpulan pengganti.

**Keluaran:** bukti minimum yang diperlukan untuk kesimpulan lebih kuat dan kontrol yang harus diperbaiki.

## 7. Ketidakpastian dan pengamatan yang hilang

- [ ] Flux kg/h dan standard deviation dibaca sesuai satuannya; standard deviation tidak otomatis disebut confidence interval.
- [ ] Keterbatasan coverage, kesempatan pengamatan dan atribusi dipertimbangkan sesuai kompetensi pakar dan bahan yang tersedia.
- [ ] Ketiadaan plume/record berikutnya tidak diperlakukan sebagai emisi nol atau bukti keberhasilan mitigasi.
- [ ] Sampel observasi historis tidak dipakai untuk menghitung penurunan emisi kumulatif tanpa metode dan data yang memadai.

**Keluaran:** pernyataan uncertainty yang layak dan inferensi yang harus dibatasi.

## 8. Perbandingan dengan interpretasi publisher

- [ ] Judul/metadata item publisher dibedakan dari pemeriksaan isi laporan dan assessment independen.
- [ ] Kesimpulan dibatasi pada bahan yang benar-benar dibaca. Ketidakcukupan paket tidak otomatis membantah kesimpulan publisher.
- [ ] Perbedaan interpretasi dijelaskan dengan URL/locator, scope dan dasar domain yang dapat ditelusuri.
- [ ] Laporan yang belum tersedia atau hak penggunaannya belum jelas dicatat sebagai batas pemeriksaan.

**Kasus utama:** R03–R06.

## 9. Tindak lanjut yang dapat dilakukan

- [ ] Next evidence request menyebut bukti yang diminta, pihak/peran yang relevan dan hubungannya dengan kekurangan bukti.
- [ ] Permintaan membedakan kebutuhan bukti tindakan, bukti notifikasi dan pengukuran follow-up.
- [ ] Saran tidak melampaui mandat pengguna atau mengesankan aplikasi sudah mengirim notifikasi resmi.
- [ ] Prioritas dan keterbatasan tindakan dinyatakan, termasuk hal yang belum dapat ditentukan dari metadata.

**Keluaran:** next evidence request yang diperbaiki per kasus bila diperlukan. Kegunaan praktis bagi pengguna tetap memerlukan pilot P5.

## 10. Arti trust, identitas reviewer dan integritas

- [ ] Kewenangan reviewer di direktori dibedakan dari verifikasi kompetensi, independensi dan kebenaran penilaiannya.
- [ ] Hash, digest dan receipt dijelaskan sebagai bukti integritas/versi; tidak mengesahkan kondisi fisik atau isi klaim.
- [ ] Receipt lokal Anvil dibedakan dari transaksi Sepolia publik yang belum tersedia.
- [ ] Status publikasi/koreksi/withdrawal dibedakan dari pemeriksaan checksum file offline.

**Pembagian tugas:** pakar menilai kecukupan makna dan risiko salah tafsir. Tim teknis menyediakan bukti operasi yang relevan. Review dokumenter P4 tidak mencakup seluruh pengujian keamanan atau deployment.

## 11. Privasi, izin publikasi dan batas manfaat

- [ ] Bahan privat, identitas reviewer dan dokumen terbatas ditangani melalui kanal yang disepakati.
- [ ] Consent partisipasi dipisahkan dari izin ringkasan, kutipan, nama dan afiliasi; teks publik disetujui tersendiri.
- [ ] Output publik menyatakan batas metadata historis, DEMO, ketidakpastian dan hal yang belum diperiksa secara konsisten.
- [ ] Klaim manfaat pengguna, akurasi AI atau pengurangan emisi tidak melebihi hasil yang tersedia. P5/P6 mempunyai pemeriksaan tersendiri.

**Keluaran:** koreksi bahasa yang diperlukan serta ruang lingkup publikasi yang diizinkan.

## 12. Temuan, perbaikan dan pemeriksaan ulang

- [ ] Setiap temuan mempunyai ID, kasus/domain, versi, dasar, konsekuensi dan usulan perubahan/bukti.
- [ ] Severity dicatat: critical untuk risiko kesimpulan fisik serius/pengungkapan privat; major untuk perubahan penting pada penilaian/scope/bukti; minor untuk kejelasan yang tidak mengubah kesimpulan.
- [ ] Tim mencatat menerima, menolak dengan alasan, atau menunda; temuan material yang belum terselesaikan tetap terlihat.
- [ ] Perubahan material diperiksa ulang oleh pakar pada versi yang diketahui. Penambahan disclaimer saja tidak menutup keberatan substantif.
- [ ] Ringkasan mencantumkan kasus diperiksa/dilewati, bantuan/bahan tambahan, perbaikan, status recheck dan keterbatasan.

**Keluaran:** ledger temuan, rujukan perbaikan, hasil recheck dan ringkasan yang disetujui. P4 selesai setelah review nyata dan temuan material ditutup serta diperiksa ulang sesuai [protokol](domain-expert-review.md).

## Peta pemeriksaan 12 kasus

Tabel ini mengarahkan perhatian; tidak menetapkan jawaban benar atau label pakar.

| ID | Fokus pemeriksaan |
|---|---|
| R01 | Apa yang dapat disimpulkan dari record deteksi pada event tertentu; batas atribusi dan uncertainty |
| R02 | Apakah metadata notifikasi cukup untuk klaim penerima dan kejadian yang spesifik |
| R03 | Hubungan metadata historis KAZ_S_159 dengan item publisher; bahan tambahan untuk menilai tindakan/follow-up |
| R04 | Kronologi observasi April dan item publisher Juli pada CAN_S_002 |
| R05 | Keterbatasan satu observasi terkait LBY_S_143 dan tautan publisher |
| R06 | Batas penilaian ARG_S_055 ketika isi laporan dan hak penggunaannya belum tersedia |
| D01 DEMO | Kesesuaian referensi notifikasi, tanggal, event dan penerima |
| D02 DEMO | Kecukupan referensi bantahan eksplisit serta risiko metadata rekaan |
| D03 DEMO | Penanganan bukti dukungan dan bantahan yang berkonflik |
| D04 DEMO | Dampak follow-up di luar periode klaim |
| D05 DEMO | Apakah field lengkap cukup untuk label yang dipakai; kontrol autentisitas/isi yang diperlukan |
| D06 DEMO | Kesimpulan yang layak ketika bukti dan observasi follow-up kosong |

## Format jawaban dan hasil minimum

Isi [formulir pakar](../evidence/domain-review-remediation-2026-10-18/reviewer/04-response-form.md) pada salinan privat. Untuk setiap kasus, catat:

1. Kesimpulan awal dan scope/batasnya.
2. Alasan serta referensi/locator yang benar-benar diperiksa.
3. Bukti berikutnya yang dibutuhkan.
4. Ketidakpastian atau bagian yang belum dapat dinilai.
5. Setelah baseline diberikan: perbedaan pendapat dan penyebabnya.

Untuk setiap temuan, catat **ID → risiko → perubahan/bukti yang diperlukan → tindakan tim → versi perbaikan → recheck pakar**. Template [ledger](../evidence/domain-review-remediation-2026-10-18/maintainer/findings-template.csv) dan [ringkasan](../evidence/domain-review-remediation-2026-10-18/maintainer/review-summary-template.md) tersedia.

Hasil minimum adalah penilaian yang dapat ditelusuri, daftar temuan/perbaikan, recheck material dan ringkasan dengan batas/izin yang jelas. Tidak ada target skor atau kewajiban setuju dengan baseline. Kasus yang dilewati tetap dilaporkan.
