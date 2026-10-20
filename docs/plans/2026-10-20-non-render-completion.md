# Penyelesaian selain Render — 20 Oktober 2026

Permintaan pengguna: selesaikan pekerjaan terbuka selain Render. Baseline
`173bbb8`; working tree bersih sebelum increment. Pertahankan bukti beku,
snapshot aktif, kompatibilitas audit dan batas prototipe tanpa database.

## Urutan dan bukti penerimaan

1. [ ] **Perbaikan CI dan handoff peta lokal.** Reproduksi deterministik kegagalan antrean
   kapasitas 10→20 ke peta, perbaiki penyebab tanpa melonggarkan assertion,
   tambah regresi viewport/loading dan jalankan gate. Gate 877 tes dan 40 browser
   checks lulus; CI publik revisi baru diperiksa sesudah push terotorisasi.
2. [x] **Kesiapan AI; live Luna ditunda pengguna.** Periksa konfigurasi/model yang tersedia tanpa mencetak
   secrets. Jalankan hanya endpoint yang diotorisasi, input berizin dan batas
   biaya yang ditentukan. Pisahkan pemeriksaan transport/model dari benchmark
   independen; jangan mengisi review manusia atau label independen secara fiktif.
3. [x] **Blockchain lokal.** Pemeriksaan read-only Sepolia menunjukkan balance
   0, nonce 0 dan registry belum ada. Pengguna kemudian memilih prototipe tanpa
   pendanaan: penerimaan aktif memakai Anvil 31337. Integrasi transaksi, receipt,
   versi historis, tamper rejection dan pemulihan crash sudah diulang dan lulus.
   Tidak ada broadcast publik. Sepolia opsional, bukan syarat penyelesaian lokal.
4. [x] **Data dan kemampuan lanjutan.** Tinjau kandidat rilis 20 Oktober dan
   kesiapan dependensi sebelum aktivasi; jangan mengganti snapshot/intelligence
   atau keputusan lama secara parsial. Scope pencocokan lintas provider harus
   tetap dibedakan dari identitas fasilitas yang telah dibuktikan.
5. [x] **Materi terbaru dan packager.** Sinkronkan status, demo, source/judging ZIP dan
   manifest ke revisi yang diuji. Pertahankan v12 serta supplement historis.
   Siapkan publikasi konkret sebelum meminta approval yang memang belum ada;
   jangan otomatis submit Devpost atau menghubungi orang lain.
6. [ ] **Verifikasi lokal dan paket penutupan.** Gate lokal, browser desktop/mobile viewport,
   artefak reproducible, source bindings, push yang telah disetujui dan CI baru.
   Catat bagian yang belum diverifikasi tanpa model/rights review,
   akses upload, manusia atau perangkat fisik; test ETH hanya diperlukan bila
   kelak memilih transaksi Sepolia, bukan untuk prototipe lokal.

## Temuan awal

CI `39419272105`: data-pipeline dan contracts lulus; 27/28 workflow utama
lulus. Assertion `.plan-map-caption` di `audit-workflow.spec.ts:129` tidak
menemukan "20 planned sources". Reproduksi menahan IntersectionObserver hanya
untuk wrapper peta dan menghasilkan kegagalan yang sama: map belum di-mount.
Explicit Locate sekarang memuat serta menggulir peta tanpa menunggu observer;
lazy load tetap berlaku tanpa focus request. Unit dan browser red→green ada.

Konfigurasi AI dan upload YouTube tidak tersedia pada environment proses.
Konfigurasi privat Sepolia proyek ada, tidak dicetak atau dipindahkan. Tersedia
izin historis target satu deployment dan satu anchor dengan batas 0,004 SepETH;
pendanaan dan kondisi target sudah diperiksa read-only. Render dikecualikan.

## Keputusan terbaru dan pekerjaan yang sengaja tidak dipaksakan

- **Luna:** pengguna akan memberikan konfigurasi model kemudian. Tidak ada model
  pengganti yang diunduh, provider berbayar dipanggil, atau benchmark independen
  yang direkayasa. [Kontrak integrasi](../development/luna-integration.md) siap;
  verifikasi kompatibilitas/live model dilakukan setelah akses tersedia.
- **Kandidat dataset:** review read-only independen merekomendasikan mempertahankan
  staging. Aktivasi perlu rebuild semua derivative/geometry/intelligence dan
  versioned transition replay agar audit lama tidak retarget. Rekaman dengan
  sumber dihapus/relink bukan bukti repair. Hasil staging lengkap dipertahankan.
