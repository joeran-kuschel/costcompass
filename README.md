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

1. Build both images (app and migrations) and copy them into the cluster. The cluster does not see your local Docker images, so the load commands are required after every rebuild:

   ```bash
   docker build -t costcompass:0.1.0 .
   docker build --target migrate -t costcompass-migrate:0.1.0 .
   docker save costcompass:0.1.0 | docker exec -i desktop-control-plane ctr -n k8s.io images import -
   docker save costcompass-migrate:0.1.0 | docker exec -i desktop-control-plane ctr -n k8s.io images import -
   ```

2. Create the Secret from the template, then replace every `change-me`. There are two passwords and they must differ: the owner password (in `POSTGRES_PASSWORD` and `MIGRATE_DATABASE_URL`) and the app user password (in `APP_DB_PASSWORD` and `NUXT_DATABASE_URL`). Each appears twice and must be identical:

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

3. Add the host name to `/etc/hosts` once (needs `sudo`):

   ```bash
   printf '127.0.0.1 costcompass.local\n::1 costcompass.local\n' | sudo tee -a /etc/hosts
   ```

4. Apply in this order: namespace, configuration and database access rules, Postgres, the migrations Job, the app, the certificate, the Ingress. Do not use `kubectl apply -f k8s/`; it would start the app before the migrations are done.

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

   Create the certificate Secret once (needs [mkcert](https://github.com/FiloSottile/mkcert) with its CA installed, `mkcert -install`), then apply the Ingress:

   ```bash
   D=$(mktemp -d)
   mkcert -cert-file $D/tls.crt -key-file $D/tls.key costcompass.local
   kubectl create secret tls costcompass-tls --cert=$D/tls.crt --key=$D/tls.key -n costcompass
   rm -rf $D
   kubectl apply -f k8s/ingress.yaml
   ```

5. When the `costcompass-…` pod is `1/1 Running`, open `https://costcompass.local` (`http://` redirects to it).

The shared nginx controller listens on all network interfaces, and the app has no login yet. HTTPS encrypts the traffic but does not keep anyone out. Use this only on a network you trust. Without the Ingress, `kubectl port-forward -n costcompass svc/costcompass 3001:3000` (localhost only) works too.

The app connects as the restricted database user `costcompass_app`, and a NetworkPolicy lets only the app and the migrations Job reach Postgres. To upgrade an existing installation, see [Database access](documentation/backend/kubernetes.md#database-access).

More, including the probes, troubleshooting and what was checked: [Kubernetes](documentation/backend/kubernetes.md).

## Documentation

- [User guide](documentation/frontend/user-guide.md): how to use the app
- [Frontend](documentation/frontend/index.md): pages, components, design
- [Backend and development](documentation/backend/index.md): architecture, API, database, tests

## Status

In development. Cost tracking and its UI work. A Docker image and Kubernetes manifests (Postgres, migrations Job, app, probes) run on Docker Desktop's cluster. HTTPS and a login are planned.

## License

[MIT](LICENSE)
