# Simulasi peran agent untuk tiga integrasi

**18 Oktober 2026 — cakupan simulasi engineering selesai.** Provider AI eksternal, hosting publik dan receipt Sepolia belum diverifikasi. Seluruh request provider pada paket ini menuju fixture HTTPS lokal; seluruh transaksi menuju Anvil 31337.

## Siapa mengerjakan apa

Tiga agent pendamping dipakai di bawah koordinasi root: dua `gpt-6-luna` untuk perancangan/pelaksanaan provider dan operator/chain, serta satu `gpt-6-sol` untuk review kritis. Mereka memainkan tujuh peran: analis, peninjau skeptis, provider bermasalah, pengunjung tanpa hak, operator layanan, issuer dan verifier. Jumlah peran bukan jumlah manusia/pakar atau penilaian independen atas kebenaran methane. [Penugasan](role-roster.json) dan [rencana](../../plans/2026-10-18-integration-role-simulation.md) mencatat batasnya.

## Hasil yang benar-benar dijalankan

| Bagian | Hasil | Batas |
|---|---|---|
| Provider → API | [13 skenario](provider.json), satu integration test/116 assertions; TLS nyata ke fixture, dua pass, kutipan palsu, HTTP 429/503, redirect, JSON/schema rusak, ukuran berlebih dan stalled body **40.198 ms** | Respons model ditentukan fixture; tidak ada panggilan/model eksternal atau benchmark kualitas |
| Profil deployment lokal | API memakai `NODE_ENV=production`, access/consent/rights, CORS, mode file privat 0600 dan SIGKILL/restart; [empat pemeriksaan HTTP production preview](preview.json) mencocokkan HTML, entry JS dan manifest dengan bytes build | API dan preview diperiksa terpisah; bukan browser rendering, public DNS/TLS, reverse proxy, cloud volume atau target Render |
| Chain | [Satu integration test Anvil](chain.json), termasuk RPC menerima tx lalu mengganti acknowledgment dengan 502; retry 409, pending tetap durabel, hash sama direkonsiliasi dan hanya satu nonce dipakai | Chain 31337 disposable; tidak menghasilkan receipt Sepolia atau explorer publik |
| Operasi state | [Dua tes casework](logs/case-work.log) dan [satu tes publikasi](logs/publication.log): backup/restore, writer lock dan process crash/restart | Satu writer, file dan volume lokal yang sama; tidak membuktikan persistence hosting |
| Pemeriksaan terkait | [34 tes terfokus](logs/focused-unit.log), [typecheck](logs/typecheck.log), [production build](logs/build.log), [bundle gate](logs/bundle.log) exit 0; App 71.689 gzip bytes | Bukan pengulangan seluruh 708 tes atau seluruh browser E2E dari paket P5/P6 |

Log final tersedia di [provider](logs/provider.log) dan [chain](logs/chain.log); laporan agent ada di [provider](provider-agent-review.json), [operator/chain](operator-agent-review.json) dan [review akhir](review.md). Total command test yang dicatat pada increment ini adalah 39 tes: 34 focused + satu provider + satu chain + dua casework + satu publication. Tiga belas skenario provider adalah subkasus dalam **satu** integration test.

## Temuan dan perubahan

1. Panduan deployment yang masih menyebut file store tidak mempunyai anchor intent diperbaiki agar sesuai implementasi P2.
2. Ditambahkan regresi RPC yang gagal sesudah penerimaan transaksi. Cabang ini membuka ulang store/app dalam proses test yang sama; cabang SIGKILL terpisah menggunakan child process. Verifier CLI berjalan sebagai proses lain, memakai implementasi verifier dan node lokal yang sama.
3. Ditambahkan runner provider yang menyaring environment, memakai sertifikat sementara dan data/token DEMO. Review memperkuat pemeriksaan payload pass kedua dan alasan penolakan anchor. Dua kekeliruan fixture awal dan helper preview dicatat dalam [findings](findings.md), bukan ditutup sebagai keberhasilan aplikasi.

**Batas yang sengaja diperlihatkan:** dua pass provider dapat sama-sama keliru walau kutipan cocok persis. Fixture seperti itu menghasilkan `supported` sebagai **AI suggestion/unreviewed**, tetap privat, physical verification `not_established_by_application`, serta anchor ditolak dengan alasan review manusia. Ini menguji batas produk; tidak membuktikan prompt injection sudah diatasi secara semantik. Nilai `modelVersion` merupakan alias konfigurasi, bukan identitas versi model yang diverifikasi dari provider.

## Jalankan ulang

Dari root repository dengan dependency/toolchain yang sudah terpasang:

```bash
bun run test:integration-roles --evidence /tmp/NEW-provider.json
bun run test:chain-integration --evidence /tmp/NEW-chain.json
bun run test:case-work-operations
bun run test:publication-operations
bun run check
bun run build:web
bun run check:web-bundle
bun --no-env-file docs/evidence/integration-role-simulation-2026-10-18/production-preview-smoke.ts /tmp/NEW-preview.json
```

Pilih path output yang belum ada. Runner tidak memuat `.env` dan tidak meneruskan kredensial provider/signer/state operator. Helper preview menyaring proxy untuk fetch loopback dan memakai environment kosong untuk Vite config. Run final memakai PID API langsung, memastikan health berhenti setelah SIGKILL dan menunggu proses miliknya selesai. Provider test memerlukan sekitar 40 detik untuk menguji deadline sebenarnya.

## Status tiga target eksternal

| Target asli | Yang masih diperlukan |
|---|---|
| Provider AI eksternal | Provider/credential server yang sah, izin/cap biaya dan input berizin; jalankan provider yang sebenarnya. Kelayakan model tetap mengikuti P6; tes protokol tidak mengubah keputusan aktivasi |
| Deployment publik | Akun/target hosting yang disetujui, HTTPS/origin, akses, `flock`, volume privat durable dan recovery pada target itu; frontend/API harus diperiksa end to end pada URL publik |
| Receipt Sepolia | Funding test ETH pada issuer yang disetujui, deploy registry, anchor dan verifikasi receipt jaringan publik; persetujuan operasi P2 terdahulu tetap berlaku, faucet lama tidak diulang |

Tidak ada kredensial diubah, funding dibeli, pesan eksternal dikirim, deployment publik atau transaksi Sepolia pada increment ini. [Manifest](manifest.json) dan [checksum](checksums.sha256) mengikat hasil dengan sumber. Paket historis P1–P6 tetap dipertahankan; receipt/hash mengikat integritas dan urutan versi, bukan repair atau penurunan emisi fisik.
