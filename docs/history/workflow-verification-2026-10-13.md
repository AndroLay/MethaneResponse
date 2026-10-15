# Laporan Pembuktian Workflow MethaneResponse — 13 Oktober 2026

Dokumen ini mencatat pemeriksaan terbaru pada checkout lokal dan aplikasi yang sedang berjalan. Hasilnya membuktikan perilaku perangkat lunak pada pengujian lokal, bukan hasil mitigasi metana atau kinerja layanan produksi.

## Ringkasan

- Instalasi terkunci, typecheck, seluruh tes UI/API/verifier/data, kontrak, dan build web berhasil.
- Sembilan tes integrasi PostgreSQL lulus terhadap container PostGIS sementara tanpa volume; container dihapus setelah run.
- Alur peta, histori sumber, auditor, kasus, laporan, dan verifier diperiksa di Chromium. File audit sementara berhasil diverifikasi dan file yang diubah ditolak.
- Tidak ada audit uji yang disimpan ke file store aplikasi. Container database sementara dihapus setelah tes.
- Provider AI, autentikasi reviewer, dan transaksi Sepolia tidak aktif pada aplikasi yang diperiksa. Ketiganya diuji melalui unit/integration test lokal, bukan layanan live.

## Bukti per workflow

| Workflow | Pemeriksaan dan bukti sesi ini | Status dan batas |
|---|---|---|
| 1. Jelajahi observasi dan sumber MARS | Browser membuka `/dashboard/map?sourceId=KAZ_S_159`. Peta menampilkan snapshot `unep-mars-e0721015e925`, 4.211 sumber, 30.319 baris plume, 6.534 baris tanpa source ID, rentang 2020-10-29—2026-09-11, dan label historis/bukan live. Panel sumber menampilkan 3 observasi tertaut, tanggal, flux, dan ketidakpastian. Halaman Documents memperlihatkan dua versi snapshot beserta hash dan hitungannya. | **Diuji di browser desktop dan viewport 390×844.** Pada viewport mobile, lebar dokumen 390 px; peta 342×410 px dan kanvas 340×408 px. Snapshot arsip bukan feed real-time. |
| 2. Analisis historis dan prioritas investigasi | Endpoint lokal `/api/intelligence/insights?sourceId=KAZ_S_159` terikat ke snapshot yang sama, berisi 3 kesempatan observasi, dan menyatakan forecast `not_available`. Halaman audit MEX menampilkan jumlah/tanggal pengamatan, rentang flux/ketidakpastian, screening anomali dan keterbatasan. Tes API memeriksa source ranking dan abstention forecast; Python menguji pembentukan intelligence serta redetection. | **Analisis dan heuristik diuji.** Skor prioritas bukan probabilitas kebocoran. Tidak ada model forecast terlatih atau klaim prediksi. |
| 3. Audit klaim dan dokumen | Browser membuka `/dashboard/audit?sourceId=MEX_S_003`: UI menunjukkan metadata notification/response tersedia, tetapi tidak menjadikannya bukti mitigasi; inventaris bukti resmi yang tertaut berjumlah 0. Tes API memeriksa klaim deteksi dengan sitasi observasi, klaim non-curated dari snapshot, dan penolakan inferensi mitigasi dari feedback/notifikasi/judul laporan. Tes AI menguji validasi kutipan persis, abstention, batas respons, consent, dan kegagalan provider. | **Rules baseline dan jalur AI mock diuji.** Status live `documentModelConfigured=false`; tidak ada dokumen atau permintaan yang dikirim ke provider AI. |
| 4. Review manusia dan revisi | Tes token reviewer/API memeriksa scope, expiry, tampering, izin publikasi, serta pemisahan akses baca/review/anchor. Tes file store dan PostgreSQL memeriksa revisi immutable setelah reconnect; tes Postgres juga menguji reservasi anchor yang durable. | **Perilaku otorisasi/revisi diuji lokal.** `humanReviewConfigured=false` pada layanan lokal; belum ada reviewer manusia eksternal atau keputusan terhadap kasus nyata. |
| 5. Laporan dan pemeriksaan integritas | Halaman Reports memperlihatkan ekspor JSON nonaktif sebelum ada audit tersimpan. Halaman Verification Center mengimpor fixture uji sementara berbasis sumber MARS `KAZ_S_159`, klaim mitigasi berstatus `insufficient_evidence`, lalu menampilkan digest cocok. Fixture kedua mengubah bundle tanpa memperbarui hash; UI menolak dengan pesan “Audit summary fields do not match the hashed bundle.” Tes web dan CLI juga mencakup ekspor, checksum konteks, revisi v3, dan perubahan isi. | **Hash lokal dan penolakan manipulasi dibuktikan di browser.** Fixture hanya berada di `/tmp`; bukan laporan hasil review manusia. Ekspor produk yang didukung saat ini adalah JSON, bukan PDF. |
| 6. Receipt dan verifikasi blockchain | Verification Center menampilkan 0 receipt dan “No public transaction”. Tes API menguji guard autentikasi, idempotensi, recovery intent, serta kecocokan transaksi/event. Foundry menguji otorisasi issuer, larangan hash kosong, revisi, dan penolakan akun tidak berwenang. | **Kontrak dan integrasi lokal diuji; live chain belum.** `chainConfigured=false` dan `chainWriteConfigured=false`; tidak ada transaksi Sepolia/mainnet yang dikirim. Receipt membuktikan hash/urutan revisi, bukan perbaikan fisik. |

