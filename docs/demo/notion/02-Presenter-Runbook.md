# Presenter runbook

**Target:** 4:30 · spoken English · catatan operator Bahasa Indonesia

Cerita utama memakai satu sumber, `KAZ_S_159`. Halaman Indicators disimpan untuk lampiran. Durasi di bawah adalah anggaran rehearsal, bukan durasi rekaman yang sudah diukur. Naskah ini belum direkam.

## Sebelum mulai

- Gunakan checkout baseline `a82e2eee99bb79327f859f304f2f5d5939f07041` atau ulangi pemeriksaan jika kode berubah.
- Jalankan web dan API lokal sesuai README repo. Gunakan `AUDIT_STORE_PATH` baru khusus demo agar riwayat pengguna tidak tercampur. Jangan menghapus file state yang sudah ada.
- Jangan mengaktifkan provider AI, reviewer token atau chain write untuk alur ini. Jangan menampilkan terminal berisi environment atau kredensial.
- Siapkan tab Map Explorer pada `/dashboard/map?sourceId=KAZ_S_159`, font browser 100%, viewport sekitar 1600 × 1000. Pastikan snapshot `unep-mars-675417694883` terlihat.
- Siapkan folder unduhan berisi laporan baru. Jangan gunakan laporan dari kasus atau snapshot berbeda.
- Buka `01-Presentation` sebagai halaman utama Notion; simpan runbook dan Q&A sebagai halaman pendukung. Uji tampilan gambar setelah impor.

## 00:00–00:25 — Masalah dan janji

**Tampilan:** judul dan pertanyaan pembuka pada presentasi.

**Say:**

“For this historical source, MARS records feedback as Yes. Does that confirm mitigation? A reviewer needs evidence for that stronger claim. MethaneResponse keeps the source, dated observations, claim and assessment together. We will follow one case and see where the supplied evidence stops.”

## 00:25–01:00 — Satu kasus nyata

**Klik:** Map Explorer → sumber `KAZ_S_159` → **Zoom to source on globe** → **View full case** → tab **Summary**. Tunjukkan snapshot, **MARS notification field: Yes** dan **MARS feedback field: Yes**. Jangan berlama-lama memutar globe.

**Say:**

“This is KAZ_S_159, an oil and gas source in Kazakhstan, from a versioned UNEP MARS archive. The source metadata records notification and feedback. These are administrative records. We preserve their meaning instead of translating them into confirmed mitigation. This is historical source-location context, not a live satellite image.”

## 01:00–01:35 — Observasi dan keterbatasannya

**Klik:** dari dialog yang sama, pilih tab **Observations**. Sorot tiga baris dan observasi terakhir.

**Say:**

“The archive links three observations to this source. The latest is from July eleventh, twenty twenty-six: an estimated four hundred and ninety-six kilograms per hour, with a reported standard deviation of two hundred and twenty-six. These are separate historical observations, not a continuous signal. A missing later record would not establish zero emissions.”

## 01:35–02:35 — Momen utama: bukti yang sama, kekuatan klaim berbeda

**Klik:** **Review evidence** → pilih **A methane source was detected** (`source_detected`) → **Run rules baseline**. Tunjukkan **Supported**. Lalu pilih **The detected methane release has been mitigated** (`mitigation_confirmed`) → **Run rules baseline**. Tunjukkan **Insufficient Evidence** dan alasannya.

**Say:**

“First, ask whether a methane source was detected. The deterministic baseline finds the required evidence type and returns supported for this claim and evidence bundle. Now keep the source and supplied evidence, but ask a stronger question: was mitigation confirmed? The result becomes insufficient evidence. That does not mean mitigation failed. An official report link is available, but the full report contents are not included in this assessment. The workflow shows where further evidence is needed instead of treating feedback, a report title or a missing observation as proof.”

## 02:35–03:15 — Ekspor dan verifikasi

**Klik:** navigasi utama **Reports** → **Download JSON report** → **Blockchain**. Halaman tujuan menampilkan Verification Center. Pilih berkas pada **Choose a JSON audit report**.

