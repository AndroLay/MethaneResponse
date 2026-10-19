# Riwayat rekayasa

[Pusat dokumentasi](../README.md) · [Status aktif](../release/current-implementation-status.md)

Dokumen berikut mempertahankan kondisi ketika pekerjaan dilakukan. Snapshot, jumlah tes, path, PR/commit, estimasi dan asumsi layanan dapat berbeda dari implementasi aktif. Gunakan tanggal/revisi asal ketika mengutip hasilnya.

| Catatan | Tanggal/cakupan |
|---|---|
| [Checkpoint 15 Oktober](execution-checkpoint-2026-10-15.md) | CI, browser, data, performa dan status layanan pada checkpoint itu |
| [Checkpoint 14 Oktober](execution-checkpoint-2026-10-14.md) | Full local gates, database eksperimen, browser dan UI |
| [Master execution plan](master-execution-plan-2026-10-14.md) | Task, dependencies, acceptance criteria dan estimasi historis |
| [Next steps](next-steps.md) | Follow-up MVP terdahulu; bukan backlog aktif |
| [Delivery notes](delivery-notes.md) | Handoff dan checks source-package terdahulu |
| [Workflow verification 13 Oktober](workflow-verification-2026-10-13.md) | Browser/integrasi pada checkout saat itu |
| [Premium UI redesign](premium-ui-redesign-2026-10-13.md) | Keputusan visual/interaksi terdahulu |
| [Indeks rencana implementasi](../plans/README.md) | Increment 17 Oktober dan arsip rencana 12–15 Oktober |
| [Judge evidence matrix](../release/judge-evidence-matrix.md) · [score roadmap](../release/score-readiness-roadmap.md) | Target internal dan bukti penilaian pada revisi asal, bukan skor juri |

Arsip desain lain: [AI/blockchain awal](../architecture/ai-blockchain-implementation.md), [Postgres anchor recovery](../architecture/grounded-evidence-and-anchor-recovery.md), dan [optimasi performa](../development/performance-optimization.md). Riset pemilihan kandidat ada di [indeks riset](../research/README.md). Bukti run terbaru maupun lama ada di [indeks evidence](../evidence/README.md).

[ADR file lokal](../architecture/decisions/2026-10-15-local-prototype-no-database.md) menggantikan kebutuhan database pada rencana awal. Isi arsip tidak diubah untuk menyerupai hasil baru; perapian navigasi tidak memperbarui checksum/revisi test aslinya.

## Artefak sementara dalam arsip

Beberapa checkpoint menautkan hasil sesi di `/tmp`, yang tidak termasuk repository dan dapat sudah hilang. Pada checkpoint 14 Oktober, tiga tautan gambar mengarah ke `methane-final-ui-smoke-20261014.png` serta `landing-desktop-1280x800.png` / `landing-mobile-390x844.png` dalam direktori temporary visual review. Tautan itu dipertahankan sebagai catatan asal, bukan file yang disertakan. Screenshot yang benar-benar dilacak tersedia melalui [indeks evidence](../evidence/README.md); gambar versi lain tidak menggantikan bukti yang hilang.
