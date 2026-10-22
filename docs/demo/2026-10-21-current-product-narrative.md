# MethaneResponse — pembahasan dan narasi demo produk terkini

**Tanggal:** 21 Oktober 2026. **Status:** treatment dan naskah produksi, belum video baru.

Dasar: video v12 aktual, source aplikasi `98b25ca`, bukti DeepSeek dan Render
21 Oktober, serta workflow Connected Investigations dan Snapshot Change Watch.
File/caption/manifest v12 dipertahankan. Naskah ini tidak mewarisi hasil uji ekspor
v12 dan tidak menyatakan footage baru sudah direkam.

## 1. Hasil peninjauan video sebelumnya

Video `delivery-output/story-v12/MethaneResponse-Final-Presentation-Demo-v12.mp4`
berdurasi **267,92 detik**, H.264 1920×1080, audio AAC dan subtitle tertanam.
Naskah/storyboard lengkap dibaca dan delapan frame yang diambil sepanjang MP4
ditinjau sebagai contact sheet. Ini inspeksi visual sampel dan metadata, bukan
pemutaran audiovisual penuh atau penilaian naturalitas suara.

Yang dipertahankan:

- Pembuka berupa pertanyaan analis, lalu konteks iklim dan peran MARS.
- Satu kasus yang ditelusuri, tanggal asli, satuan kg/h dan ketidakpastian.
- Pembesaran formulir yang tenang, cursor jelas, hasil aplikasi asli.
- Penjelasan bahwa kekurangan bukti pada bundle tidak membantah katalog UNEP.
- Original → changed → original untuk memperlihatkan pemeriksaan integritas.

Yang harus diperbarui:

- v12 memakai alur Find → Choose date → Check → Request → Verify. Produk kini
  mencakup alokasi kapasitas, investigasi terkait dan peninjauan perubahan data.
- Adegan rules baseline tidak boleh diberi label baru seolah pemanggilan DeepSeek.
- Pemeriksaan checksum pada v12 bukan transaksi blockchain. Bukti kontrak perlu
  footage transaksi/receipt/verifier aktual yang baru.
- Pernyataan penutup v12 tentang tidak adanya receipt berlaku untuk cut tersebut;
  demo berikutnya dapat memperlihatkan Anvil lokal secara eksplisit.
- KAZ_S_159 adalah kasus historis v12, bukan nama samaran untuk source lain.

## 2. Masalah yang perlu digali

### Mengapa metana penting

Menurut FAQ UNEP Eye on Methane, emisi metana dari aktivitas manusia mendorong
sekitar 30% pemanasan global saat ini. Angka ini konteks global; bukan porsi emisi
yang ditangani aplikasi atau potensi pengurangan yang telah dihitung proyek.
Tujuan pembuka ialah menjelaskan mengapa keputusan tindak lanjut perlu didukung
bukti, bukan memberi kuliah panjang tentang kimia atmosfer.

### Apa yang sudah dikerjakan MARS

MARS menggunakan pengamatan satelit dan analisis untuk mendeteksi emisi besar,
menyampaikan notifikasi, serta mendukung tindak lanjut. UNEP juga mendokumentasikan
hasil mitigasi. Jangan menggambarkan MARS sebagai peta pasif, mengklaim MARS
tidak menggunakan AI, atau mengatakan tidak ada sistem tindak lanjut sebelum kita.

### Persoalan pengguna MethaneResponse

Bayangkan tim analis memiliki ribuan rekaman sumber historis tetapi kapasitas
untuk sepuluh investigasi. Ini skenario penggunaan, bukan hasil wawancara/pilot.
Tim harus menjawab tiga kelompok pertanyaan:

1. **Alokasi:** sumber mana dipilih dengan kapasitas dan cakupan wilayah yang
   sama, mengapa dipilih, apa yang tersisih, dan bagaimana pilihan berubah ketika
   kapasitas bertambah?
2. **Penilaian:** apakah dokumen membahas source, klaim dan periode yang sama;
   apa yang mendukung/menyangkal; dan bukti apa yang masih harus diminta?
3. **Akuntabilitas:** siapa memutuskan berdasarkan revisi bukti yang mana;
   apakah laporan masih cocok dengan commitment yang dipercaya; dan apakah
   pembaruan data mengharuskan keputusan ditinjau ulang?

Kendala tersebut berbeda: banyaknya rekaman tidak menentukan prioritas secara
otomatis; respons administratif tidak membuktikan repair; hash tidak membuktikan
kebenaran fisik. Video harus memperlihatkan tindakan konkret untuk setiap kendala.

## 3. Janji produk dan hasil yang diharapkan

