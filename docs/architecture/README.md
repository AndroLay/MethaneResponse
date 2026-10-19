# Arsitektur

[Pusat dokumentasi](../README.md) · [Peta repository](../repository-map.md)

## Desain aktif

| Panduan | Isi |
|---|---|
| [Arsitektur sistem](overview.md) | Komponen, tiga jalur penilaian, storage, akses dan keputusan utama |
| [Aliran data dan audit](data-flow.md) | Arsip → snapshot → investigasi → audit → ekspor; lapisan hash dan privasi |
| [Referensi API](api-reference.md) | Route, input, capability, pagination dan failure responses |
| [Keputusan tanpa database](decisions/2026-10-15-local-prototype-no-database.md) | ADR accepted: snapshot/file lokal dan batas proses tunggal |
| [Shared casework satu writer](decisions/2026-10-17-shared-casework-single-writer.md) | ADR P1: state tim privat, CAS/history, lock proses dan pemulihan lokal |
| [Lifecycle publikasi](decisions/2026-10-18-publication-lifecycle.md) | ADR P3: consent immutable, koreksi/penarikan, envelope versi 2 dan batas migrasi/rollback |
| [Peta historis MARS](real-map.md) | Progressive loading, layer, import browser dan fallback |
| [Earth rendering](earth-rendering.md) | Catatan teknis rendering dan riwayat 12–13 Oktober; ukuran/hasil mengikuti revisi asal |
| [Geometri penerbit](mars-publisher-geometry.md) | Matching, provenance, integritas dan batas geometri MARS |
| [Publisher indicators](../../data/real/mars_publisher_archives/README.md) | Arsip Top 50/respons negara, manifest dan rebuild |

## Catatan desain historis

| Dokumen | Status |
|---|---|
| [AI dan blockchain, 12 Oktober](ai-blockchain-implementation.md) | Snapshot desain awal; jumlah data, reviewer dan beberapa asumsi telah berubah |
| [Grounded evidence dan anchor recovery](grounded-evidence-and-anchor-recovery.md) | Desain Postgres/anchor-intent terdahulu; adapter/migrasi telah dihapus, bukan instruksi operasi aktif |

Gunakan overview aktif untuk memahami sistem saat ini. Database setup dan transactional anchor recovery pada arsip tidak menjadi prasyarat menjalankan prototype. Arti field/batas ilmiah dijelaskan di [data dan claims](../product/data-and-claims.md); current capability ada di [status implementasi](../release/current-implementation-status.md).

Keputusan aktif P2: [intent durabel satu writer](decisions/2026-10-17-durable-anchor-intents.md), dengan [runbook pemulihan](../development/blockchain-recovery.md). Bukti lokal dibedakan dari transaksi Sepolia publik.
