# Costcompass

Track your household and business costs in one place and see what they add up to.

Costcompass records recurring costs (rent, insurance) and one-off costs (appliances), sorted by category and optionally marked as business. It then shows the totals per year, month and category, and the split between household and business.

## Features

- Recurring costs (monthly, quarterly, yearly) and one-off costs
- Categories and a household/business split
- Dashboard for the year, a costs table with search and filters, and a page for every month
- English and German UI, light and dark mode
- Keyboard and screen reader support

## Tech stack

Nuxt 4, Nuxt UI, `@nuxtjs/i18n`, Drizzle ORM, PostgreSQL, Vitest.

## Quick start

You need Node.js, [pnpm](https://pnpm.io) and a running PostgreSQL.

```bash
pnpm install
```

Create a `.env` file in the project root with the database URL:

```bash
NUXT_DATABASE_URL=postgres://user:password@localhost:5432/costcompass
```

```bash
pnpm drizzle-kit migrate
pnpm dev
```

Open `http://localhost:3000`. Run the tests with `pnpm vitest run` (no database needed).

Details, including a PostgreSQL container example: [Get started](documentation/backend/getting-started.md).

## Run on Kubernetes

For the Kubernetes built into Docker Desktop. You need Docker, `kubectl` and the `docker-desktop` context.

1. Create the Secret from the template, then replace every `change-me`. There are two passwords and they must differ: the owner password (in `POSTGRES_PASSWORD` and `MIGRATE_DATABASE_URL`) and the app user password (in `APP_DB_PASSWORD` and `NUXT_DATABASE_URL`). Each appears twice and must be identical:

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

2. Add the host name to `/etc/hosts` once (needs `sudo`):

   ```bash
   printf '127.0.0.1 costcompass.local\n::1 costcompass.local\n' | sudo tee -a /etc/hosts
   ```

3. Apply in this order: namespace, configuration and database access rules, Postgres, then `./deploy.sh` (builds both images, copies them into the cluster, runs the migrations Job, updates the app), then the certificate and the Ingress. Do not use `kubectl apply -f k8s/`; it would start the app before the migrations are done.

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml -f k8s/secret.yaml -f k8s/db-roles.yaml -f k8s/network-policy.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl rollout status statefulset/postgres -n costcompass
   ./deploy.sh
   ```

   Run `./deploy.sh` again after every change. Do not apply `k8s/app.yaml` or `k8s/migrate-job.yaml` by hand: they contain the placeholder `IMAGE_TAG`, which the script fills in. It works only with the `docker-desktop` context. Every deploy leaves two more images; remove old ones with `./k8s/clean-images.sh --dry-run`, then `./k8s/clean-images.sh` (see [Old images pile up](documentation/backend/docker.md#old-images-pile-up)).

   Create the certificate Secret once (needs [mkcert](https://github.com/FiloSottile/mkcert) with its CA installed, `mkcert -install`), then apply the Ingress:

   ```bash
   D=$(mktemp -d)
   mkcert -cert-file $D/tls.crt -key-file $D/tls.key costcompass.local
   kubectl create secret tls costcompass-tls --cert=$D/tls.crt --key=$D/tls.key -n costcompass
   rm -rf $D
   kubectl apply -f k8s/ingress.yaml
   ```

4. When the `costcompass-…` pod is `1/1 Running`, open `https://costcompass.local` (`http://` redirects to it).

The shared nginx controller listens on all network interfaces, and the app has no login yet. HTTPS encrypts the traffic but does not keep anyone out. Use this only on a network you trust. Without the Ingress, `kubectl port-forward -n costcompass svc/costcompass 3001:3000` (localhost only) works too.

The app connects as the restricted database user `costcompass_app`, and a NetworkPolicy lets only the app and the migrations Job reach Postgres. To upgrade an existing installation, see [Database access](documentation/backend/kubernetes.md#database-access).

Back up the database with `./k8s/backup-db.sh` (files go to `~/costcompass-backups`) and restore with `./k8s/restore-db.sh <file>`; see [Backup and restore](documentation/backend/kubernetes.md#backup-and-restore).

More, including the deploy script, rollback, the probes, troubleshooting and what was checked: [Kubernetes](documentation/backend/kubernetes.md).

## Documentation

- [User guide](documentation/frontend/user-guide.md): how to use the app
- [Frontend](documentation/frontend/index.md): pages, components, design
- [Backend and development](documentation/backend/index.md): architecture, API, database, tests

## Status

In development. Cost tracking and its UI work. A Docker image and Kubernetes manifests (Postgres, migrations Job, app, probes) run on Docker Desktop's cluster. HTTPS and a login are planned.

## License

[MIT](LICENSE)
