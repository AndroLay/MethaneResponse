# MethaneResponse documentation

Documentation is grouped by purpose. Start with the root [README](../README.md) for the product summary and local quick start; use this index to find deeper guidance.

| Area | Start here | Contents |
|---|---|---|
| Product | [Product docs](product/README.md) | User journey, data meaning, and claim boundaries |
| Architecture | [Architecture docs](architecture/README.md) | Web/API/data/AI/blockchain boundaries and map implementation |
| Development | [Development docs](development/README.md) | UI, landing page, and performance implementation notes |
| Testing | [Testing docs](testing/README.md) | Browser/API gates, AI benchmark protocol, and local evidence |
| Release and competition | [Release docs](release/README.md) | Deployment state, IEEE requirements, demo and judging readiness |
| Research | [Research index](research/README.md) | Scientific references and earlier candidate research |
| Demo materials | [Demo index](demo/README.md) | Scripts and captions, with publication status |
| Verification records | [Evidence index](evidence/README.md) | Reproducible UAT, quality gates, screenshots, and performance captures |
| History | [History index](history/README.md) | Dated checkpoints, plans, and superseded implementation notes |

## Use the right source of truth

1. Current implementation and active plan status: [current implementation status](release/current-implementation-status.md).
2. Current product behavior: source code, tests, and the root [README](../README.md).
3. Active data release: [`data/real/README.md`](../data/real/README.md) and the bundled snapshot manifests.
4. Results from a specific test: its dated record under [evidence](evidence/README.md).
5. Current event requirements: the [official Devpost page](https://ieee-climatechain-hack.devpost.com/); unresolved conflicts are recorded in [event notes](release/event-requirements.md).
6. Earlier plans and measurements: [history](history/README.md); counts and results remain tied to their original data snapshot and revision.

## Prototype scope

The accepted scope uses versioned local MARS snapshot files and an atomic JSON file for local audit history. PostgreSQL, PostGIS, Supabase, migrations, and cloud database persistence are not part of the active prototype. The reasons, consequences, and MARS priorities are recorded in the [scope decision](architecture/decisions/2026-10-15-local-prototype-no-database.md). Earlier database and PostGIS test records remain historical evidence; they do not describe the current implementation.

The API can run as a hosted preview using file storage, but provider filesystems may be ephemeral. Do not treat a hosted preview as durable audit storage. See [release and deployment notes](release/deployment.md).
