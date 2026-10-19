# Fase B — keluaran implementasi, bukan jawaban pakar

**Paket:** P4-2026-10-18-v1. Berikan berkas ini dan baseline-observations.json setelah respons fase A disimpan. Kesimpulan awal manusia tidak diubah agar menyamai implementasi.

| Kasus | Keluaran rules baseline saat freeze |
|---|---|
| R01 | supported |
| R02 | insufficient_evidence |
| R03 | insufficient_evidence |
| R04 | insufficient_evidence |
| R05 | insufficient_evidence |
| R06 | insufficient_evidence |
| D01 DEMO | supported |
| D02 DEMO | contradicted |
| D03 DEMO | insufficient_evidence |
| D04 DEMO | insufficient_evidence |
| D05 DEMO | supported |
| D06 DEMO | insufficient_evidence |

JSON memuat reason dan evidence IDs yang benar-benar dikembalikan `assess()` pada kode/data yang dibekukan. Semua keluaran ini adalah observasi implementasi. **Tidak ada label manusia, keakuratan model, temuan pakar atau pengesahan keadaan fisik pada tabel ini.**

Khusus D05, metadata rekaan lengkap dapat memenuhi aturan tanpa bukti fisik nyata. Pakar diminta mempersoalkan kecukupan label, gerbang substantif dan bahasa yang dilihat pengguna. D02 juga hanya memasok tipe contrary deklaratif; baseline tidak mengautentikasi isinya. Jika pakar menolak keluaran ini, masukkan penolakannya sebagai temuan yang ditangani, bukan sebagai kesalahan pakar.

Untuk R03–R06, paket hanya membawa metadata dan tautan laporan publisher. Insufficiency atas bahan paket tidak membuktikan klaim publisher salah. Jangan mengubah angka kesepakatan dengan baseline menjadi klaim akurasi independen.

Fasilitator mencatat perbedaan, bahan yang masih diperlukan, dampak dan perbaikan pada ledger temuan. Keputusan yang mengubah metode harus dibekukan sebagai versi berikutnya dan direview ulang sesuai protokol.
