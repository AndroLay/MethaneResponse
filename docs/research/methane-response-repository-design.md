# Desain Repository MethaneResponse

> **Proposal repository terdahulu.** Dokumen ini menjelaskan rancangan saat riset awal, bukan susunan kode saat ini. Baca [peta repo](../repository-map.md), [arsitektur aktif](../architecture/overview.md) dan [ADR file lokal](../architecture/decisions/2026-10-15-local-prototype-no-database.md).

**Tanggal:** 11 Oktober 2026 (WITA)  
**Status:** starter telah diimpor ke root repository; fondasi demo sintetis ada, integrasi runtime belum diverifikasi  
**Ruang kerja proyek:** `/home/andro/dev/projects/Devpost/iEEE-Methane-response`  
**Referensi struktur:** `/home/andro/dev/projects/Devpost/RevenueCat Shipaton 2026` (Evidrilo; repositori yang sudah ada dan tidak diubah)

## Ringkasan

MethaneResponse adalah prototipe audit bukti untuk observasi metana. MVP mengambil snapshot data publik MARS, mempertahankan asal dan waktu pengambilan, menampilkan observasi dan riwayat kasus, lalu memungkinkan hash bundle bukti serta perubahan status diperiksa melalui kontrak EVM.

Proyek tidak akan mengklaim mendeteksi kebocoran lebih baik daripada MARS, membuktikan perbaikan fisik, atau mengukur emisi yang berhasil dihindari. Data MARS yang memuat feedback adalah bukti status feedback yang dipublikasikan; itu sendiri bukan konfirmasi mitigasi.

## Status starter yang diimpor

- Starter ZIP diimpor ke repository `/home/andro/dev/projects/Devpost/iEEE-Methane-response`; Git lokal tetap pada branch `main`, tanpa commit awal.
- Starter berisi UI/API dengan fixture sintetis, parser CSV lokal, baseline aturan, kontrak, dan migrasi target. API masih memakai Map in-memory; migrasi belum digunakan oleh API.
- Tidak ada dataset UNEP, koneksi database persisten, deployment Sepolia, LLM, atau model ML di starter.
- Pembuat starter melaporkan tiga uji Python lulus dan pemeriksaan sintaks sepuluh file TypeScript lulus. Laporan itu belum memiliki log di ZIP dan belum direproduksi dalam runtime ini.
- Bun tidak tersedia pada runtime ini; dependency install, build web, test runner Bun, dan Foundry belum dijalankan.
- Pemeriksaan statis menemukan ketidaksesuaian panjang hash antara API (`0x` + 64 digit) dan migrasi SQL (`CHAR(64)`). Migrasi starter sudah diperbaiki menjadi teks dengan format `0x` 64 digit hex.

## Konteks dan kendala

- Pengguna memilih React/Vite, TypeScript, Bun/Hono, PostgreSQL/PostGIS, Python untuk analisis offline, Solidity/Foundry/viem, dan deployment Cloudflare Pages + Render + Supabase.
- Referensi Evidrilo digunakan untuk prinsip pemisahan tanggung jawab dan dokumentasi keputusan. Modul, workflow, dan teknologi Evidrilo tidak disalin.
- Data publik MARS merupakan snapshot/replay, bukan feed real-time. Pipeline harus mencatat lisensi, URL, waktu pengambilan UTC, dan hash sumber.
- Jumlah observasi, kelengkapan label, dan kecukupan data untuk model belum diprofilkan dari berkas yang benar-benar akan dipakai. Model tidak boleh dianggap terbukti sebelum evaluasi.
- Path referensi sudah berisi aplikasi lain. Proyek baru disiapkan terpisah di workspace IEEE; penulisan ke path referensi tidak termasuk desain ini.

## Tujuan MVP

1. Mengimpor setidaknya satu snapshot sumber data MARS yang penggunaannya sesuai lisensi.
2. Menormalisasi observasi ke skema sumber, plume, dan waktu dengan provenance yang dapat ditelusuri.
3. Menampilkan peta, detail sumber, observasi berurutan, dan status feedback dengan label asal data yang jelas.
4. Membentuk bundle bukti deterministik, menghitung digest, mencatat commitment dan transisi kasus di testnet, serta memeriksa perubahan artefak.
5. Menyediakan prioritisasi transparan. Model prediktif hanya diaktifkan jika tersedia label dan pemisahan evaluasi yang layak.
6. Membedakan data asli, data yang dikirim pengguna, data demo sintetis, dan status transaksi yang belum berhasil.