## Gerbang tes yang dijalankan

| Perintah | Hasil |
|---|---|
| `bun install --frozen-lockfile` | Berhasil; tidak mengubah lockfile. |
| `bun run check` | Berhasil; typecheck API dan web. |
| `bun run test:api` dengan `TEST_DATABASE_URL` ke PostGIS sementara | **92 lulus, 0 gagal, 532 ekspektasi, 0 dilewati.** Sembilan tes PostGIS mencakup migrasi, persistensi, pagination, evidence rows, revisi, dan anchor intent; database tanpa volume dihapus setelahnya. |
| `bun run test:web` | **138 lulus, 0 gagal, 67.356 ekspektasi.** |
| `bun run test:verifier` | 3 lulus, 0 gagal, 21 ekspektasi. |
| `UV_CACHE_DIR=/tmp/methane-response-uv-cache bun run test:data` | **58 lulus.** |
| `UV_CACHE_DIR=/tmp/methane-response-uv-cache uv run python evaluate_baseline.py --output /tmp/methaneresponse-baseline-evaluation-2026-10-13.json` | Berhasil; laporan ditulis di `/tmp`, bukan mengganti artefak evaluasi repo. |
| `bun run test:contracts` | 4 lulus, 0 gagal. |
| `bun run build:web` | Berhasil. Ada peringatan dependency Zod tentang anotasi komentar dan chunk `MapPanel` 1.121,25 kB (306,50 kB gzip), melewati ambang 500 kB sebelum gzip. |
| `git diff --check` | Berhasil untuk perubahan terlacak; laporan baru juga lolos pemeriksaan Python terhadap spasi di akhir baris. |

Catatan eksekusi: `bash scripts/check-local.sh` selesai dengan sukses untuk frozen install, typecheck, suite default, build, Python, evaluasi baseline, dan Foundry. Sesudahnya, UI loading state diuji ulang dengan `bun run check` dan suite web terkini. Run API default tanpa `TEST_DATABASE_URL` menghasilkan 85 lulus dan 9 skenario PostGIS dilewati; run terpisah terhadap PostGIS sementara menyelesaikan 92 tes tanpa gagal atau skip. Database menggunakan tmpfs dan `listen_addresses=127.0.0.1`; container auto-dihapus dan tidak meninggalkan listener. Evaluasi baseline meregenerasi artefak yang dilacak; run terpisah ke `/tmp` menghasilkan nilai JSON yang sama. Perubahannya memuat abstention konservatif untuk metadata notifikasi MARS.

## Evaluasi baseline dan batas interpretasi

