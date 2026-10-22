# Pre-video final validation — 21 October 2026

**Selesai untuk penerimaan software lokal dan paket produksi.** Tidak berarti
Practical Usefulness sudah terbukti, seluruh agent berhasil, atau layanan publik
sudah diperbarui. Video, TTS, upload, deployment dan transaksi publik tidak dibuat.

## Perbaikan dan pengujian aktual

- Tiga tes persistence/verifier kini memakai `tmpdir()`; tidak memaksa `/tmp`
  yang terkena EDQUOT. Aturan penyimpanan privat tetap ketat.
- Test keputusan membaca pin pada UI reviewer **sebelum** membuka ekspor,
  lalu memeriksa ekspor terhadap pin tersebut. Identitas reviewer tetap DEMO.
- Test revisi rencana mengamati PUT, menunggu konfirmasi UI, kemudian membaca
  revisi server dengan GET berotorisasi. Tidak bergantung pada response body CDP
  yang sudah terlepas; tetap memeriksa revision2 dan konflik concurrent save.
- Batch smoke berikutnya memakai satu test sehingga restart worker tidak
  mereset allowance. Semua test tooling tercakup oleh `bun run agent-lab:test`.
- Schema smoke **versi2** tidak mengungkap nilai oracle. Unit regression menolak
  duplikat/salah source, count salah, pin salah, overclaim dan false PASS anggaran.
  Versi2 **belum dijalankan dengan model**; tidak mengubah protocol/results versi1.

| Pemeriksaan terbaru | Hasil | Bukti |
|---|---:|---|
| Frozen install | PASS, no changes | install.log |
| Typecheck API/web/E2E/evaluation/lab | PASS | typecheck-last.log |
| API | 301 pass,0 fail | api-final.log |
| Web | 282 pass,0 fail | web-final.log |
| Verifier | 66 pass,0 fail | verifier-rerun.log |
| Python pipeline | 221 pass | python-final.log |
| Python tooling | 15 pass | python-tooling-final.log |
| Foundry | 4 pass | contracts-final.log |
| Agent tooling | 78 pass,0 fail; no model calls in these unit tests | agent-tooling-complete.log |
| Deterministic gates | 12 pass,0 fail | gates.json |
| Main browser suite | 29 pass | e2e.log |
| Documents/reviewer browser suite, final rerun | 13 pass | ai-e2e-final.log |
| Same-take TKM Anvil/backend/CLI | 1 integration,34 assertions | current-browser-chain.log |
| Production build/bundle | PASS; App74,935 gzip bytes,8 lazy workspaces | build.log,bundle-final.log |
| Baseline reproduction | Byte-identical to retained report | baseline-evaluation.json |
| Immutable r12 | 73 files unchanged | verification.json |

Tidak menjumlahkan repeats sebagai coverage baru. Main29 dan AI13 berisi
**42 skenario berbeda**, sebagian merupakan schema/UX tests, bukan42 penelitian
pengguna. AI suite memakai provider mock, bukan DeepSeek live.

## Hasil negatif tetap dipertahankan

R12 frozen tetap **0/48 completion**,8.33% decision accuracy,74.3% actionability;
11 completed,34 abstained,3 failed. Klasifikasi retrospektif non-exclusive tetap
22 scorer false negatives,3 agent/tool failures,0 application defects yang
terbukti dari r12,1 genuine task failure,38 protocol limitations. Lihat audit
recovery; bukan skor pengganti. Penyebab historis P8 tidak dapat dipulihkan karena
payload diagnostik asal tidak tersimpan. Hal ini ditutup sebagai batas bukti,
bukan diisi dengan tebakan atau jawaban baru.