## Bukan tujuan MVP

- Mengganti deteksi, atribusi fasilitas, atau sistem notifikasi MARS/Carbon Mapper.
- Menyebut status feedback sebagai bukti perbaikan kebocoran.
- Mengirim alert operasional real-time atau menjadi sistem respons darurat.
- Menerbitkan carbon credit, token, NFT, atau klaim pengurangan emisi.
- Menyimpan dokumen mentah atau data pribadi di blockchain.
- Membuat microservices, worker terpisah, autentikasi multi-organisasi, atau deployment produksi sebelum ada kebutuhan yang teruji.

## Pilihan arsitektur

| Pilihan | Bentuk | Trade-off |
|---|---|---|
| A — TypeScript API + batch Python (dipilih) | React/Vite, Hono/Bun, Postgres/PostGIS, pipeline Python offline, kontrak EVM | Cocok dengan stack yang dipilih; membutuhkan kontrak berkas/skema yang jelas antara pipeline dan API. |
| B — Python API utama | React/Vite, FastAPI, Postgres/PostGIS, pipeline dan model Python, kontrak EVM | Batas analitik lebih sederhana; mengganti pilihan backend TypeScript dan menggabungkan API dengan pipeline. |
| C — Dashboard statis | React/Vite membaca artefak lokal, kontrak EVM untuk demo | Jalur demo awal paling kecil; tidak menyediakan state kasus/API bersama dan kueri database. |

Pilihan A dipilih untuk MVP. API menjadi modular monolith; pemrosesan historis berjalan sebagai perintah batch lokal. Jika model perlu inferensi online atau Python batch tidak dapat menghasilkan artefak yang cukup untuk aplikasi, keputusan ini ditinjau ulang sebelum menambah service.

## Arsitektur dan kepemilikan

| Unit | Tanggung jawab | Teknologi | Kepemilikan data/interface |
|---|---|---|---|
| `apps/web` | Peta, filter, detail sumber/kasus, timeline, status audit | React, Vite, TypeScript, TanStack Query, React Router, MapLibre, ECharts | Mengonsumsi kontrak HTTP berversi; tidak mengakses DB atau kunci signer. |
| `apps/api` | REST API, validasi request, alur kasus, akses DB, verifikasi digest, pengiriman transaksi demo | Bun, Hono, Zod, Drizzle, viem | Pemilik state kasus dan komposisi adapter DB/chain. |
| `packages/shared` | Skema request/response dan tipe yang dipakai web/API | TypeScript, Zod | Kontrak lintas aplikasi; bukan tempat menyimpan logika database. |
| `services/data-pipeline` | Mengambil snapshot, memvalidasi schema, menormalisasi, membentuk fitur dan laporan evaluasi | Python, pandas; scikit-learn bila label cukup | Menulis artefak bertanda versi yang dibaca API; tidak menjadi API kedua untuk MVP. |
| `contracts` | Registry commitment dan catatan transisi yang dapat diperiksa publik | Solidity, Foundry | Menyimpan hash/ID pseudonim/jenis event; tidak menyimpan koordinat rinci atau isi berkas. |
| `platform/database` | Schema dan migrasi | PostgreSQL, PostGIS, Drizzle migrations | State aplikasi dan geometri/indeks spasial yang dipakai kueri. |
| Supabase Storage (opsional) | Menyediakan bundle bukti berukuran besar untuk diunduh | Object storage | Berkas off-chain; kontrak menyimpan digest, bukan URL rahasia atau isi. |

Zustand hanya ditambahkan bila state UI bersama—misalnya filter peta yang harus bertahan lintas panel—tidak tertangani sederhana oleh React. Hosted LLM menjadi adapter opsional untuk ringkasan berbasis fakta terverifikasi dan referensi sumber; keluaran LLM tidak menentukan status kasus atau klaim mitigasi.

## Alur data utama

```text
MARS CSV/GeoJSON
      │
      ▼
Python ingest ── simpan snapshot, URL, waktu UTC, lisensi, SHA-256
      │
      ▼
schema validation + normalization + feature/evaluation artifacts
      │
      ▼
PostgreSQL/PostGIS ◄──── Hono API ───── React/Vite
      │                    │                 ├─ MapLibre
      │                    │                 └─ ECharts
      │                    └──── viem signer (kunci hanya di backend)
      │                                      │
      └─ bundle evidence off-chain           ▼
                                    EVM testnet registry
                                    hashes + case events
```

