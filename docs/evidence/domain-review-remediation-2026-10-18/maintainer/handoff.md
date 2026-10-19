# Handoff fasilitator

## Yang siap dan yang masih memerlukan manusia

Paket review dan perbandingan sudah disiapkan. Belum ada pakar, consent, sesi, temuan atau kesimpulan manusia. Kelima checklist P4 asli tetap belum dicentang. Fasilitator tidak boleh menyalin observasi baseline ke formulir sebagai jawaban pakar.

## Konfirmasi reviewer secara privat

Catat minimal satu bukti pengalaman relevan: publikasi/metode MRV/remote sensing yang dapat diperiksa, pengalaman audit bukti, atau mandat pekerjaan yang relevan. Ini verifikasi kualifikasi praktis untuk review prototipe, bukan sertifikasi profesi. Catat scope kompetensi dan bagian yang perlu penilai lain. Pakar bukan penulis proyek atau agent; hubungan kerja, pendanaan dan konflik dicatat. Jangan memakai judul akademik sebagai pengganti relevansi.

Simpan nama, kontak, bukti kompetensi, relasi, consent dan record asli di lokasi privat yang disetujui pemilik, di luar checkout publik. Repo hanya menyimpan template kosong serta ringkasan yang mendapat izin. Jangan menyimpan data pribadi lalu menganggap file belum di-commit berarti aman dipublikasikan.

## Sebelum mengirim

- Isi penerima/pengirim serta kanal balasan pada draf undangan; sepakati bahasa dan waktu. Lampiran awal adalah reviewer ZIP saja. Baseline diberikan setelah jawaban awal tersimpan.
- Verifikasi checksum ZIP. Manifest menandai kode/data lokal; HEAD saja tidak merepresentasikan working tree. Dokumen yang dibaca dari ZIP itulah versi review, meskipun kode repo berubah kemudian.
- Pilih review asinkron atau sesi 60–75 menit. Target internal 20 Oktober 12.00 WITA tidak menjamin ketersediaan pakar. Jangan menghilangkan kasus yang tidak diperiksa dari ringkasan.
- Jangan kirim `.env`, token, private audits, dokumen publisher penuh, recording atau corpus AI. Tidak ada panggilan provider untuk P4 ini.

## Saat hasil diterima

1. Simpan respons awal dan metadata consent secara privat, dengan checksum dan tanggal. Jangan mengedit jawaban pakar.
2. Catat temuan pada salinan privat findings-template.csv. Gunakan versi paket/kode, ID kasus, severity, akibat, dasar, usulan perbaikan dan status.
3. Lakukan perubahan minimum yang dapat diperiksa. Perubahan perilaku memerlukan tes yang relevan; dokumentasi memerlukan pemeriksaan makna/tautan dan alasan perubahan. Buat versi paket baru bila bahan review berubah.
4. Kembalikan diff dan bukti pemeriksaan kepada pakar. Minta recheck critical/major; penolakan usulan harus memiliki alasan dan tidak boleh menyembunyikan keberatan material yang belum terselesaikan.
5. Bekukan summary dengan versi sebelum/sesudah, tanggal, kompetensi yang disetujui, kasus reviewed/skipped, temuan/perbaikan, recheck dan batas. Pakar menyetujui teks publik secara terpisah. Tanpa izin, hasil tetap privat dan status bukti publik dicatat terbatas.

P4 verified hanya setelah review nyata dan penutupan temuan material dapat dibuktikan. Jika reviewer menilai metode tidak memadai, laporkan hasil itu dan perbaiki; jangan mengubah definisi lulus agar paket tampak selesai. Review dokumenter bukan bukti mitigasi fisik, studi manfaat P5 atau benchmark P6.
