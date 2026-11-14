# Docker image

How to build and run the Costcompass app as a container image. Written for: developers and operators.

The app image contains the built Nuxt server and nothing else. The database is not part of it, and neither are the migrations. Migrations run from a second image, see [Migrations](#migrations). For the cluster, `./deploy.sh` builds both images, see [Deploy script](kubernetes.md#deploy-script). Old images are removed by hand, see [Old images pile up](#old-images-pile-up).

## Build the image

```bash
docker build -t costcompass .
```

The `Dockerfile` in the project root has three stages. `docker build .` builds the last one, `runtime`; the `migrate` stage is only built on request (see [Migrations](#migrations)).

| Stage | Base | What it does |
| --- | --- | --- |
| `build` | `node:26-alpine` | Installs pnpm, installs the dependencies, runs `pnpm build` (the `node-server` preset) |
| `migrate` | the `build` stage | Runs the script `server/db/migrate.ts`, see [Migrations](#migrations) |
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

The `migrate` stage starts from the `build` stage and runs the script `server/db/migrate.ts` with `node` (`CMD ["node", "server/db/migrate.ts"]`; Node 26 runs the TypeScript file directly, no extra tool). The script reads `NUXT_DATABASE_URL`, applies `server/db/migrations` with `migrate()` from `drizzle-orm`, and closes the connection. If a migration fails, it prints the error and exits with 1. The app image has no `drizzle-orm` and no migration files, so migrations get their own image.

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

The script reads the variable from the environment and needs no `.env` file. On success it prints nothing and exits with 0. The local `pnpm drizzle-kit migrate` with a `.env` file is unchanged: it still uses `drizzle.config.ts`, not the script.

In Kubernetes, the Job `costcompass-migrate` runs this image. `./deploy.sh` builds it and copies it into the cluster node; the manual copy is explained in [Get the images into the cluster](kubernetes.md#get-the-images-into-the-cluster). See [Migrations Job](kubernetes.md#migrations-job).

### Exit codes

| Code | Case |
| --- | --- |
| 0 | Migrations were applied |
| 0 | Nothing was pending |
| 1 | Database unreachable, or a migration failed. The error is in the log. |

### Run it more than once

A second run changes nothing and exits with 0. Drizzle records applied migrations in the table `drizzle.__drizzle_migrations`. The script uses the same table as `drizzle-kit migrate`, so a database migrated with `pnpm drizzle-kit migrate` is not migrated twice.

### What is in the migration image

It reuses the `build` stage, so it holds the sources, all dependencies including `drizzle-orm`, `pg` and `drizzle-kit`, and `server/db/migrations`. It is much larger than the app image and runs as root, because the `build` stage sets no `USER`. Use it only for the migration run and do not deploy it as the app.

### Why a second target

A script calling `migrate()` from `drizzle-orm` does not fit the app image: the runtime image contains only `.output`, so it would find no `drizzle-orm` or `pg`. The `migrate` stage reuses the `build` stage, which has both, so the script runs there. It replaced `drizzle-kit migrate` (#176) because that command prints no error text when a migration fails, so a failed Job log said nothing. The image stays large and is used only once per migration run. See [decisions.md](decisions.md).

### Checked and not checked

Checked for the script (#176), building and running against a throwaway Postgres container:

- Empty database: exit 0, both tables exist.
- Already migrated database: exit 0, nothing applied twice.
- Database migrated earlier with `pnpm drizzle-kit migrate` in the image: the script exits 0 and applies nothing twice (still 1 row in `drizzle.__drizzle_migrations`).
- Unreachable database: exit 1, the log shows a `DrizzleQueryError`.
- A failing migration (`type "category" already exists`): exit 1, the log shows the database error.
- `pnpm drizzle-kit migrate` locally with `.env` after the change: `migrations applied successfully`.

Checked before #176 with `drizzle-kit migrate` in the image, against a throwaway `postgres:17` container:

- On an empty database, the first run creates `purchases`, `recurring_costs` and `__drizzle_migrations` (exit 0). The second run changes nothing (exit 0).
- On a copy of the development data (5 recurring costs, 9 purchases), the row counts were identical after the migration (exit 0).
- The app image then started against the migrated empty database: `/api/ready` returns ok, `/api/purchases` returns `[]`, and creating a recurring cost works.

Not checked here (the Job is checked in [kubernetes.md](kubernetes.md#verification-status)): two runs at the same time, other CPU architectures. The image is 813 MB in the Kubernetes node. Rollback (down migrations) is out of scope.

## Old images pile up

Every `./deploy.sh` builds `costcompass:<tag>` (about 192 MB) and `costcompass-migrate:<tag>` (about 717 MB) with a new tag, and copies both into the cluster node. The node keeps its own image store, separate from the host's Docker. So every deploy leaves two more tags in two places. `deploy.sh` removes nothing. `./k8s/clean-images.sh` does, when you run it.

```bash
./k8s/clean-images.sh --dry-run   # list what would be removed
./k8s/clean-images.sh             # remove it
KEEP=5 ./k8s/clean-images.sh      # keep the newest 5 revisions instead of 3
```

Always run `--dry-run` first and read the list. The first version of the script had a bug that the dry run showed before anything was removed.

### What is kept

| Kept | How the script finds it |
| --- | --- |
| The image tags of the newest `KEEP` revisions of the Deployment `costcompass` (default 3) | The ReplicaSets of the Deployment, sorted by the annotation `deployment.kubernetes.io/revision`. These are exactly the revisions `kubectl rollout undo` can reach. |
| Every tag used by a container or init container of a pod in the namespace `costcompass` | `kubectl get pods`. An image that a running pod uses is never removed. |

Everything else is removed, for both image names, from two places:

1. The host's Docker: `docker rmi`.
2. The cluster node's image store: `docker exec desktop-control-plane ctr -n k8s.io images rm --sync`.

The script touches only the names `costcompass` and `costcompass-migrate`. It does not run `docker system prune`, and other apps' images stay. It refuses every kube context other than `docker-desktop` (other clusters: #188).

### Why not by date

The creation date of an image is not the deploy time: Docker reuses cached layers, so a fresh build can carry an old date. The Deployment's revisions are the reliable record of which versions were deployed.

### What this means for you

- `kubectl rollout undo` works for the last `KEEP` revisions. `kubectl rollout undo --to-revision=<older>` fails with an image pull error, because the image is gone and the node cannot pull it.
- The old manual builds `costcompass:0.1.0` and `costcompass:latest` are removed too, because no kept revision or pod uses them.
- Images of failed deploys (build ok, migration failed, so no new revision) are removed.
- Dangling layers and the build cache are not touched.
- Only the namespace `costcompass` is looked at, so a pod of another namespace that uses one of these images does not protect it.

### How much it frees

On the first real run it removed 48 tags (25 from the host, 23 from the node). `docker system df` reported about 0.6 GB less in total. Images share layers, so the gain is smaller than the number of tags suggests.

### Checked and not checked

Checked on Docker Desktop (#182):

- The dry run listed 25 host and 23 node removals, and none of the kept tags.
- The real run removed 48 tags and left exactly three tags for both images, on the host and in the node: the running one and two earlier deploys.
- Afterwards the app answered `/api/ready` with 200. `kubectl rollout undo` to the previous revision worked (its image was kept), and a second undo returned to the running version.
- A second run found nothing to remove.

Not checked: `KEEP` with a value other than 3, another cluster (the script refuses other contexts), a deploy and a clean-up at the same time, images used by pods of other namespaces.

## Verification status

Checked by building and running the image:

- The image builds (192 MB) and the container starts.
- `curl localhost:3000/api/purchases` works against the local Postgres container.
- The process runs as the `node` user, and the image holds no secrets.
- The server listens on `:::3000`, and `docker stop` ends it at once.
- Started without `NUXT_DATABASE_URL` and with a wrong one: the server starts, the UI shows "could not load data", the log shows the error.
- Local Node is 26.9.0, the image has 26.13.1 (same major version).

Not checked: Kubernetes, a build in CI, other CPU architectures.
