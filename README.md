# MethaneResponse

**Memilih investigasi metana, menelusuri bukti, dan mempertanggungjawabkan keputusan.**

MethaneResponse membantu tim memilih sumber metana sesuai kapasitas investigasi, memeriksa klaim terhadap data historis UNEP MARS dan dokumen, serta mencatat permintaan bukti dan keputusan reviewer. Ketika bukti berubah, sistem menjelaskan keputusan mana yang perlu ditinjau ulang; laporan berversi dapat diperiksa integritasnya secara independen.

**Status:** proof of concept lokal untuk IEEE ClimateChain 2026. Web dan API memakai snapshot historis serta file JSON lokal. AI bersifat opsional. Write blockchain melalui API tersedia dengan opt-in server dan intent durabel. Pemulihan sudah diuji pada Anvil lokal; receipt Sepolia publik belum tersedia. Rincian kemampuan dan bukti terakhir ada di [status implementasi](docs/release/current-implementation-status.md).

[P5/P6 melalui agent selesai](docs/evidence/p5-p6-agent-completion-2026-10-18/README.md): 48 tugas manual/app oleh dua agent dalam enam sesi berulang, 72 klaim test/12 sumber dinilai dua konteks agent, perbaikan CLI serta 708 tes lokal lulus. Hasil tidak menunjukkan manfaat AI dibanding rules pada challenge ini. Pilot manusia dan benchmark provider independen belum terpenuhi; P4 menunggu review sesuai arahan pengguna.

## Mulai memahami repo

**DeepSeek live — 21 Oktober:** model `deepseek-v4.1-flash-1017` melalui
ExperientialLabs menggantikan rencana Luna. Tiga skenario dokumen DEMO lulus
melalui provider nyata, exact citations dan bundle hash; ini smoke integrasi,
bukan benchmark akurasi independen. [Konfigurasi privat](docs/development/deepseek-integration.md)
· [Bukti dan batas](docs/evidence/deepseek-live-2026-10-21/README.md).

**P2 delivery — 20 Oktober:** pemeriksaan kandidat klaim/evidence terkait pada investigasi privat, interpretasi reviewer yang disimpan ke riwayat, verifier CLI, serta downloader dan intake snapshot opt-in. Rilis UNEP 20 Oktober sudah diunduh dan dibandingkan di staging; snapshot aktif tidak diganti. [Panduan dan batas](docs/development/evidence-overlap-and-snapshot-intake.md) · [Bukti terbaru](docs/evidence/p2-delivery-2026-10-20/README.md).

**Connected Investigations — 20 Oktober:** hubungkan persetujuan alokasi, permintaan/respons bukti append-only, assessment berscope dan keputusan reviewer yang membekukan dossier tepat. Verifier memeriksa digest terpisah serta receipt kontrak ketika dikonfigurasi; bukti baru dapat merekomendasikan review tanpa menulis ulang keputusan lama. Tetap tanpa database. [Workflow dan recovery](docs/development/connected-investigations.md) · [Bukti lokal](docs/evidence/connected-investigations-2026-10-20/README.md).

