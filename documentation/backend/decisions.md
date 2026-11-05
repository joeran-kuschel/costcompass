# Decisions

A short log of what was decided and why. Written for: developers and contributors. The full working agreement is [`CLAUDE.md`](../../CLAUDE.md); this page summarizes it.

## Decided

| Topic | Decision | Why |
| --- | --- | --- |
| Cost model | `CostItem` base; `RecurringCost` adds `interval`, `Purchase` adds `date`; both carry a `kind` | One list can hold both; the UI tells them apart without a separate entry type |
| Categories | Fixed `CATEGORIES` array, English ids, names from locale files | One list for type, validation and database enum. User-defined categories would need a table. |
| Business | A boolean flag on an item, not a category | A cost can be both "insurance" and business |
| Money | Plain euro numbers, no integer cents | Simplicity; the database stores `numeric(10, 2)` |
| Dates | Years passed as parameters; ISO dates read in UTC | Results do not depend on time zone or the clock |
| Purchases | Count fully in the year of purchase | How a household thinks; depreciation is parked |
| Recurring due month | Yearly and quarterly costs carry `dueMonth` (1 to 12); quarterly repeats every 3 months | Months, not full dates, are enough |
| Database access | Drizzle with `drizzle-kit` migrations | TypeScript schema, no code generation |
| API | REST per resource; `GET`/`POST` on the list, `PATCH`/`DELETE` on `[id]`; thin routes, Zod validation | Logic stays testable in `server/utils` |
| Status codes | 400 invalid, 404 unknown id, 204 for delete, 200 for `PATCH` | See [api.md](api.md) |
| PATCH on recurring costs | Merge patch into the stored row, validate the result, write `dueMonth: null` for monthly | No stale month stays behind |
| Row ids | `Stored<T> = T & { id: number }` in the UI, core types without `id` | Core and its tests stay id-free |
| i18n | `@nuxtjs/i18n`, `en` default and `de`, strategy `no_prefix`, cookie for a manual choice | URL does not change with the language |
| Dashboard money | Whole euros on the dashboard, cents in tables and on the month page | Display is rounded, the calculation is exact; household plus business can differ from the total by 1 on screen |
| Today | Read once in `useYear()` (UTC) and stored with `useState` | Server and browser agree around New Year |
| Charts | Hand-built bars with real text, no chart library for now | Every value must be text, month bars must be links, works without JavaScript |
| Short values on the month bars | Formatted by hand: below 1,000 the whole number, from 1,000 up the thousands with one decimal at most and a "k" from the locale key `dashboard.months.thousand`; a month of 0 shows "0" | `Intl` compact notation does not abbreviate thousands in German ("2100", long form "2,1 Tausend"), which is too wide for a narrow column; the mock builds "2.1k" by hand too (#68) |
| Soft colour of the month bars | `--chart-soft` is `#b9c5f6` (light) and `#5b6ac0` (dark), the values of the mocks; the light value has 1.70:1 against the white card and so misses the 3:1 asked for in #69, the dark value has 3.59:1 | Every amount is also text (the value above the bar, the link text) and the highlight is not colour alone (bold label and value). A colour with 3:1 (about `#7488E4`, 3.29:1) would be only 2.05:1 against the cobalt of the current month and weaken the highlight. Figures are computed, not measured (#69; same kind of decision as #51) |
| Dashboard links | The "This month" card links to today's month; the month bars link to the selected year; the chart scrolls sideways with columns of at least 44 px | The card ignores the selected year, so its link does too; touch targets stay big enough on phones (#18, #19) |
| Month pages | Year and month are in the URL (`/months/2026/03`), month always two digits | Bookmarkable, back button works, one address per month |
| Add/edit form | A modal (`UModal`) with one `CostForm` for both kinds | Better on mobile than a slide-over |

## Details of the architecture and data decisions

The table above is the short form. These are the details as they were recorded in [`CLAUDE.md`](../../CLAUDE.md), which now keeps only a one-to-three line summary of each.

- **Cost model:** a shared base `CostItem` (name, amount, category, business) in `shared/types/calculation.ts`. `RecurringCost` extends it with an interval (monthly, yearly; quarterly was added, see below). `Purchase` extends it with a date (ISO string, `YYYY-MM-DD`).
- **Category:** a fixed list, `CATEGORIES` as a `const` array with `Category` derived from it. Ids are English; display names come from the locale files. The database stores the category as text (optionally with a check or enum) and the server validates against `CATEGORIES`. User-defined categories would need a table instead.
- **Dates and years:** years are passed to functions as numbers, never read from "today" inside the core. Years of ISO dates are read in UTC (`getUTCFullYear`) so results do not depend on the time zone.
- **Depreciation is parked** (tricky to get right). A purchase counts fully in the year it was bought, which is also how a household thinks. Later, an optional lifespan can spread the price over several years (mostly a business concept), with the detailed German rules (AfA, thresholds for low-value assets).
- **Business:** a boolean flag on an item, not a category.
- **Money:** plain euro numbers, no integer cents.
- **Database access:** Drizzle (TypeScript schema, no code generation, `drizzle-kit` for migrations). The `CATEGORIES` array is reused for the category column, so the list lives in one place.
- **i18n:** `@nuxtjs/i18n` with `en` (default) and `de`, strategy `no_prefix` (the URL does not change with the language). The locale is detected from the browser on the first visit (fallback `en`) and a manual choice is stored in a cookie (`detectBrowserLanguage` with `useCookie`). The language switcher calls `setLocale()` instead of navigating. Locale files are `i18n/locales/en.json` and `de.json`; category and interval names are keyed by their ids (`category.housing`, `interval.monthly`). Nuxt UI's own texts (modal close button, empty table) follow the i18n locale on their own, because the Nuxt UI module provides its locale from `$i18n.locale`, so `UApp` needs no `locale` prop. `@nuxtjs/i18n` does not set the document language, so the app sets `<html lang>` (the locale code) and `dir="ltr"` with `useHead` (in `useAppHead()`); a right-to-left language would need `dir` from the locale.
- **`kind` discriminant:** `RecurringCost` and `Purchase` each carry a `kind` (`'recurring'` / `'purchase'`), and `type Cost = RecurringCost | Purchase`. There is no separate entry type for the monthly list. Test helpers set `kind` by default.
- **`dueMonth`:** yearly and quarterly recurring costs get a `dueMonth` (1-12), a month only, not a full date. A yearly cost falls in that month every year; a quarterly cost starts in that month and repeats every 3 months (`dueMonth: 2` means February, May, August, November). `'quarterly'` is added to `Interval` (`PERIODS_PER_YEAR` gets `quarterly: 4`). `MONTHS` and `Month` are derived from a const array.
- **`RecurringCost` as a union type (open):** a monthly cost has no `dueMonth`, a yearly or quarterly cost must have one (the compiler enforces it). Currently `dueMonth?: Month` is still optional until the union is in place. With the union, a yearly or quarterly cost always has a `dueMonth`. Data that reaches the core without one (untyped input, old rows) is skipped in the monthly views (`monthlyTotals`, `costsInMonth`) but still counts in the annual totals, so the API must validate that `dueMonth` is present for those intervals.
- **API:** REST routes per resource, `GET`/`POST` on `/api/<resource>` and `PATCH`/`DELETE` on `/api/<resource>/[id]`. Routes stay thin: validate with Zod (`readValidatedBody`, `getValidatedRouterParams`), call a function in `server/utils/costs.ts`, return the result. All schemas live in `shared/utils/validation.ts`; the shared `idParamsSchema` coerces the id from the URL (400 on an invalid id). The list routes return rows ordered by `id`, so a row keeps its place after an edit (the page then sorts the combined table by name).
- **Status codes:** invalid input 400 (Zod issues in the body), unknown id 404, successful `DELETE` 204 without a body, `PATCH` returns the updated item with 200. See [api.md](api.md).
- **PATCH:** the body is a partial of the create fields (`patchRecurringCostSchema`, `patchPurchaseSchema`); an empty patch is rejected. For recurring costs `interval` and `dueMonth` can change. `updateRecurringCost` loads the stored row, merges the patch, validates the result with `createRecurringCostSchema` (400 if, for example, a yearly cost has no `dueMonth`) and writes `dueMonth: null` when the result is monthly, so no stale month stays behind. The 400 is thrown inside the util function.
- **Row ids in the UI:** `Cost` and the other core types have no `id` (the API sends it at runtime). Edit and delete use the wrapper type `Stored<T> = T & { id: number }` for data from the API, so the core types and their tests stay id-free. Implemented: `Stored<T>` is in `shared/types/calculation.ts`; `costs.vue` types the fetched rows as `Stored<...>`.

The design and dashboard decisions (colours, charts, money display on the dashboard, favicon) are on the [frontend decisions page](../frontend/decisions.md). Some of them are also summarized in the table above.

## Open

- Depreciation: optional lifespan for purchases (parked).
- Start and end dates for recurring costs: direction is a price history per cost plus an optional end month (issue #23).
- Time handling: months are 1 to 12 in the API, index 0 is January in `monthlyTotals`.
- Currency: euro only, or configurable.
- State handling: plain composables or Pinia.
- Postgres in Kubernetes: own StatefulSet, Helm chart or an operator.
- Manifest management: plain YAML, Kustomize or Helm.
- Costs table and year: should the table follow the selected year?

## Planned

Rate calculator (required annual revenue and minimum hourly rate), the real income tax tariff (§32a EStG), Docker and Kubernetes setup. These are not built.
