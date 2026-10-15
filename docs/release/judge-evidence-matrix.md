# Matriks Bukti Kesiapan Penjurian — 14 Oktober 2026

> Catatan bertanggal ini mempertahankan bukti yang dikumpulkan saat PostGIS masih ada di implementasi. Keputusan 15 Oktober menghapus database dari scope aktif; lihat [keputusan scope prototipe](../architecture/decisions/2026-10-15-local-prototype-no-database.md). Hasil PostGIS di bawah adalah bukti historis, bukan dependensi atau kriteria kerja saat ini.

> **Jangan gunakan angka, snapshot, status skor, atau daftar gate dalam dokumen ini sebagai status terkini.** Isinya dibekukan per 14 Oktober dan mencakup hitungan uji serta asumsi deployment lama. Untuk implementasi, verifikasi, dan PR aktif, ikuti [status implementasi terkini](current-implementation-status.md), yang juga mencatat integrasi MARS Indicators 15 Oktober.

Dokumen ini membedakan hasil yang dapat diperiksa dari target yang belum terbukti. Ini **bukan nilai juri**. Halaman resmi Devpost memuat lima kriteria kualitatif tanpa bobot atau skala numerik resmi; target 18/20 adalah target internal pemilik proyek. [Rubrik resmi](https://ieee-climatechain-hack.devpost.com/)

## Kesimpulan

**Target internal 18/20 untuk empat kriteria belum dapat dinyatakan tercapai secara objektif.** Fondasi data dan validasi lokal kuat, tetapi belum ada bukti model AI live, transaksi Sepolia, deployment/database cloud, studi pengguna, atau hasil mitigasi yang dapat diatribusikan ke penggunaan produk. UI case evidence terbaru kini menampilkan imagery lokasi dan geometri plume publisher yang terikat ke observasi pilihan; ini meningkatkan keterujian workflow, bukan bukti dampak lingkungan atau akurasi model.

Yang terbukti secara lokal: peta memuat snapshot MARS historis yang hash-bound; alur membedakan observasi tertaut dan tidak tertaut; feed dinyatakan bukan live; dan missing observations tidak diperlakukan sebagai emisi nol. API, review/report/verifier, PostGIS sementara, kontrak, serta tampilan desktop/mobile lulus pemeriksaan yang tercatat di bawah. Tes tersebut membuktikan perilaku implementasi, bukan akurasi AI atau pengurangan emisi.

## Bukti data yang dapat direproduksi

| Pengukuran | Hasil snapshot aktif | Batas interpretasi |
|---|---:|---|
| Snapshot | `unep-mars-ccd8267c55ee` | Arsip historis, bukan feed live; dua rilis sebelumnya tetap di history |
| Sumber MARS | 4.213 | Identitas sumber asli dipertahankan |
| Baris plume | 30.357 | Observasi, bukan jumlah kasus audit |
| Plume dengan `sourceId` | 23.810 | Tautan dataset bukan verifikasi mitigasi |
| Tanpa `sourceId` | 6.547 | Dibiarkan unresolved, tidak ditebak sumbernya |
| Observasi dengan flux kosong | 1.050 | Missing tetap missing, bukan nol |
| Flux tepat nol | 20 | Berbeda dari missing |
| Koordinat valid dan flux positif | 29.287 | Flux per observasi dalam kg/h; simbol peta bukan batas plume atau konsentrasi kontinu |
| Rentang tanggal | 2020-10-29 – 2026-09-12 UTC | Tidak ada data setelah tanggal akhir snapshot |
| Kasus casebook | 3 | Metadata kasus nyata; link laporan tidak otomatis membuktikan isi atau mitigasi |
| SHA-256 arsip sumber | `ccd8267c55ee93304f7135059b3c23247a6d9442edf0fa32a4b97fae08042ab2` | Provenance UNEP IMEO MARS dan lisensi CC BY-NC-SA 4.0 tersimpan bersama snapshot |
| SHA-256 berkas gzip browser | `895a4ce26240080c28315eff106806e7b40e37c6ba8f328f787637a0d19fc0e0` | Cocok dengan manifest snapshot |
| SHA-256 konten terurai | `5e0f658303e149dedbfd8cdab5facd5876062b0ff9c5957daea83be8122b5a0b` | Cocok dengan manifest snapshot |
| Progressive source catalog | 352.408 byte gzip | Snapshot-bound; berisi 4.213 lokasi dan tanggal observasi, tanpa memuat semua riwayat plume |
| Catalog + bucket history `SEN_S_001` | 411.836 byte gzip | Satu bucket memuat 17 observasi; ukuran adalah total artefak, bukan pengukuran jaringan |
| Semua 64 history bucket | 3.106.998 byte gzip; 22.002.698 byte terurai | Catalog plus seluruh bucket: 3.459.406 byte gzip; fail-closed behavior tetap diuji saat bucket gagal |

IEA melaporkan sekitar 12% notifikasi MARS menerima respons pada 2025. Angka itu mengukur respons, bukan kebocoran yang gagal diperbaiki atau emisi yang berhasil dikurangi. MethaneResponse menargetkan keterlacakan klaim lanjutan dan tidak menggantikan MARS. [IEA, 2026](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system)

## Bukti implementasi dan pengujian lokal

Catatan tanggal: browser runs yang secara eksplisit menampilkan `unep-mars-e0721015e925` adalah bukti historis untuk snapshot 12 Oktober. Browser data aktif sekarang menggunakan `unep-mars-ccd8267c55ee`; alur baseline → report → verifier untuk snapshot aktif dicatat pada [checkpoint 14 Oktober](../history/execution-checkpoint-2026-10-14.md).

| Pemeriksaan | Hasil terbaru sampai 14 Oktober 2026 | Makna dan batasnya |
|---|---|---|
| `bun install --frozen-lockfile` | Selesai, tidak mengubah lockfile | Dependensi terkunci konsisten |
| `bun run check` | Lulus | Typecheck API dan web |
| `bun run test:api` tanpa database | 93 lulus, 10 dilewati, 0 gagal, 530 assertions | Integrasi PostGIS dilewati pada no-DB run; skips tidak dihitung sebagai lulus |
| API + `TEST_DATABASE_URL` | **101 lulus, 0 dilewati, 589 assertions** | Image `postgis/postgis:17-3.5-alpine` yang sama dengan CI; container disposable loopback dihentikan setelah tes; bukan bukti cloud |
| `bun run test:web` | **152 lulus, 0 gagal, 164.391 assertions** | Mencakup regressi navigasi dan snapshot; geometri untuk rilis aktif 4.213 source tersedia lewat publisher-shard loader. |
| `bun run test:verifier` | **4 lulus, 0 gagal, 31 assertions** | Hash/bundle lokal; bukan bukti Sepolia |
| `cd services/data-pipeline && uv run --locked pytest -q` | **117 lulus** pada 2026-10-14 | Pipeline, MARS, intelligence, evaluator, interval source-cluster, release gate macro-F1 dan prospective ledger; bukan akurasi AI dokumen atau validasi prospektif pada populasi baru |
| `bun run test:contracts` | 4 lulus | Otorisasi, revisi dan digest pada Foundry lokal |
| `bun run build:web` + `bun run check:web-bundle` | Lulus | App chunk 62,48 kB gzip dan delapan route chunks. Komponen footprint baru 6,72 kB raw / 2,54 kB gzip serta loader geometri 8,04 kB raw / 2,82 kB gzip tetap lazy. `MapPanel` 1.121,29 kB raw / 306,52 kB gzip tetap lazy dan menghasilkan notice ambang Vite; ada dua notice komentar upstream Zod |
| Chromium lokal `/dashboard/cases?sourceId=SEN_S_001` → Map Explorer | Sumber terpilih dibuka pada koordinat `14.805°, -17.311° · z11.0` | Kanvas 660×534 desktop; pada 390×844 kanvas 338×438 tanpa overflow; query/source selection bertahan. Tile imagery provider memuat HTTP 200, software-WebGL memberi warning performa, tanpa page errors |
| Chromium lokal Evidence Auditor `SEN_S_001` → `KAZ_S_159` | Tiga tile Esri 256×256, tiga rekaman history, dan publisher geometry `VERIFIED` | Record 2026-07-11 menunjukkan 496 kg/h ±226 kg/h dan cocok dengan sumber/tanggal yang dipilih. Gambar Esri adalah konteks lokasi, bukan citra overpass. |
| Chromium lokal Cases → full case → Evidence, `SEN_S_001` | Desktop 1280×800 dan mobile 390×844; imagery lokasi zoom 16; status geometri `VERIFIED`; picker memilih overpass 2026-06-21 dan 2026-02-18 | Setiap pilihan menampilkan polygon, plume ID, waktu UTC, flux dan standar deviasi dari record yang sama. Browser meminta shard bulanan terikat hash (HTTP 200); tidak ada file gambar per case. Console error: 0. Screenshot ada pada `.playwright-cli/`; imagery tetap bergantung pada layanan tile Esri. |
| Progressive history gagal → retry | Bucket `005` map dan bucket `003` auditor sengaja diblokir lalu dicoba ulang | Sebelum retry peta menunjukkan 0 observasi dan auditor `History unavailable`; setelah retry map menunjukkan 30.319 plume rows dan auditor 17 rows; tidak ada data parsial |
| Cakupan lokasi dan imagery kasus | 4.211/4.211 sumber memiliki koordinat WGS84 valid; tes menghasilkan fallback imagery untuk tiap sumber dan mencocokkan geometry latest observation bagi tiap source | Citra adalah konteks lokasi Esri yang tanggalnya bervariasi. Sebagian JPEG provider memiliki pola mosaic pantai gelap yang sudah ada pada byte sumber; peta menyediakan basemap alternatif. 23.785 plume tertaut punya geometri resmi; imagery bukan gambar overpass atau bukti mitigasi |
| API `/api/intelligence/insights?sourceId=KAZ_S_159` | Cocok dengan ID snapshot peta; 3 tanggal observasi; `dataSufficiency=limited`; forecast `not_available` | Skor prioritas adalah heuristik, bukan probabilitas kebocoran atau prediksi |
| Viewport 390×844 | Lebar dokumen 390 px; kanvas dan legenda hadir | Uji viewport Chromium, bukan ponsel fisik |
| Cold production map route | App transfer 57.148 B; kanvas siap 2.078 ms desktop dan 1.992 ms mobile; 0 chunk workspace lain diminta pada load awal | Satu run per viewport dengan software WebGL; empat long task teramati (maksimum 263/248 ms). Tidak membuktikan FPS, distribusi performa atau kecepatan di jaringan/perangkat lain |
| API lokal `/api/health` | `status=ok`, `backend=file`, `persistent=true`, `casebookReady=true`, chain nonaktif | File store lokal, bukan PostgreSQL/cloud availability |

Artefak visual lokal: `/tmp/methane-map-final-desktop.png`, `/tmp/methane-map-final-mobile-adjusted.png`, `/tmp/methane-evidence-auditor-final-loaded.png`, dan `/tmp/methane-evidence-auditor-mobile.png`. Tidak dimasukkan ke repository karena tangkapan layar memuat basemap pihak ketiga yang memiliki ketentuan redistribusi sendiri.

Pembaruan pengukuran produksi lokal 13 Oktober: setelah App entry menjadi 56,85 kB gzip dan delapan route chunks ditambahkan, Chromium mengukur transfer App 57.148 B serta waktu siap kanvas 2.078 ms pada 1280×900 dan 1.992 ms pada 390×844. Tidak ada workspace chunk lain yang diminta dari awal, overflow horizontal, atau error halaman. Hanya satu cold run per viewport; software WebGL mencatat empat long task (maksimum 263/248 ms), sehingga angka ini bukan jaminan FPS atau distribusi performa.

## Matriks empat kriteria yang ditargetkan

| Kriteria | Bukti terukur sekarang | Gerbang bukti untuk target internal ≥18/20 | Status gerbang |
|---|---|---|---|
| **Climate Impact** | Dataset sumber primer; alur membedakan deteksi, notifikasi, respons, dan mitigasi; klaim tanpa bukti abstain. Konteks masalah didukung laporan IEA. | Pilot dengan peneliti/auditor/organisasi lingkungan; ukur waktu pemeriksaan, kelengkapan provenance/kutipan, dan proporsi klaim yang dikoreksi. Nyatakan dampak transparansi bila pengurangan emisi belum diukur; klaim mitigasi fisik perlu bukti follow-up relevan. | **Belum lulus** — belum ada peserta pilot/hasil dampak penggunaan atau pengurangan emisi yang teratribusi. |
| **Innovation & Creativity** | Audit klaim yang menambahkan kutipan exact, abstention, kontradiksi, consent, review, revisi immutable, hash bundle dan pemulihan receipt; ada tes regresi. Evaluator kini menghitung interval 95% source-cluster untuk macro-F1, precision kutipan, dan selisih berpasangan terhadap baseline; sumber serta dokumen dipisahkan lintas split. | Model nyata pada benchmark berlabel independen dan source- serta document-disjoint, dibandingkan dengan rules baseline pada klaim yang sama. Target rencana: 40–80 klaim held-out dari 10–20 dokumen berizin. Bila blockchain menjadi bagian demo, verifikasi transaksi Sepolia secara independen. | **Parsial** — evaluator dan interval sudah tersedia, tetapi belum ada corpus berizin, hasil model live, atau receipt testnet. |
| **Technical Execution** | Typecheck/build dan local gate lulus; 101 API dengan PostGIS, 4 Foundry, **117 Python**, 152 web, 4 verifier, browser Chromium, retry shard, dan verifikasi hash snapshot. | Workflow lengkap dari origin deployment: PostgreSQL durable setelah restart, assessment provider dengan kutipan tervalidasi, review terotorisasi, revision report, anchor Sepolia dan pemeriksaan event/hash verifier terpisah. Pecah chunk besar atau ukur dampaknya pada perangkat sasaran. | **Lokal lulus; production gate belum lulus** — preview memakai file store, AI dan chain nonaktif, tidak ada deployment/perangkat fisik. |
| **Practical Usefulness** | Alur lokal menampilkan observasi/provenance, insight heuristik, Evidence Auditor/review/report/verifier; kasus tanpa dokumen tidak dikonfirmasi. | Pengguna sasaran menyelesaikan tugas tanpa bantuan; catat keberhasilan, kesalahan, waktu dan umpan balik; verifikasi penyimpanan/akses dari origin yang dapat dibuka juri. Tentukan identitas/ownership sebelum lintas organisasi karena reviewer saat ini memakai token layanan. | **Parsial** — fungsi lokal ada, belum ada studi pengguna, deployment, atau identitas per pengguna. |

## Baseline dan AI

Laporan rules baseline berisi 15 contoh: 9 contoh casebook dan 6 fixture `DEMO`. Setelah semantik notifikasi sumber diperketat, ketiga contoh real `operator_notified` sekarang `insufficient_evidence` tanpa sitasi. Dukungan real terdiri dari 3 `supported`, 6 `insufficient_evidence`, dan 0 `contradicted`; macro-F1 real 0,6667. Macro-F1 gabungan 1,00 mencampur data sintetis (7/7/1 per label) dan tidak mengukur AI. Sampel memiliki 0 false mitigation confirmation, bukan jaminan generalisasi atau hasil benchmark model.

Evaluator AI independen dan CLI model tersedia: pemeriksaan kutipan persis, source- dan document-disjoint splits, release floor macro-F1 0,80, batas input, klaim berizin, persetujuan eksplisit untuk panggilan berbayar, dan output privat. Belum ada dataset yang memenuhi syarat dan provider tidak dikonfigurasi, jadi tidak ada hasil AI live. Jangan menyebut baseline rules sebagai akurasi AI.

## Konfigurasi dan pekerjaan tersisa

- Preview menggunakan file store lokal (`persistent=true` pada health route), bukan database cloud.
- Provider AI, `DATABASE_URL`, reviewer secret, RPC Sepolia, registry address dan signing key tidak disediakan di konfigurasi yang diperiksa.
- `chainConfigured=false` dan `chainWriteConfigured=false`; tidak ada transaksi Sepolia yang dikirim.
- Repository dilaporkan publik; anonymous access sebelumnya dibuktikan dengan `git ls-remote` dan shallow clone pada commit `99662e6de86b1d745e6ce3589ce37a9ed6c0d66c`. Working tree yang lebih baru belum tercakup commit publik tersebut dan GitHub tidak dapat diverifikasi ulang dari jaringan sesi ini. Devpost meminta repo publik, video demo 3–5 menit, deskripsi, dan prototype/PoC. [Persyaratan submission](https://ieee-climatechain-hack.devpost.com/)

Belum dilakukan deployment, panggilan provider berbayar, transaksi blockchain, pembuatan akun, perubahan visibilitas repo, atau submission.

Prioritas penutupan gerbang: (1) dapatkan laporan mitigasi dengan hak pemrosesan yang jelas lalu anotasi/adjudikasi manusia; (2) konfigurasi provider backend dengan persetujuan pemilik dan evaluasi held-out tanpa membundel konten; (3) uji migrasi/persistensi pada database yang dimiliki melalui deployment juri; (4) jika diizinkan, deploy/anchor di Sepolia dan verifikasi receipt dari klien independen; (5) lakukan pilot tugas dengan pengguna sasaran; (6) bereskan lisensi aset dan klarifikasi aturan, lalu cocokkan revision lokal dengan revision publik sebelum submission.

Kriteria resmi bersifat kualitatif. Gerbang di atas mendukung target internal, bukan jaminan nilai, peringkat, dampak fisik, atau kemenangan.