Pipeline menyimpan snapshot mentah tanpa perubahan sebelum normalisasi. Setiap artefak hasil harus menunjuk ke snapshot dan versi skema yang membentuknya. Kueri spasial memakai SRID dan urutan koordinat yang dinyatakan eksplisit; data API mengirimkan GeoJSON/koordinat yang tervalidasi.

### AI dan batas inferensi

- Langkah pertama adalah baseline deterministik yang dapat dijelaskan, profil data, dan kumpulan contoh klaim/evidence yang diberi label secara manual.
- Baseline menilai dukungan untuk klaim yang sempit berdasarkan referensi bukti eksplisit. `supported` berarti didukung oleh bukti yang diberikan, bukan bukti itu sendiri sudah membuktikan keadaan fisik.
- Model atau LLM hanya dipertimbangkan jika baseline dan data menunjukkan kebutuhan yang terukur. Evaluasi harus memisahkan sumber antara train/test dan melaporkan kesalahan serta abstention.
- Jangan memprediksi perbaikan fisik hanya dari `feedback`, status akhir, atau tidak adanya plume lanjutan. Jangan memakai nilai `persistency` terbaru untuk merekonstruksi fitur historis jika mencakup observasi setelah cutoff.
- Jika ringkasan LLM nanti diaktifkan, ia hanya menerima field tervalidasi, menghasilkan JSON tervalidasi, dan mencantumkan ID observasi pendukung. Keluarannya adalah bantuan narasi, bukan keputusan audit.

### Ledger dan integritas bukti

Bundle kanonis mencakup identitas sumber publik, waktu tangkap, hash snapshot, versi normalisasi, ID kasus pseudonim, dan jenis transisi. Kontrak mencatat digest bundle, digest record sebelumnya, jenis event, waktu chain, dan pengirim. Event append-only mempertahankan urutan yang dapat diaudit.

Kontrak membuktikan bahwa digest yang sama dikomit dan dapat dicocokkan kembali. Ia tidak membuktikan kebenaran data sumber, identitas organisasi di balik alamat wallet, atau tindakan mitigasi di lapangan. Write key disimpan di environment API dan tidak masuk ke bundle frontend. Tidak ada data pribadi atau isi laporan sensitif yang dicatat on-chain.

## Struktur repository

```text
iEEE-Methane-response/
├── apps/
│   ├── web/                    # React/Vite SPA
│   └── api/                    # Hono modular monolith
├── services/
│   └── data-pipeline/          # ETL/evaluasi Python offline
├── packages/
│   └── shared/                 # Zod schemas dan tipe bersama web/API
├── contracts/
│   ├── src/                    # Solidity registry
│   ├── script/                 # deployment scripts
│   └── schemas/                # skema bundle bukti lintas runtime
├── platform/
│   └── database/               # Drizzle config dan Postgres/PostGIS migrations
├── data/
│   ├── raw/                    # file unduhan dikecualikan dari Git
│   ├── processed/              # artefak lokal dikecualikan dari Git bila besar
│   └── manifests/              # metadata sumber, lisensi, dan digest
├── docs/
│   ├── architecture/           # data flow dan batas klaim
│   ├── decisions/              # ADR ringkas
│   └── operations/             # setup, konfigurasi, dan demo fallback
├── scripts/                    # perintah ingest/export yang benar-benar dipakai
├── AGENTS.md                   # batas data, klaim, secrets, dan cara verifikasi
├── package.json                # Bun workspaces untuk aplikasi TypeScript
├── pyproject.toml              # environment pipeline Python
├── foundry.toml                # konfigurasi kontrak EVM
├── .env.example                # nama variabel saja, tanpa nilai rahasia
└── README.md
```

Tree mengikuti pola `apps/`, `contracts/`, `platform/`, `docs/`, dan `scripts/` pada repo referensi. Hanya folder yang memiliki file dan tanggung jawab nyata yang dibuat; tidak ada modul kosong atau worker terpisah untuk mencocokkan bentuk referensi. Bun menjadi package manager/workspace untuk kode TypeScript; `pyproject.toml` mengelola pipeline Python; Foundry mengelola kontrak.

## Kegagalan dan fallback demo

