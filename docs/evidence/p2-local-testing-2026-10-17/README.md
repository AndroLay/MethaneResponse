# P2 melalui testing blockchain lokal

[Status aktif](../../release/current-implementation-status.md) · [Rencana P2](../../plans/2026-10-17-six-package-completion.md#6-p2--blockchain-aktif-pemulihan-dan-verifikasi) · [Runbook](../../development/blockchain-recovery.md)

**Tanggal:** 17 Oktober 2026. **Hasil:** profil testing lokal terverifikasi; transaksi Sepolia publik belum dijalankan.

Menjawab pertanyaan pengguna tentang solusi memakai testing setelah kendala faucet, integrasi lokal dijalankan ulang. Jalur ini dapat dipakai untuk pengembangan dan pembuktian teknis tanpa faucet, wallet Mainnet atau pembelian ETH. Kontrak `EvidenceRegistry` benar-benar dideploy dan dieksekusi di Anvil lokal, chain **31337**, dengan signer acak dan saldo lokal disposable. Data skenario tetap **DEMO**.

## Hasil pemeriksaan baru

| Pemeriksaan | Hasil aktual | Permukaan |
|---|---|---|
| Tujuh file tes API/chain/verifier | **31 lulus, 0 gagal; 128 assertions** | Unit/regresi dengan fixture dan mock RPC; bukan koneksi Sepolia |
| `bun run test:chain-integration --evidence <path-baru>` | **1 skenario lulus, 0 gagal; 22 assertions** | Kontrak nyata di Anvil, API child process dan verifier CLI terpisah |
| Manifest implementasi P2 sebelumnya | Seluruh hash cocok | 276 file implementasi; kode produksi tidak diubah untuk solusi testing ini |

Skenario integrasi memeriksa:

- Deploy kontrak, anchor audit dan verifikasi receipt dari proses CLI lain.
- `SIGKILL` sesudah broadcast: restart merekonsiliasi transaksi yang sama tanpa broadcast ulang.
- `SIGKILL` sebelum broadcast: intent tetap pending dan nonce belum dikonsumsi; permintaan kedua ditolak.
- Revisi kedua: receipt awal menjadi `VALID_HISTORICAL`, sesudah sebelumnya `VALID_LATEST`.
- Report yang diubah, issuer palsu dan receipt dengan versi salah ditolak; transaksi revert tidak menjadikan audit anchored.

[Receipt lokal](local-chain-receipt.json), [log tes terfokus](focused-tests.log), dan [log integrasi](chain-integration.log) menyimpan hasil run ini. [Manifest sumber sebelumnya](../blockchain-recovery-2026-10-17/implementation-files.sha256) tetap cocok; [bukti full gate terdahulu](../blockchain-recovery-2026-10-17/README.md) tidak dihitung sebagai run baru. Checksum artefak folder ini tersedia di [checksums.sha256](checksums.sha256).

## Mengulang tanpa faucet

Dari root repo, dengan Bun, Forge dan Anvil tersedia serta izin socket loopback:

```sh
bun --no-env-file test apps/api/src/anchor-store.test.ts apps/api/src/anchor-intent.test.ts apps/api/src/anchor-idempotency.test.ts apps/api/src/anchor-authority.test.ts apps/api/src/chain-recovery.test.ts apps/api/src/chain.test.ts scripts/verify-audit.test.ts
bun run test:chain-integration
```

Untuk menyimpan receipt baru, gunakan `bun run test:chain-integration --evidence /tmp/methane-local-receipt-baru.json` dengan path yang belum ada. Runner menyaring environment, mematikan pembacaan `.env`, menyediakan chain/signer sementara, lalu menghentikan chain dan membersihkan state miliknya. Konfigurasi Sepolia privat tidak perlu diubah.

## Arti hasil dan batasnya

Profil ini menyelesaikan pemeriksaan integrasi blockchain **lokal** yang dijelaskan di atas. Item receipt Sepolia publik pada rencana awal tetap belum terpenuhi; kendala faucet tidak menghalangi pengembangan lokal. [Persiapan Sepolia](../sepolia-preparation-2026-10-17/README.md) dipertahankan bila jalur publik dilanjutkan nanti.

Chain sudah dihentikan setelah tes; receipt di folder ini merupakan catatan run disposable dan tidak dapat dibuka di explorer Sepolia. Fixture memakai satu konfirmasi; default aplikasi dua. Tidak ada pemeriksaan ulang browser/full gate pada run ini, uji finalitas Ethereum, atau bukti hosting publik. Receipt membuktikan integritas/kronologi pada chain yang diperiksa, bukan perbaikan fisik atau pengurangan emisi. Hasil ini tidak menyelesaikan P3–P6.
