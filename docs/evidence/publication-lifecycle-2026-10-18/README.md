# P3 — koreksi dan penarikan ringkasan publik

[Status aktif](../../release/current-implementation-status.md) · [Rencana P3](../../plans/2026-10-17-six-package-completion.md#5-p3--koreksi-dan-penarikan-publikasi) · [Runbook](../../development/publication-lifecycle.md) · [ADR](../../architecture/decisions/2026-10-18-publication-lifecycle.md)

**Tanggal:** 18 Oktober 2026, WITA. **Status: verified lokal**, enam kriteria P3 terpenuhi. **Permukaan:** proses API, filesystem dan Chromium lokal disposable; tidak ada deployment atau publikasi eksternal. HEAD dasar `a82e2eee99bb79327f859f304f2f5d5939f07041` ditambah working tree yang terikat pada [manifest sumber](implementation-files.sha256), bukan commit publik baru. Bukti P1/P2 terdahulu dipertahankan.

## Hasil penerimaan

| Kriteria P3 | Perilaku dan bukti |
|---|---|
| Publish → correction → withdrawal | API memory/file menguji immutable hash, supersession, withdrawal dan pembacaan ulang. Proses HTTP nyata di-SIGKILL sesudah koreksi dan penarikan; restart mempertahankan status serta aktor privat |
| Catatan tambahan | Envelope versi 2 menyimpan audit/intent/event atomik. Aktor berasal dari server; alasan publik enum; bundle lama tidak diubah. Array/envelope versi 1 dimigrasikan, versi 2 yang kehilangan event ditolak |
| Versi terkini dan riwayat | Current memilih revisi publik terakhir per scope/claim sebelum pagination, termasuk withdrawal tombstone; history/direct URL tetap mengungkap status lama serta pengganti publik tanpa ID revisi privat |
| Consent dan privasi | Consent ulang per revisi, inspection tidak dipulihkan otomatis, private interposed revision tidak memengaruhi publik. Anonymous full schema 4 tetap 404; actor, private wording, rationale, recipient dan URL tidak disertakan |
| Digest dan status | Offline CLI menerima checksum summary historis dengan `publication_status: NOT_CHECKED`; menolak tamper/require-chain. UI memeriksa status live sebelum download dan menyediakan pemeriksaan summary impor |
| Reload, pagination dan kegagalan | Browser menguji history 11 revisi/dua halaman, reload, direct detail/verify, pembatalan/konfirmasi keyboard, failed refresh yang membuang daftar lama, parent manusia setelah baseline dan daftar terbaru setelah koreksi bersamaan |

Permintaan stale/concurrent hanya menerima satu mutasi; penarikan berulang `409`. Akses anonim/read-only, revoked/expired/out-of-authority dan direktori unavailable ditolak. Revocation diperiksa lagi di dalam antrean writer. Private human loader memeriksa scope/dataset/digest, mengunjungi pagination dan meminta konfirmasi sebelum mengganti draft.

## Pemeriksaan pada increment ini

| Command | Hasil |
|---|---|
| `bun --no-env-file run check:all` | Exit 0: TypeScript API/web/E2E; **164 API / 29 files / 975 assertions**, **240 web / 50 files / 164.951 assertions**, **36 verifier / 6 files / 150 assertions**, production build/bundle, **160 Python**, baseline conformance 15 kasus dan **4 Foundry** |
| `bun --no-env-file run check:e2e` | Typecheck ulang setelah penyesuaian selector browser, exit 0 |
| `bun run test:publication-operations` | **1 passed, 15 assertions**: actual HTTP API + SIGKILL/restart dua tahap |
| `bun run test:case-work-operations` | **2 passed, 17 assertions**: regresi P1 backup/restore/writer lock serta actual crash/restart |
| `bun run test:chain-integration` | **1 passed, 22 assertions**: Anvil 31337/kontrak nyata, crash/pending/revert, receipt latest/historical dan verifier proses terpisah |
| `bun --no-env-file test scripts/evidence-transport.test.ts` | **1 passed, 10 assertions**: fixture TLS loopback, IP/hostname/byte bound/redirect |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e` | Exit 0: **14 main + 9 private/manual/shared/mock-AI = 23 skenario passed**; empat skenario P3 baru termasuk. Tiga runner helper regressions/6 assertions juga lulus, focused repeat tidak dijumlahkan |

Frozen install tidak mengubah dependency/lockfile. App **74.957 gzip bytes**, budget 75.000; delapan required route chunks lulus. MapPanel tetap lazy, 1.122.953 raw bytes advisory. Sisa budget App hanya 43 bytes; ini pemeriksaan ukuran bundle, bukan benchmark performa perangkat.

Lingkungan: Bun 1.4.3 (pin repo tetap 1.4.2), Python proyek 3.12.13, Chromium 153 sandbox aktif, Forge/Anvil 1.8.5, Linux `flock`. Runner memakai environment allowlist dan menonaktifkan dotenv autoload. Credential tes berumur pendek dibuat lokal; tidak ada token/key atau state operasional yang disalin ke paket bukti.

## Iterasi dan review

- Tes lifecycle awal gagal karena status belum tersedia. Tes tambahan membuktikan migrasi consent lama, penolakan event hilang, parent manusia setelah baseline, revocation saat antrean, dan dua publikasi aktif; semuanya diperbaiki dan lulus pada suite akhir.
- Dua tes private history loader ditulis lebih dahulu dan gagal karena modul belum ada; setelah implementasi keduanya lulus.
- Browser awal membutuhkan navigasi ulang ke dataset DEMO sesudah reload. Pengujian loader kemudian menemukan fixture claim berbeda dari pilihan default UI; selector claim diperjelas. Keduanya merupakan koreksi skenario tes, tidak diabaikan sebagai kelulusan.
- Review agent independen hanya membaca kode. Temuan parent manusia terhalang baseline, authorization tidak diperiksa dalam antrean dan store menerima dua current publications ditutup dengan regresi. Temuan UI pemuatan parent serta reload daftar sesudah withdrawal juga diperbaiki. Rereview tidak menemukan temuan konsekuensial tambahan pada scope tersebut. Review ini bukan review pakar methane atau sertifikasi keamanan.

## Artefak dan batas

[Manifest run](manifest.json), [binding sumber](implementation-files.sha256), [conformance baseline](baseline-conformance.json), [pemeriksaan path dokumentasi](documentation-path-check.json) dan [checksum paket](checksums.sha256) disertakan. [Desktop](DEMO-publication-desktop.png) · [mobile](DEMO-publication-mobile.png). Screenshot DEMO desktop/mobile diperiksa secara visual; credential sudah dibersihkan. Viewport ponsel bukan perangkat fisik. Trace browser yang dapat berisi credential tidak disalin.

P3 tidak menghapus salinan unduhan atau blockchain, tidak menandatangani kronologi server, tidak mengautentikasi dokumen fisik dan tidak membuktikan repair/pengurangan emisi. Satu writer lokal dan disk persisten tetap asumsi. Pagination lintas request memerlukan refresh bila ada perubahan. Binary P2 lama tidak dapat membaca envelope versi 2; roll-forward dan backup lengkap diperlukan. Tidak ada restore backup lama atau perubahan state operasional pada run ini.

P2 testing lokal tetap terverifikasi; deployment/receipt Sepolia publik belum tersedia. P4 review pakar, P5 pilot dan P6 benchmark AI nyata belum ditutup oleh pekerjaan P3.
