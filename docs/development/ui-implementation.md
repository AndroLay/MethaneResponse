# Implementasi UI dan workspace

[Pengembangan](README.md) · [Peta repository](../repository-map.md) · [Alur pengguna](../product/user-workflow.md)

**Panduan aktif — 17 Oktober 2026.** Halaman ini menjelaskan lokasi dan hubungan implementasi UI. Langkah penggunaan terperinci berada di panduan produk.

## Bootstrap, route dan pemuatan

[main.tsx](../../apps/web/src/main.tsx) memulai aplikasi. [App.tsx](../../apps/web/src/App.tsx) mengoordinasikan shell dashboard, sumber/mode/snapshot yang dipilih, route dan API. Landing di `/`; dashboard di `/dashboard` serta subroute workspaces.

| Route | Komponen/tanggung jawab |
|---|---|
| `/` | `LandingPage`: pengantar dan tautan manfaat ke workspace |
| `/dashboard` / `/dashboard/map` | `MapPanel`: MapLibre explorer, layers, selected source dan dialog |
| `/dashboard/indicators` | `MarsPublisherInsights`: publisher Top 50 dan respons negara |
| `/dashboard/cases` | `CasesWorkspace`: tabel, queue/status dan saved investigations |
| `/dashboard/audit` | `EvidenceAuditorWorkflow`: scope → observations → assessment → review/report |
| `/dashboard/documents` | Library referensi terikat source; link-only metadata tetap dibedakan |
| `/dashboard/reports` | Ekspor, brief dan `TransparencyPanel` |
| `/dashboard/blockchain` | Verification Center dan `ImportedAuditVerifier`; tidak menyediakan chain write publik |
| `/dashboard/operators` | `OperatorsWorkspace`: review metadata administratif |
| `/dashboard/settings` | `SettingsWorkspace`: preferensi browser |

Workspace berat dan overlays menggunakan lazy chunks serta loading fallback. MapPanel terpisah dari entry; Evidence Auditor juga dimuat sesuai kebutuhan. Detail budget aktif ditetapkan [check-web-bundle.ts](../../scripts/check-web-bundle.ts). Ukuran terukur ada di evidence bertanggal, bukan angka permanen di panduan ini.

## State dan pemiliknya

| State | Pemilik/lokasi | Ketentuan |
|---|---|---|
| Sumber, mode, snapshot dan route aktif | Shell/context App | Perubahan konteks harus menjaga guard dan tidak menerima respons lama ke investigasi baru |
| Claim dan scope | Auditor + shared schema | Event/periode/penerima membatasi coverage dan identity history |
| Reference coverage | `EvidenceCoveragePanel` + shared selector | Aturan sama dengan API; preview tidak otomatis menyimpan audit |
| Human editor/trust | `HumanAssessmentPanel`, `AssessmentTrustPanel` | Token di memori; inspection/retrieval/public consent tidak dipulihkan |
| Mutable investigation | `CaseWorkPanel`, `case-work.ts` | LocalStorage; work ID dan revision terpisah dari audit server |
| Shared investigation | Lazy `SharedCaseWorkPanel`, `shared-work-api.ts`, `team-session.ts` | Token di memori; pinned server queue, CAS/history, assignee/due date, explicit import, konflik tidak membuang draft |
| Recovery edit | `session-draft.ts`, hook per tab | Context-bound, dapat incomplete, tanpa token/consent sensitif |
| Saved audit/history | API + `AuditHistoryPanel` | Immutable server revisions; lock membersihkan private cache/seleksi/draft |
| Report/verifier | export helpers, imported verifier, transparency | JSON privat, Markdown brief dan public summary memiliki izin/objek hash berbeda |

History comparison hanya membandingkan revisi yang sesuai source/claim/mode dan memperlihatkan perubahan scope/dataset. Browser notes/status tidak termasuk immutable bundle dan tidak mengubah determination. Investigasi menunggu dataset yang diminta; record fallback DEMO tidak dapat diedit seolah source historis.

Sesi tim mempertahankan identity sepanjang navigasi SPA dan dibersihkan pada reload/disconnect. Cases memuat antrean server saat terhubung. Saat refresh dimulai atau gagal, data queue/history lama disembunyikan dan save dinonaktifkan; editor draft tetap mounted. Tidak ada realtime polling atau merge otomatis. Detail operasi ada di [runbook](shared-casework.md).

## Peta, imagery dan responsivitas

Lokasi-context imagery memakai shared remote tiles; tidak disimpan sebagai aset per kasus. Plume geometry dipin ke ID/source/tanggal/snapshot. Keduanya memiliki label makna terpisah. Lihat [peta](../architecture/real-map.md) dan [geometri](../architecture/mars-publisher-geometry.md).

Sidebar desktop dapat dipadatkan; pada ponsel memakai drawer sementara. Cases dan publisher tables mempunyai pagination/scroll regions; mobile viewport harus mempertahankan page width. Preferensi basemap, Earth quality, initial workspace dan sidebar disimpan di browser, bukan server. Credential provider/reviewer/RPC bukan bagian Settings.

## Pemeriksaan

Gunakan `bun run check`, suite web/API yang relevan, build/bundle dan [E2E](../testing/end-to-end.md) sesuai perubahan. [Evidence](../evidence/README.md) menyimpan tanggal, screenshot desktop/mobile, failures dan batasnya. Mock AI tidak mengukur model eksternal; mobile viewport tidak mengukur perangkat fisik.
