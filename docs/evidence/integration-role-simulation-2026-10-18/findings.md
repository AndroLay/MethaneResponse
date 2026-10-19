# Temuan dan tindak lanjut

| ID | Temuan | Tindakan dan bukti |
|---|---|---|
| R01 | Panduan deployment menyatakan anchor intent belum ada | Perbaiki panduan sesuai P2; tidak mengubah runtime aplikasi |
| R02 | Tes crash setelah broadcast tidak membuktikan kehilangan acknowledgment RPC | Proxy loopback meneruskan transaksi ke Anvil, lalu menjawab 502. Intent/hash dipertahankan, retry 409, recovery exact hash dan nonce +1 lulus |
| R03 | Fixture direktori reviewer awal memakai spasi pada `checkedBy` | Sesuaikan identifier fixture dengan schema. Penolakan 401 adalah kontrol aplikasi yang bekerja, bukan defect autentikasi |
| R04 | Provider fixture mula-mula berhenti pada idle timeout server 10 detik | Atur fixture 60 detik dan assert elapsed 39–48 detik. Run final mencapai 40.198 ms; run sebelumnya tidak dipakai sebagai bukti deadline |
| R05 | Payload test dapat menerima full documents pada kedua pass; anchor 409 belum memeriksa alasan | Review agent meminta pemeriksaan sesuai urutan pass dan error body tepat. Run final 13 skenario/116 assertions lulus |
| R06 | Helper preview awal menerima environment proxy pada fetch induk dan salah mengeja nama manifest | Saring proxy transient pada proses helper dan pakai `mars-snapshot-manifest.json`. Empat byte/status checks final lulus; tidak mengubah environment pengguna atau aplikasi |
| R07 | Kedua pass provider dapat keliru mendukung klaim hasil fisik tanpa bukti, walau quote exact | Dipertahankan sebagai keterbatasan semantik, bukan klaim resolved. Fixture membuktikan label unreviewed/private/physical-not-established dan larangan anchor sebelum review; tidak menentukan apakah repair benar terjadi di dunia nyata |
| R08 | `modelVersion` menyimpan alias konfigurasi | Nyatakan batas provenance; tidak mengklaim versi model yang benar-benar disajikan provider telah diverifikasi |
| R09 | Mematikan launcher dapat memberi bukti restart yang ambigu | Fixture final memakai `flock -F` langsung pada API, path canonical dan health-down setelah SIGKILL sebelum restart; readiness mengecek child exit sebelum/sesudah health. Tidak mengandalkan wrapper yang mungkin menyisakan listener |
| R10 | Claim awal hanya menyatakan investigation, sehingga hasil `supported` tidak membuktikan false support atas klaim fisik | Claim final secara eksplisit menyatakan repair, pengukuran independen pascatindakan dan penurunan berkelanjutan; excerpt hanya investigation/tanpa pengukuran. Run final memakai input itu; bukan klaim bahwa repair dunia nyata mustahil terjadi |

Tidak ditemukan defect runtime aplikasi baru dalam pemeriksaan ini. Perubahan kode menambah tes/runner, sementara sumber API, web dan shared cocok dengan source freeze P5/P6. Hasil fixture yang dibuat sengaja salah tidak menjadi gold/benchmark manusia atau ukuran kualitas AI.
