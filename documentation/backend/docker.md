# Docker image

How to build and run the Costcompass app as a container image. Written for: developers and operators.

The app image contains the built Nuxt server and nothing else. The database is not part of it, and neither are the migrations. Migrations run from a second image, see [Migrations](#migrations).

## Build the image

```bash
docker build -t costcompass .
```

The `Dockerfile` in the project root has three stages. `docker build .` builds the last one, `runtime`; the `migrate` stage is only built on request (see [Migrations](#migrations)).

| Stage | Base | What it does |
| --- | --- | --- |
| `build` | `node:26-alpine` | Installs pnpm, installs the dependencies, runs `pnpm build` (the `node-server` preset) |
| `migrate` | the `build` stage | Runs `pnpm drizzle-kit migrate`, see [Migrations](#migrations) |
| `runtime` | `node:26-alpine` | Copies only `/app/.output`, runs as the `node` user, starts the server |

Why two stages: the build needs `node_modules`, the sources and the build tools. The running server needs only `.output`, which already contains what it uses. Copying just that folder keeps the image small (192 MB) and leaves the sources out.

Details of the build stage:

- `node:26` images no longer ship Corepack, so the stage runs `npm install -g corepack && corepack enable`. pnpm then comes in the version named by `packageManager` in `package.json` (`pnpm@10.6.5`).
- `package.json` and `pnpm-lock.yaml` are copied before the source, and `pnpm install --frozen-lockfile` runs next. Docker caches that layer, so a change to the source does not reinstall the dependencies. `--frozen-lockfile` fails the build if the lock file does not match `package.json`.
- `.dockerignore` keeps `node_modules`, `.nuxt`, `.output`, `.git`, `.env`, `.env.*` and `mockups/` out of the build context.

## Run the container

```bash
docker run --rm -p 3000:3000 \
  -e NUXT_DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:5434/costcompass" \
  costcompass
```

Replace `USER` and `PASSWORD` with your database credentials. Open `http://localhost:3000`, or check the API:

```bash
curl http://localhost:3000/api/purchases
```

Inside a container, `localhost` is the container itself. A Postgres that runs on your Mac and publishes a port (the local dev container `costcompass-db` publishes 5434) is reached through `host.docker.internal`. In Kubernetes the host will be the name of the Postgres Service (`postgres`, see [kubernetes.md](kubernetes.md#app)).

## Configuration

The image has no `.env` file and no database URL. The server reads `NUXT_DATABASE_URL` when it starts; Nuxt maps it onto `runtimeConfig.databaseUrl`. The same image can therefore run locally and in a cluster. See [getting-started.md](getting-started.md#3-set-the-database-url) and [architecture.md](architecture.md).

If the variable is missing or wrong, the server still starts, but every API call fails: the UI shows "could not load data" and the container log shows the error.

## Port and shutdown

- The server listens on port 3000 on all interfaces. The `Dockerfile` declares `EXPOSE 3000`; you still publish the port with `-p`.
- `docker stop` ends the container immediately. The server handles `SIGTERM`.
- The process runs as the `node` user (uid 1000), not as root. `NODE_ENV` is `production`.

## What is not in the image

- No secrets: no `.env` file and no credentials. `docker history costcompass` shows only `NODE_ENV` and `NODE_VERSION` as environment values.
- No source code and no `node_modules`: only `/app/.output`.
- No migrations and no `drizzle-kit`. Apply them with the separate migration image, see [Migrations](#migrations).
- No database. Start Postgres yourself.

## Migrations

Apply the database migrations from a container, without a Node setup on your machine. Written for: developers and operators.

The `migrate` stage starts from the `build` stage and runs `pnpm drizzle-kit migrate`. The app image has no `drizzle-kit` and no migration files, so migrations get their own image.

Build it with a target:

```bash
docker build --target migrate -t costcompass-migrate .
```

Run it against your database. Only `NUXT_DATABASE_URL` is needed:

```bash
docker run --rm \
  -e NUXT_DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:PORT/DB" \
  costcompass-migrate
```

Replace `USER`, `PASSWORD`, `PORT` and `DB`. `host.docker.internal` reaches a Postgres on your Mac, as explained under [Run the container](#run-the-container).

`drizzle.config.ts` loads `.env` only if the file exists, so the container needs none. The local `pnpm drizzle-kit migrate` with a `.env` file works as before.

In Kubernetes, the Job `costcompass-migrate` runs this image. See [Migrations Job](kubernetes.md#migrations-job).

### Exit codes

| Code | Case |
| --- | --- |
| 0 | Migrations were applied |
| 0 | Nothing was pending |
| 1 | Host unreachable, wrong password, or `NUXT_DATABASE_URL` missing |

### Run it more than once

A second run changes nothing and exits with 0. Drizzle records applied migrations in the table `__drizzle_migrations`.

### What is in the migration image

It reuses the `build` stage, so it holds the sources, all dependencies including `drizzle-kit`, and `server/db/migrations`. It is much larger than the app image and runs as root, because the `build` stage sets no `USER`. Use it only for the migration run and do not deploy it as the app.

### Why a second target

The alternative was a script calling `migrate()` from `drizzle-orm` inside the app image. The runtime image contains only `.output`, so such a script would find no `drizzle-orm` or `pg` and would need its own bundling step. Reusing `drizzle-kit` costs a bigger image that is used only once per migration run. See [decisions.md](decisions.md).

### Checked and not checked

Checked by building and running, against a throwaway `postgres:17` container:

- On an empty database, the first run creates `purchases`, `recurring_costs` and `__drizzle_migrations` (exit 0). The second run changes nothing (exit 0).
- On a copy of the development data (5 recurring costs, 9 purchases), the row counts were identical after the migration (exit 0).
- The app image then started against the migrated empty database: `/api/ready` returns ok, `/api/purchases` returns `[]`, and creating a recurring cost works.
- Exit code 1 for an unreachable host, a wrong password and a missing `NUXT_DATABASE_URL`.

Not checked here (the Job is checked in [kubernetes.md](kubernetes.md#verification-status)): a migration with broken SQL that fails midway, two runs at the same time, other CPU architectures. The image is 813 MB in the Kubernetes node. Rollback (down migrations) is out of scope.

## Verification status

Checked by building and running the image:

- The image builds (192 MB) and the container starts.
- `curl localhost:3000/api/purchases` works against the local Postgres container.
- The process runs as the `node` user, and the image holds no secrets.
- The server listens on `:::3000`, and `docker stop` ends it at once.
- Started without `NUXT_DATABASE_URL` and with a wrong one: the server starts, the UI shows "could not load data", the log shows the error.
- Local Node is 26.9.0, the image has 26.13.1 (same major version).

Not checked: Kubernetes, a build in CI, other CPU architectures.
