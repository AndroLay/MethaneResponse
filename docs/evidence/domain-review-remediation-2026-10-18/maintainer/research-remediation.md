# P4 — hasil perbaikan temuan riset

Disposition implementer, bukan hasil pakar. Dokumen repo asal: docs/research/p4-research-remediation-2026-10-18.md.

**Tanggal:** 18 Oktober 2026. **Jenis hasil:** perbaikan engineering dan keputusan cakupan atas F01–F13. Penilaian domain manusia, keaslian laporan dan outcome fisik belum terverifikasi. Ledger ini bukan jawaban pakar atau izin penggunaan laporan.

## Perubahan yang dapat digunakan

1. Baseline ditampilkan sebagai **Required references present**, **Contrary reference present** atau **Insufficient reference coverage**. Kode `supported`/`contradicted` dipertahankan untuk kompatibilitas. Nama kategori `mitigation_confirmed` adalah pertanyaan klaim, bukan status fasilitas.
2. Bundle baru mengikat `assessmentSemantics`: basis metadata/manusia/model dan `physicalVerification: not_established_by_application`. API, browser dan CLI menolak semantik palsu meski hash dihitung ulang. Human review atas keluaran model tetap memiliki basis model.
3. Penilaian notification/mitigation baru memerlukan scope. Request baseline lama tetap diterima, tetapi tanpa scope menghasilkan insufficient dengan alasan eksplisit. Bundle tersimpan tidak dinilai atau di-hash ulang.
4. Pointer utama/contrary/follow-up diperiksa. Bukti nyata memerlukan HTTPS valid tanpa credentials; `fixture://` hanya untuk DEMO. Pointer valid tidak membuktikan URL hidup, dokumen asli atau hubungan semantik tindakan/aset.
5. Tanggal kalender diperiksa ketat; timestamp ber-offset dinormalisasi ke hari UTC. Timestamp MARS tanpa offset diperlakukan UTC. Resolver, baseline, human observation linkage, scope picker, inventory dan verifier memakai helper yang sama. Periode inklusif; follow-up tidak boleh sebelum aksi atau setelah akhir scope.
6. URL invalid pada input manusia menghasilkan HTTP 400. Referensi utama dan follow-up tidak lagi melempar exception/500.
7. UI, riwayat, report preview, brief dan ringkasan publik menjelaskan basis serta batas fisik. Pernyataan independensi manusia yang belum dibuktikan dihapus. Payload ringkasan publik schema 1 dipertahankan; tambahan penjelasan berada pada tampilan.

## Disposition setiap temuan

