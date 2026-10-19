# P5/P6 — eksekusi lanjutan melalui agent, 18 Oktober 2026

[Indeks bukti](../README.md) · [Rencana eksekusi](../../plans/2026-10-18-p5-p6-agent-execution.md)

**Cakupan:** evaluasi agent sesuai arahan pengguna. Ini melanjutkan [increment engineering sebelumnya](../p5-p6-agent-evaluation-2026-10-18/README.md), yang tidak ditulis ulang. Hasil hanya mendukung kesimpulan pada tugas dan input yang benar-benar dijalankan. Pilot manusia, audit pakar, benchmark provider aplikasi dan dampak emisi tidak diwakili oleh agent.

**Status akhir: P5 dan P6 selesai untuk cakupan agent.** Seluruh sesi/prediksi telah dijalankan dan disimpan; hasilnya dianalisis serta ditinjau secara engineering. Temuan CLI sudah diperbaiki serta diperiksa pada berkas pilot yang sama. Ini menyelesaikan [rencana eksekusi agent](../../plans/2026-10-18-p5-p6-agent-execution.md). Gerbang penelitian manusia/provider pada rencana awal tetap belum terpenuhi. Selesai mengevaluasi tidak berarti manfaat atau kelayakan AI terbukti.

| Hasil | Nilai aktual | Arti |
|---|---|---|
| P5 | 2 agent, 6 sesi berulang, 48/48 tugas tercatat | 40 correct, 8 partly correct; tidak ada peserta manusia |
| Bantuan P5 | 32 none, 6 navigation hint, 10 substantive hint | Tidak dihapus dari denominator; 10 hint substantif ada pada T4 |
| Waktu P5 berpasangan | 15 dari 24 pasangan memenuhi filter; median manual-minus-app **−33,914 detik** | Aplikasi lebih lambat dalam subset waktu wall agent ini; bukan penghematan waktu manusia |
| Recheck CLI sesudah perbaikan | 25 JSON pilot, 50/50 pemeriksaan sesuai ekspektasi | Asli diterima dalam mode yang sesuai; semua tamper ditolak. Raw audit manual tanpa checksum sengaja ditolak mode ketat |
| P6 | 72 klaim test dari 12 source; dua konteks agent | Masing-masing 71/72 benar; rules 72/72 pada grammar tugas ini |
| Keputusan P6 | Tidak ada manfaat tambahan AI yang ditunjukkan | Pertahankan rules untuk tugas terstruktur ini; kelayakan aktivasi AI tidak diberikan |

Data lengkap: [analisis P5](p5-analysis.json), [scoring](p5-scoring.json), [metode scoring](p5-scoring-method.json), [analisis P6](diagnostic-analysis.json), [temuan dan tindak lanjut](findings.md), serta [verifikasi akhir](verification.json).

## P5 — manual dan aplikasi

Tugas/sumber dibekukan dalam [p5-freeze.json](p5-freeze.json): dua agent, enam sesi berulang, dua kondisi per sesi, empat tugas per kondisi. **Dua agent bukan enam peserta independen.** Counterbalance antar sesi tidak menghilangkan pembelajaran agent. Kasus LBY_S_143 dan CAN_S_002 dipakai dengan metadata historis dan AI mati.

T1 mencari tanggal/flux/uncertainty; T2 memberi alasan triage; T3 menilai kecukupan referensi mitigasi; T4 memeriksa export asli dan salinan berubah. Kondisi manual memperoleh packet metadata dan export yang disiapkan fasilitator. T4 mengukur verifikasi saja. Waktu agent mencakup latensi model/tool, tidak dapat diklaim sebagai penghematan waktu pengguna manusia.

Instruksi awal mempertahankan kunci jawaban dari agent pengguna aplikasi. Selama sesi, fasilitator mengomunikasikan temuan batas CLI kepada keduanya agar perubahan verifier bisa dijadwalkan setelah sesi. **Ini deviasi protokol:** T4 sesudah informasi tersebut dianggap mendapat bantuan substantif. Data sebelum dan sesudah pesan tetap dicatat; tidak dinyatakan sebagai pilot independen.

### Hasil per tugas

Setiap sel ketepatan memakai penyebut **6 sesi**, termasuk hasil parsial. Median memakai keenam waktu aktual pada kondisi tersebut, termasuk tugas parsial/berbantuan. Ini berbeda dari filter 15 pasangan pada ringkasan di atas.

