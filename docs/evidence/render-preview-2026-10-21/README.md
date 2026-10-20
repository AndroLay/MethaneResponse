# Render Free preview — 21 Oktober 2026

**Aplikasi:** https://methaneresponse-preview.onrender.com/dashboard

**Status yang diperiksa:** deployment `dep-dbbunbv4695c73eb958g` **live**, source
`98b25ca0af1e3e2df7ca9084c1569db1b6712a1e`, satu layanan
`methaneresponse-preview`, Andro's workspace, Singapore, plan **Free**,
auto-deploy branch **off**. Tidak ada database, disk berbayar atau signer.
Konfigurasi provider disimpan melalui environment backend privat.

[Ringkasan verifikasi](verification.json) ·
[Dashboard Render](https://dashboard.render.com/web/srv-dbbumltg1s2s73e8cct0)

## Bukti pada target publik

- `/api/health` HTTP 200, casebook tersedia dan single-writer launcher `flock`
  berjalan. Preview secara eksplisit berstatus `auditState: ephemeral`.
- `/dashboard` dan Evidence Auditor dibuka pada Chromium 156 aktual. Setelah
  basemap selesai dimuat, globe menampilkan **4.218 sumber** dari snapshot
  **30.414 plume records**, canvas tersedia dan tidak ada overflow horizontal
  pada viewport desktop 1440 px. Ini bukan pengukuran FPS atau HP fisik.
- `/api/intelligence/status`: document model aktif, mode
  `server-side-document-assessment`.
- Melalui formulir browser: satu excerpt DEMO milik proyek → provider nyata →
  HTTP 201, `insufficient_evidence`, satu kutipan exact, model
  `deepseek-v4.1-flash-1017`, hash/envelope bundle valid; sekitar **3.248 ms**
  untuk assessment dan respons UI pada satu percobaan.
- Assessment tanpa token: HTTP 401. Read laporan privat tanpa otorisasi: HTTP 404.
- Pada deployment terakhir, token + body tidak valid menghasilkan HTTP 400
  sebelum model dipanggil; konfigurasi benar-benar tersedia setelah rollout.
- Tidak ada `pageerror` pada perjalanan browser tersebut. Ini bukan audit
  seluruh console, cakupan semua layer eksternal atau jaminan bebas bug.

Screenshot aktual tersedia: [dashboard/globe selesai dimuat](dashboard-ready-public.png)
dan [assessment DeepSeek DEMO](deepseek-public.png). SHA-256 dicatat pada ringkasan.
Runner dan detail lokal ada di `delivery-output/render-2026-10-21/`.
Token sesi dikosongkan sebelum screenshot assessment; trace berkredensial tidak
direkam. Dokumen DEMO tidak dipublikasikan sebagai bukti mitigasi nyata.

## Operasi dan batas

Ini preview yang dibatasi, bukan hosting workspace privat lengkap. Review manusia,
publikasi laporan privat, signing dan chain write **tidak diaktifkan**. Jalur
baseline anonim hanya untuk tiga curated sources; perencanaan preview mengikuti
scope publik tersebut. Peta memakai snapshot historis yang dibundel.

File JSON `/tmp` dapat hilang saat tidur/restart/redeploy. Field health
`storage.persistent: true` menyatakan backend file, bukan jaminan penyimpanan
durabel Render; gunakan `preview.auditState` dan banner UI untuk konteks hosting.
Unduh laporan yang perlu dipertahankan. Jangan mengunggah dokumen rahasia.

Layanan dibuat lewat MCP dengan health check platform TCP default; tool create
tidak menyediakan parameter HTTP health check. `/api/health` diperiksa langsung.
`render.yaml` tetap menyediakan HTTP check untuk deployment Blueprint berikutnya.
Mengubah environment lewat konektor dapat menjadwalkan deploy meskipun auto-deploy
branch mati; periksa `list_deploys` sebelum memanggil trigger tambahan.

Pengguna memberi persetujuan eksplisit pembuatan Free setelah diberi tahu bahwa
kontrol billing workspace tidak dapat dibaca. Plan Free telah dikonfirmasi pada
service; **bukan jaminan seluruh pemakaian workspace Rp0**. API AI memakai kredit/
biaya provider terpisah. Detail [batas Render Free](https://render.com/docs/free).

Rollback: suspend hanya layanan ini atau deploy ulang revisi kode yang disetujui;
tidak mengubah layanan Evidrilo, plan workspace atau billing. Tidak ada Sepolia
atau dana blockchain yang digunakan. Pilot manusia, HP fisik dan benchmark
independen provider tetap belum diselesaikan.

## Revisi source dan dokumentasi

Runtime yang diverifikasi adalah `98b25ca`; pembaruan bukti/dokumentasi sesudahnya
tidak mengubah runtime karena auto-deploy branch mati. Tidak diperlukan deploy
tambahan untuk menerbitkan catatan ini.

## CI pada source runtime

[Run 39508503751](https://github.com/AndroLay/MethaneResponse/actions/runs/39508503751)
pada `98b25ca`: job kontrak dan data pipeline lulus; job JavaScript masih berjalan saat catatan ini dibuat. Tidak ada klaim full CI hijau sebelum run selesai. Status dan waktu pengamatan dicatat dalam `verification.json`.
