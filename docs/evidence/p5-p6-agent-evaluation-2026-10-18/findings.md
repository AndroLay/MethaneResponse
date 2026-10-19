# Ledger temuan P5/P6

Sumber: inspeksi alat oleh agent utama, pemeriksaan metadata oleh agent P6, dan penggunaan browser oleh agent P5. Seluruh penilaian adalah engineering/agent, bukan domain-expert endorsement.

| ID | Temuan | Tindakan / keputusan | Status |
|---|---|---|---|
| E01 | P5 belum mempunyai pengolah hasil berpasangan | `pilot_study.py`: frozen assignments, T1–T4, denominator tugas hilang/gagal, bantuan/ketepatan/durasi, exit beliefs, private/no-overwrite output | Implemented; tes pada verification |
| E02 | Agent dapat keliru dihitung sebagai manusia | `participantKind` terpisah; agent selalu gagal gerbang manusia; slot kosong bukan peserta aktual; pengujian counterbalance terpisah | Implemented; regresi tersedia |
| E03 | Baseline P6 belum terikat exact input | Mandatory wording/input/rights digests + basis/version pada rules; mismatch ditolak | Implemented; regresi tersedia |
| E04 | Baseline metadata tidak membaca bahasa alami dokumen | Basis wajib; metadata comparison tidak dapat mengesahkan manfaat document AI; 12 klaim agent dilaporkan policy conformance saja | Ditutup melalui kontrak/laporan, tanpa klaim kemampuan baru |
| E05 | Satu provider gagal menghilangkan hasil satu batch | CLI complete-attempt mode menyimpan failure tersanitasi/verdict null/latensi; failure dihitung error, bukan jawaban insufficient yang benar | Implemented; fixture provider, tidak ada provider live |
| E06 | Skor absolut lulus dapat disalahartikan sebagai manfaat AI | `aiBenefit` dan `activationEligible` terpisah; paired interval/basis/telemetry diperiksa; hasil seri/negatif tetap dilaporkan | Implemented; regresi positif dan negatif |
| E07 | Freeze lama belum membekukan source/document split | `--require-partitions=yes` + metadata source/type/doc/split; source/document overlap ditolak sebelum anotasi | Implemented; mode lama tetap kompatibel |
| E08 | Rights URL dapat berdiri sendiri tanpa source URL input | Benchmark mewajibkan input source URL sama dengan rights URL | Implemented; bukan legal clearance otomatis |
| E09 | Input/report benchmark perlu penyimpanan privat | Guard file/direktori owner-only dan luar repo; evaluator output wajib, no overwrite, stdout status ringkas | Implemented; owner-only/no overwrite tests |
| E10 | Tidak ada peserta/annotator/corpus/provider berizin | Paket tugas/answer key/manual packet/runbook siap, agent melakukan eksplorasi metadata. Tidak membuat hasil penelitian palsu | Pending input nyata; bukan penghambat pekerjaan engineering |
| E11 | Prioritas rinci ditemukan agent pada Document AI step | Petunjuk task memisahkan panel input heuristik dari panggilan provider; AI tetap mati. Potensi discoverability memerlukan studi pengguna | Observasi UX; belum terbukti masalah manusia |
| E12 | Baseline tidak meminta exact natural-language claim | P5 no-cleared-excerpt branch secara eksplisit menilai reference coverage dengan scope; P6 melarang perbandingan makna dokumen dari coverage | Batas kemampuan didokumentasikan; bukan bug yang ditutup dengan label palsu |
| E13 | Export membutuhkan pemilihan revisi di Reports | Walkthrough mencatat langkah itu; verifier asli/tampered dijalankan di browser | Alur berfungsi; kegunaan manusia belum diukur |

P4 v1/v2, corpus model, projection public summary, dependency dan credential tidak diubah oleh increment ini. Perubahan source binding engineering lama tetap merupakan rekaman historis; current evaluation mempunyai manifest tersendiri.

Review tambahan menemukan telemetry legacy masih dapat lulus gate absolut, wording freeze terlalu sempit, dan cell assignment timpang. Ketiganya diperbaiki, diberi regresi RED→GREEN, lalu dikonfirmasi melalui inspeksi agent kedua. Hash binding adalah attestation equality; operator tetap harus menyimpan kode rules/transform, bukan hanya menempelkan digest.
