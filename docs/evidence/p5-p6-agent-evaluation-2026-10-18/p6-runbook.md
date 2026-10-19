# P6 — runbook evaluasi AI yang dapat diaudit

[Indeks](README.md) · [Protokol anotasi](../../testing/ai-benchmark-annotation.md)

**Sekarang:** ada evaluasi agent atas metadata serta tooling yang diuji secara lokal. Belum ada corpus dokumen berizin, label manusia independen atau run provider. Jangan menjalankan command billable di bawah sebelum persetujuan target, jumlah panggilan dan biaya diberikan. Agent tidak mengesahkan lisensi atau menggantikan gold independen.

## 1. Siapkan input privat sebelum anotasi/inferensi

Gunakan direktori di luar repo dengan mode 0700 dan file 0600. Jangan simpan excerpt, annotation, gold, rights record, prediksi atau API key di folder evidence publik. Semua CLI menolak report privat di repo atau direktori bersama dan menolak overwrite.

Untuk setiap dokumen catat publisher, tanggal, sumber/URL HTTPS, ID stabil, provenance, hak setiap penggunaan, reviewer dan tanggal. Input dokumen untuk benchmark sekarang **harus** berisi `sourceUrl` yang identik dengan rights record; itu binding metadata, bukan pembuktian legalitas. Catat izin inspeksi, excerpt/provider processing, private evaluation, penyimpanan quote dan publikasi metrik secara terpisah. Izin metrik tidak mengizinkan publikasi kutipan. Laporan linked pada casebook belum cleared untuk provider.

Candidate JSONL berisi `claimId`, `split: train|dev|test`, `synthetic:false` dan `input` sesuai `DocumentAssessmentInput`. Gunakan teks klaim terbatas dan dokumen persis seperti yang akan dinilai. ID source dan document tidak boleh melintasi split. ID alias dokumen/sumber tetap perlu review manusia; alat hanya membandingkan ID yang diberikan.

```bash
bun run freeze:ai-inputs --input=/restricted/candidates.jsonl \
  --output=/restricted/input-freeze.json --require-partitions=yes
```

Flag partition wajib untuk studi P6 baru; mode digest lama tetap ada untuk kompatibilitas tetapi **bukan** freeze split penelitian lengkap. Manifest menulis hash file, source/type/split/document IDs dan dua digest exact input; tidak menyalin wording/excerpt. Simpan secara privat dan sebelum anotator melihat hasil model. Bila dokumen atau klaim berubah, buat freeze baru.

## 2. Anotasi dan adjudikasi

Dua manusia di luar penulis model memberi label secara terpisah tanpa prediksi model, mengikuti protokol. Isi dua berkas reviewer dengan **kedua** digest input dari manifest dan rights digest yang sama. Jangan menyalin label sementara agent pada `p6-agent-claims.json` menjadi gold. Jalankan:

```bash
cd services/data-pipeline
uv run --locked python annotator_agreement.py \
  --reviewer-a /restricted/reviewer-a.jsonl \
  --reviewer-b /restricted/reviewer-b.jsonl --output /restricted/agreement.json
```

Simpan label awal/rationale secara privat. Adjudikator ketiga menyelesaikan sengketa label maupun kutipan tanpa melihat model; jangan merata-ratakan label. Buat gold JSONL menggunakan kontrak protokol dengan `claimTextSha256`, `assessmentInputSha256`, citation hashes dan rights digest yang benar. Distinct opaque IDs bukan bukti bahwa orangnya berbeda; identitas/independensi diverifikasi fasilitator di luar alat.

## 3. Tetapkan baseline dan konfigurasi

Bekukan minimal **40 test claims / 10 source / ketiga label**, source dan document disjoint dari train/dev. Bekukan provider/model, `PROMPT_VERSION`, harga/token atau batas biaya tertulis, cap claims, timeout dan abstention policy. Jangan memulai run yang batas biayanya belum diketahui/disetujui. Konfigurasi saat ini: temperature 0, deadline 40 detik per klaim, maksimal dua request provider per klaim, tanpa automatic retry. Cap claims membatasi jumlah request; ia bukan USD budget atau bukti biaya aktual.

Format rules JSONL pada input yang sama:

```json
{"claimId":"claim-id","verdict":"insufficient_evidence","claimTextSha256":"EXACT_FROZEN_SHA256","assessmentInputSha256":"EXACT_FROZEN_SHA256","rightsReviewSha256":"EXACT_RIGHTS_SHA256","baselineVersion":"frozen-rules-version","basis":"document_assessment"}
```

