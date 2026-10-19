# Kondisi repo dan keputusan yang berlaku

**Baseline pemeriksaan:** `main` / `a82e2eee99bb79327f859f304f2f5d5939f07041`, 16 Oktober 2026 WITA. Working tree bersih sebelum materi demo ini ditambahkan. `origin/main` lokal sama; tidak ada fetch remote pada pass dokumentasi ini.

## Produk yang benar-benar ada

MethaneResponse adalah prototype riset untuk menelusuri sumber metana historis, memeriksa dukungan bukti terhadap klaim tertentu dan membawa hasil pemeriksaan dalam laporan yang dapat diverifikasi secara lokal. Ini bukan otoritas monitoring atau sertifikat perbaikan.

| Bagian | Tanggung jawab |
|---|---|
| `apps/web` | React/Vite/TypeScript; MapLibre, sumber dan observasi, Indicators, audit bertahap, laporan serta verifier browser |
| `apps/api` | Bun/Hono; sumber dari snapshot yang dipin, rules baseline, versi audit, review dan export; atomic JSON file store |
| `packages/shared` | Kontrak data/Zod dan fixture synthetic yang wajib tetap berlabel DEMO |
| `services/data-pipeline` | Python/uv; impor, normalisasi, validasi provenance, rules evaluation dan riset recurrence |
| `data/real` | Arsip publisher, casebook historis dan provenance/license; terpisah dari synthetic fixtures |
| `contracts` | Solidity/Foundry; registry dan receipt semantics; tidak berarti anchoring API sedang aktif |
| `scripts` | Verifier mandiri, gate lokal, benchmark, map/bundle checks dan utilitas |
| `docs` | ADR, protokol benchmark/pilot, bukti bertanggal, status aktif dan materi presentasi |

Alur aktif: **arsip publisher → validasi dan snapshot lokal → UI/API → klaim dan referensi bukti → rules baseline → versi audit JSON → export → verifier lokal**.

## Keputusan yang harus dipertahankan

| Keputusan | Alasan / konsekuensi praktis |
|---|---|
| MARS-first, file lokal, tanpa database service | ADR diterima 15 Oktober. Tidak menghidupkan kembali PostgreSQL/PostGIS/Supabase atau migrasi untuk demo ini. |
| Snapshot publik dipisahkan dari state audit | Dataset dan derivasi memiliki versi/hash/provenance; audit memakai `AUDIT_STORE_PATH`, default `data/state/audits.json`. |
| Satu proses untuk state lokal | Riwayat bertahan saat restart jika file sama; bukan durability multi-instance/hosted. Preview opsional memakai filesystem ephemeral. |
| Klaim harus spesifik dan rules dijalankan lebih dulu | `source_detected`, `operator_notified`, `mitigation_confirmed` membutuhkan tipe bukti berbeda. Konflik atau bukti kurang mengarah ke abstention. |
| Metadata tidak dinaikkan menjadi kebenaran fisik | Feedback, notifikasi metadata, report title dan tidak adanya observasi lanjutan tidak membuktikan perbaikan atau nol emisi. |
| Exact source ID untuk Indicators | Tidak ada fuzzy join; tidak membuat ranking dari urutan CSV. Unit Top 50 t/h berbeda dari plume kg/h. |
| Rights dan provenance dipertahankan | Data CC BY-NC-SA 4.0; report pihak ketiga link-only. Lisensi MIT software tidak mengubah lisensi dataset. |
| AI opsional dan dibatasi | Jalur dokumen/quote/human review tersedia; provider tidak dikonfigurasi untuk demo. Benchmark independen belum ada. |
| Digest dan receipt punya batas berbeda | Hash lokal memeriksa konsistensi; receipt membuktikan integritas/urutan versi. Keduanya tidak membuktikan mitigasi fisik. Anchoring API file store tidak aktif. |

ADR hanya dibuka ulang untuk database jika alur konkret membutuhkan state bersama lintas restart dan pemilik menyetujui penambahan scope infrastruktur.

## Inventaris data aktif

- Snapshot `unep-mars-675417694883`: **4.218 sumber, 30.414 plume**; 23.861 plume terhubung ke source ID dan 6.553 tanpa source ID. Rentang 29 Oktober 2020–13 September 2026.
- Casebook terkurasi: **4 kasus, 7 observasi**. Ini subset; audit source tidak terbatas pada empat kasus itu karena API dapat memuat sumber dari snapshot global yang dipin.
- Indicators: **9 rilis Top 50 / 450 baris** dan **8 periode respons negara / 278 baris country-period**. Rilis terakhir Top 50 September 2026; periode negara terakhir Agustus 2025–Juli 2026.
- Model logistic terlatih mengestimasi kemunculan record arsip yang terhubung dalam 365 hari. Ini berbeda dari heuristic priority/anomaly dan bukan prediksi emisi. Evaluasi retrospective telah dilihat saat development; ledger prospective masih menunggu outcome.

## Bukti kualitas dan yang belum dibuktikan

Gate lengkap, browser E2E dan CI terakhir tercatat pada 15 Oktober untuk implementasi `9ab1daf`. Commit setelah itu sampai baseline di atas hanya mengubah dokumentasi/bukti. Angka maupun hasil historis tidak disebut sebagai tes ulang untuk paket dokumen ini.

Pass presentasi ini memeriksa alur inti di browser lokal dan integritas paket; hasil rinci ada pada README dan capture manifest. Tidak ada perubahan kode produk.

Masih terbuka: benchmark AI independen dengan dokumen berizin, pilot pengguna nyata, pengukuran perangkat fisik, deployment yang dapat dibuka juri bila dibutuhkan, transaksi chain bila dipertahankan dan diotorisasi, serta video final. Tak satu pun boleh dianggap selesai dari screenshot atau naskah.

## Pointers untuk melanjutkan tanpa mengulang keputusan lama

- Status aktif: `docs/release/current-implementation-status.md`.
- Keputusan scope: `docs/architecture/decisions/2026-10-15-local-prototype-no-database.md`.
- Provenance dan batas dataset: `data/real/README.md`, `data/real/mars_publisher_archives/README.md`.
- Bukti aturan klaim: `apps/api/src/audit.ts`, `apps/api/src/audit.test.ts`.
- Alur utama yang sudah tersedia: `e2e/audit-workflow.spec.ts`.
- Benchmark AI: `docs/testing/ai-benchmark-annotation.md`.
- Pilot: `docs/evidence/target-user-pilot-protocol.md`.

Roadmap/checkpoint lama tetap merupakan catatan revisi asalnya. Keputusan database lama dan header status historis tidak mengalahkan ADR serta status aktif ini.
