# MethaneResponse — workspace, skills dan pipeline produksi video

**Tanggal:** 21 Oktober 2026. **Status:** kontrak produksi dan inventaris lokal,
bukan klaim bahwa video baru sudah dibuat atau semua tool sudah diuji ulang.

## 1. Brief yang dikerjakan

- Film presentasi + demo berbahasa Inggris, satu investigasi utama dan tiga
  pembuktian: alokasi 10→20, assessment dokumen dengan kutipan, commitment kontrak.
- Acuan editorial pengguna: `MethaneResponse_Panel_Simulasi_dan_Video_Final_4m40.md`.
- Revisi yang dibutuhkan: pentingnya masalah iklim di pembuka, hasil AI yang
  dapat ditindaklanjuti, chronology revisit yang benar dan pacing suara natural.
- Target **280 detik / 4:40**, sembilan adegan, 1920×1080, 16:9, 25 fps.
  Target ini setara 7.000 frame; hasil ekspor harus diukur, tidak diasumsikan.
- Cursor jelas, zoom fokus yang stabil, diagram bergerak sesuai ucapan, **narator
  pria berbahasa Inggris dengan target prosodi natural**, dan instrumental
  orisinal yang sudah dimiliki proyek. Preferensi pria diminta pengguna 21 Oktober.
- Produk aktual adalah sumber kebenaran. Panel simulasi merupakan masukan
  editorial, bukan penelitian pengguna atau hasil penjurian.

## 2. Workspace dan tanggung jawab

**Workspace utama: Production Studio.** Ini konteks kerja dengan keluaran yang
jelas, bukan server, akun baru, aplikasi berbayar atau tujuh agent yang otomatis
dijalankan. Agent utama dapat mengerjakan beberapa peran secara berurutan.

| Peran | Tanggung jawab | Keluaran yang dapat diperiksa |
|---|---|---|
| Creative Director | Janji produk, audiens, arah visual dan tiga pembuktian | Treatment dan keputusan adegan |
| Scriptwriter | Narasi Inggris, terminologi awam, sumber dan batas klaim | Script + claim ledger |
| Storyboard / Motion Designer | Entry, fokus, aksi, reading hold, exit, cursor dan kamera | Shot table + motion study pendek |
| Capture / Engineering | Aplikasi aktual, source/claim/scope sama, provider dan Anvil | Raw footage dan manifest binding |
| Video Editor | Ritme, transisi, keterbacaan hasil, timeline final | Playable draft dan master |
| Sound Designer | Prosodi, jeda, musik rendah, sinkronisasi suara | Voice/music stems dan mix |
| Video Reviewer | Playback, hasil teknis, konsistensi produk dan hak aset | Review bertimecode dan status final |

Presentation Studio menjadi perspektif pendukung bila perlu mengevaluasi diagram
penjelas; tidak ada kewajiban membuat deck PowerPoint terpisah. Hackathon War Room
menjadi perspektif akhir untuk aturan, tautan dan paket submission. Engineering
Lab hanya dipakai untuk memperbaiki blocker capture/verifikasi aplikasi. Tidak
ada orkestrasi agent paralel yang dijalankan hanya karena peran ini didaftarkan.

## 3. Skills utama yang digunakan

| Skill | Fungsi dalam pekerjaan ini | Kapan digunakan |
|---|---|---|
| `project-context` | Membaca aturan repo, runtime dan sumber bukti terbaru | Awal dan saat revisi aplikasi berubah |
| `artifact-inspection` | Memeriksa dokumen referensi, MP4, metadata dan frame aktual | Review referensi dan artefak |
| `workspace-hub` → Production Studio | Mengatur brief, peran, handoff dan acceptance | Kontrak kerja produksi |
| `hackathon-pitch-review` | Menautkan masalah, manfaat, demo, klaim dan kriteria acara | Script, storyboard dan review cerita |
| `product-studio:product-video-production` | Motion, komposisi, staging, kamera, transisi dan finishing | Produksi adegan dan editing |
| `playwright` | Browser aktual, interaksi, pengambilan footage dan hasil | Capture aplikasi dan pemeriksaan workflow |
| `product-studio:video-quality-review` | Audit ekspor dan inspeksi audiovisual yang terikat hash file | Draft penting dan master final |

Skills pendukung digunakan hanya ketika kebutuhan aktualnya muncul:

- `engineering-excellence:quality-engineering`: regresi dan pembuktian baru untuk
  AI/source/reviewer/chain yang direkam; bukan mengulang angka tes lama.
- `superpowers:systematic-debugging`: menelusuri kegagalan capture, timing,
  renderer atau verifier sebelum mengubah solusi.
