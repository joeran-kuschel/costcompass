# Budgetly (Nuxt)

A web app to track household expenses (rent, insurance, appliances, etc.) with an optional business category. On top of the tracked costs, a rate calculator answers: "I have costs of X, how much do I have to earn?" (required annual revenue and minimum hourly rate).

## How we work

- I write most of the code myself and make my own decisions on components, libraries and structure.
- Claude's role is to **guide**: explain concepts, propose next steps, point out options and trade-offs, review my code, help debug.
- Do not write large chunks of code or whole features unless I explicitly ask for it. Small illustrative snippets are fine.
- When a decision is mine to make, lay out the options briefly and let me choose.

## Scope of the first version

- Cost tracking is the main feature: recurring costs (rent, insurance) and one-off purchases (appliances), with categories and an optional business flag
- Totals per period and category, household versus business
- Rate calculator comes later as a separate feature that takes the tracked costs as input
- No accounts yet (single user)
- Data stored in PostgreSQL via Nuxt server routes
- Runs on Kubernetes (Docker Desktop's built-in cluster)
- Bilingual UI: English is the default, German is the second language (`@nuxtjs/i18n`, all text in locale files)
- Income tax for the rate calculator starts as a simple flat rate; the exact German tariff (§32a EStG) comes later as its own step

## Architecture

- **Calculation core:** pure TypeScript functions (inputs in, results out) in `shared/`, covered by Vitest tests running in the Nuxt environment (`@nuxt/test-utils`). Types in `shared/types/`, functions in `shared/utils/`, both auto-imported. No database access and no Vue state in the functions. Can run on client and server.
- **Frontend:** `app/` (pages, components, composables). Only collects input, displays results, talks to the API.
- **API:** Nitro server routes in `server/api/`, the only layer that touches the database.
- **Database:** PostgreSQL, accessed through an ORM or query builder with versioned migrations.
- **i18n:** locale files for `en` and `de`; no hard-coded UI text.
- **Configuration:** connection settings via `runtimeConfig`, overridden by environment variables (e.g. `NUXT_DATABASE_URL`), so the same image runs locally and in the cluster.

## Folder structure

Nuxt 4 defaults. Entries marked *(planned)* do not exist yet.

```
budgetly/
├── app/                      # Client side (the ~ alias points here)
│   ├── app.vue               # Root component (<UApp>, <NuxtLayout>, <NuxtPage>)
│   ├── assets/css/main.css   # Tailwind + Nuxt UI imports
│   ├── components/           # (planned) Reusable Vue components
│   ├── composables/          # (planned) Reusable stateful logic (useXxx)
│   ├── layouts/              # (planned) Page layouts
│   ├── middleware/           # (planned) Client route middleware
│   └── pages/                # (planned) Pages (auto-routing)
├── server/                   # (planned) Nitro server, the only layer touching the DB
│   ├── api/                  # API routes
│   ├── middleware/           # Server middleware
│   └── utils/                # Server utilities (e.g. database client)
├── shared/                   # Code for both app and server (the ~~ alias is the project root)
│   ├── types/                # Types, auto-imported (calculation.ts)
│   └── utils/                # Pure calculation functions, auto-imported (costs.ts)
├── i18n/locales/             # en.json and de.json locale files
├── tests/nuxt/               # Vitest tests, run in the Nuxt environment
├── public/                   # Static files
├── k8s/                      # (planned) Kubernetes manifests
├── Dockerfile                # (planned)
├── nuxt.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── package.json
└── tsconfig.json
```

Import rules: inside `app/` use `~/...`; for files outside `app/` (e.g. `shared/`) use `~~/...`. Only the top level of `shared/types/` and `shared/utils/` is auto-imported, not subfolders. Files in `shared/utils/` import their types explicitly (`import type { ... } from '~~/shared/types/calculation'`) instead of relying on auto-import, because the editor's generated types can lag behind. After adding a new auto-imported file, restart the TS server or run `pnpm dlx nuxt prepare`. The database migrations folder depends on the database access decision (see open decisions).

Tests live in `tests/nuxt/` (the folder the Nuxt TypeScript config includes), one `describe` per function. Test data comes from small helper functions with defaults (`recurring()`, `purchase()`) and a `YEAR` constant, so each test only states what it cares about.

## Cost tracking logic

1. Recurring costs: amount plus interval (monthly, yearly, possibly quarterly), normalized to one period
2. One-off purchases: date and price, counted fully in the year of purchase (spreading over a lifespan is parked, see decisions)
3. Categories (housing, insurance, appliances, etc.) and an optional business flag
4. Totals per period and category, household versus business
5. Monthly overview: `monthlyTotals(recurring, purchases, year)` returns the true cost of each of the 12 months (not an average); purchases land in the month of their date, monthly recurring costs count in every month
6. Monthly breakdown: `costsInMonth(recurring, purchases, year, month)` returns the list of costs that occur in one month as `Cost[]`, so the UI can show recurring costs and purchases clearly apart. `monthlyTotals` and `totalMonthlyCost` are consistent with it (a month's total is the sum of its list).

## Rate calculator (later)

1. Tracked costs as the starting point: household and business costs, annual
2. Social security as a freelancer (health and long-term care insurance, retirement provision, optional unemployment insurance)
3. Income tax on the profit, so the net need is grossed up to a required profit (VAT is passed through and stays out)
4. Buffer and savings (reserves for quiet months, investments)
5. Billable capacity: working days minus vacation, sick days and public holidays, minus the non-billable share (acquisition, admin, learning)
6. Result: required annual revenue ÷ billable hours = minimum hourly rate, with scenarios (e.g. different utilization levels)

## Kubernetes setup (Docker Desktop)

- **App image:** multi-stage Dockerfile, Nuxt built with the `node-server` preset, running `.output/server/index.mjs`
- **App:** Deployment + Service, config via ConfigMap, credentials via Secret, readiness and liveness probes against a health endpoint
- **PostgreSQL:** StatefulSet with a PersistentVolumeClaim + Service (or an operator / Helm chart, see open decisions)
- **Migrations:** run as a Kubernetes Job or init container before the app starts, not on every request
- **Access:** port-forward at first, Ingress later if needed
- **Local development:** `nuxt dev` against Postgres in the cluster (via port-forward) or a separate local container

## Roadmap

1. **Setup:** Nuxt project, tooling, folder structure
2. **Cost model and core:** types and pure functions with tests for recurring costs, purchases, categories and totals; no UI, no DB
3. **i18n setup:** `@nuxtjs/i18n` configured with `en` and `de`
4. **Database:** Postgres locally, schema, migrations, data access layer
5. **API:** server routes for costs and categories
6. **UI:** forms to add and edit costs, lists, totals per category and period
7. **Containerization:** Dockerfile, build and run the image locally
8. **Kubernetes:** manifests for Postgres and app, secrets, migrations job, health checks
9. **Rate calculator:** costs in, required revenue and minimum hourly rate out, with scenarios (utilization, vacation, savings goal)
10. **Real income tax:** §32a EStG tariff instead of a flat rate
11. **Polish:** accessibility review, prerendered info pages, optional Ingress

## Tech

- Nuxt 4, TypeScript
- Nuxt UI (`@nuxt/ui`, Tailwind CSS)
- `@nuxtjs/i18n` for the bilingual UI
- Vitest with `@nuxt/test-utils` for the calculation core (tests in `tests/`)
- `@nuxt/eslint` for linting
- PostgreSQL
- Docker Desktop Kubernetes
- Accessibility matters: proper labels, error messages and focus handling in all forms

## Decisions made

- Cost model: a shared base `CostItem` (name, amount, category, business) in `shared/types/calculation.ts`; `RecurringCost` extends it with an interval (monthly, yearly), `Purchase` extends it with a date (ISO string, `YYYY-MM-DD`)
- Category: a fixed list, `CATEGORIES` as a `const` array with `Category` derived from it. Ids are English; display names come from the locale files. The database stores the category as text (optionally with a check or enum), and the server validates against `CATEGORIES`. User-defined categories would need a table instead.
- Dates and years: years are passed to functions as numbers, never read from "today" inside the core. Years of ISO dates are read in UTC (`getUTCFullYear`) so results do not depend on the time zone.
- Depreciation is parked for now (tricky to get right). A purchase counts fully in the year it was bought, which is also how a household thinks. Later, an optional lifespan can spread the price over several years (mostly a business concept), with the detailed German rules (AfA, thresholds for low-value assets).
- Business: a boolean flag on an item, not a category
- Money: plain euro numbers, no integer cents
- Database access: Drizzle (TypeScript schema, no code generation, `drizzle-kit` for migrations). The `CATEGORIES` array is reused for the category column so the list lives in one place.
- i18n: `@nuxtjs/i18n` with `en` (default) and `de`, strategy `prefix_except_default` (English at `/`, German at `/de/...`). Locale files are `i18n/locales/en.json` and `de.json`; category and interval names are keyed by their ids (`category.housing`, `interval.monthly`).
- `RecurringCost` and `Purchase` each carry a `kind` discriminant (`'recurring'` / `'purchase'`), and `type Cost = RecurringCost | Purchase`. No separate entry type for the monthly list. Test helpers set `kind` by default.
- Yearly and quarterly recurring costs get a `dueMonth` (1-12), a month only, not a full date. A yearly cost falls in that month every year; a quarterly cost starts in that month and repeats every 3 months (`dueMonth: 2` means February, May, August, November). `'quarterly'` is added to `Interval` (`PERIODS_PER_YEAR` gets `quarterly: 4`). `MONTHS` and `Month` are derived from a const array. `RecurringCost` is a union type: a monthly cost has no `dueMonth`, a yearly or quarterly cost must have one (the compiler enforces it). Currently `dueMonth?: Month` is still optional until the union is in place.
- With the union type a yearly or quarterly cost always has a `dueMonth`. Data that reaches the core without one (untyped input, old rows) is skipped in the monthly views (`monthlyTotals`, `costsInMonth`) but still counts in the annual totals, so the API must validate that `dueMonth` is present for those intervals.

## Open decisions

- Depreciation: optional lifespan for purchases, evenly spread or per AfA rules (parked)
- Start and end dates for recurring costs (can wait)
- Time handling: how dates and periods (month, year) are represented and queried (months are 1-12 in the API, array index 0 = January in `monthlyTotals`)
- Currency: euro only, or configurable
- State handling: plain composables or Pinia
- Postgres in k8s: own StatefulSet manifests, Helm chart, or an operator like CloudNativePG
- Manifest management: plain YAML, Kustomize or Helm

## Current status

Steps 1-3 are done: Nuxt 4 with Nuxt UI, Vitest and `@nuxtjs/i18n` configured (English and German), and the cost core in `shared/` is complete with 43 passing tests: annual totals (`totalAnnualRecurring`, `totalAnnualPurchases`, `totalAnnualCost`), `totalsByCategory`, `filterByBusiness`, and the monthly views (`occursInMonth`, `totalMonthlyCost`, `monthlyTotals`, `costsInMonth`). Next: the database (step 4) and the API (step 5). Still open: the `RecurringCost` union type (`dueMonth` required for yearly and quarterly, absent for monthly), the database access tool, and the rate calculator (later). ESLint currently crashes because `typescript-eslint` does not support TypeScript 7; `pnpm add -D typescript@6` would fix it (cosmetic, not urgent).
