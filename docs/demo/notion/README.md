# MethaneResponse — paket presentasi Notion

**Cerita:** Evidence Before Claims · **Target demo:** 4:30 · **Disusun:** 16 Oktober 2026 WITA

Paket lokal berisi halaman presentasi, panduan operator, bukti klaim, Q&A dan screenshot aplikasi. Belum ada halaman di workspace Notion: integrasi Notion belum terhubung pada sesi ini. Materi utama berbahasa Inggris untuk audiens hackathon; catatan operator dan kondisi repo berbahasa Indonesia.

## Mulai dari sini

| Halaman | Pemakaian |
|---|---|
| [01 — Presentation](01-Presentation.md) | Halaman utama untuk audiens: masalah → kasus → dua klaim → export/verifikasi → langkah berikut |
| [02 — Presenter Runbook](02-Presenter-Runbook.md) | Naskah, anggaran waktu, klik, reset dan fallback |
| [03 — Claims and Q&A](03-Claims-and-QA.md) | Ledger bukti, batas klaim dan jawaban juri |
| [04 — Publisher Appendix](04-Publisher-Appendix.md) | Indicators untuk Q&A; di luar alur utama |
| [05 — Repository Brief](05-Repository-Brief.md) | Arsitektur, kondisi repo dan keputusan yang berlaku |

## Cara impor

1. Gunakan ZIP yang dibangun dari folder ini, beserta `assets/`; jangan impor Markdown tanpa gambar.
2. Di Notion desktop/web, buka **Settings → Import → Convert Zip to pages** dan pilih ZIP.
3. Jadikan `01-Presentation` halaman utama. Tempatkan runbook, ledger, lampiran dan brief sebagai halaman pendukung.
4. Aktifkan **Full width**, gunakan font default dan ukuran teks normal. Pertahankan satu kolom, divider antar bagian dan satu gagasan per bagian. Jangan menambahkan emoji atau kolom dekoratif ke alur utama.
5. Periksa seluruh gambar, tabel, navigasi antarhalaman dan keterbacaan pada layar presentasi. Jika gambar hilang, unggah ulang PNG dari `assets/` pada posisi yang sama.

Notion mendukung impor Markdown dan folder ZIP; format khusus serta navigasi mungkin perlu dirapikan. Petunjuk ini mengikuti [panduan impor resmi Notion](https://www.notion.com/help/import-data-into-notion), diperiksa 16 Oktober 2026. Impor dan tampilan akhirnya belum diuji di workspace Notion yang terautentikasi.

## Bukti capture — 16 Oktober 2026 WITA

- Baseline kode `a82e2eee99bb79327f859f304f2f5d5939f07041`, tanpa perubahan kode produk. Capture inti mulai 00:31 WITA; capture Summary terpisah mulai 00:36 WITA. Timestamp UTC tersimpan pada `capture-manifest.json`.
- Chromium headless **dengan sandbox**, viewport 1600 × 1000, web Vite dan API Bun/Hono lokal, state JSON sementara terisolasi. Request HTTP eksternal diblokir. AI, reviewer dan chain write dinonaktifkan; tidak ada transaksi.
- Alur yang diperiksa: KAZ_S_159 → tiga observasi → deteksi **Supported** → mitigasi **Insufficient Evidence** → export → digest bundle valid tanpa receipt → salinan tidak konsisten ditolak → Top 50 September → riwayat Algeria. Summary mengonfirmasi kedua metadata notifikasi/feedback **Yes**.
- Sembilan PNG dibuat dan diperiksa secara visual. Panel verifikasi diambil dengan screenshot elemen browser agar hasilnya terbaca. Gambar bukan mockup atau hasil rekonstruksi. [Capture Map Explorer](assets/01-historical-map.png) sengaja mempertahankan pemberitahuan tile fallback; halaman utama memakai Summary agar metadata pembuka terlihat jelas.
- Error halaman JavaScript: **0** pada kedua pass yang berhasil. Fallback tile tetap terlihat dan dijelaskan; ini bukan pengukuran GPU, jaringan publik, perangkat fisik atau build production.
- `bun --no-env-file scripts/verify-audit.ts docs/demo/notion/audit-report.json`: exit 0, `bundle_hash: VALID`, `chain_receipt: ABSENT`. `document_rights_metadata: NOT_RECORDED` sesuai audit rules tanpa isi dokumen. File laporan asli dan manifest disimpan di folder ini, di luar ZIP impor.
- Salinan perubahan ditolak dengan alasan **Audit summary fields do not match the hashed bundle.** Pemeriksaan berhenti sebelum membandingkan digest. Paket tidak mengklaim adegan tersebut mengisolasi kegagalan SHA-256.
- SHA-256, ukuran dan header PNG dicocokkan dengan manifest; tautan lokal Markdown, isi/CRC ZIP dan `git diff --check` diperiksa. Hasil serta hash ZIP ada di `package-verification.json` setelah proses packaging.

Capture awal sempat tertahan karena environment proxy induk dan pembatasan Unix socket Chromium. Pass yang berhasil memakai isolasi environment sesuai runner repo dan izin host untuk browser, dengan sandbox Chromium tetap aktif. Tidak ada perbaikan kode aplikasi yang dibutuhkan.

Tidak ada full test-suite atau build baru untuk perubahan dokumentasi ini. Pemeriksaan di atas membuktikan alur lokal dan aset yang dicatat; ini bukan publikasi Notion, rehearsal presenter terukur atau video final.

## Membuat ulang ZIP lokal

Jalankan dari root repository. Perintah ini membuat file baru di `/tmp`, menolak overwrite, dan tidak mengunggah apa pun. JSON manifest/report tetap menjadi bukti repo dan tidak dimasukkan sebagai halaman impor.

```python
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path("docs/demo/notion")
target = Path("/tmp/MethaneResponse-Notion-2026-10-16.zip")
files = sorted(root.glob("*.md")) + sorted((root / "assets").glob("*.png"))
with ZipFile(target, "x", compression=ZIP_DEFLATED) as package:
    for item in files:
        package.write(item, Path("MethaneResponse Demo") / item.relative_to(root))
with ZipFile(target) as package:
    assert package.testzip() is None
print(target)
```

## Status akhir yang masih memerlukan lingkungan luar

| Tahap | Status |
|---|---|
| Cerita, naskah, Q&A dan konteks repo | Tersusun; dua reviewer independen meninjau narasi/batas bukti |
| Alur dan screenshot lokal | Berhasil; 9 gambar, 0 error halaman pada pass berhasil, hasil mandiri verifier valid |
| Halaman Notion dan visual QA hasil impor | Menunggu integrasi/workspace Notion; belum dilakukan |
| Rehearsal presenter 4:30 | Naskah terjadwal; durasi aktual belum diukur |
| Video baru dan caption yang sesuai | Belum dibuat dari naskah ini; video/caption lama bukan hasil final paket ini |
| Eligibility dan jam submission | Konflik halaman resmi belum selesai; tidak ada konfirmasi panitia |
| Public access, deployment, transaksi dan submission | Tidak dilakukan oleh paket lokal ini |
| DeepThink eksternal | Tidak tersedia pada sesi ini; penelaahan dilakukan secara lokal dengan dua agen independen, bukan sesi ChatGPT Web |

Setelah Notion tersedia, perkiraan alokasi kerja adalah 20–40 menit untuk impor/penataan dan 60–120 menit untuk rehearsal, satu take bersih, caption serta review penuh. Ini perkiraan perencanaan, bukan waktu yang sudah diukur; take ulang dapat menambah waktu. Klarifikasi panitia dan penilaian eksternal tidak dapat dijanjikan durasinya.
