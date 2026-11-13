# Docker image

How to build and run the Costcompass app as a container image. Written for: developers and operators.

The image contains the built Nuxt server and nothing else. The database is not part of it, and neither are the migrations (see [What is not in the image](#what-is-not-in-the-image)).

## Build the image

```bash
docker build -t costcompass .
```

The `Dockerfile` in the project root has two stages.

| Stage | Base | What it does |
| --- | --- | --- |
| `build` | `node:26-alpine` | Installs pnpm, installs the dependencies, runs `pnpm build` (the `node-server` preset) |
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

Inside a container, `localhost` is the container itself. A Postgres that runs on your Mac and publishes a port (the local dev container `costcompass-db` publishes 5434) is reached through `host.docker.internal`. In Kubernetes the host will be the name of the Postgres Service *(planned, #46)*.

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
- No migrations and no way to run them. Applying them in a container is a separate step (#42). Until then, run `pnpm drizzle-kit migrate` from the project, as in [getting-started.md](getting-started.md#4-apply-the-migrations).
- No database. Start Postgres yourself.

## Verification status

Checked by building and running the image:

- The image builds (192 MB) and the container starts.
- `curl localhost:3000/api/purchases` works against the local Postgres container.
- The process runs as the `node` user, and the image holds no secrets.
- The server listens on `:::3000`, and `docker stop` ends it at once.
- Started without `NUXT_DATABASE_URL` and with a wrong one: the server starts, the UI shows "could not load data", the log shows the error.
- Local Node is 26.9.0, the image has 26.13.1 (same major version).

Not checked: Kubernetes, a build in CI, other CPU architectures.
