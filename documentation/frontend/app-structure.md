# App structure

Reference and conventions for `app/` (pages, components, composables, texts). Written for: developers. End users: see the [user guide](user-guide.md). The server side is in [the backend documentation](../backend/index.md).

## Pages

| Route | File | State | What it does |
| --- | --- | --- | --- |
| `/` | `app/pages/index.vue` | Exists | Dashboard: "This month" hero card with the recurring and purchases subtotals, "Largest this month" card, summary card with the year select in its header, household and business ring, "Where your money goes" (categories), "Month by month" |
| `/costs` | `app/pages/costs.vue` | Exists | One sortable table of both kinds, add, edit and delete |
| `/months/[year]/[month]` | `app/pages/months/[year]/[month].vue` | Exists | Costs of one month, total, "By category" card, previous and next links, add cost in the empty month (pre-filled for the month) |
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
- An `h2` "No costs yet" (`dashboard.emptyTitle`) and the text "Add a recurring cost or a purchase to see your totals here." (`dashboard.emptyText`).
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

The month's total sits in a hero card (see [Month hero](#month-hero-73-74) below). Below it is one `section` per kind that has entries (Recurring, Purchases); a group without entries is not shown. Each section has an `h2`, its subtotal and a `ul` of rows. Everything about the month (the groups, subtotals, rows, comparison, counts, category totals and the empty flag) comes from one `useMonthSummary()` call, which runs `monthSummary` from the core (see [Composables](#composables)). The `sections` computed builds the two groups from its `recurringRows`, `purchaseRows`, `recurringTotal` and `purchasesTotal`, and one loop renders both.

Issue #75: each group heading starts with a kind icon. Every `sections` entry carries its `kind` (`'recurring'` or `'purchase'`), and the `h2` (`flex items-center gap-2`) holds a `UIcon` with `kindIcon(section.kind)` from `useKind()` (see [Composables](#composables)) before the title: a repeat icon for "Recurring", a shopping bag for "Purchases". The icon is `text-muted` and `aria-hidden="true"`, so the heading's accessible name stays "Recurring" or "Purchases". Contrast of the icon, computed from the colour tokens with the WCAG formula, not measured: `#4a4e69` on the card's `#ffffff` is 8.12:1 in light mode, `#a3a7c2` on `#15172a` is 7.46:1 in dark mode, so both clear the 3:1 for graphics. Tests: `tests/nuxt/month-page.test.ts` ("puts a decorative kind icon in each group heading, so the heading text stays the same") and `tests/nuxt/useKind.test.ts`. Checked by the author in the browser: light mode, dark mode and 320 px. Not checked: a real phone, a screen reader.

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

