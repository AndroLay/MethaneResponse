# Evidence Decision Lab — 19 Oktober 2026

Increment prototipe dari baseline `8e19c034e666a6b00d93b4cb3f5747f563c75aab`. Source runtime dan regresi baru diikat melalui SHA-256 pada [verification.json](proof/verification.json); perubahan ini belum dinyatakan sudah push/deploy. Bukti, video dan judging pack terdahulu tidak ditulis ulang.

## Keputusan yang kini dapat diperiksa

**Pertanyaan produk:** referensi mana yang mengubah keputusan, dan bukti apa yang harus diperoleh berikutnya?

| Kemampuan | Implementasi dan batas |
|---|---|
| Eligibility trace | Alasan referensi mendukung, berlawanan atau dikeluarkan, memakai policy baseline yang sama. Tanggal/event/penerima serta action/follow-up tetap diperlukan sesuai kategori. Metadata eligible bukan autentikasi isi dokumen. |
| Sensitivity | Hapus satu ID dan jalankan policy kembali; maksimal delapan dependency individual dan satu penghapusan aggregate. Sisa individual yang tidak ditampilkan dihitung eksplisit. Bukan probabilitas repair, uncertainty ilmiah atau forecast. |
| Evidence request | Draft Markdown berisi source/scope, snapshot/hash, attribution/license, keterbatasan serta acceptance checks. Tidak mengirim email atau mengubah status kerja otomatis. |
| Replay | Unduh input, trace, sensitivity, versi policy dan digest. Browser serta CLI memeriksa checksum lalu menghitung ulang hasil. Unsigned; autentisitas membutuhkan penerbit/commitment tepercaya terpisah. |
| Human handoff | Aksi eksplisit ke human assessment dan follow-up pada investigasi yang dipilih. Jalur reviewer/otorisasi serta audit schema 2/3/4 dipertahankan. |
| Authored challenges | Lima fixture DEMO terpisah; tidak mengganti audit atau metadata kasus nyata. Menunjukkan lengkap, follow-up hilang, di luar periode, contrary dan konflik. |

Tidak ada database, model frontend, kontrak baru atau dependency baru. API membatasi body 16 KiB dan analisis 20 per menit per client dengan limiter terpisah. Evidence berasal dari snapshot server; field evidence/provenance yang disuntikkan klien ditolak. Analisis tidak menulis audit, memanggil provider AI, atau mengambil dokumen eksternal.

## Coba melalui aplikasi

Jalankan API dan web mengikuti [setup lokal](../../development/local-setup.md). Buka `/dashboard/audit?sourceId=KAZ_S_159`.

1. Pilih claim `source_detected`, lalu **Decision Lab → Explain current evidence**. Tiga referensi deteksi source-level memenuhi aturan. Menghapus seluruh referensi eligible mengubah hasil menjadi insufficient.
2. Kembali ke scope controls, terapkan hari UTC `2024-06-07`, lalu ulangi analisis. Hanya satu dari tiga referensi eligible; dua lainnya dikeluarkan karena berada di luar periode. Menghapus satu referensi tersebut mengubah hasil.
3. Pilih klaim mitigasi dalam periode yang sesuai. Tinjau action/follow-up checks dan unduh evidence request. Hasil insufficient menyatakan kekurangan referensi yang dimuat, bukan bukti repair tidak terjadi.
4. Buka synthetic challenges. **Complete reference metadata** menghasilkan required references present; **missing follow-up** menghasilkan insufficient; **contrary** menghasilkan contrary reference present; **conflict** menghasilkan insufficient dan adjudication request. Skenario di luar periode juga insufficient.
5. Pada conflict, hapus supporting reference → contrary; hapus contrary reference → supported; hapus keduanya → insufficient. Ini perubahan policy yang dapat direplay, bukan kejadian lingkungan.
6. **Return to selected MARS source** mengembalikan konteks nyata. Lanjutkan ke human assessment atau buka follow-up, salin draft yang telah ditinjau dan simpan melalui workflow yang sudah ada.

