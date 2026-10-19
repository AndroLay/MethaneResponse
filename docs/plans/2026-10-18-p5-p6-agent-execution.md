# Eksekusi P5 dan P6 dengan agent

**Arahan:** pengguna meminta P5/P6 dituntaskan melalui agent. Rencana enam paket tetap menjadi acuan penelitian; hasil agent mempunyai status tersendiri dan tidak mengisi gerbang manusia/provider.

## Hasil yang harus benar-benar dikerjakan

1. Bekukan tugas, dua kasus P5, source archive aplikasi, assignment dan aturan penilaian sebelum sesi. Jalankan enam sesi agent dengan manual/aplikasi, catat jawaban, waktu aktual bila terukur, bantuan, kegagalan dan exit beliefs. Agent yang sama menjalankan lebih dari satu sesi tidak dihitung sebagai peserta independen.
2. Bekukan P6 pada subset sumber yang terpisah dari empat kasus pilot/demo. Buat proposisi tentang **isi rekaman historis**, bukan kebenaran perbaikan fisik; atribusi dan lisensi dataset tetap disertakan. Dua agent menilai tanpa melihat label pembanding atau penilaian satu sama lain.
3. Jalankan rules dan penilaian agent pada dokumen/claim yang sama. Periksa kutipan dengan verifier aplikasi. Hitung agreement, tiga kelas, false support, abstention, source-cluster interval dan selisih berpasangan. Laporkan hasil nol/negatif; tidak menyesuaikan test set untuk memperoleh kemenangan.
4. Tuntaskan temuan material dalam cakupan ini, jalankan tes yang relevan dan review. Bekukan hasil, checksum dan status aktif. Tidak membuka provider aplikasi atau menyatakan agent sebagai pakar/pengguna manusia.

## Keputusan sebelum hasil

- P5: LBY_S_143 dan CAN_S_002; empat tugas mengikuti paket tugas sebelumnya. Kondisi manual mendapat metadata dan export baseline yang sama, sehingga T4 membandingkan **verifikasi**, bukan kemampuan native MARS membuat export. Waktu agent termasuk tooling dan tidak menjadi penghematan waktu manusia.
- Enam sesi dijadwalkan dengan empat kombinasi workflow/case; agent dapat menjalankan tiga sesi berurutan. Efek belajar dan jumlah agent sebenarnya dilaporkan. Confidence manusia tidak dibuat.
- P6: 12 source test, enam claim per source (72 claim); dua record-supported, dua record-contradicted dan dua insufficient. Dokumen diringkas dari snapshot lokal berlisensi CC BY-NC-SA 4.0; report body tidak disertakan. Template klaim adalah authored challenge, bukan pernyataan publisher yang ditemukan di dunia nyata.
- Rules pembanding adalah parser rekaman deterministik yang dibekukan sebelum penilaian; semantik isi dokumen sama dengan agent. Baseline coverage aplikasi dilaporkan terpisah karena tidak membaca proposisi.
- Agent labels/predictions tidak menjadi human gold. Hasil diagnostik selalu `humanResearchGatePassed: false`, `providerBenchmarkCompleted: false`, `activationEligible: false`.
- Completion agent mensyaratkan seluruh sesi/claim tercatat dan hasil serta batas dapat diperiksa; tidak mensyaratkan AI mengalahkan rules. Completion penelitian asli tetap memerlukan manusia, corpus/izin dan provider yang sesuai.

## Pelaksanaan

Artefak baru berada di `docs/evidence/p5-p6-agent-completion-2026-10-18/`. Paket sebelumnya tidak ditulis ulang. Tidak ada rekrutmen, pesan eksternal, deployment, transaksi atau perubahan credential.

## Hasil akhir

- [x] P5: dua agent menjalankan enam sesi berulang, 48/48 tugas; jawaban, timing, bantuan dan exit beliefs disimpan. Scoring 40 correct/8 partly, seluruh deviasi dipertahankan. Median 15 pasangan yang memenuhi filter menunjukkan app lebih lambat pada waktu wall agent; tidak mengklaim manfaat manusia.
- [x] P6: 72 klaim test/12 sumber, dua konteks agent, rules dan input sama; prediksi, grounding dan metrik lengkap. Masing-masing agent 71/72 vs rules 72/72, kesalahan sama, keputusan tidak memberi kelayakan aktivasi.
- [x] Temuan CLI diperbaiki setelah sesi; 25 berkas pilot direplay dalam 50 pemeriksaan sesuai ekspektasi. Binding 216 assessment dihitung ulang. Tes/review dilakukan; `check:all` lulus 708 tes beserta typecheck/build/bundle.
- [x] [Paket hasil](../evidence/p5-p6-agent-completion-2026-10-18/README.md), manifest/checksum dan docs aktif diselaraskan; artefak historis dipertahankan.

**Cakupan agent selesai.** Penelitian manusia/provider pada rencana enam paket tetap belum selesai. Tidak ada penggantian gold manusia dengan output agent atau klaim AI telah mengungguli rules.