Tests: `describe('month page comparison with the month before')` and `describe('month page counts')` in `tests/nuxt/month-page.test.ts`, see [Testing](testing.md#pages). Not checked in a browser: 320 px and light mode. Known limit: on phones the heading row with the arrows and the "This month" badge wraps into two lines (issue #118).

#### By category card (#77)

The month's costs per category, next to the lists from `lg` and below them on a phone. It is an `<aside aria-labelledby="categories-title" class="card px-6 py-5 lg:w-[340px] lg:shrink-0">`, so assistive technology lists it as a named complementary landmark. It holds:

- An `h2#categories-title` "By category" (`month.byCategory`; German "Nach Kategorie").
- A `CategoryList` (see [Components](#components)) with `thisMonthSummary.categoryRows` from `useMonthSummary()`: per category a 36 px `CategoryBadge` (decoration, `aria-hidden`), the translated name and the total with cents. No percentage line.

The rows come from `monthCategoryTotals` in the core (see [calculation core](../backend/calculation-core.md#month-page-functions)): only categories with a cost in the month, largest first, equal totals in `CATEGORIES` order. Their sum is the month's total. From `lg` the list has one column, because the `auto-fill` grid of `CategoryList` has room for only one 13.75rem (220 px) column in the 340 px card. Below `lg` the card is as wide as the content, so on a wide tablet screen the rows can sit in two or more columns, as on the dashboard.

States: the card is in the loaded branch, so it is not shown while loading or after a failed load. It is also not shown in a month without costs (`v-if="!thisMonthSummary.empty"`); the empty card explains the month.

Left out on purpose: the household and business split that the mock shows at the bottom of the card. It is not part of #77 and needs its own issue. Decisions: [By category card on the month page](decisions.md#by-category-card-on-the-month-page-77).

No new colours, so there are no new contrast values: the badge colours are under [Category badge](colour-scheme.md#category-badge), the text uses the existing tokens.

Tests: `describe('month page "By category" card')` in `tests/nuxt/month-page.test.ts`, see [Testing](testing.md#pages), and `monthCategoryTotals` in `tests/nuxt/costs.test.ts`. Checked by the author in the browser: light and dark mode, German, 320 px. Not checked: the switch at the `lg` breakpoint, a real phone, a screen reader; contrast is not measured (no new colours).

#### Navigation (#26)

A "Dashboard" link sits above the heading. A previous and a next month icon link sit on either side of the heading (`UButton` with `to`, so real `<a>` elements, 36 px square). Their accessible name is an `aria-label` that names the target ("Previous month, September 2026"); the paths come from `monthPath`. The targets come from `monthNeighbours` with `availableYears` as the valid years, so a link that would lead to a year without data is hidden. Until the lists have loaded only the current year counts, so the links inside a year are there from the start. Keyboard order: Dashboard, previous, next.

#### Empty month (#28) and adding a cost (#31)

A month without costs (the `empty` flag of `useMonthSummary()`) keeps the total card (with a zero in the money format, without the comparison pill and the counts line) and shows a `UCard` instead of the groups: "No costs in <month>" (`h2`), a hint and a decorative icon. It is in the loaded branch, so it never shows while loading or after an error. Its "Add cost" button calls `openAdd(monthRef)`, so the layout's dialog opens with `CostForm` pre-filled for that month (see [Add and edit dialog](#add-and-edit-dialog)). The button next to the heading was removed with #59; the other entry points are the layout's sidebar button and the phone's round add button, which already passes the month. After `saved` the layout refreshes both lists with `retry` (the old data stays on screen meanwhile, so there is no flicker into the skeletons) and closes the dialog.

Tests: `tests/nuxt/month-page.test.ts`, see [Testing](testing.md).

### Error page

`app/error.vue` is Nuxt's error page, not a route. It shows a translated "Page not found" for an unknown URL (the response has the status 404) and a generic "Something went wrong" for any other error, never the error message. It sits in the default layout, has its own title and its own route announcer, and a "Back to dashboard" button that clears the error and redirects to `/`.

When the error carries `data: { reason: 'month' }` (thrown by the month page), it shows the month variant instead: "That month doesn't exist", a hint that the address has a month outside 1 to 12 or an invalid year, a "Go to <current month and year>" link (`monthPath`) and the same "Back to dashboard" button. The texts are picked by a `variant` (`month`, `notFound` or `generic`) that forms the locale key (`error.<variant>Title`, `error.<variant>Text`). Tests: `tests/nuxt/error-page.test.ts`, see [Testing](testing.md).

### Costs page

Route `/costs`, file `app/pages/costs.vue`. One table with recurring costs and purchases together, a `kind` column and a "when" column (interval and month for recurring costs, date for purchases).

- **Adding:** the page has no "Add cost" button of its own. The sidebar's button (`openAdd()`) is the single entry and opens the add form in the layout's dialog. The table refreshes after a save.
- **Data:** the page reads its lists with `useCostLists()` (lazy, the same cache keys as the layout, so the table updates after a save from the layout). Known limit: see [Known limit: the costs table loads on the client](#known-limit-the-costs-table-loads-on-the-client).
- **Delete:** each row has a trash icon button (accessible name "Delete <name>") that opens one shared confirmation modal (`UModal`, driven by a `toDelete` ref). On confirm the cost is deleted through the API and the table refreshes. A failed delete shows its own error toast.
- **Name column:** a `#name-cell` slot with a `CategoryBadge` (40 px), the name in bold with the `BusinessBadge` for business costs, and the category name as a caption below. The separate Category and Business columns still exist; whether they go away is not decided.
- **Edit:** each row also has a pencil icon button (accessible name "Edit <name>") that calls `openEdit(row.original)`. It opens the same dialog in edit mode; the dialog title shows the cost's name.
- **Sorting:** the table is sorted by name by default (`localeCompare` with the active locale, so umlauts sort correctly). The headers of Name, Category, Kind, Amount and Business are sort buttons (`sortableHeader` in `costs.vue`, cycling ascending and descending). Text columns use a `sortingFn` that compares the translated text shown in the cell, not the stored id. `UTable` sets no `aria-sort`, so the button's `aria-label` carries the state ("Name, sorted ascending"; texts in `costs.sort.*`). The "When" column is deliberately not sortable (idea: issue #3).

### Subtotals in the "This month" card

Issue #61. Below the comparison line, the card has a description list (`dl`) with two pairs: "Recurring" (`month.recurring`) and "Purchases" (`month.purchases`), the same keys as the month page. The amounts are `recurringTotal` and `purchasesTotal` from `useMonthSummary()` (the groups of `monthSummary`) for today's month and year, so they ignore the year selector like the rest of the card. A group without costs shows `€0.00`, not nothing.

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

Below the header is one `UCard` (`card card-flush overflow-hidden`) with a `dl` of four tiles, in the order Annual total, Average, Household, Business. The data is from `annualSummary` in `shared/utils/costs.ts`, shown in whole euros by `useMoney()`; the year comes from `useYear()` (see [Composables](#composables)):

| Tile | Label key | Value | Sub line | Dot |
| --- | --- | --- | --- | --- |
| Annual total | `dashboard.summary.total` | `summary.total` | "per year" (`perYear`) | `bg-inverted` |
| Average | `dashboard.summary.average` | `summary.averagePerMonth` | "per month" (`perMonth`) | `bg-accented` |
| Household | `dashboard.summary.household` | `summary.household` | "<n>% of the year" (`ofYear`) | `bg-primary` (cobalt) |
| Business | `business.label` | `summary.business` | "<n>% of the year" (`ofYear`) | `bg-secondary` (orange) |

- Each tile has the label as `dt` with an `aria-hidden` colour dot, the value as `dd` (30 px, bold, whole euros) and the sub line as a second `dd`. The percentages come from `splitPercentages`, so they add up to 100.
- Layout: a 2x2 grid on phones, four in a row from `lg`. The dividers are 1 px gaps (`gap-px`) that show the grid's background (`bg-default`); the tiles have an opaque `bg-elevated` fill, so no border elements are needed.
- `card-flush` (in `main.css`) removes the body padding of the card (`.card.card-flush > [data-slot="body"]`), so the dividers run to the card's edge; the tiles bring their own padding (`p-5 sm:p-6`). `overflow-hidden` clips the tiles to the card's rounded corners.
- `YearSelect.vue` now shows its visible label "Year" to the left of the select (`UFormField` with `orientation="horizontal"`), and the select is a pill (`rounded-full`, 44 px high). The two first-row rules in `main.css` for the floated picker were removed; the `h1` rule only sets `margin-bottom: 0`.
- Locale keys: `dashboard.summary.average`, `perYear`, `perMonth`, `ofYear`, `business` are new; `averagePerMonth` was removed.

Tests: `tests/nuxt/dashboard-summary.test.ts`: one card, order, whole-euro values, sub lines, shares add up to 100, dots hidden, the year select next to the heading with its label, German. The year-select tests use the heading "Your year"; the describe "dashboard page year selector" is in `tests/nuxt/dashboard-month-cards.test.ts`. Checked by the author in the browser: light and dark mode, German, 320 px. Not checked: a real phone, a screen reader; the contrast of the muted labels and sub lines is not measured; the horizontal label layout was adjusted by sight.

### "Where your money goes" (categories)

Issue #65. The section `aria-labelledby="categories-title"` is one card. Its `h2` sits inside the card and reads "Where your money goes" (`dashboard.categories.title`, no year in the heading; German "Wo Dein Geld hin geht"). The rows come from `categoryBreakdown` for `shownYear`.

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
- Beside the ring, two rows: house icon, "Household", amount; briefcase icon, "Business", amount (whole euros, `useMoney()`). The icons are `aria-hidden` and coloured `text-primary` and `text-secondary`. The ring and the rows sit in a wrapping flex row, so on a phone the rows stack under the ring. The percentage legend of the old bar is gone; the business percentage is only in the ring's label.

Tests: `tests/nuxt/dashboard-summary.test.ts`, "dashboard page household versus business split" (11 tests: heading, label, centre text, rows with amounts, hidden icons, ring colours and gap, German, full household ring, full business ring, empty ring and 0%, a 1% share). Not checked: the look of the ring and the gaps, light and dark mode, German, 320 px and the layout next to the categories card in the browser; a real phone; a screen reader.

### Dashboard links to month pages

Two places on `app/pages/index.vue` link to `/months/[year]/[month]` (issues #18 and #19). Both build the address with `monthPath(year, month)`, so the month is always two digits (`/months/2026/03`).

| Link | Target | Year used | Why |
| --- | --- | --- | --- |
| "View <month year>" at the end of the "This month" card (`dashboard.thisMonth.view`, e.g. "View March 2026") | Today's month: `monthPath(currentYear, currentMonth)` | Always `currentYear` | The card always shows today's month, so its link has to agree with it. Shown also when the month has no costs. |
| Each of the 12 items in "Month by month" | `monthPath(shownYear.value, month)` | The shown year (`shownYear`, see below) | The chart shows that year, so a bar leads to that year's month. |

Notes on the months chart:

- Issue #69: the card holds the `h2` "Month by month" (`dashboard.months.title`, no year; German "Monat für Monat") and the hint `dashboard.months.hint` ("Select a month to open it") in one row (`flex flex-wrap items-baseline justify-between gap-2`). The bars are 32 px pills (`w-8 rounded-full`, centred in the column). The current month of the shown year is `bg-primary` with a bold `text-primary` value and a bold label; the other months use `bg-[var(--chart-soft)]`. Colour is not the only carrier: the bold label and value stay. The light soft colour has 1.70:1 against the card, see [Months chart colours](colour-scheme.md#months-chart-colours).
- Each `li` holds a `NuxtLink` (a real `<a>`, works without JavaScript). The `li` has no layout of its own, so the link fills the grid column and the bars keep their width.
- Link name: the `sr-only` text from `dashboard.months.alt` ("March: €1,100"; the month names come from `Intl` in the active language, "January: €800"). The bar, the short value and the short label are `aria-hidden`; the bar has a hover `title`.
- Short value above each bar (`span.text-xs.tabular-nums`, `aria-hidden`; bold and `text-primary` for the current month, `text-muted` for the others). `monthRows` carries it as `value`, built by `shortAmount(total)`: if `Math.round(total) < 1000` it is the whole number from `n(...)` ("800"); otherwise `n(total / 1000, { maximumFractionDigits: 1 })` inside the key `dashboard.months.thousand` (`"{value}k"` in en and de), so "2.3k" in English, "2,3k" in German, "2k" for 2,000 and "12.6k". 999.60 rounds to 1000 and reads "1k". A month of 0 shows "0" and keeps its baseline.
- Decision: the value is hand-built, not `Intl.NumberFormat` with `notation: 'compact'` (what issue #68 asked for). The author checked it: German short compact does not abbreviate thousands ("2100", "12.600"), the long form is "2,1 Tausend" (too wide for a narrow column), and the mock builds "2.1k" by hand too. The full amount stays in the link's `sr-only` text.
- The scroll area has `pb-4` (16 px) below the month labels.
- Keyboard focus shows an outline (`focus-visible:outline-2 focus-visible:outline-primary`).
- The current month's label and value are bold only if the shown year is the current year (`shownYear === currentYear && month === currentMonth`).
- The grid is `repeat(12, minmax(2.75rem, 1fr))` with an 8 px gap (`gap-2`) inside an `overflow-x-auto` wrapper. 2.75rem is 44 px. Twelve columns plus gaps do not fit on narrow screens, so the chart scrolls sideways instead of squeezing the targets. Looked at in the browser by the author (the 320 px width was part of that check); not measured.
- Tests: "dashboard page month bar links" and "dashboard page costs per month" (the heading, hint, pills, colours, column width and the value above the bars) are in `tests/nuxt/dashboard-months.test.ts`; "dashboard page "View month" link" is in `tests/nuxt/dashboard-month-cards.test.ts`.

### Year fallback on the dashboard

Issue #30. The selected year lives in `useYear()` (`year`, a `useState('year')`). The year select offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases. If the stored year is not in that list (for example after the last purchase of that year is deleted), the dashboard shows the current year instead. Before, the select was empty and the sections showed that year with recurring costs only.

`app/pages/index.vue` has a computed value for this:

```ts
const shownYear = computed(() => years.value.includes(year.value) ? year.value : currentYear.value)
```

`shownYear` feeds the `YearSelect` (`:model-value`), the section headings, `annualSummary`, `categoryBreakdown`, `monthBreakdown`, the month bar links and the current-month marker. The "This month" card still uses `currentYear`. Choosing a year in the select (`update:model-value`) writes the stored `year`.

Why a computed value and not a reset of the stored year:

- The stored year stays untouched, so it is only a display rule. If purchases of that year exist again, for example after the lists finish loading or refresh, that year is shown again.
- A reset would need a `watch` that writes shared state. While the lists are still loading, `purchases` is empty and `years` holds only the current year, so such a watch, which runs whether or not the select is visible yet, could throw away a valid choice. It would have to wait for the lists first.

The month page and the costs page do not use the stored year.

Tests: `tests/nuxt/dashboard-month-cards.test.ts`, describe "dashboard page year selector" (falls back when the stored year has no purchases; keeps a stored year that is in the list; falls back after the purchases of the selected year are deleted).

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

The delete confirmation is not part of this. It stays a modal of the costs page (see [Costs page](#costs-page)).

The dialog is not its own route and not one per page. A modal (`UModal`) was chosen over a slide-over for mobile.

What the layout does:

- The title is "Add cost" or "Edit <name>", depending on `cost`.
- `CostForm` gets `:cost` and `:month`.
- When the modal closes (close button, backdrop, Escape), `@update:open` calls `close()`. `@cancel` calls `close()` too.
- On `@saved` the layout awaits `retry()` from `useCostLists()` and then calls `close()`. Every page that shows the lists updates.
- The layout calls `useCostLists()`. The pages fetch the same lists, so this adds no requests.

State lives in `useState`, not in provide/inject, so any component can open the dialog without being a child of the layout.

### Cost form

`components/CostForm.vue` is one form for adding and editing both kinds of cost. It is built with `UForm` and the Zod schemas; the schema switches with the kind switch. All fields are labelled.

- **Add:** on submit it POSTs `event.data` (already stripped by Zod) to the matching route and emits `saved`. The layout refreshes both lists (`retry` of `useCostLists()`) and closes the dialog.
- **Failure:** if the request fails, a toast (`useToast`, text from `form.error`) is shown and the modal stays open with the entered values.
- **Fresh start:** a closed modal unmounts its content, so the form starts empty each time. A Cancel button emits `cancel`; the layout closes the dialog, which clears the state, so the next "Add cost" starts empty.
- **Edit:** with the optional `cost` prop (`Stored<Cost>`) the form is pre-filled once, the kind radio group is disabled (a cost cannot change its kind), the submit button says "Save" and submit sends a `PATCH` to `/api/<resource>/<id>` instead of a `POST`.
- **Month prop:** the optional `month` prop (`{ year, month }`, set when a month page or the phone's add button calls `openAdd(monthRef)`) starts a purchase on the first day of that month, limits the date field to that month with `min` and `max` and names the month in a hint ("Pre-filled with October 2026. Pick the day."). A yearly or quarterly cost starts with that month as `dueMonth`, which stays free to change. The first and last day come from `monthDateRange` in `shared/utils/dates.ts` (UTC, leap years included).
- **Limit of the month prop:** the browser limits the date field, the Zod schema does not, so the API still accepts a purchase on any day.
- **Defaults are read once** when the form is created, like the `cost` prefill, and an edited cost keeps its own values. Without the `month` prop the form is unchanged; the sidebar and `/costs` use `openAdd()`.

### Known limit: the costs table loads on the client

`/costs` used to have its own non-lazy `useFetch` calls. Nuxt gave them different cache keys than the layout's, so after a save from the dialog the table did not update until a reload. The page now uses `useCostLists()`. The table is therefore filled on the client: it is empty while loading, and the page has no loading or error state yet (the dashboard and the month page have).

### Tests

- `tests/nuxt/CostDialog.test.ts` (mounted on the layout): opens empty (also from the sidebar button), pre-filled for an edit and for a month (date on the first day, `min` and `max`, hint); Cancel and the close button clear the state; no leftover cost or month in the next dialog; focus returns to the element that had it before the dialog opened; both lists are loaded again and the dialog closes after a save; German.
- `dashboard-states.test.ts`, `dashboard-month-cards.test.ts`, `costs-page.test.ts` and `month-page.test.ts` only check that the page asks for the dialog with the right state (`open`, `cost`, `month` of `useCostDialog()`), and that the page shows new numbers after `refreshNuxtData()`.
- Every file that touches the dialog closes its state after each test, because `useState` outlives a test.

Checked by hand in the browser: the dashboard and month page buttons open the dialog, and the costs table updates after a save. The sidebar button opens the dialog (test in `CostDialog.test.ts`). Not checked: the dialog on a phone *(to verify)*.

## Components

| Component | Purpose |
| --- | --- |
| `CostForm.vue` | Add and edit form for both kinds. It sits in the layout's one dialog, see [Add and edit dialog](#add-and-edit-dialog). Props: optional `cost` (`Stored<Cost>`; set means edit, the kind is locked and submit sends `PATCH`) and optional `month` (`{ year, month }`; starts a purchase on the first day of that month and limits the date field to it). Emits `saved` and `cancel`. Failed saves show a toast. |
| `YearSelect.vue` | `v-model` year select with a visible label to its left (horizontal field, pill-shaped select); takes a `years` list |
| `BusinessBadge.vue` | The "Business" badge with a briefcase icon, no props. See [Business badge](colour-scheme.md#business-badge) |
| `CategoryBadge.vue` | Round disc with a white category icon; props `category` and `size` (28, 32, 36, 40, 44, 56). Decoration only (`aria-hidden`), the name is text in the parent. See [Category badge](colour-scheme.md#category-badge) |
| `LogoMark.vue` | The Costcompass mark (disc, ring, compass needle) as an inline SVG, no props. Decoration only (`aria-hidden`), sized by the parent. Used in the sidebar title. See [Logo mark](colour-scheme.md#logo-mark) |
| `CategoryList.vue` | The `ul` of category rows: a 36 px `CategoryBadge`, the bold name, the bold amount and an optional muted `percent` line below it. Prop `rows: { category, label, amount, percent? }[]`; the caller formats the amount and the percentage. Grid `repeat(auto-fill,minmax(13.75rem,1fr))`, so a narrow parent gets one column. No heading. Used by the dashboard's ["Where your money goes"](#where-your-money-goes-categories) (whole euros and percent) and the month page's [By category card](#by-category-card-77) (cents, no percent) |
| `DashboardSkeleton.vue` | The loading placeholder of the dashboard: three cards of `USkeleton` bars, no props. Decoration only (`aria-hidden`). See [Dashboard loading skeleton](#dashboard-loading-skeleton) |
| `MobileBar.vue` | The bottom tab bar below `lg`: a named `nav` with three tab links from `useNavItems()`, and the round add button. No props. See [Bottom tab bar](#bottom-tab-bar) |
| `LanguageSwitcher.vue` | Switches the language with `setLocale()`. Without props: a `USelect` in a `UFormField` with the visible label `language.label`, in the footer slot of the sidebar, see [Sidebar navigation](#sidebar-navigation). With `compact`: a round button with the language code and a menu of the languages, at the top right below `lg`, see [Compact language button](#compact-language-button-on-phones) |

`CostForm` is opened through the [add and edit dialog](#add-and-edit-dialog). It validates with the Zod schemas from `shared/utils/validation.ts`, so the browser and the API apply the same rules, except that the date field limit of the `month` prop is a browser limit only.

## Composables

| Composable | Returns |
| --- | --- |
| `useMoney(options?)` | A formatter for euros: whole euros, or cents with `useMoney({ cents: true })` |
| `useMoneyParts()` | A function that splits an amount with cents into `{ whole, cents, after }`, so the cents can be styled on their own ("€2,081" ".00" "" in English, "2.081" ",00" " €" in German). Joined, the three equal `useMoney({ cents: true })`. Same file as `useMoney`; used by the month hero |
| `useMonthSummary()` | One computed with everything the two heroes need about a month: `year`, `month`, `total`, `percent`, `direction` (`less`, `more`, `same`, `none`), `recurringTotal`, `purchasesTotal`, `empty`, `recurringRows`, `purchaseRows`, `largestRows` (display rows from `toRow`: `recurringRows` and `purchaseRows` in the long form, `largestRows` in the short form; written as arrow functions, because `.map(toRow)` would pass the array index as `form`), `comparison` (the long text, `dashboard.thisMonth.*`), `comparisonShort` (`month.changeShort.*`), `icon`, `count`, `businessCount`, `categoryRows` (`{ category, label, amount }` from the summary's `categories`, the label from `category.<id>`, the amount with cents through `useMoney({ cents: true })`; read by the month page's [By category card](#by-category-card-77)). Takes no arguments: it reads the month from the route params with `monthParamsSchema` and falls back to today's month from `useYear()`, so on the dashboard it is today's month. Built on `monthSummary` and the lists of `useCostLists()`. Loading, failed and retry stay in `useCostLists()`, because they describe the lists, not the month, and the dashboard needs them for the whole page. See [Month summary from the route](decisions.md#month-summary-from-the-route) |
| `useYear()` | `year` (selected, shared state), `currentYear`, `currentMonth` (read once, in UTC). The dashboard and the costs table share the selected year, because the core takes the year as a parameter; month pages take their year from the URL instead. See [Dashboard money and year](decisions.md#dashboard-money-and-year) |
| `useMonth()` | `monthName(month, style?)`, `monthYear(year, month)`, `monthPath(year, month)`, `formatDate(date, form?)`, `toRow(cost, form?)` (a display row for a stored cost: `key`, `name`, `subline`, `business`, `amount` in cents, `category`; used by `useMonthSummary()` for the month page and the "Largest this month" card). `form` is `'short'` (default) or `'long'`. Short, for the dashboard: "Yearly", "Oct 20". Long, for the month page (#76): a yearly cost with a `dueMonth` reads "Yearly, November" (`interval.yearlyIn`), a yearly cost without one falls back to "Yearly", quarterly and monthly show only the interval, and a purchase date has the full month ("October 20", German "20. Oktober"). `formatDate` takes the same `form` |
| `useCostLists()` | `recurring`, `purchases`, `failed`, `loading`, `retry`. Uses `useFetch` with `lazy: true`, so the layout, the dashboard, the costs page and the month page share the cached data. |
| `useNavItems()` | `items` (computed, follows the language): `label`, `shortLabel`, `to`, `icon` for Dashboard, Costs and This month. Read by the sidebar and `MobileBar`. |
| `useCategory()` | `categoryIcon(category)`, `categoryClass(category)`, `categoryStyle(size)` for `CategoryBadge`; also exports `CATEGORY_SIZES` and `CategorySize` |
| `useKind()` | `kindIcon(kind)`: the icon for a cost's kind, from `KIND_ICONS` (`recurring` → `i-lucide-repeat`, `purchase` → `i-lucide-shopping-bag`, not food's `i-lucide-shopping-basket`). The one place for kind icons; used by the month page's group headings, and an icon in the kind column of the costs table *(planned, #85)* is meant to reuse it. See [Kind icons](decisions.md#kind-icons-75) |
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
- The costs table sets no `aria-sort`, so the sort buttons carry the state in their `aria-label` (`costs.sort.*`).
- After a successful retry on the month page and on the dashboard, focus moves to the `h1`, which has `tabindex="-1"`. After a failed retry the focus stays where it is and the new error is announced.
- `<NuxtRouteAnnouncer />` announces the new title after each navigation.

## Calculation core

The pages pass the fetched lists to the functions in `shared/`; see [the calculation core](../backend/calculation-core.md).
