# P5–P6: pelaksanaan lokal dan evaluasi berbantuan agent

**Arahan pengguna, 18 Oktober:** biarkan P4 menunggu; lanjutkan P5/P6 dan gunakan agent untuk memakai aplikasi. Pelaksanaan mengikuti [rencana enam paket](2026-10-17-six-package-completion.md), melalui skill executing-plans dan adapter persistent-plans. Seluruh file perubahan ditulis agent utama; dua agent melakukan pemeriksaan terpisah tanpa mengubah repo.

## Batas dan keputusan

- P4 tetap pending review manusia; paket v1/v2 yang telah dibekukan tidak diubah.
- Agent dapat menguji alur serta menghasilkan penilaian sementara. Hasilnya dilaporkan sebagai evaluasi agent, bukan peserta manusia, gold independen, atau kualitas provider AI.
- Belum tersedia sesi manusia, corpus berizin dengan dua anotator/adjudikator, atau otorisasi target/biaya provider. Tidak membuat hasil pengganti atau mengirim dokumen keluar.
- Pertahankan seluruh perubahan yang sudah ada pada HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` + working tree. Tidak mengubah dependency, deployment, atau proyeksi public summary.

## Milestone dan penerimaan

| Pekerjaan | Status | Pemeriksaan |
|---|---|---|
| Konfirmasi scope P5/P6 dan sumber yang tersedia | verified | Protokol, runner, evaluator, dan data casebook diperiksa; pengguna meminta agent |
| P5: paket dua kasus, tugas/answer key, assignment counterbalanced dan analisis berpasangan | verified lokal | Tes denominator, tugas hilang, bantuan, build berbeda, exit misconception, mode agent; 19 tes pilot |
| P6: ikat pembanding rules ke input yang sama; catat kegagalan/latensi/abstention dan keputusan manfaat | verified lokal | Regresi hash mismatch, provider gagal, legacy telemetry, benefit vs absolute gate; 26 tes evaluator + runner/freeze |
| Agent memakai app serta memeriksa klaim metadata | verified lokal | Satu browser agent: KAZ T1–T4 + ARG T1–T2; agent kedua 12 provisional metadata claims; kondisi manual/timing/manusia/provider tidak dijalankan |
| Bekukan paket, hasil lokal, batas, dan ledger | verified lokal | [Evidence](../evidence/p5-p6-agent-evaluation-2026-10-18/README.md); `check:all` exit 0/675 tes; 290 source files dan 139 data assets bound; studi manusia/provider pending |

**Celah konkret:** P5 baru mempunyai protokol tanpa agregator; baseline evaluator P6 memeriksa claim ID tetapi belum mengikat hash input; runner menghilangkan hasil ketika satu provider gagal dan tidak mencatat latensi. Metadata coverage tidak otomatis setara dengan penilaian makna dokumen: pembanding harus menyebut basisnya.

**Hasil yang dituju:** paket yang langsung dapat dijalankan, analisis lokal yang teruji, hasil agent yang dapat ditelusuri, serta status studi manusia/provider yang tetap jujur. Penutupan teknis tidak mengubah kriteria penelitian asli.

## Hasil dan langkah berikutnya

Semua pekerjaan engineering di atas selesai lokal. Review agent menemukan telemetry legacy, wording manifest dan cell imbalance; ketiganya diperbaiki, diuji RED→GREEN dan dikonfirmasi melalui inspeksi ulang. Tidak ada perubahan dependency atau public summary projection. P4 artefak historis tidak ditulis ulang.

Untuk menutup penelitian asli, fasilitator perlu sesi pengguna berpasangan serta corpus/rights/anotator/adjudikator/provider yang diotorisasi. User dapat menggunakan hasil agent sekarang sebagai rehearsal dan pemeriksaan fungsi, dengan batas yang tertera. Sesi berikutnya memerlukan freeze baru sebelum pengumpulan data.
