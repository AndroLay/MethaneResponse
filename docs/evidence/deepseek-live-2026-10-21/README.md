# DeepSeek live-provider smoke — 21 Oktober 2026

**Hasil:** 3/3 skenario DEMO lulus melalui route Hono dan provider nyata;
5 panggilan HTTP 200, model respons `deepseek-v4.1-flash-1017` pada semuanya.
Ringkasan mesin: [smoke-summary.json](smoke-summary.json).

| Skenario dokumen DEMO | Verdict tersimpan | Waktu total assessment |
|---|---|---:|
| Dokumen menyatakan deteksi sumber | `supported` | 7.420 ms |
| Respons administratif tanpa verifikasi mitigasi | `insufficient_evidence` | 3.538 ms |
| Ledger secara eksplisit menyangkal notifikasi pada tanggal klaim | `contradicted` | 4.268 ms |

Ketiga respons API HTTP 201 memiliki bundle dengan hash dan envelope valid.
Strong verdict melewati pemeriksaan kedua oleh provider yang sama dan validasi
kutipan exact; ini bukan validasi independen. Laporan penuh disimpan privat di
`delivery-output/deepseek-live-2026-10-21/live-smoke.json`, dengan checksum pada
ringkasan. Hasil direkam pada working tree berdasarkan `b3f96a0` yang sudah
dimodifikasi; jangan mengatribusikannya ke source `b3f96a0` yang belum berubah.
Reproduksi melalui [panduan integrasi](../../development/deepseek-integration.md).

## Pemeriksaan software baru

- `bun run check`: lulus (API, web, browser/evaluation tooling typecheck).
- `bun run test:api`: 301 lulus, 0 gagal.
- `bun run test:verifier`: 66 lulus, 0 gagal, termasuk 3 guard live probe.
- Regresi provider/profile: 11 lulus, sudah termasuk dalam 301 tes API;
  termasuk penolakan respons yang terpotong setelah batas output ditambahkan.
- Konfigurasi deployment: 2 lulus, sudah termasuk dalam 66 tooling tests.
- Workflow browser/schema: 12 lulus (11 perjalanan browser + 1 schema check)
  pada Chromium headless shell 156 / Playwright 1.64.1, tanpa perubahan assertion,
  timeout atau sandbox. Menggunakan provider mock terisolasi, bukan 12 evaluasi
  provider nyata. Build Vite ikut lulus pada runner ini.
- Percobaan pertama terhenti karena browser default belum terpasang. Chromium
  sistem 153 menghasilkan 7 pass/5 fail (termasuk protocol response-body error).
  Unduhan ke /tmp terkena quota tulis; cache browser dipindahkan ke direktori
  `.playwright-cli/` yang diabaikan Git. Pin Chromium 156 kemudian lulus 12/12.

## Interpretasi dan biaya

Provider melaporkan total 2.407 token dan biaya USD 0,001001436 untuk lima
panggilan. Ini metadata respons, bukan audit invoice/pembayaran atau jaminan
panggilan berikutnya gratis. Deployment Render belum dilakukan karena batas Rp0
workspace belum terverifikasi; tidak ada biaya Render yang dipicu oleh pekerjaan ini.

Dokumen uji dikarang proyek, diberi label DEMO, dan hanya berada dalam in-memory
store sementara. Identifier KAZ_S_159 mengikat route/provenance nyata; kalimat
DEMO tidak menjadi bukti observasi atau notifikasi nyata. Hasil ini menunjukkan
kompatibilitas transport dan workflow pada tiga contoh, bukan benchmark akurasi,
peningkatan atas rules, pilot manusia, atau bukti repair/pengurangan emisi.
