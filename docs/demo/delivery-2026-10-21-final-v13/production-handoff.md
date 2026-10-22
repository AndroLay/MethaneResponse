# MethaneResponse v13 — production handoff

**21 October 2026 · local recovery checkpoint · VIDEO NOT PRODUCED.**

Petunjuk utama bagi AI berikutnya. Mulai dari dokumen ini dan
[laporan recovery](../../evidence/r12-recovery-2026-10-21/README.md), bukan audit
ulang seluruh repository. Working tree lokal lebih baru daripada commit
`b067ad36c792ab45c472334984b338662b679637`. Tidak ada push, deployment, pemanggilan
model berbayar, transaksi publik, TTS atau render video pada sesi recovery ini.

## 1. Status implementasi dan batas bukti

- **Diperbaiki:** diagnostik bridge Codex tetap dicatat meskipun agent tidak
  memanggil `submit_result`: tahap, jumlah langkah, nama tool allowlist, jumlah
  error, exit code, ukuran stderr dan keberadaan final prose. Tidak menyimpan
  isi prompt, final prose, halaman, token atau credential. Prose tidak diubah
  menjadi hasil tugas. Penyebab pasti tiga kegagalan P8 lama tidak dapat dipulihkan.
- **Diperbaiki:** browser tool mengisi textbox berdasarkan accessible name yang
  stabil; kontrol dalam disclosure tertutup disembunyikan dari daftar target;
  disclosure dapat dibuka melalui aksi UI; daftar kontrol tidak hilang di akhir
  teks ilmiah yang panjang. Ini tooling pengujian, bukan bukti performa agent baru.
- **Diperjelas:** planner menyebut bahwa perubahan parameter menghapus preview,
  bukan antrean aktif. Dropdown `Inspect rows` memilih `Excluded sources`;
  opsi tersebut bukan tab atau button.
- **Dikoreksi untuk demo baru:** fixture TKM memakai klaim
  `mitigation_confirmed`, bukan `source_detected` untuk pertanyaan follow-up.
  Reviewer `connected-demo-mitigation` adalah fixture software lokal yang secara
  eksplisit diberi scope alokasi/deteksi dan mitigasi. Reviewer lama tidak diberi
  tambahan hak. Tidak ada identitas atau kompetensi manusia yang diklaim sah.
- **Terpisah dari r12:** evaluator `agent-usefulness-recovery/4` memberi
  normalisasi konservatif label/struktur, mempertahankan field yang hilang,
  dan memperketat kecocokan reason codes T3. Empat output lama memenuhi adapter
  ini; bukan empat episode baru, bukan bukti manfaat organisasi.
- **Tetap negatif:** r12 frozen completion **0/48**, decision accuracy **8.33%**,
  actionability **74.3%**, 11 completed/34 abstained/3 failed. Tidak ada komposit.
  Jangan menampilkan 12 gate sebagai 48 tugas berhasil. Tidak ada klaim hemat
  waktu, peningkatan efektivitas, kemenangan kompetisi atau dampak emisi terukur.
- Hasil tes, hash source, screenshot dan ekspor terbaru berada di
  `docs/evidence/r12-recovery-2026-10-21/`. Baca `verification.json` untuk hasil
  aktual; jangan menggabungkan hitungan focused repeats menjadi coverage baru.
- Render publik sebelumnya menggunakan source `98b25ca…`, state sementara,
  tanpa reviewer/signer publik. Tidak diperiksa ulang atau diperbarui pada sesi
  ini. Rekam alur terbaru secara lokal; jangan mengaku capture berasal dari Render.

## 2. Konsep final

**One explainable investigation plan. One actionable evidence request.
One verifiable decision.**

Cerita: tim mempunyai ribuan rekaman dan kapasitas terbatas. MethaneResponse
membantu memilih pekerjaan, mengubah kesenjangan bukti menjadi permintaan yang
jelas, lalu mempertahankan keputusan yang dapat diperiksa ulang. MARS menyediakan
observasi dan proses alert/response; MethaneResponse menambahkan workflow audit
dan perencanaan berbasis rekaman tersebut. Ini prototype pendukung investigasi,
bukan sistem pendeteksi pengganti MARS, pengawas live, atau sertifikat repair.

