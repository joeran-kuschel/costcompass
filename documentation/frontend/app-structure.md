# App structure

Reference and conventions for `app/` (pages, components, composables, texts). Written for: developers. End users: see the [user guide](user-guide.md). The server side is in [the backend documentation](../backend/index.md).

## Pages

| Route | File | State | What it does |
| --- | --- | --- | --- |
| `/` | `app/pages/index.vue` | Exists | Dashboard: "This month" card with the recurring and purchases subtotals, "Largest this month" card, year select, summary tiles, household versus business bar, costs by category, costs per month |
| `/costs` | `app/pages/costs.vue` | Exists | One sortable table of both kinds, add, edit and delete |
| `/months/[year]/[month]` | `app/pages/months/[year]/[month].vue` | Exists | Costs of one month, total, previous and next links, add cost in the empty month (pre-filled for the month) |
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

### Subtotals in the "This month" card

Issue #61. Below the comparison line, the card has a description list (`dl`) with two pairs: "Recurring" (`month.recurring`) and "Purchases" (`month.purchases`), the same keys as the month page. The amounts are `recurringTotal` and `purchasesTotal` from `groupMonthCosts(costsInMonth(...))` for today's month and year, so they ignore the year selector like the rest of the card. A group without costs shows `€0.00`, not nothing.

The subtotals use cents (`useMoney({ cents: true })`), while the card's total stays in whole euros. The rounded total can therefore differ from the sum of the two subtotals: 819.99 and 300.50 add up to 1,120.49, and the total shows €1,120. The labels use the `text-muted` colour; their contrast ratio of 4.5:1 is not measured yet.

Tests: `tests/nuxt/dashboard-page.test.ts`, `describe('dashboard page this month subtotals')`: labels and cents, only purchases of the current month, the sum against `monthlyTotals`, zero groups, a month without costs, the `dl` terms and German.

### "Largest this month" card

Issue #63. Written for developers. The card replaces the "Add a cost" tile and sits next to the "This month" card (the weight-2 flex row in `main.css` now selects `largest-title`). It is a `section` with `aria-labelledby="largest-title"`; its `ul` is named by the same heading ("Largest this month", `dashboard.largest.title`), with a hint (`dashboard.largest.text`).

- The rows come from `largestCosts(costsInMonth(...))` for today's month and year, so, like the "This month" card, they ignore the year selector. They are mapped with `toRow` from `useMonth()`.
- Each row has a `CategoryBadge` (40 px), the name, the `BusinessBadge` for business costs, a sub line ("Housing · Monthly", "Appliances · 8 Nov") and the amount with cents.
- A month without costs shows "No costs this month yet." (`dashboard.thisMonth.empty`) and no button.
- The full list of the month is no longer on the dashboard (this also removed the list and the add button from the "This month" card). The "View <month year>" link of that card leads to it on the month page.
- The dashboard has no add entry point of its own. The sidebar button and the phone's round button remain.
- On narrow screens the card wraps below the "This month" card. This was not decided from a mock (the phone mock has no such card).

Tests: `tests/nuxt/dashboard-page.test.ts`, `describe('dashboard page largest this month')`; `describe('largestCosts')` in `tests/nuxt/costs.test.ts`. Not checked in the browser (light and dark mode, German, 320 px); text contrast not measured.

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

Issue #53 (this replaces the header of #21). The layout is `app/layouts/default.vue`. From the `lg` breakpoint (1024 px) up, the navigation is a sidebar on the left (`hidden lg:block`); below it, see the [bottom tab bar](#bottom-tab-bar). The layout has no `UHeader` any more.

The layout is a wrapper `div` with `lg:flex lg:min-h-screen`. Its children, in order:

