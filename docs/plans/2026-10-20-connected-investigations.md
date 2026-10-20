# Investigasi terhubung dan berversi

## Keputusan produk yang disetujui

MethaneResponse membantu tim memilih investigasi sesuai kapasitas, memeriksa klaim terhadap bukti, meminta tindak lanjut yang spesifik, lalu mempertanggungjawabkan keputusan dan revisinya. Arah ini dibekukan untuk pengembangan berikutnya. Keunggulan dan kemenangan kompetisi harus dibuktikan; jumlah kode atau tes bukan ukuran manfaat lapangan.

Alur inti: **pilih sumber → alasan alokasi → klaim dan periode → bukti → permintaan tindak lanjut → keputusan reviewer → pemeriksaan ulang bila data berubah → verifikasi integritas**.

- Adaptasi PLUME: penanggung jawab, tenggat dan persyaratan bukti yang jelas.
- Adaptasi HourMatch: AI mengekstrak klaim menjadi bidang terstruktur; kode memeriksa tanggal, fasilitas, unit dan kutipan; reviewer memutuskan.
- Adaptasi CanopyProof/CarbonTwin: hubungan bukti–keputusan dan pemeriksaan ulang akibat perubahan data yang relevan; riwayat lama dipertahankan.
- Adaptasi Kanopy/CarbonTwin: kandidat klaim hasil yang berulang diperiksa manusia. Pemakaian satu dokumen untuk beberapa pertanyaan dapat sah.
- Adaptasi Uncounted: ketidakpastian, cakupan observasi dan reproduksi diperlihatkan secara eksplisit.