**Kalimat utama Inggris:**

> MethaneResponse helps teams decide what to investigate, assess the evidence
> behind methane claims, and preserve decisions others can independently check.

Manfaat yang ditawarkan adalah keputusan investigasi yang dapat ditelusuri.
Yang terlihat di akhir demo harus berupa:

- rencana berkapasitas tertentu dengan alasan dan tradeoff;
- investigasi dengan source ID, snapshot, klaim dan periode yang konsisten;
- kutipan dokumen yang bisa dibaca dan hasil assessment yang dibatasi konteks;
- permintaan bukti spesifik, bukan sekadar label “insufficient”;
- keputusan reviewer berversi dengan dossier tepat;
- perubahan record sebelum/sesudah beserta alasan revisit;
- laporan yang cocok dengan commitment, dan salinan berubah yang ditolak.

Kecepatan kerja, ketepatan ilmiah model, dan pengurangan emisi tetap hipotesis
manfaat sampai dievaluasi. Jangan memakai jumlah tes/LOC sebagai bukti mengungguli
pesaing atau menampilkan skor kemenangan internal.

## 4. Struktur 4 menit 50 detik

Aturan resmi yang dibaca 21 Oktober tetap meminta video **3–5 menit**. Target
290 detik memberi margin sepuluh detik. Waktu di bawah adalah alokasi editorial,
bukan timing audio yang sudah dihasilkan; jangan menambah bumper di luar durasi.

| Waktu | Fungsi cerita | Tampilan dan aksi yang harus terlihat | Hal yang dipahami penonton |
|---|---|---|---|
| 00:00–00:12 | Masalah keputusan | Ribuan record → tim → 10 slot, label illustrative scenario | Ada keterbatasan kapasitas dan pilihan yang harus dijelaskan |
| 00:12–00:28 | Mengapa penting | Satu angka UNEP dan diagram detection/response/outcome | Metana penting; respons bukan konfirmasi hasil fisik |
| 00:28–00:43 | Peran MARS | Diagram pendek Detect → Notify → Follow up, atribusi UNEP | Kita memakai dan melengkapi sistem yang sudah ada |
| 00:43–01:00 | Janji MethaneResponse | Plan → Assess → Review → Revisit → Verify, preview keluaran nyata | Apa yang produk tambahkan dan siapa penggunanya |
| 01:00–01:25 | Data nyata | Globe → source → tanggal/flux/SD/provenance | Penonton dapat menelusuri dasar observasi |
| 01:25–01:55 | Kapasitas dan tradeoff | Cases planner, 10 slot, bandingkan strategi, ubah 20 dan lihat selisih | Prioritas dapat dijelaskan dan pilihan tidak diganti diam-diam |
| 01:55–02:20 | Investigasi yang terpilih | Satu source terpilih → riwayat → klaim dan periode → permintaan bukti | Mengapa source itu diperiksa dan apa pertanyaannya |
| 02:20–02:55 | AI dengan bukti | Excerpt berizin → consent → request model → hasil dan exact quote | AI membantu membaca dokumen; dasar hasil dapat diperiksa |
| 02:55–03:20 | Keputusan dan next action | Reviewer inspeksi → determination/rationale → freeze dossier | Manusia memutuskan; celah bukti menghasilkan tindakan berikutnya |
| 03:20–03:43 | Perubahan historis | Dua snapshot → exact before/after → revisit pada source terkait | Sistem menjelaskan apa yang berubah tanpa menulis ulang keputusan |
| 03:43–04:19 | Integritas dan blockchain | Anchor lokal → receipt/event → verifier → edited+rehashed ditolak | Ada commitment di luar berkas, bukan checksum diri sendiri saja |
| 04:19–04:50 | Hasil dan ekspektasi | Tiga keluaran nyata, URL/repo dan batas ringkas | Kegunaan praktis, kemampuan yang diuji dan batas prototipe |

Sekitar **199/290 detik (69%)** dialokasikan untuk aksi/hasil produk, bukan semua
untuk klik. Sebagian berupa pembacaan hasil dan penjelasan pendek di atas footage
aktual. Kurangi jumlah adegan jika hasil tidak cukup terbaca pada kecepatan normal.

### Pembuka: empat pertanyaan harus terjawab dalam satu menit

1. Mengapa peduli? Ada persoalan iklim penting yang membutuhkan tindak lanjut.
2. Mengapa solusi ini dibutuhkan? Tim perlu memilih pekerjaan dan menguji klaim
   terhadap bukti spesifik yang dapat diperiksa.
