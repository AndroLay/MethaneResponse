# ADR: koreksi dan penarikan ringkasan publik

**Tanggal:** 18 Oktober 2026 · **Status:** diterima untuk prototipe lokal satu writer · **Paket:** P3

## Keputusan

Consent dalam private bundle schema 4 tetap immutable. Envelope audit versi 2 menambah `publicationEvents` wajib di samping `audits` dan `anchorIntents`. Pembuatan revisi berconsent dan supersession publikasi aktif sebelumnya pada scoped case/claim disimpan atomik. Revisi privat tidak mengubah state publik atau memperlihatkan ID-nya.

Event publikasi mencatat versi, waktu, alasan enum serta aktor privat dari autentikasi server. Withdrawal membandingkan expected version dan memeriksa ulang operator attestation claim di dalam antrean writer. Pembaca memakai satu snapshot audit/event. Daftar current memilih revisi publik terakhir sebelum pagination, termasuk withdrawn tombstone; history dan direct URL mempertahankan versi lama.

Summary hash hanya meliputi immutable summary. Status publikasi berasal dari server saat dibaca, tidak ditandatangani dan tidak disahkan oleh checksum offline. Penarikan tidak menghapus salinan yang sudah diunduh atau receipt/hash blockchain. Full schema 4 tetap privat dan tidak dapat di-anchor.

## Kompatibilitas dan batas

Array audit lama dan envelope versi 1 dibaca dengan migrasi deterministik dari consent historis; origin migrasi disimpan privat. Write berikutnya menyimpan versi 2. Metadata event tidak lengkap/rusak atau dua publikasi aktif pada scope sama ditolak. Tidak ada pengubahan hash/bundle historis.

Keputusan envelope versi 1 pada [ADR P2](2026-10-17-durable-anchor-intents.md) digantikan pada bagian format penyimpanan saja. Binary P2 lama tidak dapat membaca versi 2. Backup lengkap harus mencakup envelope, marker serta casework; gunakan roll-forward. Menghapus event, menurunkan skema, atau restore backup lama dapat menghilangkan penarikan/intent.

Satu proses resmi melalui Linux writer lock tetap menjadi batas operasi. Pagination lintas request bukan snapshot beku. Operator yang mengganti seluruh state masih dapat mengubah kronologi. Ini bukan sertifikasi identitas, dokumen atau hasil methane fisik.

[Runbook pengguna/operator](../../development/publication-lifecycle.md) · [Bukti P3](../../evidence/publication-lifecycle-2026-10-18/README.md)