Penonton awam harus memahami tiga pertanyaan: **What do we investigate? What
evidence do we need? Can another reviewer check our decision?** Peneliti dan juri
mendapat source ID, snapshot, scope UTC, uncertainty, exact quote dan trust anchor
pada saat yang relevan. Jangan membuka film dengan daftar teknologi atau jumlah tes.

## 3. Kontinuitas yang wajib dikunci

| Segmen | Identitas dan batas |
|---|---|
| Investigasi utama | `TKM_S_021`, Turkmenistan; historical UNEP MARS; `unep-mars-675417694883`; archive SHA `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`; UTC scope `2020-10-29`–`2026-09-13`; claim type `mitigation_confirmed` |
| Klaim utama DEMO | “DEMO claim to assess: mitigation of TKM_S_021 was completed and confirmed by source-specific post-action measurements within 2020-10-29 through 2026-09-13 UTC.” Ini pernyataan uji buatan proyek, bukan kutipan perusahaan. Jangan mengatakan perbaikan memang dilakukan. |
| Assessment utama | Jalur review software DEMO lokal, `insufficient_evidence`; bukan hasil DeepSeek untuk TKM atau penelitian manusia. Permintaan: pengukuran follow-up yang source-linked, tanggal aksi/pengukuran, metode, satuan, uncertainty dan kesempatan observasi. |
| Keputusan utama | `request_more_evidence`, frozen revision 1; riwayat kerja dan evidence events dipertahankan; `chainStatus: not_anchored`. Gunakan digest hasil capture aktual, bukan menyalin digest lama ke keputusan baru. |
| Contoh model terpisah | `KAZ_S_159`; bukti backend DeepSeek `deepseek-v4.1-flash-1017` yang sudah direkam 21 Oktober. Excerpt proyek berlabel DEMO. Scope/klaim KAZ tetap milik segmen KAZ. Bukan hasil model TKM. |
| Contoh registry terpisah | `KAZ_S_159`; bukti kontrak Anvil 20 Oktober, **chain 31337**, bukan Sepolia. `connectedInvestigation.decisionDigest` pada `anvil-proof.json` mengikat keputusan KAZ yang berbeda dari ekspor TKM. |

Untuk TKM, perbandingan snapshot historis sudah termasuk dalam dossier yang
dibekukan: sesudah freeze ia harus tetap berlabel `already_in_decision_snapshot`.
Revisit sesudah freeze berasal dari **respons DEMO baru**, reason code
`new_authorized_response`, bukan dari mengaku snapshot lama sebagai update baru.
Metadata respons dan placeholder hash DEMO tidak berarti file pengukuran nyata
tersedia. Jangan membuat cuplikan laporan untuk mengisi kekosongan tersebut.

## 4. Storyboard terkunci — 280 detik / 04:40

1920×1080, 16:9, 25 fps; **7.000 frame**. Timecode berikut adalah rentang
timeline, bukan jaminan durasi suara. Ukur voice tiap shot sebelum picture lock.

