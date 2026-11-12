# Get started

Goal: run Costcompass locally with a database, and run the tests. Written for: developers.

## Prerequisites

- Node.js (a version Nuxt 4 supports) and [pnpm](https://pnpm.io). The repository has a `pnpm-lock.yaml`.
- A PostgreSQL server you can reach. Any Postgres works; the project author uses a `postgres:17` container.

## 1. Install dependencies

```bash
pnpm install
```

The `postinstall` script runs `nuxt prepare`, which generates the types in `.nuxt/`.

## 2. Start PostgreSQL

Example with Docker (adjust name, password and port as you like):

```bash
docker run -d --name costcompass-db \
  -e POSTGRES_USER=costcompass -e POSTGRES_PASSWORD=costcompass -e POSTGRES_DB=costcompass \
  -p 5432:5432 postgres:17
```

*Not run for this page:* the container command is an example, the repository does not contain a Compose file.

## 3. Set the database URL

Create a file named `.env` in the project root (it is git-ignored):

```bash
NUXT_DATABASE_URL=postgres://costcompass:costcompass@localhost:5432/costcompass
```

One variable serves three readers:

- Nuxt maps `NUXT_DATABASE_URL` onto `runtimeConfig.databaseUrl` (declared in `nuxt.config.ts`), which `server/utils/db.ts` uses.
- `drizzle.config.ts` reads the same variable for migrations. It calls `process.loadEnvFile()`, so a `.env` file in the project root must exist.

If the variable is missing, the app starts but every API call fails when it needs the database.

## 4. Apply the migrations

```bash
pnpm drizzle-kit migrate
```

This creates the tables `recurring_costs` and `purchases`. More in [database.md](database.md).

## 5. Start the dev server

```bash
pnpm dev
```

Open `http://localhost:3000`. The dashboard shows "No costs yet" until you add a cost. To check the API directly:

```bash
curl http://localhost:3000/api/purchases
```

An empty database returns `[]`.

## 6. Run the tests

```bash
pnpm test          # watch mode
pnpm vitest run    # one run, then exit
```

At the time of writing, 30 test files with 844 tests pass. The tests need no database. See [testing.md](testing.md).

## Other scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Production build (`nuxt build`) |
| `pnpm preview` | Serve the production build locally |
| `pnpm generate` | Static generation (`nuxt generate`); not used by the app, which needs the API |

## Known issue

ESLint currently crashes because `typescript-eslint` does not support TypeScript 7. `CLAUDE.md` suggests `pnpm add -D typescript@6`. There is no `lint` script in `package.json`.

## Planned

A `Dockerfile` and Kubernetes manifests (`k8s/`) are planned (roadmap steps 7 and 8). They do not exist yet.

## Verification status

Checked: `pnpm vitest run` passes (844 tests), `pnpm nuxt dev` starts and the API answers. Not run: `pnpm drizzle-kit migrate` (the local database was already migrated; the command comes from `drizzle.config.ts` and the `drizzle-kit` CLI help) and the Docker command above.
