# Temuan dan penyelesaian P5/P6 melalui agent

[Hasil lengkap](README.md) · [Recheck CLI](cli-context-after-fix.json)

| ID | Temuan | Tindak lanjut dan status |
|---|---|---|
| F01 | CLI memeriksa bundle, tetapi mengabaikan checksum export sehingga perubahan `claim`/`sourceDataset.snapshotId` di luar bundle lolos | **Diperbaiki:** verifikasi checksum export; `--require-context`; periksa field claim/source/synthetic serta snapshot/archive/input hash terhadap bundle bila hadir. Opsi tidak dikenal/berulang ditolak. 11 regresi CLI lulus; 25 JSON asli/tamper direplay dengan default dan strict, 50/50 sesuai ekspektasi. Bukti sebelum patch tetap disimpan |
| F02 | A02/A04 app T3 memilih awal scope satu hari setelah observasi | **Deviasi dipertahankan:** dua hasil parsial, tidak masuk pasangan waktu yang mensyaratkan jawaban benar. A06 dan tiga sesi agent1 memakai scope tugas yang benar, tercatat terpisah. Tidak ditemukan kegagalan input scope aplikasi; ini tidak membuktikan desain mudah dipahami manusia |
| F03 | Tiga jawaban manual T3 agent2 menyiratkan observasi mendahului tindakan/periode, padahal tanggal tindakan tidak tersedia | **Dinilai parsial:** tanggal dokumen/observasi tidak menetapkan urutan tindakan. [Panduan anotasi](../../testing/ai-benchmark-annotation.md) diperjelas. Jawaban lama tidak dikoreksi dan tidak diberi skor ulang sebagai benar |
| F04 | Kedua agent P6 memilih contradicted untuk claim notifikasi BHR yang seharusnya insufficient; kutipan seluruhnya exact match | **Keputusan selesai:** raw outputs dan test set tetap. Laporkan kesalahan berkorelasi; tidak ada manfaat AI dibanding rules; tidak memberi kelayakan aktivasi. Reason/semantic citation relevance belum diberi skor; tidak mengklaim agent telah diperbaiki |
| F05 | Sesi berulang, kedua kasus manual terlihat, hint fasilitator, beberapa error otomasi/ref stale; aplikasi lebih lambat dalam pasangan waktu yang memenuhi filter | **Batas studi dicatat:** dua agent bukan enam manusia; carryover dan assistance ditampilkan. Waktu wall agent tidak dipromosikan sebagai manfaat manusia; error alat tidak diklaim sebagai bug runtime. Tidak ada klaim unggul terhadap semua submission |
| F06 | Digest input hanya dibandingkan antar-output; replay raw→grounded dan binding prompt perlu diperkuat | **Diperbaiki:** helper menghitung ulang dua digest dari input beku dan mereplay grounding/verdict/count, 9 regresi; 216 binding aktual cocok. Prompt dibandingkan dengan digest metode; exact match bukan semantic validity |

Tidak ada temuan kode material terbuka dalam cakupan perubahan ini setelah review. Ketidaktersediaan peserta/pakar manusia, gold independen, dokumen event/perbaikan berizin serta provider benchmark tetap membatasi **penelitian awal**. Penutupan agent-scope tidak menandai gerbang itu lulus.

Review dilakukan oleh agent berbeda dalam mode read-only. Ia memeriksa CLI, binding P6 dan konsistensi raw→scoring→agregat P5; ini review engineering, bukan review pakar domain atau adjudikasi manusia.