- `superpowers:verification-before-completion`: memeriksa artefak versi tepat
  sebelum menyebut suatu pekerjaan selesai.
- `computer-use`: playback normal-speed dan pemeriksaan pemutar/desktop bila
  sesi GUI benar-benar tersedia. Tidak menggantikan listening dengan metadata.
- `screenshot`: hanya untuk kebutuhan desktop yang eksplisit; browser screenshot
  dapat diambil melalui jalur Playwright yang sudah digunakan.

Tidak semua skill harus dimuat pada awal atau dipanggil pada setiap adegan.

## 4. Tool produksi dan status yang diperiksa

Discovery lokal dijalankan 21 Oktober. Presence/version check berbeda dari smoke
render baru. Bukti video v12 dan browser publik sebelumnya tetap terikat run asal.

| Tool | Penggunaan yang dipilih | Status saat inventaris |
|---|---|---|
| Bun + aplikasi React/Hono yang ada | Runtime demo dan API nyata | Stack repo aktif; runtime/capture baru perlu preflight |
| `@playwright/test` 1.64.1 + Chromium | Rekaman UI, cursor/action timestamps dan screenshot | Paket terdeteksi; Chromium cocok pernah dipakai pada proof 21 Oktober |
| Python + Pillow + NumPy | Diagram, teks tajam, camera paths dan komposit | Modul terdeteksi; renderer v12 sudah memakai jalur ini |
| FFmpeg + FFprobe | Trim, assembly, audio mix, subtitle, encoding dan pengukuran | Executable/version tersedia; pipeline v12 ada |
| `edge-tts` + voice pria Inggris yang lolos audition | Jalur kandidat narasi baru; pilih voice ID setelah katalog dan sampel diperiksa | Runtime cache tersedia; v12 memakai Ava wanita, bukan pilihan untuk cut baru |
| Instrumental WAV orisinal proyek | Musik dasar, ducking dan fade | Aset v4 yang dipakai v12; binding SHA/hak pakai dicatat ulang |
| Foundry / Anvil + EvidenceRegistry + viem | Transaksi/receipt/event untuk keputusan tepat | `anvil`/`forge` tersedia; chain baru dan bukti source sama harus dijalankan |
| Verifier CLI repository | Original/modified+rehash/original dan commitment terpisah | Source tersedia; hasil yang direkam perlu run baru |
| Git + JSON manifests + SHA-256 | Source revision, shot input dan export provenance | Jalur repo yang ada |

Voice-over tetap **sintetis** bila memakai TTS. Prosodi human-like adalah target
yang harus didengar dan diperbaiki, bukan jaminan dari nama voice. Kirim hanya
naskah publik ke layanan suara; jangan mengirim dokumen pengguna, token atau
capture privat. Jangan meniru identitas orang tertentu atau menganggap akses TTS
sebagai jaminan lisensi/layanan gratis permanen.

### Casting suara pria — keputusan pengguna

- Narator pria dewasa berbahasa Inggris, hangat, tenang, percaya diri dan jelas.
  Intonasi mengikuti makna, dengan penekanan pada pertanyaan, temuan dan next action.
- Audition 20–30 detik memakai pembuka dan satu hasil AI. Periksa pula MARS,
  UNEP, methane, source ID, uncertainty dan Anvil pada sampel terpisah.
- Pilih voice melalui katalog provider aktual; voice ID belum dikunci atau diuji
  untuk cut baru. `en-US-AvaMultilingualNeural` hanya catatan historis v12.
- Pilih tempo bicara natural, titik napas dan jeda kalimat berdasarkan listening.
  Target awal 125–145 kata/menit saat bicara, lalu sesuaikan dengan reading holds
  dan tindakan UI. Jangan memanjangkan jeda untuk mengisi durasi.
- Dengar continuity antar-cue, stress, sibilance dan akhir kalimat sebelum render
  penuh. Jika sampel terdengar kaku, ubah phrasing atau pilih voice lain terlebih dahulu.
- Tidak melakukan voice cloning atau mengklaim narator manusia. Request ini
  memperbarui casting cut berikutnya; soundtrack dan hasil verifikasi v12 tetap utuh.

### Pilihan opsional dan statusnya

