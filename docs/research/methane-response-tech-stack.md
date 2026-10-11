# Tech Stack MethaneResponse

**Tanggal keputusan:** 11 Oktober 2026  
**Tahap:** rekomendasi arsitektur untuk MVP hackathon; belum diimplementasikan atau diuji.

## Keputusan

Gunakan modular monolith dengan satu web UI, satu API/data service Python, satu kontrak EVM, serta penyimpanan lokal berbasis berkas untuk data analitik. Stack ini mendukung peta sumber, timeline plume dan feedback, model triage, dan verifikasi commitment on-chain.

| Bagian | Pilihan |
|---|---|
| UI | Next.js App Router, TypeScript, Tailwind CSS |
| Peta | MapLibre GL JS; tampilkan titik GeoJSON dan klaster sumber |
| Wallet/EVM UI | wagmi + viem, hanya untuk mengirim atau membaca transaksi demo |
| API | Python + FastAPI + Pydantic |
| Data ingestion | Python `httpx`; simpan respons CSV/GeoJSON asli sebagai snapshot sebelum normalisasi |
| Analitik | Parquet + DuckDB |
| State aplikasi | SQLite untuk case, user-entered evidence metadata, dan status demo |
| AI | scikit-learn; baseline sederhana terlebih dahulu, model klasifikasi hanya jika label historis cukup |
| Smart contract | Solidity + OpenZeppelin AccessControl, Foundry untuk build/deployment lokal, Sepolia untuk bukti publik |
| Paket lokal | Docker Compose opsional untuk menjalankan UI dan API bersama |

## Mengapa stack ini cocok

- Python menjaga ingestion, pemrosesan tabular, dan evaluasi model dalam satu runtime. FastAPI menyediakan kontrak OpenAPI untuk integrasi UI/API.
- MapLibre cocok untuk peta interaktif berbasis titik/GeoJSON. Dataset MARS yang menjadi MVP tidak memerlukan pemrosesan raster atau server GIS berat.
- Parquet/DuckDB memudahkan analisis snapshot dan time-series dari data terbuka tanpa mengelola server database analitik. SQLite cukup untuk state aplikasi hackathon.
- Next.js memberi jalur UI yang rapi untuk peta, filter, halaman detail sumber, timeline kasus, dan panel audit.
- Kontrak hanya menjadi registry commitment dan perubahan status yang dapat diperiksa publik. Berkas mentah serta dokumen pendukung tetap off-chain.

## Batas model AI

Target yang masuk akal untuk MVP adalah **peluang adanya observasi plume publik berikutnya dalam jangka waktu yang ditentukan**, berdasarkan riwayat observasi yang tersedia sebelum tanggal prediksi. Target tersebut bukan prediksi kebocoran aktual atau keberhasilan mitigasi.

Bangun baseline transparan lebih dahulu. Jika ukuran data dan variasi label memadai, uji model scikit-learn dengan pemisahan waktu maju dan fitur yang dihitung hanya dari observasi sebelum cutoff. Jangan memakai `persistency` dari snapshot terbaru untuk merekonstruksi fitur historis jika nilainya mencakup observasi sesudah cutoff. Jika label terlalu sedikit atau hasil model tidak mengalahkan baseline, tampilkan prioritas berbasis aturan dan jelaskan metodenya; jangan menampilkan skor AI seolah-olah sudah tervalidasi.

## Batas ledger

Kontrak `EvidenceRegistry` cukup mencatat hash snapshot sumber, hash bundle kasus, hash record sebelumnya, tipe/status event, dan alamat wallet pengirim. Event log membentuk timeline append-only. Gunakan role terpisah untuk ingester dan auditor jika demo memang menunjukkan dua aktor.

Jangan simpan koordinat rinci, file, informasi pribadi, atau pesan operator di chain. Hash membuktikan kecocokan artefak terhadap commitment dan waktu transaksi; wallet address sendiri tidak membuktikan identitas organisasi, asal satelit, atau kebenaran laporan. Data masukan operator yang belum berasal dari UNEP harus diberi label simulasi.