| Shot | Timecode | Durasi | Visual / aksi / hasil yang harus terbaca |
|---|---|---:|---|
| S01 | 00:00–00:22 | 22 s | Diagram sederhana detection → reported response → evidence gap; pertanyaan tim dengan 10 slot. Bukan citra plume buatan. |
| S02 | 00:22–00:43 | 21 s | MARS → historical records → MethaneResponse → reviewable decision. Kotak fungsi resmi MARS terpisah dari aplikasi. Match-cut ke jendela produk. |
| S03 | 00:43–01:03 | 20 s | Globe aktual, label historical, 4.218 sources / 30.414 plume records; buka TKM; zoom ke source ID, tanggal dan kg/h ± SD; tahan 3 s. |
| S04 | 01:03–01:39 | 36 s | Cases → Plan investigation capacity → 10 slots / country cap 2 / all regions / all sectors / 50% recurrence → Compare → weighted. BHR_S_003 included; dropdown Excluded sources → IRN_S_001 quota. Activate10; ubah input20; antrean tetap10. Compare20 lalu aktivasi eksplisit bila menampilkan antrean20. |
| S05 | 01:39–02:05 | 26 s | Kembali ke TKM lewat Evidence; pilih mitigation claim dan scope UTC yang terkunci. Diagram metadata ≠ confirmed outcome. Tampilkan evidence inventory dan keterbatasan materi yang disertakan. |
| S06 | 02:05–02:33 | 28 s | Title card singkat: **Separate recorded AI integration · KAZ_S_159 · 21 Oct**. Bukti DeepSeek aktual yang dipertahankan, excerpt DEMO dan kutipan exact. Tidak ada klik/typing/pending spinner palsu pada screenshot. |
| S07 | 02:33–03:04 | 31 s | Card “Back to TKM_S_021 · local DEMO review”. Request fields dan acceptance criteria → Save shared work → assessment DEMO → inspect dossier → Freeze reviewed investigation decision. Tahan keputusan request_more_evidence dan revision. |
| S08 | 03:04–03:27 | 23 s | Respons DEMO baru → save revision6 → Inspect decision dossier and history → review_recommended/new_authorized_response. Bandingkan keputusan lama yang tidak berubah. Bukan bukti report body atau repair. |
| S09 | 03:27–04:06 | 39 s | 03:27–03:48 TKM: verifier CLI asli / altered+rehashed / asli dengan digest dipercaya terpisah. 03:48–04:06 card **Separate retained registry proof · KAZ_S_159 · Anvil local chain** → receipt/event dan hasil original/rejected. Jangan menunjukkan TKM seolah mempunyai receipt. |
| S10 | 04:06–04:40 | 34 s | Tiga hasil organisasi dan ringkasan batas prototype. Closing UI + repo URL. Baris jelas “Agent lab did not establish practical usefulness”; CTA inspect/reproduce, bukan klaim dampak sudah terukur. |
| **Total** | **00:00–04:40** | **280 s** | Transisi termasuk di dalam setiap durasi, bukan tambahan. |

## 5. Complete English narration

### S01 — 00:00–00:22

Methane warms our climate. But detecting an emission is only the start of an
investigation. A reported response does not tell us whether a repair was completed,
or whether a later measurement confirms it. If your team can investigate ten
sources, what should you check first?

### S02 — 00:22–00:43

UNEP's Methane Alert and Response System already detects major emissions,
notifies stakeholders, and supports follow-up. MethaneResponse builds on its
historical records. We connect the next decisions: where to investigate, what
evidence to request, and how another reviewer can check the recorded conclusion.

### S03 — 00:43–01:03

This pinned snapshot contains four thousand two hundred eighteen source records
and thirty thousand four hundred fourteen plume records. Here is source TKM S
zero two one. Its identifiers, dates, emission estimates, and uncertainty remain
traceable. This is historical data. Observation gaps do not mean zero emissions.

### S04 — 01:03–01:39

Start with ten investigation slots and a limit of two per country. Compare four
plans under the same constraints. The weighted plan combines historical magnitude
and recurrence. Inspect why Bahrain's source is included, while another Iranian
source is excluded by the country quota. Activate this plan. Changing capacity
to twenty leaves the active ten-source queue intact until you explicitly choose
a replacement. These are transparent planning heuristics, not forecasts or
guaranteed emissions savings.

### S05 — 01:39–02:05

Now follow the selected Turkmenistan source into Evidence Auditor. Keep one source,
one claim, and one review period together. Our clearly labeled demonstration
claim asks whether mitigation was completed and confirmed. Historical detection
metadata alone cannot answer that question. Missing material in this investigation
does not prove that no action occurred.

### S06 — 02:05–02:33

Here is a separate, previously recorded model example for Kazakhstan source KAZ
S one five nine. DeepSeek assessed an authorized demonstration excerpt through
the backend. The application checked exact quotations against the submitted text.
Administrative correspondence was insufficient to establish physical mitigation.
This recorded integration shows assistance with evidence; it is not a new model
run for our Turkmenistan investigation.

### S07 — 02:33–03:04

Back in the Turkmenistan investigation, turn the gap into a precise request:
identify the source, document the action, and provide a dated follow-up measurement
with its method, units, and uncertainty. A locally authorized demonstration reviewer
records the rationale and freezes the dossier. The decision is to request further
evidence. This demonstrates the software workflow, not an independent human
assessment or a confirmed repair.

### S08 — 03:04–03:27

Add a new demonstration response. The system recommends reviewing the investigation
because an authorized response arrived. The earlier decision remains unchanged.
A reason for another review is not evidence that mitigation succeeded. Historical
snapshot changes are also inspectable, without calling old archive records a new
live leak.

