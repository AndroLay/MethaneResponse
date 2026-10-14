# Pendaftaran evaluasi prospektif recurrence MARS

## Apa yang didaftarkan

Ledger membekukan prediksi untuk **apakah source yang sudah dikenal akan memiliki setidaknya satu tanggal deteksi MARS tertaut berikutnya dalam arsip**. Targetnya bukan keberadaan metana, laju emisi masa depan, kebocoran fisik, perbaikan, atau pengurangan emisi. Backtest temporal historis melewati gate internal, tetapi periode uji pernah dilihat selama pengembangan; ledger ini belum membuktikan kinerja prospektif.

Snapshot dasar aktif adalah rilis UNEP yang diunduh dan diverifikasi pada 14 Oktober 2026:

| Properti | Nilai |
|---|---|
| Dataset snapshot | `unep-mars-675417694883` |
| Arsip CSV penerbit SHA-256 | `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43` |
| File input browser SHA-256 | `f27c21ab0932de3768a57029410c90677944e732f8be341e1d3abf4f36a91ae7` |
| Tanggal observasi terakhir pada cutoff | `2026-09-13` |
| Jumlah prediksi source | 4.218 |
| Jendela outcome | `(2026-09-13, 2027-09-13]` |
| Snapshot lanjutan paling awal untuk dievaluasi | retrieval pada/selepas `2027-10-13`, dengan observasi tertaut setidaknya sampai `2027-09-13` |

Ledger kanonis adalah [`record-recurrence-ledger-2026-10-14-v6.json`](../data/processed/prospective/record-recurrence-ledger-2026-10-14-v6.json). SHA-256 file: `f6038d156bfa408af568cf76df449c864069f454995edef5fb9ec2d262d825ff`. Hash daftar prediksi: `696aa3af6dc8ce9b235ec454853b72253eed0820e3bc469b4660d760b95cbb7b`. Ledger mengikat input browser, archive CSV, cutoff, model/kalibrator, source ID, probabilitas, baseline sederhana, versi kode, dan waktu registrasi `2026-10-14T06:10:12Z`. Ledger v5 dan versi yang lebih lama tetap disimpan sebagai sejarah; v5 memakai snapshot 13 Oktober dengan cutoff 12 September.

Pendaftaran cohort berikutnya wajib memakai waktu registrasi UTC yang tetap dan path output versi baru yang belum ada. Opsi `--output` sengaja tidak memiliki path default: ledger lama bersifat immutable dan bukan target penulisan untuk snapshot aktif. Contoh nama versi: `data/processed/prospective/record-recurrence-ledger-2027-10-14-v1.json`. Jangan menimpa v6 atau membuat ledger baru hanya untuk mengulang evaluasi yang sama.

## Cara memeriksa hasil ketika snapshot masa depan tersedia

Jalankan dari root repository setelah satu snapshot UNEP MARS baru memenuhi horizon 365 hari dan buffer publikasi minimum 30 hari:

```bash
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run \
  --project services/data-pipeline --locked --extra research \
  python services/data-pipeline/prospective_recurrence.py \
  --ledger data/processed/prospective/record-recurrence-ledger-2026-10-14-v6.json \
  --followup-snapshot path/to/later-mars-snapshot.json.gz \
  --evaluation-output data/processed/prospective/record-recurrence-evaluation-2027-10-13.json
```

Evaluator menolak snapshot terpotong, snapshot yang sama, publisher/dataset berbeda, jendela yang belum lengkap, atau retrieval sebelum buffer 30 hari. Source ID yang tidak muncul lagi diberi status **unknown** dan tidak dihitung negatif. Tanggal backfill pada atau sebelum cutoff dikeluarkan dari label. Evaluasi hanya memakai tanggal observasi tertaut dalam jendela yang dibekukan.

Hasil `prospective_snapshot_gates_passed` berarti gate evaluasi internal pada satu cohort temporal terpenuhi; hasil itu belum menjadikan sistem sebagai prediktor kebocoran atau dasar keputusan operasional. Tidak adanya record lanjutan dalam arsip bukan bukti emisi nol atau bahwa sumber berhenti bocor. Evaluasi mencatat hash snapshot tindak lanjut, hash kode evaluator, metrik, interval cluster-bootstrap, pembanding aturan, dan keterbatasan.

## Bukti yang tersedia sekarang

- Ledger v6 mencakup **4.218** source dan berstatus terikat ke snapshot 14 Oktober. SHA-256 file `f6038d…`; hash prediksi `696aa3…`. Snapshot yang sama direplay secara sengaja sebagai uji abstention: [`record-recurrence-evaluation-2026-10-14-v6-baseline.json`](../data/processed/prospective/record-recurrence-evaluation-2026-10-14-v6-baseline.json), SHA-256 `39e79be1f3316079674ea4c788ab0e09a62554ae014cbe79dc8e141a894c7158`, status `not_available`, 0 label karena perlu rilis penerbit yang berbeda dan lebih baru. Itu membuktikan fail-closed behavior, bukan akurasi prospektif.
- Backtest historis pada snapshot aktif berisi 3.131 source uji dan 1.251 record positif: ROC AUC `0.80810118` (95% CI cluster-bootstrap `0.78665772–0.82756648`), Brier skill `0.27676816` (95% lower bound `0.23888887`), ECE10 `0.08817986` (95% upper bound `0.14075545`), dan AUC delta terhadap baseline `0.02028538–0.04053327`. Bootstrap memakai 79 country clusters, 400 replikasi, seed 177. Angka ini untuk record MARS dalam retrospective holdout yang pernah ditinjau selama development; bukan evaluasi independen, probabilitas kebocoran, atau hasil mitigasi.
- Pemeriksaan pembekuan menolak data provenance/relasi yang tidak cocok, probability yang tidak dapat direproduksi, model/calibrator yang cacat, dan metadata bootstrap/gate yang tidak valid. Tes tersebut tidak mengubah sumber observasi menjadi label emisi fisik.

Ledger dan baseline tidak ditandatangani ataupun di-anchor ke blockchain. Hash lokal membuktikan konsistensi bytes yang diperiksa, bukan identitas penerbit, kepemilikan, atau kondisi fisik sumber. Publikasi commit atau transaksi yang kelak diotorisasi dapat menambah bukti kronologi/integritas, tetapi tidak membuktikan perbaikan metana.
