# Persiapan operasi publik P2 — Sepolia

**Status:** target dan konfigurasi privat siap; ketiga operasi sudah disetujui pengguna. Menunggu test ETH; Chain Platform dan QuickNode sama-sama dilaporkan menolak issuer tanpa saldo Mainnet. **Belum ada deployment, anchor, atau receipt publik.**

Dokumen ini melanjutkan [bukti implementasi lokal P2](../blockchain-recovery-2026-10-17/README.md). Snapshot bukti lama dipertahankan. Persiapan ini tidak menutup integrasi P2.

## Target konkret

| Bidang | Nilai |
|---|---|
| Jaringan | Ethereum Sepolia, chain ID `11155111` |
| RPC publik yang diperiksa | `https://11155111.rpc.thirdweb.com`; bawaan Sepolia pada viem terpasang |
| Issuer baru khusus P2 | `0x211334Ab7398e2A7268014c31809bd712F033afa` |
| Registry yang direncanakan | `0x0F78a787142abF509b6A7178bA1bfDfb9c8b202d` |
| Kondisi registry | Alamat prediksi CREATE dari issuer nonce 0; **belum memiliki bytecode** |
| Audit operasional | `52d1031b-bdf0-4bc7-803c-8a59040975ab`, revisi 1 |
| Source / case / claim | `KAZ_S_159` / `MARS-REPORT-KAZ-S-159` / `source_detected` |
| Bundle SHA-256 | `0xc8bf622d1c87752a6d76dd5cca0c2e1897e78a1d017fe7b35f1b85951f82d442` |
| Konfirmasi minimum | 2 block; canonicality diperiksa kembali, bukan jaminan finalitas |

Audit dibuat melalui endpoint baseline dengan `FileAuditStore` nyata di bawah `flock`, pada state khusus baru. [Export operasional belum di-anchor](operational-baseline-unanchored.json) lolos verifier offline. Audit/hash kandidat terdahulu berbeda karena ID/waktu penerbitan baru dan **tidak** dianggap izin untuk operasi ini. Hanya metadata historis beratribusi digunakan; tidak ada hasil mitigasi buatan atau salinan isi laporan pihak ketiga.

Konfigurasi server/signing key baru disiapkan atas permintaan pengguna agar tim menanganinya. File `data/state/p2-sepolia/server.env` dan seluruh state di bawahnya diabaikan Git; direktori mode 0700, file konfigurasi/audit/marker mode 0600. Jangan menampilkan isi file tersebut. Signing tetap `ENABLE_CHAIN_WRITES=false`. State ini terpisah dari `data/state/audits.json` pengguna; API aktif tidak otomatis berpindah ke state baru.

## Perkembangan funding

Pengguna kemudian melaporkan faucet Chain Platform meminta saldo **0,001 ETH Mainnet**. Karena issuer baru tidak memenuhi syarat itu, penyelesaian CAPTCHA saja tidak cukup. Tidak diminta membeli/mentransfer ETH Mainnet. [Catatan lanjutan](funding-follow-up.json) memisahkan laporan pengguna dari pemeriksaan browser pertama.

QuickNode juga ditolak: pengguna melaporkan `Invalid ETH mainnet balance` pada formulir aktual. Ini bertentangan dengan FAQ resmi yang dipakai pada pemeriksaan sebelumnya. **Rekomendasi kesesuaian QuickNode untuk issuer baru ditarik**; tampilan awal/FAQ tidak membuktikan eligibility. [Catatan koreksi](funding-runtime-correction.json) menyimpan perbedaan bukti ini.

Pemeriksaan pertama pada alternatif: [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/), termasuk konfigurasi publik API. Config menyebut native SepETH, minimum klaim 0,05, CAPTCHA untuk mulai, serta modul PoW/passport. Browser memperlihatkan field alamat dan `Start Mining`. Tidak ada sesi/mining/klaim yang dimulai. Ketiadaan field mainnet-wallet dalam config klien tidak membuktikan eligibility server; penerimaan issuer dan payout masih belum diuji. Tidak ada instruksi membeli ETH Mainnet. Persetujuan deployment dan anchor sebelumnya tetap berlaku.

Atas permintaan pengguna berikutnya, agent **mencoba PoW langsung dua kali**: mengisi issuer dan menekan Start Mining, lalu satu muat ulang normal dan percobaan ulang. Kedua percobaan menghasilkan `[INVALID_CAPTCHA] captcha check failed: invalid token` dan `Could not start session`. Mining belum dimulai, tidak ada reward/claim, tidak ada upaya melewati CAPTCHA. Pemeriksaan RPC pada percobaan ini mengonfirmasi saldo **0 SepETH**, pending nonce **0**. [Catatan percobaan aktual](pow-agent-attempt.json) dan [tangkapan layar penolakan](pow-faucet-captcha-rejection.png) mendokumentasikan hasilnya. Integrasi P2 tetap belum selesai; target/hash serta izin deployment/anchor tetap berlaku.