### S09 — 03:27–04:06

Export the decision and verify it against a separately trusted digest. The original
passes. Change the rationale and recalculate the file's own digest: it still fails.
The original passes again. Separately, retained evidence for the Kazakhstan case
shows a real registry transaction on an Anvil local chain. That receipt belongs
to that case, not this unanchored Turkmenistan decision. Hashes and contract events
check integrity and chronology. They do not prove that methane equipment was
repaired.

### S10 — 04:06–04:40

One explainable investigation plan. One actionable evidence request. One verifiable
decision. MethaneResponse helps teams make their reasoning inspectable, from
historical observations to the next evidence they need. The prototype has local
workflow tests and recorded model and registry integrations. Our agent lab did
not establish practical usefulness; productivity and climate outcomes remain
unproven. Explore the source, inspect the evidence, and reproduce the checks.
That is the foundation for accountable methane investigations.

## 6. Shot list dan panduan navigasi

Default test runtime: web `http://127.0.0.1:4179`, API `43139`; server milik test
berhenti otomatis sesudah tes. Runtime capture boleh memakai port lain secara
eksplisit; jangan mengasumsikan server test masih hidup.

| Shot | Route / UI | Output dan evidence | Status footage |
|---|---|---|---|
| S01–02 | Motion diagram editorial | Makna fungsi sesuai §§2–3; sumber MARS pada `2026-10-21-current-product-narrative.md` | Diagram baru perlu dibuat; tidak boleh tampak sebagai hasil sensor |
| S03 | `/dashboard/map?sourceId=TKM_S_021`, lalu `/dashboard/cases?sourceId=TKM_S_021` | Source ID, snapshot, flux/SD; angka katalog diverifikasi dalam browser planner | Capture video baru perlu dibuat. Screenshot globe lama dan UI baru tersedia; tes lokal memblokir tile eksternal, sehingga bukan proof kualitas imagery live |
| S04 | Cases → `Plan investigation capacity` | `Investigation slots`, `Maximum investigations per country`, `Country scope`, `Sector scope`, `Compare investigation plans`, `Use this plan on map & queue`; `Planner rows to inspect` adalah select | Regresi Chromium baru lulus; stills antrean/globe tersedia. Rekam aksi asli baru |
| S05 | `/dashboard/audit?sourceId=TKM_S_021` | `#claim-audit=mitigation_confirmed`; `Assessment scope` → `Period start/end` → `Apply assessment scope`; data source tidak diubah | Ekspor dan still baru pada paket recovery; film baru belum tersedia |
| S06 | Arsip `render-preview-2026-10-21/deepseek-public.png`; ringkasan `deepseek-live-2026-10-21/smoke-summary.json` | KAZ, model/version, excerpt DEMO, verdict dan exact citation aktual | Screenshot backend/UI historis ada. Tidak ada footage live TKM. Gunakan still berlabel tanggal + highlight; tak perlu panggilan berbayar baru |
| S07 | `Shared case work` → `Connected investigation`; `Structured evidence requests`; stage `Human assessment`; `Review → freeze decision` | Request, acceptance criteria, recipient role, due date; private work save; `I inspected…`; `Freeze reviewed investigation decision`; `Verify and download decision 1` | Fresh stills/JSON ada. Semua reviewer adalah software DEMO. Perlu video aksi; siapkan credential di luar frame |
| S08 | `Structured evidence requests` → response_received → Save shared work → inspect frozen decision | `review_recommended`, `new_authorized_response`, keputusan lama identik | `revisited-investigation-decision.json` dari run baru harus dipakai; jangan mengubah frozen file saat menambahkan respons |
| S09a | CLI `scripts/verify-investigation-decision.ts` | JSON `valid:true`, source TKM, chain NOT_VERIFIED; altered+rehash ditolak oleh expected digest; original pass lagi | Proof CLI lokal pada paket recovery; screen recording terminal bersih masih perlu dibuat |
| S09b | `connected-investigations-2026-10-20/anvil-proof.json` | `connectedInvestigation.sourceId=KAZ_S_159`, receipt chain31337, original/alteredAndRehashed/originalAgain | Bukti JSON/operation log historis ada; bukan footage transaksi baru. Tampilkan sebagai retained proof, atau hapus shot registry bila tidak dapat dipresentasikan terbaca |
| S10 | Closing actual app frame / repo URL | Klaim ledger di bawah; URL `https://github.com/AndroLay/MethaneResponse` | Perlu assembly baru; jangan mengklaim source lokal terbaru sudah dipush |