3. Mengapa MARS tetap penting? Pengamatan/notifikasi/tindak lanjut UNEP menjadi
   fondasi ilmiah, bukan sesuatu yang diklaim diciptakan MethaneResponse.
4. Apa hasil produk? Rencana, penilaian dan keputusan berversi dengan verifikasi.

Judul awal: **“Thousands of records. Ten investigations. Which decisions can you justify?”**
Jangan membuka dengan logo panjang, daftar stack, tabel tes atau perbandingan pesaing.

## 5. Draft narasi Inggris

Bahasa Inggris untuk film, diskusi produksi memakai Bahasa Indonesia. Ini draft
yang perlu diikat ke aksi hasil rekaman; kalimat yang menyebut suatu hasil hanya
boleh dipakai bila hasil tersebut benar-benar terlihat pada take baru.
Draft berisi sekitar 579 kata sebelum penyesuaian rekaman, memberi ruang untuk
membaca hasil. Durasi 4:50 belum diverifikasi dengan audio baru.

### 00:00–00:12 — The decision

Imagine your team can investigate ten methane sources. The historical dataset
contains thousands. Which do you choose, and how will you justify what happens next?

### 00:12–00:28 — Why this matters

UNEP links methane from human activities to about thirty percent of today's
global warming. Effective follow-up matters. But a satellite detection, a reported
response, and documented mitigation are different kinds of evidence.

### 00:28–00:43 — Build on MARS

UNEP's Methane Alert and Response System detects major emissions, notifies
stakeholders, and supports follow-up. MethaneResponse builds on those historical
records to help researchers, auditors, and public-interest analysts investigate.

### 00:43–01:00 — Our contribution

We connect three decisions: what to investigate, what the available evidence
actually supports, and what should trigger another review. The result is a
versioned investigation that another reviewer can inspect and verify.

### 01:00–01:25 — Start with the record

This snapshot contains four thousand two hundred eighteen sources and thirty
thousand four hundred fourteen plume records. Open a source to inspect its original
identifier, dates, estimated emission rates, and recorded uncertainty. These are
historical observations, not a live feed. Gaps between observations do not mean
zero emissions.

### 01:25–01:55 — Make the tradeoff visible

Set ten investigation slots and a geographic scope. Compare strategies under the
same constraints, then inspect why a source was selected and what was left out.
Increase capacity to twenty. The map and queue reveal the difference, while the
active plan remains an explicit choice. These are explainable planning heuristics,
not predictions of future leakage or guaranteed emissions savings.

### 01:55–02:20 — Ask one precise question

Follow one selected source into the investigation. Keep its identifier, snapshot,
claim, and review period together. Inspect the dated observations, then state
exactly what evidence would answer the question. A response saying work was
reported is not enough to conclude that mitigation was independently confirmed.

### 02:20–02:55 — Show the AI doing work

Submit an authorized excerpt to the backend. Here, the text is clearly labeled
DEMO; it is not a real operator's repair report. DeepSeek assesses the claim, and
the application checks its citations against the submitted text. Open the exact
passage behind the result. In this example, administrative correspondence does
not establish physical mitigation. The assessment identifies the gap and leaves
the final decision to an authorized reviewer.

### 02:55–03:20 — Turn the gap into a next action

The reviewer inspects the source, records a determination and rationale, and
specifies the next evidence request. Save a versioned decision tied to this exact
dossier. This demonstration uses a configured local reviewer session; it is not
an independent expert evaluation. Later evidence creates a new review opportunity,
without rewriting the earlier decision.

### 03:20–03:43 — Explain when to revisit

Compare two retained historical snapshots. Inspect the original values before and
after, and see which selected investigations are affected. An additional archive
record may be historical backfill. The system explains why review is recommended;
it does not turn a dataset update into a claim that a new leak occurred.

### 03:43–04:19 — Verify beyond the file

Now anchor the reviewed decision on a local Ethereum development chain. The
EvidenceRegistry records its digest and revision. An independent verifier checks
the receipt, event, and expected commitment. Change the report and recalculate its
own checksum: it still fails against the recorded commitment. The original passes.
This demonstrates integrity and chronology, not proof that equipment was repaired.
The network shown here is Anvil, not a public Sepolia deployment.

### 04:19–04:50 — What the prototype delivers

We started with thousands of records and limited investigation capacity. We end
with an explainable plan, an evidence-linked next action, and a versioned decision
others can verify. The public preview demonstrates exploration and gated document
AI; reviewer and blockchain demonstrations run locally. Independent model evaluation
and human pilot studies remain next steps. MethaneResponse makes methane
investigations traceable, so teams can justify what they check, what they conclude,
and what they need to examine next.

