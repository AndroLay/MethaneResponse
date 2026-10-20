# DeepSeek dan preview Render — 21 Oktober 2026

## Keputusan pengguna

- Model Luna diganti dengan `deepseek-v4.1-flash-1017` melalui ExperientialLabs.
- API key dibaca dari berkas privat yang diberikan pengguna; nilainya tidak
  dipublikasikan, dicetak, atau dimasukkan ke frontend.
- Deployment Render kembali diminta, pada Andro's workspace, Singapore, Free.
  Persetujuan terdahulu mensyaratkan batas Rp0 terverifikasi; bukan izin biaya.
- Tidak ada perubahan database, transaksi Sepolia, atau layanan Evidrilo.

## Urutan dan penerimaan

1. Cocokkan slug dengan katalog API dan dokumentasi provider. Simpan konfigurasi
   privat mode 0600 di `data/state/experiential.env`, di luar Git dan ZIP.
2. Batasi output per panggilan (default 2048, maksimum 4096 token), pilih reasoning
   secara eksplisit, pertahankan timeout, exact citations dan pemeriksaan kedua.
3. Jalankan regresi dan smoke API nyata terhadap tiga dokumen DEMO milik proyek,
   maksimum enam panggilan. Catat versi, usage, verdict dan integritas bundle.
   Tidak boleh menyebut smoke sebagai benchmark independen atau hasil lapangan.
4. Verifikasi biaya workspace sebelum membuat `methaneresponse-preview`.
   Konektor Render tidak mengekspos billing/spend limits; dashboard otomatis
   pada sesi pemeriksaan tidak merender konten. Permintaan verifikasi pengguna
   sudah dikirim. Belum ada layanan baru atau biaya deployment yang dilakukan.
   Pengguna kemudian menjawab "Iya silahkan anda buatkan layanan tersebut".
   Pembuatan layanan Free dilanjutkan dengan persetujuan eksplisit ini; kontrol
   billing tidak dinyatakan telah terbaca dan tidak ada klaim jaminan biaya total Rp0.
5. Setelah prasyarat biaya dipenuhi: publikasikan revisi teruji ke main, buat satu
   web/API Free, auto-deploy off, tanpa disk/database/signer. Periksa commit,
   health, snapshot, route aplikasi dan akses AI terautentikasi pada URL publik.
6. Catat deployment ID/status dan keterbatasan preview. Rollback dengan suspend
   layanan khusus MethaneResponse atau deploy kembali revisi sebelumnya; tidak
   mengubah billing/workspace atau layanan proyek lain.

## Bukti sementara

Katalog berhasil diakses dengan credential pengguna. Smoke provider nyata 3/3
lulus, lima panggilan, model respons persis `deepseek-v4.1-flash-1017`;
[ringkasan dan batas bukti](../evidence/deepseek-live-2026-10-21/README.md).
Typecheck, 301 tes API, 66 tooling tests dan 12 pemeriksaan browser/schema lulus.
Ini menggantikan status Luna
pending untuk transport; benchmark independen tetap belum tersedia.

## Batas interpretasi

Konfigurasi backend lokal, transport provider nyata, benchmark kualitas, runtime
publik dan submission adalah status yang berbeda. State Render `/tmp` bersifat
sementara; model tidak dapat mengesahkan repair atau mengotorisasi anchoring.