Evaluasi deterministik berisi 15 contoh: 9 contoh casebook nyata dan 6 fixture `DEMO`. Setelah pembaruan semantik, tiga contoh real `operator_notified` yang bersumber dari flag MARS sekarang diklasifikasikan `insufficient_evidence` tanpa sitasi karena flag itu tidak menetapkan penerima dan waktu notifikasi. Dukungan subset real adalah 3 `supported`, 6 `insufficient_evidence`, 0 `contradicted`; macro-F1 real 0,6667. Nilai gabungan 1,00 mencakup fixture sintetis. Ada 0 false mitigation confirmation pada sampel kecil ini; angka tersebut bukan akurasi AI atau estimasi generalisasi.

## Pemeriksaan runtime dan visual

- `/api/health`: `status=ok`, casebook siap, storage `backend=file`, `persistent=true`; ini penyimpanan file lokal, bukan PostgreSQL cloud.
- `/api/intelligence/status`: document model, reviewer, dan chain semuanya nonaktif; mode `deterministic-baseline-only`.
- API dan UI menggunakan snapshot `unep-mars-e0721015e925`; forecast dinyatakan `not_available` karena label kesempatan observasi dan validasi independen belum cukup.
- Chromium melaporkan 0 error JavaScript/halaman pada peta. Ada peringatan WebGL/GPU readback dari renderer perangkat uji; FPS pada telepon fisik belum diukur.
- Pada Evidence Auditor, penundaan tile Esri selama 2,2 detik membuat status `Loading satellite location imagery…` terlihat; setelah tile pusat terurai, status hilang dan geometri pilihan mencapai `VERIFIED`. Screenshot setelah ketiga tile termuat: `/tmp/methane-evidence-auditor-final-loaded.png`; bukti mobile: `/tmp/methane-evidence-auditor-mobile.png`.
- Screenshot berasal dari halaman aplikasi nyata. Berkas tidak dimasukkan ke repository karena basemap memuat imagery pihak ketiga.

Artefak visual sesi ini:

- Peta desktop: `/tmp/methaneresponse-workflow-map-desktop-2026-10-13.png` (temporary capture, not included in the repository).
- Viewport peta mobile: `/tmp/methaneresponse-workflow-map-mobile-2026-10-13.png` (temporary capture, not included in the repository).
- Kanvas globe mobile: `/tmp/methaneresponse-globe-mobile-2026-10-13.png` (temporary capture, not included in the repository).
- Verifier setelah bundle cocok: `/tmp/methaneresponse-verifier-valid-2026-10-13.png` (temporary capture, not included in the repository).
- Evidence Auditor desktop: `/tmp/methane-evidence-auditor-final-loaded.png` (temporary capture, not included in the repository).
- Evidence Auditor mobile: `/tmp/methane-evidence-auditor-mobile.png` (temporary capture, not included in the repository).

## Belum dibuktikan dan prioritas berikutnya

1. Uji provider AI nyata dengan korpus berizin, split sumber independen, dan benchmark yang cukup; ukur salah-konfirmasi mitigasi, kutipan, abstention, dan baseline pada klaim yang sama.
2. Uji Postgres cloud milik proyek melalui migrasi dan restart aplikasi; tes PostGIS di atas hanya membuktikan perilaku lokal dengan container sementara.
3. Uji receipt Sepolia dengan kontrak, RPC, dan signer yang memang dikonfigurasi serta berizin; verifier independen harus memeriksa event/hash transaksi.
4. Ukur usability dan performa peta pada perangkat mobile fisik; Chromium viewport bukan pengganti perangkat nyata.
5. Pecah chunk `MapPanel` yang besar, lalu ulangi build dan pengukuran pada kondisi yang sebanding. Route ini sudah dimuat secara lazy; build masih melaporkan 1.121,25 kB (306,50 kB gzip).
6. Jalankan pilot terukur dengan peneliti/auditor untuk mengukur waktu tugas, kesalahan, keputusan investigasi, dan manfaat transparansi. Belum ada bukti bahwa produk ini telah menyebabkan mitigasi atau pengurangan emisi.

## Addendum — Auditor imagery dan alur sumber-ke-verifier

### Yang diimplementasikan dan diperiksa

