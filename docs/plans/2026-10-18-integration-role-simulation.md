# Simulasi tiga integrasi melalui peran agent

Mengikuti adapter `adaptive-engineering/references/persistent-plans.md`. Root menjadi satu penulis repository; agent lain membaca kode, merancang skenario dan menjalankan pemeriksaan terisolasi. Working tree lama dipertahankan.

## Tujuan dan batas

Pengguna mengonfirmasi tiga bagian: provider AI eksternal, deployment publik, dan receipt Sepolia. Permintaan ini dikerjakan melalui simulasi peran AI dengan pemeriksaan runtime lokal yang nyata. Simulasi tidak menghasilkan akun hosting, kredensial provider, funding atau transaksi Sepolia publik. Gerbang eksternal tetap memerlukan bukti dari target sebenarnya; tidak diisi dari fixture.

Snapshot awal: local `main` pada `a82e2eee99bb79327f859f304f2f5d5939f07041` beserta perubahan working tree yang sudah ada. Paket historis P1–P6 tidak ditulis ulang.

## Peran dan ekspektasi sebelum pelaksanaan

| Peran | Skenario | Ekspektasi |
|---|---|---|
| Analis pemohon | Dokumen DEMO milik sendiri, claim terbatas, consent dan token | Request provider terikat claim; hasil tetap suggestion/unreviewed dan privat |
| Peninjau skeptis | Kedua pass berbeda pendapat atau kutipan dibuat-buat | Abstain; tidak berubah menjadi konfirmasi perbaikan fisik |
| Provider bermasalah | HTTP gagal, JSON/schema rusak, redirect, respons terlalu besar | Gagal terkendali; tidak membuat revisi audit palsu atau mengirim ulang ke tujuan redirect |
| Pengunjung tanpa hak | Tanpa token/consent/rights; mencoba membaca hasil privat | Ditolak sebelum provider; tidak membocorkan kutipan atau token |
| Operator layanan | API production lokal, health/CORS, writer lock, backup dan crash/restart | State terjaga pada volume yang sama; proses kedua ditolak; bukan bukti durable cloud |
| Issuer dan verifier | Deploy/anchor Anvil, crash, revert, revisi dan export diubah | Receipt lokal tervalidasi terpisah; versi historis dibedakan; manipulasi ditolak |

Peran tidak dihitung sebagai manusia atau pakar independen. Respons provider fixture ditentukan untuk menguji protokol, bukan menilai kualitas model.

## Milestone

- [x] Agent meninjau provider serta deployment/chain; stale deployment documentation dan celah RPC acknowledgment ditangani.
- [x] Tambahkan provider HTTPS lokal → API production dengan data/token DEMO dan environment terisolasi. Root memiliki file baru di `scripts/`; tidak ada dependency baru atau perubahan kredensial.
- [x] Agent menjalankan provider 13 skenario/115 assertions dan operator/chain secara terpisah; hasil akhir dipertahankan pada paket evidence. Tidak ditemukan defect runtime aplikasi; kekeliruan fixture diperbaiki dan run final diulang.
- [x] Typecheck, 34 tes terfokus, build/bundle, satu chain + dua casework + satu publication lulus. Empat pemeriksaan HTTP mencocokkan build production yang disajikan lokal; bukan rendering browser atau hosting publik.
- [x] Review agent lain memeriksa assertion dan hasil; binding sumber/checksum serta dokumentasi disimpan bersama [bukti](../evidence/integration-role-simulation-2026-10-18/README.md). Fixture command menghentikan proses miliknya.

## Perintah penerimaan

- `bun --no-env-file test scripts/integration-role-runtime.test.ts` melalui runner environment terisolasi yang ditambahkan pada increment ini.
- `bun run test:case-work-operations` dan `bun run test:publication-operations`.
- `bun run test:chain-integration --evidence /tmp/methane-integration-roles/chain.json`.
- `bun run check`, pemeriksaan unit terkait perubahan, `bun run build:web`, `bun run check:web-bundle`.

Artefak baru: `docs/evidence/integration-role-simulation-2026-10-18/`. Hasil mencatat command, exit status, identitas peran, scope lokal/fixture, source hash dan gerbang eksternal secara eksplisit. Jika tidak ada perubahan aplikasi, tidak mengklaim suite lengkap dijalankan ulang.

## Status

**Selesai dalam cakupan simulasi engineering melalui agent.** Total 39 tes terfokus/operasi, typecheck/build/bundle dan empat HTTP build checks lulus. Tidak ada provider eksternal, deployment publik atau receipt Sepolia baru; gerbang aslinya tetap pending. Arahan pengguna mencakup agent dan tes lokal. Operasi Sepolia terdahulu tetap mempunyai persetujuan terbatas yang tercatat; simulasi ini tidak memperluasnya menjadi deployment target lain.