## Operasi yang disetujui

1. Klaim satu drip **0,1 test ETH** dari [Chain Platform Sepolia Faucet](https://faucet.chainplatform.co/faucets/ethereum-sepolia) ke issuer di atas. Halaman browser menampilkan Ethereum Sepolia `11155111`, field alamat dan tombol `Get 0.1 ETH`. Setelah persetujuan, alamat diisi dan tombol diklik satu kali. Faucet menolak dengan pesan `Please complete the captcha verification first.` ([catatan percobaan](faucet-attempt.json)); tidak ada tx hash klaim. Pengguna diminta menyelesaikan CAPTCHA; tidak ada upaya melewati anti-abuse.
2. Deploy **satu** `EvidenceRegistry` tanpa constructor argument dari issuer nonce 0. Owner dan issuer awal adalah akun yang sama. Bytecode hasil `solc 0.8.24`, optimizer 200, dibekukan dalam [rincian operasi](deployment-and-anchor-review.json).
3. Setelah bytecode runtime, owner, `isIssuer`, nonce dan saldo diperiksa, anchor **satu** audit/hash di atas melalui jalur API dan intent durabel P2. Expected version 1; tidak ada `setIssuer`, anchor kedua, pembelian ETH, atau operasi Mainnet yang diajukan.
4. Jalankan verifier `--require-chain` dari proses lain dengan signing dimatikan, lalu uji salinan bundle/issuer yang diubah. Simpan receipt, tx hash deployment/anchor, block/hash, target dan hasil verifier. Baru setelah itu centang integrasi P2.

Batas yang disetujui: deployment paling banyak **3.000.000 gas**, anchor paling banyak **1.000.000 gas**, `maxFeePerGas` paling banyak **1 gwei**, total biaya jaringan paling banyak **0,004 Sepolia test ETH**, transfer value 0. Periksa ulang dan hentikan bila batas, nonce, target, bytecode atau hash berubah. Tidak ada izin untuk uang asli. Dua konfirmasi tidak membuktikan perbaikan metana.

[Simulasi RPC](deployment-and-anchor-review.json) memperkirakan deployment 2.239.773 gas dan anchor 355.539 gas. Estimasi memakai **state override sementara di simulasi**: saldo untuk issuer serta code/storage untuk registry yang belum ada. Tidak ada perubahan state jaringan; estimasi bukan bukti dana tersedia atau deployment berhasil. Estimasi wajib diulang terhadap kondisi aktual sebelum broadcast. Saat diperiksa, saldo issuer **0**, nonce latest/pending **0**, registry belum deployed.

[Persetujuan ketiga operasi](authorization.json) sudah diterima dan mengikat hash JSON rincian operasi. Persetujuan yang sama tidak perlu diminta ulang. Persetujuan diminta karena kontrak operasional **AGENTS.md** mensyaratkan approval untuk deploy/mutasi eksternal, dan [rencana P2](../../plans/2026-10-17-six-package-completion.md#6-p2--blockchain-aktif-pemulihan-dan-verifikasi) mensyaratkan target serta operasi yang diotorisasi. Eksekusi tetap menunggu funding dan pemeriksaan ulang target/batas; persetujuan tidak merupakan bukti transaksi berhasil.

## Pemeriksaan pada persiapan ini

- RPC publik nyata merespons Sepolia `11155111`; head, timestamp, saldo/nonce dan estimasi disimpan dalam JSON operasi.
- `sha256sum --check --quiet docs/evidence/blockchain-recovery-2026-10-17/implementation-files.sha256`: cocok; source implementasi lokal yang diuji sebelumnya tidak berubah.
- Tes terarah store/intent/idempotency/authority/chain: **25 lulus, 0 gagal, 105 assertions**, lima file. Hasil ini tidak dijumlahkan sebagai tambahan ke 589 tes snapshot terdahulu.
- Forge build/test kontrak: lulus. Tidak ada perubahan source kontrak.
- Verifier offline audit operasional: bundle VALID, receipt ABSENT.
- Pemeriksaan mode dan `git check-ignore`: konfigurasi dan state privat terlindungi/diabaikan. Tidak ada private key/token dalam paket bukti.

P2 tetap **in progress** sampai receipt Sepolia nyata dan pemeriksaan proses terpisah tersedia. P3–P6 tidak termasuk pekerjaan ini.