- Evidence Auditor tidak lagi memakai gambar plume/sumber generatif sebagai pengganti bukti. Untuk sumber MARS nyata dengan koordinat, aplikasi meminta tiga tile Esri bersebelahan dari template imagery yang sama dengan MapLibre, menandai koordinat sumber, dan memberi catatan bahwa citra merupakan konteks lokasi dengan tanggal pengambilan yang dapat berbeda dari pengamatan MARS. Status loading yang dapat diakses terlihat sampai tile pusat pada mosaik aktif terurai. Jika tile gagal, panel mencoba ulang mosaik utuh pada zoom 13, 10, lalu 7; setelah empat tingkat gagal, panel menampilkan status tidak tersedia dan tautan globe. Tidak ada berkas gambar per kasus diunduh atau disimpan ke repo. Fixture sintetis tidak diberi basemap nyata.
- Tes deterministik membentuk empat pilihan mosaik (zoom 16/13/10/7) untuk seluruh **4.211** sumber berkoordinat dari snapshot lokal; ini membuktikan cakupan pembentukan URL dan perilaku fallback, bukan ketersediaan citra live di setiap lokasi. Chromium memuat tiga tile 256×256 untuk sampel `SEN_S_001` (Afrika), `ARG_S_001` (Amerika Selatan), dan `KAZ_S_159` (Asia Tengah). Untuk Argentina, panel menampilkan 38.47007° S, 69.04720° W dan satu rekaman histori tertaut; Kazakhstan menampilkan tiga record histori. Citra plume asli tetap ditautkan ke peta resmi MARS.
- **Evidence Auditor imagery/shape, 13 Oktober:** case `KAZ_S_159` memuat tiga tile Esri sebagai konteks lokasi, lalu memverifikasi dan menampilkan geometri resmi MARS untuk plume `941806b5-2afe-46ac-baac-a0230880cede` (2026-07-11T08:12:14; 496 kg/h; standar deviasi 226 kg/h). Rekaman yang dipilih dicocokkan dengan snapshot ID, archive hash, source ID, tanggal, koordinat, flux, dan uncertainty. Chromium menunjukkan status `VERIFIED`; pada viewport 390 px lebar dokumen tetap 390 px dan console tidak memiliki error. Tes regresi memeriksa 66 shard dan memastikan semua **23.785/23.785** observasi tertaut di **4.211** sumber memiliki geometri publisher. Bentuk resmi ini statis dan historis, bukan pixel mentah satelit atau konsentrasi berkelanjutan. Citra lokasi tetap jalur konteks saat record tidak menyediakan polygon.
- Alur browser: pilih `SEN_S_001` → `Examine evidence` → `Run evidence audit`. Klaim “sumber terdeteksi” menghasilkan satu sitasi record MARS bertanggal. Klaim “emisi telah dimitigasi” menghasilkan `insufficient_evidence` karena tidak ada dokumen mitigasi yang tertaut. Dari tombol Auditor, peta berpindah ke `sourceId=SEN_S_001`; panel dan marker menampilkan koordinat source yang sama.
- Laporan lokal tersimpan sebagai revisi 1. Verification Center menunjukkan SHA-256 lokal valid, `Not anchored`, dan “no on-chain verification”; tidak ada klaim receipt atau perbaikan fisik.
- Pada lebar 390 px panel citra berukuran 366×122 px, dan pada 320 px berukuran 296×99 px. Lebar dokumen tetap sama dengan viewport; tiga tile dan kedua tautan riset tetap termuat. Screenshot sementara yang tidak disertakan di repo: panel desktop `/tmp/methane-evidence-final.png`, panel 320 px `/tmp/methane-evidence-panel-mobile-final.png`, globe `/tmp/methane-map-focus.png`, dan Evidence Auditor `/tmp/methane-evidence-auditor-loaded.png`.
- Timeline keyboard QA: setiap 17 titik memakai `role=button` dan `tabIndex=0`; menekan Enter pada titik pertama memilih rekaman 5 Maret 2023 dengan flux tidak dilaporkan dan memperbarui detail terpilih tanpa mengubahnya menjadi nol.

### Gate yang dijalankan ulang

