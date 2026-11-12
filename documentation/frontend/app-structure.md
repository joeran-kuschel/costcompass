# App structure

Reference and conventions for `app/` (pages, components, composables, texts). Written for: developers. End users: see the [user guide](user-guide.md). The server side is in [the backend documentation](../backend/index.md).

## Pages

| Route | File | State | What it does |
| --- | --- | --- | --- |
| `/` | `app/pages/index.vue` | Exists | Dashboard: "This month" hero card with the recurring and purchases subtotals, "Largest this month" card, summary card with the year select in its header, household and business ring, "Where your money goes" (categories), "Month by month" |
| `/costs` | `app/pages/costs.vue` | Exists | A summary line under the heading (counts and the yearly total), kind filter chips (from `sm`) and category filter chips with a no-match card, one sortable table of both kinds (grouped lists with an actions menu on phones, #86), add, edit and delete |
| `/months/[year]/[month]` | `app/pages/months/[year]/[month].vue` | Exists | Costs of one month, total, "By category" card with the household and business totals, previous and next links, add cost in the empty month (pre-filled for the month) |
| `/calculator` | - | Planned | Rate calculator |

`app/error.vue` is the error page, not a route. It shows one of three variants (`notFound`, `generic`, `month`), picked by the error. Texts come from `error.<variant>Title` and `error.<variant>Text`. The `month` variant is used when the month page throws an error with `data: { reason: 'month' }`.

Month pages are reached from the dashboard (see [Dashboard links to month pages](#dashboard-links-to-month-pages)) and, for today's month, from the "This month" entry in the navigation (see [The "This month" navigation entry](#the-this-month-navigation-entry)). Other months have no navigation entry.

### Page states

The dashboard and the month page get their data with `useCostLists()` and show these states, in this order of priority. On the dashboard the shell is the `h1`, both cost lists fetched with `useFetch` and `lazy: true` (the same URLs as `/costs`, so both pages share the cached data), and three states decided by computed flags: `loading` (a list has not arrived yet), `failed` (either request failed) and `empty` (no costs at all). The sections, in order: "This month" next to "Largest this month", "Your year", "Where your money goes" next to "Household and business", "Month by month". Everything on the dashboard comes from the `shared/` core, with no API routes of its own.

1. **Failed**: a `UAlert` with `role="alert"` and a retry button that refreshes both lists. No numbers are shown next to it. The month page shows a banner; the dashboard shows a centred card (see [Dashboard error card](#dashboard-error-card)).
2. **Loading**: a visually hidden `role="status"` text plus skeleton blocks marked `aria-hidden`: two on the month page, three cards on the dashboard (see [Dashboard loading skeleton](#dashboard-loading-skeleton)).
3. **Empty**: dashboard only, a centred card with an "Add your first cost" button (see [Dashboard empty card](#dashboard-empty-card)). On the month page an empty month shows a card instead of the groups.
4. **Loaded**: the content.

### Dashboard loading skeleton

Issue #71. While the lists load, the dashboard shows placeholder blocks instead of only a text. Below the `h1`, `pages/index.vue` renders a wrapper `div` with `:aria-busy="loading"` (flex column, 16 px gap). It holds the visually hidden status text (`role="status"`, `sr-only`; `dashboard.loading`, "Loading your costs…", German "Kosten werden geladen …") and `<DashboardSkeleton />`.

`components/DashboardSkeleton.vue` has no props and is static. Its root is `aria-hidden="true"`. It follows the mock BStateLoading with three cards:

- A hero block (`card card-hero` at 35% opacity) with four translucent white `USkeleton` bars.
- A tile card (`card card-flush`): a grid of two columns, four from `lg`, with four tiles that each have a label bar and a value bar of different widths.
- A list card: a heading bar, a rule bar and three rows, each with a circle, a bar and a short bar.

Every `USkeleton` has `role="presentation"`, because `USkeleton` renders `role="alert"` itself and would be announced twice (as on the month page), and `motion-reduce:animate-none`, so the animation stops for people who ask for reduced motion.

The dashboard needs both lists before it shows numbers, because every total depends on both. One slow list therefore keeps the skeleton on screen. This is intended.

Known limit: the skeleton does not have exactly the height of the loaded dashboard, so the layout can still move when the content arrives.

Tests: the `skeleton` `describe` in the loading state of `tests/nuxt/dashboard-states.test.ts` checks the busy region with the status text and the skeleton, that the status text is `sr-only`, that the skeleton is hidden from assistive technology with no alert inside, the three cards, the reduced motion class on every block, that it is gone after a load and after an error, that the page keeps loading until both lists have arrived, and the German status text. The page was checked in the browser (reload with the API delayed by 5 seconds). Not checked: a real phone, a screen reader, measured contrast, whether dark mode matches the dark mock.

### Dashboard error card

Issue #72. When either list fails to load, the dashboard shows a `UAlert` (`role="alert"`, `variant="subtle"`, class `card`) laid out as a centred card instead of a banner:

- A decorative 72 px round disc with a circle-alert icon in the error tint (`aria-hidden`).
- The `title` slot: an `h2` "Could not load your costs." (`dashboard.error.title`).
- The `description` slot: "Your data has not changed. Check your connection and try again." (`dashboard.error.text`, about 18rem wide).
- The `actions` slot: a "Try again" pill button with a refresh icon (`dashboard.retry`, also used by the month page). It is full width on phones and auto width from `sm`. It refreshes both lists.

The API message is not shown. `dashboard.error` is an object with `title` and `text`; before it was one string. The `h1` (`ref="heading"`, `tabindex="-1"`) is shown in all states. After a retry that succeeds, focus moves to it, because the card with the button is gone. After a retry that fails again, focus does not move.

Tests: the error-state `describe` in `tests/nuxt/dashboard-states.test.ts` checks the card structure, that no API message appears, the focus after a successful retry and no focus move after a failed one; the German test checks the new texts. The card was checked in the browser in light and dark mode, in English and German, at 320 px.

### Dashboard empty card

Issue #70. When there are no costs at all, the dashboard shows a centred `UCard` (classes `card card-state mt-6`) instead of a link to `/costs`:

- A decorative row of four overlapping `CategoryBadge`s (housing, food, insurance, mobility; const `EMPTY_BADGES`), 56 px each, in a ring in the card colour, overlapping by 10 px, the second and fourth lifted by 8 px. The row is `aria-hidden`.
- An `h2` "No costs yet" (`dashboard.emptyTitle`) and the text "Add a recurring or a one-off cost to see your totals here." (`dashboard.emptyText`; German "Füge eine wiederkehrende oder eine einmalige Ausgabe hinzu, um hier Deine Summen zu sehen.").
- A pill button "Add your first cost" with a plus icon (`dashboard.emptyAdd`). It calls `openAdd()` and opens the empty add dialog. Before, it was a link to `/costs` labelled "Add cost". It is full width on phones and auto width from `sm`.
- The tip "Tip: start with something monthly, like rent." (`dashboard.emptyTip`; German: "Tipp: Fange mit monatlichen Kosten an, zum Beispiel Deine Miete.").

`main.css` has the modifier `.card.card-state`: the body is a centred flex column with a 12 px gap, padding 40/24/28 px and centred text; `.card-state h2` has no bottom margin. It needs its own rule because the unlayered `.card > [data-slot="body"]` padding beats Tailwind's layered utilities.

Tests: the empty-state `describe` in `tests/nuxt/dashboard-states.test.ts` checks the heading, text, tip and button, four decorative badges with different category classes, that the button opens the empty add dialog and no link to `/costs` is left, and the German texts. The card was checked in the browser. Not checked: a real phone, a screen reader, measured contrast, whether dark mode matches the dark mock exactly.

### Month page

Route `/months/[year]/[month]`, file `app/pages/months/[year]/[month].vue`. It shows the costs of one month (`costsInMonth`) and the month's total, with an add action that opens the same form as `/costs`. The page is started: the address check, the loading and error states, the year check, the content, the navigation, the empty state and adding a cost exist. The year is part of the URL, so a month page does not depend on shared year state, can be bookmarked and works with the back button. The dashboard's monthly totals link to these pages (see [Dashboard links to month pages](#dashboard-links-to-month-pages)).

#### Address

The month in the address is always two digits (`/months/2026/03`), so every month has exactly one address; `3` or `13` give the 404. The address is checked before any data is requested. `monthParamsSchema` (`shared/utils/validation.ts`) accepts a four-digit year and a month `01` to `12`. Anything else shows the not-found error. Links are built with `monthPath(year, month)` from `useMonth()`, which pads the month.

The year check against the valid years (`availableYears`) runs in a `watch` once the lists have loaded (never while loading or after a failed load). A year that is not in the list shows the same not-found error with `showError`.

#### States

Below the heading (`h1`, from the address) the page has a wrapper with `aria-busy` and three states from `useCostLists`:

- **Loading**: a visually hidden `role="status"` text "Loading the costs of <month year>…" and two skeleton blocks. The skeletons are `aria-hidden` with `role="presentation"`, because `USkeleton` renders itself as `role="alert"` and would be announced twice. They stop animating with `motion-reduce:animate-none`.
- **Failed**: a `UAlert` with `role="alert"`, the month in its title, a hint that the data has not changed and a retry button. No total and no API message. After a retry that succeeds, the focus moves to the `h1`, which has `tabindex="-1"`, because the banner with the button that had the focus is gone. After a retry that fails again the focus is not moved; the new banner is announced.
- **Loaded**: the content, see below.

The costs of the month are only rendered in the loaded branch, so a refresh that fails does not leave old numbers next to the error banner. The page is rebuilt for every new address (Nuxt keys the page by its path), so the constants taken from the address are not reactive.

#### Content (#25)

Below the heading row, a wrapper (`mt-4 flex flex-col gap-6 lg:flex-row lg:items-start`) holds two columns, as in the BDesktopMonth mock:

- Left, a column (`flex min-w-0 flex-1 flex-col gap-5`, 20 px between cards) with the hero card, the empty card and the two group sections. The cards have no margins of their own any more (the old `mt-4` and `mt-6` were removed); the gap spaces them.
- Right, the "By category" card (see [By category card](#by-category-card-77) below), 340 px wide from `lg`.

Below `lg` (1024 px) the wrapper is one column, so the "By category" card comes after the lists. The two wrapper `div`s are layout only. The layout already has the one `main`.

The month's total sits in a hero card (see [Month hero](#month-hero-73-74) below). Below it is one `section` per kind that has entries ("Recurring" and "One-off", `month.recurring` and `month.purchases`; German "Wiederkehrend" and "Einmalig"); a group without entries is not shown. Each section has an `h2`, its subtotal and a `ul` of rows. Everything about the month (the groups, subtotals, rows, comparison, counts, category totals, household and business totals and the empty flag) comes from one `useMonthSummary()` call, which runs `monthSummary` from the core (see [Composables](#composables)). The `sections` computed builds the two groups from its `recurringRows`, `purchaseRows`, `recurringTotal` and `purchasesTotal`, and one loop renders both.

Issue #75: each group heading starts with a kind icon. Every `sections` entry carries its `kind` (`'recurring'` or `'purchase'`), and the `h2` (`flex items-center gap-2`) holds a `UIcon` with `kindIcon(section.kind)` from `useKind()` (see [Composables](#composables)) before the title: a repeat icon for "Recurring", a shopping bag for "One-off". The icon is `text-muted` and `aria-hidden="true"`, so the heading's accessible name stays "Recurring" or "One-off". The heading is only "One-off", not "One-off costs" (author's decision in #2, see [Kind label "One-off"](decisions.md#kind-label-one-off-2)). Contrast of the icon, computed from the colour tokens with the WCAG formula, not measured: `#4a4e69` on the card's `#ffffff` is 8.12:1 in light mode, `#a3a7c2` on `#15172a` is 7.46:1 in dark mode, so both clear the 3:1 for graphics. Tests: `tests/nuxt/month-page.test.ts` ("puts a decorative kind icon in each group heading, so the heading text stays the same") and `tests/nuxt/useKind.test.ts`. Checked by the author in the browser: light mode, dark mode and 320 px. Not checked: a real phone, a screen reader.

A row is a soft tile on the tinted `bg-muted` background (18 px radius, `gap-1.5` between rows), laid out as `flex items-center gap-3` (12 px). Issue #76 added the category badge and replaced `justify-between` with a growing text block. A row has:

- a `CategoryBadge` of its own category, 40 px (`:size="40"`). It is decoration only (`aria-hidden`, see [Category badge](decisions.md#category-badge-51)), because the category name is in the sub line,
- a text block (`min-w-0 flex-1`) that takes the free width, so a long name wraps and the amount stays at the right edge. Its first line (`flex flex-wrap items-center gap-1.5`) holds the bold name and, where it applies, the `BusinessBadge` ("Business" with a briefcase icon, see #52) 6 px next to it; under a long name the badge wraps to the next line,
- a sub line (`text-sm text-muted`) from `toRow(cost, 'long')` (see [Composables](#composables)): for a recurring cost "Category · Interval", for a yearly cost with a due month "Category · Yearly, <month>" ("Insurance · Yearly, November", key `interval.yearlyIn`; German "Versicherung · Jährlich, November"); a quarterly or monthly cost shows only the interval. For a purchase "Category · <month> <day>" with the full month name ("Appliances · October 20"; German "Geräte · 20. Oktober"), from `Intl` in the active language, UTC,
- the amount with cents, right-aligned (`shrink-0 text-right`).

English formats as `en-US`, so a date reads "November 8", not "8 November" as in the mock. Switching to `en-GB` would be a separate decision.

No new colours, so there are no new contrast values: the badge colours are under [Category badge](colour-scheme.md#category-badge), and the sub line stays `text-muted`. Tests: `tests/nuxt/month-page.test.ts` ("starts every row with a 40 px badge of its own category, hidden from screen readers", "adds the due month to a yearly cost, not to a quarterly or monthly one", and the German content test). Checked by the author in the browser: light mode, dark mode and 320 px. Not checked: a real phone, a screen reader.

A "This month" badge sits next to the `h1` when the address is today's month and year.

#### Month hero (#73, #74)

The total card is a `UCard` with `class="card card-hero"`, labelled by its `h2` (`aria-labelledby="month-total-title"`). Colours and CSS are in [Hero card](colour-scheme.md#hero-card). It has:

- A decorative ring (`span.hero-ring`, `aria-hidden`), as on the dashboard.
- A wrapping flex row with two columns (`flex-wrap items-end justify-between`). On a narrow screen the right column moves below the left one.
- Left: the heading `h2#month-total-title` "Total for <month>" (`month.total`) and the total as `p.hero-total`. The total is split by `useMoneyParts()` into `whole`, `cents` and `after`, so the cents sit in a smaller `span.hero-cents`: "€2,081" + ".00" in English, "2.081" + ",00" + " €" in German.
- Right, aligned to the end: the comparison pill `p.hero-pill` and the counts line.
- The pill holds the trend icon (`aria-hidden`) and two texts. Below `sm` (640 px) the short text is visible (`month.changeShort.*`: "46% more", "57% less", "Same as before", "No comparison"); it is `aria-hidden` and `sm:hidden`. The long text (`dashboard.thisMonth.*`, the same sentence as on the dashboard: "46% more than September") is `sr-only sm:not-sr-only`, so a screen reader always reads only the long sentence, and from `sm` it is the visible text. Like the counts line, the pill is not rendered in a month without costs.
- The counts line `p.hero-meta` "5 costs · 2 business" (`month.costCount`, which has a singular and a plural form, "1 cost"; `month.businessCount`). It has `hidden sm:block`, so it does not show on phones, and it is not rendered in a month without costs, where the empty card explains the month.

Tests: `describe('month page comparison with the month before')` and `describe('month page counts')` in `tests/nuxt/month-page.test.ts`, see [Testing](testing.md#pages). Not checked in a browser: 320 px and light mode. The heading row above the hero stays on one line on phones since #118, see [Navigation](#navigation-26).

#### By category card (#77)

The month's costs per category, next to the lists from `lg` and below them on a phone. It is an `<aside aria-labelledby="categories-title" class="card px-6 py-5 lg:w-[340px] lg:shrink-0">`, so assistive technology lists it as a named complementary landmark. It holds:

- An `h2#categories-title` "By category" (`month.byCategory`; German "Nach Kategorie").
- A `CategoryList` (see [Components](#components)) with `thisMonthSummary.categoryRows` from `useMonthSummary()`: per category a 36 px `CategoryBadge` (decoration, `aria-hidden`), the translated name and the total with cents. No percentage line.
- A `SplitList` (see [Components](#components)) with the household and business totals of the month, below the categories (#78, see below).

The rows come from `monthCategoryTotals` in the core (see [calculation core](../backend/calculation-core.md#month-page-functions)): only categories with a cost in the month, largest first, equal totals in `CATEGORIES` order. Their sum is the month's total. From `lg` the list has one column, because the `auto-fill` grid of `CategoryList` has room for only one 13.75rem (220 px) column in the 340 px card. Below `lg` the card is as wide as the content, so on a wide tablet screen the rows can sit in two or more columns, as on the dashboard.

States: the card is in the loaded branch, so it is not shown while loading or after a failed load. It is also not shown in a month without costs (`v-if="!thisMonthSummary.empty"`); the empty card explains the month.

Issue #78 added the household and business split from the bottom of the mock's card. The page renders `<SplitList class="mt-3.5 border-t border-default pt-3.5">` below the `CategoryList`: a divider line and 14 px of space on both sides of it, as in the BDesktopMonth mock. The two rows are the same as on the dashboard: a house icon, "Household" (`dashboard.split.household`; German "Haushalt") and the amount; a briefcase icon, "Business" (`business.label`; German "Geschäftlich") and the amount. The amounts are `householdTotal` and `businessTotal` from `useMonthSummary()`, with cents ("€842.75", "€1,020.49"). They come from `monthSummary` in the core, where household is the month's total minus business, so the two add up to the total in the hero card. A month without business costs shows "€0.00" for business. The split is part of the aside, so it is hidden with it: while loading, after a failed load and in a month without costs. Unlike the dashboard card, there is no ring and no percentage.

Decisions: [By category card on the month page](decisions.md#by-category-card-on-the-month-page-77) and [Household and business totals](decisions.md#household-and-business-totals-on-the-month-page-78).

No new colours, so there are no new contrast values: the badge colours are under [Category badge](colour-scheme.md#category-badge), the icons of the split use `text-primary` and `text-secondary` as on the dashboard, the divider uses `border-default`, and the text uses the existing tokens.

Tests: `describe('month page "By category" card')` and `describe('month page household and business totals')` in `tests/nuxt/month-page.test.ts`, see [Testing](testing.md#pages), and `monthCategoryTotals` and `monthSummary` in `tests/nuxt/costs.test.ts`. Checked by the author in the browser (the category list, #77, and the household and business split, #78): light and dark mode, German, 320 px. Not checked: the switch at the `lg` breakpoint, a real phone, a screen reader; contrast is not measured (no new colours).

#### Navigation (#26)

A "Dashboard" link sits above the heading. A previous and a next month icon link sit on either side of the heading (`UButton` with `to`, so real `<a>` elements, 44 px square through the `pill-icon` class in `main.css`). Their accessible name is an `aria-label` that names the target ("Previous month, September 2026"); the paths come from `monthPath`. The targets come from `monthNeighbours` with `availableYears` as the valid years, so a link that would lead to a year without data is hidden. Until the lists have loaded only the current year counts, so the links inside a year are there from the start. Keyboard order: Dashboard, previous, next.

Issue #118 keeps the heading row on one line on phones, as in the BPhoneMonth mock. Before, the row was a wrapping flex row (`flex flex-wrap items-center gap-2`), and on a phone the "This month" badge pushed it onto two lines. Now:

- The row is `grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 sm:flex`. Below `sm` (640 px) it has three columns: the arrows at the edges (2.75rem, the 44 px of `pill-icon`) and the title in the middle.
- The `h1` and the badge sit in a wrapper `div` (`col-start-2 flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left`). On a phone the badge sits below the title, both centred.
- The wrapper is fixed to column 2. When the previous arrow is hidden (the first month with data), the title still sits in the middle; the next arrow is placed in column 3 by the grid. When the next arrow is hidden, column 3 stays empty.
- From `sm` the row is the old flex row again, with the badge next to the title. `col-start-2` has no effect in a flex row.
- The source order is unchanged (previous, title, next), so the keyboard order stays Dashboard, previous, next. The `h1` keeps `tabindex="-1"` for the focus after a retry.

Decision: [Month heading row on phones](decisions.md#month-heading-row-on-phones-118).

Tests: `describe('month page navigation')` in `tests/nuxt/month-page.test.ts`, see [Testing](testing.md#pages). jsdom has no layout, so the tests for #118 check the markup only: the grid classes, the middle column with one arrow hidden, the source order and the `tabindex`. Checked by the author in the browser: 320 and 390 px in English and German, the first and the last month with data (one arrow hidden, the title stays centred), the row from `sm` unchanged, light and dark mode. Not checked: a real phone, a screen reader.

#### Empty month (#28, #79) and adding a cost (#31)

A month without costs (the `empty` flag of `useMonthSummary()`) keeps the total card (with a zero in the money format, without the comparison pill and the counts line) and shows a `UCard` instead of the groups: "No costs in <month>" (`h2`), a hint and a decorative icon. It is in the loaded branch, so it never shows while loading or after an error. Its button names the month, "Add cost to March" (`month.emptyAdd` with `monthName`; German "Kosten für März hinzufügen"), and calls `openAdd(monthRef)`, so the layout's dialog opens with `CostForm` pre-filled for that month (see [Add and edit dialog](#add-and-edit-dialog)). The button next to the heading was removed with #59; the other entry points are the layout's sidebar button and the phone's round add button, which already passes the month. After `saved` the layout refreshes both lists with `retry` (the old data stays on screen meanwhile, so there is no flicker into the skeletons) and closes the dialog.

- **One-off hint (#79, wording #2):** below the button a `p` (`mt-1 text-[13px] text-muted`) says where a new one-off cost starts: "A new one-off cost starts on 1 March 2026." (`month.emptyHint` with `monthYear(year, month)`; German "Ein neuer einmaliger Posten beginnt am 1. März 2026."). The year comes from the address. The "1" and the date form are part of the locale text, so each language keeps its own order ("1 March" / "1. März"); a no-break space (`\u00a0`) after the day keeps "1. März" together at 320 px. Mocks: `BStateMonthEmpty`, `BDarkStateMonthEmpty`; the app says "one-off cost" where the mocks say "purchase" (#2).
- **Checked (#79):** in headless Chromium at 320 px (light, German), 390 px (dark, English) and 1280 px (light, English): no sideways scrolling, the hint in 13 px muted text (`#4A4E69` on white, 8.12:1; `#A3A7C2` on `#15172A`, 7.46:1).
- **Not like the mock:** the card keeps its existing look (plain icon, button only as wide as its text); the mock has an icon disc and a full-width button with a plus icon. #79 only covers the button text and the hint.

Tests: `tests/nuxt/month-page.test.ts`, see [Testing](testing.md).

### Error page

`app/error.vue` is Nuxt's error page, not a route. It shows a translated "Page not found" for an unknown URL (the response has the status 404) and a generic "Something went wrong" for any other error, never the error message. It sits in the default layout, has its own title and its own route announcer, and a "Back to dashboard" button that clears the error and redirects to `/`.

When the error carries `data: { reason: 'month' }` (thrown by the month page), it shows the month variant instead: "That month doesn't exist", a hint that the address has a month outside 1 to 12 or an invalid year, a "Go to <current month and year>" link (`monthPath`) and the same "Back to dashboard" button. The texts are picked by a `variant` (`month`, `notFound` or `generic`) that forms the locale key (`error.<variant>Title`, `error.<variant>Text`). Tests: `tests/nuxt/error-page.test.ts`, see [Testing](testing.md).

### Costs page

Route `/costs`, file `app/pages/costs.vue`. One table with recurring costs and purchases together. It has five columns: Name, Kind, When, Amount and Actions. Since #84 the category and the business flag are shown only in the name column; the table has no Category or Business column. Since #86 phones (below `sm`, 640 px) get the same costs as grouped lists instead of the table, see **Grouped lists on phones** below.

- **Header and summary line:** issue #80. The `h1` "Costs" and one line below it sit in a `<header>`. Since #81 the `h1` shares a row with the phone search button (`div.flex.items-center.justify-between.gap-2`, see **Search** and **Search on phones** below); the summary line follows that row. The line reads "2 recurring costs and 1 one-off cost · €10,891 in 2026" (German "2 wiederkehrende Posten und 1 einmaliger Posten · 10.891 € im Jahr 2026").
  - **Markup:** `<i18n-t keypath="costs.summary.line" tag="p" scope="global" class="mt-1 text-muted">` with the slots `recurring`, `purchases`, `total` and `year`. Only the amount is bold: the `total` slot holds a `b.font-extrabold.tabular-nums.text-default`. `<i18n-t>` keeps the whole sentence one translation, so the word order stays with the translator and no `v-html` is needed. See [Summary line with `<i18n-t>`](decisions.md#summary-line-with-i18n-t-80).
  - **Spacing:** inside the header the global rule `main > div > h1 { margin-bottom: 1rem }` no longer matches, so the line sits 4 px under the heading (`mt-1`). The page container is a wrapping flex row (`main > div:has(table)` in `main.css`, `gap: 1rem 1.5rem`). The table wrapper takes the full width (`> div`, `flex: 1 1 100%`). Since #81 the header is `flex: 1 1 auto` with `min-width: 0`, so from `sm` the search field fits in the same row at the right; the row gap of 1rem still puts 16 px between the rows, as in the BDesktopCosts mock. The old `> h1` and `> button` rules for the former add button are removed.
  - **Values:** all from [`useYearSummary()`](#composables). The counts are `recurringCount` and `purchasesCount`: every cost in the table, not only one year's. The total is `total` (`annualSummary` for the shown year) in whole euros through `useMoney()`. The year is the shown year with the [year fallback](#year-fallback-on-the-dashboard), so the line names the same year as the dashboard.
  - **Loading:** the line has `v-if="!loading"`, so it never shows "0 recurring costs and 0 one-off costs · €0" while the lists load. It follows the lists, so it updates after a save or a delete.
  - **Locale keys:** `costs.summary.recurring` ("{n} recurring cost | {n} recurring costs"), `costs.summary.purchases` ("{n} one-off cost | {n} one-off costs") and `costs.summary.line` ("{recurring} and {purchases} · {total} in {year}"). German: "{n} wiederkehrender Posten | {n} wiederkehrende Posten" (German "Kosten" has no singular, so "Posten"), "{n} einmaliger Posten | {n} einmalige Posten" ("Posten" as in the recurring part, author's decision in #2), and "{recurring} und {purchases} · {total} im Jahr {year}" ("im Jahr" instead of the anglicism "in 2026").
  - **Checks:** tests in `tests/nuxt/costs-page.test.ts`, `describe('costs page summary line')`. Checked by the author in the browser: light and dark mode, German, 320 px, and that the line updates after adding or deleting a cost. Not checked: a screen reader. Contrast is not measured; the line adds no new colours (`text-muted`, `text-default`).
- **Search:** issue #81, after the BDesktopCosts mock (field "Search costs" at the top right). A text filter on the table that works while typing.
  - **Markup:** a `section` after the header (`w-full self-end sm:w-80`) with one `UInput` (`ref="searchField"`, `id="cost-search"`, `type="search"`, `icon="i-lucide-search"`, `v-model="search"`). Placeholder and accessible name are both `costs.search.label`: "Search costs" (German "Kosten durchsuchen"). The name comes from `aria-label`, not from a visually hidden `<label>`, see [Search field](decisions.md#search-field-81). Field style through `:ui`: `base: 'min-h-11 rounded-full bg-elevated font-semibold shadow-xs ring-transparent'` (44 px high, a filled pill like the chips).
  - **Placement:** from `sm` the section is 320 px wide and, where the row has room, sits right of the header, aligned with its bottom (`self-end`; the header grows, see **Spacing** above). Otherwise it wraps to the next row. Below `sm` it is full width on its own row, and hidden until the phone search button opens it.
  - **Matching:** `shownCosts` has a third condition: the search text, trimmed, must be part of the cost's name plus its translated category name (`` `${cost.name} ${t(`category.${cost.category}`)}` ``). Both sides go through `normalize(text)`: `normalize('NFD')`, then `replace(/\p{Diacritic}/gu, '')`, then `toLocaleLowerCase(locale)`. So "rENt" finds "Rent", "appliances" finds the laptop, and in German "gerate" and "GERÄTE" both find "Geräte". An empty or blank search matches every cost.
  - **With the chips and the sort:** the search is one more `&&` condition in the same `filter`, so it combines with the kind and category chips, and the table keeps its sort. The counts on the kind chips stay at all costs.
  - **Live region:** the existing `p[role="status"]` (`costs.shown`) counts the search results too: "1 cost shown". The issue's example "3 costs found" was not adopted; one wording for every filter.
  - **No match:** a search that matches nothing shows the no-match card (see **No match** below); its button also clears the search.
- **Search on phones:** issue #81, after the BPhoneCosts mock (a search icon button in the header). Below `sm` the field is hidden behind a round button next to the `h1`.
  - **Button:** a `UButton` (`color="neutral"`, `variant="ghost"`, `icon="i-lucide-search"`, `:ui="{ leadingIcon: 'size-5' }"`) with the classes `sm:hidden search-compact me-14 -mt-4 size-11 shrink-0 self-start justify-center`: a 44 px circle. `me-14` keeps it clear of the absolutely positioned [compact language button](#compact-language-button-on-phones); `-mt-4` puts its top at 16 px, in line with the language button. The gap between the two is 11 px; the mock has 8 px.
  - **Style:** `.search-compact` in `main.css` shares the `.language-compact` rules (white pill, `#14162b` text, the small shadow; dark `#15172a` with `#ecedf7`; hover `--ui-bg-accented`) and adds `padding-inline: 0`, so the icon sits centred in the circle.
  - **Accessibility:** `aria-label` "Search costs" (`costs.search.label`), `aria-expanded` from `searchOpen`, `aria-controls="cost-search"`.
  - **Behaviour:** `toggleSearch()` flips `searchOpen`. The field's section has `:class="searchOpen ? 'block' : 'hidden sm:block'"`. Opening waits for `nextTick()` and focuses the input through the `inputRef` of the `UInput` (template ref `searchField`). Pressing the button again closes the field and sets `search` to `''`, so no hidden search keeps filtering the table. Escape does not close it: phones have no Escape key. See [Search field](decisions.md#search-field-81).
  - **From `sm`:** the button is hidden and the field always shown, whatever `searchOpen` is.
- **Checks (#81):** tests in `tests/nuxt/costs-page.test.ts`, `describe('costs page search')` (10 tests) and `describe('costs page search on phones')` (5 tests), see [Testing](testing.md#pages). In headless Chromium at 390 and 1280 px: which of button and field shows, `aria-expanded`, the focus moving into the field, clearing on close; at 320 px light and 390 px dark: the button size and colours. Not checked *(to verify)*: a screen reader, a real phone, the contrast of the placeholder text.
- **Kind filter:** issue #82, after the BDesktopCosts mock. Three chips between the header and the table: "All 3", "Recurring 2", "One-off 1" (German "Alle 3", "Wiederkehrend 2", "Einmalig 1"). The mock says "Purchases"; the app says "One-off" (#2).
  - **Markup:** the filter row is one `section` (`flex w-full flex-wrap items-center gap-2`) with the kind group, a divider and the category group (#83, next item), as in the BDesktopCosts mock. The kind group is a `div` with `role="group"` and `aria-label` "Show" (`costs.filterLabel`, German "Anzeigen"), styled as one segmented pill: `inline-flex gap-1 rounded-full bg-elevated p-1 shadow-xs`. Inside are three `UButton`s with `aria-pressed`. The divider is a decorative `span` (`aria-hidden="true"`, `mx-1 h-7 w-px bg-accented`), shown only from `sm`. The section is its own item of the page's flex row, so the row gap puts 16 px above and below it.
  - **Selected chip:** `variant="solid"`, `color="neutral"`, with the `i-lucide-check` icon, so the selection is not shown by colour alone. The other chips are `ghost` with `aria-[pressed=false]:text-muted`. In dark mode a rule in `main.css` (`.dark [role="group"] [aria-pressed="true"]`) gives the selected chip a white background and `--ui-bg-elevated` as text colour, because Nuxt UI's solid neutral put white text on the light inverted background there. See [Kind filter chips](decisions.md#kind-filter-chips-82).
  - **Size:** `min-h-10 rounded-full px-4 text-sm font-bold`: 40 px chips in a 48 px pill. The `pill` class is not used: its unlayered `min-height: 2.75rem` would win over the Tailwind utilities.
  - **Focus:** `focus-visible:outline-2 focus-visible:outline-primary` on every chip, instead of Nuxt UI's default `outline-inverted/25`, which measured about 1.7:1 (light) and 2.1:1 (dark) against the pill. The primary outline, computed from the measured colours: `#2D4BD8` on white about 6.75:1, `#3B5BEB` on `#15172A` about 3.3:1.
  - **State:** `kindFilter = ref<'all' | Cost['kind']>('all')`. The computed `shownCosts` is one `filter` over `costs` with one condition per filter: `(kindFilter === 'all' || cost.kind === kindFilter) && (categoryFilter === null || cost.category === categoryFilter)`, and since #81 the search as the third condition (see **Search** above). The table gets `:data="shownCosts"`. The sort of the table is kept when a filter changes.
  - **Counts:** from `useYearSummary()`: `recurringCount`, `purchasesCount`, and their sum for "All". They always count all costs and do not change with the selected chip. Locale keys `costs.all` ("All {n}"), `costs.recurring` ("Recurring {n}") and `costs.purchases` ("One-off {n}"; German "Einmalig {n}"). `costs.purchases` has no plural form since #2: "One-off" and "Einmalig" do not change with the number, so "One-off 0" and "One-off 2" use the same text. `costs.vue` still passes the count as the plural argument, which fills `{n}`.
  - **Live region:** a `p` with `role="status"` and `sr-only` in the filter row, after both groups, announces the number of rows shown, `costs.shown` ("{n} cost shown | {n} costs shown", German "{n} Posten angezeigt").
  - **Phones:** the group has `hidden sm:inline-flex`, so phones (below `sm`, 640 px) do not see the kind chips. The phone mock BPhoneCosts has none: below `sm` the grouped lists already split the costs by kind (#86, see **Grouped lists on phones** below), and its "All" chip belongs to the category filter. The `div` stays in the DOM, so the `allChip` ref still exists on phones; it is only hidden.
  - **Checks:** tests in `tests/nuxt/costs-page.test.ts`, `describe('costs page kind filter')`, 11 tests, see [Testing](testing.md#pages). Checked by the author in the browser: light and dark mode, English and German. The focus outline was checked in the browser through computed styles. Not checked: a screen reader, a real phone.
- **Category filter:** issue #83, after the BDesktopCosts mock. One chip per category, right of the kind group: "Housing", "Insurance", "Appliances", "Food", "Mobility" (German from `category.<id>`).
  - **Markup:** a `div` with `role="group"` and `aria-label` "Filter by category" (`costs.filterByCategoryLabel`, German "Nach Kategorie filtern"). One `UButton` per `CATEGORIES` entry, in that order: a `CategoryBadge` of 28 px (decorative, `aria-hidden`) and the translated name. Classes `min-h-10 shrink-0 gap-1.5 rounded-full pl-1.5 pr-3.5 text-sm font-bold` and the same primary focus outline as the kind chips.
  - **Selected chip:** `variant="solid"`, `color="neutral"`, `aria-pressed="true"` and an `i-lucide-check` icon after the name (`aria-hidden`), so the selection is not shown by colour alone. Unselected chips are `ghost` with `bg-elevated shadow-xs hover:bg-muted` and the normal text colour. In dark mode the existing rule `.dark [role="group"] [aria-pressed="true"]` (white background, dark text) applies to these chips too, see [Kind filter chips](colour-scheme.md#kind-filter-chips).
  - **State:** `categoryFilter = ref<Category | null>(null)`. Single selection: clicking a chip selects it, clicking the selected chip again clears it (`null`). There is no "All" chip on desktop. See [Category filter chips](decisions.md#category-filter-chips-83).
  - **Counts:** the category chips show no counts, and the counts on the kind chips stay at all costs.
  - **Phones:** below `sm` the row does not wrap; it scrolls sideways inside itself (`w-full overflow-x-auto [scrollbar-width:none]`, with `-my-1 py-1` so the chip shadows are not clipped). The browser scrolls a focused chip into view. From `sm` it wraps (`sm:w-auto sm:flex-wrap sm:overflow-visible`). The phone mock's "All" chip in the category row is not built (open).
- **No match:** issue #83, texts reworded in #81. No mock exists; the card follows the [empty month card](#empty-month-28-and-adding-a-cost-31). When `costs.length > 0 && shownCosts.length === 0`, a `UCard` (`variant="subtle"`, `card w-full text-center`) replaces the table: an `i-lucide-filter-x` icon (`aria-hidden`), an `h2` "No matching costs" (`costs.noMatchTitle`, German "Keine passenden Kosten"), the text "Try another search or show all costs." (`costs.noMatchText`, German "Versuche eine andere Suche oder zeige alle Kosten an.") and a "Show all costs" button (`costs.clearFilters`, German "Alle Kosten anzeigen", class `pill mt-4`). The texts are generic because the card can come from the kind, the category, the search or any mix of them. The key `costs.clearFilters` kept its name. The live region says "0 costs shown".
  - **Show all costs:** `clearFilters()` sets `kindFilter` to `'all'`, `categoryFilter` to `null` and `search` to `''`, waits for `nextTick()` and moves the focus to the "All" kind chip (template ref `allChip`), because the button disappears with the card. Below `sm` the kind chips are hidden (`hidden sm:inline-flex`, #86), so when the "All" chip reports `checkVisibility() === false` the focus moves to the first category chip instead (template ref `categoryGroup`). Checked in headless Chromium: at 390 px the focus lands on "Housing", at 1280 px on "All". On a phone the search field stays open (empty) after this; only the search button closes it.
  - **Table hidden, not removed:** the table sits in a wrapping `div` with `v-show="costs.length === 0 || shownCosts.length > 0"` (since #86 also with the classes `hidden sm:block`, see **Grouped lists on phones**). The page layout rule in `main.css` (`main > div:has(table)`) finds the page container by its table, so the table must stay in the DOM. `UTable` does not take `v-show` itself, hence the wrapper.
  - **No costs at all:** the card is not shown, the empty table stays. A "No costs yet" state for the costs page is still missing. On phones the table is hidden and the grouped lists render no section, so below `sm` the page shows only the header and the category chips.
- **Checks (#83):** tests in `tests/nuxt/costs-page.test.ts`, `describe('costs page category filter')` (11 tests) and `describe('costs page no match')` (7 tests), see [Testing](testing.md#pages). In headless Chromium (Playwright) at 1440 px light and 375 px dark: the no-match card, the table hidden, the status "0 costs shown", no page overflow, after "Clear filters" (now "Show all costs", #81) the focus on "All 12" and all rows back; at 375 px the category row scrolls inside itself. Since #86 hides the kind chips on phones, the page has no horizontal overflow at 320 and 390 px in English and German (headless Chromium). The author checked the chips together with the kind chips in the browser. Not checked: a screen reader, a real phone, the contrast of the chip text (not measured).
- **Adding:** the page has no "Add cost" button of its own. The sidebar's button (`openAdd()`) is the single entry and opens the add form in the layout's dialog. The table refreshes after a save.
- **Data:** the page reads its lists with `useCostLists()` (lazy, the same cache keys as the layout, so the table updates after a save from the layout). Known limit: see [Known limit: the costs table loads on the client](#known-limit-the-costs-table-loads-on-the-client).
- **Name column:** issue #84. A `#name-cell` slot with a `CategoryBadge` (40 px), the name in bold with the `BusinessBadge` for business costs, and the translated category name as a muted caption below. It is the only place in the table that shows the category and the business flag. The separate Category and Business columns, their sort buttons and their cell slots were removed, and with them the unused locale keys `costs.columns.category`, `common.yes` and `common.no`.
- **Kind column:** issue #85. A `#kind-cell` slot with a `span` (`flex items-center gap-2`) that holds a `UIcon` with `kindIcon(row.original.kind)` from `useKind()` (see [Composables](#composables)), followed by the translated kind (`kind.recurring` "Recurring", `kind.purchase` "One-off"; German "Wiederkehrend", "Einmalig"). Recurring costs get the repeat icon, purchases the shopping bag: the same icons as the month page's group headings (#75), so each kind has one icon across the app. The icon is `size-4 shrink-0 text-muted` and `aria-hidden="true"`: it is decorative, the word stays as text, and `shrink-0` keeps the flex row from squeezing it (as in #123). The word comes from `kind.purchase`, so the rename to "One-off" (#2) reached the table without a change here. Sorting by kind compares the translated words, so one-off costs still sort before recurring costs in both languages ("One-off" before "Recurring", "Einmalig" before "Wiederkehrend"). Contrast: the icon uses the same `text-muted` colour on the card as the month page kind icons (8.12:1 light, 7.46:1 dark, computed, see [Content](#content-25)); not measured in the table. Tests: `tests/nuxt/costs-page.test.ts`, `describe('costs page kind column')`. Checked by the author in the browser: light and dark mode, English and German, 320 px. Not checked: a screen reader.
- **When column:** for a recurring cost the interval and, where it has one, the due month ("Yearly, November"); for a purchase the date in the active language (`whenLabel` in `costs.vue`). It is not sortable.
- **Row actions:** two icon buttons per row, in the order of the BDesktopCosts mock: Edit first, then Delete. That is also the keyboard order, so the harmless action comes first. Both are `color="neutral" variant="ghost"` with the class `pill-icon` (a 44 px target; the mock has 40 px). The delete button is no longer red: the red belongs to the confirmation dialog (#96).
  - **Edit:** a pencil (accessible name "Edit <name>") that calls `openEdit(row.original)`. It opens the same dialog in edit mode; the dialog title shows the cost's name.
  - **Delete:** a trash can (accessible name "Delete <name>") that opens one shared confirmation modal (`UModal`, driven by a `toDelete` ref, see the next item). On confirm the cost is deleted through the API and the table refreshes, then a toast "<name> deleted" confirms it (#8, see **Success message** below). A failed delete shows its own error toast instead.
- **Delete confirmation:** issue #96, after the BStateDelete and BDarkStateDelete mocks. One `UModal` in `costs.vue`, open while `toDelete` is not `null`; closing it sets `toDelete` back to `null`.
  - **Role:** `:content="dialogContent"` with `const dialogContent = { role: 'alertdialog', onOpenAutoFocus: focusCancel, onCloseAutoFocus: restoreFocus }`. reka-ui sets `role="dialog"` and then merges extra attributes over it, so `alertdialog` wins at runtime. The object is a script const, not an inline literal: TypeScript's excess-property check rejects `role` on the content props type in an inline literal. See [Delete confirmation](decisions.md#delete-confirmation-96).
  - **Name and description:** the `title` ("Delete cost?", `costs.confirmTitle`) and `description` (`confirmText`) props stay set, so Nuxt UI and reka-ui wire `aria-labelledby` and `aria-describedby` to the dialog.
  - **Title:** a `#title` slot with a centred 60 px circle (`size-15 rounded-full bg-error/10 text-error`, `aria-hidden="true"`) holding the `i-lucide-trash-2` icon, above the title text (22 px, `text-[1.375rem] font-extrabold`). The circle sits inside the title element but is hidden, so the accessible name is only the title text. The header is centred (`ui.header: 'flex-col items-center gap-2 text-center'`); the card keeps `ui.content: 'rounded-[2rem] bg-elevated'`.
  - **Message:** the `confirmText` computed names the cost with its amount in cents (`useMoney({ cents: true })`):
    - recurring: `costs.confirmRecurring`, "{name} ({amount}, {interval}) will be permanently deleted." (German "{name} ({amount}, {interval}) wird endgültig gelöscht."), for example "Rent (€800.00, monthly) will be permanently deleted." The interval is `t('interval.<interval>')` lowercased with `toLocaleLowerCase(locale)` ("monthly", "monatlich"). It is only the bare interval, without the due month: "Yearly, November" would lowercase the month name as well.
    - purchase: `costs.confirmPurchase`, "{name} ({amount}, {date}) will be permanently deleted.", with the long date from `formatDate(date, 'long')` of `useMonth()` ("Laptop (€1,200.50, March 14) …", German "Laptop (1.200,50 €, 14. März) …").
    - The old key `costs.confirmText` is removed.
  - **No close button:** `:close="false"`. Escape and Cancel close the dialog.
  - **Buttons:** in the `#footer` slot, Delete first (`color="error"`, solid, `pill`, `block`), then Cancel (`color="primary" variant="soft"`, the light tint of the mock, `pill`, `block`). `ui.footer: 'flex-col items-stretch gap-2.5 lg:flex-row'`: full-width buttons stacked below `lg`, side by side from `lg`. The order is Delete, Cancel in the source, on screen and for the keyboard. See [Delete confirmation](decisions.md#delete-confirmation-96).
  - **Focus:** the dialog opens with the focus on Cancel, not on the first button (Delete). `focusCancel(event)` handles `onOpenAutoFocus`: it calls `event.preventDefault()` and focuses the Cancel button through `useTemplateRef('cancel')` (`$el`).
  - **One request only (#7):** the Delete button has `loading-auto` (a Nuxt UI `UButton` prop). While the promise of its `@click` handler (`confirmDelete`, async) is pending, the button shows a spinner and is disabled, so a double click sends exactly one `DELETE`. There is no own `deleting` ref. `onDelete` catches its own errors, so the promise always settles: on failure the error toast appears, the dialog closes as before, and reopening it gives an enabled Delete button. Cancel and Escape stay active during the request: they close the dialog, the running request still completes and deletes the cost, and no second request can start. See [One delete request](decisions.md#one-delete-request-7).
  - **Focus after a delete (#6):** the row button that opened the dialog disappears with its row, so the page chooses a new place for the focus. "Row button" means the trash button in the table and the "Actions for <name>" button in the phone lists. Both carry `data-row="<kind>-<id>"` (for example `recurring-1`); the table's trash button has it since #6, the phone lists' button since #86.
    - **Before the request:** `confirmDelete` collects the visible row buttons with `visibleRowButtons()` (`[data-row]` elements for which `checkVisibility()` is true) and stores the position of the one with the deleted cost's key. Only visible buttons count, because the table and the phone lists are always both in the DOM and CSS hides one of them.
    - **After the request:** `onDelete` returns `true` after a successful delete and the reload of the lists, `false` after a failure (the error toast stays). On `true`, `confirmDelete` waits for `nextTick()`, collects the visible row buttons again and stores the target in `focusAfterClose`: the button at the same position, the last button if that position is gone, or the `h1` if no cost is left. Because the position is counted in the visible buttons, it works the same in the table and across the sections of the phone lists, and does not depend on `UTable` reusing rows by position.
    - **The `h1`:** it has `ref="heading"` and `tabindex="-1"`, so a script can focus it but the Tab key skips it.
    - **Dialog focus return:** `restoreFocus` is the dialog's `onCloseAutoFocus` (part of `dialogContent`). If `focusAfterClose` is set, it calls `event.preventDefault()`, so reka-ui does not send the focus back to the opener that no longer exists, focuses the target and clears the variable. If it is `null` (Cancel, Escape, a failed delete), it does nothing and the dialog returns the focus to the opener, which is still there.
    - **Decision (author):** keep the row position. Rejected: the table heading (loses the place in a long list) and "Add cost" (on phones only the round button in the tab bar). See [Focus after a delete](decisions.md#focus-after-a-delete-6).
    - **Announcing the delete:** see **Success message** below (#8). The focus move itself is silent apart from the name of the new button.
  - **Success message (#8):** after a successful delete and the reload of the lists, `onDelete` calls `toast.add({ title: t('costs.deleted', { name: cost.name }) })`: "Rent deleted" (German "Rent gelöscht"). The name is the deleted cost's own. The message comes after the reload, so the table is already updated when it appears. A failed delete shows only the existing error toast, never the success message; Cancel and Escape show nothing. See [Success message after add, edit and delete](decisions.md#success-message-after-add-edit-and-delete-8).
    - **How it is announced:** Nuxt UI renders the visible toast with the message only, and adds a visually hidden `span` with `role="alert"` and `aria-live="assertive"` whose text is "Notification <message>" (German "Benachrichtigung <message>"). The toast takes no focus. It disappears after about 5 seconds.
    - **Measured:** in headless Chromium with `DELETE` intercepted, at 1280 and 390 px, in English and German: the hidden alert text above, no focus on the toast, and the focus on the next row's button as in #6.
    - **Not checked:** a real screen reader. `assertive` interrupts a speaking screen reader; that is Nuxt UI's default and was left (see the decision).
  - **Checks:** tests in `tests/nuxt/costs-page.test.ts`, `describe('costs page delete confirmation')` and `describe('costs page delete in flight')`, see [Testing](testing.md#pages). For #7 the author checked in the browser with DevTools "Slow 4G" throttling: the spinner shows, further clicks are ignored, one `DELETE` is sent. Checked by the author in the browser: the focus on Cancel, light and dark mode against the mocks, German, 320 px, the buttons side by side from `lg`. For #6, `describe('costs page focus after delete')` (10 tests, see [Testing](testing.md#pages)). Measured in headless Chromium with the `DELETE` request intercepted, before the change: Cancel and a failed delete already returned the focus to the opener in the table and in the lists; after a successful delete the focus reached the next row in the table only by accident (`UTable` reuses rows by position, there is no `getRowId`) and otherwise stayed on `body`. After the change: a middle row gives the next row's button, the last row the row above, and no cost left the `h1` "Costs", in the table (1280 px) and in the lists (390 px); Cancel and a failed delete are unchanged. Not checked: a screen reader, a real phone. Contrast is not measured; `bg-error/10` is close to, not exactly, the mock's `#FEF3F2`.
- **Sorting:** the table is sorted by name by default (`localeCompare` with the active locale, so umlauts sort correctly). The headers of Name, Kind and Amount are sort buttons (`sortableHeader` in `costs.vue`, cycling ascending and descending). Name and Kind use a `sortingFn` that compares the text shown in the cell (for Kind the translated word, not the stored id). `UTable` sets no `aria-sort`, so the button's `aria-label` carries the state ("Name, sorted ascending"; texts in `costs.sort.*`). The "When" column is deliberately not sortable (idea: issue #3). Sorting by category and by business was dropped with their columns (#84), on purpose: see [Costs table without category and business sorting](decisions.md#costs-table-without-category-and-business-sorting-84).
  - **Sort announcement (#9):** a change of the sort order is announced as text, because `aria-sort` is missing and the button's `aria-label` is not read again after a click. `UTable` has `v-model:sorting="sorting"` (`ref<{ id: string, desc: boolean }[]>([])`, empty until a header is chosen). A `watch` on `sorting` copies the first entry into `sortColumn` (the column id) and `sortOrder` (the locale key `sortedAsc` or `sortedDesc`); an empty array is ignored, so the last announcement stays. Right before the `UTable`, inside the table wrapper, sits a permanent `<p class="sr-only" role="status">` with `t('costs.sortedBy', { column, order })`: "Sorted by Name, ascending" (German "Aufsteigend nach Name sortiert"). Column and order are translated in the template, so the text follows a language change. The paragraph is empty until the first sort, see [Sort announcement](decisions.md#sort-announcement-9). Locale keys: `costs.sortedBy`, `costs.sortedAsc`, `costs.sortedDesc`. It lives in the table wrapper, so it is hidden with the table below `sm`; the phone lists have no sorting. Tests: `describe('costs page sort announcement')`, 8 tests, see [Testing](testing.md#pages). Not checked: a real screen reader (a VoiceOver check by hand is open).
- **Wrapping:** Nuxt UI table cells are `whitespace-nowrap` by default, so a long name would widen the table. The name cell's wrapper has `min-w-48 whitespace-normal` (at least 192 px, so the column does not collapse to one word per line), the text wrapper `min-w-0`, and the name line `flex flex-wrap items-center gap-x-2 gap-y-1 break-words`, so the business badge drops below a long name. The When text sits in a `span.whitespace-normal`, so "Yearly, November" can break. Amount and actions stay on one line.
- **Narrow screens:** down to about 660 px the table fits without sideways scrolling. Below that it scrolls sideways inside its card (`overflow-x-auto` on the table root), not the whole page. Below `sm` (640 px) the table is hidden and the grouped lists take its place (#86, next item), so the sideways scrolling is left only between 640 and about 660 px.
- **Grouped lists on phones:** issue #86, after the BPhoneCosts mock. Below `sm` the table is replaced by one card per kind, as on the month page.
  - **Markup in the page:** the table wrapper has `class="hidden sm:block"` (and keeps its `v-show`, see **Table hidden, not removed**). Right after it comes `<CostGroups class="sm:hidden" :costs="shownCosts" :year="yearSummary.year" @edit="openEdit" @delete="toDelete = $event" />`. Both are always in the DOM; the breakpoint only decides which one shows.
  - **Same data:** the lists get `shownCosts`, so the kind and category chips and the search filter them exactly like the table. When nothing matches, every section is left out and the no-match card shows. The sort of the table does not apply: the lists keep the order of `shownCosts`.
  - **Sections:** [`CostGroups`](#components) splits the costs into recurring costs and purchases, recurring first. Each kind is a `section.card` (`px-6 py-5`) with `aria-labelledby` pointing at its `h2` (ids `recurring-title` and `purchases-title`). The heading is the decorative kind icon from `useKind()` (`aria-hidden`), the group name (`month.recurring` "Recurring", `month.purchases` "One-off", the month page's keys; German "Wiederkehrend", "Einmalig") and " · " with the count: "Recurring · 2", "One-off · 1". The total sits at the right in whole euros through `useMoney()`: `totalAnnualRecurring` for the recurring costs, `totalAnnualPurchases(purchases, year)` for the purchases, so only purchases of the shown year count, the same year as the summary line. Since #143 a `span.sr-only` after the amount names the period for screen readers: "€9,690 per year" for the recurring total (`costs.per`) and "€1,201 in 2026" for the purchases (`costs.in`, the year from the `year` prop). Nothing changes visually. A kind without costs gets no section.
  - **Rows:** one `li` per cost (`rounded-[18px] bg-muted px-3 py-2.5`), built with `toRow(cost, 'long')` from `useMonth()`: a 40 px `CategoryBadge`, the name in bold with the `BusinessBadge` for business costs (the line wraps, `flex-wrap break-words`), the subline below it ("Yearly, November", "October 20"), the amount with cents, and the actions button.
  - **Row layout:** each `li` is a CSS grid (`gap-x-3`, `items-center`).
    - From 400 px: four columns, `grid-cols-[40px_minmax(0,1fr)_auto_auto]`: badge, name and subline, amount (right-aligned), actions button, in one row as in the mock.
    - Below 400 px: three columns, `grid-cols-[40px_minmax(0,1fr)_auto]`. The amount moves to the second row under the name (`col-start-2 row-start-2`, reset with `min-[400px]:col-start-auto min-[400px]:row-start-auto`), and the badge spans both rows (`max-[399px]:row-span-2`).
    - Why: with the amount on the right, the name column got 13 to 41 px at 320 px, and the subline and the "Business" badge ran under the amount (WCAG 1.4.10 Reflow). At 360 px the German "Geschäftlich" badge still overlapped, and at 390 px too, so the switch sits at 400 px.
    - Trade-off (deliberate): a 390 px phone shows the amount under the name, not on the right as in the BPhoneCosts mock.
  - **Actions:** one ghost button per row (`color="neutral"`, `variant="ghost"`, `icon="i-lucide-ellipsis-vertical"`, `size-11`, a 44 px target) that opens a `UDropdownMenu` (`:content="{ align: 'end' }"`) with "Edit" (pencil) and "Delete" (trash can, `color: 'error'`), in that order. Since #142 the menu items are at least 44 px high: the menu has `:ui="{ item: 'min-h-11 items-center' }"`. `min-h-11` is 44 px; `min-h-` instead of `h-` lets a long label grow; `items-center` replaces the theme's `items-start`, so icon and label stay vertically centred. The `ui` prop belongs to this one menu, the language menu (`LanguageSwitcher`) is unchanged and its items are still 32 px. The button's accessible name is "Actions for <name>". Edit emits `edit`, which calls `openEdit` and opens the same dialog as the table's pencil; Delete emits `delete`, which sets `toDelete` and opens the same delete confirmation (see **Delete confirmation** above). The button has `focus-visible:outline-2 focus-visible:outline-primary`, like the filter chips, because Nuxt UI's default `outline-inverted/25` was too faint. No phone mock shows row actions; the author chose one menu button instead of the table's two icon buttons, because at 320 px two 44 px buttons leave the name about 50 px.
  - **Focus after an action:** choosing Edit or Delete does not emit at once. The item's `onSelect` stores the action in `pending` (with the row's key). `runPending`, passed as `onCloseAutoFocus` in the menu's `content` prop, runs after the menu has closed: it focuses the row's menu button itself (found by `data-row="<row.key>"` inside the component's root element) and then emits. Without this, Reka left the focus on the removed menu item, and after the dialog closed the focus fell to `body` (WCAG 2.4.3 Focus Order). Now the focus returns to "Actions for <name>" after Edit and after Delete, when the dialog closes.
  - **Not adopted from the mock:** the visible "/ year" and "in 2026" texts after the section totals (decided by the author). Screen readers get the period through the hidden text (#143, see **Sections**).
  - **Locale keys:** `costs.actions.label` ("Actions for {name}", German "Aktionen für {name}"), `costs.actions.edit` ("Edit", German "Editieren") and `costs.actions.delete` ("Delete", German "Löschen"), and since #143 `costs.per` ("per year", German "pro Jahr") and `costs.in` ("in {year}", German "in {year}"). The headings reuse `month.recurring` and `month.purchases`.
  - **Checks:** tests in `tests/nuxt/CostGroups.test.ts` and `tests/nuxt/costs-page.test.ts`, `describe('costs page grouped lists on phones')`, see [Testing](testing.md#components). Accessibility audit in headless Chromium (axe-core plus manual checks) at 320×640 and 390×844, light and dark, English and German: no horizontal overflow; at 768 and 1280 px only the table shows. Contrast passes, for example names 16.07:1 light and 15.17:1 dark, sublines 7.33:1 and 7.46:1, the business badge 4.86:1 and 8.65:1. The actions buttons are 44×44 px. The menu follows the APG (ARIA Authoring Practices Guide) menu button pattern; Escape returns the focus to the button. With the keyboard, the focus returns to the row button after Edit and after Delete. Measure the focus outline colour after about 500 ms: `transition-colors` fades it in. Since #142, in headless Chromium against the dev server at 320 and 390 px, English and German (menus only opened, nothing selected): both items are 44 px high and 120 px wide, icon and label are centred at 22 px, Delete keeps the error colour `rgb(180, 35, 24)` and Edit the normal text colour, no sideways scroll; before the change the items were 32 px. Not checked: a screen reader, a real phone. For #143 the unit tests and a mutation check (without `sr-only` the test fails) ran; not checked: a screen reader (VoiceOver by hand is open) and a browser look at the layout, because nothing changes visually.
  - **Known limits (follow-up issues from the audit):** in dark mode the rows do not stand out from the card (#144); the language button's name lacks the visible "EN" (#145, layout). Not checked for #142: dark mode, touch input on a real phone, a screen reader. The menu still animates (scale-in, 0.1 s) and ignores `prefers-reduced-motion`; the optional part of #142 is not done.

Issue #84 checks: checked by the author in the browser: readable at 768 px; light and dark mode, English and German, 320 px. Not checked: a screen reader. Contrast is not measured; #84 adds no new colours. Tests: `tests/nuxt/costs-page.test.ts` and `tests/nuxt/costs-page-sorting.test.ts`, see [Testing](testing.md#pages).

### Subtotals in the "This month" card

Issue #61. Below the comparison line, the card has a description list (`dl`) with two pairs: "Recurring" (`month.recurring`) and "One-off" (`month.purchases`; German "Wiederkehrend" and "Einmalig"), the same keys as the month page. The mock says "Purchases" (#2). The amounts are `recurringTotal` and `purchasesTotal` from `useMonthSummary()` (the groups of `monthSummary`) for today's month and year, so they ignore the year selector like the rest of the card. A group without costs shows `€0.00`, not nothing.

The subtotals use cents (`useMoney({ cents: true })`), while the card's total stays in whole euros. The rounded total can therefore differ from the sum of the two subtotals: 819.99 and 300.50 add up to 1,120.49, and the total shows €1,120. Since issue #60 the labels are `dt` elements in the light tint `#dce2fb` on the cobalt hero card (see [Hero card](colour-scheme.md#hero-card)).

Tests: `tests/nuxt/dashboard-month-cards.test.ts`, `describe('dashboard page this month subtotals')`: labels and cents, only purchases of the current month, the sum against `monthlyTotals`, zero groups, a month without costs, the `dl` terms and German.

### The hero card ("This month")

Issue #60. Written for developers. The "This month" card is a solid cobalt card (`class="card card-hero"`). Colours and CSS are in [Hero card](colour-scheme.md#hero-card). The card and "Largest this month" read one `thisMonthSummary` from `useMonthSummary()` (see [Composables](#composables)); the page has no `thisMonth` computed of its own any more. From top to bottom:

- A decorative ring (`span.hero-ring`, `aria-hidden`, no text), clipped by the card.
- The heading `h2#this-month-title`: "This month · March 2026" (`dashboard.thisMonth.title`, with a middle dot, in both languages).
- The total as `p.hero-total` (large, tabular numerals, whole euros).
- The comparison with the previous month (`comparison` and `icon` of the summary, from `monthChange`) in the pill `p.hero-pill`, the class the month page uses too. The trend icon is decoration (`aria-hidden`, `size-3.5`, `size-4` from `sm`); the direction is in the words: "50% more than September", "less", "Same as", or a neutral text without a percentage when the previous month cost nothing.
- The card always shows today's month, whatever year the year select shows: the dashboard has no month in its address, so `useMonthSummary()` falls back to `currentYear` and `currentMonth` from `useYear()`. The same holds for "Largest this month" and for the highlighted month of the months chart.
- A bottom row (flex, wraps): the subtotals `dl` on the left (cents), and at the right the white pill link "View <month year>" with an arrow (`ml-auto`).
- In a month without costs, the row also shows "No costs this month yet." (`dashboard.thisMonth.empty`) and an outlined white "Add cost" button that calls `openAdd()` (the `empty` flag of the summary). With costs, neither is rendered. The "Largest this month" card shows the same text in that case.
- The card is a flex column and its body fills it, so when the row stretches the card to the height of "Largest this month", the bottom row sits at the bottom. It uses `mt-auto` and `pt-10` (at least 40 px above it) and `w-full`, because the column does not stretch its children. See [Equal heights in a row](#equal-heights-in-a-row).

Tests: `tests/nuxt/dashboard-month-cards.test.ts`: the heading with the middle dot, the trend icon, the ring, and `describe('dashboard page this month card empty month')` (text and button, the button asks for an empty dialog, the link stays, nothing with costs, German). Checked by the author in the browser: light and dark mode, German, 320 px, spacing. Not checked: a real phone, a screen reader, the contrast of the buttons and the focus ring, the size of the total on a phone against the mock (`BPhoneDashboard`).

### Equal heights in a row

Issue #111. Written for developers. The dashboard rows are flex rows in `main.css` (`main > div:has(#this-month-title)`). They use `align-items: stretch`, so the sections of one row are as tall as the tallest one: "This month" next to "Largest this month", "Where your money goes" next to "Household and business". A section alone in its row ("Your year", "Month by month") keeps its own height. Each dashboard `section` is a flex column and its `.card` has `flex: 1`, so a shorter card fills the section and no empty strip shows below it.

The rows are set up in `main.css` with `:has(#this-month-title)` on the layout's container, because the sections sit directly in it and no wrapper element may be added. The `h1` has its own row (the year picker moved into the summary section, #64). "This month" (flex weight 3) sits next to "Largest this month" (2), and "Where your money goes" (3) next to "Household and business" (2). Everything wraps into one column on narrow screens.

The `sr-only` texts of the months chart are kept inside its scroll area with `relative`, which also removed the sideways page scroll at 320 px.

The month page's total card also uses `card-hero`; its two lines stay at the top.

Tests: none. jsdom has no layout, so equal heights cannot be tested. Not checked: see the PR text of #111.

### "Largest this month" card

Issue #63. Written for developers. The card replaces the "Add a cost" tile and sits next to the "This month" card (the weight-2 flex row in `main.css` now selects `largest-title`). It is a `section` with `aria-labelledby="largest-title"`; its `ul` is named by the same heading ("Largest this month", `dashboard.largest.title`). The hint line (`dashboard.largest.text`) was removed with the restyle.

- The rows are `largestRows` from `useMonthSummary()` (`largestCosts` on the month's costs, mapped with `toRow` from `useMonth()`) for today's month and year, so, like the "This month" card, they ignore the year selector.
- Each row is its own soft tile (`bg-muted`, 18 px radius, `gap-1.5` between rows, no divider lines) with a `CategoryBadge` (40 px), the bold name with the `BusinessBadge` next to it in a wrapping row, a sub line in 13 px from `toRow` in the short form ("Housing · Monthly", "Appliances · Nov 8") and the amount with cents. The exact tint of the mock was approximated with `bg-muted`.
- A month without costs shows "No costs this month yet." (`dashboard.thisMonth.empty`) and no button.
- The full list of the month is no longer on the dashboard (this also removed the list from the "This month" card; its "Add cost" button came back in an empty month with #60). The "View <month year>" link of that card leads to it on the month page.
- The dashboard has no add entry point of its own. The sidebar button and the phone's round button remain.
- On narrow screens the card wraps below the "This month" card. This was not decided from a mock (the phone mock has no such card).

Tests: `tests/nuxt/dashboard-month-cards.test.ts`, `describe('dashboard page largest this month')`; `describe('largestCosts')` in `tests/nuxt/costs.test.ts`. Not checked in the browser (light and dark mode, German, 320 px); text contrast not measured.

### Summary card

Issue #64. The section `aria-labelledby="summary-title"` has a header row (`flex flex-wrap items-center justify-between`) with the `h2` "Your year <year>" (`dashboard.summary.title`, 26 px, weight 800) and, to its right, the `YearSelect`. Before, the select sat above the sections and the heading was "Summary for <year>". Both are inside the loaded content, so neither shows while loading, on an error or on the empty screen.

Below the header is one `UCard` (`card card-flush overflow-hidden`) with a `dl` of four tiles, in the order Annual total, Average, Household, Business. The data is from `annualSummary` in `shared/utils/costs.ts`, shown in whole euros by `useMoney()`; the page reads both the totals and the shown year from `useYearSummary()` (see [Composables](#composables)):

| Tile | Label key | Value | Sub line | Dot |
| --- | --- | --- | --- | --- |
| Annual total | `dashboard.summary.total` | `yearSummary.total` | "per year" (`perYear`) | `bg-inverted` |
| Average | `dashboard.summary.average` | `yearSummary.averagePerMonth` | "per month" (`perMonth`) | `bg-accented` |
| Household | `dashboard.summary.household` | `yearSummary.household` | "<n>% of the year" (`ofYear`) | `bg-primary` (cobalt) |
| Business | `business.label` | `yearSummary.business` | "<n>% of the year" (`ofYear`) | `bg-secondary` (orange) |

- Each tile has the label as `dt` with an `aria-hidden` colour dot, the value as `dd` (30 px, bold, whole euros) and the sub line as a second `dd`. The percentages come from `splitPercentages`, so they add up to 100.
- Layout: a 2x2 grid on phones, four in a row from `lg`. The dividers are 1 px gaps (`gap-px`) that show the grid's background (`bg-default`); the tiles have an opaque `bg-elevated` fill, so no border elements are needed.
- `card-flush` (in `main.css`) removes the body padding of the card (`.card.card-flush > [data-slot="body"]`), so the dividers run to the card's edge; the tiles bring their own padding (`p-5 sm:p-6`). `overflow-hidden` clips the tiles to the card's rounded corners.
- `YearSelect.vue` now shows its visible label "Year" to the left of the select (`UFormField` with `orientation="horizontal"`), and the select is a pill (`rounded-full`, 44 px high). The two first-row rules in `main.css` for the floated picker were removed; the `h1` rule only sets `margin-bottom: 0`.
- Locale keys: `dashboard.summary.average`, `perYear`, `perMonth`, `ofYear`, `business` are new; `averagePerMonth` was removed.

Tests: `tests/nuxt/dashboard-summary.test.ts`: one card, order, whole-euro values, sub lines, shares add up to 100, dots hidden, the year select next to the heading with its label, German. The year-select tests use the heading "Your year"; the describe "dashboard page year selector" is in `tests/nuxt/dashboard-month-cards.test.ts`. Checked by the author in the browser: light and dark mode, German, 320 px. Not checked: a real phone, a screen reader; the contrast of the muted labels and sub lines is not measured; the horizontal label layout was adjusted by sight.

### "Where your money goes" (categories)

Issue #65. The section `aria-labelledby="categories-title"` is one card. Its `h2` sits inside the card and reads "Where your money goes" (`dashboard.categories.title`, no year in the heading; German "Wo Dein Geld hin geht"). The rows come from `categoryBreakdown` for the shown year (`yearSummary.year`).

- The `ul` is a grid, `grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))]`: one column on a phone, several on a wide screen.
- The `ul` is rendered by `CategoryList` (#77, shared with the month page's "By category" card, see [Components](#components)). The page passes `categoryRows` with the amount already formatted in whole euros and the `percent` text; the heading and the stacked bar stay in the page.
- Each row has a `CategoryBadge` (36 px), the bold name and, right-aligned, the amount in whole euros (bold) with the percentage below it. The percentage is `n(percent / 100, { style: 'percent' })`, so it reads "86%" in English and "86 %" in German.
- `percent` is whole numbers that add up to 100 (largest-remainder rounding, see [calculation core](../backend/calculation-core.md)). A year without costs shows 0% everywhere.
- The old bar per row was removed. `share` is still returned by `categoryBreakdown`, but the dashboard does not read it any more. It stays in the core for now, with no consumer; it can be dropped later.
- Issue #66: above the list sits one stacked bar. It is a flex container (`mb-2.5 mt-4 flex h-3.5 gap-[3px] overflow-hidden rounded-full bg-accented`: 14 px high, 3 px gaps) with `aria-hidden="true"` and no text, so it is decoration; the list below carries every value. It holds one `div` per category in the order of the list. The width of a segment is the category's `percent` (`categoryRows` carries it as the number `value`), its colour the category token through `categoryClass()` from `useCategory()` (see [Category badge](colour-scheme.md#category-badge)). A category with 0% has no visible segment (`v-show`); a year without costs shows only the grey track. Only the outer ends are round, because the container is a pill with `overflow-hidden`; the segments are square, as in the mock.
- Whole percentages can make a thin segment (3% of the width) very narrow on a phone.

Tests: `tests/nuxt/dashboard-summary.test.ts` (heading, name, amount and percentage per row, sum 100, no bar per row, German, badge 36 px; the stacked bar: decorative and without text above the list, widths 86/11/3% in list order, colour tokens, no visible segment for 0%, empty track) and `tests/nuxt/costs.test.ts` (`categoryBreakdown percentages`). Checked by the author in the browser: light and dark mode, German, 320 px, the grid columns (the list, #65). The stacked bar (#66) was checked in the browser in light mode, including the segment shape; dark mode, German and 320 px were not checked for it. Not checked: a real phone, a screen reader; the contrast of the muted percentage text is not measured; the contrast of the segments was computed from the colour tokens, not measured in the browser: against the gap (the track colour) at least 4.41:1 in light mode and 3.06:1 to 3.74:1 in dark mode, so 3:1 against the gap holds in both; against their neighbours they are close (1.0:1 to 2.1:1, insurance next to housing 1.58:1 in light and 1.00:1 in dark), so the gap does the separating.

### "Household and business" (split ring)

Issue #67. The section `aria-labelledby="split-title"` is one card. Its `h2` reads "Household and business" (`dashboard.split.title`, no year in the heading as in the mock; German "Haushalt und Geschäftliches").

- The ring is a 140 px `div` with `role="img"` and the `aria-label` `dashboard.split.alt` ("Household 89 percent, business 11 percent"). It is drawn with a CSS `conic-gradient` from the computed `splitRing`, so there is no chart library and no JavaScript; it renders on the server. Colours and contrast: [Household and business ring](colour-scheme.md#household-and-business-ring).
- The gaps between the colours are surface-coloured stops centred on the boundaries (half a gap, `GAP` = 0.6% of the ring, on each side). The colours keep their size and a 1% share stays visible.
- Special cases: 100% household or 100% business is one full ring in one colour without a gap; a summary total of 0 (checked before the percentages) is an empty ring in `--ui-bg-accented` with 0%.
- A 96 px hole in the surface colour shows the household percentage (22 px, bold, tabular figures) and the word "household" (`dashboard.split.household`).
- Beside the ring, two rows: house icon, "Household", amount; briefcase icon, "Business", amount (whole euros, `useMoney()`). Since #78 the rows are the `SplitList` component (see [Components](#components)), shared with the month page's [By category card](#by-category-card-77); the page passes the amounts already formatted and the layout classes `min-w-[8.75rem] flex-1`. The ring stays in the page. The icons are `aria-hidden`, coloured `text-primary` and `text-secondary`, and have `shrink-0`, so the flex row cannot squeeze them (#123: the author saw them shrink at about 1230 px). The ring and the rows sit in a wrapping flex row, so on a phone the rows stack under the ring. The percentage legend of the old bar is gone; the business percentage is only in the ring's label.

Tests: `tests/nuxt/dashboard-summary.test.ts`, "dashboard page household versus business split" (11 tests: heading, label, centre text, rows with amounts, hidden icons, ring colours and gap, German, full household ring, full business ring, empty ring and 0%, a 1% share). Not checked: the look of the ring and the gaps, light and dark mode, German, 320 px and the layout next to the categories card in the browser; a real phone; a screen reader. Checked by the author after the #123 fix: both icons keep their size at about 1230 px and from 320 px up, in English and German, light and dark mode.

### Dashboard links to month pages

Two places on `app/pages/index.vue` link to `/months/[year]/[month]` (issues #18 and #19). Both build the address with `monthPath(year, month)`, so the month is always two digits (`/months/2026/03`).

| Link | Target | Year used | Why |
| --- | --- | --- | --- |
| "View <month year>" at the end of the "This month" card (`dashboard.thisMonth.view`, e.g. "View March 2026") | Today's month: `monthPath(currentYear, currentMonth)` | Always `currentYear` | The card always shows today's month, so its link has to agree with it. Shown also when the month has no costs. |
| Each of the 12 items in "Month by month" | `monthPath(yearSummary.value.year, month)` | The shown year (`yearSummary.year`, see below) | The chart shows that year, so a bar leads to that year's month. |

Notes on the months chart:

- Issue #69: the card holds the `h2` "Month by month" (`dashboard.months.title`, no year; German "Monat für Monat") and the hint `dashboard.months.hint` ("Select a month to open it") in one row (`flex flex-wrap items-baseline justify-between gap-2`). The bars are 32 px pills (`w-8 rounded-full`, centred in the column). The current month of the shown year is `bg-primary` with a bold `text-primary` value and a bold label; the other months use `bg-[var(--chart-soft)]`. Colour is not the only carrier: the bold label and value stay. The light soft colour has 1.70:1 against the card, see [Months chart colours](colour-scheme.md#months-chart-colours).
- Each `li` holds a `NuxtLink` (a real `<a>`, works without JavaScript). The `li` has no layout of its own, so the link fills the grid column and the bars keep their width.
- Link name: the `sr-only` text from `dashboard.months.alt` ("March: €1,100"; the month names come from `Intl` in the active language, "January: €800"). The bar, the short value and the short label are `aria-hidden`; the bar has a hover `title`.
- Short value above each bar (`span.text-xs.tabular-nums`, `aria-hidden`; bold and `text-primary` for the current month, `text-muted` for the others). `monthRows` carries it as `value`, built by `shortAmount(total)`: if `Math.round(total) < 1000` it is the whole number from `n(...)` ("800"); otherwise `n(total / 1000, { maximumFractionDigits: 1 })` inside the key `dashboard.months.thousand` (`"{value}k"` in en and de), so "2.3k" in English, "2,3k" in German, "2k" for 2,000 and "12.6k". 999.60 rounds to 1000 and reads "1k". A month of 0 shows "0" and keeps its baseline.
- Decision: the value is hand-built, not `Intl.NumberFormat` with `notation: 'compact'` (what issue #68 asked for). The author checked it: German short compact does not abbreviate thousands ("2100", "12.600"), the long form is "2,1 Tausend" (too wide for a narrow column), and the mock builds "2.1k" by hand too. The full amount stays in the link's `sr-only` text.
- The scroll area has `pb-4` (16 px) below the month labels.
- Keyboard focus shows an outline (`focus-visible:outline-2 focus-visible:outline-primary`).
- The current month's label and value are bold only if the shown year is the current year (`yearSummary.year === currentYear && month === currentMonth`).
- The grid is `repeat(12, minmax(2.75rem, 1fr))` with an 8 px gap (`gap-2`) inside an `overflow-x-auto` wrapper. 2.75rem is 44 px. Twelve columns plus gaps do not fit on narrow screens, so the chart scrolls sideways instead of squeezing the targets. Looked at in the browser by the author (the 320 px width was part of that check); not measured.
- Tests: "dashboard page month bar links" and "dashboard page costs per month" (the heading, hint, pills, colours, column width and the value above the bars) are in `tests/nuxt/dashboard-months.test.ts`; "dashboard page "View month" link" is in `tests/nuxt/dashboard-month-cards.test.ts`.

### Year fallback on the dashboard

Issue #30. The selected year lives in `useYear()` (`year`, a `useState('year')`). The year select offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases. If the stored year is not in that list (for example after the last purchase of that year is deleted), the dashboard shows the current year instead. Before, the select was empty and the sections showed that year with recurring costs only.

Since #80 the rule lives in `useYearSummary()` (`app/composables/useYearSummary.ts`), so the dashboard and the [costs page summary line](#costs-page) always name the same year. Inside its computed:

```ts
const years = availableYears(purchases.value ?? [], currentYear.value)
const shownYear = years.includes(year.value) ? year.value : currentYear.value
```

The composable returns the shown year as `year` and the list as `years`, next to the `annualSummary` totals of that year. On the dashboard, `yearSummary.year` feeds the `YearSelect` (`:model-value`), the "Your year" heading, `categoryBreakdown`, `monthBreakdown`, the month bar links and the current-month marker; `yearSummary.years` is the select's list and the totals feed the tiles, the ring and the `SplitList`. The "This month" card still uses `currentYear`. Choosing a year in the select (`update:model-value`) writes the stored `year` from `useYear()`. Before #80 the dashboard had its own `years`, `shownYear` and `summary` computeds.

Why a computed value and not a reset of the stored year:

- The stored year stays untouched, so it is only a display rule. If purchases of that year exist again, for example after the lists finish loading or refresh, that year is shown again.
- A reset would need a `watch` that writes shared state. While the lists are still loading, `purchases` is empty and `years` holds only the current year, so such a watch, which runs whether or not the select is visible yet, could throw away a valid choice. It would have to wait for the lists first.

The month page does not use the stored year. The costs page uses it only for the year and total of its summary line, through `useYearSummary()`; its table shows all costs.

Tests: `tests/nuxt/dashboard-month-cards.test.ts`, describe "dashboard page year selector" (falls back when the stored year has no purchases; keeps a stored year that is in the list; falls back after the purchases of the selected year are deleted), and in `tests/nuxt/costs-page.test.ts` the summary line test for a year without data. `useYearSummary()` has no test file of its own.

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
| Styles | `app/assets/css/main.css` | `.mobile-tabs`, `.mobile-tab`, the bottom padding of `main` and the scroll padding of `html`, see below. |
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
- Scroll padding (#141): the same media query gives `html` `scroll-padding-bottom: 6.5rem` (104 px). When the keyboard moves the focus to an element, the browser scrolls it to just above the bar and not to the viewport edge behind it. The padding sits on `html` because the page scrolls in the viewport and the bar is `fixed`; `main` or `body` do not scroll. The bar's top edge is 96 px above the bottom, so 104 px leaves 8 px. Above `lg` the bar is hidden and the padding is gone (the condition is the same as the bar's `lg:hidden`). Measured in headless Chromium at 320 × 640 and 390 × 844 by tabbing through `/costs`, the dashboard and a month page (17 to 47 focusable elements each): no element of the app was left behind the bar; the skip link still sets `#main`. The only elements below the bar's top edge were three buttons ("auto", "dark", "light") that are drawn above the bar and that we believe are the dev-only Nuxt DevTools toggle (not checked in a production build). No automated test: happy-dom loads no CSS and has no layout. Not checked: a real phone, a screen reader, dark mode.

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
| Month page: "Add cost to <month>" in the empty month card (no button next to the heading since #59) | `openAdd(monthRef)` |

The delete confirmation is not part of this. It stays a modal of the costs page (see [Costs page](#costs-page)).

The dialog is not its own route and not one per page. A modal (`UModal`) was chosen over a slide-over for mobile.

What the layout does:

- The title is "Add cost" or "Edit <name>", depending on `cost`.
- The description (#146) is "Enter the details of a new cost." or "Change the details of <name>." (`costs.addDescription`, `costs.editDescription`; German "Angaben zum neuen Posten eingeben.", "Angaben zu <name> ändern."). It is hidden from sight with `ui.description: 'sr-only'`, so the header looks as before, but `aria-describedby` of the dialog points at real text. Without a `description`, `UModal` renders an empty `DialogDescription` and Reka still points `aria-describedby` at it. Measured in headless Chromium at 390 and 1280 px, in English and German, for add and edit: the description text is found through `aria-describedby`, its box is 1 × 1 px, the add header is 60 and 68 px high as set in `ui`, and the delete confirmation (an `alertdialog` with its own description) is unchanged. Not checked: a screen reader, dark mode.
- `CostForm` gets `:cost` and `:month`.
- Focus on open is not set by the app: Reka's dialog focuses the first focusable element, the close button, so the amount is one Tab away (author's decision, [Initial focus in the cost dialog](decisions.md#initial-focus-in-the-cost-dialog-87)).
- When the modal closes (close button, backdrop, Escape), `@update:open` calls `close()`. `@cancel` calls `close()` too.
- On `@saved` (with the saved name) the layout's `onSaved(name)` awaits `retry()` from `useCostLists()`, calls `close()` and then shows a toast `t('common.saved', { name })`: "Lamp saved" (German "Lamp gespeichert"). Every page that shows the lists updates. Add and edit share this one message; after an edit it names the saved (new) name. See [Success message after add, edit and delete](decisions.md#success-message-after-add-edit-and-delete-8).
- **Announcement (#8):** the toast is announced by Nuxt UI's hidden `span` with `role="alert"` and `aria-live="assertive"` (text "Notification <message>", German "Benachrichtigung <message>"); the visible toast shows only the message. It takes no focus: after an add the focus is on the element that opened the dialog, after a delete on the next row's button (#6). It disappears after about 5 seconds. Measured in headless Chromium with `POST` and `DELETE` intercepted, at 1280 and 390 px, in English and German. Not checked: a real screen reader (`assertive` interrupts a speaking screen reader; Nuxt UI's default, left as is).
- A failed save shows no toast, only the banner in the form (#95).
- The layout calls `useCostLists()`. The pages fetch the same lists, so this adds no requests.

State lives in `useState`, not in provide/inject, so any component can open the dialog without being a child of the layout.

### Cost form

`components/CostForm.vue` is one form for adding and editing both kinds of cost. It is built with `UForm` and the Zod schemas; the schema switches with the kind switch. All fields are labelled.

- **Add:** on submit it POSTs `event.data` (already stripped by Zod) to the matching route and emits `saved` with the saved name (`event.data.name`; for an edit the new name). The layout refreshes both lists (`retry` of `useCostLists()`), closes the dialog and shows the success toast (#8, see [Add and edit dialog](#add-and-edit-dialog)).
- **Failure (#95):** if the request fails, a banner (`UAlert`, `role="alert"`, with the alert icon) appears at the top of the form, above the amount: the bold title `form.notSaved.title` ("Could not save the cost.") and the description `form.notSaved.description` ("Please try again. What you entered is still here."). The modal stays open with the entered values. The API's own message is never shown. A `saveFailed` ref drives it: set in the `catch` of `onSubmit`, reset at the start of the next submit, so the banner disappears as soon as the cost is sent again. There is no toast any more. See [Failed save as a banner](decisions.md#failed-save-as-a-banner-95). Styling per mock `BStateFormErrors` / `BDarkStateFormErrors`, set through the `ui` prop of `UAlert`: background `#FEF3F2` (dark `#3A1717`), text `#7A271A` (dark `#FECACA`), icon `text-error` (`#B42318` light, `#FCA5A5` dark through the `.dark .text-error` rule in `main.css`), radius 18 px, padding 12 px 14 px, 14 px text, title extra bold. Checked in headless Chromium in light, dark and German at 320 px: the computed colours match the mock.
- **Fresh start:** a closed modal unmounts its content, so the form starts empty each time. A Cancel button emits `cancel`; the layout closes the dialog, which clears the state, so the next "Add cost" starts empty.
- **Edit:** with the optional `cost` prop (`Stored<Cost>`) the form is pre-filled once, the kind radio group is disabled (a cost cannot change its kind), the submit button says "Save" and submit sends a `PATCH` to `/api/<resource>/<id>` instead of a `POST`. The interval stays free to change; the API merges the patch and drops the due month of a cost that becomes monthly.
- **Month prop:** the optional `month` prop (`{ year, month }`, set when a month page or the phone's add button calls `openAdd(monthRef)`) starts a purchase on the first day of that month, limits the date field to that month with `min` and `max` and names the month in a hint ("Pre-filled with October 2026. Pick the day."). A yearly or quarterly cost starts with that month as `dueMonth`, which stays free to change. The first and last day come from `monthDateRange` in `shared/utils/dates.ts` (UTC, leap years included).
- **Limit of the month prop:** the browser limits the date field, the Zod schema does not, so the API still accepts a purchase on any day.
- **Business hint:** the business checkbox shows the hint "Counted apart from household costs" (`form.businessHint`) as its `description`. The whole card row is the label, so the hint is announced as part of the checkbox's name, not through `aria-describedby` (author's decision, [Business hint inside the label](decisions.md#business-hint-inside-the-label-91)).
- **Layout (Cobalt, #87-#91):** top to bottom: the amount, Type, name, category, then the date (purchase) or Interval and due month (recurring), the business row and the buttons.
  - *Amount:* a `UInputNumber` without stepper buttons, 52 px, tabular numerals, with a decorative "€" in front. It formats with `Intl` in the active language (`25,50` in German), two decimals, no grouping, and rounds on blur. Its width follows the text (`field-sizing: content`, at least 2 characters, at most the row; Firefox keeps a fixed width).
  - *Type and Interval:* segmented controls, both a `URadioGroup` (`variant="card"`, `indicator="hidden"`) with the same copied `ui`. Arrow keys move the selection, the group is one Tab stop. Type shows the kind icons from `useKind()` and the labels "Recurring" and "One-off" (`kind.recurring`, `kind.purchase`; German "Wiederkehrend", "Einmalig"; the mocks say "Purchase", #2). See [Segmented controls as radio groups](decisions.md#segmented-controls-as-radio-groups-88-89).
  - *Category:* a `URadioGroup` of chips, each with a 32 px `CategoryBadge`; they wrap onto two rows.
  - *Due month:* always below Interval (the German labels did not fit beside it). A help text names the repeat months ("Repeats in February, May, August, and November.", "Fällig im …"), built in the form from `monthItems` and `Intl.ListFormat`, months in calendar order.
  - *Business:* a tinted card row (`UCheckbox`, `variant="card"`), full width on all screens, with a briefcase icon and the hint.
  - *Buttons:* Cancel (hidden below `sm`, where the dialog's close button remains) and the submit button, full width on phones.
- **Required fields:** amount, name, category, date and due month carry native `required` on the control (for screen readers) and `required` on the `UFormField` (the asterisk). `UForm` has `novalidate`, so the browser shows no bubbles of its own.
- **Errors (#94):** each field shows a short translated message with an alert icon below it (`form.amountError`, `nameError`, `categoryError`, `dateError`, `dueMonthError`), through the `#error` slot of `UFormField`; invalid inputs get a red ring, the amount a red line. `UFormField` links the message with `aria-describedby` and sets `aria-invalid` (on the `fieldset` for the category). Fields are checked on submit and, once touched, on `change` and `input`, not on `blur` (`:validate-on="['input', 'change']"`). After a failed submit the first invalid field gets the focus. See [Form errors](decisions.md#form-errors-94).
- **Defaults are read once** when the form is created, like the `cost` prefill, and an edited cost keeps its own values. Without the `month` prop the form is unchanged; the sidebar and `/costs` use `openAdd()`.

### Known limit: the costs table loads on the client

`/costs` used to have its own non-lazy `useFetch` calls. Nuxt gave them different cache keys than the layout's, so after a save from the dialog the table did not update until a reload. The page now uses `useCostLists()`. The table is therefore filled on the client: it is empty while loading, and the page has no loading or error state yet (the dashboard and the month page have).

### Tests

- `tests/nuxt/CostForm.test.ts`: add and edit (POST, PATCH; the `saved` event carries the name, after an edit the new one), the failed-save banner (none on open, text in en and de without the API message, input kept, gone after the next successful submit, no toast), the month prop, the controls (kind, category chips with arrow keys and one tab stop, interval, due month default and repeat hint in en and de, amount parsing and formatting in en and de, business hint) and the error messages (none on open, each message in en and de, `aria-describedby`, cleared once valid).
- `tests/nuxt/CostDialog.test.ts` (mounted on the layout): opens empty (also from the sidebar button), pre-filled for an edit and for a month (date on the first day, `min` and `max`, hint); Cancel and the close button clear the state; no leftover cost or month in the next dialog; focus returns to the element that had it before the dialog opened; both lists are loaded again and the dialog closes after a save; German.
- `dashboard-states.test.ts`, `dashboard-month-cards.test.ts`, `costs-page.test.ts` and `month-page.test.ts` only check that the page asks for the dialog with the right state (`open`, `cost`, `month` of `useCostDialog()`), and that the page shows new numbers after `refreshNuxtData()`.
- Every file that touches the dialog closes its state after each test, because `useState` outlives a test.

Known limits:

- On a window lower than about 790 px the dialog scrolls, and the error messages make it taller still (#136).
- When the dialog body is scrolled, the failed-save banner at the top of the form is out of view after a failed save. This happens on phones (at 320×900 the body was scrolled 136 px after pressing the submit button) and on the desktop whenever the dialog scrolls (#136). Screen readers still announce the banner (`role="alert"`); sighted users see nothing change. Possible fix: scroll the banner into view after a failed save. Tracked on #136.

Checked by hand in the browser: the dashboard and month page buttons open the dialog, and the costs table updates after a save. The sidebar button opens the dialog (test in `CostDialog.test.ts`). Not checked: the dialog on a phone *(to verify)*.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds. It sits in the layout's one dialog, see [Add and edit dialog](#add-and-edit-dialog). Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` (with the saved name, `saved: [name: string]`) and `cancel`. A failed save shows a banner at the top of the form (#95). |
| `YearSelect.vue` | `v-model` year select with a visible label to its left (horizontal field, pill-shaped select); takes a `years` list |
| `BusinessBadge.vue` | The "Business" badge with a briefcase icon, no props. See [Business badge](colour-scheme.md#business-badge) |
| `CategoryBadge.vue` | Round disc with a white category icon; props `category` and `size` (28, 32, 36, 40, 44, 56). Decoration only (`aria-hidden`), the name is text in the parent. See [Category badge](colour-scheme.md#category-badge) |
| `LogoMark.vue` | The Costcompass mark (disc, ring, compass needle) as an inline SVG, no props. Decoration only (`aria-hidden`), sized by the parent. Used in the sidebar title. See [Logo mark](colour-scheme.md#logo-mark) |
| `CategoryList.vue` | The `ul` of category rows: a 36 px `CategoryBadge`, the bold name, the bold amount and an optional muted `percent` line below it. Prop `rows: { category, label, amount, percent? }[]`; the caller formats the amount and the percentage. Grid `repeat(auto-fill,minmax(13.75rem,1fr))`, so a narrow parent gets one column. No heading. Used by the dashboard's ["Where your money goes"](#where-your-money-goes-categories) (whole euros and percent) and the month page's [By category card](#by-category-card-77) (cents, no percent) |
| `SplitList.vue` | The `ul` (`flex flex-col gap-3`) with the household and business rows: a decorative house icon (`text-primary`), "Household" (`dashboard.split.household`) and the amount; a decorative briefcase icon (`text-secondary`), "Business" (`business.label`) and the amount. The icons are `size-5 shrink-0` and `aria-hidden`. Props `householdTotal` and `businessTotal`, both strings formatted by the caller. No heading. Layout classes come from the call site (Vue passes `class` to the root `ul`). Used by the dashboard's ["Household and business"](#household-and-business-split-ring) card (whole euros) and the month page's [By category card](#by-category-card-77) (cents, with a divider line above) |
| `CostGroups.vue` | The costs page on phones (#86): one `section.card` per kind (recurring first, a kind without costs left out) with the kind icon, the name and count in the `h2` and the total in whole euros (purchases only of the given `year`) with a screen reader only period ("per year", "in 2026", #143), and one row per cost with an actions menu (Edit, Delete); below 400 px the amount moves under the name, and after an action the focus goes back to the row's menu button. Props `costs` (`Stored<Cost>[]`) and `year`. Emits `edit` and `delete`, each with the cost. See [Costs page](#costs-page) (**Grouped lists on phones**) |
| `DashboardSkeleton.vue` | The loading placeholder of the dashboard: three cards of `USkeleton` bars, no props. Decoration only (`aria-hidden`). See [Dashboard loading skeleton](#dashboard-loading-skeleton) |
| `MobileBar.vue` | The bottom tab bar below `lg`: a named `nav` with three tab links from `useNavItems()`, and the round add button. No props. See [Bottom tab bar](#bottom-tab-bar) |
| `LanguageSwitcher.vue` | Switches the language with `setLocale()`. Without props: a `USelect` in a `UFormField` with the visible label `language.label`, in the footer slot of the sidebar, see [Sidebar navigation](#sidebar-navigation). With `compact`: a round button with the language code and a menu of the languages, at the top right below `lg`, see [Compact language button](#compact-language-button-on-phones) |

`CostForm` is opened through the [add and edit dialog](#add-and-edit-dialog). It validates with the Zod schemas from `shared/utils/validation.ts`, so the browser and the API apply the same rules, except that the date field limit of the `month` prop is a browser limit only.

## Composables

The composables in the table below carry TSDoc comments (not `useAppHead`, `useKind` and `useNavItems`, whose names say enough): where their data comes from, which results are numbers and which are already formatted, and examples of the formatters. The table is the overview; the comments are the detail.

| Composable | Returns |
| --- | --- |
| `useMoney(options?)` | A formatter for euros: whole euros, or cents with `useMoney({ cents: true })` |
| `useMoneyParts()` | A function that splits an amount with cents into `{ whole, cents, after }`, so the cents can be styled on their own ("€2,081" ".00" "" in English, "2.081" ",00" " €" in German). Joined, the three equal `useMoney({ cents: true })`. Same file as `useMoney`; used by the month hero |
| `useMonthSummary()` | One computed with everything the two heroes need about a month: `year`, `month`, `total`, `percent`, `direction` (`less`, `more`, `same`, `none`), `recurringTotal`, `purchasesTotal`, `empty`, `recurringRows`, `purchaseRows`, `largestRows` (display rows from `toRow`: `recurringRows` and `purchaseRows` in the long form, `largestRows` in the short form; written as arrow functions, because `.map(toRow)` would pass the array index as `form`), `comparison` (the long text, `dashboard.thisMonth.*`), `comparisonShort` (`month.changeShort.*`), `icon`, `count`, `businessCount`, `categoryRows` (`{ category, label, amount }` from the summary's `categories`, the label from `category.<id>`, the amount with cents through `useMoney({ cents: true })`; read by the month page's [By category card](#by-category-card-77)), `householdTotal` and `businessTotal` (the summary's totals with cents through `useMoney({ cents: true })`, read by the `SplitList` in the same card). Takes no arguments: it reads the month from the route params with `monthParamsSchema` and falls back to today's month from `useYear()`, so on the dashboard it is today's month. Built on `monthSummary` and the lists of `useCostLists()`. Loading, failed and retry stay in `useCostLists()`, because they describe the lists, not the month, and the dashboard needs them for the whole page. See [Month summary from the route](decisions.md#month-summary-from-the-route) |
| `useYearSummary()` | One computed for the shown year (#80): `year` (the stored year from `useYear()` if it is in `availableYears(purchases, currentYear)`, otherwise the current year; the [year fallback](#year-fallback-on-the-dashboard)), `years` (the selectable years), the fields of `annualSummary` for that year (`total`, `household`, `business`, `averagePerMonth`), and `recurringCount` and `purchasesCount` (the lengths of the two lists: all costs, not one year's). Takes no arguments, like `useMonthSummary()`; built on `useYear()` and `useCostLists()`. Read by the dashboard and the costs page summary line, so both name the same year |
| `useYear()` | `year` (selected, shared state), `currentYear`, `currentMonth` (read once, in UTC). The dashboard and the costs page share the selected year through `useYearSummary()`, because the core takes the year as a parameter; month pages take their year from the URL instead. See [Dashboard money and year](decisions.md#dashboard-money-and-year) |
| `useMonth()` | `monthName(month, style?)`, `monthYear(year, month)`, `monthPath(year, month)`, `formatDate(date, form?)`, `toRow(cost, form?)` (a display row for a stored cost: `key`, `name`, `subline`, `business`, `amount` in cents, `category`; used by `useMonthSummary()` for the month page and the "Largest this month" card). `form` is `'short'` (default) or `'long'`. Short, for the dashboard: "Yearly", "Oct 20". Long, for the month page (#76): a yearly cost with a `dueMonth` reads "Yearly, November" (`interval.yearlyIn`), a yearly cost without one falls back to "Yearly", quarterly and monthly show only the interval, and a purchase date has the full month ("October 20", German "20. Oktober"). `formatDate` takes the same `form`; it is returned since #96, and the costs page uses it for the long purchase date in the delete confirmation |
| `useCostLists()` | `recurring`, `purchases`, `failed`, `loading`, `retry`. Uses `useFetch` with `lazy: true`, so the layout, the dashboard, the costs page and the month page share the cached data. |
| `useNavItems()` | `items` (computed, follows the language): `label`, `shortLabel`, `to`, `icon` for Dashboard, Costs and This month. Read by the sidebar and `MobileBar`. |
| `useCategory()` | `categoryIcon(category)`, `categoryClass(category)`, `categoryStyle(size)` for `CategoryBadge`; also exports `CATEGORY_SIZES` and `CategorySize` |
| `useKind()` | `kindIcon(kind)`: the icon for a cost's kind, from `KIND_ICONS` (`recurring` → `i-lucide-repeat`, `purchase` → `i-lucide-shopping-bag`, not food's `i-lucide-shopping-basket`). The one place for kind icons; used by the month page's group headings (#75) and the kind column of the costs table (#85). See [Kind icons](decisions.md#kind-icons-75) |
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
- Page titles: `app.vue` sets a `titleTemplate` (`<page> – Costcompass`, the app name from `app.name`) and every page sets its own title with `useHead({ title: () => t('...') })`, so the title is translated and follows a language switch. A page without a title falls back to the app name. New pages (dashboard, month pages) follow the same pattern.
- Head setup: `lang`, `dir` and the title template live in `useAppHead()`, which both `app.vue` and `error.vue` call, because `error.vue` replaces `app.vue` while an error is shown. `@nuxtjs/i18n` does not set the document language, so `useAppHead()` sets `<html lang>` (the locale code) and `dir="ltr"` with `useHead`; a right-to-left language would need `dir` from the locale.
- `<NuxtRouteAnnouncer />` in `app.vue` announces the new title to screen readers after every navigation; `error.vue` has its own.
- Nuxt UI's own texts (the modal close button, the empty table) follow the i18n locale on their own, because the Nuxt UI module provides its locale from `$i18n.locale`. `UApp` needs no `locale` prop.

## Accessibility conventions

- Sections are labelled with `aria-labelledby`; bars and tracks are `aria-hidden` and every value is also real text.
- The split ring is a `role="img"` with a translated `aria-label`; the rows beside it carry the amounts as text.
- The month chart items are links named by a visually hidden text ("January: €800"); the bar and the short label are `aria-hidden`; the focused link has an outline; the current month is bold, not only coloured (cobalt against the soft colour).
- The costs table sets no `aria-sort`, so the sort buttons carry the state in their `aria-label` (`costs.sort.*`). A change of the order is also announced by a `role="status"` text (#9).
- After a successful retry on the month page and on the dashboard, focus moves to the `h1`, which has `tabindex="-1"`. After a failed retry the focus stays where it is and the new error is announced.
- `<NuxtRouteAnnouncer />` announces the new title after each navigation.

## Calculation core

The pages pass the fetched lists to the functions in `shared/`; see [the calculation core](../backend/calculation-core.md).
