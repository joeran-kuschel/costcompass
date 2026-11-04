# App structure

Reference and conventions for `app/` (pages, components, composables, texts). Written for: developers. End users: see the [user guide](user-guide.md). The server side is in [the backend documentation](../backend/index.md).

## Pages

| Route | File | State | What it does |
| --- | --- | --- | --- |
| `/` | `app/pages/index.vue` | Exists | Dashboard: "This month" card with cost list, add tile, year select, summary tiles, household versus business bar, costs by category, costs per month |
| `/costs` | `app/pages/costs.vue` | Exists | One sortable table of both kinds, add, edit and delete |
| `/months/[year]/[month]` | `app/pages/months/[year]/[month].vue` | Exists | Costs of one month, total, previous and next links, add cost (pre-filled for the month) |
| `/calculator` | - | Planned | Rate calculator |

`app/error.vue` is the error page, not a route. It shows one of three variants (`notFound`, `generic`, `month`), picked by the error. Texts come from `error.<variant>Title` and `error.<variant>Text`. The `month` variant is used when the month page throws an error with `data: { reason: 'month' }`.

Month pages are reached from the dashboard (see [Dashboard links to month pages](#dashboard-links-to-month-pages)) and, for today's month, from the "This month" entry in the navigation (see [The "This month" navigation entry](#the-this-month-navigation-entry)). Other months have no navigation entry.

### Page states

The dashboard and the month page get their data with `useCostLists()` and show these states, in this order of priority:

1. **Failed**: a `UAlert` with `role="alert"` and a retry button that refreshes both lists. No numbers are shown next to it.
2. **Loading**: a visually hidden `role="status"` text (month page: also two skeleton blocks marked `aria-hidden`).
3. **Empty**: dashboard only, a hint and a link to `/costs`. On the month page an empty month shows a card instead of the groups.
4. **Loaded**: the content.

### Month page address

The address is checked before any data is requested. `monthParamsSchema` (`shared/utils/validation.ts`) accepts a four-digit year and a month `01` to `12`. Anything else shows the not-found error. Once the lists have loaded, a year that is not in `availableYears` also shows it. Build links with `monthPath(year, month)` from `useMonth()`, which pads the month.

### Dashboard links to month pages

Two places on `app/pages/index.vue` link to `/months/[year]/[month]` (issues #18 and #19). Both build the address with `monthPath(year, month)`, so the month is always two digits (`/months/2026/03`).

| Link | Target | Year used | Why |
| --- | --- | --- | --- |
| "View <month year>" at the end of the "This month" card (`dashboard.thisMonth.view`, e.g. "View March 2026") | Today's month: `monthPath(currentYear, currentMonth)` | Always `currentYear` | The card always shows today's month, so its link has to agree with it. Shown also when the month has no costs. |
| Each of the 12 items in "Costs per month" | `monthPath(shownYear.value, month)` | The shown year (`shownYear`, see below) | The chart shows that year, so a bar leads to that year's month. |

Notes on the months chart:

- Each `li` holds a `NuxtLink` (a real `<a>`, works without JavaScript). The `li` has no layout of its own, so the link fills the grid column and the bars keep their width.
- Link name: the `sr-only` text from `dashboard.months.alt` ("March: €1,100"). The bar and the short label are `aria-hidden`; the bar has a hover `title`.
- Keyboard focus shows an outline (`focus-visible:outline-2 focus-visible:outline-primary`).
- The current month's label is bold only if the shown year is the current year (`shownYear === currentYear && month === currentMonth`).
- The grid is `repeat(12, minmax(1.5rem, 1fr))` inside an `overflow-x-auto` wrapper. 1.5rem is 24 px, the minimum target size. Twelve columns plus gaps do not fit on very narrow screens, so the chart scrolls sideways instead of squeezing the targets below 24 px. A check on 320 px screens is still open (to verify).
- Tests: `tests/nuxt/dashboard-page.test.ts`, the describes "dashboard page month bar links" and "dashboard page "View month" link".

### Year fallback on the dashboard

Issue #30. The selected year lives in `useYear()` (`year`, a `useState('year')`). The year select offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases. If the stored year is not in that list (for example after the last purchase of that year is deleted), the dashboard shows the current year instead. Before, the select was empty and the sections showed that year with recurring costs only.

`app/pages/index.vue` has a computed value for this:

```ts
const shownYear = computed(() => years.value.includes(year.value) ? year.value : currentYear.value)
```

`shownYear` feeds the `YearSelect` (`:model-value`), the four section headings, `annualSummary`, `categoryBreakDown`, `monthBreakdown`, the month bar links and the current-month marker. The "This month" card still uses `currentYear`. Choosing a year in the select (`update:model-value`) writes the stored `year`.

Why a computed value and not a reset of the stored year:

- The stored year stays untouched, so it is only a display rule. If purchases of that year exist again, for example after the lists finish loading or refresh, that year is shown again.
- A reset would need a `watch` that writes shared state. While the lists are still loading, `purchases` is empty and `years` holds only the current year, so such a watch, which runs whether or not the select is visible yet, could throw away a valid choice. It would have to wait for the lists first.

The month page and the costs page do not use the stored year.

Tests: `tests/nuxt/dashboard-page.test.ts`, describe "dashboard page year selector" (falls back when the stored year has no purchases; keeps a stored year that is in the list; falls back after the purchases of the selected year are deleted).

## Header and navigation on small screens

Issue #21. The layout is `app/layouts/default.vue`. Nuxt UI's `UHeader` hides its default slot below the `lg` breakpoint (1024 px; the theme sets `hidden lg:flex` on it) and shows a toggle button instead. A navigation in the default slot alone would vanish on a phone, so the layout uses four slots (the dialog described below sits after `UMain`, outside the header):

| Slot | Content | Visible |
| --- | --- | --- |
| `#title` | `LogoMark` and the app name (`app.name`), see [Logo mark](colour-scheme.md#logo-mark) | At every width |
| default | `UNavigationMenu` with `navItems` | From `lg` up |
| `#body` | The same `navItems`, `orientation="vertical"` | In the mobile menu, opened by the toggle |
| `#right` | `LanguageSwitcher` | At every width |

Both menus read the one `navItems` computed (labels from `nav.dashboard`, `nav.costs` and `nav.thisMonth`, wrapped in `computed` so they follow a language switch), so they cannot drift apart. The language switcher is outside the menu on purpose: it stays reachable with one tap and the menu holds only pages.

- The toggle's accessible name is a Nuxt UI text, not one of ours: "Open menu" / "Close menu" (German "Menü öffnen" / "Menü schließen"), taken from the Nuxt UI locale, which follows the i18n locale.
- The menu closes after a navigation: `UHeader` watches `route.fullPath` and sets `open` to false (prop `autoClose`, default `true`).
- Add a new page to `navItems` once; it then appears in both places. Only today's month page is in the navigation (see below); other month pages stay out of it.

### The "This month" navigation entry

Issue #56. `navItems` has a third entry after Dashboard and Costs: "This month" (German "Dieser Monat", key `nav.thisMonth`). It links to `monthPath(currentYear, currentMonth)`, with `currentYear` and `currentMonth` from `useYear()` and `monthPath` from `useMonth()`. The address has a two-digit month, for example `/months/2026/11`. The desktop menu and the vertical mobile menu share the entry, like the other two.

Decision for #56: the entry is the current item (`aria-current="page"`) only on the page of today's month. It is not marked on other month pages, and not on the same month of another year. On those pages no navigation item is current.

Known limits:

- "Today" is read once per app load (see `useYear()` under [Composables](#composables)). A tab that stays open past midnight into a new month keeps the old month in the link until the page is reloaded. This follows from the existing `useYear` decision.
- The shorter phone label "Month" named in the issue belongs to the bottom tab bar (#54), which does not exist yet.

Tests: `tests/nuxt/DefaultLayout.test.ts` checks the order (Dashboard, Costs, This month), the path with a two-digit month computed from `useYear()`, the current state on today's month page but not on another month page or the same month of another year, Dashboard and Costs on their own pages, and the German names. In `tests/nuxt/error-page.test.ts` the link finder now ignores links inside the header, because the header has a second link to a month page.

Checked by hand against the dev server: the link is `/months/2026/11` on `/` and on month pages, and `aria-current` is only set on `/months/2026/11`. Not checked: the mobile menu on a phone, 320 px, and the sidebar (#53, does not exist yet) *(to verify)*.

### How to check it

There is no automated test, because jsdom has no layout and cannot tell a wide from a narrow screen. Check by hand:

1. Run `pnpm dev` and open the app.
2. Set the browser window or the device toolbar to 320 px wide.
3. The top bar shows the title, the language list and the menu button. The links are not visible.
4. Open the menu, choose **Costs**: the page changes and the menu closes.
5. Switch the language in the top bar and repeat. The toggle name and the links change language.
6. Widen the window to 1024 px or more: the toggle disappears and the links sit in the top bar.

Checked so far at 320 px in English and German. Dark mode is not checked yet *(to verify)*. Whether the whole bar fits at 320 px with a long German label is covered by that check only for the current texts.

## Add and edit dialog

Groundwork for the sidebar (#53) and the floating add button (#55). `app/layouts/default.vue` renders one `UModal` with `CostForm` for the whole app. A page, or later a sidebar or a floating button, does not own a modal. It asks the layout to open it through `useCostDialog()`.

| Call | Opens | State after |
| --- | --- | --- |
| `openAdd()` | Empty add form | `cost` and `month` are `null` |
| `openAdd(monthRef)` | Add form pre-filled for that month (a purchase starts on its first day, the date field is limited to the month, a hint names the month) | `month` set, `cost` is `null` |
| `openEdit(cost)` | Edit form for a `Stored<Cost>`; the kind is locked | `cost` set, `month` is `null` |
| `close()` | Closes the dialog | All three cleared |

Each of `openAdd` and `openEdit` resets the other value, so nothing leaks into the next dialog.

Who calls what:

| Place | Call |
| --- | --- |
| Dashboard: "Add a cost" tile and the "Add cost" button of an empty "This month" card | `openAdd()` |
| `/costs`: "Add cost" button | `openAdd()` |
| `/costs`: pencil button of a row | `openEdit(row.original)` |
| Month page: "Add cost" next to the heading and in the empty month card | `openAdd(monthRef)` |

The delete confirmation is not part of this. It stays a modal of the costs page.

What the layout does:

- The title is "Add cost" or "Edit <name>", depending on `cost`.
- `CostForm` gets `:cost` and `:month`.
- When the modal closes (close button, backdrop, Escape), `@update:open` calls `close()`. `@cancel` calls `close()` too.
- On `@saved` the layout awaits `retry()` from `useCostLists()` and then calls `close()`. Every page that shows the lists updates.
- The layout calls `useCostLists()`. The pages fetch the same lists, so this adds no requests.

State lives in `useState`, not in provide/inject, so any component can open the dialog without being a child of the layout.

### Known limit: the costs table loads on the client

`/costs` used to have its own non-lazy `useFetch` calls. Nuxt gave them different cache keys than the layout's, so after a save from the dialog the table did not update until a reload. The page now uses `useCostLists()`. The table is therefore filled on the client: it is empty while loading, and the page has no loading or error state yet (the dashboard and the month page have).

### Tests

- `tests/nuxt/CostDialog.test.ts` (13 tests, mounted on the layout): opens empty, pre-filled for an edit and for a month (date on the first day, `min` and `max`, hint); Cancel and the close button clear the state; no leftover cost or month in the next dialog; focus returns to the element that had it before the dialog opened; both lists are loaded again and the dialog closes after a save; German.
- `dashboard-page.test.ts`, `costs-page.test.ts` and `month-page.test.ts` only check that the page asks for the dialog with the right state (`open`, `cost`, `month` of `useCostDialog()`), and that the page shows new numbers after `refreshNuxtData()`.
- Every file that touches the dialog closes its state after each test, because `useState` outlives a test.

Checked by hand in the browser: the dashboard and month page buttons open the dialog, and the costs table updates after a save. Not checked: use from a sidebar or floating button (they do not exist yet) and the dialog on a phone *(to verify)*.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds. It sits in the layout's one dialog, see [Add and edit dialog](#add-and-edit-dialog). Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` and `cancel`. Failed saves show a toast. |
| `YearSelect.vue` | `v-model` year select with a visible label; takes a `years` list |
| `BusinessBadge.vue` | The "Business" badge with a briefcase icon, no props. See [Business badge](colour-scheme.md#business-badge) |
| `CategoryBadge.vue` | Round disc with a white category icon; props `category` and `size` (28, 32, 36, 40, 44, 56). Decoration only (`aria-hidden`), the name is text in the parent. See [Category badge](colour-scheme.md#category-badge) |
| `LogoMark.vue` | The Costcompass mark (disc, ring, compass needle) as an inline SVG, no props. Decoration only (`aria-hidden`), sized by the parent. Used in the header title. See [Logo mark](colour-scheme.md#logo-mark) |
| `LanguageSwitcher.vue` | `USelect` that calls `setLocale()`; accessible name from `language.label`. Sits in the `#right` slot of the header, see [Header and navigation on small screens](#header-and-navigation-on-small-screens) |

`CostForm` is opened through the [add and edit dialog](#add-and-edit-dialog). It validates with the Zod schemas from `shared/utils/validation.ts`, so the browser and the API apply the same rules, except that the date field limit of the `month` prop is a browser limit only.

## Composables

| Composable | Returns |
| --- | --- |
| `useMoney(options?)` | A formatter for euros: whole euros, or cents with `useMoney({ cents: true })` |
| `useYear()` | `year` (selected, shared state), `currentYear`, `currentMonth` (read once, in UTC) |
| `useMonth()` | `monthName(month, style?)`, `monthYear(year, month)`, `monthPath(year, month)` |
| `useCostLists()` | `recurring`, `purchases`, `failed`, `loading`, `retry`. Uses `useFetch` with `lazy: true`, so the layout, the dashboard, the costs page and the month page share the cached data. |
| `useCategory()` | `categoryIcon(category)`, `categoryClass(category)`, `categoryStyle(size)` for `CategoryBadge`; also exports `CATEGORY_SIZES` and `CategorySize` |
| `useCostDialog()` | `open`, `cost` (`Stored<Cost> \| null`), `month` (`MonthRef \| null`), `openAdd(month?)`, `openEdit(cost)`, `close()`. State in `useState` (keys `costDialogOpen`, `costDialogCost`, `costDialogMonth`). See [Add and edit dialog](#add-and-edit-dialog). |
| `useAppHead()` | `<html lang>`, `dir` and the title template; called by `app.vue` and `error.vue` |

## Texts and languages

- All UI text is in `i18n/locales/en.json` and `de.json`. Do not hard-code text. Keep both files in step.
- Categories and intervals are keyed by id: `category.housing`, `interval.monthly`.
- Labels that go through `t()` and live in script code must be wrapped in `computed` so they update when the language changes.
- Month names and dates come from `Intl` through `useMonth()`, in UTC, in the active language.
- Page titles: each page sets `useHead({ title: () => t('...') })`. `app.vue` adds the suffix: "<page> – Costcompass".

## Accessibility conventions

- Sections are labelled with `aria-labelledby`; bars and tracks are `aria-hidden` and every value is also real text.
- The split bar is a `role="img"` with a translated `aria-label`.
- The month chart items are links named by a visually hidden text ("January: €800"); the bar and the short label are `aria-hidden`; the focused link has an outline; the current month is bold, not only coloured.
- The costs table sets no `aria-sort`, so the sort buttons carry the state in their `aria-label` (`costs.sort.*`).
- After a successful retry on the month page, focus moves to the `h1`, which has `tabindex="-1"`.
- `<NuxtRouteAnnouncer />` announces the new title after each navigation.

## Calculation core

The pages pass the fetched lists to the functions in `shared/`; see [the calculation core](../backend/calculation-core.md).