| Pemeriksaan | Hasil pada checkout ini |
|---|---|
| `bun install --frozen-lockfile` | Berhasil; 138 install diperiksa, tidak ada perubahan lockfile/dependensi. |
| `bun run check` | Lulus; typecheck API dan web. |
| `bun run test:web` | **138 lulus, 0 gagal, 67.356 ekspektasi.** |
| `bun run test:api` dengan PostGIS sementara | **92 lulus, 0 gagal, 532 ekspektasi, 0 dilewati.** Ini bukan database cloud. |
| `bun run test:verifier` | 3 lulus, 0 gagal, 21 ekspektasi. |
| `UV_CACHE_DIR=/tmp/methane-uv-cache bun run test:data` | 58 lulus. Cache diarahkan ke `/tmp` karena lokasi cache akun default read-only. |
| `evaluate_baseline.py` | Laporan ditulis di direktori sementara, bukan artefak repo: 15 contoh (9 real casebook, 6 `DEMO`), Macro-F1 gabungan 1,00, subset real Macro-F1 0,6667, `contradicted` support 0 pada subset real, dan 0 false mitigation confirmation pada sampel kecil. Ini bukan hasil evaluasi AI dan bukan estimasi generalisasi. |
| `bun run test:contracts` | 4 lulus, 0 gagal. |
| `bun run build:web` | Berhasil. `MapPanel` tetap dimuat secara lazy, tetapi chunk peta 1.121,25 kB (306,50 kB gzip) memicu peringatan Rollup karena melewati 500 kB sebelum gzip; dependency Zod juga mengeluarkan dua peringatan komentar yang tidak menghalangi build. |

## Addendum — Fallback citra dan fokus marker sumber

- Regresi ditulis lebih dahulu untuk empat zoom imagery (16/13/10/7), sumber point yang tetap berada di tengah, kegagalan tile lama, dan status loading imagery. Pada checkpoint fallback awal, 121 tes web lulus; suite terkini 138 tes / 67.356 ekspektasi.
- Pada `ARG_S_001`, tiga tile Esri zoom 16 dimuat. Dengan respons 503 yang disimulasikan untuk zoom 16, browser beralih ke zoom 13 dan memuat tiga tile fallback 256×256. Saat semua permintaan Esri diblokir pada `KAZ_S_159`, pesan unavailable yang menyebut data kasus tetap tersedia muncul; timeline tiga record, pemilih kasus, dan tombol globe tetap berfungsi. Setelah mock dihapus, zoom 16 kembali pulih. Error di log pada run outage berasal dari respons 503 yang sengaja diinjeksi.
- Pemusatan map sekarang dimulai di zoom 11—di atas `clusterMaxZoom` source 9—agar penanda sumber terpilih tidak tertahan sebagai cluster. Browser membuka kasus `ARG_S_001` dari Auditor ke Map Explorer; ID dan koordinat 38.47007° S, 69.04720° W tetap sama. Tangkapan browser skala 3 km disimpan sementara di `/tmp/methane-argentina-source-focus-desktop.png` dan `/tmp/methane-argentina-source-focus-mobile.png`; berkas tersebut tidak termasuk repo.
- Pada viewport 390 px, lebar dokumen 390 px dan panel citra 366×122 px; tiga tile berhasil dimuat tanpa horizontal overflow. Tangkapan sementara: `/tmp/methane-evidence-panel-mobile-fallback-final.png` (tidak termasuk repo). Chromium fresh melaporkan 0 error JavaScript dan 10 warning MapLibre/WebGL; ini bukan pengukuran FPS atau pengujian perangkat telepon fisik.
- Tes API lengkap dengan sembilan tes PostGIS berjalan terhadap container tanpa volume: 92 lulus, 532 ekspektasi, 0 skip. Container dihapus setelah tes. Build terkini tetap lulus, dengan chunk `MapPanel` 1.121,25 kB (306,50 kB gzip) dan dua warning anotasi Zod.

### Batas runtime yang terlihat

