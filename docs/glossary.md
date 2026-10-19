# Glosarium

[Pusat dokumentasi](README.md) · [Data dan claims](product/data-and-claims.md)

| Istilah | Arti dalam repo |
|---|---|
| MARS / IMEO | Methane Alert and Response System dari UNEP International Methane Emissions Observatory; sumber data historis proyek |
| Source | Identifier sumber menurut penerbit; tidak otomatis setara satu fasilitas yang telah diaudit |
| Plume / observation | Record observasi bertanggal; pengukuran diskret dengan cakupan dan ketidakpastian |
| Snapshot | Salinan dataset pada retrieval tertentu dengan ID/hash; tidak memperbarui diri |
| Provenance | Asal data, retrieval, lisensi, transformasi, dan hash untuk menelusuri artefak |
| Casebook | Subset sumber nyata yang dikurasi bersama konteks referensi |
| DEMO / synthetic | Fixture buatan untuk demonstrasi/tes; bukan bukti kejadian nyata |
| Claim | Kategori pernyataan: `source_detected`, `operator_notified`, atau `mitigation_confirmed` |
| Scope | Periode, kejadian, dan bila relevan penerima yang membatasi pemeriksaan |
| Rules baseline / coverage | Pemeriksaan deterministik hubungan metadata bukti terhadap claim/scope |
| Determination | Keputusan manusia dengan alasan; terpisah dari hasil coverage |
| `insufficient_evidence` | Bukti belum mendukung kesimpulan lebih kuat; tidak berarti klaim salah atau emisi nol |
| Reference metadata | URL, locator, tanggal dan hubungan bukti; berbeda dari isi dokumen yang telah diautentikasi |
| Investigation / case work | Pertanyaan, catatan, next action, permintaan bukti, dan status kerja yang dapat diubah; mode browser-local atau shared workspace berotorisasi dengan CAS/history server |
| Audit revision / bundle | Penilaian tersimpan dengan isi dan versi tetap; revisi baru tidak menimpa bundle lama |
| Schema 2 / 3 / 4 | Format bundle: rules baseline / document AI beserta review / penilaian manual privat |
| Parent hash | Referensi digest revisi asal untuk menelusuri perubahan penilaian |
| Canonical JSON | Penyusunan JSON konsisten sebelum menghitung digest |
| SHA-256 / digest / checksum | Ringkasan kriptografis isi; memeriksa perubahan yang di-hash, bukan kebenaran dokumen |
| Reviewer scope | Capability token `private_read`, `review`, atau `anchor`; berbeda dari scope periode audit |
| Operator attestation | Catatan pemeriksaan reviewer oleh pengelola layanan; bukan verifikasi eksternal atas identitas/independensi |
| Public transparency summary | Ringkasan field terbatas satu revisi dengan persetujuan; bundle lengkap tetap privat |
| Export checksum | Checksum amplop laporan JSON termasuk konteks ekspor; berbeda dari hash bundle di dalamnya |
| Receipt / anchor | Bukti transaksi yang mengikat hash pada registry; write opt-in memakai intent durabel, pending direkonsiliasi; uji lokal bukan receipt Sepolia publik |
| Recurrence | Estimasi record MARS tertaut berikutnya; tidak mengukur kebocoran fisik atau hasil mitigasi |
| Priority heuristic | Aturan mengurutkan investigasi; bukan skor kebenaran klaim atau prediksi emisi |
| LocalStorage / sessionStorage | Penyimpanan browser untuk catatan/preferensi dan draft per tab; tidak terenkripsi atau dibagikan otomatis |
| Atomic file store | Penggantian file atomik dan antrean satu proses; tidak menyediakan transaksi lintas replika |
