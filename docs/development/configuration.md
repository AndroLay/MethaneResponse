# Konfigurasi

[Setup lokal](local-setup.md) · [API](../architecture/api-reference.md) · [Trust dan transparansi](../product/trust-and-transparency.md)

Acuan contoh: [.env.example](../../.env.example) untuk API dan [apps/web/.env.example](../../apps/web/.env.example) untuk web. Nilai rahasia tidak dicantumkan di dokumentasi. Baseline lokal berjalan tanpa membuat `.env`.

## Runtime dan dataset API

| Variabel | Default/peran |
|---|---|
| `HOST` | `0.0.0.0`; gunakan `127.0.0.1` untuk bind lokal bila diinginkan |
| `PORT` | `3001` |
| `WEB_ORIGIN` | `http://localhost:5173`, origin yang diizinkan oleh CORS |
| `AUDIT_STORE_PATH` | Default kode: `data/state/audits.json` dari root repo; path eksplisit relatif mengikuti working directory proses |
| `MARS_CASEBOOK_PATH` | Default kode: `data/real/mars_casebook_2026-10-15.json` |
| `INTELLIGENCE_SNAPSHOT_PATH` | Default kode: `data/processed/intelligence-snapshot.json` |
| `INTELLIGENCE_INPUT_PATH` | Default kode: `apps/web/public/data/mars-snapshot.json.gz`; diperiksa kecocokannya dengan intelligence |
| `NODE_ENV` | `production` mengaktifkan pembatasan tambahan untuk baseline/legacy credentials |
| `ADMIN_API_TOKEN` | Token admin terpisah; diperlukan untuk write baseline production secara default |
| `ENABLE_PUBLIC_BASELINE_AUDITS` | Hanya `true` membuka write baseline tanpa admin dalam production; rate limit tetap berlaku |

Path pada root `.env.example` memakai konteks `apps/api` karena `bun run dev:api` berpindah ke direktori tersebut. Absolute path dapat dipakai untuk menghindari ambiguitas. CORS bukan pengganti otorisasi. Launcher API memerlukan Linux `flock` dan menghasilkan lock stabil serta state/marker casework di samping path audit. Gunakan [runbook tim](shared-casework.md) untuk permission, backup dan restore; jangan menjalankan entry point `index.ts` langsung.

## Reviewer dan penilaian manusia

| Variabel | Peran |
|---|---|
| `REVIEWER_AUTH_SECRET` | Secret server untuk menerbitkan/memverifikasi capability reviewer berumur pendek; minimal 32 bytes UTF-8 |
| `REVIEWER_DIRECTORY_PATH` | JSON directory privat milik operator; tidak diletakkan di `apps/web/public` atau data publik |
| `REQUIRE_ATTESTED_HUMAN_REVIEWERS` | `true` mewajibkan current operator attestation untuk kategori klaim pada human read/decision yang dilindungi |
| `HUMAN_REVIEW_TOKEN` + `HUMAN_REVIEWER_ID` | Shared-token compatibility untuk development; token terpisah, minimal 32 karakter dan ID server |
| `ALLOW_LEGACY_SHARED_REVIEWER_TOKEN` | Opt-in compatibility production; tidak memberikan scope anchor |

Scope token: `private_read`, `review`, dan `anchor`. Tool lokal [issue-reviewer-token.ts](../../scripts/issue-reviewer-token.ts) memakai secret server yang sama. Contoh berikut **menerbitkan credential sensitif ke stdout**; jalankan hanya di terminal privat yang sesuai, bukan log CI:

```bash
bun --env-file=apps/api/.env scripts/issue-reviewer-token.ts DEMO-reviewer private_read,review 3600
```

`DEMO-reviewer` adalah identifier contoh, bukan reviewer nyata yang sudah didaftarkan. Token tidak membuktikan identitas atau kompetensi. **P1 shared casework selalu menolak legacy token dan approval directory yang bukan current `operator_attested`, sekalipun strict-mode audit tidak diaktifkan.** Baca memerlukan `private_read`, tulis memerlukan kedua scope `private_read,review`. Format directory, status, revocation, dan conflict declarations dijelaskan di [trust dan transparansi](../product/trust-and-transparency.md).