Ini skema, bukan prediksi atau digest valid. Isi melalui rules yang benar-benar dijalankan; simpan kode/version dan aturan transformasi input. **Baseline aplikasi saat ini menilai metadata coverage**, bukan makna dokumen bebas: bila mengekspor hasilnya gunakan `basis:metadata_coverage`. Evaluator tetap dapat menampilkan pembanding deskriptif, tetapi akan menyatakan basis tidak sebanding dan tidak menyimpulkan manfaat AI dokumen darinya. `evaluate_baseline.py` memakai casebook metadata; conformance lama bukan benchmark exact claim/document P6. Jangan mengisi hash identik pada hasil yang sebenarnya tidak memakai input tersebut.

## 4. Inferensi — setelah otorisasi konkret

Filter test claims tanpa mengubah wording/documents/hashes. Runner mengharuskan source-inspection attestation dan rights record lengkap yang ditandatangani secara administratif oleh reviewer (bukan tanda tangan kriptografis). Privately configure API credential; jangan tulis key ke chat atau VITE. Contoh ini **tidak** merupakan persetujuan panggilan:

```bash
bun scripts/run-ai-benchmark.ts --input=/restricted/heldout-inputs.jsonl \
  --output=/restricted/provider-attempts.jsonl --max-claims=40 \
  --i-approve-billable-provider-calls=yes
```

CLI mencatat setiap attempt, termasuk failure tersanitasi, `verdict:null` pada failure, durasi total klaim, model/prompt dan configuration. Ia tidak membuat verdict palsu untuk provider gagal. Seluruh hasil dipublikasikan atomik ke file privat setelah batch selesai; proses yang dihentikan paksa sebelum publish belum menghasilkan ledger lengkap. Tidak auto-retry; jangan mengulang run berbayar tanpa memeriksa keadaan/biaya. Biaya/token belum diekspos adapter; `costUsd:null` berarti **tidak diketahui**, bukan gratis. Latensi adalah waktu proses provider+validasi, bukan kecepatan pengguna. Status completed belum berarti benar.

## 5. Evaluasi dan keputusan

```bash
cd services/data-pipeline
uv run --locked python evaluate_evidence_ai.py \
  --gold /restricted/adjudicated-gold.jsonl \
  --predictions /restricted/provider-attempts.jsonl \
  --baseline-predictions /restricted/rules.jsonl \
  --out /restricted/evaluation.json --strict
```

CLI menulis file 0600 tanpa overwrite dan hanya mencetak status ringkas. Prediksi **dan baseline** harus mencakup exact held-out set serta hash wording/input/rights yang sama. Kegagalan provider menjadi error pada seluruh kelas; tidak diberi kredit sebagai jawaban insufficient yang benar. Assessment abstention setelah citation checking dipisahkan dari failure provider. Telemetry lama yang hilang dilaporkan unavailable, bukan nol. Model/prompt campuran harus dinilai terpisah.

Laporan mencakup class counts, precision/recall/F1, macro-F1, citation precision, false-supported/mitigation confirmations, abstention, failure, latency/cost availability, source-cluster interval dengan seed tetap, dan selisih terhadap baseline.

| Keputusan | Syarat |
|---|---|
| `releaseEligible` | Gate absolut corpus/rights/label/macro-F1≥0.80/citation precision≥0.90/grounded support/nol false-supported; run tanpa failure dan satu model/prompt |
| `aiBenefit.supported` | Pembanding document-assessment yang sama/version tunggal; batas bawah interval paired macro-F1 >0; false mitigation tidak lebih buruk |
| `activationEligible` | Gate absolut + manfaat yang didukung + telemetry lengkap |

Ini keputusan analisis internal, **tidak otomatis mengaktifkan provider di aplikasi** dan bukan ambang resmi hackathon. Jika perbandingan seri/negatif/tidak pasti, laporkan hasil tersebut dan rules tetap jalur utama. Jika gagal, perbaiki pada dev set; test yang telah dipakai tuning tidak boleh disebut held-out baru. Public aggregate hanya setelah rights/disclosure review, tanpa dokumen, identitas reviewer, atau raw predictions.

## Input nyata yang masih dibutuhkan

Hak dokumen yang sesuai, corpus memenuhi ukuran/kelas, dua anotator independen dan adjudikator, hasil rules untuk input yang sama, target/provider dan batas biaya yang diotorisasi. Paket tooling serta label agent tidak menutup prasyarat ini.
