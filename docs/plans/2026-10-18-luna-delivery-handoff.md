# Serah terima Luna — preview, presentasi, dan demo

**Checkpoint:** 18 Oktober 2026 · **Status:** persiapan delivery; belum ada deployment baru atau video baru.

Dokumen ini meneruskan pekerjaan pada working tree yang sama. Tujuannya menghemat pembacaan ulang, mempertahankan keputusan, dan memberi Luna pekerjaan yang konkret. Baca `AGENTS.md` dahulu; jika bukti repo berubah, perbarui asumsi yang terpengaruh.

## 1. Permintaan dan persetujuan pengguna

Hasil yang diminta:

1. Preview aplikasi yang dapat dibuka juri, memakai Render dan opsi tanpa biaya dahulu.
2. Materi presentasi profesional berbahasa Inggris untuk mendukung submission dan demo.
3. Video demo **tepat 4:00 / 240 detik**, dengan **teks Inggris dan musik instrumental orisinal**, tanpa narasi suara untuk versi ini.

**Perubahan keputusan pengguna, 19 Oktober 2026:** impor ZIP ke Notion dan publikasi halaman Notion dikeluarkan dari target delivery. Materi presentasi lokal tetap dapat dipakai untuk Devpost atau review; jangan membuat pekerjaan publikasi Notion sebagai blocker.

Pengguna memilih Render **“Andro's workspace”** dan meminta menyiapkan opsi gratis dahulu. Pemilihan workspace sudah disetujui dan tidak perlu ditanyakan ulang. Persetujuan ini belum menetapkan commit yang akan dipublikasikan atau mengizinkan paket berbayar. Siapkan hasil lokal yang bisa diperiksa sebelum meminta persetujuan tindakan eksternal yang belum tercakup.

Pengguna telah mengizinkan penambahan dan pelaksanaan tes. P4 review manusia ditunda; jangan membuka kembali kebutuhan pakar/pilot manusia sebagai prasyarat pengerjaan materi ini. Kebebasan implementasi lokal sudah diberikan. Jangan mengubah konfigurasi model/akun pengguna atau memulai pekerjaan berbayar.

## 2. Kondisi checkout — jangan hilangkan pekerjaan

- Repo: `/home/andro/dev/projects/Devpost/iEEE-Methane-response`.
- Branch lokal: `main`; HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041`.
- Remote: `https://github.com/AndroLay/MethaneResponse.git`.
- Sebelum dokumen ini dibuat terdapat **206 path changed/untracked**. Sebagian besar fitur terbaru ada di working tree, bukan pada HEAD. Angka ini adalah checkpoint, bukan jumlah yang harus tetap sama.
- Referensi lokal `origin/main` sama dengan HEAD saat diperiksa; belum dilakukan refresh remote pada tahap delivery.
- Jangan reset, clean, checkout menimpa, stash, commit seluruh working tree, atau push secara otomatis. Jangan menjalankan deployment dari `main` lama dan menyebutnya versi terbaru.
- Siapkan daftar sumber yang benar-benar akan diterbitkan; jangan mengunggah `.env`, private state, signer, token, arsip pihak ketiga tanpa hak, atau log sensitif. Publikasi source membutuhkan target yang jelas.
- Tidak ada perubahan kode/config delivery pada sesi persiapan sebelum serah terima ini. Dua agent hanya memberi review desain secara read-only.

## 3. Peta sistem dan capaian

| Bagian | Lokasi utama / kondisi |
|---|---|
| UI | `apps/web`: React, TypeScript, Vite; historical map, Cases, Evidence Auditor, Reports, verifier, casework |
| API | `apps/api`: Bun/Hono; rules, immutable audits, reviewer authorization, shared casework, publication, chain intents |
| Kontrak data | `packages/shared`: schema, claim/evidence semantics, DEMO fixtures |
| Data/riset | `data/real`, `services/data-pipeline`: snapshot/provenance, evaluasi Python; data riil terpisah dari DEMO |
| Blockchain | `contracts`, API chain adapter; Anvil lokal sudah diuji, Sepolia publik belum |
| Penyimpanan | JSON atomik satu writer, Linux `flock`; sengaja tanpa database, bukan multi-instance |

