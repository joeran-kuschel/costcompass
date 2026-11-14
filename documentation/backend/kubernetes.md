# Kubernetes manifests

What is in `k8s/`, how to create the Secret and how to apply the manifests. Written for: developers and operators, on the local Docker Desktop cluster (context `docker-desktop`).

The manifests are plain YAML files applied with `kubectl apply -f`. There is no Kustomize or Helm (decision #43, see [decisions.md](decisions.md)). `k8s/` holds the namespace, the configuration, the credentials, Postgres, the migrations Job and the app.

## What is in `k8s/`

| File | Object | Committed | What it holds |
| --- | --- | --- | --- |
| `namespace.yaml` | Namespace `costcompass` | Yes | The namespace for everything of the app |
| `configmap.yaml` | ConfigMap `costcompass-config` | Yes | `NODE_ENV=production` and `NITRO_PORT="3000"` |
| `postgres.yaml` | Service `postgres` and StatefulSet `postgres` | Yes | The database, see [Postgres](#postgres) |
| `migrate-job.yaml` | Job `costcompass-migrate` | Yes | The database migrations, see [Migrations Job](#migrations-job) |
| `app.yaml` | Service `costcompass` and Deployment `costcompass` | Yes | The app, see [App](#app) |
| `secret.yaml.example` | none (template) | Yes | Template of the Secret `costcompass-db` with `change-me` values |
| `secret.yaml` | Secret `costcompass-db`, type Opaque | No, listed in `.gitignore` | Your real credentials |

All ConfigMap values are strings, so the port is written in quotes.

### Keys in the Secret

| Key | Read by |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | The Postgres pod (`postgres.yaml`, #45) |
| `NUXT_DATABASE_URL` | The app (`app.yaml`, #46) and the migrations Job (`migrate-job.yaml`, #47) |

The app reads `NUXT_DATABASE_URL` as its `runtimeConfig` override (see [architecture.md](architecture.md)).

### Why the example is called `secret.yaml.example`

A folder-wide `kubectl apply -f k8s/` reads only `.yaml`, `.yml` and `.json` files. With the name `secret.example.yaml`, both files defined the same Secret, and the example (applied first) could be applied with `change-me` values. The dry run listed the Secret twice. With the current name it lists three objects.

## Create the Secret

1. Copy the template. The copy is ignored by git.

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

2. Generate a password without special characters:

   ```bash
   openssl rand -hex 16
   ```

3. In `k8s/secret.yaml`, replace every `change-me` with the password. It appears twice: in `POSTGRES_PASSWORD` and inside `NUXT_DATABASE_URL`. Both must be identical. If you pick a password with special characters, percent-encode it inside the URL.

4. Keep user and database name in step. `POSTGRES_USER` and `POSTGRES_DB` must match the user and the database name in the URL, which has this form:

   ```text
   postgresql://USER:PASSWORD@postgres:5432/DB
   ```

   - Host `postgres` is the name of the Postgres Service in `k8s/postgres.yaml`.
   - Port 5432 is the port inside the cluster. It is not 5434, which is only the published port of the local dev container (see [getting-started.md](getting-started.md)).

Never commit `k8s/secret.yaml`. Do not paste its content into issues, pull requests or chats.

## Apply and check

The namespace must exist first, because the other objects name it. The Secret `k8s/secret.yaml` must exist before the apply (see above); without it the Postgres pod, the Job and the app pod cannot start. Both images must be in the cluster node (see [Get the images into the cluster](#get-the-images-into-the-cluster)). The whole stack, in order, is in [Apply the whole stack](#apply-the-whole-stack).

Do not apply the whole folder with `kubectl apply -f k8s/`. It would apply the Job and the app at the same time, so the app could start before the migrations are done.

1. Apply the namespace, the configuration and Postgres:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml
   kubectl apply -f k8s/postgres.yaml
   ```

2. Check the result:

   ```bash
   kubectl get configmap,secret -n costcompass
   ```

   Expected: `configmap/costcompass-config` with DATA 2, `configmap/kube-root-ca.crt` (added by Kubernetes itself) and `secret/costcompass-db` of type Opaque with DATA 4.

3. Check Postgres:

   ```bash
   kubectl get pods,pvc -n costcompass
   ```

   Expected: pod `postgres-0` is `1/1 Running` (it took 13 seconds here) and the PVC `data-postgres-0` is `Bound`.

Applying again is safe: unchanged objects report "unchanged", changed ones are updated. To preview a file without changing the cluster, add `--dry-run=client`. The exception is the Job, see [Run the migrations again](#run-the-migrations-again).

If the Secret is missing from the output, check that `k8s/secret.yaml` exists; the example is not applied by design.

## Postgres

`k8s/postgres.yaml` holds two objects.

| Object | What it does |
| --- | --- |
| Service `postgres` | Type ClusterIP, port 5432, selects pods with `app: postgres`. Its name is the host in `NUXT_DATABASE_URL`. |
| StatefulSet `postgres` | One replica of the image `postgres:17`, the same major version as local development. |

Settings of the StatefulSet:

| Setting | Value |
| --- | --- |
| Credentials | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from the Secret `costcompass-db`, each through `secretKeyRef`. `envFrom` is not used, because it would also hand `NUXT_DATABASE_URL` to Postgres. |
| Volume | `volumeClaimTemplates` entry `data`: ReadWriteOnce, 1Gi, mounted at `/var/lib/postgresql/data`. The claim is named `data-postgres-0`. |
| `PGDATA` | `/var/lib/postgresql/data/pgdata`. The subdirectory avoids the `lost+found` problem on some volumes. |
| StorageClass | The cluster default `standard` (provisioner `rancher.io/local-path`, reclaim policy Delete, binding `WaitForFirstConsumer`). `hostpath` also exists. |
| Readiness probe | `pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`, run through `sh -c`. |
| Resources | Requests: CPU 100m, memory 256Mi. Limit: memory 512Mi. No CPU limit. |

### Connect for local development

Forward a local port to the Service:

```bash
kubectl port-forward -n costcompass svc/postgres 5435:5432
```

The left port (5435) is free to choose; pick one that is unused on your machine. The right port (5432) is the port inside the cluster. The command keeps running; use another terminal for the next steps.

The cluster database is separate from the local dev container: own volume, own credentials, and it starts empty. Your local data does not move over. To copy it you would need a `pg_dump` and a restore.

### Run the migrations from the project

An empty cluster database has no tables. The cluster normally migrates through the [Migrations Job](#migrations-job). To migrate from your machine instead, for example to try a migration, use the port-forward. Replace `USER`, `PASSWORD` and the database name with the values from your `k8s/secret.yaml`:

```bash
NUXT_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5435/costcompass" pnpm drizzle-kit migrate
```

Keep the variable on the command line. A variable that is already set wins over `.env`, because `process.loadEnvFile()` does not override existing variables. Without it, the command would migrate the local dev database.

Expected: `migrations applied successfully`. The tables `purchases` and `recurring_costs` and the table `drizzle.__drizzle_migrations` exist afterwards.

### Things to know

- **Credentials are read once.** Postgres reads `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` only when it initialises an empty data directory. Changing the Secret later does not change the password of an existing database. To start over, delete the volume. This destroys the data:

  ```bash
  kubectl delete statefulset postgres -n costcompass
  kubectl delete pvc data-postgres-0 -n costcompass
  kubectl apply -f k8s/postgres.yaml
  ```

  The new database is empty, so run the migrations again. Scaling the StatefulSet to 0 instead of deleting it also works as the first step. The commands above were not run.
- **The reclaim policy is Delete.** Deleting the PVC or the namespace deletes the data. `kubectl delete pod postgres-0 -n costcompass` keeps it; the new pod finds the same volume. Deleting the StatefulSet keeps the PVC too, by the documented Kubernetes default (unverified here).
- **One replica only.** There are no backups, no replication and no major-version upgrades. These are out of scope.

## Migrations Job

`k8s/migrate-job.yaml` holds one Job, `costcompass-migrate`. It applies the database migrations before the app starts. It runs the `migrate` target of the Dockerfile (see [docker.md](docker.md#migrations)), which runs `pnpm drizzle-kit migrate`.

| Setting | Value |
| --- | --- |
| Image | `costcompass-migrate:0.1.0`, `imagePullPolicy: IfNotPresent` |
| Credentials | `NUXT_DATABASE_URL` through `secretKeyRef` from the Secret `costcompass-db`. Only this key. |
| Init container | `wait-for-postgres` (image `postgres:17`, already in the cluster) loops `pg_isready -h postgres -p 5432` until Postgres accepts connections. Waiting does not use up the retries. |
| `restartPolicy` | `Never`. Every attempt is its own pod with its own log. |
| `backoffLimit` | 3: up to 4 pods, then the Job is `Failed`. |
| `ttlSecondsAfterFinished` | Not set. A finished Job stays, so you can read its log. |

Why a Job and not an init container on the app pod: the migrations run once per release, not at every app start (see [decisions.md](decisions.md)).

The image is large (813 MB in the node) and runs as root, because no `securityContext` is set (see [docker.md](docker.md#what-is-in-the-migration-image)). The Job uses the database owner user; a restricted app user is #169.

### Run the migrations

Both images must be in the node (see [Get the images into the cluster](#get-the-images-into-the-cluster)) and Postgres must be running.

```bash
kubectl apply -f k8s/migrate-job.yaml
kubectl wait --for=condition=complete job/costcompass-migrate -n costcompass --timeout=120s
```

Expected: `job.batch/costcompass-migrate condition met`. Read the log:

```bash
kubectl logs job/costcompass-migrate -n costcompass
```

Expected: the log ends with `migrations applied successfully`. On a database that is already migrated, the Job also succeeds (about 3 s here) and changes nothing.

### Run the migrations again

After you add a migration, delete the finished Job and apply it again:

```bash
kubectl delete job costcompass-migrate -n costcompass --ignore-not-found
kubectl apply -f k8s/migrate-job.yaml
```

Without the delete, nothing runs. Applying an unchanged finished Job only prints `unchanged`, and a changed pod template is rejected as immutable. Rebuild and load the migration image first, so it holds the new migration files.

### When the Job fails

```bash
kubectl get pods -n costcompass
kubectl describe job costcompass-migrate -n costcompass
```

A failed Job shows the reason `BackoffLimitExceeded` after 4 pods (78 s in the test). Each pod exited with code 1 and keeps its log.

Known limit: the log of a failed pod shows only `applying migrations...`. `drizzle-kit migrate` prints no error text. The reason is in the Postgres log:

```bash
kubectl logs postgres-0 -n costcompass | grep ERROR
```

Examples: `relation "purchases" already exists` (a table exists but is not recorded as migrated) and `password authentication failed` (wrong credentials, same failure pattern). Issue #176 replaces `drizzle-kit migrate` in the image with a small script that prints the error.

| Symptom | Cause and fix |
| --- | --- |
| Pod `Init:0/1` | Postgres is not ready yet. The init container keeps waiting. Check `postgres-0`. |
| `ErrImagePull`, `ImagePullBackOff` | The node does not have `costcompass-migrate:0.1.0`. Load it. |
| Job `Failed`, log shows only `applying migrations...` | Read the Postgres log, see above. |

## App

`k8s/app.yaml` holds two objects.

| Object | What it does |
| --- | --- |
| Service `costcompass` | Type ClusterIP, port 3000 to 3000, selects pods with `app: costcompass`. |
| Deployment `costcompass` | One replica of the image `costcompass:0.1.0`. |

Settings of the Deployment:

| Setting | Value |
| --- | --- |
| Image | `costcompass:0.1.0`, `imagePullPolicy: IfNotPresent`, container port 3000. The tag is explicit, not `latest`. |
| Configuration | `envFrom` the ConfigMap `costcompass-config` (`NODE_ENV`, `NITRO_PORT`). |
| Database URL | `NUXT_DATABASE_URL` through `secretKeyRef` from the Secret `costcompass-db`. Only this key: the app does not get `POSTGRES_PASSWORD`. |
| Readiness probe | `GET /api/ready`, period 10 s, timeout 3 s, failure threshold 3. |
| Liveness probe | `GET /api/health`, initial delay 10 s, period 10 s, timeout 3 s. |
| Resources | Requests: CPU 100m, memory 128Mi. Limit: memory 256Mi. No CPU limit. |
| Security | `runAsNonRoot: true`, `runAsUser: 1000`, `readOnlyRootFilesystem: true`. |

Why `runAsUser: 1000`: the image sets `USER node`, a name. Kubernetes cannot check a name against `runAsNonRoot`, so the pod would not start. The user id makes it checkable (see [docker.md](docker.md)). The app runs with a read-only root filesystem; no `/tmp` volume was needed.

### Probes

The probes use the routes described in [health.md](health.md). Liveness calls `/api/health`, which does not touch the database. Readiness calls `/api/ready`, which does. `/api/ready` has no timeout of its own; the readiness probe's `timeoutSeconds: 3` is that timeout (decision in #40).

What this means: when Postgres is down, the app pod leaves the Service endpoints (no traffic) but is not restarted.

### Get the images into the cluster

Two images are needed: the app and the migrations. Build them with explicit tags:

```bash
docker build -t costcompass:0.1.0 .
docker build --target migrate -t costcompass-migrate:0.1.0 .
```

The Docker Desktop cluster does not see images in your local Docker store. Docker uses the classic `overlay2` image store, and the cluster node (the container `desktop-control-plane`) has its own container runtime with its own image list. Without a load, the pod shows `ErrImagePull` and then `ImagePullBackOff` ("failed to pull and unpack image docker.io/library/costcompass:0.1.0").

Copy both images into the node:

```bash
docker save costcompass:0.1.0 | docker exec -i desktop-control-plane ctr -n k8s.io images import -
docker save costcompass-migrate:0.1.0 | docker exec -i desktop-control-plane ctr -n k8s.io images import -
```

Check that the node has them:

```bash
docker exec desktop-control-plane crictl images | grep costcompass
```

Expected: a line with `costcompass` and a line with `costcompass-migrate`, both with the tag `0.1.0`.

Repeat the load after every rebuild of a tag. Then restart the app pod so it uses the new image:

```bash
kubectl rollout restart deployment/costcompass -n costcompass
```

The migration image is used by the next Job run, see [Run the migrations again](#run-the-migrations-again).

Build from the current code. An image built before the health routes existed answers 404 on `/api/health` and `/api/ready`, and the liveness probe kills the pod again and again.

### Apply the whole stack

The order is: namespace and configuration, Postgres, migrations Job, app.

1. Build both images and load them into the node (see above).
2. Create `k8s/secret.yaml` (see [Create the Secret](#create-the-secret)).
3. Apply in this order:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl rollout status statefulset/postgres -n costcompass
   kubectl delete job costcompass-migrate -n costcompass --ignore-not-found
   kubectl apply -f k8s/migrate-job.yaml
   kubectl wait --for=condition=complete job/costcompass-migrate -n costcompass --timeout=120s
   kubectl apply -f k8s/app.yaml
   ```

   The `delete` line removes a Job from an earlier run, so this order also works the second time. The `wait` line stops the sequence until the migrations are done, so the app never starts before the tables exist.

4. Check the pods:

   ```bash
   kubectl get pods -n costcompass
   ```

   Expected: `postgres-0` and the `costcompass-...` pod are `1/1 Running`, and the `costcompass-migrate-...` pod is `Completed`.

The readiness check covers the database connection, not the schema. If the migrations have not run, the pod is ready but queries fail. A script for this order is planned (#174).

### Open the app

Forward a local port to the Service:

```bash
kubectl port-forward -n costcompass svc/costcompass 3001:3000
```

Open <http://localhost:3001>. The left port (3001) is free to choose; 3000 is used by `nuxt dev`. The right port (3000) is the Service port. The command keeps running; use another terminal for the next steps.

Why ClusterIP and a port-forward: a `LoadBalancer` Service would work on Docker Desktop (published on `localhost:8080`), but it binds to all network interfaces (0.0.0.0). The app has no login (#168) and no HTTPS (#167), so this was not adopted. An Ingress is #167.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ErrImagePull`, `ImagePullBackOff` | The node does not have the image. Load it, see [Get the image into the cluster](#get-the-image-into-the-cluster). |
| Pod restarts, `/api/health` gives 404 | Stale image from before the health routes. Rebuild, load, restart. |
| Pod `0/1`, restarts stay 0 | Not ready: usually the database is not reachable. Check `kubectl get pods -n costcompass` and `curl http://localhost:3001/api/ready`. |
| Pod is ready, requests fail | The migrations have not run. Check the Job, see [Migrations Job](#migrations-job). |

## Secrets are not encrypted

Kubernetes stores Secret values as base64, which is an encoding, not encryption. Anyone who can read the Secret in the namespace can decode it:

```bash
kubectl get secret costcompass-db -n costcompass -o jsonpath='{.data.POSTGRES_USER}' | base64 -d
```

This is acceptable for a local cluster. Do not reuse these values anywhere else.

## Later additions

- A second, restricted database user needs further Secret keys, and a NetworkPolicy may restrict access to Postgres (#169). The Job will keep the owner user.
- A `deploy.sh` that runs the apply order as a release (#174).
- A migrate image that prints the error of a failed migration (#176).

## Verification status

Checked on Docker Desktop (context `docker-desktop`): `kubectl apply --dry-run=client -f k8s/` lists three objects; the apply order above creates the ConfigMap with 2 entries and the Secret with 4; applying twice is safe.

Postgres (#45), checked on the same cluster:

- Applying the namespace and then the folder (the order before the Job existed) created the pod `postgres-0`, `1/1 Running` after 13 seconds, and the PVC `data-postgres-0`, `Bound`.
- Through the port-forward, `pnpm drizzle-kit migrate` printed `migrations applied successfully` and created the tables. The local dev database stayed unchanged.
- Restart test: a scratch table with one row was created, the pod `postgres-0` was deleted, and after the new pod was ready the row was still there. The scratch table was dropped afterwards.

Not checked:

- A wrong password against the pod.
- Deleting the StatefulSet, the PVC or the namespace, and the "start over" commands above.
- Other CPU architectures.

App (#46), checked on the same cluster (a kind-based Docker Desktop cluster):

- The pod became `1/1 Running`. Through the port-forward, `/api/health` and `/api/ready` returned ok, the page returned 200 and `/api/purchases` returned `[]` on the empty database. The app reached Postgres through the name `postgres`.
- Postgres outage: after `kubectl scale statefulset/postgres -n costcompass --replicas=0`, `/api/ready` returned 503 at once. After about 30 s (three failed probes) the app pod went `0/1` and left the Service endpoints. The restart count stayed 0. After `--replicas=1` the pod was ready again after about 16 s without a restart, and the tables were intact.
- Persistence: a cost was added in the UI and the app pod was deleted with `kubectl delete pod -n costcompass -l app=costcompass`. The new pod was ready after about 10 to 15 s and the cost was still there, because the data lives in Postgres.
- A stale image (built before the health routes) gave 404 on both routes and the pod was killed by the liveness probe.

Not checked: other CPU architectures, more than one replica, resource limits under load, a rolling update with a changed image (beyond the restart above).

Migrations Job (#47), checked on the same cluster:

- Already migrated database (the cluster database): the Job was `Complete` after 3 s. The init container logged `postgres:5432 - accepting connections`, and the log ends with `migrations applied successfully`.
- Empty database (a scratch database in the cluster's Postgres): the Job was `Complete` and created `purchases`, `recurring_costs` and `drizzle.__drizzle_migrations`.
- The whole apply order on a clean temporary namespace (a copy of the manifests with only the namespace changed): 20 s in total. The Job completed and created the tables before the app started. The app pod was `1/1`, `/api/ready` returned ok and `/api/purchases` returned `[]`. The delete-and-apply rerun worked.
- A failing migration (a table `purchases` that existed without being recorded): the Job ended `Failed` with `BackoffLimitExceeded` after 4 pods in 78 s. Each pod exited with code 1 and kept its log. The log shows no reason (see [When the Job fails](#when-the-job-fails)). Wrong credentials fail the same way.

Not checked: the Job on a cluster with more than one replica of anything, concurrent runs, a migration that takes long, other CPU architectures.
