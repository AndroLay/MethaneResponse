# R12 blocker follow-up — 21 Oktober 2026

**Lingkup:** perbaikan tooling dan proof software lokal setelah recovery. Bukan
48 episode baru, studi manusia, benchmark model baru, video atau layanan publik.
Pengguna mengonfirmasi: **tetap validasi dan paket produksi dahulu**.

## 1. Status blocker

| Item | Hasil aktual | Konsekuensi produksi |
|---|---|---|
| Runner kehilangan jejak tanpa submit | Jalur runner → MCP → Chromium diuji dengan client terprogram: submit berhasil; interrupt exit7 tetap FAILED dengan metadata satu read_page; output yang melanggar kontrak ditolak tanpa mengganti jawaban | Diagnostik dan transport teruji; tidak menyatakan P8 agent akan berhasil |
| Tugas dinilai atas field/operasi yang tidak tersedia | Kontrak opt-in `agent-task-contract/13` mengiklankan schema JSON; preflight menolak field penilaian tersembunyi, operasi yang tidak tersedia, seed/digest/reviewer yang belum disiapkan sebelum provider dimulai | Hanya untuk trial baru. Tidak mengubah protocol/gold/scorer/hasil r12 |
| Verifier tidak tersedia melalui tool T3 | `verify_export` memeriksa satu ekspor terhadap pin operator; tersedia hanya bila fixture T3 dikonfigurasi eksplisit | Read-only, tanpa pilihan file/digest oleh agent, tanpa shell/RPC/provider. Bukan pemberian hak review atau mutasi kepada manual condition |
| Bukti blockchain hanya milik KAZ | **Diselesaikan untuk TKM.** Ekspor browser TKM terbaru direstore tanpa perubahan ke file store backend terisolasi dan di-anchor ke kontrak EvidenceRegistry Anvil | S09 dapat mengikuti source dan decision yang sama; bukan transaksi browser atau public chain |
| Penyebab pasti tiga P8 r12 lama | **Tidak dapat direkonstruksi**: payload/log asal yang diperlukan tidak tersimpan | Pertahankan unknown; tes baru tidak mengisi sejarah yang hilang |
| Practical Usefulness r12 | **Belum terbukti.** Frozen completion tetap0/48 | Tidak ada klaim hemat waktu, skor komposit baru, pilot atau manfaat terukur |
| AI TKM baru | Tidak dipanggil; gunakan bukti live KAZ yang sudah ada dengan label kasus/tanggal terpisah | Bukan blocker film bila pergantian kasus dijelaskan; tidak mengarang output TKM |
| Footage, suara pria, MP4, upload/deploy/public-chain | Di luar sesi ini sesuai keputusan pengguna | Belum dibuat; AI produksi memakai handoff v14 setelah izin produksi |

## 2. Implementasi

- `scripts/agent-usefulness/task-contract-v13.ts` + tests: schema output eksplisit,
  hash exact claim, duplikat/membership, field request dan trust pin. Ini pemeriksaan
  struktur/invariant **bukan evaluator kebenaran tugas**; belum ada protokol/scorer
  penelitian baru yang dibekukan. Jangan menjalankan launcher r12 dengan schema ini.
- `codex-cli-runner.ts`: opt-in preflight sebelum subprocess/provider, schema di
  prompt untuk trial baru, hasil lengkap tetap FAILED bila kontrak dilanggar.
  Jawaban mentah tetap disimpan; tidak diubah menjadi jawaban yang benar.
- `trusted-export-tool.ts` + tests: file operator dibuka read-only, symlink
  ditolak, ukuran maksimal16MiB; ringkasan tanpa dossier/reviewer/token/error body.
  Digest tidak dapat diganti agent. Hasil selalu `chainStatus: NOT_VERIFIED`:
  tool ini memeriksa integritas/dossier, bukan menghubungi blockchain.
- `codex-mcp-server.ts`, `bridge-diagnostics.ts`: expose verifier T3 hanya bila
  dikonfigurasi; simpan nama tool dalam allowlist metadata. Config lama tanpa
  fixture tetap memiliki surface semula.
- `codex-cli-runner.test.ts`: tiga roundtrip memakai subprocess client
  **terprogram**, bridge asli dan Chromium asli. Tidak ada model/usage sintetis
  yang dianggap sebagai episode agent.
- `scripts/run-retained-decision-proof.ts`, `retained-decision-chain.test.ts`:
  isolasi env, Anvil loopback saja, random signer sementara dengan saldo DEMO,
  directory reviewer software DEMO berscope, backend Hono/FileAuditStore dan
  EvidenceRegistry asli; tidak memerlukan dana testnet atau database.
  Reviewer assurance memakai directory loader asli, bukan mock otorisasi.
- `scripts/tsconfig.evaluation.json`: sertakan runner/proof baru dalam gate tipe.

Tidak mengubah runtime frontend/API, kontrak Solidity, dataset, data r12 atau
credential layanan. Semua perubahan pengguna dipertahankan. Tidak ada dependency,
deployment, provider call atau transaksi publik baru.

## 3. Verifikasi yang benar-benar dilakukan