**Aturan capture:** mulai dari state disposable baru; gunakan default weighted
10/country2 sebelum mengubah20. Urutan tabel semula weighted adalah
`MEX_S_003,MEX_S_007,TKM_S_021,IRN_S_075,TKM_S_047,MYS_S_001,IRN_S_065,VEN_S_008,BHR_S_003,DZA_S_011`.
Jangan merujuk TKM sebagai source terpilih jika take aktual mempunyai filter lain.
Due date `2026-10-25` adalah deadline request DEMO, bukan komitmen operator.
Nomor revisi, request ID, digest, timestamp dan reviewer harus diambil dari take
yang sama. Buat binding manifest sebelum edit; jangan mendaur ulang nilai acak lama.

## 7. Claim ledger

| Klaim yang boleh diucapkan | Status bukti / lokasi | Batas |
|---|---|---|
| Historical UNEP catalog: 4218/30414 | Snapshot provenance + planner summary; `r12-recovery…/connected-investigation.json` | Record counts, bukan jumlah kebocoran aktif atau kasus yang telah diaudit |
| Capacity10→20 tidak otomatis mengganti antrean | Browser regression `Active investigation plan keeps…`; recovery log | Policy aplikasi pada snapshot ini; bukan alokasi iklim optimal |
| Request menyebut field yang dapat ditindaklanjuti | Ekspor request events, acceptance criteria dan scope; browser TKM baru | Bentuk permintaan tersedia; manfaat produktivitas belum terbukti |
| Document model dipanggil melalui backend dan quote diperiksa | `deepseek-live-2026-10-21/README.md`, `smoke-summary.json`; `render-preview…/verification.json` | Kasus KAZ/excerpt DEMO dan run terdahulu; bukan AI TKM atau akurasi populasi |
| Authorized review + frozen decision + revisit | Ekspor TKM baru, scope reviewer DEMO, `revisited-investigation-decision.json` | Otorisasi software bukan verifikasi keahlian/identitas manusia; review ≠ repair |
| Original/altered+rehashed/original diverifikasi | Proof CLI recovery + externally pinned expected digest | Self-check yang mengganti file dan digest bersama bukan bukti trust. TKM belum on-chain |
| Registry receipt/event aktual tersedia | `connected-investigations-2026-10-20/anvil-proof.json`, `anvil-output.txt` | KAZ, Anvil chain31337, tanggal20Okt; bukan public chain, bukan physical outcome |
| Local regressions passed | Recovery `verification.json`, source hashes, logs | Tes software terbatas; bukan 48 episode baru atau pilot manusia |
| r12 belum mendukung Practical Usefulness | Frozen `results.json`, recovery `audit.json` | 0/48 completion frozen. Alternatif konservatif tidak menggantikan hasil asli |

Jangan tampilkan “AI improves accuracy”, “saves audit time”, “verified repair”,
“live methane feed”, “all workflows production ready”, “public blockchain
deployment”, atau “independently evaluated human reviewer”. Jangan mengutip
jumlah baris kode atau banyaknya tes sebagai bukti menang kompetisi.

## 8. Capture manifest dan aset

