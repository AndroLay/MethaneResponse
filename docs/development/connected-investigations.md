# Investigasi terhubung: dari alokasi sampai keputusan beku

[Setup](local-setup.md) · [Investigasi tim](shared-casework.md) · [API](../architecture/api-reference.md) · [Rencana](../plans/2026-10-20-connected-investigations.md)

Prototipe menggunakan satu API dan file privat, tanpa database. Satu investigasi mempunyai **satu sumber, satu jenis klaim, satu periode/scope**. Status pekerjaan, hasil assessment, penerimaan dokumen dan status integritas merupakan hal berbeda. Semua contoh reviewer dalam pengujian adalah DEMO, bukan studi manusia atau konfirmasi mitigasi.

## Perjalanan pengguna

1. Di **Cases → Plan investigation capacity**, bandingkan kapasitas dan strategi pada snapshot yang sama. Reviewer bertoken signed dengan authority direktori aktif dapat menerima rencana berversi. Buka Evidence untuk sumber yang dipilih.
2. Tentukan klaim dan periode pada **Evidence Auditor**. Buka workspace bersama; bila sesi reviewer sudah terhubung melalui planner, sesi tersebut digunakan kembali. Token hanya di memori.
3. Isi pertanyaan, next action, permintaan bukti dan acceptance criteria. **Attach accepted plan revision** memeriksa persetujuan terbaru, keanggotaan sumber, snapshot, hash arsip dan replay rencana. Sesudah disimpan, tautan tetap menunjuk persetujuan historis tersebut, sekalipun ada keputusan rencana berikutnya.
4. Di **Structured evidence requests**, terbitkan permintaan dengan peran penerima dan tenggat. Persyaratan berasal dari field permintaan/acceptance criteria saat event dibuat. **Add evidence event to draft** belum menyimpan; gunakan **Save shared work**. Tidak ada email atau pesan eksternal yang dikirim.
5. Catat respons berizin menggunakan HTTPS reference, locator dan SHA-256 berkas asli. Pilih presisi tanggal yang benar: hari, bulan, tahun atau tidak diketahui. `2026-09` tetap bulan, bukan `2026-09-01`. Hash dan dasar izin masih deklarasi sampai reviewer memeriksanya. Referensi tidak diunduh atau dikirim ke AI otomatis.
6. Reviewer mencatat penolakan, kebutuhan bukti tambahan, atau penerimaan **untuk assessment**. Penerimaan respons tidak menghasilkan verdict mitigasi. Jalankan baseline atau jalur assessment dokumen yang tersedia, lalu lampirkan assessment dengan source/claim/scope/provenance yang sama. AI opsional tetap di backend dan wajib melalui human review; model yang belum direview tidak dapat dibekukan sebagai keputusan.
7. Simpan semua edit, lalu **Download verified investigation dossier** untuk memeriksa riwayat, rencana, assessment dan perbandingan snapshot. **Inspect decision dossier and history** memuat digest yang tepat. Baca bukti asli, pilih keputusan dan alasan, serta konfirmasikan inspeksi sebelum **Freeze reviewed investigation decision**. Server memeriksa ulang revisi pekerjaan, head keputusan, digest dossier dan authority saat commit. Ketidaksesuaian mengharuskan review ulang; draft tidak ditimpa otomatis.
8. **Verify and download decision** mengembalikan keputusan beku yang sama beserta status receipt dan alasan revisit. Respons/bukti baru, perubahan assessment atau acceptance criteria dapat merekomendasikan review. Catatan biasa tidak membatalkan keputusan. Perbandingan yang sudah termasuk snapshot keputusan tidak dilaporkan sebagai pembaruan baru.

Event bukti dan revisi pekerjaan bersifat append-only. Setiap revisi mencatat actor dan waktu server; jangan mempercayai nama pengirim yang diketik pengguna. Untuk memperbaiki respons yang sudah direview, tambahkan respons baru. Satu response ID direview satu kali.

## Dossier hidup dan keputusan beku

Dossier ekspor merangkum material yang tersedia ketika ekspor dilakukan. Journal rencana bisa memperoleh revisi baru. Karena itu keputusan menyimpan **salinan lengkap dossier beserta digest-nya**, bukan hanya ID atau tautan ke state terbaru. Mengedit casework, menambahkan respons atau mengubah rencana tidak menulis ulang keputusan lama. Keputusan berikutnya menyertakan `previousDigest` dan revision baru.

Dossier versi 1 tetap memiliki `chainAnchored: false`: itu payload yang dibekukan sebelum transaksi. Receipt disimpan di wrapper luar. UI/verifier menentukan status chain dari receipt dan event yang diperiksa; tidak mengubah hash payload historis agar menampilkan badge.

## Verifikasi independen

Simpan digest melalui kanal tepercaya yang terpisah dari berkas yang diperiksa:

