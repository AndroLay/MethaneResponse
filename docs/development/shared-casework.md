# Investigasi bersama: penggunaan dan pemulihan

[Pengembangan](README.md) · [API](../architecture/api-reference.md) · [Keputusan desain](../architecture/decisions/2026-10-17-shared-casework-single-writer.md)

P1 menyediakan satu workspace untuk tim kecil melalui satu proses API dan file privat. Catatan bersama terpisah dari bundle audit. Mengubah status kerja atau assignee tidak mengubah determination, mengirim notifikasi, maupun membuktikan tindakan lapangan. Implementasi dan pengujian di repo ini dilakukan **lokal**, bukan deployment remote.

## 1. Menyiapkan akses

1. Gunakan Linux dengan Bun dan `flock` dari util-linux. Launcher gagal bila lock tidak tersedia; proses kedua dengan path state yang sama ditolak. Semua penulis dan maintenance harus memakai launcher resmi.
2. Pilih **absolute `AUDIT_STORE_PATH`** pada direktori privat, writable, dan filesystem lokal yang mendukung rename/fsync/flock. Default tetap `data/state/audits.json`. Direktori yang sudah ada tidak otomatis diubah permission-nya; pemilik harus membatasi akses dan menjaga backup di luar volume utama.
3. Konfigurasikan `REVIEWER_AUTH_SECRET` dan `REVIEWER_DIRECTORY_PATH` di server privat, mengikuti [konfigurasi](configuration.md) dan [format direktori](../product/trust-and-transparency.md). Jangan meletakkan secret/directory di aset web.
4. Enroll setiap reviewer dengan claim types, expiry, dan operator attestation yang berlaku. `private_read` memberi baca; **`private_read,review`** memberi tulis. P1 selalu mewajibkan authority `operator_attested`, sekalipun `REQUIRE_ATTESTED_HUMAN_REVIEWERS` tidak diaktifkan. Legacy shared token dan admin token sendiri tidak memberi akses P1.
5. Terbitkan token berumur pendek menggunakan tool yang sudah tersedia, hanya di terminal privat. Jangan menyalin token ke log, dokumentasi, URL atau `VITE_*`. Identifier contoh bukan enrollment nyata.
6. Jalankan `bun run dev:api` dari root untuk development, atau `bun run start` dari `apps/api` tanpa hot reload. Launcher memegang lock sepanjang hidup API. Gunakan `/api/health` untuk memeriksa `caseWorkStorage.ready`; ini tidak membuktikan durability host remote.

| Berkas turunan dari path audit `A` | Isi |
|---|---|
| `A` | Audit JSON, frozen investigation decisions dan anchor intents; tidak dicakup maintenance casework |
| `A.case-work.json` | Semua investigasi bersama beserta riwayat immutable |
| `A.case-work.json.initialized` | Penanda durabel bahwa state pernah disimpan; jangan dihapus untuk melewati error |
| `A.writer.lock` | Lock stabil untuk API dan maintenance; jangan dihapus/rename saat dipakai |

File state/marker baru memakai izin `0600`; direktori baru `0700`. State atau marker berizin terlalu terbuka, symlink, schema rusak, serta hilangnya state yang sudah diinisialisasi menyebabkan kegagalan tertutup. File ditulis lewat temp privat, file fsync, rename dan directory fsync sebelum respons sukses. Jika respons hilang, server mungkin sudah menyimpan: baca versi terkini sebelum mengulang.

## 2. Melanjutkan pekerjaan tim

1. Pilih sumber dari snapshot yang cocok dengan API, claim dan periodenya. Di **Analyst case work**, pilih **Open shared workspace** dan masukkan signed reviewer token. UI memperlihatkan reviewer ID serta hak baca/tulis yang diberikan server.
2. Pilih **Shared investigations**, atau **New shared investigation**. Isi pertanyaan, status, next action, permintaan bukti, catatan, assignee dan due date. Assignee harus punya authority aktif untuk claim yang sama. Penetapan assignee tidak mengirim pesan atau membatasi akses ke assignee saja.
3. **Save shared work** mengirim expected revision. Owner dibuat dari subject token pada revisi pertama; setiap revisi mencatat penulis dan waktu server. Owner tetap, assignee boleh berubah. Claim/scope satu work ID tetap; buat investigasi baru untuk claim/scope berbeda.
4. Anggota kedua membuka origin API yang sama dengan token sendiri dan memilih investigasi tersebut. Gunakan **Refresh shared queue** untuk memuat perubahan; tidak ada realtime polling. Halaman Cases memakai antrean server selama sesi tim terhubung, dengan filter status dan **Assigned to me**.
5. Bila revisi berubah, save ditolak `409` dan draft dipertahankan. Pilih **Review latest revision**. Anda dapat memuat revisi terbaru, atau meninjau perbedaan, menyalin field baru yang perlu dipertahankan, mencentang konfirmasi, lalu **Keep my draft on this revision** dan menyimpan lagi. Ini menerapkan seluruh field draft, bukan merge otomatis. Konflik baru masih mungkin terjadi dan kembali ditolak.
6. Riwayat menampilkan setiap versi dan aktornya. Tautan assessment harus cocok dengan source/snapshot/claim/scope dan hash audit yang tersimpan. Catatan tidak menjadi bagian hash audit tersebut.