| Aset | Lokasi lokal relatif repo | Perlakuan |
|---|---|---|
| New recovery stills + exports + verifier output | `docs/evidence/r12-recovery-2026-10-21/` | Cocokkan `verification.json` sebelum reuse; ini bukti terbaru, bukan film |
| UI polish desktop/mobile | `docs/evidence/ui-polish-2026-10-21/` | Desain sebelum koreksi fixture TKM; jangan mengatribusikan hasil source_detected kepada klaim mitigasi baru |
| Actual KAZ model still | `docs/evidence/render-preview-2026-10-21/deepseek-public.png` | Histori21Okt, bukan panggilan baru |
| Actual Anvil proof | `docs/evidence/connected-investigations-2026-10-20/anvil-proof.json` | Read-only retained evidence, jangan memalsukan explorer publik |
| v12 MP4 | `delivery-output/story-v12/MethaneResponse-Final-Presentation-Demo-v12.mp4` | Ada lokal; source footage KAZ versi lama. Review visual/pacing saja; bukan bukti fitur baru |
| v12 source footage | `delivery-output/story-v10/capture-master/actual-ui.webm` | Historis; manifest v12 terpisah. Tidak dipotong sehingga ID KAZ tampak TKM |
| Connected technical supplement | `delivery-output/connected-walkthrough-2026-10-20/MethaneResponse-Connected-Workflow-2026-10-20.mp4` | Ada lokal, tanpa narasi baru, berisi viewport/stale-response regression; fixture lama. Tidak menjadi take utama v13 |
| Original instrumental | `delivery-output/story-v4/original-instrumental.wav` | Musik orisinal proyek; hash ulang dan catat rights/provenance; gunakan gain rendah |
| Male narration | Belum dibuat atau dipilih | Audition dua cuplikan naskah publik. V12 memakai suara wanita; jangan reuse sebagai male final |
| New main UI capture / terminal capture / captions / master | **Belum dibuat** | Pekerjaan AI produksi berikutnya |

Tidak boleh direkayasa: hasil provider untuk TKM, dokumen operator, measurement
report, sensor imagery, respons operator, reviewer manusia, receipt publik,
revisit karena snapshot yang sudah termasuk keputusan, atau klik pada still
yang dibuat seolah mengirim request aktual.

## 9. Subtitle, audio, motion dan transisi

- Gaya dokumenter produk: navy/cyan, satu pesan per komposisi. Model/diagram
  sederhana menjelaskan proses, tanpa plume art atau footage bencana yang
  seolah berasal dari source yang diselidiki.
- Cursor kontras tinggi sekitar24–30px pada1080p, motion halus menuju satu target,
  berhenti150–250ms sebelum klik. Cincin klik hanya pada timestamp aksi aktual.
  Pertahankan posisi scroll stabil saat mengetik; jangan tracking posisi cursor
  dengan kamera setiap frame.
- Zoom fokus sekitar1.15–1.35×, ease-in/out450–650ms, tahan2–4s, lalu kembali ke
  konteks sebelum navigasi. Fokus alasan alokasi, scope, quote, verdict, revision,
  reason code dan hasil verifier. Jangan memotong source ID/badge lingkungan.
- Presentation→demo: match frame ke jendela browser selama400–600ms. Antaraksi
  aplikasi cukup cut ketika hasil siap. Pergantian TKM↔KAZ wajib card/label jelas
  minimal2s; tidak memakai seamless transition yang menyamarkan pergantian kasus.
- Label permanen yang relevan: `HISTORICAL · NOT LIVE`; `LOCAL PROTOTYPE · DEMO
  REVIEWER`; `RECORDED KAZ MODEL EXAMPLE`; `ANVIL LOCAL CHAIN · 31337`; `TKM
  DECISION · NOT ANCHORED`. Ukuran sekitar24–28px; bukan disclaimer mikroskopis.
- Narator **pria dewasa**, Inggris percakapan yang hangat dan tenang. Voice TTS
  tetap sintetis, bukan orang sungguhan. Jangan meniru tokoh tertentu. Mulai
  audition suara pria dari `edge-tts` yang tersedia; pilih ID setelah mendengar
  pembuka dan penjelasan hasil. Naturalitas belum diverifikasi.
- Target spoken cadence sekitar125–145wpm, jeda singkat0.2–0.5s antarfrasa;
  beri ruang membaca hasil. Hindari jeda kosong panjang dan speed-up narasi.
  Jika cue melewati slot, rapikan kata tanpa menghapus batas klaim; jangan
  memaksa voice dengan time-stretch agresif. Musik instrumental duck di bawah
  suara; target mix awal−18LUFS±1.5, true peak≤−2dBTP, stereo48kHz.
- Subtitle Inggris maksimal2baris, sekitar42karakter/baris, kontras tinggi dengan
  panel gelap. Sinkronkan ke **audio jadi**, bukan timecode draft. Nama source,
  angka dan kata “not” harus tepat. Jangan menaruh subtitle di atas source/quote.
- Tidak ada latensi provider yang disimpulkan dari hasil edit. Bila waiting
  dipangkas, gunakan label `waiting shortened`; jangan menambah spinner palsu.

