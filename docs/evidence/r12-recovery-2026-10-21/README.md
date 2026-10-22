# r12 recovery — 21 Oktober 2026

**Jenis bukti:** audit retrospektif + regresi software lokal baru. Bukan run agent
48 episode baru, pilot manusia, penilaian juri atau pembuktian manfaat produktivitas.
Tidak ada provider berbayar, deployment, transaksi publik atau video baru.

## 1. Baseline tetap dipertahankan

[R12 asli](../agent-practical-usefulness-2026-10-21-r12/results.json): 48 sealed
attempts; 11 completed, 34 abstained, 3 failed; **completion 0/48**, accuracy 8.33%,
actionability 74.3%, false-supported 0/15, critical-overclaim 0/45; komposit tidak
tersedia. Gate 12/12 tidak membuktikan 48 tugas berhasil.

`frozen-input-sha256.json` merekam **73 berkas** sebelum perubahan. Audit memeriksa
ulang semuanya dan memastikan scorer sumber cocok dengan scorer beku. Gold,
hasil agent, protocol, source manifest dan hasil r12 tidak diubah. Seluruh r10/r11/
attempt directories dan perubahan pengguna dipertahankan. Tidak ada best-of rerun.

## 2. Akar masalah dan klasifikasi

[audit.json](audit.json) memuat klasifikasi per episode, alasan frozen,
normalisasi alternatif, kewajiban yang tersisa dan audit field.
Kategori **tidak eksklusif**, sehingga tabel tidak dijumlahkan menjadi 48.

| Kategori | Episode terkait | Temuan |
|---|---:|---|
| SCORER_FALSE_NEGATIVE | 22 | Tujuh output T1 browser memakai label/struktur berbeda; 15 T2 memiliki reference objects yang ditolak string-list scorer, termasuk variasi verdict. Ini tidak otomatis membuat seluruh tugas PASS. |
| AGENT_OR_TOOL_FAILURE | 3 | P8 T1/T2/T3 browser: `codex_result_missing`, outputnull. Penggunaan model tercatat, tetapi bridge lama menyimpan langkah hanya saat submission dan menghapus work directory. |
| APPLICATION_DEFECT | 0 terkonfirmasi dari r12 | Tidak ada bukti cukup untuk mengatribusikan kegagalan ke aplikasi. Angka0 bukan bukti aplikasi bebas bug. Ada perbaikan penjelasan planner dan koreksi fixture demo, bukan klaim memperbaiki38 bug produk. |
| GENUINE_TASK_FAILURE | 1 | P4-T1-manual mengganti `TKM_S_047` dengan `IND_S_042`. ID salah tetap gagal meskipun label strategi mirip. |
| PROTOCOL_LIMITATION | 38 | Delapan manualT1 tidak memiliki operasi aktivasi; 15 T2 dinilai atas field yang tak diiklankan; 15 T3 tidak mendapat setup/tool/otorisasi untuk menjalankan kewajiban. |

### T1 — allocation dan status aktif

- Ketujuh output browser nonfailed mempunyai **set10 ID tepat**. Tujuh manual
  juga tepat; satu manual salah seperti tabel di atas.
- `Weighted historical indicators` adalah label UI untuk `weighted`. Objek
  rationale masih dapat diperiksa, tetapi label saja tidak membuktikan ID/alokasi.
- Adapter baru menerima **empat** output browser dengan before/after terstruktur
  yang cukup: P1,P2,P4,P5. Ia memeriksa ID tanpa duplikat, stateaktif, kapasitas10,
  edit20, nonreplacement dan konflik flag. Tiga output lainnya tetap tidak
  dinormalisasi penuh karena bentuk prose/identitas active-plan tidak lengkap.
- Status `abstained` tidak diubah menjadi completed. Aktivasi hipotetis pada
  manual packet bukan operasi runtime. Satu tes browser baru memeriksa queue10
  tetap identik setelah edit20, kemudian20 hanya sesudah aktivasi eksplisit.
- Agent mencoba `Excluded sources` sebagai button/tab, padahal UI memakai select
  `Planner rows to inspect`. Petunjuk UI kini menjelaskan pemilihannya. Ini
  klarifikasi navigasi; bukan kegagalan fungsi dropdown yang terbukti.

### T2 — verdict dan request

- **15/15 output yang tersedia** menjaga source, claimType, exact claim text dan
  tiga komponen scope dengan benar. Pemeriksaan text menggunakan SHA-256 yang
  dihitung untuk audit; hash ini **tidak ditambahkan ke jawaban agent**.
- Empat verdict tepat `insufficient_evidence`; 11 lainnya menyatakan abstention
  dengan semantik bukti tidak cukup. Adapter menerima hanya alias/pola terbatas,
  tidak menyamakan `supported`, `contradicted` atau klaim repair dengan abstention.
