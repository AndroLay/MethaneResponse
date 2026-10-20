# Integrasi Luna — menunggu konfigurasi provider

[Konfigurasi backend](configuration.md#document-ai-opsional) · [Protokol evaluasi](../testing/ai-benchmark-annotation.md)

Pengguna memilih model **Luna** dari lab yang disebut pengguna pada 20 Oktober
2026. Endpoint, identifier model, dokumentasi API dan kredensial akan disediakan
kemudian. Belum ada panggilan ke model itu dan belum ada bukti kompatibilitas atau
akurasi. Model ini tidak sama dengan agent pengembangan yang kebetulan bernama
Luna. Tidak ada model pengganti yang diunduh atau dijalankan.

## Kontrak backend yang tersedia

Implementasi saat ini memakai `POST {AI_BASE_URL}/chat/completions` dengan Bearer
authentication, `model`, `temperature: 0`, `response_format: {type: "json_object"}`
dan `messages`. Isi respons dibaca dari `choices[0].message.content`, sebagai JSON
berisi `verdict`, `reason`, dan `citations[{documentId, quote}]`.

**Jangan mengasumsikan bahwa provider Luna mendukung kontrak ini.** Setelah
dokumentasinya tersedia, cocokkan terlebih dahulu endpoint, autentikasi, structured
output, batas konteks, kebijakan penyimpanan data dan biaya. Bila kontraknya
berbeda, tambahkan adapter backend beserta tes; jangan mengubah model atau
membawa key ke frontend untuk melewati ketidakcocokan.

| Konfigurasi privat | Nilai yang diperlukan |
|---|---|
| `AI_BASE_URL` | URL HTTPS base API sesuai dokumentasi provider; tanpa embedded credential |
| `AI_MODEL` | Identifier model persis dari provider, bukan tebakan nama display |
| `AI_API_KEY` | Credential provider, disimpan privat di backend |
| `AI_REVIEW_TOKEN` | Token assessment terpisah, minimal 32 karakter |

Jangan mengisi nilai tersebut dengan placeholder aktif atau memasukkannya ke
`VITE_*`, Git, ZIP, screenshot maupun log. Baseline rules dan review manual tetap
dapat digunakan tanpa provider. Uji mock yang sudah ada membuktikan workflow
software, bukan keberhasilan integrasi Luna.

## Urutan penerimaan setelah akses tersedia

1. Pastikan hak pemrosesan excerpt dan consent; tentukan batas biaya/jumlah
   request sebelum menghubungi provider. Satu assessment dapat memakai dua
   panggilan karena pemeriksaan kedua.
2. Periksa respons schema, batas ukuran dan timeout menggunakan excerpt uji
   milik proyek yang diberi label DEMO. Catat identifier versi model aktual dan
   hasil; jangan menganggap smoke test sebagai benchmark akurasi.
3. Pastikan kutipan cocok persis dengan dokumen, kutipan palsu/tanpa kutipan
   menghasilkan abstention, dan hasil dua pemeriksaan yang tidak konsisten
   menghasilkan `insufficient_evidence`.
4. Uji review berwenang, revisi/ekspor dan verifier. AI tidak mengotorisasi
   anchoring atau membuktikan hasil fisik perbaikan.
5. Untuk klaim kualitas, gunakan benchmark held-out berizin dan adjudikasi
   independen, dibandingkan dengan rules pada input yang sama. Tool
   `scripts/run-ai-benchmark.ts` tetap meminta persetujuan panggilan provider;
   label manusia dan izin tidak boleh diisi oleh agent sebagai pengganti manusia.

Catat status secara terpisah: **configured → transport tested → grounding tested
→ independently evaluated**. Saat ini seluruh tahap live Luna masih pending.
