# Observation Claim Cross-Check — 19 Oktober 2026

[Indeks bukti](../README.md) · [Alur produk](../../product/user-workflow.md) · [Rancangan dan acceptance](../../plans/2026-10-19-observation-crosscheck.md)

## Pembeda yang diterapkan

Pengguna dapat menguji pernyataan yang tepat terhadap rekaman historis dan mendapatkan **rekaman penyangkal yang persis**. Ini melengkapi Reference Coverage pada Decision Lab: tidak hanya menyatakan dokumen kurang lengkap, tetapi memperlihatkan observasi mana yang bertentangan dengan sebuah pernyataan tentang arsip.

Pernyataan di tool ini merupakan **skenario buatan analis**. Tidak ada tuduhan bahwa suatu perusahaan atau UNEP pernah membuat pernyataan tersebut. Ambang kg/h ditentukan analis, bukan batas kepatuhan atau keselamatan yang disahkan.

| Pertanyaan | Yang dihitung | Batas kesimpulan |
|---|---|---|
| Tidak ada linked detection dalam periode | Exact source-linked plume IDs pada hari UTC inklusif | Nihil record bukan nihil emisi; observation opportunities tidak tersedia |
| Semua reported point estimates paling tinggi X kg/h | Rekaman dengan point estimate lebih besar dari X; nilai sama dengan X tidak menyangkal | Bukan probabilitas bahwa flux fisik melampaui ambang; SD tetap ditampilkan |
| Mitigasi fisik berhasil | Selalu `requires_document_review` | Observasi atau ketiadaannya tidak menetapkan keberhasilan repair |

## Cara mencoba di aplikasi

Jalankan API dan web sesuai [setup lokal](../../development/local-setup.md), kemudian:

1. Buka `/dashboard/audit?sourceId=CAN_S_002`.
2. Pilih **Decision Lab → Observation cross-check**.
3. Tekan **Use loaded observation period**. Pilih **Every reported flux estimate is at most a threshold** dan isi **1000 kg/h**.
4. Jalankan **Check observation claim**. Rekaman `35328376-5922-43c4-9076-c97af6231527`, `2026-04-10T19:07:29`, berisi estimasi **1.044 kg/h** dan reported SD **370 kg/h**. Ini penyangkal numerik pada arsip; estimate ± SD melintasi ambang, sehingga tidak menghasilkan kepastian ambang fisik.
5. Periksa grafik titik, tabel exact records dan provenance. Unduh follow-up draft/JSON; draf belum dikirim.
6. Pada `KAZ_S_159`, rentang seluruh observasi memberikan tiga penyangkal untuk skenario “tidak ada linked detections”. Rentang **1–31 Agustus 2026** menghasilkan `no_observations`, dengan outcome tetap unknown.
7. Pilih **Physical methane mitigation succeeded**: hasil meminta pemeriksaan dokumen, pada semua rentang.
8. Lanjutkan ke **Open source observations**, **Continue to human assessment**, atau **Open follow-up work**. Eksplorasi ini tidak otomatis menulis, menerbitkan atau meng-anchor audit. Reviewer tetap mencatat penilaiannya terpisah.

## Kontrak data dan keamanan

