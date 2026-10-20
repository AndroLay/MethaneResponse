# Review implementasi dan perbaikan

Cakupan: dossier, permission boundary, keputusan beku, shared single-writer state, verifier dan UI investigasi. Ini review software lokal, bukan review pakar metana, identitas reviewer atau pilot manusia. Perubahan pengguna dan evidence terdahulu dipertahankan.

| Temuan | Perbaikan | Regresi |
|---|---|---|
| Link rencana dihapus pada revisi terbaru, tetapi masih ada pada riwayat yang diekspor | Authority untuk rencana diperiksa terhadap seluruh riwayat | `investigation-decision-api.test.ts`, historical plan authority |
| Authority berubah selama pemuatan perbandingan snapshot | Pemeriksaan authority ulang setelah await terakhir, sebelum respons privat/digest header | Tes yang sama, revocation during transition load |
| Parsing dapat menormalisasi whitespace pada payload beku sehingga perubahan file tampak tidak berubah | Bandingkan canonical raw dengan parsed; verifikasi setiap digest sebelum cache state | `investigation-decision-store.test.ts`, normalization/payload/unknown-field tamper |
| Reconcile terminal reverted mencoba memeriksa chain kembali | Outcome terminal dikembalikan idempotent; tidak broadcast/inspect lagi | `investigation-decision-api.test.ts`, terminal reverted reconciliation |
| Review baru atas respons lama belum memicu revisit | `response_review_changed` dipisahkan dari `new_authorized_response` | `investigation-revisit.test.ts` |
| Validator metadata frontend mengimpor dependensi yang tidak dimiliki web | Gunakan subpath shared yang mempunyai Zod; tanpa dependency/lockfile baru | `investigation-decision-ui.test.ts`, typecheck dan build |
| Selector tes “Due date” cocok juga dengan “Request due date” baru | Exact accessible label untuk tenggat work item; assertion perilaku tetap | Full private/team browser phase |
| Tes tim menganggap direktori hanya berisi satu investigasi, padahal workflow sebelumnya kini menyimpan investigasi tambahan | Periksa keberadaan sumber target dan bahwa semua baris memenuhi status; bedakan filter direktori dari assignment pada selector shared work. Seluruh konflik/history assertions dipertahankan | Full private/team browser phase |

## Pemeriksaan kompatibilitas

- EvidenceRegistry dan `registryCaseId` audit lama dipertahankan. Keputusan memakai key berbeda melalui `registryInvestigationId`.
- File state legacy, envelope 1/2 dan audit bundle 2/3/4 tetap dibaca. Envelope 3 diperlukan setelah keputusan pertama; rollback writer lama bukan operasi yang kompatibel tanpa backup sebelum migrasi.
- Intent baru dan audit lama menggunakan pemeriksaan pending/issuer/nonce bersama. Pengujian Anvil menguji blocking kedua arah, lost acknowledgement, reopen, reconciliation, historical verification serta tamper dengan checksum baru.
- Casework claim/scope tidak berubah dalam satu work ID. Evidence events append-only; actor/waktu berasal dari revisi server. Scope atau klaim berbeda memerlukan pekerjaan baru.
- Respons baru, review respons, kriteria/assessment berubah dan record snapshot yang relevan menghasilkan alasan terpisah. Catatan kerja biasa tidak mengubah determination. Report yang sudah termasuk snapshot keputusan diberi label sebagai konteks historis yang sudah tercakup.

## Risiko yang tetap ada

Satu writer/file privat, tidak multi-instance atau encrypted storage. Deklarasi hak/hash respons bukan autentikasi berkas. Pemeriksaan digest memerlukan commitment yang diperoleh secara tepercaya; pemegang file dapat menghitung checksum baru. Blockchain menambahkan pemeriksaan commitment/urutan, bukan kebenaran fisik. Reviewer DEMO software tidak menunjukkan manfaat pengguna atau penilaian pakar.

Lihat `checks.json` untuk hasil perintah yang benar-benar dicatat dan `artifact-manifest.json` untuk integritas paket ini. Manifest bukan tanda tangan pihak independen.
