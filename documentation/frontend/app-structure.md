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

## Sidebar navigation

Issue #53 (this replaces the header of #21). The layout is `app/layouts/default.vue`. From the `lg` breakpoint (1024 px) up, the navigation is a sidebar on the left. The layout has no `UHeader` any more.

The layout is a wrapper `div` with `lg:flex lg:min-h-screen`. Its children, in order:

| Element | Content |
| --- | --- |
| Skip link | `<a href="#main">`, text `nav.skip` ("Skip to content"), visually hidden until it has the focus |
| `USidebar` | `collapsible="none"`, `as="div"`, `breakpoint="lg"`, 248 px wide (`[--sidebar-width:15.5rem]`), `shrink-0` |
| `UMain` | `id="main"`, `min-w-0 flex-1`, with the page slot inside a `UContainer`. `min-w-0` lets the costs table scroll inside its card instead of widening the page |

The add and edit dialog (below) stays outside the wrapper.

The sidebar has three parts:

| Part | Content |
| --- | --- |
| Title slot | One `NuxtLink` to `/` with `LogoMark` (36 px) and the app name (`app.name`), see [Logo mark](colour-scheme.md#logo-mark) |
| Body | The "Add cost" button (`UButton`, icon `i-lucide-plus`, classes `pill pill-shadow`, calls `openAdd()`), then one vertical `UNavigationMenu` named by `nav.label` ("Main nav" / "Hauptnavigation") |
| Footer slot | `LanguageSwitcher` |

`navItems` is one `computed` (labels from `nav.dashboard`, `nav.costs` and `nav.thisMonth`, so they follow a language switch). Each item has an icon:

| Item | Path | Icon |
| --- | --- | --- |
| Dashboard | `/` | `i-lucide-layout-dashboard` |
| Costs | `/costs` | `i-lucide-list` |
| This month | `monthPath(currentYear, currentMonth)` | `i-lucide-calendar` |

- Add a new page to `navItems` once. Only today's month page is in the navigation (see below); other month pages stay out of it.
- The "Add cost" button is the only add entry on desktop. `/costs` has no button of its own any more (author's decision). The dashboard tile and the month page buttons stay, see [Add and edit dialog](#add-and-edit-dialog).
- Styling is in `app/assets/css/main.css`: nav links are pills at least 48 px high. A link that is not the current page gets the tint `--ui-bg-accented` and the text colour `#2238b0` (dark mode `#afc0ff`) on hover; Nuxt UI's own hover fill is hidden so the two do not add up. `.pill-shadow` gives the add button a soft cobalt shadow, the same in light and dark mode.
- The language select has a visible label: `LanguageSwitcher` wraps the `USelect` in a `UFormField` with the text `language.label` ("Language" / "Sprache"), connected to the select by `for` and `id`. It has no `aria-label` any more.

### Keyboard order

1. Skip link (appears on the first Tab; Enter moves to `#main`)
2. Logo link
3. Add cost
4. Dashboard, Costs, This month
5. Language select
6. The page content

### Below the `lg` breakpoint

The sidebar is hidden below 1024 px and nothing replaces it yet: there is no navigation, no language select and no layout-level add button on small screens. They come in the same pull request as their own issues: the bottom tab bar (#54), the compact language button (#59) and the floating add button (#55). The menu button and the mobile menu of the old header are gone.

### The "This month" navigation entry

Issue #56. `navItems` has a third entry after Dashboard and Costs: "This month" (German "Dieser Monat", key `nav.thisMonth`). It links to `monthPath(currentYear, currentMonth)`, with `currentYear` and `currentMonth` from `useYear()` and `monthPath` from `useMonth()`. The address has a two-digit month, for example `/months/2026/11`. 

Decision for #56: the entry is the current item (`aria-current="page"`) only on the page of today's month. It is not marked on other month pages, and not on the same month of another year. On those pages no navigation item is current.

Known limits:

- "Today" is read once per app load (see `useYear()` under [Composables](#composables)). A tab that stays open past midnight into a new month keeps the old month in the link until the page is reloaded. This follows from the existing `useYear` decision.
- The shorter phone label "Month" named in the issue belongs to the bottom tab bar (#54), which does not exist yet.

Tests: `tests/nuxt/DefaultLayout.test.ts` checks the sidebar (title link, one named navigation, item order and icons, the add button and its dialog request, skip link and `id="main"`, keyboard order in the DOM, the language select with its visible label, German texts) and, for This month, the path with a two-digit month computed from `useYear()`, the current state on today's month page but not on another month page or the same month of another year, Dashboard and Costs on their own pages, and the German names. In `tests/nuxt/error-page.test.ts` the link finder now ignores links inside the navigation, because the sidebar has a link to a month page.

Checked by hand against the dev server: the link is `/months/2026/11` on `/` and on month pages, and `aria-current` is only set on `/months/2026/11`.

### How to check the sidebar

There is no automated test for the widths, because jsdom has no layout. Check by hand:

1. Run `pnpm dev` and open the app at 1024 px or wider.
2. The sidebar is on the left, 248 px wide, with the logo, "Add cost", the three links and the language select.
3. Press Tab once: the skip link appears. Press Enter: the focus moves to the main content.
4. Choose **Costs**: the page changes and the link is the current item.
5. Switch the language and repeat. The labels change and are not cut off.

Checked in the browser at 1024, 1280 and 1440 px in English and German: no sideways scroll, sidebar 248 px, all links 48 px high, the hover tint is visible in light mode. In dark mode the hover was checked as well: fill `#1E2340`, text `#AFC0FF` (8.62:1), the same values as the dark mock, and the hovered and the current pill (`#262A45`, white text) look alike apart from the text colour; the current page also has `aria-current`. Not checked: 320 px, anything below `lg`, a screen reader, and whether the built-in minimum height of `UMain` (made for a layout with `UHeader`) has any effect next to the wrapper's `lg:min-h-screen` *(to verify)*.

## Add and edit dialog

`app/layouts/default.vue` renders one `UModal` with `CostForm` for the whole app. A page, the sidebar (#53) or later a floating button (#55) does not own a modal. It asks the layout to open it through `useCostDialog()`.

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
| Sidebar: "Add cost" button | `openAdd()` |
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

- `tests/nuxt/CostDialog.test.ts` (mounted on the layout): opens empty (also from the sidebar button), pre-filled for an edit and for a month (date on the first day, `min` and `max`, hint); Cancel and the close button clear the state; no leftover cost or month in the next dialog; focus returns to the element that had it before the dialog opened; both lists are loaded again and the dialog closes after a save; German.
- `dashboard-page.test.ts`, `costs-page.test.ts` and `month-page.test.ts` only check that the page asks for the dialog with the right state (`open`, `cost`, `month` of `useCostDialog()`), and that the page shows new numbers after `refreshNuxtData()`.
- Every file that touches the dialog closes its state after each test, because `useState` outlives a test.

Checked by hand in the browser: the dashboard and month page buttons open the dialog, and the costs table updates after a save. The sidebar button opens the dialog (test in `CostDialog.test.ts`). Not checked: use from a floating button (does not exist yet) and the dialog on a phone *(to verify)*.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds. It sits in the layout's one dialog, see [Add and edit dialog](#add-and-edit-dialog). Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` and `cancel`. Failed saves show a toast. |
| `YearSelect.vue` | `v-model` year select with a visible label; takes a `years` list |
| `BusinessBadge.vue` | The "Business" badge with a briefcase icon, no props. See [Business badge](colour-scheme.md#business-badge) |
| `CategoryBadge.vue` | Round disc with a white category icon; props `category` and `size` (28, 32, 36, 40, 44, 56). Decoration only (`aria-hidden`), the name is text in the parent. See [Category badge](colour-scheme.md#category-badge) |
| `LogoMark.vue` | The Costcompass mark (disc, ring, compass needle) as an inline SVG, no props. Decoration only (`aria-hidden`), sized by the parent. Used in the sidebar title. See [Logo mark](colour-scheme.md#logo-mark) |
| `LanguageSwitcher.vue` | `USelect` that calls `setLocale()`. Wrapped in a `UFormField` with the visible label `language.label`. Sits in the footer slot of the sidebar, see [Sidebar navigation](#sidebar-navigation) |

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
