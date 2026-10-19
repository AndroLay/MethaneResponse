# P4 v2 — perbaikan temuan riset dan paket review baru

[Disposition F01–F13](../../research/p4-research-remediation-2026-10-18.md) · [Rencana](../../plans/2026-10-18-p4-research-remediation.md) · [Protokol manusia](../../testing/domain-expert-review.md)

**Versi:** `P4-2026-10-18-v2`. **Cakupan:** penguatan aplikasi dan pembekuan ulang bahan review setelah intake riset. **Engineering selesai dan terverifikasi lokal**, dengan batas yang dicatat pada ledger dan hasil pemeriksaan. Pakar terkonfirmasi, sesi dan hasil review manusia tetap **0**. Tidak ada pihak eksternal dihubungi, provider nyata dipanggil, deploy atau transaksi publik.

## Paket yang digunakan

1. Fase A: kirim [reviewer v2 ZIP](MethaneResponse-P4-reviewer-v2.zip). Enam pertanyaan metadata nyata dari empat sumber dan enam DEMO, metode, formulir kosong, sumber/notice lisensi, potongan metode, pembaca HTML offline dan hash versi. Tidak memuat hasil baseline per kasus.
2. Setelah jawaban awal disimpan, fase B: berikan [comparison v2 ZIP](MethaneResponse-P4-comparison-v2.zip). Berisi keluaran baseline beserta arti coverage/batas fisik dan disposition riset; bukan gold label.
3. Gunakan [handoff](maintainer/handoff.md), [undangan](maintainer/invitation.md) dan [ledger kosong manusia](maintainer/findings-template.csv). Identitas, jawaban dan consent tetap privat. Perbaikan/recheck oleh pakar belum terjadi.

[Versi v1](../domain-review-preparation-2026-10-18/README.md) tetap snapshot historis dan seluruh bytes artefaknya dipertahankan. Untuk penilaian baru gunakan v2 agar metode sama dengan kode saat ini. Tidak mencampur jawaban dari dua versi tanpa mencatat versinya.

## Bukti teknis

- [Hasil pemeriksaan aplikasi](verification-results.md): tes, browser, keterbatasan dan pemeriksaan review engineering.
- [Manifest paket](manifest.json), [pemeriksaan paket](preparation-checks.json), [hash artefak](checksums.sha256) dan [binding sumber](source-files.sha256).
- [Reproducer](maintainer/reproduce-cases.ts) mengimpor fungsi repo asli. [Generator/checker](maintainer/prepare-packet.py) memeriksa kasus/baseline, typecheck utility, bytes v1, dokumen, CRC/isi ZIP dan checksum v2. Tidak menjalankan port JavaScript dari arsip riset.

```sh
bun --no-env-file docs/evidence/domain-review-remediation-2026-10-18/maintainer/reproduce-cases.ts --check
python docs/evidence/domain-review-remediation-2026-10-18/maintainer/prepare-packet.py --check
```

Generator memakai `markdown-it-py` yang sudah tersedia pada environment riset proyek. Pemeriksaan ini memakai `python` sistem dengan `markdown-it-py` 4.2.0; `.venv` layanan data-pipeline tidak memuat modul tersebut. Gunakan interpreter yang sama atau environment yang telah menyediakan dependency tersebut. `--build` hanya untuk freeze versi yang sedang disiapkan; sesudah dibagikan, perubahan harus menjadi versi baru.

## Arti selesai

Temuan engineering mempunyai perbaikan atau keputusan cakupan yang dapat ditinjau dalam ledger. **P4 keseluruhan masih in progress** karena review domain manusia, recheck temuan material dan consent ringkasan belum tersedia. Aplikasi menyimpan informasi yang dapat ditelusuri; ia tidak mengesahkan isi laporan atau physical mitigation.