- Semua15 mempunyai sembilan request fields yang diminta dalam bentuk nonempty;
  ini pemeriksaan **keberadaan/bentuk**, bukan validasi kualitas setiap referensi
  atau penerimaan5 kebutuhan bukti secara independen. P1/P8 manual dan P3 browser
  diperiksa sebagai contoh: mereka meminta action, dated source-linked
  post-action measurement, method/uncertainty, serta acceptance criteria.
- Frozen scorer menuntut `claimTextSha256` dan
  `requestedEvidenceRequirementIds` yang tidak ada pada advertised output fields.
  Semua15 tidak menyertakan requirement IDs; hash top-level hanya ada pada satu
  output. Field tersebut tetap hilang dalam adapter; tidak ditebak dari prose.
- `requestedEvidence` berupa string atau object array dan `references` berupa
  object array ditolak oleh `stringList` lama. Audit mencatat ketidakcocokan ini;
  tidak mengklaim actionability baru100% atau menghapus pemeriksaan referensi.
- Scientific abstention yang benar bukan otomatis task execution completed.
  Semua kewajiban tetap terlihat. Tidak ada T2 yang dipromosikan menjadi fullPASS.

### T3 — trust dan lingkungan

- Trusted digest **ada** pada packet. Masalahnya bukan harus membuat digest baru.
- C1 membuka `/dashboard/reports`, tanpa mengisi `DEMO-work`/historical decision;
  config r12 secara eksplisit mengosongkan reviewer secret/directory/tokens.
  UI awal yang kosong bukan dossier fixture yang hendak dinilai.
- C0-T3 hanya mendapat JSON di prompt dan `submit_result`, tanpa tool untuk
  mutasi/revisit/export/CLI. Tugas menyuruh melakukan operasi yang tidak tersedia.
- Hasil T3 tetap gagal/blocked. Tidak ada reason code, digest, reviewer atau
  PASS verifikasi yang disisipkan ke output agent. Tidak ada bypass otorisasi.
- Frozen scorer/3 juga tidak memasukkan kesamaan reason codes ke syarat
  completionT3, walaupun mengukurnya pada accuracy. Adapter baru memperketatnya;
  tidak ada hasilT3 lama yang menjadiPASS.
- Lab berikutnya memerlukan **protocol baru**, setup fixture yang eksplisit,
  reviewer software DEMO dengan scope terbatas dan jalur verifier yang tersedia;
  C0 harus diberi kewajiban/tool yang setara, atau tugas tersebut ditandai tidak
  comparable. Jangan mengubah r12 untuk menyembunyikan persoalan ini.

### P8 — hasil diagnosis yang dapat dan tidak dapat disimpulkan

Ketiga failure memiliki model usage dan `codex_result_missing`. `steps:0` dan
`toolNames:[]` **tidak membuktikan tidak ada tool dipanggil** karena bridge lama
baru menulis counter pada `submit_result`. Temporary last-message/stderr tidak
dipertahankan; pencarian terarah tidak menemukan payload untuk memulihkannya.
`error-context.md` P8-T3 yang tersisa hanya mengulang error runner bahwa tidak ada
usable MCP task turn; bukan error browser atau alasan model yang definitif.
Screenshot dry-run P8 bukan rekaman percobaan agent tersegel.

Perbaikan sekarang merekam checkpoint metadata atomik sebelum/sesudah tool,
startup/ready/submission/close/failure, exit code dan keberadaan final prose.
Tests mencakup proses Codex stub yang exit0 tanpa submission, final prose tanpa
submission, bridge Chromium initialization failure yang nyata, dan pembacaan
diagnostik invalid. Semua tetap gagal secara tugas bila submission tidak ada.
**Belum dibuktikan:** apakah P8 akan menyelesaikan tugas setelah perubahan; tidak
ada panggilan agent baru untuk mencobanya.

## 3. Implementasi dan hasil verifikasi baru

Tidak ada migration/schema database, smart contract, provider setting, credential
atau deployment yang diubah. Izin reviewer lama tidak diperluas.

| Area | File / perubahan |
|---|---|
| Runner metadata | `scripts/agent-usefulness/bridge-diagnostics.ts`, `codex-cli-runner.ts`, `codex-mcp-server.ts` dan regresinya |
| Browser tools | `browser-tools.ts` dan test: textbox stable name, visible controls, bounded text/control budget, `set_details` |
| Evaluasi terpisah | `recovery-scorer.ts`, `recovery-scorer.test.ts`, `recovery-audit.ts`; version `agent-usefulness-recovery/4` |
| Planner | `apps/web/src/InvestigationPlanner.tsx`; instruksi preview/active queue dan Inspect rows |
| Browser regressions | `e2e/audit-workflow.spec.ts`; `e2e/ai-review-workflow.spec.ts`; `playwright.config.ts` hanya fixture reviewer DEMO tambahan |
| Produksi | Handoff v13; indeks docs/demo; evidence baru pada direktori ini |

