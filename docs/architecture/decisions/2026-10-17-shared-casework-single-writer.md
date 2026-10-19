# Shared casework untuk tim kecil melalui satu writer

- **Status:** Accepted untuk implementasi lokal P1 yang diminta pemilik pada 17 Oktober 2026.
- **Melanjutkan:** [ADR tanpa database](2026-10-15-local-prototype-no-database.md).
- **Scope:** satu proyek tim, satu proses API, penyimpanan file privat; tanpa layanan database atau deployment baru.

## Keputusan

Casework bersama disimpan terpisah dari bundle audit immutable. Setiap perubahan menggunakan expected revision, menyimpan aktor dari signed reviewer token, dan menambahkan versi riwayat. Token `private_read` diperlukan untuk membaca; penulisan memerlukan `private_read` dan `review`. Otoritas claim type di direktori harus masih `operator_attested` pada setiap operasi. Token reviewer legacy tidak memberi akses ke casework bersama.

File casework berada di samping `AUDIT_STORE_PATH`. Launcher API memegang kernel `flock` pada path stabil untuk seluruh masa hidup API, sehingga proses API kedua yang memakai state sama ditolak. File lock tidak dihapus/di-rename. Mutasi dalam proses diserialisasi; snapshot ditulis ke file sementara privat, di-flush, kemudian di-rename dan direktori di-flush. Read/parse gagal tidak diperlakukan sebagai state kosong.

Browser tetap mendukung casework lokal. Impor ke workspace bersama adalah create eksplisit dengan preview, tidak menghapus sumber lokal atau menimpa investigasi server. Token hanya berada di memori; draft recovery tidak menyimpan token. Konflik server mempertahankan draft dan memerlukan pengguna meninjau versi terkini sebelum menerapkan perubahan.

Save pertama juga menyimpan marker inisialisasi durabel sebelum ACK. State yang hilang sesudah itu ditolak, termasuk setelah restart, sampai restore yang eksplisit. Hilangnya seluruh volume beserta marker tetap tidak dapat dibedakan dari instalasi baru. Refresh UI yang gagal menyembunyikan data server lama dan menonaktifkan save sambil mempertahankan draft tab.

## Ancaman dan batas

- Anggota tanpa otoritas, token expired/revoked, dan penulis yang mengirim identitas aktor sendiri harus ditolak oleh server. List/detail/history tidak boleh membocorkan claim type di luar otoritas.
- Lost update dicegah CAS di satu writer. Proses yang melewati launcher, filesystem jaringan, multi-instance, dan operator yang mengedit state langsung berada di luar kontrak ini.
- Catatan disimpan privat dengan izin OS; bukan enkripsi at rest. HTTPS dan volume yang benar-benar persisten diperlukan sebelum penggunaan remote. Keberhasilan localhost tidak membuktikan deployment atau ketahanan volume host.
- Backup/restore dilakukan ketika API berhenti dan di bawah lock yang sama. Restore memvalidasi schema/riwayat; tidak menghapus audit atau mengubah dataset MARS.
- P1 tidak mengaktifkan anchor atau publikasi baru. Infrastruktur/biaya/deployment baru tetap membutuhkan otorisasi terpisah.

## Kompatibilitas

Audit JSON dan semua bundle/hash lama tetap utuh. Data browser v1/v2 tetap dapat dibaca. State bersama baru mempunyai schema tersendiri; rollback dapat kembali memakai mode browser setelah backup state bersama, tanpa mengubah data browser lama.

[Runbook](../../development/shared-casework.md) · [Bukti lokal P1](../../evidence/shared-casework-2026-10-17/README.md).