| Element | Content |
| --- | --- |
| Skip link | `<a href="#main">`, text `nav.skip` ("Skip to content"), visually hidden until it has the focus |
| `USidebar` | `collapsible="none"`, `as="div"`, `breakpoint="lg"`, 248 px wide (`[--sidebar-width:15.5rem]`), `shrink-0` |
| `UMain` | `id="main"`, `min-w-0 flex-1`, with the page slot inside a `UContainer` with `class="mx-0"`: the content is aligned to the left edge of the area next to the sidebar, up to 1160 px wide (the container's default `mx-auto` centred it, which left a growing gap on both sides on wide screens). `min-w-0` lets the costs table scroll inside its card instead of widening the page |

The add and edit dialog (below) stays outside the wrapper.

The sidebar has three parts:

| Part | Content |
| --- | --- |
| Title slot | One `NuxtLink` to `/` with `LogoMark` (36 px) and the app name (`app.name`), see [Logo mark](colour-scheme.md#logo-mark) |
| Body | The "Add cost" button (`UButton`, icon `i-lucide-plus`, classes `pill pill-shadow`, calls `openAdd()`), then one vertical `UNavigationMenu` named by `nav.label` ("Main nav" / "Hauptnavigation") |
| Footer slot | `LanguageSwitcher` |

The items come from `useNavItems()` (one `computed`; labels from `nav.dashboard`, `nav.costs` and `nav.thisMonth`, so they follow a language switch), shared with the [bottom tab bar](#bottom-tab-bar). Each item has an icon:

| Item | Path | Icon |
| --- | --- | --- |
| Dashboard | `/` | `i-lucide-layout-dashboard` |
| Costs | `/costs` | `i-lucide-list` |
| This month | `monthPath(currentYear, currentMonth)` | `i-lucide-calendar` |

- Add a new page to `useNavItems` once. Only today's month page is in the navigation (see below); other month pages stay out of it.
- The "Add cost" button is the only add entry on desktop. `/costs` has no button of its own any more (author's decision). The dashboard has no add entry of its own since #63; see [Add and edit dialog](#add-and-edit-dialog).
- Styling is in `app/assets/css/main.css`: nav links are pills at least 48 px high. A link that is not the current page gets the tint `--ui-bg-accented` and the text colour `#2238b0` (dark mode `#afc0ff`) on hover; Nuxt UI's own hover fill is hidden so the two do not add up. `.pill-shadow` gives the add button a soft cobalt shadow, the same in light and dark mode. The icon of the current item takes the colour of its text (white, as in the mocks): Nuxt UI gives it the primary colour, which was 2.64:1 against the dark pill in light mode (below the 3:1 for icons) and not white in dark mode; the rule `nav [data-slot="link"][aria-current="page"] [data-slot="linkLeadingIcon"] { color: inherit }` fixes that. Checked in the browser: the icon is white in both modes, the icons of the other items are unchanged. No unit test, because jsdom has no styles.
- The language select has a visible label: `LanguageSwitcher` wraps the `USelect` in a `UFormField` with the text `language.label` ("Language" / "Sprache"), connected to the select by `for` and `id`. It has no `aria-label` any more.

### Keyboard order

From `lg` up:

1. Skip link (appears on the first Tab; Enter moves to `#main`)
2. Logo link
3. Add cost
4. Dashboard, Costs, This month
5. Language select
6. The page content

Below `lg` the order is: skip link, [language button](#compact-language-button-on-phones), the page content, then the tab bar and its add button.

### Below the `lg` breakpoint

Below 1024 px the sidebar is hidden and the [bottom tab bar](#bottom-tab-bar) is the navigation. The round [add button](#add-button-on-phones) (#55) sits next to it, and the [compact language button](#compact-language-button-on-phones) (#59) sits at the top right. With these three the phone layout is complete. The menu button and the mobile menu of the old header are gone.

`USidebar` has `hidden lg:block`. With `collapsible="none"` it has no mobile behaviour of its own, and `breakpoint="lg"` only matters for the collapsible modes, so before this change the sidebar also showed on phones. Now below 1024 px only the tab bar shows, from 1024 px only the sidebar. The DOM holds two `nav` landmarks, both named "Main nav" (`nav.label`); one of them is always `display: none`, so a screen reader meets only one.

## Bottom tab bar

Issue #54. Written for developers. On phones the navigation is a pill that floats above the bottom edge, with the same three destinations as the sidebar.

### Parts

| Part | File | What it does |
| --- | --- | --- |
| `MobileBar.vue` | `app/components/MobileBar.vue` | A `div` (`fixed inset-x-4 bottom-7 z-40 flex items-center gap-2.5 lg:hidden`) with one `<nav>` named `nav.label` (class `mobile-tabs`). In it, one `NuxtLink` (class `mobile-tab`) per item: a decorative `UIcon` (`size-5`) above the short label. Used once, in `layouts/default.vue` (`<MobileBar />`, next to the `UModal`, outside the flex wrapper). |
| `useNavItems()` | `app/composables/useNavItems.ts` | Returns `items`, a `computed` that follows the language. Each item has `label`, `shortLabel`, `to` and `icon`. |
| Styles | `app/assets/css/main.css` | `.mobile-tabs`, `.mobile-tab` and the bottom padding of `main`, see below. |
| Viewport meta | `nuxt.config.ts` | `width=device-width, initial-scale=1, viewport-fit=cover`. |

The outer row is a flex row, so the round add button of #55 sits next to the pill, see [Add button on phones](#add-button-on-phones).

### The items

| Item | `label` | `shortLabel` | `to` | `icon` |
| --- | --- | --- | --- | --- |
| Dashboard | `nav.dashboard` | `nav.dashboard` | `/` | `i-lucide-layout-dashboard` |
| Costs | `nav.costs` | `nav.costs` | `/costs` | `i-lucide-list` |
| This month | `nav.thisMonth` ("This month" / "Dieser Monat") | `nav.month` ("Month" / "Monat") | `monthPath(currentYear, currentMonth)` | `i-lucide-calendar` |

The sidebar and the tab bar both read `useNavItems()`. The layout's own `navItems`, with its `useYear()` and `useMonth()` calls, moved into the composable. The sidebar passes the items to `UNavigationMenu`, which ignores `shortLabel` (no stray attribute in the markup). The short label "Month" fits three tabs on a 320 px screen. Add a new page to `useNavItems` once; both navigations get it.

### Styles

- `.mobile-tabs`: `flex: 1`, 6 px padding, fully rounded, background `#14162b` (light) and `#262a45` (dark), shadow `0 12px 28px -8px rgba(20, 22, 43, .45)`.
- `.mobile-tab`: `flex: 1`, a column with a 2 px gap, at least 56 px high, 11 px bold text in `#b8bcd3`, rounded. The current tab (`[aria-current="page"]`) is filled with `var(--ui-primary)` (`#2d4bd8` light, `#3b5beb` dark) with white text. The current page is therefore carried by the fill and not by the text colour alone.
- `:focus-visible` on a tab: a 3 px white outline with offset -3 px. The mock has no focus style; this one was added.
- Bottom padding: a media query `(width < 64rem)` gives `main` `padding-bottom: calc(7rem + env(safe-area-inset-bottom))`, so no content sits behind the bar. The bar is 68 px high and ends 28 px above the bottom edge; 112 px leaves air.

Contrast, calculated: resting text on the pill 9.47:1 (light) and 7.45:1 (dark); white on the current tab 6.75:1 (light) and 5.41:1. The dark pill (`#262a45`) against the dark page (`#0b0c14`) is only 1.39:1. That follows the mock and is a shape contrast, not a text contrast; look at it on a real screen.

### Viewport meta

`nuxt.config.ts` sets `viewport-fit=cover`. The one tag replaces Nuxt's default viewport tag. Without it `env(safe-area-inset-bottom)` has no value on a notched phone.

`interactive-widget` is deliberately not set. With the default, the fixed bar stays at the bottom of the layout viewport and is simply behind the on-screen keyboard: it neither jumps up nor covers the field being typed in. `interactive-widget=resizes-content` would make it jump above the keyboard. This is reasoning, not tested on a phone *(to verify)*.

### Tests

- `tests/nuxt/MobileBar.test.ts` (the add button has its own describe, see [Add button on phones](#add-button-on-phones)): one named `nav`, three tabs in order with the short labels, real links with hrefs (today's month with a two-digit month), hidden decorative icons, German names, the row is `fixed` and `lg:hidden`.
- `tests/nuxt/useNavItems.test.ts`: labels, short labels, links, an own Lucide icon per item, German and a language switch.
- `tests/nuxt/DefaultLayout.test.ts`: two navs both named "Main nav", the `hidden lg:block` and `lg:hidden` pair, sidebar queries scoped to the sidebar.
- The current tab (`aria-current`) has no unit test: the test environment's router does not report a `NuxtLink` as active.

### Checked and not checked

Checked in the browser (dev server, iframes of the given widths, measured values; a screenshot of the bar did not work): at 320, 390 and 1023 px the bar shows and the sidebar is hidden, at 1024 and 1280 px the reverse. No sideways overflow. Each tab is 56 px high. At 320 px the pill is 288 px wide and each tab 92 px, at 390 px 115 px; no label is clipped in English or German. The pill's bottom edge is 28 px above the viewport bottom. The computed colours match the mock in light and dark mode. The current tab was checked on `/costs`, on today's month page and on another month page (no tab is current there).

Not checked *(to verify)*: a real or notched phone and the safe area, the on-screen keyboard, a screen reader, the keyboard focus outline on the tabs, and the bar below 1024 px on pages other than `/costs`.

### Add button on phones

Issue #55. Written for developers. `MobileBar.vue` has a second child in the fixed row, after the `nav`: a `UButton` (class `mobile-add`, icon `i-lucide-plus`, no visible text) with an `aria-label`. It calls `openAdd(monthRef)` of [`useCostDialog()`](#add-and-edit-dialog). From 1024 px the row is `lg:hidden`, so the button is not there; the sidebar has its own "Add cost" button.

| Where | Accessible name | Dialog opens |
| --- | --- | --- |
| Month page | `costs.addToMonth`, "Add cost to {month}" / "Kosten zu {month} hinzufügen", for example "Add cost to November 2026" (`monthYear` of `useMonth()`) | With the month's defaults: a purchase starts on the first day, the date is limited to the month, a yearly or quarterly cost starts with that due month |
| Any other page | `costs.add`, "Add cost" / "Kosten hinzufügen" | Empty |

- `monthRef` is a `computed` that runs `monthParamsSchema.safeParse(route.params)`, the same check the month page uses. It gives `{ year, month }` on a month page and `null` elsewhere. It is computed because the layout, and so `MobileBar`, stays mounted while the user navigates.
- The button has `v-if="!open"`: it disappears while the add or edit dialog is open and comes back when it closes. The tabs stay.
- Styles in `main.css`: `.mobile-add` is 68 px round, `flex: none`, background `var(--ui-primary)` (`#2d4bd8` light, `#3b5beb` dark), white icon, shadow `0 12px 28px -8px rgba(45, 75, 216, .6)`; the icon inside (`[data-slot="leadingIcon"]`) is 28 px. The values come from the mocks `BPhoneDashboard` and `BDarkPhoneDashboard`.
- Tests: `tests/nuxt/MobileBar.test.ts`, describe "MobileBar add button": a round icon button named "Add cost" with a hidden plus icon and no text; named after the month on a month page; the plain name elsewhere; German names, including "Kosten zu März 2026 hinzufügen"; an empty dialog elsewhere and the shown month on a month page (checked through the state of `useCostDialog()`); not there while the dialog is open and back after it closes; the tabs stay.

Checked in the browser (dev server, iframes): the button is 68 x 68 px, radius 9999px, fill `rgb(45, 75, 216)`, icon 28 px, the shadow as above, 16 px from the right edge, on the same row as the tab bar. At 390 px the tab pill is 280 px wide, at 320 px 210 px; no sideways overflow at either width. On `/costs` the dialog opens empty; on `/months/2026/11` it opens with the date `2026-11-01` and a date minimum of `2026-11-01`. While the dialog is open the button is gone.

Not checked *(to verify)*: the label on a month page in a real screen reader, the German label in the browser, dark mode, a real phone, whether the button covers page content (the pages have 112 px bottom padding below 1024 px since #54, and the button does not change the row's height), and the keyboard focus order and a visible focus style on the round button (the tabs have a white outline; the button has only Nuxt UI's default).

### Compact language button on phones

Issue #59. Written for developers. Below 1024 px the sidebar and its language select are hidden, so `LanguageSwitcher` has a second look: a round button with the code of the active language ("EN" / "DE") that opens a small menu.

- Prop `compact` (optional boolean). Without it nothing changes: the `USelect` with the visible `UFormField` label, used in the sidebar. With it the component renders a `UDropdownMenu` around a `UButton` (`color="neutral"`, `variant="ghost"`, class `language-compact`). The locale logic (`locale`, `locales`, `setLocale`, the item list) is shared; only the template differs.
- The menu lists the languages by name ("English", "Deutsch") as checkbox items (`menuitemcheckbox`). The active one has `aria-checked="true"`. Choosing one calls `setLocale()` and closes the menu.
- The accessible name of the button is `language.current`: "Language: English" / "Sprache: Deutsch". The code on the button is not its name. `language.label` stays for the select.
- The compact branch is wrapped in a `div`, because `UDropdownMenu` has no root element of its own and a `class` passed from outside must land somewhere.
- Placement: `layouts/default.vue` renders `<LanguageSwitcher compact class="absolute right-4 top-4 z-30 lg:hidden" />` as the second child of the wrapper, after the skip link and before the sidebar. The wrapper has `relative`. Below `lg` the button is 16 px from the top and the right of the page and scrolls away with the page; from `lg` up it is not displayed and the sidebar's select is used.
- Style in `main.css`: `.language-compact` is at least 44 px high, has 14 px side padding, is fully rounded, 13 px at weight 800. Light: white fill, text `#14162b`, shadow `0 1px 2px rgba(20, 22, 43, .08)`. Dark: fill `#15172a`, text `#ecedf7`. Hover uses `--ui-bg-accented`. The values come from the mocks `BPhoneDashboard` and `BDarkPhoneDashboard`; the hover is not in the mocks.

Decisions (author unless noted):

- **Own element in the layout**, not inside each page's heading row, so every page gets it once.
- **Reuse the component** with a `compact` prop instead of a second component.
- **`absolute`, not `fixed`**: it scrolls away with the page and does not cover content.
- **Menu, not a toggle** (the assistant chose, the author left it open). A menu names both languages and still works with a third; a toggle between two codes would not.
- The month page lost its "Add cost" button next to the heading. The sidebar on desktop and the round button next to the tab bar on phones are the entry points, and the phone button already passes the month on a month page. This also keeps the top right of the heading row free for the language button. The button in the empty-month card stays.

Tests:

- `tests/nuxt/LanguageSwitcher.test.ts` (compact): one round button with the code and no select; named "Language: English"; class `language-compact`; the menu lists both languages and marks the active one; switching to Deutsch without a reload updates the code and the name, and back. The tests open the menu with Enter on the button, because the test environment does not open it from a simulated pointer event. A real browser opens it with a click too (checked).
- `tests/nuxt/DefaultLayout.test.ts`: keyboard order on a desktop and on a phone; the compact button is `lg:hidden` and `absolute`.
- `tests/nuxt/month-page.test.ts`: no add button next to the heading; the empty-month button asks for the dialog with the month of the address; its German label.

Checked in the browser (dev server, iframes): at 390 and 320 px the button is 45 x 44 px, 16 px from the right and the top, white (`rgb(255, 255, 255)`) with text `rgb(20, 22, 43)` in light mode and `rgb(21, 23, 42)` with text `rgb(236, 237, 247)` in dark mode. No sideways overflow. At 1024 px it is not displayed. On `/` and on month pages its box does not overlap the heading. On `/costs` the full-width box of the `h1` overlaps the button's box, but the short text "Costs" does not reach it. The menu opens with English ticked; choosing Deutsch sets `<html lang>` to "de", the button reads "DE", its name is "Sprache: Deutsch", the menu closes and the choice is stored in the language cookie. The menu stays inside the viewport.

Not checked *(to verify)*: a real phone, the menu with a screen reader, the keyboard focus outline of the button, long headings under the button at 320 px (the month page heading starts lower, but this was not measured with a long one).

### The "This month" navigation entry

Issue #56. `navItems` has a third entry after Dashboard and Costs: "This month" (German "Dieser Monat", key `nav.thisMonth`). It links to `monthPath(currentYear, currentMonth)`, with `currentYear` and `currentMonth` from `useYear()` and `monthPath` from `useMonth()`. The address has a two-digit month, for example `/months/2026/11`. 

Decision for #56: the entry is the current item (`aria-current="page"`) only on the page of today's month. It is not marked on other month pages, and not on the same month of another year. On those pages no navigation item is current.

Known limits:

- "Today" is read once per app load (see `useYear()` under [Composables](#composables)). A tab that stays open past midnight into a new month keeps the old month in the link until the page is reloaded. This follows from the existing `useYear` decision.
- The shorter phone label "Month" (`nav.month`) is used by the [bottom tab bar](#bottom-tab-bar) only; the sidebar keeps "This month".

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

`app/layouts/default.vue` renders one `UModal` with `CostForm` for the whole app. A page, the sidebar (#53) or the floating phone button (#55) does not own a modal. It asks the layout to open it through `useCostDialog()`.

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
| Sidebar: "Add cost" button | `openAdd()` |
| Phone: round add button next to the tab bar | `openAdd(monthRef)`, `monthRef` is `null` outside month pages |
| `/costs`: pencil button of a row | `openEdit(row.original)` |
| Month page: "Add cost" in the empty month card (no button next to the heading since #59) | `openAdd(monthRef)` |

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

Checked by hand in the browser: the dashboard and month page buttons open the dialog, and the costs table updates after a save. The sidebar button opens the dialog (test in `CostDialog.test.ts`). Not checked: the dialog on a phone *(to verify)*.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds. It sits in the layout's one dialog, see [Add and edit dialog](#add-and-edit-dialog). Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` and `cancel`. Failed saves show a toast. |
| `YearSelect.vue` | `v-model` year select with a visible label; takes a `years` list |
| `BusinessBadge.vue` | The "Business" badge with a briefcase icon, no props. See [Business badge](colour-scheme.md#business-badge) |
| `CategoryBadge.vue` | Round disc with a white category icon; props `category` and `size` (28, 32, 36, 40, 44, 56). Decoration only (`aria-hidden`), the name is text in the parent. See [Category badge](colour-scheme.md#category-badge) |
| `LogoMark.vue` | The Costcompass mark (disc, ring, compass needle) as an inline SVG, no props. Decoration only (`aria-hidden`), sized by the parent. Used in the sidebar title. See [Logo mark](colour-scheme.md#logo-mark) |
| `MobileBar.vue` | The bottom tab bar below `lg`: a named `nav` with three tab links from `useNavItems()`, and the round add button. No props. See [Bottom tab bar](#bottom-tab-bar) |
| `LanguageSwitcher.vue` | Switches the language with `setLocale()`. Without props: a `USelect` in a `UFormField` with the visible label `language.label`, in the footer slot of the sidebar, see [Sidebar navigation](#sidebar-navigation). With `compact`: a round button with the language code and a menu of the languages, at the top right below `lg`, see [Compact language button](#compact-language-button-on-phones) |

`CostForm` is opened through the [add and edit dialog](#add-and-edit-dialog). It validates with the Zod schemas from `shared/utils/validation.ts`, so the browser and the API apply the same rules, except that the date field limit of the `month` prop is a browser limit only.

## Composables

| Composable | Returns |
| --- | --- |
| `useMoney(options?)` | A formatter for euros: whole euros, or cents with `useMoney({ cents: true })` |
| `useYear()` | `year` (selected, shared state), `currentYear`, `currentMonth` (read once, in UTC) |
| `useMonth()` | `monthName(month, style?)`, `monthYear(year, month)`, `monthPath(year, month)`, `toRow(cost)` (a display row for a stored cost: `key`, `name`, `subline`, `business`, `amount` in cents, `category`; used by the month page and the "Largest this month" card) |
| `useCostLists()` | `recurring`, `purchases`, `failed`, `loading`, `retry`. Uses `useFetch` with `lazy: true`, so the layout, the dashboard, the costs page and the month page share the cached data. |
| `useNavItems()` | `items` (computed, follows the language): `label`, `shortLabel`, `to`, `icon` for Dashboard, Costs and This month. Read by the sidebar and `MobileBar`. |
| `useCategory()` | `categoryIcon(category)`, `categoryClass(category)`, `categoryStyle(size)` for `CategoryBadge`; also exports `CATEGORY_SIZES` and `CategorySize` |
| `useCostDialog()` | `open`, `cost` (`Stored<Cost> \| null`), `month` (`MonthRef \| null`), `openAdd(month?)`, `openEdit(cost)`, `close()`. State in `useState` (keys `costDialogOpen`, `costDialogCost`, `costDialogMonth`). See [Add and edit dialog](#add-and-edit-dialog). |
| `useAppHead()` | `<html lang>`, `dir` and the title template; called by `app.vue` and `error.vue` |

## Texts and languages

- All UI text is in `i18n/locales/en.json` and `de.json`. Do not hard-code text. Keep both files in step.
- Categories and intervals are keyed by id: `category.housing`, `interval.monthly`.
- Labels that go through `t()` and live in script code must be wrapped in `computed` so they update when the language changes.
- Month names and dates come from `Intl` through `useMonth()`, in UTC, in the active language.
- Add button texts: `costs.add` (all pages) and `costs.addToMonth` (month pages, "Add cost to {month}" / "Kosten zu {month} hinzufügen"), used by the [phone add button](#add-button-on-phones).
- Language texts: `language.label` (the select: "Language" / "Sprache") and `language.current` (the compact button's name, "Language: {language}" / "Sprache: {language}").
- Navigation texts: `nav.label`, `nav.dashboard`, `nav.costs`, `nav.thisMonth` and `nav.month` (the short label of the tab bar: "Month" / "Monat").
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