| Skill/tool | Status | Keputusan |
|---|---|---|
| `remotion-best-practices` / Remotion | Skill terpasang; paket Remotion tidak terdeklarasi/resolve pada repo | Opsional bila motion study membuktikan kebutuhan; belum dipilih sebagai mesin utama |
| `hyperframes:hyperframes`, `hyperframes:gsap` | Skill tersedia; runtime proyek/capture/render belum diuji | Opsional untuk shot HTML/SVG spesifik; bukan dependency wajib |
| Kdenlive / MLT | Executable terdeteksi; GUI/project pipeline belum diuji | Opsional untuk inspeksi/edit manual; bukan syarat ekspor |
| Blender | Tidak terdeteksi pada discovery | Tidak dijadikan ketergantungan rencana |
| Higgsfield | Tidak ada tool callable yang teridentifikasi dalam katalog sesi | Tidak dijanjikan; akses, biaya dan hak output belum diverifikasi |
| `imagegen` | Kemampuan tersedia, tidak diperlukan untuk proof utama | Opsional untuk aset penjelas orisinal; tidak menggantikan rekaman/peta/evidence |
| `presentations:Presentations` | Skill tersedia | Dipakai hanya bila deck editable terpisah diminta |

Tidak menambah renderer hanya demi memakai banyak teknologi. Jalur utama memakai
pipeline lokal yang sudah menghasilkan v12, lalu diperbaiki berdasarkan motion
study dan playback aktual. Skill tersedia bukan bukti autentikasi layanan.

## 5. Struktur berkas produksi yang direncanakan

Seluruh pekerjaan tetap di repository MethaneResponse. Tidak mengubah Evidrilo.
Folder baru di bawah adalah rancangan; tidak semuanya sudah dibuat.

```text
docs/demo/delivery-2026-10-21-final-v13/
  README.md
  treatment.md
  story.json
  shot-table.md
  claim-ledger.md
  asset-ledger.md
  delivery-spec.json
  render.py / visuals.py / narration.py / finish.py
  review.md
  verification.json

delivery-output/story-v13/             # output besar/private; di luar Git
  capture/                           # raw UI, shot/action clocks
  proofs/                            # exact source/scope/decision/chain evidence
  voice-cues/                        # audio cue + word timing
  audio/                             # voice/music/mix stems
  motion-study/                      # 20–35 detik untuk evaluasi jalur terberat
  previews/
  review/                            # frame samples, decode/audio checks
  MethaneResponse-Final-Presentation-Demo-v13.mp4
  MethaneResponse-Final-Presentation-Demo-v13.en.srt
  manifest.json
```

v12 tidak ditimpa. Jika nama v13 sudah dipakai saat produksi, gunakan versi baru.
Jangan memindahkan secrets ke folder publik. Config AI di `data/state/` tetap
privat dan tidak disertakan dalam ZIP/source/manifest. Raw Playwright traces
dapat mengandung request/token; matikan untuk sesi sensitif atau simpan privat,
dan jangan otomatis memasukkannya ke judging pack.

## 6. Pipeline kerja berurutan

### A — Lock cerita dan claim ledger

Kunci sembilan adegan dan tiga hasil. Setiap kalimat hasil mempunyai source,
status historical/DEMO/observed/proposed dan rencana shot. Sesuaikan hook agar
menjelaskan konteks iklim; pisahkan klaim manfaat potensial dari hasil terukur.

### B — Preflight alur satu kasus

Pastikan TKM_S_021 benar-benar terpilih pada plan yang diterima, source/snapshot/
claim/periode sama dari assessment sampai decision. Bukti provider lama memakai
KAZ_S_159 sehingga tidak boleh disamarkan menjadi TKM. Lakukan pemanggilan model
baru yang terbatas pada excerpt DEMO sah melalui backend, review terotorisasi,
dan anchor kontrak lokal untuk keputusan yang sama. Catat izin/batas pemakaian
provider yang berlaku; tidak memakai layanan generation berbayar baru otomatis.

Periksa izin dokumen, fonts/basemap/music dan ruang disk/kuota sebelum capture.
Gunakan akun/identitas reviewer DEMO, local chain 31337 dan tidak ada dana publik.

### C — Capture aktual

Rekam build yang sama secara lokal untuk reviewer/chain. Preview Render dipakai
sebagai demonstrasi URL publik yang memang terbatas; jangan menyamakan keduanya.
Ambil action timestamps untuk cursor, loading dan hasil. Siapkan input sebelum
take; nilai/hasil tetap berasal dari runtime aktual. Token tidak terlihat.

Untuk revisit, pilih event respons DEMO baru setelah freeze agar urutan jelas.
Snapshot yang sudah tercakup dalam dossier tidak dipentaskan sebagai update baru.

### D — Uji motion study

Buat 20–35 detik berisi transisi penjelasan→UI, cursor, zoom formulir, exact quote,
result hold dan suara. Inspeksi pada kecepatan normal sebelum membangun 280 detik.
Jika kamera berguncang atau teks sulit dibaca, perbaiki pola motion terlebih dahulu.