## 6. Kontinuitas kasus dan pilihan lingkungan

### Source utama

Rekomendasi produksi **TKM_S_021**, karena source ini benar-benar muncul dalam
alokasi default dan bukti connected browser serta perubahan snapshot terdahulu.
Jangan menyatakan pengujian AI KAZ_S_159 sebagai hasil TKM_S_021.

Sebelum capture, replay rencana aktif dan pastikan source terpilih. Verifikasi
bahwa before/after source tersebut benar-benar berbeda pada pasangan snapshot.
Rekam assessment model baru dengan ID/klaim/scope yang sama; excerpt DEMO harus
dimiliki proyek dan tidak menyebut operator nyata seolah mengirim laporan.
Integrasi DeepSeek nyata yang sudah diperiksa memakai **KAZ_S_159**; take TKM
belum direkam. Jika take baru tidak tersedia, gunakan KAZ sebagai contoh AI
terpisah dengan judul transisi yang jelas, bukan splice hasil ke source utama.

KAZ_S_159 tetap kasus arsip v12 yang bernilai untuk menjelaskan ketidakpastian
tanggal. Jika dibahas, pertahankan kehati-hatian: katalog UNEP melaporkan mitigasi
di Uzen; kekurangan materi dalam bundle aplikasi tidak membantah laporan itu.
Jangan memasukkan uraian Uzen ke TKM_S_021.

### Lingkungan yang jujur

- **Publik Render:** globe historis dan model backend aktif; assessment bertoken.
  Tidak ada reviewer directory/signer publik; state sementara. Planner preview
  dibatasi scope publik, bukan demo alokasi penuh seluruh katalog.
- **Rekaman alur lengkap:** gunakan build aplikasi yang sama secara lokal, full
  snapshot, reviewer DEMO terotorisasi dan kontrak Anvil aktual yang masih hidup.
  Label `LOCAL PROTOTYPE · DEMO REVIEWER` dan `ANVIL · CHAIN 31337` pada adegan tepat.
- Siapkan sesi reviewer sebelum take; jangan menampilkan token, API key, file
  environment atau private key dalam rekaman, trace dan ekspor.
- Tidak ada deploy kontrak publik atau biaya testnet baru sebagai syarat film ini.
- Snapshot comparison harus cocok dengan keputusan yang sedang dibahas. Jika
  rilis itu sudah termasuk frozen dossier, tampilkan `already in decision snapshot`;
  jangan merekayasa badge `new` dengan memakai urutan yang salah. Untuk menunjukkan
  revisit setelah freeze, gunakan update yang memang belum termasuk keputusan,
  atau rekam rekomendasi sebelum freeze dengan keterangan urutan yang tepat.

## 7. Peran teknologi yang harus terlihat

| Komponen | Pekerjaan nyata | Bukti di layar | Klaim yang dihindari |
|---|---|---|---|
| MARS snapshot | Dasar rekaman historis | Source/plume ID, UTC, flux/SD, snapshot/provenance | Live monitoring atau hasil deteksi buatan aplikasi |
| Planner | Membandingkan alokasi dengan batas identik | Kapasitas, scope, strategy, reasons, queue/map membership | Rencana terbaik secara iklim atau probabilitas kebocoran |
| DeepSeek | Membantu menilai excerpt terhadap klaim | Request backend aktual, model, exact quote, bounded verdict | Akurasi benchmark, bukti repair atau model independen kedua |
| Deterministic validation | Memeriksa citation dan binding | Kutipan cocok dengan input, source/scope yang sama | Exact quote otomatis membuktikan semua inferensi benar |
| Reviewer | Bertanggung jawab atas keputusan versi tertentu | Inspeksi, alasan, request, frozen dossier/revision | Software reviewer DEMO merupakan pakar manusia |
| Change Watch | Menjelaskan perubahan arsip dan relevansinya | Snapshot IDs, original before/after, affected source | Semua record tambahan merupakan emisi baru |
| SHA-256 + registry | Membandingkan berkas dengan commitment terpisah | Digest, tx, receipt/event, original/altered verification | Blockchain membuktikan kebenaran fisik/identitas tanpa asumsi trust |

Pemeriksaan registry memerlukan issuer/registry/chain yang dipercaya. Penyerang
yang mengganti berkas **dan** supplied digest dapat melewati self-check lokal;
itulah alasan film harus memperlihatkan commitment dari sumber tepercaya.

## 8. Arahan visual dan suara

- Pertahankan navy/cyan aplikasi dan aksen terang v12. Diagram berfungsi menjelaskan
  sebab-akibat; jangan menambahkan model Bumi dekoratif di atas globe produk.