Alur produk: pilih sumber historis → tentukan klaim, tanggal/event → periksa cakupan referensi → rules baseline atau review berwenang → catat tindak lanjut → revisi/ekspor → verifikasi integritas. Publikasi ringkasan memerlukan consent dan otorisasi; full human assessment tetap privat.

| Paket | Capaian yang boleh diklaim | Batas yang masih berlaku |
|---|---|---|
| P1 | Shared casework, CAS/history, one-writer lock, backup/restore dan crash recovery lokal | Belum ada persistent volume remote |
| P2 | Deploy/anchor/recovery dan verifier benar-benar berjalan pada Anvil 31337 | Belum ada deployment atau receipt Sepolia publik; jangan ulang faucet tanpa informasi baru |
| P3 | Consent, correction/supersession/withdrawal, ringkasan publik dan audit privat lokal | Belum membuktikan publikasi eksternal |
| P4 | Remediasi engineering/riset dan paket siap review | Nol pakar manusia; ditunda pengguna |
| P5/P6 | Simulasi agent dan analisis selesai, temuan ditangani | Bukan pilot manusia atau benchmark provider; AI tidak terbukti mengungguli rules |
| Penguatan terbaru | Preset hari/periode UTC, Apply eksplisit, pemulihan draft, baseline tertahan saat draft, verifier dalam Reports dengan export context wajib | Tidak mengubah data historis menjadi bukti perbaikan fisik |

**Bukti terakhir yang dicatat:** `docs/evidence/product-value-2026-10-18/verification.json`: full local gate exit 0, **716 tes** (193 API + 253 web + 54 tooling + 212 Python + 4 Foundry), build/bundle lulus, App 71.724 gzip bytes. Empat skenario Chromium terfokus lulus, sandbox aktif, desktop 1600×1000 dan mobile viewport 390×844. Ini bukti run terdahulu pada sumber yang dibekukan, bukan tes baru pada perubahan delivery yang belum dibuat.

Perbandingan 16 tugas: app 16/16; manual raw 11/16 karena lima perbedaan format boolean/enum yang tidak ditentukan dalam prompt. Setelah pemetaan format yang dinyatakan post-hoc, manual 16/16: **paritas keputusan**, bukan kemenangan akurasi aplikasi. Hasil P5 sebelumnya juga tidak menunjukkan penghematan waktu agent. Jangan mengklaim keunggulan manusia, AI, emisi, atau skor juri dari ini.

Paket evidence lama sudah dibekukan. Jangan menimpa hasil atau checksum di dalamnya. Buat direktori evidence delivery baru untuk perubahan berikutnya. Target internal 18/20 belum merupakan nilai yang diberikan juri.

## 4. Bacaan awal yang cukup

Baca berurutan; jangan membuka semua dokumen, semua log, atau seluruh history chat:

1. `AGENTS.md` dan dokumen ini.
2. `docs/repository-map.md`, lalu `docs/architecture/overview.md` untuk struktur dan keputusan.
3. `docs/product/user-workflow.md` untuk alur pengguna.
4. `docs/evidence/product-value-2026-10-18/README.md` dan `verification.json` untuk capaian terbaru.
5. `docs/release/deployment.md`, `render.yaml`, `scripts/deployment-config.test.ts` untuk pekerjaan deploy.
6. `docs/research/three-historical-decision-cases-2026-10-18.md` untuk cerita dan batas fakta.
7. `docs/demo/README.md` dan `docs/demo/notion/README.md` untuk materi lama yang perlu diperbarui.

Gunakan `docs/release/current-implementation-status.md` dan ADR yang ditautkan bila perlu detail P1–P6; tidak perlu menjalankan ulang eksperimen lama untuk mulai delivery. Untuk implementasi, buka hanya jalur kode yang relevan.

## 5. Temuan Render yang sudah diperiksa

