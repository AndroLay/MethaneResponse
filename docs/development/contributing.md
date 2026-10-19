# Panduan perubahan dan pemeliharaan

[Peta repository](../repository-map.md) · [Arsitektur](../architecture/overview.md) · [Pengujian](../testing/README.md)

Baca [AGENTS.md](../../AGENTS.md) sebelum mengubah repo. Pertahankan perubahan lokal yang sudah ada, kontrak lama yang masih didukung, label DEMO, serta provenance dan lisensi data.

## Menentukan lokasi perubahan

| Perubahan | Titik mulai | Acuan terkait |
|---|---|---|
| Workspace, interaksi, navigation | `apps/web/src/App.tsx` dan komponen workspace | [UI](ui-implementation.md), [workflow](../product/user-workflow.md) |
| Claim, scope, schema atau coverage | `packages/shared/src/index.ts`, API dan preview UI | [API](../architecture/api-reference.md), [data-flow](../architecture/data-flow.md) |
| Human assessment/trust | API human-assessment, reviewer-directory, evidence-check; panel web | [Trust](../product/trust-and-transparency.md) |
| Shared casework/persistence | shared case-work schemas, API case-work modules, SharedCaseWorkPanel dan operations scripts | [Runbook](shared-casework.md), API, ADR P1 dan operations/E2E regressions |
| Report/export/public summary | report-export, investigation-brief, shared/transparency dan API visibility | [Batas publikasi](../product/trust-and-transparency.md#3-publish-a-minimal-redacted-summary) |
| Peta dan pemuatan observasi | MapPanel, progressive loader, shard/manifest builder | [Peta](../architecture/real-map.md), [geometri](../architecture/mars-publisher-geometry.md) |
| Dataset/analisis | `services/data-pipeline`, data versioning dan loader API | [Provenance/rebuild](../../data/real/README.md), [recurrence](../product/prospective-recurrence.md) |
| Kontrak/receipt | Solidity registry, chain.ts dan verifier | [Arsitektur](../architecture/overview.md), [testing](../testing/README.md) |

Perubahan skema perlu mempertimbangkan bundle versi lama, draft dan notes browser, ekspor/impor verifier, serta izin akses. Scope claim, snapshot, dan work ID tidak boleh dianggap saling menggantikan.

## Alur kerja perubahan

1. Cocokkan kebutuhan dengan panduan aktif, source dan keputusan arsitektur.
2. Buat perubahan terbatas di komponen pemiliknya; gunakan shared selector bila UI/API perlu aturan yang sama.
3. Fitur baru yang terlihat pengguna memerlukan tes reproduktif dan batas kemampuan terdokumentasi, sesuai AGENTS.md.
4. Jalankan pemeriksaan terkecil yang mencakup perubahan. Gunakan [matriks testing](../testing/README.md); perluas saat kontrak menyentuh subsistem lain.
5. Catat hasil yang benar-benar dijalankan: command, revisi/working tree, snapshot dan keterbatasan. Jangan menyebut mock AI sebagai kualitas model eksternal atau viewport emulation sebagai uji telepon fisik.
6. Perbarui halaman acuan dan indeks yang relevan.

Database baru, provider baru, atau perubahan storage bersama adalah perubahan scope/arsitektur. Gunakan [ADR yang berlaku](../architecture/decisions/2026-10-15-local-prototype-no-database.md) sebagai titik awal keputusan.

## Pemeliharaan dokumentasi

- **Satu halaman acuan per topik:** README untuk orientasi, architecture untuk desain aktif, product untuk perilaku pengguna, configuration untuk environment, status untuk kemampuan/bukti terbaru.
- **Indeks wajib:** tautkan halaman baru dari README bagian terkait; gunakan tautan relatif agar tetap dapat dibaca di clone lokal.
- **Pisahkan jenis catatan:** panduan aktif boleh diperbarui; riset/proposal diberi tanggal/status; rencana mengarah ke hasil; evidence mempertahankan run asal.
- **Jaga evidence:** jangan mengedit screenshot, manifest, hash atau log run lama untuk menyesuaikannya dengan file sekarang. Bukti baru memakai direktori/versi baru.
- **Hindari salinan perintah pipeline:** arahkan ke README provenance yang mengikat input, output, lisensi dan hash.
- **Hindari ringkasan status berulang:** catatan lama menautkan [status aktif](../release/current-implementation-status.md) bila asumsi sudah berubah.
- **Cek dokumentasi:** target tautan lokal/heading, navigasi indeks, path modul, nama command/environment, code fence dan whitespace. Perubahan prose saja tidak memerlukan build/tes aplikasi ulang kecuali mengubah instruksi yang harus dieksekusi untuk dibuktikan.

## Data dan artefak

File public data dilayani browser dan tidak boleh memuat secret, direktori reviewer atau laporan privat. Catatan browser bukan tempat menyimpan credential atau isi laporan pihak ketiga. Dataset asli dan fixture sintetis tetap dibedakan. Pahami [NOTICE](../../NOTICE) sebelum menyalin aset atau memproses dokumen eksternal.