- `POST /api/investigations/observation-check` menerima source ID, snapshot ID, query terstruktur, serta hash input opsional untuk kompatibilitas. UI baru selalu mengirim dan memverifikasi hash input. Batas JSON 16 KiB, 20 request/menit dengan limiter terpisah, `no-store`, strict schema, dan public-preview allowlist tetap berlaku. Rate limiter bukan jaminan proteksi DDoS terdistribusi.
- API hanya membaca berkas lokal terpin. Compressed SHA-256 diverifikasi sebelum dekompresi, dengan batas 16 MB compressed/128 MB expanded. Tidak ada URL/path file yang berasal dari request. Mismatch identitas, ID duplikat, tanggal/unit/linkage tidak valid dan perubahan file saat dibaca ditolak.
- Cache dan in-flight loader terikat path/stat, dataset ID, upstream archive SHA-256, intelligence snapshot SHA-256 serta normalized input SHA-256. Tidak ada data yang disediakan di bawah identitas snapshot lain.
- Browser mengikat source, jenis/periode/ambang, snapshot ID, hash arsip dan normalized input SHA-256, kemudian memverifikasi SHA-256 dan menghitung ulang policy `mars-observation-claim/1`. Query edit membatalkan request/menghapus hasil; source atau snapshot baru mereset panel.
- UI dimuat lazy; tabel per batch 20; grafik maksimal 200 point estimates tertinggi. Semua record, termasuk yang di luar periode, tetap dalam replay file. Missing flux tidak digambar sebagai nol. Grafik dapat digulir di mobile tanpa memperkecil label sampai tidak terbaca.
- Metadata dataset di-escape sebelum masuk Markdown. Ekspor belum dikirim dan tidak mengubah revisi audit historis. Tidak ada model/credential di frontend atau dependensi baru.
- **Unsigned replay bukan autentikasi.** Mengubah output lalu rehash ditolak karena policy replay berbeda; mengubah seluruh input dan menghasilkan analisis konsisten baru tetap mungkin. Identitas penerbit memerlukan commitment eksternal tepercaya. Fitur ini tidak mengeklaim sudah di-anchor di chain.

## Data dan pembuktian

Snapshot `unep-mars-675417694883`, archive SHA-256 `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`. Normalized input SHA-256 `f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7`. Attribution dan lisensi **CC BY-NC-SA 4.0** ikut disertakan dalam setiap contoh nyata. Konten dokumen/peta berlisensi terpisah tidak disalin.

**4.218 source rows / 23.861 exact-linked plume records** dipindai. Snapshot lengkap memiliki 30.414 plume rows; tool ini tidak mengalokasikan record yang tidak terhubung ke sumber berdasarkan perkiraan lokasi. Delapan ribu empat ratus tiga puluh enam pemeriksaan adalah **dua pertanyaan per sumber**, bukan 8.436 tes independen atau kasus mitigasi berlabel.

[Proof metadata](proof/verification.json) memuat hash source working tree, baseline commit, sebelas contoh dan commitment hasil pemindaian seluruh sumber. [Pembanding Python](python-conformance.json) membaca ulang input yang sama dengan implementasi berbeda, memeriksa seluruh source counts/threshold witness IDs, serta ID, timestamp, field asli, status dan summary sebelas contoh.

| Sumber nyata | Tidak ada linked records, seluruh arsip | Semua point estimates ≤1.000 kg/h | Klaim repair fisik |
|---|---|---|---|
| KAZ_S_159 | 3 counterexamples | No counterexample in archive | Document review required |
| CAN_S_002 | 1 counterexample | 1 counterexample | Document review required |
| LBY_S_143 | 1 counterexample | No counterexample in archive | Document review required |

Tambahan KAZ: periode Agustus tanpa record → `no_observations`; pertanyaan hingga Desember 2026 melewati archive end → `incomplete_window`. Tidak ada audit tersimpan yang dibuat oleh sebelas query ini.