Secara default compatibility mode dapat menerima subject unverified/expired dengan label assurance yang sesuai. Untuk mencabut approval token yang masih valid, pertahankan entry dengan `disabled: true`; menghapus entry atau mengosongkan path bukan revocation dalam compatibility mode. Directory configured tetapi tidak valid/tidak terbaca menolak akses human yang dilindungi.

## Document AI opsional

`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, dan `AI_REVIEW_TOKEN` diperlukan agar jalur assessment dapat dipakai. Provider remote memakai HTTPS; kode mengizinkan HTTP hanya untuk `localhost`, `127.0.0.1`, atau `[::1]` sebagai provider lokal/test. `AI_REVIEW_TOKEN` minimal 32 karakter dan harus berbeda dari token admin/shared reviewer. API menambahkan `/chat/completions` ke base URL. Kode menggunakan interface provider yang kompatibel, bukan akun/provider yang sudah diaktifkan di repo.

Provider menerima excerpt hanya setelah declaration hak pemrosesan dan consent. Secret provider tetap di server. Token assessment yang dimasukkan pengguna di UI tidak membuka history privat. API tidak menyimpan full excerpt, tetapi kutipan dan metadata terpilih pada audit privat tetap dapat sensitif. Lihat [alur dokumen](../product/user-workflow.md#optional-document-ai).

Model yang akan disediakan pengguna adalah Luna; endpoint dan kompatibilitasnya
belum diverifikasi. Ikuti [catatan integrasi Luna](luna-integration.md) ketika
konfigurasi tersedia. Jalur rules/manual tidak memerlukan model tersebut.

## Web dan proxy

| Variabel | Peran |
|---|---|
| `VITE_API_BASE_URL` | Origin API publik untuk build web terpisah; kosong berarti request relatif `/api` |
| `METHANE_API_PROXY_TARGET` | Origin HTTP(S) API untuk development Vite; default `http://localhost:3001`; tanpa path/credential/query |

Setiap nilai `VITE_*` dapat masuk bundle browser. Gunakan hanya informasi publik; provider key, signing key, token admin/reviewer, dan RPC bercredential tidak boleh ditempatkan di sana. Variabel isolasi E2E dikelola runner dan bukan pengaturan aplikasi sehari-hari.

## Receipt blockchain dan hosting

`SEPOLIA_RPC_URL` dan `AUDIT_REGISTRY_ADDRESS` mengonfigurasi pembacaan Sepolia (chain 11155111). Signing hanya aktif bila `ENABLE_CHAIN_WRITES=true` serta `SEPOLIA_PRIVATE_KEY` valid; default mati. `CHAIN_CONFIRMATIONS` default 2, rentang 1–64. RPC/key tidak dibutuhkan untuk baseline/checksum. Aktivasi tidak menggantikan persetujuan target/operasi publik.

`CHAIN_NETWORK=local` memilih Anvil chain 31337 dengan variabel terpisah: `LOCAL_CHAIN_RPC_URL` (hanya loopback), `LOCAL_REGISTRY_ADDRESS`, `LOCAL_CHAIN_PRIVATE_KEY`. Mode ini ditolak dalam production; tidak memakai fallback signer Sepolia. Default `CHAIN_NETWORK` adalah Sepolia.

File store menyediakan intent durabel dan completion atomik, di bawah launcher satu writer. Status target menampilkan chain/registry/issuer dan kesiapan signing sebelum submit; pending hanya direkonsiliasi read-only. Detail, batas crash dan backup ada di [runbook blockchain](blockchain-recovery.md).

Root `render.yaml` menyediakan opsi preview dengan file audit di `/tmp`; filesystem dapat hilang saat restart/redeploy. Panduan ini tidak mengubah credential, directory, deployment, atau service eksternal. Lihat [status deployment](../release/deployment.md).
