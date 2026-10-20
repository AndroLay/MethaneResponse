# DeepSeek V4.1 Flash 1017 — integrasi backend

[Konfigurasi](configuration.md#document-ai-opsional) · [Protokol benchmark](../testing/ai-benchmark-annotation.md)

Pengguna memilih model ini pada 21 Oktober 2026 untuk menggantikan Luna.
Katalog API akun mengembalikan slug persis `deepseek-v4.1-flash-1017`.
[Halaman model resmi](https://platform.experientiallabs.ai/models/deepseek-v4.1-flash-1017)
dan [dokumentasi API](https://platform.experientiallabs.ai/docs/openai-compatibility)
mengonfirmasi base URL `https://api.experientiallabs.ai/v1` serta JSON output.
Tidak menggunakan model `uncensored`, alias latest atau fallback ke model lain.

## Konfigurasi privat

`data/state/experiential.env` diabaikan Git dan berisi konfigurasi backend saja:
`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_REVIEW_TOKEN`,
`AI_MAX_OUTPUT_TOKENS=2048`, `AI_REASONING_EFFORT=none`.
Key provider dan token akses assessment terpisah. File dibuat mode 0600.
Jangan menyalin isinya ke screenshot, laporan, ZIP atau `VITE_*`.

Jalankan API dari root dengan konfigurasi tersebut:

```bash
bun --env-file=./data/state/experiential.env run dev:api
```

UI Evidence Auditor tetap meminta token akses assessment. Token bukan API key
provider dan tidak memberi akses review manusia/anchoring. Pengguna mengambil
token dari konfigurasi privatnya sendiri; jangan mencetaknya dalam sesi agent.

## Pembuktian transport dan grounding

```bash
bun --env-file=./data/state/experiential.env scripts/probe-document-ai.ts \
  --approve-provider-calls --output=/tmp/deepseek-smoke-unique.json
```

Tool menjalankan tiga contoh DEMO milik proyek melalui route Hono yang sama,
real provider, dan throwaway in-memory store. Batas enam panggilan, tidak ada retry
otomatis, maksimum 2048 token output per panggilan pada profil ini. Respons dengan
`finish_reason` selain `stop` ditolak meskipun content parsial bisa dibaca sebagai
JSON; provider mock lama tanpa field tersebut tetap kompatibel. Hasil mencatat
model respons, token/cost bila dilaporkan provider, kutipan, verdict, hash bundle,
commit dan status perubahan source. Output baru dibuat mode 0600; tidak menimpa
hasil lama. Excerpt DEMO tidak disimpan ke riwayat investigasi pengguna.

Smoke ini membuktikan transport dan perilaku software pada contoh kecil, bukan
akurasi pada laporan nyata, benchmark independen, atau konfirmasi fisik mitigasi.
Benchmark held-out tetap memerlukan label/adjudikasi manusia dan izin dokumen.
Harga/kredit dan retention mengikuti akun provider; tidak menjanjikan AI gratis
atau zero-retention. Jangan mengirim dokumen privat tanpa consent dan izin.

## Render

Free preview menggunakan state sementara dan jalur baseline publik terbatas.
Provider key hanya boleh dipasang sebagai secret backend pada layanan khusus
MethaneResponse setelah biaya/akses disepakati. Jangan membuka assessment anonim
atau mengisi reviewer/signing secrets hanya demi membuat tombol terlihat aktif.
