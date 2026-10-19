# Bukti P2: intent anchor dan pemulihan

**Tanggal:** 17 Oktober 2026 · **Status:** fungsional verified lokal; integrasi Sepolia publik pending.

[Rencana P2](../../plans/2026-10-17-six-package-completion.md#6-p2--blockchain-aktif-pemulihan-dan-verifikasi) · [Runbook](../../development/blockchain-recovery.md) · [ADR](../../architecture/decisions/2026-10-17-durable-anchor-intents.md) · [Manifest](manifest.json)

## Hasil yang dibuktikan

- `FileAuditStore` menyimpan audit dan intent dalam satu envelope. Intent/tx hash/nonce/target disimpan dan di-flush **sebelum** broadcast; receipt dan confirmed intent diselesaikan atomik. Baca array legacy mempertahankan bundle/hash. Marker rusak/hilangnya state yang pernah diinisialisasi menutup akses.
- Reservasi pending menahan operasi issuer dan revisi lain; nonce/version stale ditolak. Timeout tidak mengirim ulang. Receipt harus cocok exact hash, audit/case/claim, chain/registry/issuer dan expected version. Completion yang sama idempoten; receipt berbeda setelah confirmed ditolak.
- Integration test menjalankan kontrak Solidity sebenarnya pada **Anvil loopback chain 31337**, signer acak disposable. Proses dimatikan dengan **SIGKILL sebelum dan sesudah broadcast**. Hash-known pending bertahan setelah restart; receipt transaksi yang sudah mined dipulihkan tanpa broadcast baru. Revert mined tidak menandai audit anchored.
- Verifier CLI dari proses berbeda memeriksa event/receipt jaringan: asli `VALID_LATEST`, setelah revisi `VALID_HISTORICAL`, perubahan bundle/issuer ditolak. Flag `--require-chain` menolak keberhasilan offline bila receipt/config tidak ada. [Receipt lokal](local-chain-receipt.json) adalah catatan jaringan disposable yang sudah dihentikan, bukan bukti Sepolia publik yang dapat dibuka di explorer.
- Chain ID, registry emitter, issuer, case ID, bundle hash, version, tx status/block, canonical block dan minimum konfirmasi diperiksa. Default 2 konfirmasi; fixture Anvil 1. Tes RPC menunjukkan mismatch chain/registry/event/hash/block, insufficient confirmations dan reorg ditolak.
- Admin mengotorisasi baseline. Reviewer anchor memerlukan attestation `operator_attested` terkini untuk claim; revoked/expired/outside-authority ditolak. Schema 4 privat dan AI unreviewed tetap dilarang. Pencabutan saat broadcast mencegah pengembalian full audit privat.
- Verification Center memerlukan pemeriksaan target sebelum submit, menampilkan chain/registry/issuer/konfirmasi, mengikat target pada request, dan menyediakan status/reconcile read-only. Pending mematikan write; kegagalan pembacaan target membatalkan kesiapan lama. Credential hanya di memori tab. UI browser memakai fixture respons **DEMO**, terpisah dari bukti transaksi Anvil.

## Pemeriksaan dan hasil

| Pemeriksaan | Hasil | Batas |
|---|---|---|
| `bun run check:all` | API 151, web 236, verifier 35, Python 160, Foundry 4; TypeScript/build/bundle/baseline lulus | Lokal, tanpa provider nyata atau Sepolia |
| `bun run test:chain-integration --evidence <new-path>` | 1 integration scenario, 22 assertions lulus | Anvil disposable 31337, SIGKILL/revert/verifier proses terpisah; environment induk disaring, dotenv mati |
| `bun run test:case-work-operations` | 2 lulus, 17 assertions | Regresi backup casework dan actual API crash/lock P1 setelah envelope P2 |
| `bun run test:e2e` / phase specs | 14 main + 5 private/manual/shared/mock-AI = 19 skenario lulus | Chromium sandbox aktif; fixture loopback, bukan human acceptance/pilot |
| Focused P2 browser repeat | Target check, dialog dismiss, keyboard, stale-target failure, pending tanpa retry, credential storage, desktop/mobile | Diulang setelah penguatan; tidak dijumlahkan lagi sebagai skenario baru |
| Kandidat baseline publik | Hash VALID, receipt ABSENT | Belum dipersist/di-anchor; bukan izin transaksi publik |

Runtime dan source/config hashes yang tepat dicatat dalam manifest. Total non-browser yang berbeda adalah **589**, termasuk integration/operations terpisah; helper runner dan focused repeats tidak dihitung ulang. App akhir **74.704 gzip bytes** di bawah budget 75.000; advisory MapPanel raw-size tetap dicatat. Tidak ada dependency baru. Source checkout masih memuat perubahan pengguna dari pekerjaan terdahulu; tidak di-commit atau di-push. P1 evidence tetap snapshot aslinya.

## Review dan regresi

Reviewer implementasi independen baca-saja menemukan: (1) otorisasi direktori reviewer belum diperiksa pada endpoint chain, (2) confirmed completion dapat diganti, (3) UI belum menampilkan target sebelum submit. Tes mereproduksi kegagalan sebelum perbaikan; review ulang menutup ketiganya tanpa blocker high/medium baru dalam scope review. Ini bukan review pakar methane atau audit keamanan menyeluruh.

Pemeriksaan visual juga memicu penguatan state: pembacaan target yang gagal setelah pernah berhasil harus mematikan write. Browser regression mereproduksi tombol tetap aktif, lalu lulus setelah readiness diinvalidasi sebelum refresh. Styling panel diselaraskan dengan palette/spacing workspace. Kegagalan awal Chromium dalam workspace sandbox (`socket() failed: Operation not permitted`) diselesaikan dengan izin proses lokal; sandbox Chromium tetap aktif.

Raw traces/log browser tidak disalin karena dapat membawa credential fixture atau data tab. Manifest dan artefak hanya mencakup kode/config publik, metadata historis beratribusi dan fixture aman. Private key acak Anvil, token dan RPC credential tidak disimpan dalam evidence.

## Capture

- [Kontrol desktop DEMO](DEMO-chain-controls-desktop.png).
- [Kontrol mobile DEMO](DEMO-chain-controls-mobile.png).

Keduanya diperiksa visual; label pending, registry/tx fixture dan credential masked terlihat. Viewport desktop 1600×1000 dan mobile 390×844 tidak mengalami horizontal overflow pada skenario ini. Ini bukan uji telepon fisik, screen reader atau audit aksesibilitas menyeluruh.

## Batas dan pekerjaan tersisa

- **Sepolia publik belum dijalankan:** RPC, registry dan signer belum tersedia; write default mati. [Kandidat operasi](sepolia-operation-review.md) menyebut audit publik, hash dan field target yang masih diperlukan. Target/operasi harus disetujui sesuai AGENTS.md/rencana P2 sebelum broadcast/deploy.
- Crash sebelum broadcast dapat meninggalkan transaksi yang tidak pernah ada di jaringan; pending tetap memblokir issuer. Tidak ada clear/cancel/replacement otomatis atau asumsi tx-not-found berarti aman mengirim ulang.
- Filesystem lokal harus menghormati fsync; tidak diuji mati listrik/disk failure nyata, remote volume, kehilangan seluruh volume/marker atau rollback backup lama. Backup casework P1 bukan backup lengkap envelope/intent P2.
- Dedicated issuer tidak boleh dipakai di luar satu instance. `flock` melindungi launcher resmi; tidak ada multi-writer/failover guarantee. Revocation tepat di sela check terakhir dan broadcast tidak atomik dengan direktori eksternal.
- Canonicality diperiksa saat verify/reconcile, bukan watcher finality. Reorg sesudah receipt tersimpan bisa membuat verifikasi berikutnya gagal; record historis tidak dihapus.
- CLI terpisah memakai implementasi chain yang sama dan masih mempercayai node RPC. Tidak ada klaim dua implementasi independen atau kebenaran fisik metana.
- P3–P6, review pakar manusia, pilot pengguna, benchmark provider dan deployment tidak diselesaikan oleh P2 lokal ini.

## Pemeriksaan artefak

Dari root repo, `sha256sum --check --quiet docs/evidence/blockchain-recovery-2026-10-17/implementation-files.sha256` memeriksa snapshot implementasi. Dari folder evidence ini, `sha256sum --check --quiet checksums.sha256` memeriksa artefak. Perubahan berikutnya dapat membuat manifest source lama tidak cocok; jangan memperbarui hash hasil lama seolah-olah telah diuji ulang.