| Tugas | Manual: correct / partly | App: correct / partly | Median manual (detik) | Median app (detik) |
|---|---|---|---:|---:|
| T1 | 6 / 0 | 6 / 0 | 7,804 | 40,671 |
| T2 | 6 / 0 | 6 / 0 | 6,221 | 34,307 |
| T3 | 3 / 3 | 4 / 2 | 6,728 | 71,168 |
| T4 | 6 / 0 | 3 / 3 | 23,046 | 36,998 |

Lima T4 pada masing-masing kondisi mendapat hint substantif. Tidak ada pasangan T4 yang masuk analisis waktu tanpa bantuan substantif. Nol exit belief kritis berarti kedua agent tidak menyatakan feedback, missing observations atau skor/hash sebagai bukti fisik; ini tidak mengukur pemahaman manusia. Confidence tidak diisi karena bukan jawaban manusia.

Delapan hasil parsial dipertahankan: dua scope app T3 dimulai satu hari setelah observasi; tiga jawaban manual T3 mengasumsikan/menyiratkan kronologi tindakan yang tidak diketahui; tiga app T4 menemukan bahwa perubahan konteks diterima CLI lama. Sesi yang benar kemudian dan recheck patch tidak digunakan untuk mengganti hasil tersebut.

### Apa yang ditambahkan aplikasi

Pada sesi ini aplikasi menyediakan pencarian sumber, observasi historis, heuristik prioritas, pemilihan scope, rules coverage, pembuatan audit/export dan verifier browser. Packet manual adalah metadata yang sudah dikurasi, mudah dibaca, serta diberi export oleh fasilitator. Perbandingan ini tidak mengukur beban mencari/menyatukan data pada portal MARS asli, dan tidak membuktikan aplikasi lebih cepat daripada portal tersebut. Tidak ada peringkat terhadap submission kompetisi lain yang dapat ditarik dari hasil ini.

[Binding runtime](p5-runtime-binding-check.json) memeriksa 201 file API/web/shared/contract terhadap arsip awal; tidak ada drift runtime selama sesi. Perubahan CLI dilakukan **setelah seluruh T4 selesai**. [Sebelum](cli-context-before-fix.json) dan [sesudah](cli-context-after-fix.json) memakai hash verifier yang berbeda dan tidak digabung sebagai hasil satu build. Hash/checksum adalah binding lokal, bukan attestation independen atas waktu pelaksanaan.

## P6 — diagnostik isi rekaman

[Freeze](diagnostic-freeze.json), [instruksi agent](p6-agent-instructions.md), [input](diagnostic-inputs.json), [reference](diagnostic-reference.json), dan [rules](diagnostic-rules.json) dibuat sebelum penilaian. Ada 96 **DEMO authored probes**: train12/dev12/test72 pada 2/2/12 source dan document yang terpisah. Metadata dasarnya nyata; pernyataan uji sengaja ditulis untuk evaluasi dan **bukan klaim publisher yang ditemukan di lapangan**. Empat sumber pilot dikecualikan.

Rules membaca dokumen serta proposisi yang sama dengan agent. Ia memeriksa source/timestamp/flux yang tertulis dan abstain untuk bukti event/perbaikan yang tidak disediakan. Ini pembanding terstruktur yang mengetahui grammar tugas; source-disjoint tidak menghapus bias template. Baseline coverage aplikasi mempunyai basis berbeda dan tidak diberi skor semantic accuracy seolah-olah sama.

Kutipan agent diulang melalui `verifyCitations` aplikasi yang nyata. Exact match hanya membuktikan quote ada dalam teks; **semantic citation precision tidak diukur**. Penilaian dilakukan pada konteks agent terpisah dengan keluarga model yang sama, sehingga kesalahan bisa berkorelasi. Perbandingan menggunakan reference yang diturunkan dari rekaman, bukan human gold. Provider aplikasi dan two-pass inference-nya tidak dijalankan; waktu per-claim dan billed cost tidak tersedia.

### Hasil dan keputusan

| Metrik test | Rules | Agent 1 | Agent 2 |
|---|---:|---:|---:|
| Benar / 72 | 72 | 71 | 71 |
| Macro-F1 | 1,0000 | 0,9861 | 0,9861 |
| False supported | 0 | 0 | 0 |
| Insufficient verdict / 72 | 24 | 23 | 23 |
| Prediksi gagal/hilang | 0 | 0 | 0 |
| Exact quotation match | Lihat replay rules | 96/96 | 144/144 |

