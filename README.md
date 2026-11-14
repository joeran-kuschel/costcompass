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

1. Build the image and copy it into the cluster. The cluster does not see your local Docker images, so the second command is required after every rebuild:

   ```bash
   docker build -t costcompass:0.1.0 .
   docker save costcompass:0.1.0 | docker exec -i desktop-control-plane ctr -n k8s.io images import -
   ```

2. Create the Secret from the template, then replace every `change-me` (the password appears twice and must be identical):

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

3. Apply the namespace first, then everything else:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/
   ```

4. Apply the database migrations once. When `kubectl get pods -n costcompass` shows `postgres-0` as `1/1 Running`, forward the Postgres port in a second terminal and run the migrations from the project (the password is the one from `k8s/secret.yaml`). Stop the forward with Ctrl-C afterwards:

   ```bash
   kubectl port-forward -n costcompass svc/postgres 5435:5432
   ```

   ```bash
   NUXT_DATABASE_URL="postgresql://costcompass:PASSWORD@localhost:5435/costcompass" pnpm drizzle-kit migrate
   ```

5. When the `costcompass-…` pod is `1/1 Running` too, open the app:

   ```bash
   kubectl port-forward -n costcompass svc/costcompass 3001:3000
   ```

   Open `http://localhost:3001`.

More, including the probes, troubleshooting and what was checked: [Kubernetes](documentation/backend/kubernetes.md).

## Documentation

- [User guide](documentation/frontend/user-guide.md): how to use the app
- [Frontend](documentation/frontend/index.md): pages, components, design
- [Backend and development](documentation/backend/index.md): architecture, API, database, tests

## Status

In development. Cost tracking and its UI work. A Docker image and Kubernetes manifests (Postgres, app, probes) run on Docker Desktop's cluster. The migrations Job, HTTPS and a login are planned.

## License

[MIT](LICENSE)
