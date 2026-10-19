# P1: shared casework — 17 Oktober 2026

[Status aktif](../../release/current-implementation-status.md) · [Rencana P1](../../plans/2026-10-17-six-package-completion.md#4-p1--kolaborasi-dan-penyimpanan-bersama) · [Runbook](../../development/shared-casework.md)

**Hasil: verified untuk implementasi dan integrasi lokal.** Satu tim kecil memakai satu Bun/Hono API writer dan file privat. Tidak ada deployment, enrollment manusia nyata, publikasi, transaksi atau panggilan provider eksternal. P2–P6 belum dikerjakan sebagai bagian increment ini.

Base HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` ditambah working tree yang sudah berisi perubahan pengguna. Tidak ada commit/push. [Manifest](manifest.json) dan [hash file](implementation-files.sha256) mengidentifikasi sumber aktif yang diperiksa; HEAD saja tidak mencakupnya. Evidence historis dipertahankan.

## Hasil terhadap kriteria P1

| Kriteria | Implementasi dan bukti |
|---|---|
| Kontrak investigasi | Shared schemas: context/snapshot/archive, work ID, fixed claim/scope, expected revision, owner, actor, assignee, due date, status/next action dan immutable history. Aktor/waktu ditentukan server; actor spoof ditolak. |
| Matriks akses | Signed `private_read` untuk baca; kedua scope `private_read,review` untuk tulis. Current `operator_attested` per claim wajib pada P1 tanpa bergantung flag compatibility. Test menolak expired token, legacy token, token tanpa scope, unenrolled/foreign claim, expired directory dan revoked member; private responses `no-store`. |
| Konflik | Dua permintaan pada expected revision sama menghasilkan satu save dan satu `409`. Dua browser context mempertahankan draft penulis kedua, meninjau revisi terbaru, menyalin field yang ingin disimpan dan melakukan rebase eksplisit. History memuat aktor/revisi 1–3. |
| Satu writer | Queue write dalam proses dan kernel `flock` untuk masa hidup API. Actual second writer ditolak exit `73`; backup/restore juga ditolak saat lock aktif. Bootstrap memerlukan launcher. |
| Import lama | Browser-local v1/v2 tetap dapat dibaca. Browser test menjalankan preview lalu create ID baru; notes lokal tetap ada setelah import dan reload. Tidak ada overwrite server atau upload otomatis. |
| Lintas sesi dan restart | Dua identity DEMO membaca/melanjutkan work yang sama, assignee/due date tersimpan, Cases memakai antrean tim dan filter, reconnect membaca kembali notes. Actual API subprocess di-SIGKILL, restart pada state sama mempertahankan data melalui HTTP. |
| Pemulihan | File invalid/schema history forged/permission terbuka ditolak. Injected ENOSPC dan pencabutan auth sebelum commit tidak mengakui write. Marker menolak state hilang setelah ACK, termasuk reopen proses, hingga restore. CLI memvalidasi backup, menolak overwrite, menyimpan copy sebelum-restore dan tidak mengubah audit. Kapasitas revisi penuh mempertahankan seluruh histori. |
| UI saat gagal | Intercepted `503` pada refresh mengosongkan queue, menyembunyikan history lama dan menonaktifkan save. Draft tab tetap ada, refresh berikutnya memulihkan akses tanpa kehilangan draft. Desktop/mobile diperiksa; token tidak terdapat di localStorage/sessionStorage. |

## Pemeriksaan aktual

| Command / pemeriksaan | Hasil akhir |
|---|---|
| `bun run check:all` | Exit 0, seluruh tahap berikut lulus |
| Frozen install | Tidak ada dependency/lockfile berubah |
| TypeScript | API, web, E2E dan operations scripts lulus |
| API | **138 passed**, 25 files, 826 assertions |
| Web | **234 passed**, 48 files, 164.923 assertions |
| Verifier/tooling | **34 passed**, 6 files, 142 assertions |
| Build/bundle | Lulus; App **74.537 gzip bytes < 75.000**, 8 required route chunks, MapPanel lazy 1.122.953 raw bytes |
| Python | **160 passed** dengan project Python 3.12.13 |
| Rules conformance | 15 expected/predicted labels cocok (9 casebook nyata + 6 DEMO); [output](baseline-conformance.json). Bukan benchmark AI atau akurasi lapangan. |
| Foundry | **4 passed**, 0 failed/skipped; lokal, tanpa transaksi jaringan |
| `bun run test:case-work-operations` | **2 passed**, 17 assertions; CLI backup/restore/lock serta actual API crash/restart lokal |
| `bun test scripts/evidence-transport.test.ts` | **1 passed**, 10 assertions; actual HTTPS/TLS fixture lokal, tanpa fetch publisher nyata |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` | **13 main + 5 private/manual/shared/mock-AI = 18 passed**, satu invocation lengkap; sekitar 1,6 + 1,1 menit per phase |
| Runner helpers | 3 passed, 6 assertions; focused repeats bukan skenario baru |
| Review dan pemeriksaan docs | Review statis independen, visual captures, local-link/fence consistency, source hashes dan `git diff --check`; lihat batas di bawah |

Jumlah 138 + 234 + 34 + 160 + 4 + 2 + 1 = **573 tes non-browser** pada suite yang dirinci. Tiga runner helper terpisah dari jumlah ini. Hasil focused repeats tidak dijumlahkan lagi.

Runtime aktual: Bun **1.4.3** (pin repo tetap 1.4.2), Node 24.18.0, Chromium 153.0.8010.52 dengan sandbox aktif, util-linux `flock` 2.42.4, `uv` 0.13.0 dan Forge 1.8.5. Python `check:all` memakai interpreter proyek 3.12.13, bukan default shell host. Advisory MapPanel >500 kB dan anotasi komentar Zod tetap muncul; build serta compressed budget lulus. Tidak ada dependency baru.

## Regresi dan review

Implementasi mengikuti tes kegagalan terlebih dahulu: route/store belum ada, launcher/maintenance belum ada, dan tombol shared belum ada menghasilkan red yang sesuai. Regresi client juga membuktikan response JSON yang terlambat setelah pergantian sesi ditolak.

Reviewer read-only menemukan dua masalah material: ENOENT dapat mereset state yang pernah diakui, dan refresh gagal masih menampilkan data queue lama. Tes baru mereproduksi keduanya sebelum fix. Perbaikan menambahkan marker durabel dan memisahkan ketersediaan server dari draft editor. Review ulang menutup dua temuan; sisa tampilan data selama pending refresh juga ditutup dengan clear queue saat mulai dan gate comparison pada render. Review tambahan menemukan response history otomatis yang terlambat dapat menimpa history hasil review manual terbaru. Browser regression menahan seluruh response lama (termasuk effect StrictMode), mereproduksi rollback tampilan revisi 2 → 1, lalu lulus setelah satu request generation dipakai oleh pembacaan otomatis/manual dan diinvalidasi saat save. Full suite terakhir dijalankan setelah perbaikan. Review ini menilai implementasi, bukan review pakar methane atau hasil pilot.

Kegagalan lingkungan awal dicatat terpisah: managed Chromium tidak terpasang; installed Chromium memerlukan izin socket di luar workspace sandbox. Tes kemudian memakai `/usr/bin/chromium` dengan **sandbox Chromium tetap aktif** dan izin eksekusi lokal yang disetujui. Uji runtime awal juga gagal menjangkau loopback akibat proxy induk; runner operations kini memakai allowlist environment dan dotenv dimatikan, lalu lulus. Tidak ada assertion yang dihapus untuk menutupi kegagalan tersebut.

## Captures

- [History desktop](shared-casework-history-desktop.png): revisi 1–3, aktor DEMO dan handoff assignee/due date.
- [Workspace mobile](shared-casework-mobile.png): viewport 390×844, capture seluruh panel; vertical scrolling tersedia dan tidak ada horizontal overflow pada page.
- Keduanya berasal dari full browser run akhir dan diperiksa visual. Notes serta identity adalah fixture **DEMO**, terikat source metadata historis `KAZ_S_159`; tidak menunjukkan enrollment atau temuan lapangan nyata. Token hanya berada di memori dan tidak tampil pada captures.

API/browser/maintenance memakai state sementara, tidak memakai file audit development. Provider pada phase AI adalah mock deterministik di loopback. Raw trace/log tidak disalin karena dapat membawa token tes atau detail privat. Manifest hanya menyimpan hash kode/config publik, dataset bawaan, dan artefak aman; tidak memuat `.env`, state runtime, directory privat atau secret.

## Batas yang tetap berlaku

- Satu proyek, satu Linux API writer kooperatif pada filesystem lokal. Bukan multi-instance, multi-tenant atau layanan dengan SLA. Lock dapat dilanggar operator OS yang melewati launcher.
- File state dan draft tidak terenkripsi. Anggota dengan claim authority yang sama dapat membaca catatan kategori tersebut; assignment bukan akses per record.
- Fsync dan process-crash recovery diuji lokal. Actual full-disk exhaustion, power cut, filesystem jaringan, host/tunnel/origin remote, volume replacement, backup off-host dan restore pada remote target **belum diuji**. ENOSPC diuji melalui injeksi kegagalan write.
- Marker mencegah silent reset ketika state hilang namun volume/marker masih ada. Hilangnya seluruh volume beserta marker tetap perlu persistent volume dan backup terpisah.
- Respons hilang setelah commit bisa meninggalkan versi yang sudah tersimpan; baca/compare sebelum retry. Tidak ada automatic retry, realtime polling atau field merge otomatis.
- Batas 500 work, 100 revisi/work dan 16 MiB file menolak write setelah penuh; belum ada archival/pruning UI. Snapshot yang berbeda tetap namespace berbeda.
- P1 tidak menambahkan anchor intent, withdrawal publik, hasil review pakar, sesi pengguna atau benchmark provider nyata. Penilaian/feedback/hash tidak membuktikan repair, zero emissions atau dampak iklim.

## Reproduksi

```bash
bun run check:all
bun run test:case-work-operations
bun test scripts/evidence-transport.test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
sha256sum -c docs/evidence/shared-casework-2026-10-17/implementation-files.sha256
git diff --check
```

Gunakan [runbook](../../development/shared-casework.md) untuk akses dan maintenance. Installer/browser download tidak dilakukan otomatis oleh command E2E; toolchain, Linux `flock`, local socket dan browser harus tersedia.