Rujukan: [PLUME](https://github.com/KaavinB/PLUME), [HourMatch](https://devpost.com/software/hourmatch), [CanopyProof](https://github.com/Thanatos9404/canopyproof), [Kanopy](https://devpost.com/software/kanopy), [CarbonTwin](https://devpost.com/software/carbontwin-release-steward), [Uncounted](https://devpost.com/software/uncounted-verifiable-ledger-for-wildfire-war-emissions), [kerangka respons IEA–IMEO](https://www.iea.org/reports/responding-to-satellite-notifications-from-the-methane-alert-and-response-system). Ini adaptasi desain, bukan klaim integrasi atau dukungan dari proyek/organisasi tersebut.

## Batas dan baseline

Pemilik implementasi: agen utama pada checkout aktif. Baseline HEAD `8e19c034e666a6b00d93b4cb3f5747f563c75aab`; 97 path telah berubah sebelum increment ini. Pertahankan semuanya dan seluruh paket evidence terdahulu. Tetap React/MapLibre, Bun/Hono/Zod, Python, EvidenceRegistry; file store satu writer, tanpa database/dependensi/deployment baru.

Feedback bukan repair; absennya observasi bukan emisi nol; hash bukan kebenaran fisik. Persetujuan alokasi bukan konfirmasi mitigasi. AI berada di backend dan harus dibandingkan dengan baseline. Akses reviewer tetap signed token + current directory authority. Persetujuan historis harus ditampilkan sebagai historis, bukan mandat terkini.

## Increment implementasi sekarang

Satu investigasi memakai casework yang sudah ada, ditambah referensi opsional ke versi persetujuan rencana dan laporan perubahan snapshot. Kriteria penerimaan bukti dicatat bersama permintaan. Server memvalidasi semua hubungan; ekspor menyertakan riwayat pekerjaan, rencana terkait, laporan perubahan dan bundle assessment terkait. Verifier memeriksa hash terpisah, replay dan hubungan lintas artefak. API/audit/receipt lama tetap kompatibel.

- [x] Regresi: tautan rencana yang salah, sumber di luar alokasi, snapshot berbeda, head/revisi palsu, assessment berbeda, perubahan+rehash, akses privat dan CAS.
- [x] Shared: schema tautan, dossier canonical SHA-256, validasi hubungan dan verifier independen.
- [x] Backend: validasi tautan sebelum save, ekspor bounded/no-store, pemeriksaan ulang otorisasi, tanpa URL/path input dari pengguna.
- [x] UI: lampirkan versi rencana yang diterima, acceptance criteria, pemeriksaan perubahan yang eksplisit, ekspor dossier dari shared casework; loading/error/conflict/draft dipertahankan.
- [x] Pembuktian: unit/integrasi/CLI/browser, screenshot desktop/mobile aktual, build/bundle/checks; catat lingkungan dan blocker secara tepat.
- [x] Review akhir dan dokumentasi hasil pada paket evidence baru; jangan mengubah artefak beku sebelumnya.

File utama: `packages/shared/src/investigation-links.ts`, `investigation-dossier.ts`, `apps/api/src/investigation-dossier.ts`, casework routes, `apps/web/src/SharedCaseWorkPanel.tsx` dan panel tambahan yang lazy; `scripts/verify-investigation.ts` dan tes terkait. Pengujian memakai `bun run check`, `test:api`, `test:web`, `test:verifier`, `build:web`, `check:web-bundle`, serta E2E sesuai runner yang ada.

## Tahap berikutnya yang tetap dicatat

1. AI pada dokumen nyata berizin: ekstraksi terstruktur, exact citations, ketidaksesuaian tanggal/fasilitas, permintaan bukti; ukur terhadap baseline dan catat salah konfirmasi/abstention.
2. Hubungkan perubahan bukti dengan review baru pada scope yang sama; jangan mengubah verdict historis otomatis. Duplikasi klaim memakai kesamaan kejadian/tindakan/periode dan konfirmasi manusia.
3. Anchor dossier yang telah direview lewat integrasi yang kompatibel, transaksi lokal nyata dan verifier kontrak independen. Public-chain deployment/funds mengikuti izin yang berlaku dan ketersediaan layanan.

Lanjutan P1 di bawah menutup hubungan respons baru dengan revisit serta anchor lokal nyata. AI live, duplicate-action review lintas investigasi, pilot manusia, pengurangan emisi, chain publik dan manfaat operasional tetap memerlukan pekerjaan/bukti tersendiri.

## Lanjutan yang disetujui: seluruh coding P1

Rujukan implementasi dibaca: `/home/andro/Downloads/MethaneResponse_3_Master_Prompt_Siap_Kirim.md`. P2 live AI/benchmark independen, pilot pakar dan publikasi tetap membutuhkan sumber berizin, layanan atau izin eksternal; jangan memalsukan hasilnya.

- [x] M1: tutup E2E dossier terhubung; Node ESM dan workflow browser tercakup kembali pada suite lengkap 12 pemeriksaan privat/tim. Batas impor runtime Playwright diselaraskan, tidak mengubah validasi produk.
- [x] M2 implementasi: evidence events append-only (issued/response_received/response_reviewed), hash asli dan deklarasi hak, tanggal day/month/year/unknown tanpa membuat hari palsu. Penerimaan untuk assessment bukan konfirmasi mitigasi.
- [x] M3 implementasi: keputusan membekukan dossier tepat dan digest yang telah diperiksa; scope/assessment wajib, reviewer signed/current, CAS head keputusan dan revisi pekerjaan. Snapshot berikutnya memicu alasan yang spesifik; metadata konteks tidak otomatis membatalkan verdict.
- [x] M4 implementasi: namespace decision terpisah, EvidenceRegistry lama dipertahankan, receipt di luar payload; satu atomic file dan koordinator pending/nonce untuk audit serta keputusan. Envelope 3 baru hanya bila keputusan tersimpan; envelope lama tetap terbaca. Rollback harus ke versi yang memahami envelope 3 atau backup sebelum perubahan; jangan menulis dengan kode lama.
- [x] M5: 842 tes gate utama, 28 main + 12 private/team E2E checks (39 browser + satu Node schema check), actual Anvil + CLI, dua operasi casework dan satu publication crash/restart lulus. Focused repeats tidak dihitung sebagai coverage baru.
- [x] M6: temuan permission, normalization tamper, terminal reconciliation dan revisit ditutup dengan regresi; source/log/ekspor/screenshot aktual disimpan pada [paket bukti baru](../evidence/connected-investigations-2026-10-20/README.md). Sebanyak 98 artefak beku terdahulu tetap utuh.

Reproduksi final juga menjalankan gate pada salinan source tanpa `node_modules` dengan frozen install dari cache. Seluruh 842 tes/build/budget lulus; 414 runtime/config files serta data pins cocok dengan source aktif. Percobaan unduhan cache baru yang dihentikan dicatat terpisah; bukan hasil lulus atau syarat layanan publik.

Batas prototipe: file store satu writer, tanpa database/dependensi baru, API body casework 16 KiB / riwayat 100 revisi / 40 evidence events / decision store 100 keputusan / total state 64 MiB. Dokumen tidak otomatis diunduh atau dikirim ke AI. File hash/rights pada response adalah deklarasi sampai diperiksa. On-chain hanya key opaque dan digest; tidak ada publish/upload/deploy otomatis.