| Pemeriksaan | Hasil / bukti |
|---|---|
| `bun run check` | PASS: API, web, E2E, evaluation dan agent-lab TypeScript. `check-output.txt` |
| `bun test scripts/agent-usefulness` | **60 pass / 0 fail**, 17 files; executable stub/local Chromium, **tanpa model**. `lab-tests-output.txt` |
| `bun run test:web` | **282 pass / 0 fail**,61 files. `web-tests-output.txt` |
| `gates-r12.ts` | **12 pass / 0 fail** baru; `gates.json`. Gate tetap bukan episode |
| Main Chromium production build | 1 scenario exact membership10→20, main queue/globe/evidence handoff. `browser-main-output.txt` |
| Review Chromium production build | 3 distinct scenarios: connected dossier, human-only path, mockAI citations/private review. `browser-review-output.txt` dan `browser-final-output.txt`; connected diulang setelah koreksi fixture, tidak dihitung sebagai scenario tambahan |
| Retained TKM CLI | **5 expected outcomes**: originalPASS, altered+rehashedFAIL, originalPASS, missing digestFAIL, require-chain without configurationFAIL. `verifier-proof.json` |
| Production build/budget | BuildVite dalam runner lulus. App 74.935/75.000 bytes gzip, 8 route chunks; MapPanel 1.123.502 raw bytes. `bundle-output.txt`; peringatan lazy map chunk besar tetap ada |
| Freeze/replay guard | 73 file r12 tidak berubah; source scorer sama dengan frozen; allocation wrong ID, duplicate/falseactive/replacement, missing digest/code tetap ditolak |
| Desktop/mobile render | Screenshot baru1440×1000/390×844; desktop decision dan mobile dossier diperiksa visual. Bukan pengujian HP fisik/seluruh aksesibilitas/FPS |

**Kegagalan selama pengembangan yang dipertahankan:** tes baru mendeteksi bahwa
getClientRects masih menawarkan input dalam disclosure tertutup; tooling
diperbaiki dengan pemeriksaan visibility dan ancestor details. Koreksi awal
reviewer mitigation-only ditolak tombol save plan karena plan mensyaratkan scope
source_detected. Fixture baru kini secara eksplisit memiliki kedua scope tersebut;
reviewer lama tetap terbatas. Log kegagalan scope tersimpan pada
`browser-fixture-scope-failure.txt`; tidak dihapus dan tidak dihitung sebagaiPASS.

Source fixture demo awal mempunyai claimType source_detected tetapi pertanyaan
follow-up. Capture/JSON itu dipindah ke `initial-demo-check/` dan **bukan proof
untuk klaim mitigasi final**. Fixture baru mengikat mitigation claim, source TKM,
periodeUTC, reviewer DEMO dan permintaan tindak lanjut secara konsisten.

API/Python/Foundry suites penuh tidak diulang karena modul tersebut tidak diubah;
workflow Hono lokal tetap diuji lewat browser dan gates. Tidak ada run public
provider/chain/deployment atau penelitian manusia baru. Pemeriksaan source baru
tidak membuat hasil layanan publik sebelumnya otomatis current.

## 4. Bukti untuk video dan pekerjaan tersisa

Ekspor utama baru: `connected-investigation.json` (3 work revisions),
`frozen-investigation-decision.json` (5 work revisions, 3 events),
`revisited-investigation-decision.json` (new response, review recommended,
frozen decision tetap identik). SourceTKM, snapshot `unep-mars-675417694883`,
scope 2020-10-29..2026-09-13UTC, claim `mitigation_confirmed`, reviewer
`connected-demo-mitigation`, keputusan `request_more_evidence`, **not_anchored**.
Hash dan timestamp tepat terdapat pada ekspor; jangan menyalinnya ke take baru.

**Ready secara lokal:** planner, request fields, DEMO authorized review, frozen
decision, response-triggered revisit, original/rehash verification. Screenshot
dan ekspor siap diperiksa. Semua respons/tanggal/hashfile DEMO adalah fixtures,
bukan laporan perusahaan nyata.

**Blocker yang tetap nyata:** Practical Usefulness belum terbukti; akar P8 lama
tidak dapat dipastikan; belum ada liveAI TKM/receiptAnvil TKM, footage final baru,
voice pria/captions/mix/render/playback, atau deployment kode ini. Bukti live
model dan Anvil yang telah tersedia memakai KAZ. Fallback video adalah segmen
KAZ terpisah berlabel tanggal/lingkungan, bukan menggabungkannya ke kasusTKM.

[Production handoff v13](../../demo/delivery-2026-10-21-final-v13/production-handoff.md)
berisi storyboard **280 detik**,575 kata narasi Inggris, shot/claim/capture ledger,
instruksi cursor/zoom/transisi/audio, QA dan perintah bagi AI produksi berikutnya.
MP4 **belum dibuat**, bukan video terunggah. Manifest pada `verification.json`
mengikat source dan artefak lokal. Angka rerun tidak dijumlahkan menjadi studi
agent baru atau probabilitas menang kompetisi.
