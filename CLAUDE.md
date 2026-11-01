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
│   ├── app.vue               # Root component (<UApp>, <NuxtLayout>, <NuxtPage>); error.vue is the error page (not found and other errors)
│   ├── assets/css/main.css   # Tailwind + Nuxt UI imports
│   ├── components/           # Reusable Vue components (LanguageSwitcher.vue, CostForm.vue, YearSelect.vue)
│   ├── composables/          # Reusable stateful logic (useXxx): useMoney.ts (euro formatter: whole euros, or cents with `useMoney({ cents: true })`), useYear.ts (the selected year and today's year and month), useMonthName.ts (localized month names), useAppHead.ts (html lang and dir and the title template, shared by app.vue and error.vue)
│   ├── layouts/              # Page layouts (default.vue: header with navigation and language switcher)
│   ├── middleware/           # (planned) Client route middleware
│   └── pages/                # Pages (auto-routing): costs.vue; index.vue (dashboard) is a shell with its page states, the sections follow
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

Beyond the core there are tests for the money formatter (`useMoney.test.ts`, called from a small probe component because it needs the i18n context), for the dashboard page states, summary tiles, household versus business split and category rows (`dashboard-page.test.ts`: fake API endpoints that can be slow or fail, `clearNuxtData()` before each test because `useFetch` caches by URL), for the app-level language behaviour (`app-locale.test.ts`: built-in Nuxt UI texts, `<html lang>` and `dir`, and the page titles, each also after switching the language without a reload), for the language switcher (`LanguageSwitcher.test.ts`), for the error page (`error-page.test.ts`: `error.vue` mounted with an `error` prop, `clearError` mocked with `mockNuxtImport`; whether a real unknown URL gives the 404 status was checked by hand against the dev server with `curl -H "Accept: text/html"`, because the component tests do not go through Nuxt's error handling), for the year select (`YearSelect.test.ts`: the list is teleported to the body and an item is chosen with a `pointerup` event, not a click) the `useYear` composable (`useYear.test.ts`: `clearNuxtState` before each test because `useState` outlives a test; a test fakes the clock around New Year) and the `useMonthName` composable (`useMonthName.test.ts`; its time zone check only fails west of UTC, run with `TZ=America/Los_Angeles` to see it), for the sort order and sort button names of the costs table in both languages (`costs-page-sorting.test.ts`, which switches the locale with `useNuxtApp().$i18n.setLocale` and resets it after each test), and for the server functions (`server-costs.test.ts`: `db` is replaced with `vi.mock`, so they check the logic between the Drizzle calls, such as the PATCH merge, not the SQL), for `CostForm` and for `costs.vue` (`mountSuspended` from `@nuxt/test-utils/runtime`, which needs the dev dependency `@vue/test-utils`). In this project `$fetch` is an auto-import, so a component test mocks it with `mockNuxtImport('$fetch', ...)` (`vi.stubGlobal` has no effect). That mock also replaces what `useFetch` uses, so the page tests register fake API endpoints with `registerEndpoint` instead. Modal content is teleported to `document.body`, so page tests query it there. UForm validates asynchronously, so tests wait for the outcome with `vi.waitFor`.

## Cost tracking logic

1. Recurring costs: amount plus interval (monthly, yearly, possibly quarterly), normalized to one period
2. One-off purchases: date and price, counted fully in the year of purchase (spreading over a lifespan is parked, see decisions)
3. Categories (housing, insurance, appliances, etc.) and an optional business flag
4. Totals per period and category, household versus business
5. Monthly overview: `monthlyTotals(recurring, purchases, year)` returns the true cost of each of the 12 months (not an average); purchases land in the month of their date, monthly recurring costs count in every month
6. Monthly breakdown: `costsInMonth(recurring, purchases, year, month)` returns the list of costs that occur in one month (recurring first, then purchases). It is generic, so stored items keep their `id` (rows need a key), so the UI can show recurring costs and purchases clearly apart. `monthlyTotals` and `totalMonthlyCost` are consistent with it (a month's total is the sum of its list).
7. Annual summary: `annualSummary(recurring, purchases, year)` returns `{ total, household, business, averagePerMonth }` for the dashboard tiles. `business` is the total of the business costs and `household` is `total - business`, so household plus business equals the total by construction; the average is the total divided by 12, not rounded.
8. Category breakdown: `categoryBreakDown(recurring, purchases, year)` returns one `{ category, total, share }` per category, sorted by total, largest first. `share` is the total relative to the largest category (between 0 and 1), so the bars can be sized directly; categories without costs are included with 0. Equal totals keep the order of `CATEGORIES`.
9. Cost split: `splitPercentages(summary)` turns an `AnnualSummary` into whole percentages for household and business. The business share is rounded and household is `100 - business`, so the two always add up to exactly 100; a total of 0 gives 0 and 0 instead of NaN.
10. Month breakdown: `monthBreakdown(recurring, purchases, year)` returns one `{ month, total, share }` per month in calendar order (January to December, no sorting). `share` is the total relative to the largest month (between 0 and 1); with no costs at all every share is 0 instead of NaN.
11. Month change: `monthChange(recurring, purchases, year, month)` returns `{ current, previous, percent }`: the totals of the month and of the month before it (January compares with December of the previous year, which matters for purchases) and the signed whole-number change in percent (negative means less). `percent` is `null` when the previous month cost nothing, so the UI never divides by zero. "Today" is not read in the core, the caller passes year and month.
12. Month neighbours: `monthNeighbours({ year, month }, validYears)` returns the previous and the next month as `{ year, month }` (January goes back to December of the previous year, December on to January of the next). A neighbour in a year that is not in `validYears` is `null`, so the month page can hide that link; the valid years are the years with data plus the current year (`availableYears`). It does not bridge a gap between valid years.
13. Month groups: `groupMonthCosts(costs)` splits the result of `costsInMonth` by kind into `recurring` and `purchases`, each with a subtotal, plus the `total`. It is generic (`MonthGroups<R, P>`), so stored items keep their `id`; a group without entries is an empty list with a subtotal of 0. The total is added in the same order as `totalMonthlyCost`, so it equals the matching entry of `monthlyTotals`.

## Rate calculator (later)

1. Tracked costs as the starting point: household and business costs, annual
2. Social security as a freelancer (health and long-term care insurance, retirement provision, optional unemployment insurance)
3. Income tax on the profit, so the net need is grossed up to a required profit (VAT is passed through and stays out)
4. Buffer and savings (reserves for quiet months, investments)
5. Billable capacity: working days minus vacation, sick days and public holidays, minus the non-billable share (acquisition, admin, learning)
6. Result: required annual revenue ÷ billable hours = minimum hourly rate, with scenarios (e.g. different utilization levels)

## Pages and views

Pages for now:

1. `/` **Dashboard** (`pages/index.vue`, shell exists): sections are a year selector, annual total, household versus business split, totals per category and the 12 monthly totals. The shell is there: the `h1`, both cost lists fetched with `useFetch` and `lazy: true` (same URLs as `/costs`, so both pages share the cached data), and three states decided by computed flags: `loading` (a list has not arrived yet; a `role="status"` text), `failed` (either request failed; a `UAlert` with `role="alert"` and a retry button that refreshes both lists) and `empty` (no costs at all; a hint and a link to `/costs`). The first section is built: a "Summary for <year>" section (`h2`, labelled with `aria-labelledby`) with four `UCard` tiles (annual total, household, business, average per month) from `annualSummary` in `shared/utils/costs.ts`, shown in whole euros by the `useMoney()` composable. The year comes from `useYear()` (see Decisions), chosen with a `YearSelect` inside the loaded content, just above the summary section; it is not shown while loading, on an error or on the empty screen. The "This month" card, its list and the highlighted month of the chart always use today (`currentYear`), whatever year is selected. The second section is "Costs by category in <year>": a `UCard` with a `ul` of rows from `categoryBreakDown`, each row with the translated name, the amount in whole euros and a hand-built bar whose width is the category's share of the largest one. The bar and its track are `aria-hidden`, so a row reads as name and amount; on narrow screens the bar moves to its own line below name and amount. Between the tiles and the categories sits "Household versus business in <year>": one stacked bar (a `role="img"` with a translated `aria-label`, segments sized by `splitPercentages`, no segment at all for a part of 0%) and a text legend with both percentages, so colour is not the only carrier; household uses the primary and business the secondary colour token. With no costs in the year the bar stays an empty track and the legend says 0%. At the top sits the "This month" card (`aria-labelledby`, `UCard`): "This month, <month> <year>" (localized with `Intl`), the month's total in whole euros and a comparison with the previous month from `monthChange`. The direction is in the words ("50% more than September", "less", "Same as", or a neutral text without a percentage when the previous month cost nothing); the trending icon is decoration (`aria-hidden`). The card always shows today's month, regardless of the year selector. Below the comparison sits the list of the month's costs (`costsInMonth`, a `ul` with an accessible name "Costs in <month>"): recurring costs first, then purchases, no cut-off, each row with the name, a text badge for the kind (and one for business costs) and the amount in whole euros. A month without costs shows a text and an "Add cost" button instead of the list; the button opens the same dialog as the add tile. The "View month" link is not built yet, it needs the month page (#19, #17). Under the card sits the "Add a cost" tile (#20): a heading, a one-line hint and an "Add cost" button that opens `CostForm` in a `UModal`, the same form as on `/costs`. After a save both lists are refreshed (the same `retry` function the error alert uses) and the dialog closes, so the card, tiles and bars update. The last section is "Costs per month in <year>": a `UCard` with an `ol` of 12 columns from `monthBreakdown`, each a hand-built vertical bar whose height is the month's share of the largest one (a month without costs keeps a thin baseline, `min-h-0.5`). Every item carries a visually hidden text (`sr-only`, "January: €800", from `Intl` month names in the active language), the bar and the short label ("Jan") are `aria-hidden`, the bar has a hover `title`, and the current month's label is bold so the highlight is not colour alone. The bars are not links yet, they get wrapped once the month page exists. Everything comes from the `shared/` core, no new API routes.
2. `/costs` (`pages/costs.vue`, exists): one table with recurring costs and purchases together, a `kind` column and a "when" column (interval and month for recurring, date for purchases). An "Add cost" button opens the add form in a modal; the table refreshes after a save. Each row has a trash icon button (accessible name "Delete <name>") that opens one shared confirmation modal (`UModal`, driven by a `toDelete` ref); on confirm the cost is deleted via the API and the table refreshes, and a failed delete shows its own error toast. Each row also has a pencil icon button (accessible name "Edit <name>") that opens the same form modal in edit mode (driven by a `toEdit` ref; the modal title shows the cost's name). The table is sorted by name by default (`localeCompare` with the active locale, so umlauts sort correctly). The headers of Name, Category, Kind, Amount and Business are sort buttons (`sortableHeader` in `costs.vue`, cycling ascending and descending). Text columns use a `sortingFn` that compares the translated text shown in the cell, not the stored id. UTable sets no `aria-sort`, so the button's `aria-label` carries the state ("Name, sorted ascending", texts in `costs.sort.*`). The "When" column is deliberately not sortable (idea: issue #3).
3. `/months/[year]/[month]` **Month page** (`pages/months/[year]/[month].vue`, planned): the costs of one month (`costsInMonth`) and the month's total, with an add action that opens the same form as `/costs`. The year is part of the URL, so a month page does not depend on shared year state, can be bookmarked, and works with the back button. The dashboard's monthly totals link to these pages.
4. `/calculator`: later (roadmap step 9), not part of the first UI.

Not a route: `app/error.vue` is Nuxt's error page. It shows a translated "Page not found" for an unknown URL (the response has the status 404) and a generic "Something went wrong" for any other error, never the error message. It sits in the default layout, has its own title and route announcer, and a "Back to dashboard" button that clears the error and redirects to `/`. The invalid-month variant for the month page (#29) is added on top of it.

Views that are not pages:

- **Add/edit form:** a modal (`UModal`, chosen over a slide-over for mobile) opened from `/costs` and from the month pages, not its own routes. One form component (`components/CostForm.vue`) for adding and editing both kinds of cost. It takes an optional `cost` prop (`Stored<Cost>`): when set, the form is pre-filled once, the kind radio group is disabled (a cost cannot change its kind), the submit button says "Save" and submit sends a `PATCH` to `/api/<resource>/<id>` instead of a `POST`. A Cancel button emits `cancel` and the page closes the modal; closing the modal clears `toEdit`, so the next "Add cost" starts empty. Built with `UForm` and the Zod schemas (the schema switches with the kind switch), with labelled fields. On submit it POSTs `event.data` (already stripped by Zod) to the matching route and emits `saved`; the page refreshes both lists and closes the modal. If the request fails, a toast (`useToast`, text from `form.error`) is shown and the modal stays open with the entered values. A closed modal unmounts its content, so the form starts empty each time. On a month page it opens with defaults from that month: a purchase gets a date in that month (day left to fill in), a yearly or quarterly recurring cost gets that month as `dueMonth`.

Shared structure:

- `layouts/default.vue` (exists): `UHeader` with the title, a `UNavigationMenu` (Dashboard, Costs) and the `LanguageSwitcher` (a `USelect` whose accessible name comes from `language.label` as an `aria-label`, so it has no visible label), then `UMain` and `UContainer` around the page. Nuxt UI components render the landmarks (`<header>`, `<nav>`, `<main>`); labels that go through `t()` must be wrapped in `computed` so they update when the language changes. Month pages will be added to the navigation only when they exist.
- The selected year is shared by the dashboard and the costs table, as a small composable (`useYear`), because the core takes the year as a parameter. Month pages take their year from the URL instead.
- Page titles: `app.vue` sets a `titleTemplate` (`<page> – Budgetly`, app name from `app.name`) and every page sets its own title with `useHead({ title: () => t('...') })`, so the title is translated and follows a language switch. A page without a title falls back to the app name. New pages (dashboard, month pages) follow the same pattern. The head setup (`lang`, `dir`, title template) lives in `useAppHead()`, which both `app.vue` and `error.vue` call, because `error.vue` replaces `app.vue` while an error is shown.
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
- Dashboard money and year: amounts on the dashboard are shown in whole euros (`useMoney()`), while the costs table keeps cents. The calculation stays exact and only the display is rounded, so household plus business can differ from the total by 1 on screen. Today's year and month are read once in `useYear()` (one `Date`, in UTC) and kept in `useState`, so the server and the browser agree about them around New Year and the two can never come from different moments (`currentYear`, `currentMonth`). Month names and labels such as "October 2026" come from `useMonthName()` (`Intl`, UTC dates), not from copies in the pages. The selected year (`year`) is shared state too, so it survives navigation and a later costs page (#10) can read the same value. `YearSelect` (a `v-model` component with a translated, visible label) offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases, newest first. Known limits: recurring costs have no start or end date, so a past year shows today's recurring costs until price history exists (#23); and a stored year that is no longer in the list shows an empty select (#30).
- Bars and charts: lists with bars (costs by category, later the months) are hand-built, because every value must be real text for all users, the month bars have to be real links, and they should render without JavaScript. A chart library is only a candidate for trend charts, and would need to be evaluated for server rendering, keyboard and screen reader support first.

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

Steps 1-5 are done. The cost core in `shared/` is complete (annual totals, `totalsByCategory`, `filterByBusiness`, the monthly views), the Drizzle schema and migration exist, and the API has `GET`, `POST`, `PATCH` and `DELETE` for both recurring costs and purchases, tested by hand against the local Postgres. 355 Vitest tests pass (the cost core including `annualSummary`, `categoryBreakDown`, `splitPercentages`, `monthBreakdown`, `monthChange`, `availableYears`, `monthNeighbours` and `groupMonthCosts`, all Zod schemas, the server functions on a mocked `db`, `CostForm`, the costs page including its sorting, the `LanguageSwitcher`, the app-level language and title behaviour, the dashboard page states, summary tiles, split, category rows, the months chart, the this-month card with its cost list, the add tile and the year selector, `YearSelect`, `useYear`, `useMonthName` and the money formatter with its cents option); the API routes and the real SQL (ordering, `returning`) are not covered by automated tests, that would need a test Postgres. Step 6 (UI) has started: `app.vue` renders `<NuxtLayout><NuxtPage /></NuxtLayout>`, `layouts/default.vue` provides the header with navigation and the language switcher, `pages/costs.vue` shows the combined table with translated columns and a "when" column, and `pages/index.vue` is the dashboard (heading, lazy loading of both lists, the loading, error and empty states, the annual summary tiles, the household versus business split, the costs by category and the costs per month). The add form is done (`components/CostForm.vue` in a modal on `/costs`). Failed saves and failed deletes show an error toast, delete works from the table after a confirmation, edit works from the table in the same modal as add, and the table is sorted by name with sort buttons on five columns. Next: the month page (issue #17 tracks it; the pure functions `monthNeighbours` and `groupMonthCosts` are done and `error.vue` exists (#33); the page, the invalid-month variant of the error page (#29) and the form defaults are not; the month bars and the "View month" link become links to it afterwards) and a check of the months chart on 320 px screens (see Pages and views). Still open: the `RecurringCost` union type in the core (`dueMonth` required for yearly and quarterly, absent for monthly; the API already enforces it), and the rate calculator (later). ESLint currently crashes because `typescript-eslint` does not support TypeScript 7; `pnpm add -D typescript@6` would fix it (cosmetic, not urgent).
