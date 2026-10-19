# Koreksi dan penarikan ringkasan publik

[Alur pengguna](../product/user-workflow.md) · [API](../architecture/api-reference.md) · [Rencana P3](../plans/2026-10-17-six-package-completion.md#5-p3--koreksi-dan-penarikan-publikasi)

## Lingkup

P3 mengatur ringkasan redaksi **human assessment schema 4**. Bundle penuh, exact claim, kutipan/URL, rationale dan identitas reviewer tetap privat. Laporan baseline/legacy dan reviewed AI schema 3 mengikuti aturan akses yang sudah ada. Status publikasi terpisah dari hash bundle dan checksum ringkasan historis.

## Koreksi

1. Buka source, claim dan scope yang sama di Evidence Auditor. Pada **Human assessment**, masukkan token dengan akses privat dan pilih **Load latest human assessment**. Form meminta konfirmasi sebelum mengganti draft yang belum disimpan. Pemilihan mencocokkan source, claim, scope dan dataset serta memeriksa digest; **Saved audit history** tetap dapat dipakai untuk membandingkan versi.
2. Perbaiki determination/referensi/rationale, lalu konfirmasi pemeriksaan sumber. Consent publikasi harus dipilih ulang untuk isi baru.
3. **Save revised human determination** membuat bundle dan hash baru. Request memakai `parentAuditId`; parent harus revisi manusia terkini pada scope/claim tersebut. Audit baseline yang dibuat di antaranya tidak menghalangi koreksi.
4. Dengan consent, revisi publik baru dan event `superseded` untuk publikasi aktif sebelumnya disimpan atomik. Tanpa consent, revisi privat baru tidak mengubah atau mengungkap status publik.
5. Formulir stale menerima `409`. Muat revisi manusia terbaru, bandingkan isi, lalu putuskan koreksi; jangan mengirim ulang otomatis.

Default **Reports → Public transparency summaries** menampilkan revisi publik terakhir per scoped case/claim, termasuk penanda `withdrawn`. **Show publication history** menampilkan revisi publik lama. Tombol unduh memeriksa ulang detail/status server sebelum membuat JSON; URL revisi lama tetap menunjukkan status serta tautan pengganti bila tersedia.

## Penarikan

1. Buka **Reports → Public transparency summaries → Reviewer publication controls**.
2. Masukkan token reviewer. Token berada di memori komponen, tidak di local/session storage. Akses memerlukan scope `review` dan direktori **`operator_attested` saat ini untuk kategori claim**; token legacy mengikuti konfigurasi kompatibilitas reviewer yang berlaku. Withdrawal tidak dibuka oleh flag audit yang mengizinkan reviewer unverified/expired.
3. Pada ringkasan, pilih **Withdraw publication**, alasan baku, dan konfirmasi. Alasan yang diizinkan: `consent_withdrawn`, `published_in_error`, `evidence_under_review`. Tidak ada free text publik atau identitas yang diambil dari request.
4. Server membandingkan `expectedVersion`, memeriksa ulang izin di dalam antrean writer, lalu menambah event `withdrawn`. Permintaan stale/berulang ditolak `409`; status tidak dikembalikan menjadi aktif otomatis.
5. Pilih **Clear publication credential** setelah selesai. Bila request timeout/gagal, refresh status sebelum mencoba tindakan lain. UI membuang daftar yang sudah tidak dapat dipastikan setelah refresh/status check gagal.

Penarikan **menandai status**; ringkasan historis redaksi tetap tersedia. Ini tidak menghapus salinan yang pernah diunduh, consent dalam bundle lama, atau hash/receipt yang sudah ada di blockchain. Untuk mengoreksi isi setelah penarikan, buat revisi baru dengan consent baru.

## Verifikasi

- `summaryHash` meliputi hanya `summary`, sehingga checksum historis tetap sama setelah koreksi atau penarikan.
- `publication` adalah status/riwayat yang dilaporkan server saat dibaca. Actor event disimpan privat; publik hanya menerima versi, waktu, status, alasan baku dan ID pengganti publik.
- `GET /api/transparency/:id/verify` memeriksa bundle sumber dan melaporkan status publikasi saat pemeriksaan. Ia tidak memverifikasi identitas issuer, dokumen fisik atau pengurangan emisi.
- `bun run verify:audit /path/to/summary.json` memverifikasi checksum ringkasan secara offline dan menulis **`publication_status: NOT_CHECKED`**. File unduhan dapat memiliki metadata status yang sudah lama; checksum offline tidak mengesahkan metadata tersebut. `--require-chain` menolak summary karena tidak berisi receipt chain publik.
- UI menyediakan **Check current publication status** serta pemeriksaan live untuk JSON yang diimpor. Pembacaan memakai `no-store`. Status tidak diperbarui otomatis setelah halaman dibiarkan terbuka; refresh untuk perubahan berikutnya.

## Penyimpanan dan kompatibilitas

Envelope audit **schemaVersion 2** berisi `audits`, `anchorIntents`, dan `publicationEvents` wajib. Event ditambah pada file yang sama dengan bundle, memakai antrean satu writer, atomic rename serta fsync file/direktori yang sudah digunakan P2. Bundle/hash lama tidak diubah. Marker `.initialized` tetap kompatibel; ia menandai inisialisasi path, bukan versi skema envelope.

Array audit lama dan envelope versi 1 tanpa event tetap terbaca. Reader membentuk event genesis dari consent historis dengan origin privat `legacy_consent`, lalu menandai revisi publik sebelumnya `superseded` berdasarkan urutan revisi. Proyeksi ini tidak menulis file ketika dibaca; mutation normal berikutnya menyimpan envelope versi 2. Metadata event rusak, hilang pada versi 2, tidak lengkap, atau dua publikasi aktif untuk satu scope menutup akses. Rekonstruksi consent lama merupakan migrasi metadata, bukan bukti baru bahwa consent diberikan pada waktu migrasi.

Sebelum mengganti binary/operator state, hentikan writer dan simpan backup privat seluruh envelope beserta marker dan state tim. **Rollback kode P2 lama tidak bisa membaca envelope versi 2.** Gunakan roll-forward untuk memperbaiki kode; jangan menghapus `publicationEvents` atau menurunkan versi file karena withdrawal/supersession bisa hilang. Restore backup lama juga dapat mengembalikan status publik lama dan kehilangan intent/nonce. Alat backup casework P1 belum mencakup envelope audit lengkap; batas yang sama dijelaskan pada [runbook blockchain](blockchain-recovery.md).

Satu proses Linux melalui launcher resmi tetap diperlukan; tidak ada multi-instance atau failover. Kronologi server tidak ditandatangani dan tidak tahan terhadap operator yang sengaja mengganti seluruh state/backup. Pembacaan satu response memakai snapshot audit+event yang sama; pagination lintas request bukan snapshot beku. Jika publikasi berubah selama pagination, refresh dari awal. Riwayat summary tidak membuka revisi privat di antaranya.

## Pemeriksaan lokal

```sh
bun --no-env-file test apps/api/src/publication-api.test.ts apps/web/src/transparency.test.ts scripts/verify-audit.test.ts
bun run test:publication-operations
bun run test:e2e e2e/ai-review-workflow.spec.ts --grep 'DEMO (publication|human correction|withdrawal)'
```

Tes operasi memakai proses API disposable dan `SIGKILL`; tes browser memakai DEMO, Chromium sandbox aktif, dan server lokal terisolasi. Tidak membutuhkan faucet atau transaksi publik. [Bukti P3 18 Oktober](../evidence/publication-lifecycle-2026-10-18/README.md) mencatat hasil final, screenshot, manifest sumber dan batas pengujian.
