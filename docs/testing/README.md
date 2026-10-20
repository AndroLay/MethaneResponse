# Pengujian dan bukti

[Pusat dokumentasi](../README.md) · [Setup lokal](../development/local-setup.md) · [Bukti bertanggal](../evidence/README.md)

Semua command dijalankan dari root. Gunakan pemeriksaan yang sesuai perubahan; tabel ini menjelaskan cara menguji, bukan menyatakan semua command dijalankan pada setiap revisi dokumentasi.

## Matriks command

| Command | Yang diperiksa | Prasyarat/batas |
|---|---|---|
| `bun run check` | TypeScript API, web dan E2E | Bun dependencies; bukan runtime/browser test |
| `bun run test:api` | Route, baseline, private access, trust, revisi dan store | File/in-memory fixtures lokal; tanpa database |
| `bun run test:web` | Komponen dan logika browser/workflow/verifier | Bukan pengukuran rendering perangkat fisik |
| `bun run test:case-work-operations` | CLI backup/restore, writer lock, crash/restart API dan state bersama lewat HTTP | Linux `flock`, socket lokal, fixture privat disposable; environment induk disaring |
| `bun run test:publication-operations` | Lifecycle publikasi durabel melalui HTTP, SIGKILL dan restart API | Loopback, DEMO, satu writer; bukan publikasi remote |
| `bun run test:integration-roles` | 13 skenario peran pada provider HTTPS fixture → API production lokal: consent/access, payload per pass, kegagalan, 40s deadline, privasi dan restart | OpenSSL/socket lokal; satu integration test, bukan model/provider eksternal atau deployment publik |
| `bun run test:verifier` | Report verifier, AI benchmark tooling, freeze inputs, deployment/config, map helpers dan local gate guards | Bukan live AI/provider benchmark |
| `bun run test:e2e` | Perjalanan Chromium dengan API dan build production/preview Vite terisolasi, termasuk manual dan mock-AI | Browser dan izin proses/port lokal; build ulang per phase; detail di [E2E](end-to-end.md) |
| `bun test scripts/evidence-transport.test.ts` | Transport HTTPS/TLS nyata pada fixture loopback | OpenSSL dan local socket; tidak mengambil laporan publisher eksternal |
| `bun run test:data` | Pipeline/import/intelligence/evaluasi Python | Python 3.11+, `uv`, locked research extras |
| `bun run evaluate:baseline` | Conformance evaluator rules | Dataset kecil; bukan akurasi umum/benchmark independen |
| `bun run test:contracts` | Invariant/perilaku EvidenceRegistry | Foundry; tidak membuat transaksi jaringan publik |
| `bun run build:web` | TypeScript/build Vite dan pruning aset yang belum diizinkan | Tidak menjalankan API/deploy |
| `bun run check:web-bundle` | Gzip budget entry, lazy map dan route chunks | Jalankan setelah build |
| `bun run check:all` | Install/check, API/web/verifier, build/bundle, Python, baseline dan Foundry | Seluruh toolchain; **E2E, casework/publication operations, chain integration dan transport TLS terpisah** |
| `bun run test:chain-integration` | Anvil loopback 31337, SIGKILL sebelum/sesudah broadcast, revert, revision dan verifier terpisah | Forge/Anvil, socket lokal; environment terisolasi; **bukan Sepolia publik** |
| `bun run verify:audit path/to/report.json --require-context` | Bundle dan checksum konteks export aplikasi | Tanpa flag untuk raw audit legacy; checksum unsigned, bukan autentikasi issuer/fakta fisik |
| `bun run measure:map-performance` | Pengukuran browser/perangkat yang dikonfigurasi | Baca opsi script dan catat GPU, network, revision, viewport serta kondisi tiles |
| `bun run verify:plan history.json --expected-head 0xTRUSTED_SHA256` | Rantai revisi reviewer, full policy replay dan kecocokan head plan journal | Digest harus diperoleh terpisah; bukan tanda tangan identitas, status kini atau receipt chain |
| `bun run verify:investigation dossier.json --expected-digest 0xTRUSTED_SHA256` | Riwayat investigasi, exact plan revision, snapshot/assessment relations dan canonical dossier digest | Ekspor privat ≤16 MiB; digest tepercaya terpisah; bukan autentikasi referensi |
| `bun run verify:investigation-decision decision.json --expected-digest 0xTRUSTED_SHA256 --require-chain` | Keputusan beku, dossier, hash, event/issuer/version dan current registry head | Receipt dan read-only RPC yang dikonfigurasi wajib dengan flag; tanpa flag integritas lokal tetap tidak membuktikan repair |
| `bun run prove:operations --output NEW_DIRECTORY` | Real snapshot 10→20, FilePlanStore reopen dan enam pemanggilan CLI/tamper | Direktori baru; reviewer software DEMO, satu snapshot, tanpa provider AI atau chain |
| `bun run prove:snapshot-transition --output NEW_DIRECTORY` | Full diff dua snapshot nyata, kapasitas 10/20, delapan proses CLI termasuk edited+rehash, dan oracle Python terpisah | Kedua gzip + manifest terpin; bukan monitoring live atau akurasi fisik |
| `bun run verify:snapshot-transition REPORT --before OLD.gz --after NEW.gz --expected-before SHA --expected-after SHA --expected-report 0xSHA` | Hash input, report digest dan full deterministic replay dari kedua input asli | Expected hashes harus diperoleh terpisah; bukan autentikasi penerbit |
| `bun run build:snapshot-transition --before OLD.gz --after NEW.gz --expected-before SHA --expected-after SHA --output NEW_DIRECTORY` | Membuat report/manifest offline dengan input hashes eksplisit | Menolak direktori yang sudah ada; promosi input aktif tetap langkah terpisah |