## 10. Final QA checklist

- [ ] Verifikasi source hash/build yang dipakai, fresh state, source dan period
  sepanjang shot utama; scope klaim dan reviewer sesuai take baru.
- [ ] Replay membership10/20; ID dan alasan included/excluded benar. Mengetik20
  saja tidak diperlihatkan sebagai antrean20 aktif.
- [ ] TKM tidak diberi quote/model result/receipt KAZ; card transisi tampak jelas.
- [ ] Seluruh excerpt/request/response/reviewer DEMO diberi label; imagery hanya
  konteks lokasi. Tidak ada bukti repair atau pengurangan emisi yang diciptakan.
- [ ] Due date, UTC, date precision month, uncertainties dan satuan tidak berubah.
- [ ] Frozen decision sama sesudah revisi; snapshot lama bukan “new leak”.
- [ ] Verifier memakai expected digest dari saluran reviewer terpisah, bukan
  membaca digest baru dari file yang sedang diverifikasi. Altered+rehash gagal.
- [ ] Chain31337 disebut Anvil lokal; TKM tampil not_anchored; event dan receipt
  arsip KAZ terikat digest KAZ. Jangan meminta `--require-chain` untuk TKM.
- [ ] Masking input token, credential, clipboard, envfile, terminal history,
  alamat pribadi dan error traces diperiksa pada **setiap frame sensitif**.
  Pakai terminal bersih dengan perintah nonsecret; jangan capture shell setup.
- [ ] Periksa hasil UI asli pada1920×1080 dan preview playback50%; quote/reason
  masih terbaca. Kalau tidak, reframe atau persingkat tampilan.
- [ ] Narator belum menyebut hasil sebelum hasil tampak; zoom selesai sebelum
  reading hold; tidak ada goyangan, scroll acak atau transisi berulang.
- [ ] Dengarkan voice dan mix penuh pada kecepatan normal; pronunciation MARS,
  methane, Anvil, source IDs; subtitle sesuai; musik tidak menutupi konsonan.
- [ ] FFprobe: H.264/yuv420p,1920×1080,25fps, durasi280.00s sesuai frame clock,
  audio48kHz; tidak ada frame hitam tak disengaja, clipping atau silent gap panjang.
- [ ] Recheck event requirements saat submission (catatan lokal:3–5menit), URL
  repo/demo/video dapat diakses. Paket lokal bukan video terunggah atau submission.
- [ ] Claim ledger, source/capture hashes dan hasil final review disimpan bersama
  master. Jangan memakai status r12 atau skor alternatif sebagai headline manfaat.

## 11. Exact next actions untuk AI pembuat video

1. Baca `AGENTS.md`, dokumen ini, recovery `README.md`/`verification.json`, lalu
   periksa hanya file yang dirujuk jika perlu. Jangan menjalankan launcher lab
   r12, `prepare-r12.ts`, atau 48 episode. Jangan overwrite paket r12/v12.
2. Gunakan **Production Studio** secara berurutan: director/script → capture →
   edit/motion → sound → QA. Skills sesuai kebutuhan: `project-context`,
   `artifact-inspection`, `hackathon-pitch-review`, `playwright`,
   `product-studio:product-video-production`, `product-studio:video-quality-review`.
   Gunakan `workspace-hub` jika perlu mengatur workspace; tidak perlu tujuh agent,
   Higgsfield berbayar, model video generatif atau dependensi baru. Lihat
   `../2026-10-21-video-production-stack.md` untuk peran/tool dan batasnya.
3. Preflight hemat: `bun run check`, fokus browser connected jika source berubah,
   `ffmpeg -version`, `ffprobe -version`; cek cache Chromium/FFmpeg. Jangan build
   dua preview bersamaan karena `apps/web/dist` dipakai bersama. Cek `git status`
   dan pertahankan seluruh perubahan pengguna. Tidak ada push/deploy otomatis
   yang menjadi syarat capture lokal.