- Diagram awal: banyak record → kapasitas terbatas → pilihan → bukti → keputusan.
  Label setiap bentuk ketika disebut narator. Angka muncul bersama ucapan.
- Cursor terlihat, bergerak menuju satu target, berhenti sebentar, klik, tunggu
  loading aktual. Jangan animasikan klik yang tidak terjadi pada rekaman.
- Zoom hanya untuk alasan pemilihan, satuan/SD, passage, verdict, revision dan
  receipt. Kamera tenang saat typing/scroll; kembali ke konteks sebelum navigasi.
- Transisi presentasi → demo melalui satu bingkai aplikasi. Pergantian tab cukup
  cut yang jelas; bukan fly-through berulang. Snapshot before/after dapat memakai
  matching composition dengan label waktu/snapshot yang tetap terlihat.
- Tahan quote/verdict yang sudah muncul sebelum membahas artinya. Narator tidak
  menyebut hasil yang belum tampil. Tunggu provider aktual; trim jeda bila perlu
  dengan label waktu dipadatkan, jangan mengklaim latensi real-time dari edit.
- Narasi **pria** Inggris percakapan sesuai permintaan pengguna 21 Oktober,
  hangat, tenang dan artikulasi jelas. Pilih setelah audition pembuka dan hasil AI;
  naturalitas belum terverifikasi sebelum listening. Target sekitar 125–145 kata/menit pada bagian bicara,
  jeda pendek setelah hasil. Ukur hasil TTS/rekaman; jangan menjamin durasi dari
  hitungan kata saja. Musik instrumental rendah di bawah suara.
- Pisahkan label fakta historis, excerpt DEMO, reviewer DEMO dan integritas lokal
  pada adegan relevan. Hindari disclaimer kecil yang hanya dapat dibaca saat pause.

## 9. Penerimaan sebelum menyebut video final

1. Satu identitas source/claim/scope/dataset mengikuti seluruh investigasi utama.
2. Pemilihan plan dan perubahan 10→20 tampak; active selection tidak disamarkan.
3. Footage model baru menampilkan request aktual dan kutipan yang sesuai input.
4. Excerpt dan reviewer DEMO terbaca; tidak ada atribusi palsu ke operator/pakar.
5. Perubahan snapshot dijelaskan sesuai urutan dossier/freeze yang sebenarnya.
6. Kontrak/receipt/event aktual terhubung dengan file yang diverifikasi; changed
   and rehashed ditolak terhadap commitment yang benar, bukan hanya self-check.
7. Secret tidak terlihat pada frame/caption/trace; jangan mendaur ulang trace
   berkredensial sebagai artefak publik.
8. URL preview/repo dapat dibuka; baseline publik tidak diklaim alur reviewer penuh.
9. Video final 3–5 menit, subtitle sesuai suara dan hasil ekspor diperiksa baru.
10. Putar penuh untuk timing, suara, reading holds dan pemahaman; physical-phone
    dan human listening tetap belum verified jika memang belum dilakukan.

Tidak ada video baru dibuat, tidak ada pemanggilan model tambahan atau perubahan
deployment dilakukan hanya untuk menulis dokumen ini. Production gates di atas
adalah pekerjaan capture/edit/verification berikutnya, bukan hasil yang sudah lulus.

## 10. Sumber dan bukti

Sumber resmi dibaca 21 Oktober 2026:

- [UNEP Eye on Methane FAQ](https://methanedata.unep.org/frequently-asked-questions):
  atribusi pemanasan dan konteks platform.
- [UNEP — MARS](https://www.unep.org/en/what-we-do/energy/methane/methane-alert-and-response-system-mars):
  fungsi detection/notification/follow-up dan contoh mitigasi.
- [Aturan IEEE ClimateChain](https://ieee-climatechain-hack.devpost.com/rules):
  durasi 3–5 menit dan lima kriteria penilaian, tanpa bobot numerik resmi.

Bukti lokal/repository:

- [v12 storyboard](delivery-2026-10-19-final-v12/storyboard.md) dan
  [review batas audiovisual](delivery-2026-10-19-final-v12/review.md).
- [Connected Investigations](../evidence/connected-investigations-2026-10-20/README.md).
- [Investigation Operations](../evidence/investigation-operations-2026-10-20/README.md).
- [Snapshot Change Watch](../evidence/snapshot-change-watch-2026-10-20/README.md).
- [DeepSeek integration smoke](../evidence/deepseek-live-2026-10-21/README.md).
- [Preview dan browser AI aktual](../evidence/render-preview-2026-10-21/README.md).
