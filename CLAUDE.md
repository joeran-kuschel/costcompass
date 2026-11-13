# Costcompass (Nuxt)

A web app to track household expenses (rent, insurance, appliances, etc.) with an optional business category. On top of the tracked costs, a rate calculator answers: "I have costs of X, how much do I have to earn?" (required annual revenue and minimum hourly rate).

## How we work

- I write most of the code myself and make my own decisions on components, libraries and structure.
- Claude's role is to **guide**: explain concepts, propose next steps, point out options and trade-offs, review my code, help debug.
- Do not write large chunks of code or whole features unless I explicitly ask for it. Small illustrative snippets are fine.
- When a decision is mine to make, lay out the options briefly and let me choose.

### Fixed rules

- **Think before you make suggestions** Do not propose any code changes that turn out to be wrong or refactored later
- **I write the code, not you** Only write code when you are specifically asked to do so
- **Be precise** If asked a simple question, answer that question. Do not do a full code review or explain the universe like you tend to do
- **Every feature goes into its own branch.** Nothing is built or committed directly on `main`; the branch is merged through a pull request.
- **Documentation comes before the pull request.** A pull request is only created once the documentation for its feature is written (in `documentation/`, in `frontend/` or `backend/`). The pull request text names the documentation that belongs to it.

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

Nuxt 4 defaults. Entries marked *(planned)* do not exist yet. The details of `app/` are in [`documentation/frontend/app-structure.md`](documentation/frontend/app-structure.md) (components, composables), those of `server/` and `shared/` in [`documentation/backend/architecture.md`](documentation/backend/architecture.md).

```
costcompass/
├── app/                      # Client side (the ~ alias points here)
│   ├── app.vue               # Root component; error.vue is the error page
│   ├── assets/css/main.css   # Tailwind and Nuxt UI imports, the Cobalt colour scheme (light and dark)
│   ├── components/           # Reusable Vue components (CostForm, CostGroups, YearSelect, LanguageSwitcher, MobileBar, badges, CategoryList, SplitList, LogoMark, DashboardSkeleton)
│   ├── composables/          # Reusable stateful logic (useXxx): money (useMoney, useMoneyParts), year, year summary (useYearSummary), month, month summary (useMonthSummary), cost lists, cost dialog, category, kind (useKind), nav items, app head
│   ├── layouts/              # Page layouts (default.vue: sidebar, tab bar, the one add/edit dialog)
│   ├── middleware/           # (planned) Client route middleware
│   └── pages/                # Pages (auto-routing): index.vue (dashboard), costs.vue, months/[year]/[month].vue
├── server/                   # Nitro server, the only layer touching the DB
│   ├── api/                  # API routes: recurring-costs/ and purchases/ (index.get/post, [id].patch/delete), health.get.ts and ready.get.ts (liveness and readiness)
│   ├── db/                   # Drizzle schema and migrations
│   ├── middleware/           # (planned) Server middleware
│   └── utils/                # Server utilities (db.ts client, costs.ts queries and row mappers)
├── shared/                   # Code for both app and server (the ~~ alias is the project root)
│   ├── types/                # Types, auto-imported (calculation.ts)
│   └── utils/                # Pure functions, auto-imported (costs.ts, validation.ts, dates.ts)
├── i18n/locales/             # en.json and de.json locale files
├── tests/nuxt/               # Vitest tests, run in the Nuxt environment
├── public/                   # Static files: favicons, app icons, manifest.webmanifest
├── k8s/                      # (planned) Kubernetes manifests
├── Dockerfile                # Three stages: build, migrate (`--target migrate`), runtime; see documentation/backend/docker.md
├── .dockerignore             # Keeps node_modules, .env, .git and similar out of the build
├── nuxt.config.ts
├── vitest.config.ts
├── eslint.config.mjs
├── package.json
└── tsconfig.json
```