**Snapshot Change Watch — 20 Oktober:** bandingkan dua rilis historis lengkap berdasarkan source/plume ID asli. Temukan perubahan yang memengaruhi rencana terpilih, buka nilai sebelum/sesudah, lalu lanjutkan ke evidence atau peta. Pada input yang dibundel: **7 source baru, 95 plume record tambahan (13 backfill), dan 3 record berubah**; tiga sumber dalam alokasi default memerlukan tinjauan record. Verifier menjalankan ulang diff dari kedua input asli, termasuk ketika laporan diubah dan hash-nya dihitung ulang. Ini perbandingan arsip historis, bukan feed live atau bukti kebocoran baru. [Panduan](docs/product/user-workflow.md#tinjau-perubahan-dua-snapshot-historis) · [Bukti dan replay](docs/evidence/snapshot-change-watch-2026-10-20/README.md).

**Investigation Operations — 20 Oktober:** aktifkan salah satu rencana untuk menampilkan **antrean dan ring peta dengan ID yang sama**; bandingkan kapasitas 10→20 tanpa diam-diam mengganti pilihan aktif. Impor rencana terdahulu dengan digest tepercaya, lalu tinjau perubahan parameter atau ringkasan snapshot. Reviewer berwenang dapat menyimpan keputusan accept/defer/reject berversi dan mengekspor riwayat untuk verifier CLI. Tetap tanpa database; keputusan rencana bukan konfirmasi mitigasi atau receipt blockchain. [Panduan](docs/product/user-workflow.md#operasikan-dan-tinjau-rencana) · [Bukti](docs/evidence/investigation-operations-2026-10-20/README.md).

**Investigation Capacity Planner — 19 Oktober:** dari **Cases → Plan investigation capacity**, tetapkan slot tim dan batas per negara, lalu bandingkan empat portofolio pada snapshot yang sama. Periksa alasan terpilih/terlewat, sensitivity terhadap asumsi, dan buka kasus, peta atau Evidence Auditor dengan source ID yang sama. Ekspor berkas replay berversi; ini alokasi investigasi, bukan estimasi repair atau emisi yang dapat dihindari. [Metode dan cakupan](docs/plans/2026-10-19-investigation-planner.md).

**Increment 19 Oktober — [Evidence Decision Lab](docs/evidence/decision-lab-2026-10-19/README.md):** jelaskan kelayakan setiap referensi, lihat perubahan keputusan ketika referensi dihapus, lalu ekspor permintaan bukti dengan acceptance checks. Lima challenge DEMO terpisah menunjukkan hasil lengkap, kurang bukti, contrary dan konflik. Pengujian chain lokal juga menolak laporan yang telah diubah **dan dihitung ulang checksum-nya** karena berbeda dari commitment kontrak. Ini tetap prototipe metadata, bukan sertifikasi repair.

**Tambahan — [Observation Claim Cross-Check](docs/evidence/observation-crosscheck-2026-10-19/README.md):** periksa pernyataan tentang ada/tidaknya rekaman deteksi atau ambang estimasi flux pada periode tertentu. Hasil menunjuk plume ID penyangkal, tanggal asli, nilai dan SD, dilengkapi grafik titik serta follow-up draft. Pemindaian 4.218 sumber/23.861 rekaman terkait cocok dengan implementasi Python terpisah pada input yang sama. Pernyataan adalah skenario analis, bukan tuduhan kepada operator; hasil ini bukan konfirmasi repair atau benchmark ilmiah independen.

| Kebutuhan | Baca |
|---|---|
| Memahami seluruh repo secara berurutan | [Pusat dokumentasi](docs/README.md) |
| Menemukan folder dan file yang perlu diubah | [Peta repository](docs/repository-map.md) |
| Memahami komponen dan hubungan antarlayanan | [Arsitektur](docs/architecture/overview.md) |
| Mengikuti perjalanan pengguna | [Alur penggunaan](docs/product/user-workflow.md) |
| Menjalankan aplikasi dan mengatur opsi | [Setup lokal](docs/development/local-setup.md) · [Konfigurasi](docs/development/configuration.md) |
| Memahami istilah | [Glosarium](docs/glossary.md) |

## Masalah dan alur produk

Deteksi satelit dapat mendukung klaim adanya observasi metana. Pemeriksaan penerimaan notifikasi, tindakan operator, dan mitigasi membutuhkan bukti yang berbeda. MethaneResponse menyediakan alur untuk memeriksa perbedaan tersebut.

```mermaid
flowchart LR
  A[Pilih sumber historis] --> B[Tinjau observasi]
  B --> C[Tentukan klaim dan scope]
  C --> D[Periksa cakupan bukti]
  D --> E[Catat penilaian manusia]
  E --> F[Bandingkan revisi dan ekspor laporan]
  F --> G[Ringkasan publik dengan persetujuan]
```

Pengguna dapat:

- Menjelajahi sumber dan plume di **Map Explorer**, **Cases**, serta **MARS Indicators**.
- Memilih prioritas investigasi dari ringkasan historis dan aturan yang dapat dijelaskan.
- Menjalankan rules baseline untuk klaim deteksi, notifikasi, atau mitigasi.
- Memeriksa dependency keputusan di **Decision Lab**, meninjau alasan eksklusi referensi dan menyiapkan permintaan bukti yang dapat direplay.
- Menemukan rekaman penyangkal yang persis melalui **Decision Lab → Observation cross-check**, tanpa menyamakan nihil rekaman dengan emisi nol.
- Menyimpan penilaian manusia privat tanpa AI, dengan referensi, alasan, scope, dan permintaan bukti lanjutan.
- Melanjutkan beberapa investigasi melalui catatan browser atau [workspace tim](docs/development/shared-casework.md): assignee, due date, konflik revisi, riwayat serta pemulihan draft per tab.
- Memeriksa asal/digest referensi penerbit secara opsional, status otorisasi reviewer, serta konflik yang dideklarasikan.
- Memeriksa checksum laporan JSON dan ringkasan publik yang telah disetujui. Markdown brief tersedia untuk dibaca atau diimpor ke dokumen/Notion.

Document AI tersedia sebagai jalur opsional pada tingkat sumber. Hasil model memerlukan pemeriksaan kutipan dan peninjauan manusia; kualitas model eksternal belum diukur secara independen.

## Quick start

Gunakan **Bun 1.4.2** sesuai [.bun-version](.bun-version). Snapshot bawaan cukup untuk alur dasar; Python/`uv` diperlukan untuk pipeline, Foundry untuk kontrak.

```bash
bun install --frozen-lockfile
```

Terminal pertama:

```bash
bun run dev:api
```

Terminal kedua:

```bash
bun run dev:web
```

Buka <http://localhost:5173>. Vite meneruskan `/api` ke port `3001`; health API tersedia di <http://localhost:3001/api/health>. Baseline lokal tidak memerlukan `.env`. Panduan lengkap ada di [setup lokal](docs/development/local-setup.md).

Untuk mencoba: buka [sumber KAZ_S_159](http://localhost:5173/dashboard/map?sourceId=KAZ_S_159), periksa observasinya, lalu jalankan rules baseline untuk klaim mitigasi di Evidence Auditor. Dengan bukti bawaan, hasilnya `insufficient_evidence`. Ekspor JSON, lalu verifikasi di Verification Center atau:

```bash
bun run verify:audit path/to/report.json --require-context
```

`--require-context` mewajibkan checksum konteks export. Untuk raw audit legacy tanpa checksum export, gunakan tanpa flag; CLI menyatakan batas konteksnya. Checksum tidak ditandatangani dan tidak mengautentikasi issuer atau fakta fisik.

## Architecture

```mermaid
flowchart LR
  RAW[Arsip UNEP MARS] --> PIPE[Pipeline Python offline]
  PIPE --> DATA[Snapshot dan manifest versi tetap]
  DATA --> WEB[React / Vite / MapLibre]
  DATA --> API[Bun / Hono / Zod]
  WEB --> API
  API --> RULES[Rules dan penilaian manusia]
  API --> STORE[Riwayat audit JSON lokal]
  API --> TEAM[Investigasi tim privat / CAS history]
  API -. opsional .-> AI[Provider document AI]
  STORE --> EXPORT[Laporan dan ringkasan dengan checksum]
```

| Folder | Tanggung jawab |
|---|---|
| [apps/web](apps/web/) | Antarmuka, peta, investigasi, laporan dan verifier browser |
| [apps/api](apps/api/) | Validasi, baseline, penilaian/review, privasi dan file audit |
| [packages/shared](packages/shared/) | Skema, tipe, aturan cakupan bukti dan fixture DEMO |
| [services/data-pipeline](services/data-pipeline/) | Import, normalisasi, analisis dan evaluasi offline |
| [data](data/) | Provenance, arsip, data turunan, fixture dan state lokal |
| [contracts](contracts/) | EvidenceRegistry Solidity dan tes Foundry |
| [scripts](scripts/) · [e2e](e2e/) | Alat verifikasi, persiapan bukti dan perjalanan browser |
| [docs](docs/README.md) | Panduan aktif, keputusan, riset dan bukti bertanggal |

API berjalan sebagai satu proses dengan file audit atomik dan file casework tim terpisah. Launcher memerlukan Linux `flock`; backup/restore memakai lock yang sama. [ADR P1](docs/architecture/decisions/2026-10-17-shared-casework-single-writer.md) mencatat batas kolaborasi lokal. PostgreSQL, PostGIS, Supabase, dan migrasi database telah dikeluarkan dari scope melalui [keputusan arsitektur](docs/architecture/decisions/2026-10-15-local-prototype-no-database.md).

## Data dan batas interpretasi

Snapshot aktif `unep-mars-675417694883` berisi **4.218 source rows dan 30.414 plume rows**, dengan observasi **29 Oktober 2020–13 September 2026 UTC**. Data diunduh pada 14 Oktober 2026; pemeriksaan metadata upstream terakhir yang dicatat bertanggal 15 Oktober. Casebook empat sumber merupakan subset dengan konteks referensi. Fixture sintetis tetap diberi label **DEMO**. Lihat [provenance](data/real/README.md) dan [panduan data](docs/product/data-and-claims.md).

- Snapshot merupakan arsip historis; pembaruan tidak berlangsung otomatis.
- `notified` dan `feedback` adalah metadata penerbit. Keduanya tidak membuktikan penerimaan, perbaikan, atau pengurangan emisi.
- Ketiadaan observasi lanjutan tidak berarti emisi nol. Estimasi recurrence membahas record MARS berikutnya, bukan kebocoran fisik masa depan.
- Penilaian manusia adalah keputusan reviewer yang tercatat. Pemeriksaan URL/digest dan direktori reviewer memiliki [batas kepercayaan tersendiri](docs/product/trust-and-transparency.md).
- Checksum mendeteksi perubahan isi. Receipt blockchain membuktikan komitmen integritas dan kronologi; keduanya tidak mengesahkan kebenaran fisik.
- Catatan browser tidak dibagikan atau dicadangkan otomatis. Workspace tim memakai satu proses API dengan otorisasi dan histori; filesystem hosting sementara dapat hilang.

## Verification

Perintah, cakupan, dan prasyarat lengkap tersedia di [panduan pengujian](docs/testing/README.md). Mulai dari `bun run check`, `bun run test:api`, dan `bun run test:web` sesuai perubahan. Gunakan `bun run test:e2e` untuk perjalanan browser terisolasi; `bun run check:all` untuk gate lokal lintas subsistem.

[Bukti P1 17 Oktober](docs/evidence/shared-casework-2026-10-17/README.md) mencatat pemeriksaan pengembangan terakhir. Bukti bertanggal terikat pada file/revisi saat pemeriksaan dijalankan. Run mencakup konflik dua sesi, crash/restart, backup/restore dan regresi akses; batas remote tetap dinyatakan terpisah.

## Kompetisi, demo, dan lisensi

[Catatan IEEE ClimateChain](docs/release/event-requirements.md) menyimpan persyaratan dan hal yang perlu dikonfirmasi ke penyelenggara. [Materi demo/Notion](docs/demo/README.md) adalah persiapan lokal; halaman Notion atau submission tidak dibuat otomatis oleh aplikasi.

Software asli dan dokumentasi buatan proyek berlisensi MIT. Data UNEP MARS memakai **CC BY-NC-SA 4.0**; laporan tertaut, imagery, tiles, dan aset pihak ketiga mengikuti ketentuannya masing-masing. Baca [LICENSE](LICENSE), [NOTICE](NOTICE), serta [atribusi data](data/real/README.md) sebelum mendistribusikan atau memprosesnya di layanan eksternal.