Workspace terpilih: `tea-d3akn7ruibrs73ccv4ig` (**Andro's workspace**). Konektor Render tersedia. `list_services` sudah dibaca setelah pengguna memilih workspace. **Tidak ada layanan MethaneResponse**; layanan yang ada milik proyek lain. Jangan mengubah layanan Evidrilo.

`render.yaml` saat ini:

- Hanya API; `runtime: node`, Bun 1.4.2, frozen install, `cd apps/api && bun run start`, health `/api/health`.
- Belum menetapkan `plan: free`; jangan mengandalkan default plan.
- `AUDIT_STORE_PATH=/tmp/methane-response-audits.json`; bersifat sementara.
- Belum membangun atau menyajikan frontend produksi.
- Launcher `scripts/start-api.ts` memakai util-linux `flock`; target remote harus menyediakannya.
- UI memakai URL relatif `/api` dan `/data`; proxy Vite hanya untuk development.
- `apps/api/src/app.ts`, handler `POST /api/audits`, menolak baseline tanpa admin pada `NODE_ENV=production`, kecuali `ENABLE_PUBLIC_BASELINE_AUDITS=true`. Jadi sekadar menerbitkan config lama membuat alur utama gagal.

**Arah desain yang direkomendasikan review:** satu web service Render `plan: free` yang membangun Vite dan menyajikan web + API pada origin yang sama. Ini rekomendasi, **belum diimplementasikan**. Alternatif dua layanan memerlukan API URL build frontend dan origin CORS yang tepat.

Kontrak implementasi minimal:

- `/api/*` tetap API; unknown API tidak boleh mendapat HTML SPA.
- Static root hanya `apps/web/dist`; dukung deep link dashboard, aset, favicon, dan snapshot. Tolak traversal, dotfiles, akses repo/state dan symlink keluar root.
- Pertahankan byte `.gz` yang diperiksa hash oleh browser; jangan salah memberi `Content-Encoding` sehingga file didekompresi dua kali.
- Siapkan mode baseline preview yang dibatasi. Jangan sekadar membuka semua penulisan publik dengan flag umum. Opsi yang dibahas: tiga kasus historis KAZ/LBY/CAN, menolak recipient/input privat, limit dan kapasitas terbatas, direktori state preview terpisah.
- Provider AI, reviewer privat, shared-team authority dan signer tidak dikonfigurasi pada preview publik. Pastikan tidak terbawa dari environment lokal; gunakan pola isolasi runner yang ada.
- Tampilkan batas preview yang relevan: data historis, state server sementara, unduh laporan dan jangan masukkan dokumen rahasia. Jangan menyebutnya hosting durable/production-ready.

Sumber resmi yang dibaca 18 Oktober: [Render Free](https://render.com/docs/free), [Bun version](https://render.com/docs/bun-version), [Blueprint spec](https://render.com/docs/blueprint-spec). Free service dapat tidur setelah 15 menit; file hilang saat tidur/restart/redeploy, tidak ada persistent disk. Kuota jam gratis dibagi per workspace. Bandwidth/pipeline dapat menimbulkan overage jika ada payment method; `plan: free` saja bukan jaminan semua pemakaian tanpa biaya. Konfirmasi batas penggunaan/spend yang tersedia sebelum mutasi; jangan mengubah billing proyek lain.

Jangan membuat layanan sampai sumber terbaru yang aman, konfigurasi, target, batas biaya dan rollback bisa diperiksa. Pengguna baru meminta **opsi gratis dahulu**. Untuk tindakan yang memerlukan approval, tunjukkan paket konkret dan minta hanya persetujuan yang memang belum ada; jangan menanyakan workspace lagi.

## 6. Cerita demo yang dipilih dalam review

Rekomendasi agent narasi: **KAZ_S_159, Kazakhstan, Oil and Gas**. Libya lebih sederhana tetapi hanya satu observasi; Kanada mudah mengundang klaim avoided tonnes yang belum terukur. KAZ memberi tiga observasi dan pertanyaan waktu yang jelas.

- Snapshot `unep-mars-675417694883` bersifat historis, bukan feed live.
- Tiga observasi KAZ: 7 Juni 2024 (591 ± 335 kg/h), 5 Juni 2026 (307 ± 66), 11 Juli 2026 (496 ± 226), EnMAP.
- Notification/feedback adalah aktivitas administratif, bukan bukti repair.
- Katalog UNEP mengatribusikan tindakan pada Juli 2026; tanggal/jam aksi tepat tidak diketahui. Jangan menyebut plume 11 Juli sebagai pengukuran setelah aksi.
- `source_detected` dapat mempunyai required references; `mitigation_confirmed` dari input aplikasi tetap insufficient evidence. Ini cakupan metadata yang disuplai, bukan bantahan terhadap laporan UNEP atau bukti bahwa perbaikan gagal.

| Waktu | Aksi dan bukti visual |
|---|---|
| 0:00–0:18 | Hook: “Feedback: Yes. What does the evidence establish?” |
| 0:18–0:45 | Sumber KAZ, snapshot historis, notification/feedback |
| 0:45–1:15 | Tiga observasi; jelaskan ketidakpastian waktu aksi Juli |
| 1:15–1:40 | Preset periode/event UTC, status draft, lalu Apply |
| 1:40–2:15 | Baseline: source detection references present; mitigation insufficient |
| 2:15–2:40 | Case work: minta tanggal aksi dan pengukuran terkait setelah aksi; bukan penugasan eksternal nyata |
| 2:40–3:00 | Ekspor JSON dari hasil aktual |
| 3:00–3:22 | Reports: file asli lolos digest dan export-context checksum |
| 3:22–3:42 | Pilih salinan yang benar-benar diubah; tampilkan penolakan |
| 3:42–4:00 | Tutup dengan nilai traceability dan tindak lanjut, batas integritas/hasil fisik |

Ini outline 240 detik, bukan rekaman yang sudah selesai. Scope/event yang dipilih harus konsisten antara kedua baseline dan laporan. Tamper harus menjelaskan field yang berubah dan pemeriksaan yang menolaknya. Hash tanpa trusted commitment dapat dihitung ulang; ia bukan bukti issuer atau kebenaran fisik. Jangan menampilkan receipt Sepolia yang tidak ada atau AI seolah sedang digunakan.

## 7. Eksekusi yang diminta kepada Luna

Kerjakan berurutan dan laporkan checkpoint singkat. Gunakan satu penulis; delegasi hanya pekerjaan independen yang benar-benar berguna. Jangan membuat swarm ulang untuk discovery yang sudah tuntas.

### A. Packaging dan gate lokal

1. Konfirmasi hanya status checkout dan file yang relevan; buat rencana ringkas berdasarkan temuan di atas.
2. Terapkan profil preview yang aman beserta regresi. Ikuti skills yang terpicu; tes sudah diizinkan.
3. Uji production build melalui origin yang sama: health, root/deep link, aset/snapshot terverifikasi, baseline tiga kasus yang diizinkan, export/verifier, penolakan path/operasi privat dan limit.
4. Catat exact source binding, log minimal, gambar UI aktual, status local/remote dan rollback. Jalankan check yang cukup untuk perubahan; full gate bila diperlukan oleh risikonya. Jangan menyebut 716 sebagai hasil perubahan baru tanpa menjalankannya.

### B. Materi presentasi untuk submission

1. Pertahankan materi story v4 yang sudah ada sebagai dokumen lokal untuk Devpost dan review; tidak perlu membuat paket impor platform lain.
2. Jaga satu claim ledger untuk presentasi, script, caption dan video: masalah → satu kasus → aksi → hasil → pembeda → manfaat dan batas yang terbukti → langkah berikutnya.
3. Pertahankan atribusi sumber, Q&A, runbook Indonesia, dan screenshot aktual. Jangan menyebut materi lokal sebagai halaman publik atau submission yang telah dikirim.

### C. Produksi video 240 detik

1. Baca skill `product-studio:product-video-production`; buat storyboard gerak dan shot list. Rekam UI nyata versi terbaru pada state disposable, tanpa credentials atau request eksternal yang tidak dibutuhkan.
2. Buat urutan pendek yang paling sulit dahulu (aksi UI → hasil → verifikasi/tamper), periksa keterbacaan, lalu perluas menjadi 240 detik.
3. Tool lokal tersedia: ffmpeg/ffprobe, Chromium, Bun/Node, PIL/Cairo/NumPy. Remotion/TTS belum tersedia dan tidak dibutuhkan untuk pilihan teks + musik ini. Jangan install dependency besar/berbayar secara implisit.
4. Buat musik instrumental orisinal; jangan mengambil musik tanpa lisensi. Caption Inggris harus cukup lama terbaca dan mengikuti footage. Actual interaction harus terlihat; hindari 240 detik slideshow statis yang hanya mengganti judul.
5. Ekspor MP4 1920×1080, H.264/yuv420p, target 30 fps, durasi 240 detik; SRT, script, serta source/render instructions disertakan. Simpan media besar di output lokal terpisah dari source yang akan dipush.
6. Gunakan `product-studio:video-quality-review`: ffprobe, full decode, digest, frame/transition checks, dan playback/audio bila tersedia. Jika tidak dapat mendengar/menonton penuh, catat batas QA secara jujur; render sukses saja bukan putusan artistik final.

### D. Publikasi yang disetujui dan penutupan

1. Setelah paket konkret, mintakan hanya approval mutasi eksternal yang masih perlu: exact source publication/branch, pembuatan layanan Render gratis, atau publikasi halaman/video. Jangan kontak orang lain atau submit Devpost otomatis.
2. Bila disetujui, deploy exact source yang diperiksa. Verifikasi HTTPS dan alur dari URL publik; hasil local/tunnel tidak menggantikan remote. Catat service ID, deploy ID, commit, URL, waktu dan rollback.
3. Berikan tautan/output aktual dan pisahkan status: kode lokal, preview remote, materi presentasi lokal, MP4 lokal, video terunggah. Tunda hanya bagian yang membutuhkan akses/approval yang belum ada; selesaikan pekerjaan lain.

## 8. Komando dan bukti praktis

Mulai tanpa mengubah state:

```bash
pwd
git status --short
git rev-parse HEAD
```

Check utama yang sudah ada (pilih sesuai perubahan, jangan jalankan semua untuk sekadar membaca serah terima):

```bash
bun run check
bun test scripts/deployment-config.test.ts
bun run build:web
bun run check:web-bundle
bun run check:all
```

Browser terfokus:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e e2e/audit-workflow.spec.ts --grep 'scope presets and report verification'
```

Browser memakai Chromium sandbox aktif; jangan mematikannya untuk mengatasi pembatasan socket filesystem sandbox. Jika dibutuhkan, gunakan approval tool yang sesuai. Runner E2E sudah menyaring environment dan state; baca `scripts/e2e-runner-utils.ts`, `scripts/run-e2e.ts` dan `playwright.config.ts` sebelum membuat capture runner baru. Jangan membaca atau mencetak file `.env` berisi nilai rahasia.

Paket 716 tes: `docs/evidence/product-value-2026-10-18/`; paket agent P5/P6 dan simulasi integrasi tetap historis. Link, manifest, checksum dan ZIP bisa diperiksa tanpa mengulang seluruh suite.

Aturan event terakhir dibaca 18 Oktober: [Rules](https://ieee-climatechain-hack.devpost.com/rules) meminta video 3–5 menit, repo dan track alignment; empat menit sesuai rentang. Overview menampilkan deadline 25 Oktober 17.00 UTC+3 / 22.00 WITA; target internal tetap sebelum 21 Oktober. Eligibility Rules/Overview belum selaras dan bukan tugas yang sudah selesai. `docs/release/event-requirements.md` masih berisi catatan 16 Oktober; jangan menyajikan konflik waktu lama sebagai fakta halaman terkini tanpa refresh.

## 9. Batas tetap

Feedback ≠ repair. Tidak ada plume lanjutan ≠ nol methane. Receipt ≠ kebenaran fisik. Rules ≠ autentikasi dokumen. Simulasi agent ≠ pakar/pilot manusia. Static screenshot ≠ fitur remote terverifikasi. Materi lokal ≠ submission terkirim. MP4 lokal ≠ video sudah diunggah. Jangan menaikkan skor internal secara otomatis karena fitur, tes, atau presentasi selesai.

**Mulai dari A.** Penyerahan ini tidak memerlukan ulang penilaian seluruh produk atau P1–P6. Selesaikan delivery yang disepakati, dengan batas bukti dan biaya tetap jelas.