### E — Narasi dan sound

Revisi sekitar 397 kata draft utama sesuai hasil aktual. Pilih tempo percakapan;
alokasikan waktu untuk membaca hasil dan aksi, jangan melambatkan suara untuk
memenuhi durasi. Uji satu paragraf sulit lebih dahulu, termasuk MARS, UNEP dan
source ID. Gunakan word boundaries sebagai dasar caption/reveal, lalu periksa
sinkronisasi hasil render. Duck instrumental saat ucapan; simpan stems terpisah.

### F — Assembly dan master

Render diagram/overlay secara deterministik 25 fps. Pertahankan input resolusi
cukup untuk crop; pembesaran tidak menciptakan detail yang tidak direkam. Gunakan
intermediate yang sesuai, batasi render concurrency dan hindari encode lossy
berulang. Tentukan color handling, caption-safe areas dan durasi shot secara eksplisit.

### G — Verifikasi final

- Ukur durasi/frame cadence, codec/dimensi, full decode, subtitle dan audio peaks.
- Periksa source ID, exact quote, reviewer role, dossier hash, issuer/registry,
  chain ID, transaction/event dan hasil verifier pada shot yang tepat.
- Bandingkan file asli dengan commitment tepercaya; rekam penolakan salinan yang
  diubah dan dihitung ulang checksum-nya, kemudian original diterima lagi.
- Tonton penuh normal-speed dengan suara; cek transisi, naturalitas ucapan,
  jeda, cursor dan waktu membaca. Jika listening/GUI tidak tersedia, tulis
  `not_reviewed` dan jangan menyebut artistic final approval sudah diperoleh.
- Uji phone-legibility bila perangkat tersedia; viewport emulation berbeda dari
  pemutaran HP fisik. Jangan mengklaim keduanya setara.
- Ikat laporan verifikasi ke SHA-256 ekspor tepat. Hasil audit v12 tidak berlaku
  otomatis untuk v13.

### H — Delivery dan publikasi

Serahkan MP4, SRT, sumber editable, asset/claim ledger, manifest dan review.
Upload video/submission adalah tahap terpisah sesuai izin dan akses yang berlaku.
Dokumen ini sendiri tidak mengunggah, membelanjakan biaya atau mengubah deployment.

## 7. Standar visual dan audio

- Navy/teal mengikuti produk; amber menunjukkan gap, merah untuk integrity fail.
- Diagram memberi urutan sebab-akibat; exact UI text tetap berasal dari footage.
- Zoom in pada alasan pilihan, quote, verdict, revision dan receipt. Kamera stabil
  saat typing/scroll dan kembali ke konteks sebelum navigasi berikutnya.
- Cursor jelas dengan jeda sebelum klik; tidak mengarang aksi atau response timing.
- Reading hold direncanakan pada hasil planner, kutipan, keputusan dan tamper fail.
- Output H.264/AAC stereo 48 kHz; level voice/music diperiksa melalui meter dan
  listening. Acuan mix sekitar −16 sampai −18 LUFS integrated dan true peak
  maksimal −1 dBTP adalah target finishing, bukan hasil yang sudah diukur.
- Narasi/diagram/caption mengikuti satu timeline. Latensi yang dipadatkan perlu
  penanda; jangan mengklaim kecepatan realtime dari edit.
- Label relevan: historical data, DEMO document/real provider, DEMO reviewer,
  local Anvil31337 dan integrity boundary.

## 8. Status pada saat dokumen ini dibuat

**Selesai:** inventaris skill/tool lokal, pemilihan pipeline dan kontrak produksi.
**Ada dari versi terdahulu:** v12, renderer/narration/mix scripts, raw captures,
instrumental, bukti API/model publik dan kontrak lokal pada kasus yang tercatat.
**Belum dibuat untuk cut baru:** satu-kasus TKM AI+decision+Anvil capture, motion
study baru, suara baru, master v13, audit ekspor dan playback/listening final.

Jumlah skill, efek, agent atau tool tidak menjadi ukuran keberhasilan film.
Keberhasilan ditentukan oleh cerita yang dimengerti, proof aktual yang konsisten,
keterbacaan dan kualitas audiovisual yang benar-benar diperiksa.

## Referensi internal

- [Pembahasan dan naskah produk terkini](2026-10-21-current-product-narrative.md).
- [v12 dan sumber editable](delivery-2026-10-19-final-v12/README.md).
- [Connected Investigations](../development/connected-investigations.md).
- [DeepSeek nyata](../evidence/deepseek-live-2026-10-21/README.md).
- [Batas preview Render](../evidence/render-preview-2026-10-21/README.md).
