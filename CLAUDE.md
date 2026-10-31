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
│   ├── components/           # Reusable Vue components (LanguageSwitcher.vue, CostForm.vue)
│   ├── composables/          # (planned) Reusable stateful logic (useXxx)
│   ├── layouts/              # Page layouts (default.vue: header with navigation and language switcher)
│   ├── middleware/           # (planned) Client route middleware
│   └── pages/                # Pages (auto-routing): costs.vue; index.vue (dashboard) is a placeholder for now
├── server/                   # Nitro server, the only layer touching the DB
│   ├── api/                  # API routes: recurring-costs/ and purchases/ (index.get/post, [id].patch/delete)
│   ├── db/                   # Drizzle schema and migrations
│   ├── middleware/           # (planned) Server middleware
│   └── utils/                # Server utilities (db.ts client, costs.ts queries and row mappers)
├── shared/                   # Code for both app and server (the ~~ alias is the project root)
│   ├── types/                # Types, auto-imported (calculation.ts)
│   └── utils/                # Pure functions, auto-imported (costs.ts calculations, validation.ts Zod schemas)
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

Import rules: inside `app/` use `~/...`; for files outside `app/` (e.g. `shared/`) use `~~/...`. Only the top level of `shared/types/` and `shared/utils/` is auto-imported, not subfolders. Files in `shared/utils/` import their types explicitly (`import type { ... } from '~~/shared/types/calculation'`) instead of relying on auto-import, because the editor's generated types can lag behind. After adding a new auto-imported file, restart the TS server or run `pnpm dlx nuxt prepare`.

Order inside `<script setup>` in `.vue` files: imports, local types, consts (composables, refs, computeds, props and emits), statements that run at setup (`watch`, `useHead`, initial values), then functions. Keep a const above whatever reads it at setup time. The database migrations folder depends on the database access decision (see open decisions).

Tests live in `tests/nuxt/` (the folder the Nuxt TypeScript config includes), one `describe` per function. Test data comes from small helper functions with defaults (`recurring()`, `purchase()`) and a `YEAR` constant, so each test only states what it cares about.

Beyond the core there are tests for the app-level language behaviour (`app-locale.test.ts`: built-in Nuxt UI texts, `<html lang>` and `dir`, and the page titles, each also after switching the language without a reload), for the language switcher (`LanguageSwitcher.test.ts`), for the sort order and sort button names of the costs table in both languages (`costs-page-sorting.test.ts`, which switches the locale with `useNuxtApp().$i18n.setLocale` and resets it after each test), and for the server functions (`server-costs.test.ts`: `db` is replaced with `vi.mock`, so they check the logic between the Drizzle calls, such as the PATCH merge, not the SQL), for `CostForm` and for `costs.vue` (`mountSuspended` from `@nuxt/test-utils/runtime`, which needs the dev dependency `@vue/test-utils`). In this project `$fetch` is an auto-import, so a component test mocks it with `mockNuxtImport('$fetch', ...)` (`vi.stubGlobal` has no effect). That mock also replaces what `useFetch` uses, so the page tests register fake API endpoints with `registerEndpoint` instead. Modal content is teleported to `document.body`, so page tests query it there. UForm validates asynchronously, so tests wait for the outcome with `vi.waitFor`.

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

## Pages and views

Pages for now:

