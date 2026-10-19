# Protokol beku perbandingan fungsional

Dibekukan sebelum penilaian. 16 sel terjadwal: 9 cakupan metadata dari 3 kasus historis dan 7 tantangan DEMO (5 integritas, 1 revisi, 1 UTC). Satu jawaban benar memerlukan seluruh field cocok; jawaban hilang dihitung gagal. Duplikat/ID tambahan ditolak.

## Baseline manual yang dilengkapi alat

Satu operator AI independen membaca inputs.json, kebijakan metadata packages/shared/src/evidence-policy.ts dan assessment-semantics.ts, serta skema sumber/claim di packages/shared/src/index.ts. Mendapat data dan provenance identik, lembar jawaban terstruktur, log revisi asli, alat SHA-256/JSON umum, dan boleh memakai CLI verifier yang sama (scripts/verify-audit.ts --require-context) untuk memeriksa file. Ini menguji rangkaian kemampuan, bukan larangan terhadap hashing atau otomasi manual. Jangan membaca rubric.json, hasil aplikasi, scorer, atau implementasi harness sebelum mengirim jawaban. Semua alat/penyimpangan dicatat. Tidak ada coaching jawaban.

## Aplikasi

Replay input sama memakai createAudit, verifier browser yang sebenarnya dengan requireExportContext:true, compareAuditRevisions dan preset UTC. Ini pengujian fungsi produksi; hasil interaksi browser dilaporkan terpisah. Tidak mengklaim seluruh portal MARS dibandingkan atau semua input end-to-end melalui UI.

## Ukuran dan batas

Laporan memuat seluruh sel, ketepatan, missing, dan overclaim fisik/autentisitas. Tidak ada pengukuran waktu manusia, biaya, produktivitas atau superioritas ilmiah. Jika kedua alur benar, laporkan paritas; nilai tambahan produk adalah integrasi yang dapat diperiksa, bukan ketidakmampuan baseline. Agen bukan partisipan manusia. Skenario DEMO bukan kejadian methane baru. Hasil P5 lama (15/24 pasangan layak; median manual-minus-app -33.914 detik) tetap terpisah dan tidak ditimpa. Tidak ada target skor18 yang menentukan hasil.

## Format jawaban

JSON {operator,toolsUsed,deviations,responses:[{id,answer:{...field yang diminta}}]}. Field di dalam answer harus persis yang diminta. Catatan bebas di luar answer diperbolehkan.
