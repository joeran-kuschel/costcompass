# Kubernetes manifests

What is in `k8s/`, how to create the Secret and how to apply the manifests. Written for: developers and operators, on the local Docker Desktop cluster (context `docker-desktop`).

The manifests are plain YAML files applied with `kubectl apply -f`. There is no Kustomize or Helm (decision #43, see [decisions.md](decisions.md)). `k8s/` holds the namespace, the configuration, the credentials, Postgres, the database access rules, the migrations Job, the app and the Ingress.

## What is in `k8s/`

| File | Object | Committed | What it holds |
| --- | --- | --- | --- |
| `namespace.yaml` | Namespace `costcompass` | Yes | The namespace for everything of the app |
| `configmap.yaml` | ConfigMap `costcompass-config` | Yes | `NODE_ENV=production` and `NITRO_PORT="3000"` |
| `postgres.yaml` | Service `postgres` and StatefulSet `postgres` | Yes | The database, see [Postgres](#postgres) |
| `db-roles.yaml` | ConfigMap `costcompass-db-roles` | Yes | The SQL file `roles.sql` that creates the restricted database user, see [Database access](#database-access) |
| `network-policy.yaml` | NetworkPolicy `costcompass-db-from-app` | Yes | Only the app and the migrations Job may connect to Postgres, see [Database access](#database-access) |
| `migrate-job.yaml` | Job `costcompass-migrate` | Yes | The database role step and the migrations, see [Migrations Job](#migrations-job) |
| `app.yaml` | Service `costcompass` and Deployment `costcompass` | Yes | The app, see [App](#app) |
| `ingress.yaml` | Ingress `costcompass` | Yes | The address `https://costcompass.local` for the app, with TLS from the Secret `costcompass-tls` (created by command, not a file), see [Ingress](#ingress) |
| `secret.yaml.example` | none (template) | Yes | Template of the Secret `costcompass-db` with `change-me` values |
| `secret.yaml` | Secret `costcompass-db`, type Opaque | No, listed in `.gitignore` | Your real credentials |

All ConfigMap values are strings, so the port is written in quotes.

### Keys in the Secret

| Key | Read by |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | The Postgres pod (`postgres.yaml`, #45). This is the database owner. |
| `MIGRATE_DATABASE_URL` | The migrations Job (`migrate-job.yaml`): the init container `create-app-role` and the migration container. The owner URL, `postgresql://costcompass:OWNER_PASSWORD@postgres:5432/costcompass`. |
| `APP_DB_PASSWORD` | The init container `create-app-role`. The password of the restricted user `costcompass_app`. |
| `NUXT_DATABASE_URL` | The app (`app.yaml`). The URL of the restricted user, `postgresql://costcompass_app:APP_DB_PASSWORD@postgres:5432/costcompass`. |

The app reads `NUXT_DATABASE_URL` as its `runtimeConfig` override (see [architecture.md](architecture.md)). The migration container takes the value of `MIGRATE_DATABASE_URL`, but still names its variable `NUXT_DATABASE_URL`, because `drizzle.config.ts` reads that name.

### Why the example is called `secret.yaml.example`

A folder-wide `kubectl apply -f k8s/` reads only `.yaml`, `.yml` and `.json` files. With the name `secret.example.yaml`, both files defined the same Secret, and the example (applied first) could be applied with `change-me` values. The dry run listed the Secret twice. With the current name it lists three objects.

## Create the Secret

1. Copy the template. The copy is ignored by git.

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

2. Generate two passwords without special characters, one for the owner and one for the app user. Run the command twice:

   ```bash
   openssl rand -hex 16
   ```

3. In `k8s/secret.yaml`, replace every `change-me`:

   | Password | Where it appears (must be identical) |
   | --- | --- |
   | Owner | `POSTGRES_PASSWORD` and inside `MIGRATE_DATABASE_URL` |
   | App user | `APP_DB_PASSWORD` and inside `NUXT_DATABASE_URL` |

   The two passwords must differ. With the same password, the separation of the two users is pointless. If you pick a password with special characters, percent-encode it inside the URL.

4. Keep user and database name in step. `POSTGRES_USER` and `POSTGRES_DB` must match the user and the database name in `MIGRATE_DATABASE_URL`. `NUXT_DATABASE_URL` uses the user `costcompass_app` and the same database. The URLs have this form:

   ```text
   postgresql://USER:PASSWORD@postgres:5432/DB
   ```

   - Host `postgres` is the name of the Postgres Service in `k8s/postgres.yaml`.
   - Port 5432 is the port inside the cluster. It is not 5434, which is only the published port of the local dev container (see [getting-started.md](getting-started.md)).

Never commit `k8s/secret.yaml`. Do not paste its content into issues, pull requests or chats.

## Apply and check

The namespace must exist first, because the other objects name it. The Secret `k8s/secret.yaml` must exist before the apply (see above); without it the Postgres pod, the Job and the app pod cannot start. The ConfigMap `costcompass-db-roles` must exist before the Job, because the Job mounts it. Both images must be in the cluster node (see [Get the images into the cluster](#get-the-images-into-the-cluster)). The whole stack, in order, is in [Apply the whole stack](#apply-the-whole-stack).

Do not apply the whole folder with `kubectl apply -f k8s/`. It would apply the Job and the app at the same time, so the app could start before the migrations are done.

1. Apply the namespace, the configuration, the database access rules and Postgres:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/db-roles.yaml -f k8s/network-policy.yaml
   kubectl apply -f k8s/postgres.yaml
   ```

2. Check the result:

   ```bash
   kubectl get configmap,secret -n costcompass
   ```

   Expected: `configmap/costcompass-config` with DATA 2, `configmap/costcompass-db-roles` with DATA 1, `configmap/kube-root-ca.crt` (added by Kubernetes itself) and `secret/costcompass-db` of type Opaque with DATA 6. `kubectl get networkpolicy -n costcompass` lists `costcompass-db-from-app`.

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

An empty cluster database has no tables. The cluster normally migrates through the [Migrations Job](#migrations-job). To migrate from your machine instead, for example to try a migration, use the port-forward. Use the owner credentials, the ones in `MIGRATE_DATABASE_URL`, not the app user: `costcompass_app` may not create tables. Replace `USER`, `PASSWORD` and the database name with the owner values from your `k8s/secret.yaml`:

```bash
NUXT_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5435/costcompass" pnpm drizzle-kit migrate
```

Keep the variable on the command line. A variable that is already set wins over `.env`, because `process.loadEnvFile()` does not override existing variables. Without it, the command would migrate the local dev database.

Expected: `migrations applied successfully`. The tables `purchases` and `recurring_costs` and the table `drizzle.__drizzle_migrations` exist afterwards.

### Things to know

- **Credentials are read once.** Postgres reads `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` only when it initialises an empty data directory. Changing the Secret later does not change the password of an existing database. (The password of the app user is the exception: the Job sets it again on every run, see [Database access](#database-access).) To start over, delete the volume. This destroys the data:

  ```bash
  kubectl delete statefulset postgres -n costcompass
  kubectl delete pvc data-postgres-0 -n costcompass
  kubectl apply -f k8s/postgres.yaml
  ```

  The new database is empty, so run the migrations again. Scaling the StatefulSet to 0 instead of deleting it also works as the first step. The commands above were not run.
- **The reclaim policy is Delete.** Deleting the PVC or the namespace deletes the data. `kubectl delete pod postgres-0 -n costcompass` keeps it; the new pod finds the same volume. Deleting the StatefulSet keeps the PVC too, by the documented Kubernetes default (unverified here).
- **One replica only.** There are no backups, no replication and no major-version upgrades. These are out of scope.

## Database access

Two rules limit who can use the database (#169): a NetworkPolicy limits who can connect, and a restricted database user limits what the app can do once connected.

### NetworkPolicy

`k8s/network-policy.yaml` holds the NetworkPolicy `costcompass-db-from-app`. It selects the Postgres pod (`app: postgres`) and covers incoming traffic only.

| Who connects to port 5432 | Result |
| --- | --- |
| App pods (label `app=costcompass`) | Allowed |
| The migrations Job pod (label `job-name=costcompass-migrate`), including its init containers | Allowed |
| Any other pod in the namespace `costcompass` | Refused |
| Any pod in another namespace | Refused |

The policy does not affect connections that are not pod-to-pod:

- The kubelet's probes, so the Postgres readiness probe keeps working.
- `kubectl exec` into `postgres-0`.
- `kubectl port-forward` to Postgres.

A pod that you start by hand, for example `kubectl run … psql`, is refused. To open a database shell, use `kubectl exec` instead. Use the owner user here, because `psql` inside the pod connects as the owner by default:

```bash
kubectl exec -it postgres-0 -n costcompass -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Enforcement was checked, not assumed. The cluster's network plugin is kindnet, and it was not known beforehand whether it enforces policies. A throwaway `postgres:17` pod ran `pg_isready -h postgres -p 5432`. Without the policy it printed `accepting connections` (exit 0). With the policy it printed `no response` (exit 2). The result was the same from the namespace `costcompass` and from the namespace `default` (host `postgres.costcompass`).

Egress is not restricted: no egress rules are set.

### Two database users

| User | Rights | Used by |
| --- | --- | --- |
| `costcompass` (owner) | Superuser. Postgres creates it from `POSTGRES_USER`. Owns the tables. | The migrations Job only |
| `costcompass_app` | Login only: not a superuser, cannot create databases or roles. `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables in the schema `public`, `USAGE` and `SELECT` on all sequences (the tables use `serial` ids), `USAGE` on the schema `public`. | The app |

Tables that later migrations create get the same rights for `costcompass_app` through `ALTER DEFAULT PRIVILEGES`. The app user has no right on the schema `drizzle` (the migrations table) and cannot create objects.

What this means for the app: a bug or an attack through the app can read and change cost rows, but cannot drop or alter tables, truncate them, read the migrations table or create roles. The owner is still a superuser; making it a normal user is out of scope.

### Where the app user is created

The Job `costcompass-migrate` creates it, in the init container `create-app-role` (see [Migrations Job](#migrations-job)). The init container runs `psql` as the owner with the SQL file `roles.sql`, which comes from the ConfigMap `costcompass-db-roles` (`k8s/db-roles.yaml`), mounted at `/sql`. The file is safe to run again:

- `CREATE ROLE` runs only if the role does not exist.
- `ALTER ROLE … PASSWORD` runs every time, so the password follows the Secret.
- The grants can be repeated.

The Job runs this step on every run, before the migration. So a new installation needs no extra step, and the role exists before the first table is created.

Why not somewhere else:

- A Postgres init script (`/docker-entrypoint-initdb.d`) runs only on an empty data directory. It would never reach an existing volume.
- A Drizzle migration lives in git, so it cannot hold the password.

The role step prints no password: `psql` prints only command tags such as `GRANT`. The password does pass through a Postgres statement, so with the default `log_min_error_statement` a failing `ALTER ROLE` could appear in the Postgres log.

### Upgrade an existing installation

Do the steps in this order. The app must be restarted last: running pods keep their old URL, but a restart before the Job fails, because the role does not exist yet.

1. Edit `k8s/secret.yaml`: add `MIGRATE_DATABASE_URL` (the owner URL, the value `NUXT_DATABASE_URL` had before) and `APP_DB_PASSWORD` (a new password, different from `POSTGRES_PASSWORD`), and change `NUXT_DATABASE_URL` to the `costcompass_app` URL. See [Create the Secret](#create-the-secret).
2. Apply the Secret and the roles file:

   ```bash
   kubectl apply -f k8s/secret.yaml -f k8s/db-roles.yaml -f k8s/network-policy.yaml
   ```

3. Run the Job again (it creates the role, then migrates as the owner):

   ```bash
   kubectl delete job costcompass-migrate -n costcompass --ignore-not-found
   kubectl apply -f k8s/migrate-job.yaml
   kubectl wait --for=condition=complete job/costcompass-migrate -n costcompass --timeout=120s
   ```

4. Restart the app:

   ```bash
   kubectl rollout restart deployment/costcompass -n costcompass
   ```

To change the password of the app user, change `APP_DB_PASSWORD` and the password inside `NUXT_DATABASE_URL` in `k8s/secret.yaml`, apply it, run the Job again (the `ALTER ROLE` sets the new password), then restart the app.

### Check the access

```bash
kubectl exec postgres-0 -n costcompass -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin from pg_roles where rolname like '"'"'costcompass%'"'"'"'
```

Expected: `costcompass` with `rolsuper` `t` (true), and `costcompass_app` with `rolsuper`, `rolcreatedb` and `rolcreaterole` `f` (false) and `rolcanlogin` `t`. The check was run on the cluster.

## Migrations Job

`k8s/migrate-job.yaml` holds one Job, `costcompass-migrate`. It creates the restricted app user and applies the database migrations before the app starts. It runs the `migrate` target of the Dockerfile (see [docker.md](docker.md#migrations)), which runs `pnpm drizzle-kit migrate`.

| Setting | Value |
| --- | --- |
| Image | `costcompass-migrate:0.1.0`, `imagePullPolicy: IfNotPresent` |
| Credentials | The migration container gets the owner URL: its variable is named `NUXT_DATABASE_URL` (`drizzle.config.ts` reads that name), the value comes from the Secret key `MIGRATE_DATABASE_URL`. |
| Init container 1 | `wait-for-postgres` (image `postgres:17`, already in the cluster) loops `pg_isready -h postgres -p 5432` until Postgres accepts connections. Waiting does not use up the retries. |
| Init container 2 | `create-app-role` (image `postgres:17`) runs `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v app_password="$APP_DB_PASSWORD" -f /sql/roles.sql`. `DATABASE_URL` comes from `MIGRATE_DATABASE_URL`, `APP_DB_PASSWORD` from the Secret key of the same name, and the ConfigMap `costcompass-db-roles` is mounted at `/sql`. See [Database access](#database-access). |
| `restartPolicy` | `Never`. Every attempt is its own pod with its own log. |
| `backoffLimit` | 3: up to 4 pods, then the Job is `Failed`. |
| `ttlSecondsAfterFinished` | Not set. A finished Job stays, so you can read its log. |

Why a Job and not an init container on the app pod: the migrations run once per release, not at every app start (see [decisions.md](decisions.md)).

The image is large (813 MB in the node) and runs as root, because no `securityContext` is set (see [docker.md](docker.md#what-is-in-the-migration-image)). The Job uses the database owner user; the app uses the restricted user `costcompass_app` (see [Database access](#database-access)).

### Run the migrations

Both images must be in the node (see [Get the images into the cluster](#get-the-images-into-the-cluster)), Postgres must be running, and the Secret and the ConfigMap `costcompass-db-roles` must be applied.

```bash
kubectl apply -f k8s/migrate-job.yaml
kubectl wait --for=condition=complete job/costcompass-migrate -n costcompass --timeout=120s
```

Expected: `job.batch/costcompass-migrate condition met`. Read the log:

```bash
kubectl logs job/costcompass-migrate -n costcompass
```

Expected: the log ends with `migrations applied successfully`. The log of the role step is `kubectl logs job/costcompass-migrate -n costcompass -c create-app-role`; it shows `GRANT` and `ALTER DEFAULT PRIVILEGES` lines. On a database that is already migrated, the Job also succeeds (about 3 s here) and changes nothing.

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
| Pod `Init:0/2` | Postgres is not ready yet. The init container keeps waiting. Check `postgres-0`. |
| Pod shows an init error, then a new pod starts | The step `create-app-role` failed. Read `kubectl logs job/costcompass-migrate -n costcompass -c create-app-role`. Typical causes: `MIGRATE_DATABASE_URL` or `APP_DB_PASSWORD` is missing in the Secret, the owner password is wrong, or the ConfigMap `costcompass-db-roles` is not applied (the pod stays `ContainerCreating`). |
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

The order is: namespace, configuration with the database access rules, Postgres, migrations Job, app, TLS Secret, Ingress.

1. Build both images and load them into the node (see above).
2. Create `k8s/secret.yaml` (see [Create the Secret](#create-the-secret)).
3. Apply in this order:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/db-roles.yaml -f k8s/network-policy.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl rollout status statefulset/postgres -n costcompass
   kubectl delete job costcompass-migrate -n costcompass --ignore-not-found
   kubectl apply -f k8s/migrate-job.yaml
   kubectl wait --for=condition=complete job/costcompass-migrate -n costcompass --timeout=120s
   kubectl apply -f k8s/app.yaml
   ```

   Then create the TLS Secret `costcompass-tls` if it does not exist yet (commands in [Ingress](#ingress)) and apply the Ingress:

   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

   The `delete` line removes a Job from an earlier run, so this order also works the second time. The `wait` line stops the sequence until the migrations are done, so the app never starts before the role and the tables exist.

4. Check the pods:

   ```bash
   kubectl get pods -n costcompass
   ```

   Expected: `postgres-0` and the `costcompass-...` pod are `1/1 Running`, and the `costcompass-migrate-...` pod is `Completed`.

The readiness check covers the database connection, not the schema. If the migrations have not run, the pod is ready but queries fail. A script for this order is planned (#174).

### Open the app

Add the host name to `/etc/hosts` once, create the certificate Secret and apply `k8s/ingress.yaml` (see [Ingress](#ingress)), then open <https://costcompass.local>. You see the dashboard. No port-forward is needed. `http://costcompass.local` redirects to HTTPS.

Alternative without the controller: forward a local port to the Service.

```bash
kubectl port-forward -n costcompass svc/costcompass 3001:3000
```

Open <http://localhost:3001>. The left port (3001) is free to choose; 3000 is used by `nuxt dev`. The right port (3000) is the Service port. The command keeps running; use another terminal for the next steps. It binds to 127.0.0.1 only.

Why ClusterIP and not a `LoadBalancer` Service: a `LoadBalancer` would work on Docker Desktop (published on `localhost:8080`), but it binds to all network interfaces (0.0.0.0). The app has no login (#168), so this was not adopted (#46). The Ingress has the same exposure, see the security note below.

### Ingress

`k8s/ingress.yaml` holds one Ingress, `costcompass`, in the namespace `costcompass`. It uses `ingressClassName: nginx`, the host `costcompass.local` and the path `/` (Prefix), and sends everything to the Service `costcompass` on port 3000. A `tls` block names the host and the Secret `costcompass-tls` (#167):

```yaml
  tls:
    - hosts:
        - costcompass.local
      secretName: costcompass-tls
```

The Ingress is its own file so that `app.yaml` stays about the app.

The cluster already runs one shared ingress-nginx controller (IngressClass `nginx`). Other local apps use it too (`dinner.local`, `time-tracking.local`, `watchlist.local`). Docker Desktop publishes it on the Mac as `0.0.0.0:80` and 443, so there is nothing to install.

TLS (Transport Layer Security, the encryption behind HTTPS) ends at the controller. From the controller to the app pod the traffic is plain HTTP on port 3000 inside the cluster. No HSTS header is set.

1. Add the host name to `/etc/hosts` once. It needs `sudo`:

   ```bash
   printf '127.0.0.1 costcompass.local\n::1 costcompass.local\n' | sudo tee -a /etc/hosts
   ```

   The `::1` line is harmless: nothing listens on IPv6 port 80 here, so browsers fall back to IPv4. The name ends in `.local`, which is reserved for mDNS; it works here because of these entries.

2. Create the certificate Secret `costcompass-tls`, once. It comes from a command, not from a file in `k8s/`, so no certificate or key file is ever in the repository. The commands use a temporary folder outside the project and delete it afterwards.

   Prerequisite: [mkcert](https://github.com/FiloSottile/mkcert) is installed and its CA is trusted (`mkcert -install`, once; `mkcert -CAROOT` shows where the CA lives). It is the same CA the other local apps use, so the browser already trusts the certificate.

   ```bash
   D=$(mktemp -d)
   mkcert -cert-file $D/tls.crt -key-file $D/tls.key costcompass.local
   kubectl create secret tls costcompass-tls --cert=$D/tls.crt --key=$D/tls.key -n costcompass
   rm -rf $D
   ```

   The Secret has type `kubernetes.io/tls` and the keys `tls.crt` and `tls.key`. The certificate is valid for `costcompass.local` until 14 February 2029.

   To renew it, delete the Secret (`kubectl delete secret costcompass-tls -n costcompass`) and create it again with the same commands. The Ingress picks it up. This was not tested.

3. Apply the Ingress (last in the apply order). The Secret must exist first. Without it the controller serves its own default (fake) certificate and the browser shows a warning.

   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

4. Check it:

   ```bash
   kubectl get ingress -n costcompass
   ```

   Expected: class `nginx`, host `costcompass.local`, ports `80, 443`.

5. Check the certificate with curl, using the mkcert CA:

   ```bash
   curl --cacert "$(mkcert -CAROOT)/rootCA.pem" https://costcompass.local/api/health
   ```

   Expected: HTTP 200 without a certificate error. Then open <https://costcompass.local> in the browser. You see the dashboard, with no warning.

With TLS, the controller redirects HTTP to HTTPS: `http://costcompass.local/` returns 308 to `https://costcompass.local/`. This is the default of ingress-nginx; no annotation is set. So `http://costcompass.local` does not serve the app any more. The `/etc/hosts` entry is unchanged.

The app needs no setting for the host name (no base URL, no CORS origin). The probes talk to the pod directly, so the Ingress and TLS do not affect them. A request with a host name that has no Ingress rule gets 404 from the controller.

**Security: the controller still listens on all network interfaces** (`0.0.0.0:80` and `0.0.0.0:443`), not only on localhost. HTTPS encrypts the traffic between the browser and the controller. It does not restrict who can connect. The app has no login (#168), so anyone on the same network can still read and change the costs. HTTPS only protects the traffic, and a later login, from being read on the way. Use it only on a network you trust. This is the same reason a `LoadBalancer` Service was not used.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `ErrImagePull`, `ImagePullBackOff` | The node does not have the image. Load it, see [Get the images into the cluster](#get-the-images-into-the-cluster). |
| Pod restarts, `/api/health` gives 404 | Stale image from before the health routes. Rebuild, load, restart. |
| Pod `0/1`, restarts stay 0 | Not ready: usually the database is not reachable. Check `kubectl get pods -n costcompass` and `curl http://localhost:3001/api/ready`. |
| Pod is ready, requests fail | The migrations have not run. Check the Job, see [Migrations Job](#migrations-job). |
| Requests fail with `permission denied` or `password authentication failed` in the app log | The app was restarted before the Job ran, so the role `costcompass_app` does not exist or has an old password. Run the Job again, then restart the app, see [Upgrade an existing installation](#upgrade-an-existing-installation). |
| A pod that you started by hand cannot reach Postgres (`no response`) | The NetworkPolicy refuses it, by design. Use `kubectl exec -it postgres-0 -n costcompass -- …` instead, see [NetworkPolicy](#networkpolicy). |

## Secrets are not encrypted

Kubernetes stores Secret values as base64, which is an encoding, not encryption. Anyone who can read the Secret in the namespace can decode it:

```bash
kubectl get secret costcompass-db -n costcompass -o jsonpath='{.data.POSTGRES_USER}' | base64 -d
```

This is acceptable for a local cluster. Do not reuse these values anywhere else.

## Later additions

- A login (#168). HTTPS is now in front of the app, so a login would not travel in plain text between the browser and the controller.
- A `deploy.sh` that runs the apply order as a release (#174).
- A migrate image that prints the error of a failed migration (#176).

## Verification status

Checked on Docker Desktop (context `docker-desktop`): `kubectl apply --dry-run=client -f k8s/` lists three objects; the apply order above creates the ConfigMap with 2 entries and, since #169, the Secret with 6 keys; applying twice is safe.

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

Ingress (#173), checked on the same cluster, over plain HTTP (before #167 added TLS):

- `http://costcompass.local` shows the dashboard (title "Dashboard – Costcompass") over IPv4. `/`, `/api/health`, `/api/ready` and `/api/purchases` return 200 through the Ingress.
- A test cost created with `POST /api/recurring-costs` through the Ingress was listed and then deleted (204). In the browser, a cost was added and still showed after a reload.
- The other apps on the controller still answer: `watchlist.local` returns 200; `dinner.local` and `time-tracking.local` redirect to HTTPS with 308, which is their own setting.
- A request with a host name that has no Ingress rule gets 404 from the controller.

Not checked: access from another machine on the network (the exposure is stated from the published port, not tested from a second device), other browsers, the IPv6 path.

HTTPS (#167), checked on the same cluster:

- With the CA root from mkcert (`--cacert "$(mkcert -CAROOT)/rootCA.pem"`), `/`, `/api/health`, `/api/ready` and `/api/purchases` return 200 over HTTPS. The page title is "Dashboard – Costcompass".
- `openssl s_client -connect 127.0.0.1:443 -servername costcompass.local` shows the subject "mkcert development certificate", the mkcert development CA as issuer and `Verify return code: 0 (ok)`.
- `http://costcompass.local/` returns 308 to `https://costcompass.local/`.
- A test cost created with the API through HTTPS was listed and then deleted (204).
- In the browser, <https://costcompass.local> opens without a warning or an error, and the redirect from HTTP works.
- The other apps on the controller still answer: `dinner.local` and `time-tracking.local` return 308 to HTTPS (their own setting), `watchlist.local` returns 200.
- The app pods had no restarts, because the probes talk to the pod directly and not through the Ingress.

Not checked: access from another machine (it would need the mkcert CA to trust the certificate), other browsers, renewing the certificate, a certificate for a real host name (out of scope).

Database access (#169), checked on the same cluster:

- NetworkPolicy: a throwaway `postgres:17` pod running `pg_isready -h postgres -p 5432` got `accepting connections` (exit 0) without the policy and `no response` (exit 2) with it, from the same namespace and from the namespace `default`. So kindnet enforces the policy. The app, the Job, `kubectl exec` and `kubectl port-forward` all work with the policy applied.
- Upgrade of the existing installation, as described above: the Job was `Complete`; `create-app-role` printed `GRANT` and `ALTER DEFAULT PRIVILEGES` lines; `pg_roles` shows `costcompass` as superuser and `costcompass_app` as not superuser, without `createdb` and `createrole`, with login. After the restart, `pg_stat_activity` shows the app's connection as `costcompass_app`. Through <https://costcompass.local>, reading, creating, updating (PATCH) and deleting a cost works, and the existing data is intact.
- As `costcompass_app` on the real database: `select` works. `create table` gives `permission denied for schema public`; `drop table` and `alter table` give `must be owner of table`; `truncate` gives `permission denied for table`; reading `drizzle.__drizzle_migrations` gives `permission denied for schema drizzle`; `create role` gives `permission denied to create role`. The destructive statements ran inside a rolled-back transaction, and the data was unchanged afterwards.
- The SQL was first tested on a scratch database (since removed): run twice (safe to repeat), an insert with a `serial` id works, and a table created later by the owner is usable by the app user through the default privileges.
- The whole apply order on an empty temporary namespace took 12 s. The role step ran before the tables existed, the app (as `costcompass_app`) answered `/api/ready`, listed an empty table, and could insert (serial id) and delete a purchase.

Not checked: concurrent Job runs, egress rules (none are set), another network plugin than kindnet, a non-superuser owner, other CPU architectures.