| Kondisi | Perilaku yang dirancang |
|---|---|
| Sumber data tidak tersedia | Baca snapshot yang disimpan; tampilkan waktu capture dan badge `cached`. |
| Schema berubah/field wajib hilang | Gagalkan ingest dengan laporan field yang hilang; jangan menulis record parsial sebagai data valid. |
| Data tidak cukup untuk skor model | Tampilkan `insufficient evidence` atau baseline aturan dengan penjelasan. |
| LLM/provider gagal | Sembunyikan ringkasan generatif; map, timeline, dan audit deterministik tetap berfungsi. |
| RPC/testnet gagal | Tampilkan `not anchored`/`pending`; verifikasi lokal boleh ditunjukkan tetapi tidak disebut transaksi publik. |
| Respons operator disimulasikan | Beri label simulasi di UI, bundle bukti, dan video demo. |

## Deployment dan konfigurasi

- `apps/web`: Cloudflare Pages sebagai SPA statis, output Vite `dist`.
- `apps/api`: Render runtime Bun dengan versi Bun yang dipin.
- Database: Supabase PostgreSQL; aktifkan PostGIS hanya melalui migrasi yang terdokumentasi. Supabase Storage bersifat opsional.
- Kontrak: uji lokal dengan Foundry, kemudian Sepolia untuk transaksi demo publik.
- Secrets: RPC URL dan private key testnet/LLM berada di environment backend. Tidak ada service-role key, database credential, atau signer key pada bundle Vite.
- API membatasi CORS ke domain demo yang dipakai. Environment lokal menyediakan URL frontend/API/database yang terpisah.

## Rencana verifikasi setelah implementasi disetujui

- Python: ingest snapshot, validasi schema, chronology/no-leakage, reproduksi metrik, dan lisensi/provenance manifest.
- API: validasi request Zod, alur status yang sah, digest round-trip, dan perilaku saat dependency gagal.
- Kontrak: Foundry untuk kontrol akses, duplikasi, status ilegal, dan komit/cek digest.
- Frontend: Vitest untuk komponen/format data; Playwright untuk satu alur demo dari detail sumber sampai hasil verifikasi.
- Pemeriksaan ujung-ke-ujung: satu snapshot asli, satu bundle bukti, satu transaksi testnet yang dapat diperiksa, dan satu tamper drill yang jelas dilabeli.

Perintah final belum dicantumkan karena lockfile, versi paket, migrasi, serta konfigurasi provider belum dibuat atau dijalankan. Tidak ada hasil build, test, ingest, atau deployment yang diklaim oleh dokumen desain ini. Rincian laporan yang disertakan pembuat starter dan status verifikasinya dicatat di `docs/history/delivery-notes.md`.

## Kriteria penerimaan vertical slice

1. Dari checkout bersih, petunjuk README menjelaskan setup dan menjalankan web/API/pipeline lokal.
2. Satu snapshot MARS yang diizinkan dapat diproses ulang dan menghasilkan manifest dengan URL, waktu UTC, lisensi, dan hash.
3. Detail sumber menampilkan observasi berurutan dengan field yang tertaut ke provenance.
4. Bundle bukti menghasilkan digest stabil; mengubah satu byte menyebabkan verifier melaporkan mismatch.
5. Kontrak testnet menyimpan commitment yang dapat dilihat melalui explorer; kegagalan RPC tidak ditampilkan sebagai sukses.
6. UI membedakan data publik, cache, input simulasi, model/baseline, dan bukti mitigasi.
7. Tidak ada klaim real-time atau kausal yang tidak didukung oleh data.

## Risiko dan keputusan yang belum dibuat

- Kelengkapan akses, row count, schema aktual, dan lisensi setiap file yang dipilih masih perlu dibuktikan sebelum pipeline dibangun.
- Kebutuhan PostGIS akan dipertahankan jika peta/kueri benar-benar memakai operasi spasial; jika hanya menampilkan titik, schema bisa dimulai dengan Postgres sederhana.
- Keunikan kebutuhan lintas-sumber dan manfaat pengguna belum divalidasi melalui wawancara; MVP adalah demonstrasi audit, bukan deployment organisasi.
- Jumlah dataset yang layak melatih model tidak diketahui. Pemilihan model tetap bersyarat pada profiling dan evaluasi.
- Repository baru diusulkan berada di workspace IEEE. Path Evidrilo tetap utuh dan menjadi referensi struktur sampai ada arahan lain.
