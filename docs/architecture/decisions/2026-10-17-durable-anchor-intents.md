# ADR: intent anchor durabel pada file store

**Tanggal:** 17 Oktober 2026 · **Status:** diterima untuk prototipe satu writer lokal · **Paket:** P2

## Konteks

File store awal menyimpan array audit dengan rename tanpa flush. Jalur chain menyiarkan sebelum menyimpan hash transaksi. Tidak ada implementasi reservation/finalization durabel; write dinonaktifkan. P1 telah menyediakan launcher Linux flock, sehingga P2 dapat memakai batas satu writer tanpa mengembalikan database.

## Keputusan

Gunakan envelope `{ schemaVersion: 1, audits, anchorIntents }` pada path audit yang sama. Baca array legacy, pertahankan bundle/hash, migrasikan saat write. Flush file dan parent directory sebelum acknowledgement; gunakan marker untuk deteksi state hilang. Satu mutex store dan launcher flock melindungi proses resmi. Pemakaian langsung beberapa instance store yang menulis bersamaan tidak didukung.

Persiapkan dan tandatangani EIP-1559 di memori, hitung tx hash, simpan intent pending dengan nonce, target dan expected version, lalu broadcast sekali tanpa retry transport. Signed bytes tidak dipersist. Pending mengunci semua operasi issuer; reservasi juga menolak nonce bekas dan versi case yang stale. Completion hanya menerima receipt yang cocok dengan intent dan menulis receipt + state confirmed secara atomik.

Rekonsiliasi read-only memeriksa exact tx hash, from/to/calldata/nonce, chain, registry event/case/bundle/issuer/version, status, block canonical dan minimum konfirmasi. Receipt manual tidak dapat menggantikan identitas intent. Receipt dari jaringan lokal memakai konfigurasi tersendiri dan chain 31337; default publik tetap Sepolia 11155111. Signing default mati sampai `ENABLE_CHAIN_WRITES=true`.

## Aset dan batas kepercayaan

- Signer, admin/reviewer credential dan credential RPC hanya berada pada server. Input receipt/browser tidak dipercaya. Raw signed bytes dianggap replayable dan tidak diberikan kepada client.
- Penyerang tanpa credential tidak dapat reserve/reconcile/status. Reviewer anchor dibatasi schema 3 reviewed dan attestation direktori operator_attested yang masih berlaku untuk claim; batas waktu kecil antara check terakhir dan broadcast tidak atomik. Schema 4 privat dan schema 3 unreviewed ditolak pada write maupun recovery.
- Node RPC tetap sumber kepercayaan jaringan. Verifier terpisah membebaskan pemeriksaan dari API pembuat audit, tetapi memakai implementasi chain yang sama; bukan dua implementasi kriptografi independen.
- Issuer khusus dan writer lock adalah batas operasi. Penggunaan key di luar app, pemulihan backup lama, chain fork atau volume remote bisa melanggar asumsi; ini bukan multi-writer consensus.

## Konsekuensi

Crash sebelum broadcast bisa menyisakan pending yang tidak dapat dipulihkan otomatis; tidak ditemukan di RPC bukan izin mengirim ulang. Revert terkonfirmasi membuka attempt baru eksplisit. Receipt yang pernah confirmed tetap historis bila reorg terdeteksi kemudian; verifikasi terkini dapat gagal. Tidak ada cancel/replacement, watcher reorg, public deploy atau finality guarantee otomatis.

Jaminan lokal diuji menggunakan FileAuditStore nyata, Anvil disposable, SIGKILL proses dan verifier CLI dari proses lain. Bukti tersebut tidak menyelesaikan integrasi Sepolia publik. Instruksi operasi ada di [runbook P2](../../development/blockchain-recovery.md).

**Lanjutan 18 Oktober (P3):** [ADR lifecycle publikasi](2026-10-18-publication-lifecycle.md) menaikkan envelope menjadi versi 2 dengan event wajib, tanpa mengubah bundle/intent. Binary P2 lama tidak membaca envelope baru; gunakan roll-forward dan backup lengkap.
