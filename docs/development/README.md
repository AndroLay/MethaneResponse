# Pengembangan

[Pusat dokumentasi](../README.md) · [Peta repository](../repository-map.md)

## Mulai bekerja

1. [Setup lokal](local-setup.md): prasyarat, install, run, contoh alur dan penanganan masalah.
2. [Konfigurasi](configuration.md): environment API/web, reviewer, AI, storage dan receipt.
3. [Panduan perubahan](contributing.md): lokasi perubahan, kompatibilitas, pemeriksaan dan pemeliharaan docs.
4. [Pengujian](../testing/README.md): matriks command serta batas hasil.
5. [Investigasi bersama](shared-casework.md): akses tim, konflik revisi, import browser, lock, backup dan restore.
6. [Anchor dan pemulihan](blockchain-recovery.md): target, intent, pending, rekonsiliasi dan verifier independen.

7. [Koreksi dan penarikan publikasi](publication-lifecycle.md): consent revisi, status/history, checksum offline, migrasi dan batas rollback.

## Implementasi antarmuka

| Catatan | Pemakaian |
|---|---|
| [UI/workspaces](ui-implementation.md) | Hubungan route, state, pemuatan fitur dan pemilik modul saat ini |
| [Landing page](landing-page.md) | Catatan implementasi pengantar produk dan binding data; hasil bertanggal mengikuti revisi asal |
| [Optimasi performa](performance-optimization.md) | Arsip perubahan/measurement 13–14 Oktober; bukan ukuran build saat ini |

Untuk service boundaries dan kontrak HTTP, baca [arsitektur](../architecture/README.md). Untuk data generation gunakan [provenance/rebuild](../../data/real/README.md), agar input, output, lisensi dan hash tetap satu acuan.

- [Connected investigations](connected-investigations.md): evidence requests, dossier beku, decision receipts, verifier dan recovery.