Reference test seimbang: 24 supported, 24 contradicted, 24 insufficient. Selisih accuracy agent-minus-rules masing-masing **−1,389 poin persentase**, interval bootstrap cluster source 95% **[−4,167; 0]**, 400 resample, seed `20261018`. Interval macro-F1 agent sekitar [0,9582; 1,0000]; 12 cluster dan template tugas yang sama membatasi generalisasi. Rules mengetahui grammar challenge; hasil sempurna di sini bukan jaminan semantic reasoning pada dokumen bebas.

Kedua agent sepakat 72/72 (Cohen κ=1), tetapi salah pada claim yang sama, `BHR_S_001-probe-5`: source flag `No` tidak menetapkan apakah penerima tertentu menerima notifikasi sebelum timestamp observasi. Label pembanding adalah insufficient, kedua agent memilih contradicted. Salah satu alasan agent juga membahas perbaikan yang tidak menjawab klaim notifikasi. Kutipan yang cocok persis tidak menangkap kesalahan tersebut.

Reference, raw predictions, prompt dan rules tidak diubah setelah melihat kesalahan. Panduan anotasi sekarang memperjelas batas flag dan kronologi; tidak ada klaim peningkatan held-out setelah perubahan panduan. Keputusan evaluasi adalah **tidak memberi kelayakan aktivasi dari hasil ini**, dengan rules sebagai pembanding utama tugas terstruktur. Evaluasi tidak mengubah konfigurasi provider pada host pengguna.

Replay akhir mengikat ulang **216 assessment** (72 rules + 144 agent) ke claim dan payload dokumen asli, lalu memeriksa kembali raw→grounded, quote, verdict dan count. Ini memeriksa integritas pipeline evaluasi, bukan relevansi semantik alasan/kutipan.

## Reproduksi

Untuk mengulang penilaian baru, buat paket baru; jangan menimpa freeze/hasil ini. `prepare-diagnostic.py` menolak keluaran yang sudah ada. `diagnostic-test-inputs.json` adalah filter test dari input yang telah dibekukan.

```bash
bun --no-env-file test scripts/verify-agent-diagnostic.test.ts scripts/verify-audit.test.ts
cd services/data-pipeline
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run --locked python -m pytest tests/test_agent_metadata_diagnostic.py tests/test_agent_diagnostic_bindings.py -q
```

Replay grounding menggunakan tiga argumen: input test JSON, prediction array JSON dan path output baru. Tidak memanggil provider:

```bash
bun --no-env-file scripts/verify-agent-diagnostic.ts \
  docs/evidence/p5-p6-agent-completion-2026-10-18/diagnostic-test-inputs.json \
  docs/evidence/p5-p6-agent-completion-2026-10-18/diagnostic-rules.json \
  /tmp/new-rules-grounding.json
```

Script analisis menolak overwrite laporan. Untuk menghitung ulang, salin paket ini ke lokasi terpisah dengan struktur repo yang sama lalu hapus **hanya output analisis pada salinan tersebut**; jangan menghapus bukti asli. Pemeriksaan integritas akhir menggunakan `checksums.sha256` dari folder ini.

Export aplikasi dapat diperiksa dengan `bun run verify:audit <file.json> --require-context`. Raw audit legacy tetap dapat diperiksa tanpa flag dengan keterbatasan konteks yang dinyatakan. Checksum export tidak ditandatangani, dapat dihitung ulang, dan tidak mengautentikasi issuer atau kejadian fisik.

`evaluation-source.zip` membekukan sumber **sesudah perbaikan**, memakai allowlist tanpa env/state/corpus privat; [manifest](manifest.json) mengikat sumber, dataset dan materi evaluasi. Arsip pra-pilot tetap dirujuk oleh `p5-freeze.json`. Laporan analisis terdahulu dipertahankan sebagai `diagnostic-analysis-initial.json` dan `diagnostic-analysis-binding-v1.json`; laporan final menambahkan replay binding, bukan penilaian ulang untuk menaikkan skor.

## Lisensi dan batas publikasi

Metadata: **UNEP IMEO: MARS, CC BY-NC-SA 4.0**, [ketentuan dataset](https://creativecommons.org/licenses/by-nc-sa/4.0/). Perubahan: pemilihan satu rekaman terkuantifikasi per sumber, format JSON dan penulisan DEMO challenge claims. Provenance penuh tersimpan di freeze dan [data/real](../../../data/real/README.md). Gunakan kembali metadata turunan sesuai lisensi dataset. Tidak ada body laporan linked, dokumen berizin terbatas, identitas peserta manusia, credential atau private user state dalam paket ini.
