# Kubernetes manifests

What is in `k8s/`, how to create the Secret and how to apply the manifests. Written for: developers and operators, on the local Docker Desktop cluster (context `docker-desktop`).

The manifests are plain YAML files applied with `kubectl apply -f`. There is no Kustomize or Helm (decision #43, see [decisions.md](decisions.md)). `k8s/` holds the namespace, the configuration, the credentials, Postgres, the database access rules, the migrations Job, the app and the Ingress. The images and the Job and app updates are done by `./deploy.sh`, see [Deploy script](#deploy-script).

## What is in `k8s/`

| File | Object | Committed | What it holds |
| --- | --- | --- | --- |
| `namespace.yaml` | Namespace `costcompass` | Yes | The namespace for everything of the app |
| `configmap.yaml` | ConfigMap `costcompass-config` | Yes | `NODE_ENV=production` and `NITRO_PORT="3000"` |
| `postgres.yaml` | Service `postgres` and StatefulSet `postgres` | Yes | The database, see [Postgres](#postgres) |
| `db-roles.yaml` | ConfigMap `costcompass-db-roles` | Yes | The SQL file `roles.sql` that creates the restricted database user, see [Database access](#database-access) |
| `network-policy.yaml` | NetworkPolicy `costcompass-db-from-app` | Yes | Only the app and the migrations Job may connect to Postgres, see [Database access](#database-access) |
| `migrate-job.yaml` | Job `costcompass-migrate` | Yes | The database role step and the migrations, see [Migrations Job](#migrations-job). The image tag is the placeholder `IMAGE_TAG`; `deploy.sh` fills it in |
| `app.yaml` | Service `costcompass` and Deployment `costcompass` | Yes | The app, see [App](#app). The image tag is the placeholder `IMAGE_TAG`; `deploy.sh` fills it in |
| `clean-images.sh` | none (script) | Yes | Removes old `costcompass` and `costcompass-migrate` images from Docker and from the node, run by hand: `./k8s/clean-images.sh`, see [Images pile up](#images-pile-up) |
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

The app reads `NUXT_DATABASE_URL` as its `runtimeConfig` override (see [architecture.md](architecture.md)). The migration container takes the value of `MIGRATE_DATABASE_URL`, but still names its variable `NUXT_DATABASE_URL`, because the script `server/db/migrate.ts` (and `drizzle.config.ts`) read that name.

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

The namespace must exist first, because the other objects name it. The Secret `k8s/secret.yaml` must exist before the apply (see above); without it the Postgres pod, the Job and the app pod cannot start. The ConfigMap `costcompass-db-roles` must exist before the Job, because the Job mounts it. The Job and the app are not applied by hand: `./deploy.sh` builds the images, loads them into the node and applies both (see [Deploy script](#deploy-script)). The whole stack, in order, is in [Apply the whole stack](#apply-the-whole-stack).

Do not apply the whole folder with `kubectl apply -f k8s/`. It would apply the Job and the app at the same time, so the app could start before the migrations are done. It would also apply the image `IMAGE_TAG`, which does not exist.

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

3. Deploy. The script runs the Job (it creates the role, then migrates as the owner) and then updates the app, see [Deploy script](#deploy-script):

   ```bash
   ./deploy.sh
   ```

4. Restart the app, so it reads the changed Secret even if the image tag did not change (checked: a second `./deploy.sh` on the same commit leaves the Deployment `unchanged` and does not restart the pods):

   ```bash
   kubectl rollout restart deployment/costcompass -n costcompass
   ```

To change the password of the app user, change `APP_DB_PASSWORD` and the password inside `NUXT_DATABASE_URL` in `k8s/secret.yaml`, apply it, run `./deploy.sh` (the Job's `ALTER ROLE` sets the new password), then restart the app.

### Check the access

```bash
kubectl exec postgres-0 -n costcompass -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin from pg_roles where rolname like '"'"'costcompass%'"'"'"'
```

Expected: `costcompass` with `rolsuper` `t` (true), and `costcompass_app` with `rolsuper`, `rolcreatedb` and `rolcreaterole` `f` (false) and `rolcanlogin` `t`. The check was run on the cluster.

## Migrations Job

`k8s/migrate-job.yaml` holds one Job, `costcompass-migrate`. It creates the restricted app user and applies the database migrations before the app starts. It runs the `migrate` target of the Dockerfile (see [docker.md](docker.md#migrations)), which runs the script `server/db/migrate.ts`.

| Setting | Value |
| --- | --- |
| Image | `costcompass-migrate:IMAGE_TAG`, `imagePullPolicy: IfNotPresent`. `deploy.sh` replaces `IMAGE_TAG` with the tag of the build, see [Deploy script](#deploy-script). |
| Credentials | The migration container gets the owner URL: its variable is named `NUXT_DATABASE_URL` (`server/db/migrate.ts` reads that name), the value comes from the Secret key `MIGRATE_DATABASE_URL`. |
| Init container 1 | `wait-for-postgres` (image `postgres:17`, already in the cluster) loops `pg_isready -h postgres -p 5432` until Postgres accepts connections. Waiting does not use up the retries. |
| Init container 2 | `create-app-role` (image `postgres:17`) runs `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v app_password="$APP_DB_PASSWORD" -f /sql/roles.sql`. `DATABASE_URL` comes from `MIGRATE_DATABASE_URL`, `APP_DB_PASSWORD` from the Secret key of the same name, and the ConfigMap `costcompass-db-roles` is mounted at `/sql`. See [Database access](#database-access). |
| `restartPolicy` | `Never`. Every attempt is its own pod with its own log. |
| `backoffLimit` | 3: up to 4 pods, then the Job is `Failed`. |
| `ttlSecondsAfterFinished` | Not set. A finished Job stays, so you can read its log. |

Why a Job and not an init container on the app pod: the migrations run once per release, not at every app start (see [decisions.md](decisions.md)).

The image is large (813 MB in the node) and runs as root, because no `securityContext` is set (see [docker.md](docker.md#what-is-in-the-migration-image)). The Job uses the database owner user; the app uses the restricted user `costcompass_app` (see [Database access](#database-access)).

### Run the migrations

Postgres must be running, and the Secret and the ConfigMap `costcompass-db-roles` must be applied. `./deploy.sh` runs the Job as one of its steps (see [Deploy script](#deploy-script)); it needs no separate command. Do not run `kubectl apply -f k8s/migrate-job.yaml` by hand: the image `costcompass-migrate:IMAGE_TAG` does not exist.

When the script has finished, the Job is `Complete`. Read the log:

```bash
kubectl logs job/costcompass-migrate -n costcompass
```

Expected: the log is empty, because the script prints nothing on success; the Job status `Complete` is the result. The log of the role step is `kubectl logs job/costcompass-migrate -n costcompass -c create-app-role`; it shows `GRANT` and `ALTER DEFAULT PRIVILEGES` lines. On a database that is already migrated, the Job also succeeds (about 3 s here) and changes nothing.

### Run the migrations again

After you add a migration, run `./deploy.sh`. It deletes the finished Job, builds a new migration image with the new files and applies the Job again.

The delete is needed: applying an unchanged finished Job only prints `unchanged`, and a changed pod template is rejected as immutable.

### When the Job fails

```bash
kubectl get pods -n costcompass
kubectl describe job costcompass-migrate -n costcompass
```

A failed Job shows the reason `BackoffLimitExceeded` after 4 pods (78 s in the test). Each pod exited with code 1 and keeps its log.

The log of a failed pod contains the database error. Read it:

```bash
kubectl logs job/costcompass-migrate -n costcompass -c costcompass-migrate
```

The `-c` flag picks the migration container, not an init container. Examples of what you find: `type "recurring_interval" already exists` (an object exists but is not recorded as migrated), or a connection error such as `DrizzleQueryError` when the database is unreachable or the credentials are wrong. The Postgres log (`kubectl logs postgres-0 -n costcompass | grep ERROR`) still shows the server side.

| Symptom | Cause and fix |
| --- | --- |
| Pod `Init:0/2` | Postgres is not ready yet. The init container keeps waiting. Check `postgres-0`. |
| Pod shows an init error, then a new pod starts | The step `create-app-role` failed. Read `kubectl logs job/costcompass-migrate -n costcompass -c create-app-role`. Typical causes: `MIGRATE_DATABASE_URL` or `APP_DB_PASSWORD` is missing in the Secret, the owner password is wrong, or the ConfigMap `costcompass-db-roles` is not applied (the pod stays `ContainerCreating`). |
| `ErrImagePull`, `ImagePullBackOff` | The node does not have the image. The Job was applied by hand with the placeholder `costcompass-migrate:IMAGE_TAG`, or the load failed. Run `./deploy.sh`. |
| Job `Failed` with `BackoffLimitExceeded` | Read the error in the log of the container `costcompass-migrate`, see above. |

## App

`k8s/app.yaml` holds two objects.

| Object | What it does |
| --- | --- |
| Service `costcompass` | Type ClusterIP, port 3000 to 3000, selects pods with `app: costcompass`. |
| Deployment `costcompass` | One replica of the image `costcompass:IMAGE_TAG`. |

Settings of the Deployment:

| Setting | Value |
| --- | --- |
| Image | `costcompass:IMAGE_TAG`, `imagePullPolicy: IfNotPresent`, container port 3000. The tag is explicit, not `latest`. `IMAGE_TAG` is a placeholder; `deploy.sh` replaces it with the tag of the build, see [Deploy script](#deploy-script). |
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

Background. `./deploy.sh` does the build and the copy for you (see [Deploy script](#deploy-script)); read this to understand the step or to do it by hand. Two images are needed: the app and the migrations. Build them with explicit tags (`<tag>` stands for the tag the script computes):

```bash
docker build -t costcompass:<tag> .
docker build --target migrate -t costcompass-migrate:<tag> .
```

The Docker Desktop cluster does not see images in your local Docker store. Docker uses the classic `overlay2` image store, and the cluster node (the container `desktop-control-plane`) has its own container runtime with its own image list. Without a load, the pod shows `ErrImagePull` and then `ImagePullBackOff` ("failed to pull and unpack image docker.io/library/costcompass:<tag>").

Copy both images into the node:

```bash
docker save costcompass:<tag> | docker exec -i desktop-control-plane ctr -n k8s.io images import -
docker save costcompass-migrate:<tag> | docker exec -i desktop-control-plane ctr -n k8s.io images import -
```

Check that the node has them:

```bash
docker exec desktop-control-plane crictl images | grep costcompass
```

Expected: a line with `costcompass` and a line with `costcompass-migrate`, both with the tag you built.

With `imagePullPolicy: IfNotPresent`, a tag that is already in the node is not pulled again. A rebuild under the same tag would leave the old image running, and the Deployment would not restart. This is why the script uses a new tag for every change, see [Deploy script](#deploy-script).

Build from the current code. An image built before the health routes existed answers 404 on `/api/health` and `/api/ready`, and the liveness probe kills the pod again and again.

### Apply the whole stack

The order is: namespace, configuration with the database access rules, Postgres, `./deploy.sh` (images, migrations Job, app), TLS Secret, Ingress.

1. Create `k8s/secret.yaml` (see [Create the Secret](#create-the-secret)).
2. Apply in this order:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/db-roles.yaml -f k8s/network-policy.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl rollout status statefulset/postgres -n costcompass
   ./deploy.sh
   ```

   Then create the TLS Secret `costcompass-tls` if it does not exist yet (commands in [Ingress](#ingress)) and apply the Ingress:

   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

   The script removes a Job from an earlier run, so this order also works the second time. It waits until the migrations are done before it applies the app, so the app never starts before the role and the tables exist.

3. Check the pods:

   ```bash
   kubectl get pods -n costcompass
   ```

   Expected: `postgres-0` and the `costcompass-...` pod are `1/1 Running`, and the `costcompass-migrate-...` pod is `Completed`.

The readiness check covers the database connection, not the schema. If the migrations have not run, the pod is ready but queries fail. The script `deploy.sh` prevents this by waiting for the Job.

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
| `ErrImagePull`, `ImagePullBackOff` | The node does not have the image. Run `./deploy.sh`; it loads the images. If you applied `app.yaml` by hand, the image is the placeholder `costcompass:IMAGE_TAG`. See [Get the images into the cluster](#get-the-images-into-the-cluster). |
| Pod restarts, `/api/health` gives 404 | Stale image from before the health routes. Run `./deploy.sh` to build and roll out a new one. |
| Pod `0/1`, restarts stay 0 | Not ready: usually the database is not reachable. Check `kubectl get pods -n costcompass` and `curl http://localhost:3001/api/ready`. |
| Pod is ready, requests fail | The migrations have not run. Check the Job, see [Migrations Job](#migrations-job). |
| Requests fail with `permission denied` or `password authentication failed` in the app log | The app was restarted before the Job ran, so the role `costcompass_app` does not exist or has an old password. Run the Job again, then restart the app, see [Upgrade an existing installation](#upgrade-an-existing-installation). |
| A pod that you started by hand cannot reach Postgres (`no response`) | The NetworkPolicy refuses it, by design. Use `kubectl exec -it postgres-0 -n costcompass -- …` instead, see [NetworkPolicy](#networkpolicy). |

## Deploy script

`./deploy.sh` in the project root builds both images, loads them into the cluster and updates the app. Written for: developers and operators on the local Docker Desktop cluster.

Use it for the first install (after Postgres runs, see [Apply the whole stack](#apply-the-whole-stack)) and for every later change. It replaces the hand-run steps for build, image copy, migrations Job and app apply. It needs Docker, `kubectl`, `git` and the `docker-desktop` context.

```bash
./deploy.sh
```

The script runs from any directory: it changes to the project root first. It stops at the first error (`set -euo pipefail`).

### What it does

1. Prints the kube context and the namespace (`costcompass`). If the context is not `docker-desktop`, it exits with 1 and changes nothing. Other clusters are not supported yet (#188).
2. Computes the image tag (see [The image tag](#the-image-tag)).
3. Builds `costcompass:<tag>` and `costcompass-migrate:<tag>` (`--target migrate`).
4. Copies both images into the cluster node (`docker save` piped into `ctr images import` in the container `desktop-control-plane`, see [Get the images into the cluster](#get-the-images-into-the-cluster)).
5. Deletes the old Job `costcompass-migrate`, applies `k8s/migrate-job.yaml` with the tag and waits until the Job is `Complete`. It checks every 2 s, for at most about 120 s.
6. Applies `k8s/app.yaml` with the tag and waits with `kubectl rollout status` (timeout 120 s).
7. Prints `Deployed costcompass:<tag>`.

### The image tag

The tag is the short git commit hash, for example `ce72c59`. If the working tree has uncommitted changes, the script appends `-dirty-` and the Unix time, for example `ce72c59-dirty-1763100000`.

The suffix changes on every run for a reason: the Deployment uses `imagePullPolicy: IfNotPresent`. With a reused tag, the node would keep the old image and the Deployment would see no change, so the pods would not restart. A new tag changes the pod template, and Kubernetes rolls out the new version.

### Why the manifests contain `IMAGE_TAG`

`k8s/app.yaml` and `k8s/migrate-job.yaml` name the images `costcompass:IMAGE_TAG` and `costcompass-migrate:IMAGE_TAG`. The script replaces the placeholder with `sed "s/IMAGE_TAG/$TAG/"` and pipes the result to `kubectl apply -f -`. A tag derived from the git hash cannot be committed into the file: the hash depends on the file's content, so it would need a second commit. With the placeholder the files never go stale. The real tag is in the cluster:

```bash
kubectl get deployment costcompass -n costcompass -o jsonpath='{..image}'
```

This means `kubectl apply -f k8s/app.yaml` and `kubectl apply -f k8s/migrate-job.yaml` do not work by hand any more. The image `costcompass:IMAGE_TAG` does not exist and the pod does not start. Use `./deploy.sh`. The reasoning is in [decisions.md](decisions.md).

### When something fails

| Step | What happens | State of the cluster |
| --- | --- | --- |
| Build | Docker prints the error, the script exits with a non-zero code. | Untouched. |
| Migration | The script prints the log of the Job (the container `costcompass-migrate`) and exits with 1. Read the error in the log, fix it, run the script again. | The app stays on the old version. |
| Migration timeout | The script prints `The migration did not finish in time` and exits with 1. Check `kubectl get pods -n costcompass`. | The app stays on the old version. |
| Rollout | `kubectl rollout status` ends non-zero after 120 s. Check `kubectl get pods -n costcompass` and the pod log. | Kubernetes keeps the old pods running until the new ones are ready. |

### Roll back

The image of the previous revision is still in the node, so a rollback needs no rebuild. After a clean-up (see [Images pile up](#images-pile-up)) this holds for the last `KEEP` revisions (default 3) only:

```bash
kubectl rollout undo deployment/costcompass -n costcompass
kubectl rollout status deployment/costcompass -n costcompass
```

Database migrations are not rolled back. The old version of the app runs against the new schema.

`kubectl rollout undo --to-revision=<older>` to a revision whose image was cleaned up fails: the node cannot pull the image.

### Images pile up

Every deploy leaves two new images, in Docker and in the node. `deploy.sh` does not remove old ones. Run `./k8s/clean-images.sh` by hand; it keeps the images of the newest `KEEP` Deployment revisions (default 3) and of every pod in the namespace, and removes the other tags of `costcompass` and `costcompass-migrate` from Docker and from the node.

```bash
./k8s/clean-images.sh --dry-run   # always first: lists what would be removed
./k8s/clean-images.sh
```

What is kept, why not by date, the rollback consequence and how much it frees: [Old images pile up](docker.md#old-images-pile-up) (#182).

## Secrets are not encrypted

Kubernetes stores Secret values as base64, which is an encoding, not encryption. Anyone who can read the Secret in the namespace can decode it:

```bash
kubectl get secret costcompass-db -n costcompass -o jsonpath='{.data.POSTGRES_USER}' | base64 -d
```

This is acceptable for a local cluster. Do not reuse these values anywhere else.

## Later additions

- A login (#168). HTTPS is now in front of the app, so a login would not travel in plain text between the browser and the controller.
- Removing old images automatically after a deploy. `./k8s/clean-images.sh` exists (#182) but is run by hand.
- Deploying to a cluster other than `docker-desktop` (#188). Not supported.

## Verification status

Checked on Docker Desktop (context `docker-desktop`): `kubectl apply --dry-run=client -f k8s/` lists three objects; the apply order above creates the ConfigMap with 2 entries and, since #169, the Secret with 6 keys; applying twice is safe.

Postgres (#45), checked on the same cluster:

- Applying the namespace and then the folder (the order before the Job existed) created the pod `postgres-0`, `1/1 Running` after 13 seconds, and the PVC `data-postgres-0`, `Bound`.
- Through the port-forward, `pnpm drizzle-kit migrate` (the Job image used this command then) printed `migrations applied successfully` and created the tables. The local dev database stayed unchanged.
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
- A failing migration (a table `purchases` that existed without being recorded): the Job ended `Failed` with `BackoffLimitExceeded` after 4 pods in 78 s. Each pod exited with code 1 and kept its log. With `drizzle-kit migrate` the log showed no reason; since #176 it does (see the next block).

Migrations Job with the script (#176), checked in a temporary namespace:

- Job on an empty database: `Complete`, tables created.
- Job with a conflicting leftover (`type "recurring_interval" already exists`): `Failed` with `BackoffLimitExceeded`, and the pod log contains the database error.

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

Deploy script (#174), checked on the same cluster:

- A changed locale text reached the running app after one `./deploy.sh` (HTTP check of the page).
- `kubectl rollout undo deployment/costcompass -n costcompass` brought the previous version back, and `/api/ready` answered 200.
- With a deliberately failing migration container, the script exited with 1 at the migration step and printed the log of the Job (`simulated migration failure`). The Deployment stayed on the old image.
- Repeated runs delete and re-run the Job without problems.
- Two runs in a row on a clean working tree gave the same tag (the commit's short SHA). The second run left the Deployment `unchanged`, so no pod restarted, and the Job ran again and completed.
- `bash -n deploy.sh` reports no syntax error.

Not checked: the refusal of a context other than `docker-desktop` (only one context exists here; checked by reading the script), ShellCheck, another cluster, the timeout path of the wait loop.

Image clean-up (#182), checked on the same cluster:

- The dry run listed 25 host and 23 node removals and none of the kept tags. A bug found by the dry run (a leftover variable made the node loop treat every node image as removable) was fixed before the real run.
- The real run removed 48 tags (25 host, 23 node) and left exactly the three kept tags for both images, on the host and in the node (`077dff2`, the running one, and two earlier deploys).
- `/api/ready` answered 200 afterwards. `kubectl rollout undo` to the previous revision worked and a second undo returned to the running version.
- A second run found nothing to remove. `docker system df` reported about 0.6 GB less.

Not checked: `KEEP` with a value other than 3, another cluster (the script refuses other contexts, see #188), a deploy and a clean-up at the same time, images used by pods of other namespaces (only the namespace `costcompass` is looked at).