- **Publikasi:** source push sudah diizinkan. Connector Devpost read-only
  `list_my_projects` mengembalikan internal error `-32603`; belum ada target form
  yang berhasil dibaca. Upload video, submission, pilot manusia dan perangkat
  fisik tidak dinyatakan selesai oleh tes software. Tidak ada tindakan Render.
- **Review:** jalur Locate ditinjau secara independen dan read-only; tidak ditemukan
  blocker pada browser yang didukung. DOM shim yang tidak menyediakan
  `scrollIntoView` tidak diuji oleh browser gate ini.

Hasil final increment dicatat pada paket evidence bertanggal baru; evidence P2
dan paket lebih lama tetap dipertahankan byte-for-byte.

**Hasil lokal:** 877 tes utama, 40 browser/schema checks, satu integrasi Anvil dan
11 tes packager submission lulus. 170 artefak beku terdahulu tetap cocok. Source
push dan CI publik mempunyai timestamp/commit terpisah; status lokal ini tidak
menyatakan publikasi aplikasi atau keberhasilan model nyata. [Bukti baru](../evidence/non-render-completion-2026-10-20/README.md).

## Pemeriksaan publik setelah push — tindak lanjut

Gate lokal dan proof Anvil di atas tetap berlaku pada byte sumber yang direkam.
Namun CI publik `39424647485` dan `39427086280` masih gagal pada caption handoff
peta. Fix explicit focus mengatasi reproduksi observer lokal, tetapi belum cukup
untuk menyatakan akar kegagalan CI terselesaikan. Pada run kedua, caption 20
sumber hadir ketika failure handler membaca DOM setelah deadline; queue tetap
20, tidak ada page error atau React boundary fallback.

Browser yang dipin CI (Chrome Headless Shell 156.0.8078.4) lulus focused test,
pengulangan dengan CPU throttle 8×, serta urutan empat workflow pertama.
Eksperimen satu CPU pada Chromium host juga lulus. Run `39428246566` kemudian
membuktikan caption sudah masuk DOM 0,44 detik setelah Locate dan modul selesai
~90 ms, tetapi mount peta diikuti long task 20,715 detik. Hipotesis late import
bukan penyebab run tersebut. Kegagalan tes tetap dicatat, tanpa menaikkan timeout.

Pemeriksaan source menemukan probe WebGL pada canvas sementara, loseContext,
kemudian konteks MapLibre aktual. Regresi browser membuktikan dua konteks sebelum
perbaikan dan satu sesudahnya. Implementasi kini memakai canvas aktual untuk
mendeteksi renderer dan catch konstruksi MapLibre untuk fallback. Bootstrap pixel
ratio ≤1 mempertahankan ceiling/cache kualitas yang dipilih; effect kualitas
menaikkan resolusi setelah init. Tidak ada batas kualitas permanen baru. Native
method timers hanya eksperimen fixture CI, bukan kode produk; gate akhir tidak
mengganti metode WebGL. Gate/browser dan CI revisi akhir harus dicatat terpisah;
satu perbaikan lokal belum otomatis menutup CI. Bukti beku tetap dipertahankan.

## Tindak lanjut screenshot setelah perbaikan konteks

Revisi `e7b1845` menutup stall handoff peta pada dua percobaan CI: seluruh
28 workflow utama lulus. Kedua percobaan kemudian gagal pada capture overlap
di suite reviewer privat, setelah assertion fungsional sebelumnya lulus.
Kegagalan capture 20 detik berhasil direproduksi dengan Chromium yang dipin dan
satu CPU. Percobaan animasi, caret, dan diagnostik frame tidak menutupnya dan
seluruh perubahan eksperimen pada spec dikembalikan.

Review arsitektur menemukan suite privat tanpa interaksi WebGL memakai paksaan
SwiftShader yang sama dengan suite globe. Konfigurasi grafis kini dibatasi ke
suite geospasial; suite privat menggunakan pilihan default Chromium. Sandbox,
timeout, network isolation dan assertion tidak berubah. Reproduksi satu CPU yang
sama kemudian lulus 44,6 detik termasuk screenshot desktop/mobile. Regresi unit
pemilihan grafis terbukti RED→GREEN. Gate lengkap dan CI revisi baru tetap harus
dibaca dari hasil aktual, bukan diasumsikan lulus dari focused test ini.
