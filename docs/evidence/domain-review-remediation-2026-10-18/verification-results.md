# Pemeriksaan teknis P4 v2

**Tanggal:** 18 Oktober 2026, WITA. **Baseline HEAD:** `a82e2eee99bb79327f859f304f2f5d5939f07041` + working tree. Hasil berikut adalah pemeriksaan lokal engineering atas perbaikan P4; tidak ada hasil pakar manusia, provider nyata, pilot atau outcome fisik.

## Gerbang aplikasi

| Perintah | Hasil aktual | Bukti |
|---|---|---|
| `bun run check:all` | **Exit 0**: typecheck API/web/E2E, **193 API / 247 web / 37 verifier / 160 Python / 4 kontrak**, build, baseline conformance dan bundle budget lulus | [Ringkasan gate](checks/full-gate-summary.txt) |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium PLAYWRIGHT_OUTPUT_DIR=/tmp/methane-p4-browser-final bun run test:e2e` | **Exit 0**: **14 + 9 skenario aplikasi** dan 3 helper runner lulus. Local mock AI saja; bukan skor kualitas AI | [Log browser aplikasi](checks/application-browser.txt) |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium PLAYWRIGHT_OUTPUT_DIR=/tmp/methane-p4-browser-focused bun run test:e2e e2e/audit-workflow.spec.ts --grep 'claim requirements\|P4 reviewer v2\|saved assessments can be compared\|historical MARS case can be audited'` | **Exit 0**, **4 skenario** dan 3 helper lulus. Tiga skenario mengulang alur terdampak setelah penyempurnaan verifier/comparison; satu preview paket baru | [Log terfokus](checks/focused-browser.txt) |
| `bun run test:publication-operations` | **Exit 0**, 1 tes actual API SIGKILL/restart; koreksi/withdrawal dan actor privat tetap tersimpan | [Log publikasi](checks/publication-operations.txt) |
| `bun run test:chain-integration` | **Exit 0**, 1 tes actual Anvil: timeout/recovery, independent verifier, historical receipt dan crash sebelum broadcast | [Log chain lokal](checks/chain-integration.txt) |
| Reproducer/checker paket v2 | 12 kasus dan baseline direproduksi dengan fungsi TypeScript repo; utility typecheck, source hashes, dokumen, ZIP/CRC/bytes dan artefak diperiksa | [Pemeriksaan paket](preparation-checks.json) |

Binding [246 file aplikasi/pemeriksaan](implementation-files.sha256) direkam setelah tes, sebelum paket dibekukan. Checker menolak drift file tersebut. [Binding sumber paket](source-files.sha256) juga mencakup metode/data/dokumen/tool pembentuk ZIP. Hasil perintah pada tabel mengacu versi ini; bukan status semua checkout mendatang.

App entry **71.689 gzip bytes**, budget **75.000**. Brief Markdown dimuat saat diminta melalui dynamic import. Vite tetap mengeluarkan notice ukuran chunk MapPanel; budget khusus repo lulus. Tidak ada klaim metrik performa perangkat baru.

## Regresi yang benar-benar gagal sebelum perbaikan

- [URL merah](checks/url-red.txt) → [hijau](checks/url-green.txt): `safeParse` melempar `TypeError` untuk URL invalid; sesudah perbaikan schema menolak dan endpoint menghasilkan 400 untuk reference utama/follow-up.
- [Policy merah](checks/policy-red.txt) → [hijau](checks/policy-green.txt): scope, pointer, UTC, trim dan resolver. Enam tes baru gagal sebelum perbaikan; suite terfokus 19 tes kemudian lulus.
- [Semantics merah](checks/semantics-red.txt) → [hijau](checks/semantics-green.txt): semantik baru terikat hash; basis palsu dan physical-verification palsu ditolak; legacy tanpa field tetap diterima.
- [Revisi legacy merah](checks/legacy-child-red.txt) → [hijau](checks/legacy-child-green.txt): parent v3 lama tetap byte-identik, child baru merekam basis model.
- [UI UTC merah](checks/ui-utc-red.txt) → [hijau](checks/ui-utc-green.txt): scope picker dan inventory tidak lagi memakai hari lokal hasil substring.
- Replay tambahan 12 kasus + 18 variasi berada dalam 193 tes API. Ekspektasi berubah pada M03/M04/M08/M09/M11/M13 sesuai [ledger](../../research/p4-research-remediation-2026-10-18.md); URL palsu yang tampak valid tetap hanya lolos coverage metadata, tanpa verifikasi fisik.