Ini **konsistensi implementasi pada satu input normalisasi**, bukan dataset berlabel independen, evaluasi model AI, validasi pengukuran satelit atau hasil riset manusia. [Panduan UNEP](https://www.unep.org/en/what-we-do/energy/methane/how-mars-works) memberikan konteks observasi dan follow-up; lihat provenance dataset untuk metode serta batas masing-masing pengamatan.

## Reproduksi

Dari root repository, pilih folder output baru; generator menolak menimpa run sebelumnya:

```bash
bun run prove:observations --output /tmp/methane-observation-proof-NEW
python services/data-pipeline/observation_check_oracle.py /tmp/methane-observation-proof-NEW
bun run prove:observations --verify /tmp/methane-observation-proof-NEW/CAN_S_002-threshold-1000.json
```

Opsi `--expected-digest 0x…` membandingkan digest yang diberikan dari luar berkas. Opsi itu bermanfaat hanya jika nilai expected diperoleh dari sumber yang dipercaya. [Empat skenario CLI](cli-verification.json) memeriksa original/expected, perubahan status, perubahan+rehash, dan expected digest salah.

## Hasil pengujian lokal

Gate final `bun run check:all` lulus:

| Pemeriksaan | Hasil |
|---|---:|
| `bun install --frozen-lockfile` | Tanpa perubahan dependency/lockfile |
| TypeScript API/web/E2E/evaluation scripts | Lulus |
| API | 221 lulus |
| Web | 259 lulus |
| Verifier/tooling | 54 lulus |
| Python | 215 lulus |
| Foundry | 4 lulus |
| Total lima suite di atas | **753** |
| Build/bundle | Lulus; App 71.984 gzip bytes, budget 75.000, delapan required route chunks |
| Actual Anvil integration | 1 lulus / 42 assertions; terpisah dari 753 |
| Browser Chromium | **27 skenario lulus**: 18 baseline + 9 private/team/publication/mock-AI; tanpa retry/skip |
| Runner helpers | 4 lulus, terpisah dari hitungan skenario |

Focused checks menangkap dan memperbaiki stale cache identity, proyeksi input berbeda, dan injeksi struktur Markdown. Regresi lain mencakup batas UTC offset, null/zero/equality, SD yang melintasi ambang, salah source/link/unit, duplikat, ukuran request, cache/error/rate limit, replay dan perubahan checksum. Log ringkas dan identitas run dicatat pada `checks.json`; bukti browser akhir dan screenshot disimpan bersama paket ini.

Screenshot aplikasi aktual: [desktop](observation-counterexample-desktop.png) · [mobile](observation-threshold-mobile.png). Browser memeriksa unduhan JSON/Markdown, exact IDs, threshold/SD, permintaan physical outcome, periode tanpa record, respons terlambat setelah query edit, error/retry, dan kembali ke Reference Coverage. Pengulangan terfokus untuk screenshot tidak ditambahkan ke 27 skenario.

Chromium menggunakan sandbox lokal; viewport mobile bukan pengujian perangkat fisik. Suite AI memakai fixture/mock lokal, bukan panggilan provider live. Anvil 31337 bersifat disposable, bukan transaksi Sepolia. Tidak ada deployment/push/publication baru, pembayaran, perubahan database atau pembuktian pengurangan emisi.

## Kompatibilitas dan batas hasil

Perubahan utama:

| Area | Berkas |
|---|---|
| Kebijakan dan format replay baru | `packages/shared/src/observation-claims.ts` dan subpath export |
| API/cache/limits/regresi | `apps/api/src/observation-archive.ts`, `observation-claims.test.ts`, `app.ts`, `rate-limit.ts` |
| UI lazy, input binding, ekspor dan grafik | `apps/web/src/ObservationClaimPanel.tsx`, `observation-check.ts`, `observation-check.test.ts`, `DecisionLabPanel.tsx`, `decision-lab.ts`, `decision-lab.css`, `EvidenceAuditorWorkflow.tsx`, `App.tsx` |
| Pembuktian lokal | `scripts/observation-claim-proof.ts`, Python oracle/tests, `e2e/audit-workflow.spec.ts` |
| Dokumentasi/konfigurasi | README, workflow, API reference, current status, plan, package command dan typecheck include |

Tidak ada migrasi database, dependensi baru atau perubahan kontrak.

Audit schemas, kontrak EvidenceRegistry, receipt historis dan format DecisionPlan tetap berlaku. Format ObservationCheck baru terpisah dari audit berversi yang di-anchor. Dua puluh lima artefak paket Decision Lab sebelumnya diverifikasi tetap byte-identical terhadap manifest asal.

Peningkatan ini memberikan demonstrasi keputusan berbasis data yang lebih konkret. Ia tidak membuktikan penghematan waktu auditor manusia, manfaat tambahan AI, repair lapangan, atau kemenangan kompetisi. Langkah berikutnya yang bernilai adalah memasangkan hasil ini dengan dokumen berizin dan penilaian reviewer pada satu investigasi utuh, lalu menguji kegunaannya bersama pengguna sasaran ketika pilot manusia dilanjutkan.
