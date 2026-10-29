# Rate Calculator (Nuxt)

A web app for freelancers in Germany: track private and business cost of living, then calculate the required annual revenue and the minimum hourly rate.

## How we work

- I write most of the code myself and make my own decisions on components, libraries and structure.
- Claude's role is to **guide**: explain concepts, propose next steps, point out options and trade-offs, review my code, help debug.
- Do not write large chunks of code or whole features unless I explicitly ask for it. Small illustrative snippets are fine.
- When a decision is mine to make, lay out the options briefly and let me choose.

## Scope of the first version

- Calculator, no accounts yet
- Data stored in PostgreSQL via Nuxt server routes
- Runs on Kubernetes (Docker Desktop's built-in cluster)
- German UI
- Income tax starts as a simple flat rate; the exact German tariff (§32a EStG) comes later as its own step

## Architecture

- **Calculation core:** independent of Vue, Nuxt and the database. Pure TypeScript functions (inputs in, results out) in `shared/`, covered by Vitest tests. Can run on client and server.
- **Frontend:** `app/` (pages, components, composables). Only collects input, displays results, talks to the API.
- **API:** Nitro server routes in `server/api/`, the only layer that touches the database.
- **Database:** PostgreSQL, accessed through an ORM or query builder with versioned migrations.
- **Configuration:** connection settings via `runtimeConfig`, overridden by environment variables (e.g. `NUXT_DATABASE_URL`), so the same image runs locally and in the cluster.

## Calculation chain

1. Private cost of living, monthly and annual items normalized to one period (including reserves for irregular costs)
2. Business costs (hardware, software, workspace, accountant, insurance)
3. Social security as a freelancer (health and long-term care insurance, retirement provision, optional unemployment insurance)
4. Income tax on the profit, so the net need is grossed up to a required profit (VAT is passed through and stays out)
5. Buffer and savings (reserves for quiet months, investments)
6. Billable capacity: working days minus vacation, sick days and public holidays, minus the non-billable share (acquisition, admin, learning)
7. Result: required annual revenue ÷ billable hours = minimum hourly rate, with scenarios (e.g. different utilization levels)

## Kubernetes setup (Docker Desktop)

- **App image:** multi-stage Dockerfile, Nuxt built with the `node-server` preset, running `.output/server/index.mjs`
- **App:** Deployment + Service, config via ConfigMap, credentials via Secret, readiness and liveness probes against a health endpoint
- **PostgreSQL:** StatefulSet with a PersistentVolumeClaim + Service (or an operator / Helm chart, see open decisions)
- **Migrations:** run as a Kubernetes Job or init container before the app starts, not on every request
- **Access:** port-forward at first, Ingress later if needed
- **Local development:** `nuxt dev` against Postgres in the cluster (via port-forward) or a separate local container

## Roadmap

1. **Setup:** Nuxt project, tooling, folder structure
2. **Calculation core:** pure functions with tests, no UI, no DB
3. **Database:** Postgres locally, schema, migrations, data access layer
4. **API:** server routes for costs, settings and scenarios
5. **UI:** input forms, results, live updates
6. **Containerization:** Dockerfile, build and run the image locally
7. **Kubernetes:** manifests for Postgres and app, secrets, migrations job, health checks
8. **Scenarios:** compare variants (utilization, vacation, savings goal)
9. **Real income tax:** §32a EStG tariff instead of a flat rate
10. **Polish:** accessibility review, prerendered info pages, optional Ingress

## Tech

- Nuxt 4, TypeScript
- Vitest for the calculation core
- `@nuxt/eslint` for linting
- PostgreSQL
- Docker Desktop Kubernetes
- Accessibility matters: proper labels, error messages and focus handling in all forms

## Open decisions

- UI library: Nuxt UI, plain Tailwind with own components, or none
- State handling: plain composables or Pinia
- Database access: Drizzle, Prisma, Kysely or plain SQL
- Postgres in k8s: own StatefulSet manifests, Helm chart, or an operator like CloudNativePG
- Manifest management: plain YAML, Kustomize or Helm

## Current status

Step 1 (setup) not started yet.