**Hasil yang harus tampak:** `Audit bundle SHA-256 digest matches.` dan `No blockchain receipt is included in this file.`

**Say:**

“We can export this assessment and open it in the local Verification Center. The canonical audit-bundle digest matches the saved record. The interface also makes the missing blockchain receipt explicit. This walkthrough uses local files. It does not submit a transaction or claim that a hash establishes methane mitigation.”

## 03:15–03:50 — Perubahan yang dapat dideteksi

**Klik:** pilih salinan laporan yang hanya mengubah `latestAudit.bundle.reason`, sementara ringkasan dan digest asli dipertahankan. Hasil: `Audit bundle verification failed.` dengan alasan `Audit summary fields do not match the hashed bundle.` Simpan laporan asli terpisah. Pemeriksaan ini berhenti pada ketidakcocokan ringkasan, sebelum perbandingan digest.

**Say:**

“Here is a copy with one sentence changed inside the bundle. Its summary was left unchanged, so the verifier rejects the inconsistent report before comparing digests. This is not an unforgeable signature: someone able to rewrite the record could also recompute an unsigned hash. Integrity, authorship and physical truth are different questions.”

## 03:50–04:20 — Manfaat dan langkah berikut

**Tampilan:** penutup presentasi. Tidak perlu tur dashboard tambahan.

**Say:**

“The working prototype connects historical observations, a claim-specific rules baseline and a portable review record. Its demonstrated benefit is visible reasoning and visible evidence gaps. Our next step is a task-based pilot with independent reviewers, comparing evidence interpretation and report verification against a manual workflow. Time savings, adoption and emissions reductions remain to be measured.”

## 04:20–04:30 — Kalimat penutup dan buffer

**Say:** “MethaneResponse: see what supports a claim, and what still needs evidence.”

Sisakan buffer untuk perpindahan tab. Targetkan 4:20–4:30 saat rehearsal; jika perpindahan UI membuat durasi melampaui target, hilangkan adegan salinan perubahan sesuai fallback di bawah. Jangan mempercepat ucapan untuk menambah fitur.

## Menyiapkan salinan perubahan dengan aman

Perintah berikut hanya membaca laporan pilihan dan membuat **berkas baru**. Jalankan sebelum perekaman. Ganti nama input dengan hasil unduhan demo; `x` menolak menimpa output yang sudah ada. Tidak ada request jaringan.

```python
import json
from pathlib import Path

original = Path("kaz_s_159-audit.json")
report = json.loads(original.read_text())
report["latestAudit"]["bundle"]["reason"] += " changed for integrity demo"
with Path("modified-audit-demo.json").open("x") as output:
    json.dump(report, output, indent=2)
```

## Fallback dan reset

| Kondisi | Tindakan presenter |
|---|---|
| Basemap tidak tampil | Jelaskan mode fallback; gunakan geometri sumber dan metadata yang tetap tersedia. Jangan menyebut gambar satelit langsung. |
| API/unduhan gagal | Pindah ke screenshot bertanggal pada halaman Notion, sebut sebagai capture lokal. Jangan menyebut adegan fallback sebagai demo live. |
| Waktu tersisa kurang dari 45 detik | Lewati adegan salinan perubahan, tampilkan verifikasi asli dan penutup. |
| Hasil klaim berbeda dari runbook | Hentikan interpretasi; periksa sumber, snapshot, jenis klaim dan state lokal. Jangan mengubah data untuk memaksakan hasil. |
| Perlu mengulang | Tutup proses milik demo, pilih path state baru lalu mulai lagi. Jangan menghapus state pengguna. |

## Rehearsal yang masih harus dilakukan

- Baca naskah sambil menjalankan klik; ukur durasi aktual dan jeda.
- Rekam satu take utuh, tonton video seluruhnya dan periksa teks kecil, pointer, audio serta sinkronisasi caption.
- Cocokkan video, caption, revision dan snapshot. Caption/video lama tidak otomatis cocok dengan naskah ini.
- Uji tautan video dan repo pada sesi tanpa login sebelum submission yang diotorisasi.
