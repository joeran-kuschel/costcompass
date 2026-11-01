# App structure

Reference and conventions for `app/` (pages, components, composables, texts). Written for: developers. End users: see the [user guide](user-guide.md). The server side is in [the backend documentation](../backend/index.md).

## Pages

| Route | File | State | What it does |
| --- | --- | --- | --- |
| `/` | `app/pages/index.vue` | Exists | Dashboard: "This month" card with cost list, add tile, year select, summary tiles, household versus business bar, costs by category, costs per month |
| `/costs` | `app/pages/costs.vue` | Exists | One sortable table of both kinds, add, edit and delete |
| `/months/[year]/[month]` | `app/pages/months/[year]/[month].vue` | Exists | Costs of one month, total, previous and next links, add cost |
| `/calculator` | - | Planned | Rate calculator |

`app/error.vue` is the error page, not a route. It shows one of three variants (`notFound`, `generic`, `month`), picked by the error. Texts come from `error.<variant>Title` and `error.<variant>Text`. The `month` variant is used when the month page throws an error with `data: { reason: 'month' }`.

Links from the dashboard to month pages (the month bars and a "View month" link) are not built yet, and month pages are not in the navigation.

### Page states

The dashboard and the month page get their data with `useCostLists()` and show these states, in this order of priority:

1. **Failed**: a `UAlert` with `role="alert"` and a retry button that refreshes both lists. No numbers are shown next to it.
2. **Loading**: a visually hidden `role="status"` text (month page: also two skeleton blocks marked `aria-hidden`).
3. **Empty**: dashboard only, a hint and a link to `/costs`. On the month page an empty month shows a card instead of the groups.
4. **Loaded**: the content.

### Month page address

The address is checked before any data is requested. `monthParamsSchema` (`shared/utils/validation.ts`) accepts a four-digit year and a month `01` to `12`. Anything else shows the not-found error. Once the lists have loaded, a year that is not in `availableYears` also shows it. Build links with `monthPath(year, month)` from `useMonth()`, which pads the month.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds, in a `UModal`. Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` and `cancel`. Failed saves show a toast. |
| `YearSelect.vue` | `v-model` year select with a visible label; takes a `years` list |
| `LanguageSwitcher.vue` | `USelect` that calls `setLocale()`; accessible name from `language.label` |

The form validates with the Zod schemas from `shared/utils/validation.ts`, so the browser and the API apply the same rules, except that the date field limit of the `month` prop is a browser limit only.

## Composables

| Composable | Returns |
| --- | --- |
| `useMoney(options?)` | A formatter for euros: whole euros, or cents with `useMoney({ cents: true })` |
| `useYear()` | `year` (selected, shared state), `currentYear`, `currentMonth` (read once, in UTC) |
| `useMonth()` | `monthName(month, style?)`, `monthYear(year, month)`, `monthPath(year, month)` |
| `useCostLists()` | `recurring`, `purchases`, `failed`, `loading`, `retry`. Uses `useFetch` with `lazy: true`, so the dashboard and the month page share the cached data. |
| `useAppHead()` | `<html lang>`, `dir` and the title template; called by `app.vue` and `error.vue` |

## Texts and languages

- All UI text is in `i18n/locales/en.json` and `de.json`. Do not hard-code text. Keep both files in step.
- Categories and intervals are keyed by id: `category.housing`, `interval.monthly`.
- Labels that go through `t()` and live in script code must be wrapped in `computed` so they update when the language changes.
- Month names and dates come from `Intl` through `useMonth()`, in UTC, in the active language.
- Page titles: each page sets `useHead({ title: () => t('...') })`. `app.vue` adds the suffix: "<page> – Budgetly".

## Accessibility conventions

- Sections are labelled with `aria-labelledby`; bars and tracks are `aria-hidden` and every value is also real text.
- The split bar is a `role="img"` with a translated `aria-label`.
- The month chart items have visually hidden text ("January: €800"); the current month is bold, not only coloured.
- The costs table sets no `aria-sort`, so the sort buttons carry the state in their `aria-label` (`costs.sort.*`).
- After a successful retry on the month page, focus moves to the `h1`, which has `tabindex="-1"`.
- `<NuxtRouteAnnouncer />` announces the new title after each navigation.

## Calculation core

The pages pass the fetched lists to the functions in `shared/`; see [the calculation core](../backend/calculation-core.md).
