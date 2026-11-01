# Backend and developer documentation

For developers and contributors. It covers the server, the database, the shared calculation core, setup and testing. For the user interface see [the frontend documentation](../frontend/index.md).

| Page | Kind | What it covers |
| --- | --- | --- |
| [getting-started.md](getting-started.md) | How-to | Install, start Postgres, migrate, run the app and the tests |
| [architecture.md](architecture.md) | Explanation | Layers, folder structure, import rules, configuration |
| [api.md](api.md) | Reference | Every API route with bodies, status codes and examples |
| [database.md](database.md) | Reference and how-to | Drizzle schema, migrations workflow |
| [calculation-core.md](calculation-core.md) | Reference | Every function in `shared/utils/costs.ts` and `dates.ts` |
| [testing.md](testing.md) | Explanation and how-to | How tests are organised, conventions, commands |
| [decisions.md](decisions.md) | Explanation | Decision log and open decisions |

The working agreement for this project is [`CLAUDE.md`](../../CLAUDE.md). These pages describe what exists in the code; where they disagree with `CLAUDE.md`, the code was checked and is described here.