Scope draft harus diterapkan terlebih dahulu. Perubahan source/claim/scope/snapshot menghapus konteks hasil dan membatalkan request lama. State loading, unavailable source, stale snapshot, permission preview, rate limit, clipboard fallback dan error tersedia. Trace dimulai dengan 20 baris, lalu ditambah 50 per aksi. Chunk Decision Lab dimuat saat langkahnya dibuka.

## Hasil yang direkam

- [Enam analisis historis dan source binding](proof/verification.json): KAZ_S_159, LBY_S_143, CAN_S_002, masing-masing klaim deteksi dan mitigasi. Deteksi supported; mitigasi insufficient pada referensi yang dimuat. **6/6 cocok dengan saved baseline**. Ini conformance test kecil menggunakan policy yang sama, bukan akurasi terhadap gold independen.
- [Contoh permintaan bukti KAZ](proof/KAZ_S_159-mitigation_confirmed-request.md), dengan snapshot `unep-mars-675417694883`, archive hash dan lisensi tercatat. JSON serta request untuk dua sumber lain tersedia di folder yang sama.
- [Lima challenge DEMO](proof/DEMO-conflict.json) menggunakan sumber buatan `DEMO_DECISION_LAB`; tidak ada operator, pengukuran atau repair nyata yang direpresentasikan.
- [Empat pemeriksaan CLI](cli-verification.json): replay original dan expected digest cocok diterima; perubahan isi dan expected digest salah ditolak.
- [Transaksi Anvil aktual](local-chain-proof.json): deploy lokal, anchor audit deteksi KAZ_S_159, verifier proses terpisah menerima original, lalu menolak laporan yang diubah **dan dihash ulang** karena receipt/event terikat pada commitment lama. Bukti juga merekam historical receipt, forged issuer, revert, SIGKILL sebelum/sesudah broadcast, serta RPC acknowledgement yang hilang. Ini chain disposable **31337**, bukan Sepolia; endpoint chain tidak tetap hidup setelah pengujian.

CAN_S_002 mempunyai tautan laporan mitigasi resmi pada UI. Trace ini hanya memeriksa referensi metadata yang dimuat; tidak mengekstrak atau mereproduksi isi laporan berlisensi terpisah. Hasil insufficient tidak menyangkal laporan penerbit atau menyatakan fasilitas tidak diperbaiki.

## Pemeriksaan dan reproduksi

Lihat [hasil run](checks.json) dan [cuplikan output aktual](checks-output.txt) untuk counts dan status lokal/remote. Gate utama: **735 tes** (210 API, 255 web, 54 tooling, 212 Python, 4 Foundry), frozen install, typecheck API/web/E2E/evaluation, production build, bundle budget dan baseline conformance. **26 skenario browser** lulus dalam satu invocation lengkap (17 utama + 9 privat/tim/publikasi/mock-provider), tanpa skip/retry otomatis. Empat helper runner dan satu integrasi chain/42 assertions dicatat terpisah agar tidak menghitung ulang focused repeats.

```bash
bun run check:all
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium bun run test:e2e
bun run test:chain-integration --evidence /tmp/methane-new-chain-proof.json
bun run prove:decision --output /tmp/methane-new-decision-proof
bun run prove:decision --verify docs/evidence/decision-lab-2026-10-19/proof/KAZ_S_159-source_detected.json
```

Output directory proof harus belum ada; script menolak overwrite. `--expected-digest 0x…` dapat dipakai untuk membandingkan digest dengan commitment yang diperoleh melalui kanal tepercaya. Kompatibilitas replay masa depan memerlukan implementasi policy versi yang dicatat; format baru tidak mengganti audit bundle/receipt lama.

Runtime lokal Bun **1.4.3**, sedangkan pin repo tetap 1.4.2. Python, Foundry dan Chromium menggunakan tool lokal yang tercatat pada hasil pemeriksaan. Browser memakai SwiftShader dan sandbox aktif; mobile adalah viewport emulation, bukan HP fisik atau benchmark FPS.