1. `/` **Dashboard** (`pages/index.vue`, planned): year selector, annual total, household versus business split, totals per category, the 12 monthly totals. Everything comes from the `shared/` core, no new API routes.
2. `/costs` (`pages/costs.vue`, exists): one table with recurring costs and purchases together, a `kind` column and a "when" column (interval and month for recurring, date for purchases). An "Add cost" button opens the add form in a modal; the table refreshes after a save. Each row has a trash icon button (accessible name "Delete <name>") that opens one shared confirmation modal (`UModal`, driven by a `toDelete` ref); on confirm the cost is deleted via the API and the table refreshes, and a failed delete shows its own error toast. Each row also has a pencil icon button (accessible name "Edit <name>") that opens the same form modal in edit mode (driven by a `toEdit` ref; the modal title shows the cost's name). The table is sorted by name by default (`localeCompare` with the active locale, so umlauts sort correctly). The headers of Name, Category, Kind, Amount and Business are sort buttons (`sortableHeader` in `costs.vue`, cycling ascending and descending). Text columns use a `sortingFn` that compares the translated text shown in the cell, not the stored id. UTable sets no `aria-sort`, so the button's `aria-label` carries the state ("Name, sorted ascending", texts in `costs.sort.*`). The "When" column is deliberately not sortable (idea: issue #3).
3. `/months/[year]/[month]` **Month page** (`pages/months/[year]/[month].vue`, planned): the costs of one month (`costsInMonth`) and the month's total, with an add action that opens the same form as `/costs`. The year is part of the URL, so a month page does not depend on shared year state, can be bookmarked, and works with the back button. The dashboard's monthly totals link to these pages.
4. `/calculator`: later (roadmap step 9), not part of the first UI.

Views that are not pages:

- **Add/edit form:** a modal (`UModal`, chosen over a slide-over for mobile) opened from `/costs` and from the month pages, not its own routes. One form component (`components/CostForm.vue`) for adding and editing both kinds of cost. It takes an optional `cost` prop (`Stored<Cost>`): when set, the form is pre-filled once, the kind radio group is disabled (a cost cannot change its kind), the submit button says "Save" and submit sends a `PATCH` to `/api/<resource>/<id>` instead of a `POST`. A Cancel button emits `cancel` and the page closes the modal; closing the modal clears `toEdit`, so the next "Add cost" starts empty. Built with `UForm` and the Zod schemas (the schema switches with the kind switch), with labelled fields. On submit it POSTs `event.data` (already stripped by Zod) to the matching route and emits `saved`; the page refreshes both lists and closes the modal. If the request fails, a toast (`useToast`, text from `form.error`) is shown and the modal stays open with the entered values. A closed modal unmounts its content, so the form starts empty each time. On a month page it opens with defaults from that month: a purchase gets a date in that month (day left to fill in), a yearly or quarterly recurring cost gets that month as `dueMonth`.

Shared structure:

- `layouts/default.vue` (exists): `UHeader` with the title, a `UNavigationMenu` (Dashboard, Costs) and the `LanguageSwitcher` (a `USelect` whose accessible name comes from `language.label` as an `aria-label`, so it has no visible label), then `UMain` and `UContainer` around the page. Nuxt UI components render the landmarks (`<header>`, `<nav>`, `<main>`); labels that go through `t()` must be wrapped in `computed` so they update when the language changes. Month pages will be added to the navigation only when they exist.
- The selected year is shared by the dashboard and the costs table, as a small composable (`useYear`), because the core takes the year as a parameter. Month pages take their year from the URL instead.
- Page titles: `app.vue` sets a `titleTemplate` (`<page> – Budgetly`, app name from `app.name`) and every page sets its own title with `useHead({ title: () => t('...') })`, so the title is translated and follows a language switch. A page without a title falls back to the app name. New pages (dashboard, month pages) follow the same pattern.
- Not needed yet: login (single user), settings.

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
- i18n: `@nuxtjs/i18n` with `en` (default) and `de`, strategy `no_prefix` (the URL does not change with the language). The locale is detected from the browser on the first visit (fallback `en`) and a manual choice is stored in a cookie (`detectBrowserLanguage` with `useCookie`); the language switcher calls `setLocale()` instead of navigating. Locale files are `i18n/locales/en.json` and `de.json`; category and interval names are keyed by their ids (`category.housing`, `interval.monthly`). Nuxt UI's own texts (modal close button, empty table) follow the i18n locale on their own, because the Nuxt UI module provides its locale from `$i18n.locale`, so `UApp` needs no `locale` prop. `@nuxtjs/i18n` does not set the document language, so `app.vue` sets `<html lang>` (the locale code) and `dir="ltr"` with `useHead`; a right-to-left language would need `dir` from the locale.
- `RecurringCost` and `Purchase` each carry a `kind` discriminant (`'recurring'` / `'purchase'`), and `type Cost = RecurringCost | Purchase`. No separate entry type for the monthly list. Test helpers set `kind` by default.
- Yearly and quarterly recurring costs get a `dueMonth` (1-12), a month only, not a full date. A yearly cost falls in that month every year; a quarterly cost starts in that month and repeats every 3 months (`dueMonth: 2` means February, May, August, November). `'quarterly'` is added to `Interval` (`PERIODS_PER_YEAR` gets `quarterly: 4`). `MONTHS` and `Month` are derived from a const array. `RecurringCost` is a union type: a monthly cost has no `dueMonth`, a yearly or quarterly cost must have one (the compiler enforces it). Currently `dueMonth?: Month` is still optional until the union is in place.
- With the union type a yearly or quarterly cost always has a `dueMonth`. Data that reaches the core without one (untyped input, old rows) is skipped in the monthly views (`monthlyTotals`, `costsInMonth`) but still counts in the annual totals, so the API must validate that `dueMonth` is present for those intervals.
- API: REST routes per resource, `GET`/`POST` on `/api/<resource>` and `PATCH`/`DELETE` on `/api/<resource>/[id]`. Routes stay thin: validate with Zod (`readValidatedBody`, `getValidatedRouterParams`), call a function in `server/utils/costs.ts`, return the result. All schemas live in `shared/utils/validation.ts`; the shared `idParamsSchema` coerces the id from the URL (400 on an invalid id). The list routes return rows ordered by `id`, so a row keeps its place after an edit (the page then sorts the combined table by name, see Pages and views).
- Status codes: invalid input 400 (Zod issues in the body), unknown id 404, successful `DELETE` 204 without a body, `PATCH` returns the updated item with 200.
- PATCH: body is a partial of the create fields (`patchRecurringCostSchema`, `patchPurchaseSchema`), an empty patch is rejected. For recurring costs `interval` and `dueMonth` can change; `updateRecurringCost` loads the stored row, merges the patch, validates the result with `createRecurringCostSchema` (400 if e.g. a yearly cost has no `dueMonth`) and writes `dueMonth: null` when the result is monthly, so no stale month stays behind. The 400 is thrown inside the util function.
- Row ids in the UI: `Cost` and the other core types have no `id` (the API sends it at runtime). Edit and delete will use a wrapper type such as `Stored<T> = T & { id: number }` for data from the API, so the core types and their tests stay id-free. Implemented: `Stored<T>` is in `shared/types/calculation.ts`; `costs.vue` types the fetched rows as `Stored<...>`.

## Open decisions

- Depreciation: optional lifespan for purchases, evenly spread or per AfA rules (parked)
- Start and end dates for recurring costs (can wait)
- Time handling: how dates and periods (month, year) are represented and queried (months are 1-12 in the API, array index 0 = January in `monthlyTotals`)
- Currency: euro only, or configurable
- State handling: plain composables or Pinia
- Postgres in k8s: own StatefulSet manifests, Helm chart, or an operator like CloudNativePG
- Manifest management: plain YAML, Kustomize or Helm
- Costs table and year: should the table be filtered by the selected year? Only purchases have a year, recurring costs have none
## Current status

Steps 1-5 are done. The cost core in `shared/` is complete (annual totals, `totalsByCategory`, `filterByBusiness`, the monthly views), the Drizzle schema and migration exist, and the API has `GET`, `POST`, `PATCH` and `DELETE` for both recurring costs and purchases, tested by hand against the local Postgres. 140 Vitest tests pass (the cost core, all Zod schemas, the server functions on a mocked `db`, `CostForm`, the costs page including its sorting, the `LanguageSwitcher`, and the app-level language and title behaviour); the API routes and the real SQL (ordering, `returning`) are not covered by automated tests, that would need a test Postgres. Step 6 (UI) has started: `app.vue` renders `<NuxtLayout><NuxtPage /></NuxtLayout>`, `layouts/default.vue` provides the header with navigation and the language switcher, `pages/costs.vue` shows the combined table with translated columns and a "when" column, and `pages/index.vue` is a placeholder for the dashboard. The add form is done (`components/CostForm.vue` in a modal on `/costs`). Failed saves and failed deletes show an error toast, delete works from the table after a confirmation, edit works from the table in the same modal as add, and the table is sorted by name with sort buttons on five columns. Next: the dashboard, the year selector and the month pages (see Pages and views). Still open: the `RecurringCost` union type in the core (`dueMonth` required for yearly and quarterly, absent for monthly; the API already enforces it), and the rate calculator (later). ESLint currently crashes because `typescript-eslint` does not support TypeScript 7; `pnpm add -D typescript@6` would fix it (cosmetic, not urgent).
