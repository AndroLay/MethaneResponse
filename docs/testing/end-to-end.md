# Pengujian browser E2E

[Pengujian](README.md) · [Setup lokal](../development/local-setup.md) · [Bukti run](../evidence/README.md)

Runner [scripts/run-e2e.sh](../../scripts/run-e2e.sh) mengoordinasikan dua proses Playwright terisolasi: main workflow dan private/manual/mock-AI workflow. Gunakan dari root repo:

```bash
bun install --frozen-lockfile
bun run check
bun run playwright install chromium
bun run test:e2e
```

Instalasi Chromium diperlukan sekali jika managed browser belum tersedia. Pada host yang mempunyai Chromium, executable dapat dipilih tanpa download:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
```

Path executable harus benar pada host yang dipakai; contoh bukan pernyataan browser tersebut selalu terpasang.

## Menjalankan satu phase

```bash
bun run test:e2e -- e2e/audit-workflow.spec.ts
bun run test:e2e -- e2e/ai-review-workflow.spec.ts
```

Runner meneruskan file ke phase yang sesuai. Masing-masing phase menjalankan regression checks untuk filter environment/argument routing sebelum browser. Focused repeat tidak dihitung sebagai skenario baru pada ringkasan coverage.

## Isolasi runtime

- API dan preview Vite khusus berjalan di loopback, dengan file audit serta direktori environment Vite sementara. Setiap phase memaksa `NODE_ENV=production` untuk membangun ulang frontend production sebelum membuka browser, sehingga aset yang diperiksa sesuai source saat run. Server development milik pengguna tidak digunakan ulang. Build memperbarui `apps/web/dist/`; jalankan phase secara berurutan.
- Coordinator, workers dan subprocess menerima allowlist environment eksplisit; Bun dotenv autoload dimatikan. Credential dari environment pemanggil tidak diwariskan.
- Phase private/manual/mock-AI memakai token tes berumur pendek yang dibuat runner; provider deterministik juga berada di loopback.
- API memakai launcher dengan kernel writer lock. Chromium sandbox tetap aktif lokal dan pada CI yang tidak dikenal; exception hanya berlaku bila `CI=true`, `GITHUB_ACTIONS=true` dan `RUNNER_ENVIRONMENT=github-hosted` sekaligus. Host lokal harus mengizinkan sandbox browser serta socket lokal.
- Workers memastikan credential pemanggil dan `VITE_*` tidak ikut masuk. Request HTTP eksternal, termasuk tile/imagery, diblokir.
- Software WebGL dipakai untuk pemeriksaan alur. Hasil ini tidak mengukur GPU/perangkat fisik atau kualitas imagery live.
- Jika kuota `/tmp` host habis dan `/dev/shm` dapat ditulis, runner mempunyai fallback temporary cache/store di sana. Data audit development tidak dipakai sebagai fixture.

## Cakupan perjalanan

| Phase | Yang diperiksa |
|---|---|
| Main historical workflow | Snapshot/source historis, navigasi map/case/auditor, publisher indicators, baseline, history/report, checksum/tamper detection dan interaksi responsive/keyboard yang didefinisikan spec |
| Investigation planner | Empat alokasi pada batas yang sama, replay/export, pagination dan kuota tak terpenuhi, pembatalan respons lama, error/retry serta handoff source ID yang membersihkan filter tersembunyi dan menghormati draft |
| Investigation operations | Exact ordered queue 10→20, handoff ring peta/auditor, delayed activation strategy guard, scope restore, expected digest untuk impor dan perbandingan parameter/snapshot |
| Snapshot Change Watch | Dua rilis nyata, tiga selected source IDs terdampak, original field values, unduhan diff lengkap, halaman sumber disjoint, evidence handoff, stale strategy response dan explicit error/retry; capture desktop/mobile dengan batas lebar panel |
| Plan reviewer history | Signed memory-only access, append/export/replay, konflik CAS yang mempertahankan draft, load latest eksplisit, serta recovery draft terpisah menurut reviewer; keputusan memakai fixture DEMO |
| Connected investigation | Accepted allocation → exact source/scope → evidence request → authorized response with month precision → human assessment → immutable decision → new-response revisit; separate digest, private cross-origin header, desktop/mobile layout dan stale response guard |
| Private/manual workflow | Scope, human determination tanpa AI, private access, revised assessment, browser work/draft continuity, trust controls dan redacted public summary sesuai spec |
| Shared team workflow | Dua browser context terpisah, signed reviewer per anggota, preview/import tanpa menghapus notes lokal, assignee/due date, konflik CAS, compare/rebase eksplisit, penolakan response history lama setelah review terbaru, Cases queue, reconnect dan draft retained saat refresh gagal |
| Public publication lifecycle | Koreksi/penarikan, consent ulang, keyboard/cancel, reload/503, history pagination, parent manusia setelah baseline, dan daftar terbaru setelah koreksi bersamaan |
| Mock document AI | Authorized synthetic excerpt, exact quote forwarding, skeptical provider pass, abstention, review revision, privacy dan exported bundle digest |

Spec dan assertions merupakan acuan coverage yang tepat; jumlah skenario dapat berubah. [Status aktif](../release/current-implementation-status.md) merujuk run terakhir yang dicatat, sedangkan evidence mencatat run gagal/rerun, snapshot, working tree dan batasnya.

Contoh baseline memakai real source `KAZ_S_159` pada snapshot `unep-mars-675417694883`. Data bawaan tidak membuktikan mitigasi; laporan yang diubah harus ditolak verifier. Mock-AI excerpt diberi label sintetis dan tidak menjadi bukti untuk sumber nyata. Tidak ada excerpt tes yang dikirim ke provider eksternal.

## Batas hasil

Kelulusan membuktikan perilaku software pada lingkungan tes. Ia tidak mengukur kualitas model nyata, mengautentikasi dokumen/reviewer nyata, membuktikan repair/zero emissions, menguji cloud durability, membuat transaksi Sepolia, atau memverifikasi tile publik. Tes transport TLS lokal terpisah dari E2E, sebagaimana dicatat di [matriks command](README.md).