```bash
bun run verify:investigation dossier.json --expected-digest 0xDIGEST_TEPERCAYA
bun run verify:investigation-decision decision.json --expected-digest 0xDIGEST_TEPERCAYA
bun run verify:investigation-decision decision.json --expected-digest 0xDIGEST_TEPERCAYA --require-chain
```

Ganti placeholder dengan SHA-256 64 digit. Digest menggunakan canonical JSON, sehingga indentasi/urutan key bukan perubahan semantik. Isi string, hubungan material dan chronology harus tetap cocok. Verifier menolak normalisasi string yang dapat menyembunyikan perubahan. Checksum yang dihitung ulang penyerang tidak menggantikan commitment terpisah.

Tanpa RPC/receipt, pemeriksaan lokal tidak mengklaim chain verification. `--require-chain` gagal bila target atau receipt tidak tersedia. Dengan konfigurasi read-only, verifier memeriksa network, registry, canonical block, confirmations, event, issuer, digest, version dan registry head. Receipt historis tetap sah ketika ada versi berikutnya pada registry key yang sama. Replay diff snapshot terhadap berkas input lengkap menggunakan verifier snapshot yang terpisah.

## Anchoring dan recovery

- Tidak ada kontrak baru. `EvidenceRegistry` dan namespace audit v2 tetap kompatibel. Keputusan menggunakan namespace `methane-response:investigation-decision:v1` dengan context/work identity yang di-hash. Chain hanya menerima opaque key dan digest, bukan catatan atau dokumen.
- Memerlukan `private_read`, `review` dan `anchor`, authority direktori saat ini, `ENABLE_CHAIN_WRITES`, serta signer/target backend yang dikonfigurasi. Plan historis tetap memerlukan authority `source_detected` walaupun link sudah dihapus dari revisi pekerjaan terbaru.
- UI memperlihatkan target chain/registry/issuer dan meminta otorisasi satu transaksi. Mengonfigurasi signer tidak memberi agen izin untuk memakai jaringan publik atau dana pengguna.
- Signed transaction dibuat lokal; intent dan nonce disimpan durabel **sebelum broadcast**. Audit lama dan keputusan memakai satu coordinator. Pending intent pada salah satu jalur memblokir transaksi baru di jalur lain.
- Jika acknowledgement hilang, server dapat mengembalikan `502` walaupun transaksi sudah ditambang. Jangan rebroadcast. Gunakan **Reconcile decision**. Receipt belum tersedia menghasilkan `202`; outcome terminal tersimpan idempotent. Intent yang belum jelas tidak dilepas otomatis.
- Pengujian Anvil menggunakan akun dan saldo sekali pakai pada loopback. Itu bukan Sepolia dan chain disposable berhenti setelah tes. Jalankan ulang test untuk menghasilkan chain/bukti baru; receipt lama tidak menjamin RPC tersebut tetap tersedia.

## Penyimpanan, batas dan rollback

File audit yang sama menyimpan keputusan dan intent-nya secara atomik. Envelope audit 1/2 dan array legacy tetap dibaca. Setelah keputusan pertama, envelope menjadi **3**; kontrak, audit bundle v2/v3/v4 dan hash lamanya tidak diubah. Marker inisialisasi dan launcher single-writer tetap berlaku. State yang rusak, hilang setelah inisialisasi, atau payload beku yang dimanipulasi gagal tertutup.

Backup seluruh file audit beserta marker dan file casework di bawah writer lock setelah menghentikan API. Maintenance casework yang ada hanya mencadangkan casework, **bukan** keputusan di file audit. Rollback ke kode lama memerlukan backup sebelum envelope 3, atau versi kode yang memahami envelope 3. Jangan membuka file baru dengan writer lama karena field baru dapat hilang.

| Batas | Nilai |
|---|---|
| Body save casework | 16 KiB |
| Revisi satu pekerjaan / evidence events | 100 / 40 |
| Dossier atau keputusan ekspor | 16 MiB |
| Keputusan beku total / decision intents | 100 / 200 |
| File audit total | 64 MiB |
| Pembuatan dossier/keputusan bersamaan | 2 per proses |
| Operasi investigasi | 20/menit per actor dan client, process-local |

Ketika batas tercapai, riwayat dipertahankan. Buka investigasi baru yang sesuai scope untuk melanjutkan. Prototipe tidak mendukung banyak writer/instance atau filesystem terdistribusi.

## Cakupan bukti

Lihat [paket verifikasi increment ini](../evidence/connected-investigations-2026-10-20/README.md) untuk source manifest, hasil tes dan screenshot aktual. Test fixtures tidak membuktikan kualitas provider AI, manfaat bagi pengguna nyata, emisi yang berkurang, deployment publik atau receipt Sepolia. Kontrol integritas tidak membuktikan kebenaran fisik.
