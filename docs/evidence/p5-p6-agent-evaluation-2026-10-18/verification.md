# Verifikasi engineering P5/P6 — 18 Oktober

## Hasil aktual

| Pemeriksaan | Hasil | Batas |
|---|---|---|
| `bun run check:all` | **exit 0**; 193 API, 247 web, 41 verifier/tooling, 190 Python, 4 Foundry: **675 tes lulus** | Engineering lokal, bukan studi manusia/provider |
| Typecheck API/web/E2E/evaluation | Lulus dalam gate | Freeze/runner/tests/reproducer kini tercakup `check:evaluation` |
| Production build + bundle budget | Lulus; App 71.689 gzip bytes /75.000; 8 required route chunks | Tidak mengukur jaringan/perangkat pengguna |
| Dua belas provisional agent claims | Actual TypeScript `assess` dengan scoped source metadata: 12 policy-label matches | Empat sumber, dua label; tidak dihitung sebagai accuracy terhadap gold independen |
| Walkthrough browser agent | KAZ T1–T4 dan ARG T1–T2; export original lolos, dua tamper ditolak | Satu agent, tidak blind, kondisi manual/timing/confidence tidak dijalankan |
| Manual verifier samples LBY/CAN | Dua raw baseline exports lolos CLI digest; receipt absent | Packet untuk sesi mendatang; bukan hasil peserta |
| Read-only agent review | Tiga temuan tambahan diperbaiki; agent mengonfirmasi perubahan kode/protokol | Agent tidak menyatakan telah mengulang full gate |

Test fixtures semuanya disposable/synthetic untuk memeriksa perangkat lunak. Tidak ada metrik provider atau peserta yang dibuat dari fixture.

## RED → GREEN yang dicatat

- Alat P5 baru: import test awal gagal karena modul belum ada; implementasi kemudian lulus. Pemanggilan awal `pytest` standalone juga memerlukan path module; tes sekarang menambahkan path lokal, command terfokus memakai `python -m pytest`.
- P6 evaluator: delapan regresi baru gagal sebelum perbaikan binding/basis/telemetry/activation, kemudian lulus.
- Runner: dua regresi gagal sebelum complete-attempt mode dan input source URL, kemudian lulus; guard shared directory turut lulus.
- Partition freeze: regresi gagal sebelum source/document split binding, kemudian lulus.
- Review akhir: dua regresi hilang-telemetry dan cell-skew gagal sebelum perbaikan, kemudian **45 focused Python tests lulus**.
- Typecheck baru menemukan fixture lama belum memuat field consent default; fixture diparse/dilengkapi sesuai kontrak tanpa memperlemah tipe.

Log gate selama sesi: `/tmp/methane-p56-full-gate.log`. Log terfokus: `/tmp/methane-p56-python-green.log`, `/tmp/methane-p6-typescript-green.log`, `/tmp/methane-p56-typecheck.log`; RED logs juga tetap di `/tmp`. Log sementara tidak menjadi dependency penggunaan paket; hitungan ringkas dan hash sumber/artefak dipertahankan.

## Mengulangi pemeriksaan

```bash
bun run check:evaluation
bun test scripts/run-ai-benchmark.test.ts scripts/freeze-ai-assessment-inputs.test.ts
cd services/data-pipeline
UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run --locked python -m pytest \
  tests/test_pilot_study.py tests/test_evaluate_evidence_ai.py
```

Dari root, gunakan path output baru agar tidak overwrite:

```bash
bun docs/evidence/p5-p6-agent-evaluation-2026-10-18/repeat-agent-metadata.ts /tmp/new-agent-metadata-result.json
```

`prepare-packet.py` membekukan allowlist sumber ke ZIP deterministik dan menulis manifest hanya sekali; menolak output yang sudah ada. Archive tidak menyertakan env, private state/corpus, body laporan atau asset visual yang belum jelas izin redistribusinya. Data aktif diikat hash dan diperoleh terpisah sesuai lisensinya.

## Keputusan dan batas tersisa

Engineering serta evaluasi agent pada increment ini selesai secara lokal. **P5/P6 penelitian penuh belum selesai.** Tidak ada evidence 5–8 pengguna, dua anotator/adjudikator, gold dokumen source-disjoint berizin atau provider benchmark. Model tidak dinyatakan layak aktif. P4 tetap menunggu. Tidak ada deploy, publikasi eksternal, kontak peserta, transaksi publik atau pemrosesan laporan pihak ketiga oleh provider.
