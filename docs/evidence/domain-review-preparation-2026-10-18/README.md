# P4 — paket siap untuk review pakar domain

[Rencana P4](../../plans/2026-10-17-six-package-completion.md#7-p4--review-pakar-domain-dan-penutupan-temuan) · [Protokol](../../testing/domain-expert-review.md) · [Status aktif](../../release/current-implementation-status.md)

**Disiapkan:** 18 Oktober 2026, WITA. **Status persiapan:** siap dikirim setelah nama penerima/pengirim dan waktu disepakati. **Status P4 keseluruhan:** in progress; **0 pakar terkonfirmasi, 0 sesi, 0 hasil review pakar**. Pengguna telah menyatakan belum ada pakar dan meminta paket siap dikirim. Tidak ada email/pesan yang dikirim dari workspace ini.

## Mulai dari sini

1. Gunakan [draf undangan](maintainer/invitation.md); konfirmasi kompetensi, independensi, waktu dan consent dengan [handoff](maintainer/handoff.md).
2. Kirim **[MethaneResponse-P4-reviewer-v1.zip](MethaneResponse-P4-reviewer-v1.zip)**. Isinya bahan yang dapat dibaca tanpa instalasi aplikasi: ringkasan metode, protokol, **12 kasus (6 nyata/6 DEMO)**, formulir jawaban, sumber dan potongan kode metode. Keluaran aplikasi per kasus belum disertakan pada fase pertama.
3. Setelah penilaian awal dicatat, berikan **[MethaneResponse-P4-comparison-v1.zip](MethaneResponse-P4-comparison-v1.zip)** untuk membandingkan penilaian dengan keluaran implementasi. Keluaran baseline bukan gold label atau jawaban pakar.
4. Simpan jawaban/identitas/consent di luar repo publik. Catat temuan, perbaiki masalah material, minta pemeriksaan ulang, lalu gunakan [template ringkasan](maintainer/review-summary-template.md) dengan izin publikasi yang sesuai.

Pakar boleh menolak metode, meminta label diubah, atau menyimpulkan belum dapat menilai. Tidak ada skor yang diarahkan untuk memenangkan kompetisi. Penilaian ini tidak menjadi izin menggunakan nama atau logo institusinya.

## Isi dan pembekuan

| Artefak | Kegunaan |
|---|---|
| [Dokumen HTML offline](reviewer/index.html) | Seluruh bahan penerima dalam satu halaman dengan navigasi dan tampilan cetak |
| [Panduan penerima](reviewer/00-START-HERE.md) | Urutan baca, durasi dan pengembalian jawaban |
| [Ringkasan metode](reviewer/01-method-brief.md) | Klaim produk, aturan, uncertainty, batas dan pertanyaan kritis |
| [Protokol sesi](reviewer/02-review-protocol.md) | Penilaian awal, perbandingan dan pemeriksaan ulang |
| [Kasus terbaca](reviewer/03-cases.md) / [JSON](reviewer/cases.json) | Source/event/periode, metadata, pertanyaan dan referensi yang sama |
| [Formulir](reviewer/04-response-form.md) | Jawaban kosong per kasus dan domain metode; tidak ada hasil buatan |
| [Daftar sumber](reviewer/05-source-register.md) | Sumber primer dan batas hak dokumen |
| [Potongan implementasi](reviewer/06-method-excerpts.txt) | Aturan pada kode yang dibekukan; bukan implementasi MARS resmi |
| [Baseline aktual](maintainer/baseline-observations.json) | Keluaran deterministik untuk fase perbandingan; bukan validasi domain |
| [Ledger persiapan](maintainer/preparation-findings.md) | Koreksi dokumentasi dan pertanyaan yang masih memerlukan pakar |
| [Ledger temuan kosong](maintainer/findings-template.csv) | Dipakai setelah temuan nyata diterima |
| [Manifest](manifest.json) / [binding sumber](source-files.sha256) | Versi kode/data/artefak yang ditinjau |
| [Checksum paket](checksums.sha256) | Memeriksa bytes artefak dan kedua ZIP |
| [Hasil pemeriksaan paket](preparation-checks.json) | Reproduksi, typecheck, path dokumen dan isi arsip yang benar-benar diperiksa |
| [Pemeriksaan tampilan](browser-preview.json) | Pembacaan HTML di Chromium desktop/mobile dan screenshot persiapan; bukan sesi pakar |

HEAD dasar `a82e2eee99bb79327f859f304f2f5d5939f07041` ditambah working tree lokal, bukan commit publik baru. Snapshot `unep-mars-675417694883`, arsip `675417694883cfe1a3f0539c8337b0428f8409c2139c36e824b40415698b4a43`. Ekspor kasus berupa adaptasi metadata UNEP IMEO, berlisensi **CC BY-NC-SA 4.0** dengan atribusi/lisensi disertakan. PDF laporan, kutipan laporan, identitas orang dan secret tidak disertakan.

## Pemeriksaan persiapan

Dari root repo, dengan dependency workspace yang sudah terpasang:

```sh
bun --no-env-file docs/evidence/domain-review-preparation-2026-10-18/maintainer/reproduce-cases.ts --check
bun run tsc --project docs/evidence/domain-review-preparation-2026-10-18/maintainer/tsconfig.json
python3 docs/evidence/domain-review-preparation-2026-10-18/maintainer/prepare-packet.py --check
sha256sum --check --quiet docs/evidence/domain-review-preparation-2026-10-18/source-files.sha256
cd docs/evidence/domain-review-preparation-2026-10-18
sha256sum --check --quiet checksums.sha256
```

Hasil aktual, integritas ZIP serta pemeriksaan path didokumentasikan dalam manifest. Persiapan ini tidak mengubah fungsi aplikasi; full gate/browser P3 tidak dijalankan ulang hanya karena paket dokumen ditambahkan. [Bukti P3](../publication-lifecycle-2026-10-18/README.md) tetap terikat pada run sebelumnya.

Untuk membangun ulang arsip setelah perubahan yang disengaja, gunakan `prepare-packet.py --build`, lalu jalankan `--check`. Pembuat HTML memakai Python `markdown-it-py` 4.2.0 yang sudah tersedia di lingkungan persiapan; tidak memasang dependency atau mengakses jaringan. Perubahan materi setelah dikirim memerlukan nomor versi baru dan review/recheck yang sesuai.

## Agar P4 benar-benar selesai

Satu pakar relevan harus dikonfirmasi, review metode dan kasus harus benar-benar diberikan, temuan material harus ditangani serta diperiksa ulang, dan ringkasan versi/tanggal/batas/temuan harus mendapat izin publikasi. Paket siap kirim ini menyelesaikan persiapan. Ia belum memenuhi lima kriteria hasil manusia dalam rencana P4.

Paket berbahasa Indonesia. Draf undangan Inggris tersedia untuk menjajaki rujukan; kebutuhan terjemahan materi harus dikonfirmasi sebelum sesi berbahasa Inggris. Tidak ada klaim bahwa UNEP/IEA atau pakar mana pun telah menerima undangan atau mendukung produk.
