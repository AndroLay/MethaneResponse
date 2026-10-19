# P4 — perbaikan temuan riset dan pembekuan ulang

**Otorisasi:** pengguna meminta seluruh masalah ditangani, termasuk tes yang telah diizinkan. **Pemilik kode:** agent utama; satu reviewer agent read-only untuk risiko kompatibilitas. Mengikuti adapter persistent-plans; bekerja pada checkout aktif tanpa commit/reset/worktree baru.

**Acuan:** [triase F01–F13](../research/p4-research-bundle-assessment-2026-10-18.md), [checklist](../testing/p4-review-checklist.md), [rencana enam paket](2026-10-17-six-package-completion.md). Baseline HEAD `a82e2eee99bb79327f859f304f2f5d5939f07041` dengan 163 path lokal berubah/baru sebelum pekerjaan ini. Perubahan pengguna dipertahankan.

## Desain dan batas

- Perbaiki validasi URL agar input invalid menghasilkan 400, bukan exception/500; HTTPS dan larangan credentials dipertahankan.
- Aturan coverage baru memeriksa pointer, tanggal dan follow-up secara konsisten. Klaim notification/mitigation memerlukan scope; request baseline lama tetap diterima dengan hasil konservatif dan reason yang menjelaskan scope yang kurang. Bundle tersimpan tidak dihitung ulang.
- Satu helper mengartikan tanggal kalender secara ketat; timestamp dengan offset menjadi hari UTC, timestamp MARS tanpa offset diperlakukan UTC. Resolver dan penilaian memakai helper sama.
- Tambahkan semantics di dalam bundle baru sebelum hash: basis metadata/manusia/model dan physical verification yang tidak ditetapkan oleh aplikasi. Field boleh absen pada bundle lama. Reviewer atas hasil model tidak mengubah basisnya menjadi penilaian manusia mandiri.
- UI, riwayat dan brief menampilkan arti hasil sesuai basis, tanpa klaim independensi reviewer yang tidak dibuktikan. Proyeksi ringkasan publik schema 1 dan hash historisnya tetap byte-identik; penjelasan tambahan berada pada tampilan.
- Data DEMO tetap rekaan; referensi `fixture://` hanya boleh untuk evidence DEMO. Dataset, lisensi dan publisher claims tetap terpisah. Tidak menambah notifikasi eksternal, provider, estimasi pengurangan emisi atau deployment.
- Paket P4 v1 menjadi snapshot historis. Buat paket v2 terikat kode/data baru; hasil manusia tetap 0 sampai reviewer nyata tersedia. Tidak mengubah checklist hasil manusia menjadi selesai.

## Tahap dan bukti penerimaan

1. **Done — input URL.** Tambah regresi schema dan handler untuk reference utama/follow-up: malformed/blank, HTTP, credentials, HTTPS valid. Jalankan merah, perbaiki, lalu hijau. File: shared index, API human-assessment tests.
2. **Done — coverage dan waktu.** Tambah regresi M01–M18 yang relevan: pointer hilang/spasi, scope hilang, recipient trim, UTC tengah malam, kalender invalid, follow-up/konflik. File: shared evidence policy, audit/scoped-source, fixture DEMO dan tes conformance. Kunci label benchmark tetap; pemanggilan tes memakai scope fixture yang eksplisit.
3. **Done — semantics dan kompatibilitas.** Shared semantics helper; pembuat bundle API, verifier API/browser/CLI. Uji hash lama yang tetap valid, field baru terikat hash dan penolakan physical verification palsu. Jangan mengubah proyeksi ringkasan publik schema 1.
4. **Done — tampilan dan ekspor.** Terapkan helper pada verdict/report/history/brief/public view, jelaskan penilaian reviewer dan physical verification secara terpisah. Tes komponen/export dan pemeriksaan browser terfokus termasuk mobile.
5. **Done — disposition dan paket v2.** Ledger setiap F01–F13: diperbaiki secara teknis, sudah dikendalikan, keputusan scope, atau membutuhkan pakar/bukti primer. Paket kasus, baseline dan hashes baru; v1 dan evidence lama dipertahankan. Perbarui status aktif dan indeks.
6. **Done — review dan verifikasi engineering.** Jalankan suite API/web/verifier/typecheck/build yang terdampak, full gate bila perubahan lintas lapisan membutuhkannya, serta E2E relevan. Reviewer read-only memeriksa risiko nyata; catat hasil aktual dan source manifest pada evidence baru.

## Gerbang selesai

Pekerjaan teknis selesai setelah regresi dan pemeriksaan integrasi relevan lulus, seluruh temuan mempunyai disposition yang beralasan, serta paket v2 dapat direproduksi. P4 keseluruhan masih memerlukan pakar independen, hasil penilaian, recheck temuan material dan izin ringkasan. Ketidaktersediaan pakar tidak menghalangi perbaikan teknis yang dapat dikerjakan sekarang.


## Hasil pelaksanaan

- Full gate lokal lulus: 193 API, 247 web, 37 verifier, 160 Python, 4 kontrak; typecheck/build dan entry budget 71.689/75.000 gzip bytes lulus. Brief Markdown dimuat dinamis pada ekspor agar entry tetap dalam budget.
- Invocation browser lengkap lulus 14 + 9 skenario aplikasi; empat pemeriksaan tambahan lulus, termasuk pembaca paket v2, hasil assessment, comparison, export/verifier. Viewport desktop/mobile dan lima screenshot P4 diperiksa.
- Tes publikasi SIGKILL/restart dan integrasi Anvil lokal masing-masing lulus. Tidak ada deploy/transaksi publik atau provider nyata.
- Reviewer kode read-only menemukan empat pemanggil/kompatibilitas yang kemudian diperbaiki dengan regresi. Final recheck agent tidak selesai karena batas pemakaian; agent utama memeriksa perubahan serta menjalankan gerbang. Ini bukan hasil pakar.
- [Ledger F01–F13](../research/p4-research-remediation-2026-10-18.md) dan [paket/bukti v2](../evidence/domain-review-remediation-2026-10-18/README.md) adalah keluaran teknis. V1 mempertahankan 31 hash artefak; proyeksi publik schema 1 byte-identik dengan sumber P3.

**Pekerjaan engineering pada rencana ini selesai lokal.** Review domain manusia dan pertanyaan sumber ARG tetap terbuka sesuai ledger; lima checklist hasil manusia P4 tidak dicentang.