## Pemeriksaan tampilan

[Metadata browser](browser-preview.json) merekam hash HTML dan **5 screenshot yang diperiksa visual**:

- [Assessment desktop](captures/p4-assessment-meaning-desktop.png), [mobile](captures/p4-assessment-meaning-mobile.png): basis coverage dan physical verification tampil terpisah, teks muat pada viewport.
- [Pembaca paket desktop](captures/p4-reviewer-desktop.png), [mobile](captures/p4-reviewer-mobile.png), [kasus mobile](captures/p4-reviewer-mobile-cases.png): versi v2, status belum ada pakar, 6 bagian; navigasi keyboard menuju kasus dan pemeriksaan tidak ada overflow lulus.

Browser memakai `/usr/bin/chromium` terpasang dengan **sandbox Chromium aktif**. Peluncuran awal gagal karena browser unduhan default tidak tersedia, kemudian tool sandbox memblok socket Chromium; tes dijalankan lewat eskalasi lingkungan lokal. Tidak memasang browser atau menonaktifkan sandbox Chromium. Percobaan browser pertama yang benar-benar berjalan mendeteksi ekspektasi label lama; ekspektasi diperbarui sesuai arti baru, lalu invocation lengkap lulus.

Build awal juga mendeteksi entry 76.117 bytes melebihi budget; dynamic import brief menurunkannya ke hasil final di atas. Kegagalan fixture tes timestamp akibat dokumen DEMO terlalu pendek diperbaiki pada fixture, kemudian regresi lulus. Hasil gagal tersebut tidak disebut sebagai pass atau disembunyikan sebagai isu lingkungan.

## Review engineering dan preservasi

Review agent read-only menemukan empat hal: child model legacy kehilangan semantics baru; scope picker masih substring tanggal; inventory masih substring tanggal; verifier export masih substring tanggal. Semuanya diperbaiki dengan regresi. Final recheck agent terhenti karena batas pemakaian; agent utama memeriksa perubahan dan menjalankan gerbang di atas. Tidak ada klaim final sign-off independen atau review domain dari agent.

- Seluruh **31 hash artefak P4 v1** cocok; v1 tidak dibangun ulang.
- `packages/shared/src/transparency.ts` byte-identik dengan manifest sumber P3: SHA-256 `c638dd93dd6fbc045034ebd371fca532a6ca3f0c7d1e66872df98d01b97f7747`. Tidak mengubah payload/limitations schema 1 publik untuk menambahkan penjelasan UI.
- Pemeriksaan `git diff --check` lulus. Tidak melakukan reset, stage, commit, push atau modifikasi repo terpisah.

## Batas hasil

P4 engineering selesai untuk cakupan ledger F01–F13. **P4 domain masih in progress:** 0 pakar, 0 sesi, 0 hasil manusia; tidak ada recheck domain atau consent ringkasan nyata. Dugaan bulan konfirmasi ARG tetap belum terverifikasi setelah pembukaan ulang sumber primer timeout; tanggal publikasi tidak diubah menjadi tanggal tindakan.

Viewport mobile merupakan emulasi Chromium, bukan tes perangkat fisik atau jaminan aksesibilitas lintas browser. Preview paket menggunakan HTML lokal melalui request interception; direct file URL dan pagination cetak belum diperiksa visual. Tidak mengambil dokumen pihak ketiga, mengirim notifikasi/email, memanggil provider nyata, deploy atau membuat receipt Sepolia publik. P5/P6 tetap mengikuti rencana tersendiri.
