# Menjalankan aplikasi secara lokal

[Pusat dokumentasi](../README.md) · [Konfigurasi](configuration.md) · [Pengujian](../testing/README.md)

Semua perintah di halaman ini dijalankan dari root repository. Baseline memakai data bawaan dan file audit lokal; tidak memerlukan akun cloud, database, AI provider, atau wallet.

## 1. Prasyarat

| Kebutuhan | Versi/acuan | Diperlukan untuk |
|---|---|---|
| Bun | **1.4.2**, [.bun-version](../../.bun-version) | Install workspace, web, API, tes TypeScript |
| Python | **3.11+**, [pyproject.toml](../../services/data-pipeline/pyproject.toml) | Pipeline dan evaluasi |
| `uv` | Lockfile [uv.lock](../../services/data-pipeline/uv.lock) | Environment Python reproduktif |
| Foundry / `forge` | [foundry.toml](../../contracts/foundry.toml) | Tes kontrak Solidity |
| Chromium | Playwright managed browser atau executable host | Perjalanan E2E |

Untuk sekadar membuka aplikasi, Bun sudah cukup. Internet diperlukan untuk install dan layanan tiles/imagery peta; dataset historis dasar sudah disertakan. Peta mempunyai fallback bila imagery tidak tersedia.

## 2. Install dan jalankan

```bash
bun install --frozen-lockfile
```

Di terminal pertama:

```bash
bun run dev:api
```

Di terminal kedua:

```bash
bun run dev:web
```

| Alamat | Kegunaan |
|---|---|
| <http://localhost:5173> | Landing dan dashboard |
| <http://localhost:3001/api/health> | Kesiapan API/store/casebook |
| <http://localhost:3001/api/intelligence/status> | Integrasi opsional yang terkonfigurasi |

Vite meneruskan `/api` ke `http://localhost:3001`. Jika port diganti, selaraskan konfigurasi proxy dan origin melalui [panduan konfigurasi](configuration.md). API default bind ke `0.0.0.0`; `HOST=127.0.0.1` dapat dipakai untuk bind lokal.

## 3. Coba alur dasar

1. Buka [Map Explorer / KAZ_S_159](http://localhost:5173/dashboard/map?sourceId=KAZ_S_159).
2. Periksa snapshot, tanggal observasi, flux, dan uncertainty. Ini data historis.
3. Masuk Evidence Auditor, pilih claim `mitigation_confirmed`, lalu **Run rules baseline**. Data bawaan menghasilkan `insufficient_evidence` untuk klaim ini.
4. Buka history/Reports, ekspor JSON, dan periksa di Verification Center.
5. Untuk export aplikasi, gunakan `bun run verify:audit path/to/report.json --require-context`. Raw audit legacy tetap dapat diperiksa tanpa flag, dengan pesan keterbatasan konteks. Opsi tidak dikenal ditolak. Checksum export yang cocok tidak mengautentikasi issuer atau kebenaran fisik.

Untuk scope, catatan kerja, penilaian manual dan transparansi, lanjutkan ke [alur penggunaan](../product/user-workflow.md).

## 4. Konfigurasi opsional

Tidak ada `.env` yang wajib untuk baseline. Jika perlu pengaturan, salin isi [.env.example](../../.env.example) ke `apps/api/.env` **hanya bila file tujuan belum ada**. Bun memuat environment API saat command dijalankan di workspace itu. Jangan mengganti konfigurasi lokal yang sudah ada.

Human assessment memerlukan konfigurasi reviewer di server dan capability token. AI memerlukan konfigurasi provider/token serta consent pemrosesan dokumen. Pengaturan lengkap ada di [configuration.md](configuration.md). Write chain memerlukan opt-in server, target yang diperiksa dan otorisasi operasi; lihat [runbook P2](blockchain-recovery.md). Baseline tidak memerlukannya.

## 5. Data dan state yang dipakai

Launcher API membutuhkan Linux `flock` (util-linux); proses kedua pada path state yang sama ditolak. Semua command API resmi sudah memakai launcher.

- Data browser: snapshot/manifest di `apps/web/public/data/`.
- Data API: casebook `data/real/mars_casebook_2026-10-15.json` dan `data/processed/intelligence-snapshot.json`.
- Audit baru: default `data/state/audits.json`, dibuat oleh file store. Revisi tetap tersedia setelah restart bila file yang sama masih ada.
- Investigasi bersama opsional: file privat `.case-work.json` beserta `.initialized` di samping `AUDIT_STORE_PATH`; signed token/directory authority wajib. [Runbook](shared-casework.md) menjelaskan setup, import, konflik dan backup/restore.
- Catatan/preferensi lokal: browser ini saja; draft recovery per tab. Clear browser data tidak menghapus file audit server, tetapi menghapus catatan browser.

Jangan jalankan beberapa proses API penulis pada file audit yang sama. Import dataset lewat browser tidak mengganti dataset server. Ikuti [provenance dan rebuild](../../data/real/README.md) bila mengembangkan pipeline; tidak perlu regenerasi data untuk onboarding.

## 6. Build dan pemeriksaan

```bash
bun run build:web
bun run check:web-bundle
```

Build web menghasilkan `apps/web/dist`. Build tidak mengemas API menjadi layanan yang sudah berjalan. Untuk pemeriksaan perilaku, gunakan perintah yang sesuai di [panduan pengujian](../testing/README.md). Hosting terpisah dijelaskan di [deployment](../release/deployment.md).

## Masalah yang umum

| Gejala | Periksa |
|---|---|
| Port dipakai atau URL terbuka pada port lain | Baca alamat yang dilaporkan Vite/API; selaraskan `PORT`, proxy, dan `WEB_ORIGIN` |
| Web terbuka tetapi request `/api` gagal | API berjalan di port yang diharapkan dan `METHANE_API_PROXY_TARGET` benar |
| `/api/health` mengembalikan `503` | Field kesiapan store/casebook/rate limiter, path file dan izin baca/tulis |
| Insight/ranking `503` | Artefak intelligence dan input snapshot cocok; jangan menghapus manifest untuk melewati pemeriksaan |
| Imagery tidak muncul | Koneksi layanan tile/WebGL; data historis tetap memiliki batas terpisah dari imagery |
| Human assessment atau AI dinonaktifkan | Periksa flag di `/api/intelligence/status` dan konfigurasi opsional, tanpa membagikan secret |
| Audit sumber hasil import ditolak | Dataset browser belum tentu sama dengan snapshot yang dipin di API |
| Browser test tidak dapat mulai | Chromium tersedia dan environment mengizinkan proses/browser/port lokal; lihat [E2E](../testing/end-to-end.md) |