`check:all` memakai output baseline sementara dan menolak menimpa path report eksplisit yang sudah ada. Data, audit dan hasil evaluasi lama tidak perlu dihapus agar pemeriksaan bisa dijalankan. `test:integration-roles` dijalankan terpisah seperti operasi casework/publication dan chain.

## Pilih berdasarkan perubahan

Tambahan P2: `bun run verify:evidence-overlap REPORT --expected-digest 0xSHA`
menjalankan ulang relasi input terbatas; `bun run stage:snapshot` menyiapkan dua
input dan full diff tanpa aktivasi. Tes downloader dan source packager:
`python3 -m unittest discover -s scripts -p 'test_*.py'`.
[Panduan, input bounds dan arti hasil](../development/evidence-overlap-and-snapshot-intake.md).

- **Dokumentasi saja:** periksa path/anchor, navigasi indeks, command/env terhadap source, code fences, whitespace, serta pelestarian evidence.
- **Shared contract/claim/scope:** typecheck, API/web tests yang relevan, verifier, dan E2E jika alur pengguna terpengaruh.
- **Privasi/trust/review:** API/web regressions dan jalur private/manual browser; batas akses perlu diperiksa selain happy path.
- **Pipeline/data:** Python suite dan reproducibility sesuai input/provenance; periksa binding output ke API/browser.
- **Peta/performa:** build/bundle dan browser pada kondisi yang dicatat; viewport mobile tidak menggantikan telepon fisik.
- **Kontrak/receipt:** Foundry serta verifier/chain integration yang relevan; transaksi eksternal memerlukan otorisasi terpisah.

## Hasil yang tersedia

[Status implementasi](../release/current-implementation-status.md) merangkum hasil terakhir; [indeks evidence](../evidence/README.md) menyimpan detail run. Jangan menjumlahkan ulang focused repeats atau menganggap suite historis dijalankan ulang pada docs-only change.

[Protokol anotasi AI](ai-benchmark-annotation.md) mengatur label independen, source separation dan citation/abstention scoring. [Protokol pilot pengguna](../evidence/target-user-pilot-protocol.md) adalah rancangan studi, belum hasil. Mock provider memeriksa integrasi software; checksum memeriksa isi yang di-hash. Keduanya tidak membuktikan repair atau dampak iklim.

[P5/P6 melalui agent selesai](../evidence/p5-p6-agent-completion-2026-10-18/README.md): hasil manual/app berpasangan, challenge metadata authored, perbandingan rules/agent serta replay grounding dan analisis. [Paket awal](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md) menyediakan task pack, analyzer privat dan runbook provider. `bun run check:evaluation` memeriksa tipe freeze/runner/reproducer/diagnostic dan tesnya; tercakup `bun run check`. Tes Python pilot, evaluator, `test_agent_metadata_diagnostic.py` dan `test_agent_diagnostic_bindings.py` tercakup gate data. Semua fixture tes adalah pemeriksaan software, bukan data peserta/gold independen; hasil P6 agent tidak menunjukkan manfaat tambahan AI pada challenge tersebut.

Untuk pemeriksaan jaringan yang wajib berhasil, gunakan `bun run verify:audit path/to/report.json --require-chain`. [Runbook P2](../development/blockchain-recovery.md) menjelaskan pending, konfirmasi, reorg dan batas backup.

[Simulasi peran integrasi](../evidence/integration-role-simulation-2026-10-18/README.md) menambahkan bukti TLS nyata dengan provider deterministik, profil API production dan penyajian build lokal, serta acknowledgment RPC yang hilang sesudah transaksi diterima Anvil. Semua gerbang provider eksternal/hosting publik/Sepolia tetap terpisah.

## Review metode oleh manusia

[Protokol P4](domain-expert-review.md) dan [paket siap kirim](../evidence/domain-review-preparation-2026-10-18/README.md) memisahkan persiapan/tes implementasi dari penilaian pakar domain. Hasil pakar belum tersedia.


## Penguatan manfaat produk — 18 Oktober 2026

[Paket hasil](../evidence/product-value-2026-10-18/README.md) mencatat regresi scope/draft, verifier ketat di Reports dan 16 sel perbandingan fungsional beku. `bun test scripts/product-value-evaluation.test.ts` memeriksa denominator/missing/duplicate scorer. Untuk replay baru gunakan `bun run evaluate:product-value prepare /tmp/NEW_DIRECTORY`, `run` lalu `analyze` setelah menyediakan hasil baseline terpisah; jangan menimpa paket bukti beku. Browser fokus: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep "scope presets|unsaved work|historical MARS case|analyst case work resumes"`. Chromium sandbox tetap aktif.