**Satu probe P8 nyata baru**, T3 read-only, memakai Codex GPT-6 Luna Max pada
plan yang sudah ada: verifier dipanggil dan output disubmit. Output cocok dengan
checker, tetapi trial tetap **FAILED `lab_token_cap`**:73,152 input+398 output=
73,550 aggregate tokens,54,016 cached input,23.9s. Allowance60,000 baru bisa
diperiksa setelah satu turn selesai. CostUSD tidak diketahui, bukan klaim gratis.
T1/T2 tidak memperoleh provider turn; lihat smoke-not-attempted.json. Tidak ada
retry,48 episode baru atau API model backend baru.

Audit juga menemukan schema probe versi1 memperlihatkan literal outcome.
Karena itu probe ini hanya membuktikan **transport model→MCP→verifier→submit**,
bukan decision accuracy, usability atau Practical Usefulness. Versi2 menghapus
kebocoran oracle dan memperbaiki batch guard; tidak dijalankan ulang demi kuota.
Protocol/started/result asli dipertahankan utuh.

Kegagalan awal ada di api.log,verifier.log,python.log,python-tooling.log dan
e2e.log (main29 pass,AI11 pass/2 fail). Penyebab: temporary root salah/kuota,
label selector test tidak cocok dan CDP body unavailable. Semua tes software
tersebut telah diuji ulang sesuai tabel; trial P8 tetap gagal anggaran.

## Alur dan continuity untuk capture

Investigation Plan → Selected Source → Evidence Assessment → Evidence Request
→ DEMO-reviewed Decision → Revisit → Independent Verification telah diperiksa
pada browser/Anvil. Screenshot desktop1440×1000 dan mobile390×844 diperiksa
visual. Tidak ada footage baru atau pengujian pada HP fisik.

- Take utama: `TKM_S_021`,snapshot`unep-mars-675417694883`,scopeUTC
  `2020-10-29`–`2026-09-13`,claim`mitigation_confirmed` berlabel DEMO.
- Trusted pin dari UI sebelum download: `0x47423e67908e4420e1b19dbcfbf8e687ec7f565c0b948151ebcd804103c49663`.
- Ekspor dan screenshot **take ini** ada di `browser/`; proof yang cocok adalah
  `current-browser-anvil-proof.json` beserta `.anvil-state.json`.
- Browser awal `not_anchored`; ekspor identik direstore secara eksplisit ke
  backend disposable dan Anvil31337, kemudian `verified_latest`. Bukan klik
  Anchor di browser, public chain, review manusia, atau bukti repair.
- CLI original0/altered1/altered+rehashed1/original0/forged issuer1/restart0;
  no-auth401/no-scope403/revoked403/duplicate409; decision tidak ditulis ulang.
- `tkm-anvil-proof.json` adalah **control replay take lama**, jangan dicampurkan
  dengan screenshot baru. Trial P8 juga mengacu pada pin take lama. Pakai hanya
  pasangan `browser/` + `current-browser-anvil-proof.json` untuk v15.
- Contoh DeepSeek live tetap bukti terdahulu **KAZ_S_159**, bukan TKM. Tampilkan
  pergantian kasus/tanggal/excerpt DEMO secara eksplisit.

## Batas yang dibekukan untuk produksi

Tidak ada bukti produktivitas manusia, pengurangan emisi, repair terkonfirmasi,
akurasi generalisasi agent, review pakar atau deployment publik terbaru. Itu
batas klaim, bukan fitur yang dipalsukan agar demo terlihat berhasil. Tidak ada
migrasi/database/dependency baru. MapPanel masih1,123,502 raw bytes dengan warning
chunk>500kB; lazy-loaded, bukan jaminan FPS/performa HP fisik. GitHub Actions dan
Render belum diperbarui/diperiksa ulang pada sesi ini.

**Selanjutnya:** gunakan [handoff v15](../../demo/delivery-2026-10-21-final-v15/production-handoff.md).
Seluruh storyboard/narasi/capture instructions/claim ledger/QA ada di sana.
Jangan menjalankan model lab lagi untuk membuat video. Jika capture baru dibuat,
ambil pin baru dari UI dan buat proof Anvil baru untuk ekspor yang persis sama.