4. Buat direktori output baru, misalnya `delivery-output/final-v13-TAKE01`.
   Rekam ulang workflow TKM melalui scaffold yang sudah ada. Setelah izin
   produksi video diberikan, perintah dasar dari root:

   ```bash
   TMPDIR="$PWD/.playwright-cli/deepseek-test-tmp" \
   PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-cli/deepseek-browser-cache" \
   PLAYWRIGHT_CHROMIUM_EXECUTABLE="$PWD/.playwright-cli/deepseek-browser-cache/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell" \
   METHANE_E2E_TEMP_ROOT="$PWD/.playwright-cli/deepseek-test-tmp" \
   PLAYWRIGHT_OUTPUT_DIR="$PWD/delivery-output/final-v13-TAKE01/raw" \
   bun run test:e2e -- e2e/ai-review-workflow.spec.ts \
     --config docs/demo/connected-2026-10-20/capture.config.ts
   ```

   Config memakai hook cursor/markers aktual dan reviewer software DEMO scoped;
   tidak memanggil provider nyata atau transaksi blockchain. Cache recorder
   `ffmpeg-1013/ffmpeg-linux` tersedia saat handoff. `record.ts` lama memaksa
   `/usr/bin/chromium`; hindari wrapper itu karena cache Chromium yang cocok
   telah diverifikasi. Scaffold masih merekam langkah regresi/mobile; potong
   langkah di luar cerita, jangan memperlihatkan resize test sebagai UX normal.
   Capture planner10→20 terpisah dari regression main yang dirujuk S04. Untuk
   final take1080p, lakukan perubahan capture-only viewport/recording secara
   eksplisit, jangan mengubah data/results aplikasi. Jangan menyebut scaffold
  1440×1000 sebagai footage native1920×1080.
5. Simpan screenshot+JSON+markers+hash tiap take. `frozen-investigation-decision.json`
   adalah ekspor utama; `revisited-investigation-decision.json` menunjukkan
   keputusan yang sama dan revisit. Ambil expected digest dari reviewer yang
   mengekspor melalui kanal terpisah. Perintah verifier:

   ```bash
   bun --no-env-file scripts/verify-investigation-decision.ts \
     PATH_TO_EXPORTED_DECISION.json --expected-digest TRUSTED_0x_SHA256
   ```

   Record original→altered+rehashed→original pada **salinan disposable**, memakai
   canonical hashing helper `investigationDigest`, bukan menyunting berkas bukti
   beku. Jangan memasukkan credential RPC atau signing key. Untuk shot KAZ
   registry, gunakan retained proof berlabel; jika ingin transaksi lokal baru,
   kerjakan sebagai take terpisah dan catat source/digest/chain aktual. Transaksi
   publik dan panggilan AI berbayar tetap membutuhkan otorisasi tersendiri.
6. Gunakan still KAZ model yang ada untuk S06 tanpa request baru. Jika tidak
   terbaca, ubah framing/card dan perpendek narasi; jangan membuat respons model
   atau mengklaim AI TKM. Jika bukti registry tidak dapat divisualkan terbaca,
   gunakan diagram integrity + CLI TKM dan ubah kalimat S09 menjadi “A separate
   retained local-chain test also checked registry receipts.” Jangan mengganti
   ketidaktersediaan footage dengan explorer palsu.
7. Audition male voice hanya dengan teks publik; simpan voice ID/parameter,
   ukur durasi tiap cue. Musik orisinal di lokasi §8. Reuse arsitektur renderer
   Python/Pillow/NumPy/FFmpeg v12 sebagai referensi; tulis timeline/cues v13 baru.
   Jangan menjalankan renderer v12 lalu mengganti nama output menjadi v13.
8. Buat motion study pembuka+S04+S09; review kestabilan zoom dan reading holds.
   Assemble semua shot pada timeline280s, subtitle dari audio final, mix dan
   render master baru `MethaneResponse-Submission-v13.mp4`. Jangan overwrite v12.
9. Jalankan FFprobe, cek loudness/truepeak, extract contact sheet dan frame pada
   tiap transisi/quote/revision/rejection. Putar penuh untuk audio, privacy dan
   timing. Simpan `capture-manifest.json`, `claim-ledger.json`, SRT, master SHA-256
   dan review bertimecode. Artefak yang belum didengar/ditonton jangan disebut
   natural, final, atau lolos QA.
10. Serahkan MP4 lokal dan batas validasi kepada pengguna. Upload/publication,
    deployment dan status Devpost dilaporkan terpisah; jangan menganggap produksi
    video lokal otomatis menyelesaikan submission.