Screenshot aplikasi aktual: [desktop, source nyata](decision-lab-real-desktop.png) · [mobile, challenge DEMO konflik](decision-lab-challenge-mobile.png). Capture terfokus terpisah tidak ditambahkan lagi ke jumlah skenario suite lengkap.

## Peta perubahan

| Berkas | Tanggung jawab |
|---|---|
| [Shared policy](../../../packages/shared/src/decision-lab.ts) | Skema, eligibility trace, bounded sensitivity, digest/replay dan authored fixtures; subpath package additive |
| [API](../../../apps/api/src/app.ts) · [regresi](../../../apps/api/src/decision-lab.test.ts) | Dua route non-persistent, source/snapshot binding, preview/input/rate-limit boundaries |
| [Panel](../../../apps/web/src/DecisionLabPanel.tsx) · [client/export](../../../apps/web/src/decision-lab.ts) | Lazy step, error/permission states, replay, export, handoff dan responsive styles |
| [Proof runner](../../../scripts/decision-lab-proof.ts) | Enam historical plans, lima authored challenges, baseline parity, source hashes dan CLI verification |
| [Browser policy](../../../scripts/e2e-runner-utils.ts) · [E2E](../../../e2e/audit-workflow.spec.ts) | Hosted-runner compatibility, local sandbox, credential isolation dan workflow/capture regresi |
| [Chain integration](../../../scripts/chain-integration.test.ts) | Actual local transaction dan penolakan rehashed tampering pada real-source audit |

Tidak ada migrasi database atau perubahan kontrak Solidity. Audit schema/receipt historis dipertahankan; DecisionPlan schema 1 merupakan artefak analisis terpisah.

### CI dan kegagalan yang ditangani

- GitHub Actions baseline [run 39237532964](https://github.com/AndroLay/MethaneResponse/actions/runs/39237532964) gagal sebelum assertion E2E: `No usable sandbox`. Policy baru mengecualikan sandbox hanya bila `CI=true`, `GITHUB_ACTIONS=true`, dan `RUNNER_ENVIRONMENT=github-hosted`; local, self-hosted serta CI tak dikenal tetap sandboxed. Empat regresi helper memeriksa policy dan isolasi credential. **Run GitHub untuk perubahan baru belum tersedia.**
- Gate awal menemukan satu bug baru: endpoint DEMO meneruskan field source tambahan ke input strict. API sekarang memilih field secara eksplisit; regresi 20 request sukses/21st rate-limit serta suite final lulus.
- Upaya browser awal tanpa izin socket gagal di lingkungan sandbox eksekusi. Browser dijalankan dengan akses host yang disetujui, tetap dengan Chromium sandbox aktif.
- Full browser run pertama: 16 pass/1 fail. Trace menunjukkan `ERR_NETWORK_CHANGED` pada fetch modul lokal sebelum aplikasi tampil, bukan assertion dokumen yang salah. Tidak menambah skip/retry otomatis atau melonggarkan assertion; suite lengkap dijalankan ulang dan hasilnya dicatat terpisah.
- Review kode read-only menemukan provenance/license belum ikut export; diperbaiki pada plan, UI, Markdown dan regresi. Dugaan literal `\\n` diperiksa terhadap source bytes dan tes newline; tidak terbukti dan tidak memerlukan perubahan serializer.

## Batas dan pekerjaan berikutnya

1. Publikasikan perubahan yang disetujui, lalu periksa GitHub Actions pada revisi baru. Perbaikan konfigurasi lokal tidak sama dengan CI remote hijau.
2. Bila materi submission diperbarui, tambahkan demo dependency/conflict dan local-chain tamper yang dihash ulang; video v12 lama belum memuat langkah baru ini.
3. Review pakar/pilot manusia tetap ditunda sesuai keputusan pengguna. AI provider eksternal, manfaat waktu/akurasi pada pengguna, dan dampak pengurangan emisi belum dibuktikan oleh increment ini.

Increment ini memperjelas keputusan dan kebutuhan bukti pada prototipe. Jumlah tes atau kelengkapan fixture tidak membuktikan ranking kompetisi, keberhasilan repair, atau keunggulan AI atas rules.
