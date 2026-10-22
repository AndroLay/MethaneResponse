# UI sebelum produksi video — 21 Oktober 2026

**Status review awal:** review terbatas, tanpa perubahan frontend. Dua assessment terisolasi:
A menilai desain/source, B mencoba detector dan browser runtime. Tidak ada skor
penjurian, pilot pengguna atau sertifikasi aksesibilitas yang dihasilkan.

## Dasar dan cakupan

- Dashboard dan Document AI: capture publik 21 Oktober pada source `98b25ca`.
- Connected investigation desktop/mobile dan antrean plan: capture terdokumentasi
  20 Oktober. Reviewer A mencocokkan dengan source frontend saat ini; perubahan
  sesudah runtime `98b25ca` hanya dokumentasi, tidak mengubah frontend.
- Label historis/non-live, source-linked data dan batas mitigasi tetap dipertahankan.
- Konteks Impeccable tidak berhasil dimuat: domain `impeccable.style` diblokir pada
  sandbox. Tidak ada PRODUCT.md/DESIGN.md aktif untuk aplikasi; DESIGN.md yang
  ditemukan berada pada paket video arsip, bukan authority desain aplikasi.
- Satu percobaan detector berakhir exit 2 tanpa ringkasan findings yang dapat
  dibaca. Exit 2 tidak ditafsirkan sebagai zero findings atau kelulusan.
- Assessment B mencoba tiga route × desktop/mobile. Navigasi mendapat
  `net::ERR_EMPTY_RESPONSE`; tidak ada render, screenshot baru, pengukuran overflow
  atau pageerror yang sah dari percobaan tersebut. Browser milik reviewer ditutup.
  Kegagalan akses ini tidak cukup untuk menyimpulkan layout aplikasi rusak.
- GET terpisah melalui jaringan yang diizinkan mengembalikan `/dashboard` HTTP 200
  HTML; `/api/health` timeout pada satu percobaan 20 detik. Ini bukan inspeksi
  visual baru atau diagnosis penyebab timeout, dan tidak mengubah bukti run lama.

## Penilaian desain dari bukti yang tersedia

Fondasi visual layak dipertahankan: navy/teal konsisten, globe kuat sebagai
identitas, navigasi workspace jelas, dan label historis menjaga konteks data.
Tampilan belum disebut final terbaik karena hierarki tugas dan keterbacaan masih
memerlukan satu putaran penyempurnaan terarah sebelum capture video baru.

| Prioritas | Temuan | Penyempurnaan yang disarankan |
|---|---|---|
| P0 | Evidence Auditor panjang: stage navigation, analisis historis, AI form, consent, hasil dan casework bersaing | Utamakan klaim → evidence/quote → hasil → next action; gunakan pengungkapan detail bertahap untuk konteks dan metadata |
| P0 | Sejumlah teks pendukung dashboard sekitar 9–12 px; screenshot video yang diperkecil sulit dibaca | Perbesar label penting dan body operasional, jaga hirarki angka/label, cek viewport nyata dan hasil video tanpa bergantung pada zoom editorial |
| P1 | Pada capture mobile, search header dominan dan placeholder terpotong | Jadikan search ringkas/expandable pada layar sempit dan prioritaskan navigasi/context source |
| P1 | Event history dan queue mobile berisi metadata/kontrol berulang yang memanjangkan halaman | Ringkasan status/tanggal/aksi utama per item; ID/hash/detail teknis tersedia saat dibuka |

Font kecil pada catatan teknis tidak otomatis menjadi pelanggaran aksesibilitas.
Kontras, target sentuh, keyboard, screen reader dan 200% zoom perlu pemeriksaan
khusus sebelum menyebutnya lulus. Pengungkapan detail tidak boleh menghapus
provenance, uncertainty, permission, atau konteks ilmiah.

## Keputusan sebelum video

Pertahankan identitas visual dan globe yang ada. Prioritaskan permukaan yang
benar-benar direkam: planner, alasan pilihan, claim/quote/result, reviewer decision
dan verifier. Setelah perubahan disetujui/diimplementasikan, ambil satu putaran
capture desktop/mobile, perbaiki temuan sekaligus dan lakukan konfirmasi terbatas.
Runtime/error/empty/permission states tetap harus dinilai pada target yang bisa
diakses; screenshot lama tidak menggantikan verifikasi perubahan baru.

Questions skipped: review-only; rekomendasi terbatas sudah dapat diberikan tanpa
meminta preferensi desain atau izin perubahan tambahan.

## Implementasi sesudah persetujuan pengguna

Pengguna kemudian meminta semua temuan di atas diperbaiki. Form Document AI kini
mendahulukan klaim dan dokumen, lalu izin pemrosesan, hasil/kutipan, dan review
manusia. Konteks historis, penjelasan retensi lengkap dan metadata teknis tetap
tersedia melalui detail yang dapat dibuka. Label dan teks operasional diperbesar;
kolom form mobile menggunakan 16 px.

Search mobile kini mempunyai tombol buka/tutup, Escape, Ctrl/Cmd+K dan pengelolaan
fokus setelah pemilihan hasil. Antrean menonjolkan aksi Evidence, sedangkan Map
dan statistik tersedia dalam detail sumber. Riwayat permintaan bukti menampilkan
10 event per halaman; metadata lengkap tetap tersimpan dan dapat diperiksa.

Build produksi lokal, tes dan screenshot desktop/mobile direkam pada
[paket bukti UI polish](../evidence/ui-polish-2026-10-21/README.md).
Paket tersebut membedakan regresi menyeluruh, konfirmasi perubahan terakhir,
fixture AI mock, serta batas verifikasi. Tidak ada deployment atau push dalam
pekerjaan ini; capture baru bukan bukti perubahan pada Render publik.

## Referensi visual

- [Dashboard publik](../evidence/render-preview-2026-10-21/dashboard-ready-public.png).
- [Document AI publik](../evidence/render-preview-2026-10-21/deepseek-public.png).
- [Connected investigation mobile](../evidence/connected-investigations-2026-10-20/connected-investigation-mobile.png).
- [Active plan queue mobile](../evidence/investigation-operations-2026-10-20/active-plan-queue-mobile.png).
- Diagnostik browser lokal: `delivery-output/ui-review-2026-10-21-b/` (ignored).