Import rules: inside `app/` use `~/...`; for files outside `app/` (e.g. `shared/`) use `~~/...`. Only the top level of `shared/types/` and `shared/utils/` is auto-imported, not subfolders. Files in `shared/utils/` import their types explicitly (`import type { ... } from '~~/shared/types/calculation'`) instead of relying on auto-import, because the editor's generated types can lag behind. If Nuxt's auto-import misses a value from `shared/types/`, import it explicitly (`import { INTERVALS } from '~~/shared/types/calculation'` in `CostForm`: Nuxt registered `CATEGORIES` and `MONTHS` but not `INTERVALS`, #76). After adding a new auto-imported file, restart the TS server or run `pnpm dlx nuxt prepare`.

Order inside `<script setup>` in `.vue` files, top to bottom:

1. imports
2. local types
3. plain constants (`EMPTY_BADGES`)
4. `defineProps`, `defineEmits`, `defineModel`
5. consts from `use...` calls and `resolveComponent` (`useI18n`, `useCostLists`, `useTemplateRef`, ...)
6. `ref` and `reactive`
7. `computed`
8. statements that run at setup: `watch`, `useHead`, `useAppHead`, initial values
9. functions, `async` ones first, then the others

Keep a const above whatever reads it at setup time. A check that must run before any data is requested (the address check on the month page) stays first, right after `useRoute()`.

Order inside a util file (`shared/utils/`, `server/utils/`), top to bottom:

1. imports (values, then `import type`)
2. file-level constants
3. private helpers (not exported)
4. exported functions in groups, each under a short `// Section` comment; inside a group a function that others call sits above the ones that call it
5. database functions in the order list, create, update, delete (recurring cost, then purchase), and schemas in the order create, patch, params, each schema directly followed by its inferred type

Tests live in `tests/nuxt/` (the folder the Nuxt TypeScript config includes), one `describe` per function. Test data comes from small helper functions with defaults (`recurring()`, `purchase()`) and a `YEAR` constant, so each test only states what it cares about. In this project `$fetch` is an auto-import, so a component test mocks it with `mockNuxtImport('$fetch', ...)` (`vi.stubGlobal` has no effect); that mock also replaces what `useFetch` uses, so page tests register fake API endpoints with `registerEndpoint`. `UForm` validates asynchronously, so tests wait with `vi.waitFor`. What each test file checks and how it is set up: [`documentation/backend/testing.md`](documentation/backend/testing.md) (core and server) and [`documentation/frontend/testing.md`](documentation/frontend/testing.md) (pages, components, composables).

## Cost tracking logic

One or two lines per function; the full behaviour (rounding, edge cases) is in [`documentation/backend/calculation-core.md`](documentation/backend/calculation-core.md).

1. Recurring costs: amount plus interval (monthly, quarterly, yearly), normalized to one period
2. One-off purchases: date and price, counted fully in the year of purchase (spreading over a lifespan is parked, see decisions)
3. Categories (housing, insurance, appliances, etc.) and an optional business flag
4. Totals per period and category, household versus business
5. `monthlyTotals(recurring, purchases, year)`: the true cost of each of the 12 months (not an average)
6. `costsInMonth(recurring, purchases, year, month)`: the costs of one month, recurring first, then purchases; generic, so stored items keep their `id`. A month's total is the sum of its list.
7. `annualSummary(recurring, purchases, year)`: `{ total, household, business, averagePerMonth }`; household plus business equals the total by construction
8. `categoryBreakdown(recurring, purchases, year)`: one `{ category, total, share, percent }` per category, largest first; `percent` adds up to exactly 100 (largest-remainder rounding); `share` is no longer read by the dashboard
9. `splitPercentages(summary)`: whole percentages for household and business, always adding up to 100
10. `monthBreakdown(recurring, purchases, year)`: one `{ month, total, share }` per month in calendar order
11. `monthChange(recurring, purchases, year, month)`: `{ current, previous, percent }`; `percent` is `null` when the previous month cost nothing; "today" is passed in, never read
12. `monthNeighbours({ year, month }, validYears)`: the previous and next month; a neighbour in a year that is not valid is `null`
13. `groupMonthCosts(costs)`: splits `costsInMonth` into `recurring` and `purchases` with subtotals and the `total`; generic
14. `largestCosts(costs, n = 4)`: the `n` largest costs, largest first, with a fixed tie order; generic, does not change its input
15. `monthSummary(recurring, purchases, year, month)`: one month in one call, `{ costs, groups, change, largest, empty, count, businessCount, businessTotal, householdTotal, categories }` from the functions above; `householdTotal` is the total minus `businessTotal`, as in `annualSummary`; generic, keeps ids. The UI reads it through `useMonthSummary()`
16. `monthCategoryTotals(costs)`: `{ category, total }` per category of a month's list from `costsInMonth`, categories with 0 left out, largest first (equal totals in `CATEGORIES` order); not the yearly `totalsByCategory`/`categoryBreakdown`, which use annual amounts

## Rate calculator (later)

1. Tracked costs as the starting point: household and business costs, annual
2. Social security as a freelancer (health and long-term care insurance, retirement provision, optional unemployment insurance)
3. Income tax on the profit, so the net need is grossed up to a required profit (VAT is passed through and stays out)
4. Buffer and savings (reserves for quiet months, investments)
5. Billable capacity: working days minus vacation, sick days and public holidays, minus the non-billable share (acquisition, admin, learning)
6. Result: required annual revenue ÷ billable hours = minimum hourly rate, with scenarios (e.g. different utilization levels)

## Pages and views

The detail of every page (sections, states, class names, sizes, locale keys, accessibility, what was checked and what was not) is in [`documentation/frontend/app-structure.md`](documentation/frontend/app-structure.md). Here only the route, the file, the purpose and the states. **Read the linked section before you change a page, and update it with the change.**

Pages for now:

1. `/` **Dashboard** (`app/pages/index.vue`): the year at a glance. Sections in order: the "This month" hero card next to "Largest this month", "Your year" (summary tiles with the year select), "Where your money goes" (categories) next to "Household and business" (ring), and "Month by month" (12 links to the month pages). States: loading skeleton, error card with retry, empty card, loaded. Everything comes from the `shared/` core, no API routes of its own. "This month", "Largest this month" and the highlighted month always use today, whatever year is selected. Read [Page states](documentation/frontend/app-structure.md#page-states) and the dashboard sections below it (from [the hero card](documentation/frontend/app-structure.md#the-hero-card-this-month) to [Year fallback](documentation/frontend/app-structure.md#year-fallback-on-the-dashboard)) before changing this page.
2. `/costs` (`app/pages/costs.vue`): a summary line under the heading (counts of all costs and the total of the shown year, #80), kind filter chips All, Recurring and One-off with counts of all costs, shown from `sm` (#82), category filter chips (single selection, click again to clear), a search field over the name and the translated category, behind a round search button on phones (#81), and a no-match card with "Show all costs" instead of the table (#83, #81), and one sortable table of recurring and one-off costs together, with edit and delete per row; after a delete the focus moves to the row button at the same position, the row above for the last row, or the heading when no cost is left (#6); a change of the sort order is announced to screen readers by a hidden status text (#9); below `sm` the table is replaced by grouped lists per kind with an actions menu per row (`CostGroups`, #86); the sidebar button is the only add entry. It has no loading or error state yet (known limit). Read [Costs page](documentation/frontend/app-structure.md#costs-page) before changing it.
3. `/months/[year]/[month]` **Month page** (`app/pages/months/[year]/[month].vue`): the costs of one month and its total, previous and next month links, an empty-month card with an "Add cost to <month>" button and the hint where a new one-off cost starts (#79), and a "By category" card (aside, right of the lists from `lg`, below them on phones, not shown for an empty month). The year is in the URL; the month is always two digits (`/months/2026/03`), anything else gives the 404. States: loading, failed, empty month, loaded. Read [Month page](documentation/frontend/app-structure.md#month-page) before changing it.
4. `/calculator`: later (roadmap step 9), not part of the first UI.

Not a route: `app/error.vue` is Nuxt's error page (404, generic and a month variant thrown by the month page). Read [Error page](documentation/frontend/app-structure.md#error-page).

Views that are not pages:

- **Add/edit form:** one modal (`UModal`) rendered once by `layouts/default.vue`, not its own routes and not one per page. Its state lives in `useCostDialog()` (`openAdd(month?)`, `openEdit(cost)`, `close()`). One form component, `components/CostForm.vue`, for adding and editing both kinds of cost, validated with the Zod schemas: amount first, segmented Type and Interval, category chips, translated inline errors with focus on the first invalid field (Cobalt, #87-#91, #93, #94); a failed save shows a `role="alert"` banner at the top of the form instead of a toast, keeping the input (#95). A successful add, edit or delete shows a toast with the cost's name ("<name> saved", "<name> deleted"), announced to screen readers without moving focus (#8); the saved message has an Undo button (#99). Read [Add and edit dialog](documentation/frontend/app-structure.md#add-and-edit-dialog) and [Cost form](documentation/frontend/app-structure.md#cost-form).

Shared structure:

- **Layout** (`layouts/default.vue`): from `lg` (1024 px) a sidebar (logo, "Add cost", navigation, language select); below `lg` a bottom tab bar (`MobileBar`) with a round add button, and a compact language button at the top right. Skip link and `id="main"` for the content. Read [Sidebar navigation](documentation/frontend/app-structure.md#sidebar-navigation) and [Bottom tab bar](documentation/frontend/app-structure.md#bottom-tab-bar).
- **Selected year:** stored in `useYear()` and shared by the dashboard and the costs page, because the core takes the year as a parameter. `useYearSummary()` turns it into the shown year (with the year fallback, #30) and its totals, so the dashboard and the costs page summary line name the same year (#80); the costs table itself shows all costs. Month pages take their year from the URL instead. See [Dashboard money and year](documentation/frontend/decisions.md#dashboard-money-and-year).
- **Page titles:** `app.vue` sets a title template ("<page> – Costcompass"); every page sets its own translated title with `useHead({ title: () => t('...') })`. The head setup lives in `useAppHead()`, shared by `app.vue` and `error.vue`; `<NuxtRouteAnnouncer />` announces the title after a navigation. See [Texts and languages](documentation/frontend/app-structure.md#texts-and-languages). New pages follow the same pattern.
- Labels that go through `t()` in script code must be wrapped in `computed` so they update when the language changes.
- Not needed yet: login (single user), settings.

## Kubernetes setup (Docker Desktop)

- **App image:** multi-stage Dockerfile, Nuxt built with the `node-server` preset, running `.output/server/index.mjs`; build and run: [`documentation/backend/docker.md`](documentation/backend/docker.md)
- **App:** Deployment + Service, config via ConfigMap, credentials via Secret, readiness and liveness probes against a health endpoint (`/api/health`, `/api/ready`: [`documentation/backend/health.md`](documentation/backend/health.md))
- **PostgreSQL:** StatefulSet with a PersistentVolumeClaim + Service (or an operator / Helm chart, see open decisions)
- **Migrations:** run as a Kubernetes Job or init container before the app starts, not on every request; the image is the `migrate` target of the Dockerfile, see [`documentation/backend/docker.md`](documentation/backend/docker.md#migrations)
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

Architecture and data decisions, in short. The details and reasons are in [`documentation/backend/decisions.md`](documentation/backend/decisions.md#details-of-the-architecture-and-data-decisions). The design and dashboard decisions are in [`documentation/frontend/decisions.md`](documentation/frontend/decisions.md) (see the pointers at the end of this section).

- Cost model: a shared base `CostItem` (name, amount, category, business) in `shared/types/calculation.ts`; `RecurringCost` adds an interval, `Purchase` adds a date (ISO string, `YYYY-MM-DD`)
- Category: a fixed list, `CATEGORIES` as a `const` array with `Category` derived from it. Ids are English, display names come from the locale files; the server validates against `CATEGORIES`
- Dates and years: years are passed to functions as numbers, never read from "today" inside the core. Years of ISO dates are read in UTC (`getUTCFullYear`)
- Depreciation is parked. A purchase counts fully in the year it was bought
- Business: a boolean flag on an item, not a category
- Money: plain euro numbers, no integer cents
- Database access: Drizzle (TypeScript schema, no code generation, `drizzle-kit` for migrations); `CATEGORIES` is reused for the category column
- i18n: `@nuxtjs/i18n` with `en` (default) and `de`, strategy `no_prefix`; locale detected from the browser on the first visit, a manual choice is stored in a cookie; `setLocale()` instead of navigating; `app.vue` (through `useAppHead()`) sets `<html lang>` and `dir`
- `RecurringCost` and `Purchase` each carry a `kind` discriminant (`'recurring'` / `'purchase'`), and `type Cost = RecurringCost | Purchase`. Test helpers set `kind` by default
- Yearly and quarterly recurring costs get a `dueMonth` (1-12). A quarterly cost starts in that month and repeats every 3 months. `dueMonth?: Month` is still optional in the type until the union type is in place (then required for yearly and quarterly, absent for monthly). Data without it is skipped in the monthly views but counts in the annual totals, so the API must validate it
- API: REST routes per resource, `GET`/`POST` on `/api/<resource>` and `PATCH`/`DELETE` on `/api/<resource>/[id]`. Routes stay thin: validate with Zod, call a function in `server/utils/costs.ts`, return the result. All schemas live in `shared/utils/validation.ts`. List routes return rows ordered by `id`
- Status codes: invalid input 400 (Zod issues in the body), unknown id 404, successful `DELETE` 204 without a body, `PATCH` returns the updated item with 200
- PATCH: the body is a partial of the create fields, an empty patch is rejected. For recurring costs `updateRecurringCost` merges the patch into the stored row, validates the result (400 if invalid) and writes `dueMonth: null` when the result is monthly
- Row ids in the UI: the core types have no `id`; data from the API is typed with `Stored<T> = T & { id: number }` (implemented in `shared/types/calculation.ts`)

Design and dashboard decisions (details in [`documentation/frontend/decisions.md`](documentation/frontend/decisions.md)):

- Dashboard money and year: whole euros on the dashboard, cents for the "This month" subtotals; today is read once in `useYear()`; year fallback #30. See [Dashboard money and year](documentation/frontend/decisions.md#dashboard-money-and-year)
- Colour scheme (#50, open): Cobalt, applied by CSS variables in `main.css`; steps 1 to 3 (colours, type and shape, category badges) are done, step 4 (components and layouts per mock) is in progress. See [Colour scheme](documentation/frontend/decisions.md#colour-scheme-50-steps-1-to-3) and [`colour-scheme.md`](documentation/frontend/colour-scheme.md)
- Category badge (#51): a disc with a white icon, the author keeps the mock's dark-mode mobility colour (4.10:1). See [Category badge](documentation/frontend/decisions.md#category-badge-51)
- Months chart colours (#69): `--chart-soft` is below 3:1 in light mode, kept by the author. See [Months chart colours](documentation/frontend/decisions.md#months-chart-colours-69)
- Favicon and manifest (#58): static icon set and manifest, not an installable app. See [Favicon and manifest](documentation/frontend/decisions.md#favicon-and-manifest-58)
- Bars and charts: hand-built, every value is real text, no chart library for now. See [Bars and charts](documentation/frontend/decisions.md#bars-and-charts)
- Kind label (#2): the purchase kind reads "One-off"/"Einmalig" in the UI; keys, `kind: 'purchase'`, the `Purchase` type, `/api/purchases` and the `purchases` table are unchanged; the mocks still say "Purchase". See [Kind label "One-off"](documentation/frontend/decisions.md#kind-label-one-off-2)
- Focus after a delete (#6): the focus keeps the row position (next row's button, the row above for the last row, the `h1` when no cost is left). See [Focus after a delete](documentation/frontend/decisions.md#focus-after-a-delete-6)
- Sort announcement (#9): `v-model:sorting` plus a `watch` feed a hidden `role="status"` text ("Sorted by Name, ascending"); empty until the first sort so a first click on Name is announced; the column id and order key are kept in state and translated in the template. See [Sort announcement](documentation/frontend/decisions.md#sort-announcement-9)
- Success message (#8): one shared toast for add and edit ("{name} saved"), its own for delete; shown in the layout's `onSaved` and in `onDelete`; Nuxt UI's `assertive` announcement left as is. See [Success message after add, edit and delete](documentation/frontend/decisions.md#success-message-after-add-edit-and-delete-8)
- Undo after saving (#99): an "Undo" button in the saved toast; an add is undone by a delete, an edit by restoring the previous values; `CostForm` emits the stored cost so the layout has the `id`. See [Undo after saving](documentation/frontend/decisions.md#undo-after-saving-99)

## Open decisions

- Depreciation: optional lifespan for purchases, evenly spread or per AfA rules (parked)
- Start and end dates for recurring costs: the direction is decided, a price history per cost (a list of amounts, each valid from a month) plus an optional end month, see issue #23. Until it exists, past years would show today's recurring costs, so the dashboard's year selector should offer only the current year
- Time handling: how dates and periods (month, year) are represented and queried (months are 1-12 in the API, array index 0 = January in `monthlyTotals`)
- Currency: euro only, or configurable
- State handling: plain composables or Pinia
- Postgres in k8s: own StatefulSet manifests, Helm chart, or an operator like CloudNativePG
- Manifest management: plain YAML, Kustomize or Helm
- Costs table and year: should the table be filtered by the selected year? Only purchases have a year, recurring costs have none
## Current status

Roadmap steps 1-5 are done; step 6 (UI) is in progress. 860 Vitest tests in 31 files pass. The cost core in `shared/`, the Drizzle schema and migration and the API (`GET`, `POST`, `PATCH`, `DELETE` for recurring costs and purchases) are done; the API routes and the real SQL are tested by hand against the local Postgres, not by automated tests (that would need a test Postgres). The UI has the layout with sidebar and tab bar, the central add/edit dialog, `/costs` (summary line, search, kind and category filters, sortable table, edit, delete), the dashboard (including its loading, error and empty states) and the month page with its navigation. Details per page: [`documentation/frontend/app-structure.md`](documentation/frontend/app-structure.md); tests: [`documentation/backend/testing.md`](documentation/backend/testing.md).

Next: the "This month" card overflowed sideways at 320 px before the hero restyle (long names broke into single letters, #38; not looked at again since). Still open: the `RecurringCost` union type in the core (the API already enforces `dueMonth`), and the rate calculator (later).

ESLint currently crashes because `typescript-eslint` does not support TypeScript 7; `pnpm add -D typescript@6` would fix it (cosmetic, not urgent).
