# Kandidat operasi Sepolia — belum diotorisasi/dikirim

**Status:** menunggu target dan otorisasi; tidak ada transaksi publik dari pekerjaan ini.

| Bidang | Nilai / kondisi |
|---|---|
| Operasi yang disiapkan | Satu pemanggilan `EvidenceRegistry.anchor(bytes32 caseId, bytes32 bundleHash)` pada registry yang disetujui |
| Jaringan | Sepolia, chain ID `11155111`; bukan local Anvil 31337 |
| Audit kandidat | `e789857f-0118-48cb-915b-76f69ff58131` |
| Source/case | `KAZ_S_159` / `MARS-REPORT-KAZ-S-159`, metadata historis UNEP MARS |
| Claim | `source_detected`; bukan `mitigation_confirmed` |
| Bundle SHA-256 | `0xcde93cec8864aac5a9f190e19153388ec4a6024ed885afd165720ac84eb9ae20` |
| File | [public-baseline-candidate.json](public-baseline-candidate.json); checksum offline VALID, receipt ABSENT |
| Registry / public issuer | Belum diberikan atau dikonfigurasi |
| RPC read/write target | Belum diberikan atau dikonfigurasi; credential RPC tetap server-only |
| Signer | Belum dikonfigurasi; jangan mengirim private key melalui chat/repo |
| Konfirmasi | Default minimum 2 block, diperiksa lagi terhadap canonical block saat verifikasi; bukan jaminan finalitas |
| Biaya | Test ETH, estimasi belum dapat diambil tanpa target/RPC/signer yang cocok |
| Deploy | Tidak termasuk dalam satu operasi anchor. Registry baru memerlukan persetujuan deployment tersendiri. |

Kandidat belum dipersist dalam operational audit store; API tidak menerima import bebas yang mengganti record/hash. Setelah target diberikan, operator harus menyiapkan audit operasional yang sesuai menggunakan sumber/claim yang ditinjau, lalu membekukan ID/hash aktual dan estimasi gas untuk persetujuan sebelum broadcast. Bila hash berubah, kandidat lama tidak menjadi izin untuk isi baru.

Urutan penutupan: verifikasi read-only target/issuer/bytecode dan gas → persetujuan target serta audit/hash aktual → satu anchor melalui jalur intent durabel → verifier CLI dari proses lain `--require-chain` → simpan receipt dan hasil tamper check bertanggal. Simpan tx hash, chain, registry, issuer publik, bundle hash, expected/actual version, block/hash dan policy konfirmasi. Jangan menandai P2 integrasi selesai hanya dari konfigurasi atau receipt Anvil.

Keperluan persetujuan berasal dari **AGENTS.md** (deploy/mutasi eksternal memerlukan approval) dan [rencana P2](../../plans/2026-10-17-six-package-completion.md#6-p2--blockchain-aktif-pemulihan-dan-verifikasi) (target/operasi harus diotorisasi). Kode dan pemeriksaan lokal sudah dapat ditinjau; public target belum ditentukan.