| Check | Hasil | Bukti |
|---|---|---|
| `bun run check` | PASS: API, web, E2E, evaluation, agent-lab | `typecheck-final.txt`; setelah perubahan terakhir evaluasi/lab diperiksa lagi pada `typecheck-followup.txt` |
| `bun test scripts/agent-usefulness` | **73 pass,0 fail**,19 files; provider/model calls baru0 | `lab-output.txt` |
| `gates-r12.ts` | **12 pass,0 fail** | `gates.json`; bukan 12 episode |
| Browser production Chromium | **1 scenario pass**,35.3s; build juga pass | `browser-output.txt`, `browser/`; tidak direkam video |
| Anvil/Hono/CLI retained export | **1 integration pass**,34 assertions | `chain-output.txt`, `tkm-anvil-proof.json` |
| r12 immutable inputs | 73 file cocok dengan pin recovery awal | `verification.json` |
| Archived recovery/v13 artifacts | Tidak diubah | `verification.json` |
| Patch whitespace | `git diff --check` PASS | `diff-check.txt` |

API/Python/Foundry suites penuh tidak dijalankan ulang; produksi backend diuji
melalui workflow browser dan proof lokal. `forge build` dijalankan oleh proof,
tetapi itu bukan `forge test`. Web unit282 dan empat workflow browser dari
recovery sebelumnya tetap bukti revisi terdahulu, tidak dihitung sebagai tes baru.
Peringatan lazy MapPanel chunk >500kB masih ada; bukan klaim performa HP fisik.

**Kegagalan pengembangan dipertahankan:** assertion awal salah menganggap
`anvil_setBalance` harus mengembalikan nonnull; diperbaiki menjadi pemeriksaan
saldo aktual. Typecheck mendeteksi typing RPC Anvil nonstandar; gunakan envelope
JSON-RPC eksplisit. Assertion privasi awal mencari kata “dossier” dalam seluruh
JSON sehingga mengenai disclaimer, bukan kebocoran data; diperbaiki menjadi
pemeriksaan properti. Log `chain-attempt-1.txt`, `typecheck-attempt-1.txt`,
`lab-attempt-1.txt` dipertahankan; tidak dihitung sebagai PASS.

## 4. Binding take utama dan integritas

- Source `TKM_S_021`, snapshot `unep-mars-675417694883`, archive SHA
  `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`.
- Claim `mitigation_confirmed`, periodeUTC `2020-10-29`–`2026-09-13`.
  Klaim dan response adalah fixture DEMO, bukan pernyataan perusahaan/repair nyata.
- Browser reviewer `connected-demo-mitigation`, decision revision1,
  `request_more_evidence`. Enrollment hanya software fixture, bukan identitas
  atau kompetensi manusia yang diverifikasi.
- Pin yang dibaca pada `browser/decision-desktop.png`, lalu diperiksa terhadap
  ekspor: `0x7f150071975c7acf393707578f782d654bcb6b5fa18ffd3414dd6dca96af803b`.
  [trusted-digest.json](trusted-digest.json) mencatat asal pin.
- `tkm-anvil-proof.json.record.decision` sama persis dengan
  `browser/frozen-investigation-decision.json.decision`. UI awal belum anchored;
  proof merestore ekspor **secara eksplisit pada environment disposable**, bukan
  membuat endpoint impor baru atau menekan Anchor di UI yang disabled.
- API tanpa auth401, tanpa anchor scope403, revoked403; ketiganya tidak memakai
  nonce. Anchor sukses, duplicate409; total dua nonce (deployment+anchor).
- CLI original0, altered dengan pin lama1, altered+rehashed dengan pin baru1,
  original lagi0, issuer receipt palsu1, restore chain+store/restart0.
- Revisit browser `new_authorized_response`, decision lama identik. Ini respons
  DEMO baru, bukan bukti plume baru atau emisi nol.
- `.anvil-state.json` hanya memuat transaksi/storage publik ledger DEMO; tidak
  memuat signer atau reviewer secret/token. Anvil dan temporary state server
  telah dihentikan; verifikasi RPC berikutnya memerlukan restore/replay lokal.

Proof previous-take/initial disimpan untuk diagnosis. **Gunakan hanya final
`tkm-anvil-proof.json` dengan folder `browser/` pada direktori ini.** Jangan
menggabungkan receipt take lama dengan digest UI baru.

## 5. Produksi berikutnya

Mulai dari [production-handoff v14](../../demo/delivery-2026-10-21-final-v14/production-handoff.md).
Storyboard tetap280detik, narasi lengkap dan shot list diperbarui: kasus TKM
tetap menyatu sampai chain proof; AI KAZ ditandai contoh historis terpisah.
Screenshot desktop diperiksa visual; bukan review video/audio atau performa HP.

Footage baru, male narration, editing dan MP4 **belum dibuat**, sesuai keputusan
pengguna. Untuk take baru, ambil pin dari UI reviewer, lalu gunakan opsi
`--decision <export> --trusted-digest <pin terpisah>` pada runner proof. Jangan
menyalin pin/receipt dari take ini ke ekspor baru. Tidak ada alasan menjalankan
ulang48 episode untuk membuat video yang jujur.
