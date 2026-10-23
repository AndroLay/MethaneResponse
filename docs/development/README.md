# Development

[Documentation home](../README.md) · [Repository map](../repository-map.md)

## Getting started

1. [Local setup](local-setup.md): prerequisites, installation, running the app, example workflows, and troubleshooting.
2. [Configuration](configuration.md): API/web environment, reviewers, AI, storage, and receipts.
3. [Contribution guide](contributing.md): change locations, compatibility, checks, and documentation maintenance.
4. [Testing](../testing/README.md): command matrix and result limitations.
5. [Shared casework](shared-casework.md): team access, revision conflicts, browser import, locks, backup, and restore.
6. [Anchoring and recovery](blockchain-recovery.md): targets, intents, pending transactions, reconciliation, and independent verification.
7. [Publication corrections and withdrawal](publication-lifecycle.md): revision consent, status/history, offline checksums, migration, and rollback limits.
8. [DeepSeek V4.1 Flash 1017](deepseek-integration.md): private backend configuration, a live-provider smoke check, and benchmark limits.

## UI implementation

| Guide | Use |
|---|---|
| [UI/workspaces](ui-implementation.md) | Current relationship between routes, state, feature loading, and module ownership |
| [Landing page](landing-page.md) | Implementation notes for the product introduction and data binding; dated results remain tied to their source revisions |
| [Performance optimization](performance-optimization.md) | Archive of changes and measurements from 13–14 October; not a current build-size measurement |

For service boundaries and HTTP contracts, read the [architecture guide](../architecture/README.md). For data generation, use [provenance/rebuild](../../data/real/README.md) so inputs, outputs, licenses, and hashes remain governed by one reference.

- [Connected investigations](connected-investigations.md): evidence requests, frozen dossiers, decision receipts, verification, and recovery.
