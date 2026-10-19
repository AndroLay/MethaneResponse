# Protokol review dokumenter

**Versi:** P4-2026-10-18-v2. **Rancangan:** satu atau lebih pakar manusia relevan, review kualitatif. Ini bukan studi akurasi model, pilot pengguna, audit legal atau sertifikasi fasilitas.

## Sebelum sesi

Fasilitator mengonfirmasi kompetensi yang relevan, hubungan dengan tim dan konflik kepentingan. Penilai bukan penulis produk atau agent AI. Catatan verifikasi/identitas/consent disimpan privat; kode seperti E01 hanya pseudonim, bukan jaminan anonimitas. Jika keahlian mencakup remote sensing saja, jangan menganggap MRV/otorisasi audit sudah ikut dinilai.

Pastikan versi paket, snapshot, jenis review dan batas waktu diterima. Perubahan kode atau prompt setelah freeze harus mendapat versi baru, penjelasan selisih dan penentuan bagian yang perlu direview ulang. Jangan mengganti kasus berdasarkan jawaban yang disukai.

## Fase A — penilaian awal, sekitar 35–45 menit

1. Baca brief, sumber dan kasus. Tidak perlu memasang aplikasi. Semua tautan eksternal opsional; jika sumber tidak dapat dibuka, catat bagian yang belum dapat dinilai.
2. Untuk setiap kasus, tentukan kesimpulan yang didukung **bahan yang disertakan**, scope yang tepat, alasan dan next evidence request. Pilihan: supported / contradicted / insufficient evidence / label tidak memadai / belum dapat dinilai.
3. Bedakan kesimpulan tentang keberadaan record, klaim publisher dan keadaan fisik. Pakar boleh memberikan kesimpulan berbeda dari baseline; tidak ada kunci jawaban pakar yang sudah diisi.
4. Jangan menggunakan pengukuran/laporan privat tanpa izin. PDF pihak ketiga tidak disalin; jika Anda memeriksa dokumen di situs asal, catat URL/locator serta lingkup pemeriksaan, tanpa menempelkan konten terbatas.

Fasilitator hanya menjelaskan format/istilah. Bantuan substantif, dokumen tambahan atau penyimpangan waktu dicatat. Jangan memandu penilai menuju label tertentu. Formulir awal disimpan sebelum memberikan output aplikasi.

## Fase B — perbandingan implementasi, sekitar 15–20 menit

Berikan paket comparison berisi baseline aktual. Untuk setiap perbedaan, catat apakah masalah terletak pada aturan, jenis evidence, scope, bahasa label, bahan yang kurang atau keterbatasan review. Kesepakatan dengan implementasi tidak dihitung sebagai validasi fisik atau skor akurasi. Tidak ada threshold persentase untuk memaksa P4 lulus.

Tinjau delapan domain pada formulir: rantai bukti, scope/identitas, tiga label, uncertainty, next request, interpretasi publisher, batas trust/integrity dan batas manfaat. Jelaskan risiko D05 dan claim wording yang tidak dipahami otomatis oleh baseline.

## Fase C — temuan dan pemeriksaan ulang

Setiap temuan mempunyai ID, domain/kasus, dampak, dasar rujukan, versi dan perbaikan yang dapat diperiksa. Severity disepakati berdasarkan konsekuensi:

- **Critical:** memungkinkan kesimpulan fisik keliru yang serius atau pengungkapan data yang seharusnya privat.
- **Major:** mengubah penilaian/scope/interpretasi penting atau menghilangkan bukti yang diperlukan.
- **Minor:** kejelasan/penyajian yang tidak mengubah kesimpulan.

Tim mencatat keputusan accept / reject with rationale / defer dan perubahan terkait. Temuan critical/major tidak dianggap selesai hanya karena ditambah disclaimer. Pakar memeriksa ulang bagian yang berubah, menyatakan resolved / unresolved / unable to reassess, dan mencatat versi. Temuan tidak boleh ditutup sepihak dengan keputusan implementer bila keberatan domain material belum terselesaikan.

## Hasil dan izin

Ringkasan akhir memuat tanggal, versi, keahlian/lingkup, kasus yang diperiksa/tidak diperiksa, temuan, perbaikan dan batas. Review selesai hanya bila benar-benar dilakukan dan temuan material telah ditutup serta diperiksa ulang. Jika belum, status tetap in progress.

Pakar memilih izin terpisah untuk partisipasi, publikasi ringkasan yang disetujui, kutipan yang disetujui serta nama/afiliasi. Penolakan publikasi tidak membatalkan masukan privat. Jika ringkasan tidak boleh dipublikasikan, catat pembatasannya; jangan mengunggah jawaban atau menyatakan hasil publik yang tidak diizinkan. Tidak ada recording/audio/provider processing secara default.