Queue, detail dan history hanya terbaca untuk claim yang masih diizinkan. Pemeriksaan direktori dilakukan lagi sebelum commit. Cabut akses dengan `disabled: true` atau expiry sesuai kebijakan direktori. Server tidak dapat menarik salinan yang sudah diunduh. Refresh yang gagal menonaktifkan save dan menyembunyikan antrean/history lama; draft tab tetap tersedia sampai refresh berhasil.

## 3. Memindahkan catatan browser dan memulihkan draft

- Mode browser-local v1/v2 tetap tersedia. Pilih investigasi lokal, buka shared workspace, lalu **Preview browser import**. Periksa isi sebelum **Import as new shared investigation**. Impor membuat ID baru; tidak menimpa investigasi server atau menghapus catatan lokal.
- Pilihan mode/import tidak mengunggah data browser otomatis. Bila respons impor tidak pasti, periksa antrean sebelum mencoba kembali. Impor ini bukan sinkronisasi dua arah.
- Token hanya di memori halaman dan dibersihkan saat disconnect/reload. Draft kotor disimpan per tab di sessionStorage dengan identity, source, snapshot dan work ID; token tidak disertakan. Reconnect dengan identity yang sama untuk memulihkan edit.
- Catatan dan recovery copy **tidak terenkripsi**. Pengguna browser yang sama dan script origin yang sama dapat membacanya; gunakan profil/perangkat tepercaya dan jangan menaruh credential atau isi laporan terbatas dalam notes. Sesi browser baru tidak otomatis memiliki recovery copy tab lama. Jika storage browser gagal, UI meminta pengguna menyalin pekerjaan penting.

## 4. Backup, restore, dan rollback

Hentikan API terlebih dahulu. Command maintenance memperoleh lock yang sama; bila writer masih aktif, command ditolak. Gunakan absolute path dan tujuan backup baru pada direktori privat. Command berikut memakai placeholder, bukan path data pengguna yang sudah dijalankan:

```bash
bun --no-env-file scripts/case-work-maintenance.ts backup /ABS/private/audits.json /ABS/private-backups/casework-2026-10-17.json
bun --no-env-file scripts/case-work-maintenance.ts restore /ABS/private/audits.json /ABS/private-backups/casework-2026-10-17.json --confirm-restore
```

Backup memvalidasi schema/riwayat, tidak menimpa tujuan yang sudah ada, dan menyalin bytes state persis dengan permission privat serta flush file/direktori. **Backup berisi catatan privat.** Copy ke penyimpanan terpisah mengikuti kebijakan tim; repo tidak mengunggahnya otomatis. Marker dibuat ulang oleh restore, sehingga backup JSON yang valid cukup untuk prosedur restore ini.

Restore memvalidasi backup, menyimpan bytes state saat ini sebagai `A.case-work.json.before-restore-<uuid>` bila ada, kemudian mengganti state secara atomik dan memastikan marker. Audit `A` dan dataset tidak diubah. Restore dapat mengembalikan antrean ke revisi backup dan kehilangan perubahan sesudahnya; tutup/reload sesi tim sebelum membuka API kembali. Simpan copy sebelum-restore untuk rekonsiliasi manual. Marker yang rusak perlu diperiksa operator dengan API berhenti; jangan menghapus marker untuk membuat state kosong.

Jika disk penuh/write gagal: jangan hapus file lama untuk memaksa save. Hentikan writer, pastikan ruang/permission, periksa backup, restore bila perlu, jalankan health, lalu baca riwayat dan lanjutkan dari revisi yang benar. Uji dulu pada salinan disposable. Rollback aplikasi dapat kembali ke mode browser-local setelah backup casework; data server tidak otomatis disalin ke browser.

## 5. Batas kapasitas dan jaminan

- Satu proyek, satu instance, satu penulis kooperatif pada filesystem lokal. Bukan multi-tenant, multi-region, database transactional atau jaminan ketersediaan produksi. Operator OS yang melewati launcher dapat melanggar jaminan lock.
- Maksimal 500 investigasi, 100 revisi per investigasi, 16 MiB file, dan 16 KiB request write. Kapasitas penuh ditolak; tidak ada auto-prune atau penghapusan histori.
- Marker mendeteksi kehilangan state setelah save, termasuk restart proses. Hilangnya **seluruh volume beserta marker** tidak dapat dibedakan dari instalasi baru; gunakan volume persisten dan backup terpisah sebelum menyatakan layanan remote durable.
- Token berbasis capability; attestation operator bukan verifikasi identitas atau kompetensi eksternal. Anggota dengan claim authority yang sama dapat membaca semua notes kategori itu.
- Gunakan HTTPS sebelum memasukkan credential ke origin remote. Origin/volume/backup remote belum diuji dalam P1 lokal ini.

## 6. Mengulangi pemeriksaan

```bash
bun run check
bun run test:api
bun run test:web
bun run test:case-work-operations
bun run test:verifier
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
bun run build:web
bun run check:web-bundle
```

Operations runner membersihkan dotenv/credential/proxy induk dan memakai fixture privat disposable. Ia menguji backup/restore, writer kedua, crash API, restart dan pembacaan ulang melalui HTTP lokal. Chromium harus tersedia dan host harus mengizinkan proses/port lokal. [Bukti P1](../evidence/shared-casework-2026-10-17/README.md) mencatat hasil aktual dan batasnya.

## Investigasi yang terhubung

Lihat [dossier, evidence requests dan frozen decisions](connected-investigations.md) untuk alur baru. Keputusan disimpan pada file audit (envelope 3), sehingga backup casework saja tidak cukup. Tetap gunakan satu writer dan simpan backup audit lengkap sebelum rollback kode.