| ID | Keputusan dan tindakan | Bukti / sisa yang nyata |
|---|---|---|
| F01 | Ditangani secara teknis: pisahkan metadata coverage dari human/model determination dan physical verification; basis terikat hash | Tes semantics/presentation/export. Kecukupan bahasa dan syarat bukti fisik tetap dinilai pakar; metadata palsu yang tampak lengkap tidak diubah menjadi klaim autentik |
| F02 | Pointer contrary wajib valid dan sesuai claim/date/scope; label hanya menyatakan referensi contrary hadir | Replay M09 kini insufficient. Aplikasi tidak membaca substansi laporan secara otomatis; reviewer bertanggung jawab atas penilaian isi |
| F03 | Semua notification/mitigation evaluations baru wajib scope, termasuk pemanggilan fungsi langsung | M08 kini insufficient; request legacy tidak error dan tidak dapat menghasilkan supported tanpa scope; hash lama tetap valid |
| F04 | Source/event membership dan tanggal tetap diperiksa; basis human menyatakan inspection self-attested. Baseline tidak menyamakan field action dengan hasil fisik | M17 insufficient; M18 tetap dapat lolos coverage metadata dan selalu physical verification not established. Memvalidasi relevansi teks memerlukan inspeksi sumber, bukan heuristik kata kunci |
| F05 | Kontrol sudah sesuai: flag `notified` bukan tanda terima. Scope menyebut penerima; R02 tetap insufficient | Tidak dibuat log sent/delivered/received fiktif. Pengiriman notifikasi resmi dan integrasi receipt merupakan pekerjaan integrasi baru dengan kanal/otorisasi tersendiri |
| F06 | Publisher links, assessed citations dan historical context tetap terpisah; report/brief menjelaskan status masing-masing | Hasil insufficient atas bahan yang diberikan tidak membantah publisher. Tidak menyalin atau menyatakan telah membaca laporan yang hanya ditautkan |
| F07 | Pertahankan unknown untuk non-detection; physical verification eksplisit tidak ditetapkan aplikasi | Tidak mengestimasi pengurangan emisi/zero methane/denominator valid tanpa data. D06 tetap insufficient; manfaat ilmiah dan lapangan belum dibuktikan |
| F08 | Diperbaiki: helper UTC/kalender ketat dipakai lintas lapisan keputusan | M12/M13, resolver offset, scope UI dan verifier export; tanggal laporan publisher tetap tanggal publikasi, bukan tanggal aksi/follow-up |
| F09 | Diperbaiki: trim dan lowercase recipient pada kedua sisi | M11 kini supported metadata; salah penerima tetap insufficient |
| F10 | Kontrol lisensi/atribusi dipertahankan; tidak ada perubahan hak, reproduksi laporan atau penggunaan komersial baru | Notice CC BY-NC-SA dan provenance ada pada kedua paket; aplikasi tidak memberikan putusan hukum atas izin di luar tujuan saat ini |
| F11 | Ditahan sebagai pertanyaan sumber yang belum terverifikasi; tidak mengarang bulan konfirmasi atau mengganti dataset beku | Pembukaan ulang item ARG melalui alat web kembali timeout pada 18 Oktober. `reportDate: 2023-11` tetap metadata publikasi; tidak diperlakukan sebagai tanggal konfirmasi. Pakar/publisher perlu menjelaskan dugaan March/May |
| F12 | Paket v2 siap untuk fase A/B/C dengan formulir dan ledger manusia kosong; v1 disimpan historis | **0 pakar / 0 sesi / 0 hasil manusia.** Review dan recheck manusia tetap pekerjaan eksternal yang belum selesai |
| F13 | Diperbaiki: validator URL aman pada kegagalan parsing | Regresi schema dan handler untuk kedua field: spasi/malformed/HTTP/credentials → 400; HTTPS valid diterima |

## Membaca replay 30 eksperimen

Tes `apps/api/src/p4-research-replay.test.ts` memakai 12 input v1 yang tidak diubah dan 18 variasi lokal yang dikonstruksi ulang. Kode JavaScript dari ZIP riset tidak dijalankan. Dua belas keluaran dasar tetap 3 supported metadata, 1 contrary, 8 insufficient. Perubahan yang disengaja:

| Variasi | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| M03 / M04 | supported | insufficient | Pointer utama/follow-up hilang atau kosong |
| M08 | supported | insufficient | Scope wajib |
| M09 | contradicted | insufficient | Pointer contrary hilang |
| M11 | insufficient | supported metadata | Normalisasi recipient simetris |
| M13 | supported | insufficient | Instant berada di 1 Oktober UTC, di luar scope 30 September |

URL palsu yang valid secara sintaks, title palsu atau action yang tidak relevan (M01/M02/M10/M14/M18) masih dapat lolos **coverage metadata**. Ini merupakan batas yang secara eksplisit direkam, bukan verifikasi ilmiah. Tes tidak menyebut hasil tersebut sebagai kebenaran fisik atau akurasi model.

## Kompatibilitas dan batas selesai

Bundle lama tanpa field semantics tetap diterima tanpa perubahan bytes. Revisi baru dari parent model legacy mendapat basis model sebelum hash; parent tidak berubah. Paket v1 dan evidence P1–P3 mempertahankan bytes. Binding kode historis dapat berbeda dari checkout baru; gunakan manifest v2 untuk versi ini.

Perbaikan teknis tidak mengisi lima checklist hasil manusia P4. Kriteria tersebut baru terpenuhi setelah pakar relevan menilai paket tertentu, temuan material ditindaklanjuti dan diperiksa ulang, serta ringkasan mendapat consent. Pilot pengguna P5, benchmark AI P6 dan receipt Sepolia publik tidak dihasilkan oleh pekerjaan ini.