## Batas data dan penyimpanan

1. Simpan file UNEP yang diunduh tanpa mengubahnya, bersama URL sumber, waktu unduh UTC, lisensi, dan SHA-256.
2. Normalisasi plume dan source ke Parquet; gunakan DuckDB untuk membentuk ringkasan, timeline, serta data fitur.
3. Gunakan SQLite hanya untuk state demo: case, actor wallet, catatan evidence off-chain, dan referensi transaksi.
4. Gunakan koordinat GeoJSON untuk peta. Tambahkan PostgreSQL/PostGIS hanya jika produk berkembang menjadi aplikasi multi-user dengan query spasial/volume yang membutuhkannya.
5. UNEP menyatakan data MARS publik umumnya tertunda sekitar 30 hari dan menggunakan CC BY-NC-SA 4.0. Karena itu ingestion diperlakukan sebagai snapshot/replay, bukan alert real-time; cantumkan atribusi dan batas lisensi pada repo/demo.

## Satu alur demo end-to-end

`UNEP snapshot → hash dan validasi schema → source timeline + triage → peta/detail kasus → commit hash ke Sepolia → ubah satu byte pada salinan → verifier melaporkan mismatch`.

UI harus membedakan observasi MARS, status feedback UNEP, informasi yang dimasukkan pengguna, dan data simulasi. Istilah `Potentially ceased` ditampilkan sebagai status sumber dari UNEP, bukan bukti bahwa tindakan tertentu menyebabkan emisi berhenti.

## Struktur repository yang disarankan

```text
iEEE-Methane-response/
├── apps/web/                 # Next.js, MapLibre, wagmi/viem
├── services/api/             # FastAPI, ingestion, query, triage
├── contracts/                # Solidity, Foundry, deployment metadata
├── data/
│   ├── raw/                  # snapshot asli, read-only setelah dicatat
│   ├── processed/            # Parquet
│   └── manifests/            # source URL, capture time, hash, license
├── models/                   # model dan manifest versi
└── docs/                     # metode, batas klaim, demo setup
```

## Risiko teknis utama

- **Data sebelum pembangunan UI:** belum diverifikasi jumlah baris dan distribusi label pada arsip CSV/GeoJSON UNEP yang akan dipakai. Ambil serta profilkan file aktual terlebih dahulu.
- **AI:** label plume masa depan mengukur deteksi yang dipublikasikan, bukan emisi yang sungguh terjadi pada semua waktu. Observasi satelit memiliki batas deteksi dan kondisi pengamatan.
- **Klaim produk:** MARS sudah menangani deteksi, atribusi, notifikasi, serta pemantauan. Diferensiasi MethaneResponse harus terlihat pada snapshot independen dan verifikasi perubahan bukti, bukan membuat ulang detector.
- **Ledger:** jika hanya satu wallet milik tim yang menulis semua record, nilai multi-aktor terbatas. Uji demo harus menjelaskan aktor dan batas autentikasinya.
- **Koneksi peta/RPC:** siapkan data contoh yang tersimpan lokal dan tampilan transaksi yang pernah dikomit untuk demo ketika jaringan tidak tersedia; beri label cache/demo dengan jelas.

## Sumber dokumentasi teknis dan data

- [Next.js App Router](https://nextjs.org/docs/app)
- [FastAPI OpenAPI](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [DuckDB Python API](https://duckdb.org/docs/stable/clients/python/overview)
- [scikit-learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html) — dokumentasi split temporal; gunakan pemisahan kalender khusus jika data observasinya tidak berjarak seragam.
- [Wagmi](https://wagmi.sh/core/getting-started)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [Ethereum: testing smart contracts](https://ethereum.org/developers/docs/smart-contracts/testing/)
- [Ethereum networks: Sepolia](https://ethereum.org/developers/docs/networks/)
- [Kamus data plume/source UNEP](https://methanedata.unep.org/dict-mars-plumes)
- [Kebijakan berbagi data MARS](https://methanedata.unep.org/methane-alert-response-system)