- Backend QA `/api/health` sehat dan casebook siap dengan file store terisolasi di `/tmp`; AI provider, reviewer authentication, RPC, registry dan signer tidak dikonfigurasi. Tidak ada panggilan AI atau transaksi chain.
- Pemeriksaan browser terhadap imagery mengonfirmasi layanan tile live pada tiga sumber sampel dari Afrika, Amerika Selatan, dan Asia Tengah. Ini bukan validasi seluruh lokasi: provider bisa tidak memiliki coverage yang setara di tiap koordinat; fallback tersedia dan menyimpan akses ke timeline MARS. Tile ini bukan produk plume MARS.
- Satu permintaan probe manual ke `/api/sources/SEN_S_001` menghasilkan 404 karena route detail ini hanya melayani casebook terkurasi; alur snapshot penuh menggunakan data browser terikat hash dan endpoint intelijen/audit yang memang mendukung ID tersebut. Error 404 itu berasal dari probe, bukan tindakan pengguna di workflow yang diperiksa.
- MapLibre berjalan di tier `AUTO · low` pada Chromium uji dan mengeluarkan peringatan driver GPU readback. Tidak ada FPS yang diukur dan viewport browser bukan pengujian telepon fisik.
- Pemeriksaan langsung peta publik MARS melalui Chromium QA menghasilkan HTTP 403/halaman challenge. Karena snapshot lokal hanya memiliki ID produk `tile`/`tile_background`, saya tidak menyimpulkan atau memakai endpoint gambar tak terdokumentasi. Kamus MARS mendefinisikan nilai itu sebagai ID produk; FAQ UNEP menyebut visual data tersedia di platform publik setelah 30 hari, sedangkan portal INSIGHTS yang aman menyediakan plume imagery untuk pengguna pemerintah berwenang.
- Penelitian yang menopang rancangan, batas klaim, serta rubrik ada di `docs/research/`, `docs/product/data-and-claims.md`, `docs/architecture/mars-publisher-geometry.md`, dan matriks bukti juri. Belum ada studi pengguna, provider AI live, pilot dampak, deployment cloud, atau transaksi Sepolia. Skor kompetisi 18/20 maupun kesiapan industri 100% tidak dapat diklaim dari tes lokal ini.

## Addendum — cache respons privat

Endpoint assessment AI, review manusia, anchor, dan rekonsiliasi kini menetapkan `Cache-Control: no-store` dan `Vary: Authorization`, termasuk respons gagal autentikasi atau konflik. Ini melengkapi perlindungan pada private history/detail/verifier, karena respons workflow dapat memuat kutipan atau konteks audit privat. Regresi memeriksa assessment berhasil/tidak terotorisasi, review, dan penolakan anchor. Suite API default setelah perubahan ini: **85 lulus, 9 tes PostGIS dilewati, 0 gagal, 508 ekspektasi**; typecheck API/web dan `git diff --check` lulus. Integrasi PostGIS 92 tes terakhir dijalankan sebelum perubahan header ini, sehingga belum diulang pada checkpoint terbaru.

### Addendum — lazy route loading dan gate bundle penuh

Dashboard memuat delapan workspace sebagai chunk terpisah; dialog case baru dimuat saat dibuka. Production browser check menunjukkan 0 chunk workspace tambahan pada cold load peta, App transfer 57.148 B, dan kesiapan kanvas 2.078 ms desktop / 1.992 ms pada viewport 390×844. Tidak ada page error atau overflow horizontal. Ini satu cold run per ukuran viewport dengan software WebGL; empat long task tetap terlihat, maksimum 263 ms desktop / 248 ms mobile.

Setelah gate anggaran bundle masuk ke `scripts/check-local.sh`, skrip penuh dijalankan dan lulus: frozen install, typechecks, API/web/verifier, production build, bundle budget, Python, baseline evaluation, dan Foundry. Build mencatat App 56.831 B gzip, delapan route chunks, dan MapPanel 1.121.285 B raw / 306.520 B gzip. API default: 85 lulus / 9 tes PostGIS dilewati / 508 ekspektasi; web: 138 lulus / 164.210 ekspektasi; verifier: 3 lulus / 21 ekspektasi. Tes PostGIS tetap memerlukan `TEST_DATABASE_URL`; layanan AI, cloud, dan Sepolia tidak diaktifkan.
