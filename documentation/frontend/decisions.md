# Frontend decisions

The design and dashboard decisions of the app, with their reasons. Written for: developers and contributors. They moved here from [`CLAUDE.md`](../../CLAUDE.md), which keeps only the architecture and data decisions (see [the backend decisions](../backend/decisions.md)). The mechanics of the colours are in [colour-scheme.md](colour-scheme.md), the pages in [app-structure.md](app-structure.md).

Where a decision is also described in one of those pages, the page has the detail and this page has the decision as it was recorded.

## Dashboard money and year

Amounts on the dashboard are shown in whole euros (`useMoney()`), while the costs table keeps cents. The two subtotals of the "This month" card (#61) also use cents (the author's decision, as in the mock), so they can differ from the whole-euro total next to them by rounding (819.99 + 300.50 = 1,120.49, total shown as €1,120). The calculation stays exact and only the display is rounded, so household plus business can differ from the total by 1 on screen.

Today's year and month are read once in `useYear()` (one `Date`, in UTC) and kept in `useState`, so the server and the browser agree about them around New Year and the two can never come from different moments (`currentYear`, `currentMonth`).

Month names and labels such as "October 2026" come from `useMonth()` (`Intl`, UTC dates), not from copies in the pages.

The selected year (`year`) is shared state too, so it survives navigation and the costs page names the same year in its summary line (#80). `YearSelect` (a `v-model` component with a translated, visible label to the left of the select) offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases, newest first.

Known limits:

- Recurring costs have no start or end date, so a past year shows today's recurring costs until price history exists (#23).
- A stored year that is no longer in the list (for example after deleting the last purchase of that year) falls back to the current year (#30). The shown year is `years.includes(year) ? year : currentYear`; the dashboard uses it for the select, the sections, the month links and the headings, while the stored year stays unchanged. It returns by itself when purchases of that year exist again, and a list that is still loading does not reset it. Since #80 the rule lives in one place, `useYearSummary()`, and not in the dashboard: the costs page summary line names a year too, and both pages must name the same one. Details: [Year fallback on the dashboard](app-structure.md#year-fallback-on-the-dashboard).

## Colour scheme (#50, steps 1 to 3)

The active design direction is Cobalt (`mockups/cobalt`, git-ignored, so not in the repository; the teal direction is parked). It is applied by CSS only, in `app/assets/css/main.css`, by setting Nuxt UI's variables:

- `--ui-color-primary-50..950` (cobalt; `--ui-primary` is `#2D4BD8` in light and `#3B5BEB` in dark),
- `--ui-secondary` (the business orange, `#B54708` in light and `#FDBA74` in dark, used by the business badge and the split bar),
- `--ui-error` (`#B42318` light, `#F97066` dark) and `--ui-warning` (`#DC6803` light, `#F59E0B` dark),
- the greys and borders (`--ui-bg*`, `--ui-text*`, `--ui-border*`) in the navy tones of the mocks, with a `.dark` block for "Cobalt midnight".

`--ui-radius` is `0.75rem`, so fields and buttons get 18 px and cards 24 px (Nuxt UI's `md` is 1.5 times and `lg` 2 times the base; the mocks use 16 and 28). The rules are unlayered, so they win over Nuxt UI's `@layer theme` defaults.

In dark mode `--ui-text-inverted` is white (white text on cobalt buttons). `.dark .text-primary` uses the light cobalt `#AFC0FF` and `.dark .text-error` the light red `#FCA5A5`, because the action colours are too dark for text on navy. `.dark .bg-error` keeps the deep red `#B42318` for a solid delete button. The text-dimmed colours and the light accented border are not in the mocks and were derived.

Shape, type and layout follow the mocks with classes and CSS only, no new elements:

- `pill` (labelled buttons, at least 44 px, round) and `pill-icon` (44 px round icon buttons) in `main.css`.
- `:ui="{ base: ... }"` on every `UInput` and `USelect` (48 px, 16 px corners, filled with `bg-muted`, a transparent ring in light mode so the focus ring still shows, a lighter ring in dark mode).
- `:ui="{ content: ... }"` on the dialogs (32 px corners, `bg-elevated`).
- The class `card` on every `UCard` (28 px corners, soft shadow instead of a ring, 28 px body padding, 20 px on phones).
- The form is a grid with 18 px between fields and the two buttons in one row (`class` on `UForm`).
- `main.css` also sets the font (`--font-sans: 'Manrope'`, which Nuxt UI's font module downloads at build time and serves from our own server), the heading scale (h1 30 px, h2 18 px, weight 800), the form label style (scoped to `labelWrapper`, because buttons use `data-slot="label"` too), 32 px above and 64 px below the page, 24 px between sections, 16 px below a section heading, and a container of 1160 px.

The dashboard is laid out as flex rows with `:has(#this-month-title)` on the layout's container, because the sections sit directly in it and no wrapper element may be added:

- The heading `h1` has its own row (the year picker moved into the summary section, #64).
- "This month" (weight 3) sits next to the "Largest this month" card (2), and the categories (3) next to the split (2).
- Everything wraps into one column on narrow screens.
- The rows stretch (`align-items: stretch`), so the sections of one row are equally tall (a section alone in its row keeps its height). Each section is a flex column and its `.card` has `flex: 1`, so the card fills it. The hero card (`card-hero`, also used by the month page's total card) is a flex column whose bottom row (`mt-auto`) sits at the bottom (#111; no test, jsdom has no layout).
- The `sr-only` texts of the months chart are kept inside its scroll area with `relative`, which also removed the sideways page scroll at 320 px.

Status of #50 (it is still open): steps 1 to 3 are done (colour scheme, type and shape, category badges). Step 4, components and layouts per mock, is in progress: done are the hero card, the sidebar, the phone tab bar with its add and language buttons, the logo and the favicon. Not done: the segmented type control and the business row of the form, the phone layouts of the costs list and the add cost sheet, and a check of the dark field fill against the mock *(to verify)*. The delete red and the input border of the mocks are not applied outside the variables above. Details in [Known limits](colour-scheme.md#known-limits).

## Category badge (#51)

A disc with a white Lucide icon per category, colours as tokens `--category-<id>` in `main.css` (from the mocks), lookups in `useCategory()`.

Dark-mode mobility (`#0284C7`) has 4.10:1 with white, below the 4.5:1 of the issue's acceptance criteria. The author keeps the mock's colour, because the icon is decoration (the name is always text) and only 3:1 applies.

Not verified: whether the production build or the cluster needs internet access for the icons (Lucide is fetched remotely, not installed). Check this in the Docker and Kubernetes steps. Details in [colour-scheme.md](colour-scheme.md#category-badge).

## Months chart colours (#69)

The bars of the months other than the current one use the token `--chart-soft` (`#b9c5f6` light, `#5b6ac0` dark, from the mocks). The light value has 1.70:1 against the white card, below the 3:1 of the issue. The author keeps it, because every amount is also text (the value above the bar, the link text) and the highlight is not colour alone (bold label and value). Dark has 3.59:1.

A colour with 3:1 (about `#7488E4`) would be only 2.05:1 against the cobalt of the current month. Figures are computed, not measured. Details in [colour-scheme.md](colour-scheme.md#months-chart-colours).

## Favicon and manifest (#58)

The Cobalt icon set and a static `public/manifest.webmanifest` (no module, no service worker, so not an installable app, see #97). The links and two `theme-color` metas (light and dark through `prefers-color-scheme` media queries, so they follow the system, not the app's `.dark` class) are in `app.head` in `nuxt.config.ts`. The manifest has one name for both languages and no `display` field. The C2PA metadata was removed from the icon files. Details in [colour-scheme.md](colour-scheme.md#favicon-app-icons-and-web-manifest).

## Bars and charts

Lists with bars (the months) and the stacked category bar (#66, decorative, widths from `percent`) are hand-built. So is the household versus business ring (a CSS `conic-gradient` with its values as text in the rows and in the label). The reasons: every value must be real text for all users, the month bars have to be real links, and they should render without JavaScript.

The short values above the month bars (#68) are formatted with `n()` plus the locale key `dashboard.months.thousand` (`"{value}k"`), not with `Intl.NumberFormat` compact notation. The issue asked for compact notation, but German short compact does not abbreviate thousands ("2100", "12.600") and the long form ("2,1 Tausend") is too wide for a 24 px column. The mock builds "2.1k" by hand too.

A chart library is only a candidate for trend charts. It would need to be evaluated for server rendering, keyboard and screen reader support first.

## Dashboard links (#18, #19)

The "This month" card links to today's month; the month bars link to the selected year. The card ignores the selected year, so its link does too. The chart scrolls sideways with columns of at least 44 px, so touch targets stay big enough on phones. Details: [Dashboard links to month pages](app-structure.md#dashboard-links-to-month-pages).

## Month pages

Year and month are in the URL (`/months/2026/03`), the month always with two digits. The page can be bookmarked, the back button works, and every month has exactly one address. Details: [app-structure.md](app-structure.md).

### Month summary from the route

`useMonthSummary()` takes no arguments. It reads the month from the route params (`monthParamsSchema`) and falls back to today's month from `useYear()` when the address has none, so the dashboard hero and the month page hero share one composable without passing a month around. Loading, failed and retry stay in `useCostLists()`: they describe the lists, not the month, and the dashboard needs them for the whole page. Details: [Composables](app-structure.md#composables).

### Kind icons (#75)

The icons for the two kinds of cost live in their own composable, `useKind()`, not in `useCategory()`: the kind is a different property of a cost than its category. There is no component for now, because it would only wrap one `UIcon`. The costs table's kind column (#85) reuses `useKind()` with a `UIcon` in its cell slot, also without a component: icon and kind word appear together only there (the month page pairs the icon with its group titles, not the kind word). A `KindLabel` component is worth reconsidering if the pair appears in more places. Details: [Content](app-structure.md#content-25).

### By category card on the month page (#77)

- **Only categories with a cost.** The mock shows only the categories that have a cost in the month, so `monthCategoryTotals` in the core leaves out the categories with 0 and the template stays simple. The dashboard's "Where your money goes" keeps every category, because it shows the year's shares.
- **A function of its own.** `totalsByCategory` and `categoryBreakdown` work on annual amounts, so they cannot give the totals of one month. The new function takes the month's list from `costsInMonth` and is named `monthCategoryTotals` so the two are not confused.
- **Shown on phones.** Below `lg` the card is shown below the lists, not hidden.
- **One list component.** The rows of the dashboard's category card and of this card are one component, `CategoryList`, with the amount formatted by the caller (whole euros and a percentage on the dashboard, cents and no percentage on the month page).
- **Split in its own issue.** The household and business split at the bottom of the mock's card was not part of #77. It was added in #78, see below.

Details: [By category card](app-structure.md#by-category-card-77).

### Household and business totals on the month page (#78)

- **Two fields, no new function.** `monthSummary` returns `businessTotal` (the sum of the business costs in the month's list) and `householdTotal` (the month's total minus `businessTotal`) next to `count` and `businessCount`. It is the same rule as in `annualSummary` (household is the total minus business), so the two add up to the month's total by construction.
- **One list component.** The rows of the dashboard's "Household and business" card and of the month page's split are one component, `SplitList`. The caller formats the amounts (whole euros on the dashboard, cents on the month page) and sets the layout classes. The dashboard's ring stays in the page, because the month page has none.
- **No percentage on the month page.** As in the mock, the month page shows only the two amounts.

Details: [By category card](app-structure.md#by-category-card-77) and [Components](app-structure.md#components).

### Month heading row on phones (#118)

- **A grid with a fixed middle column, not `justify-between`.** Below `sm` the row is a three-column grid (44 px, the rest, 44 px), and the title is fixed to column 2. With `justify-between` in a flex row the title would move sideways when an arrow is missing (the first or the last month with data). The grid keeps the title in the middle in every case.
- **The badge below the title on phones.** Title and badge are stacked and centred in the middle column, so the row never wraps. From `sm` the row is the old flex row.
- **Source order unchanged.** Only CSS places the parts, so the keyboard order and the screen reader order stay previous, title, next.

Details: [Navigation](app-structure.md#navigation-26).

## Costs page

### Costs table without category and business sorting (#84)

The category and the business flag moved into the name column, as in the BDesktopCosts mock, and the Category and Business columns were removed. With them went sorting by category and by business. The author chose to drop both sorts on purpose (option A):

- **Finding one category** will be the job of the category filter chips (#83).
- **Business costs** have no filter yet.
- **The mock** has no such sorting either.

Alternatives considered:

- A second sort inside the Name header (by name or by category). More complex, and not in the mock.
- Accepting the loss without a replacement planned.

The table sorts by Name, Kind and Amount. Details: [Costs page](app-structure.md#costs-page).

### Summary line with `<i18n-t>` (#80)

The line under the heading ("2 recurring costs and 1 purchase · €10,891 in 2026") has a bold amount inside a translated sentence.

- **`<i18n-t>` with slots, not separate keys or `v-html`.** The sentence is one key (`costs.summary.line`) with the slots `recurring`, `purchases`, `total` and `year`, so the translator controls the word order, and only the `total` slot is wrapped in a `b`. Splitting the sentence into pieces would fix the English order; `v-html` would put markup into the locale files.
- **Counts for all costs, total for one year.** The counts match the table, which shows every cost. The total needs a year, so the line names it, and the year is the dashboard's shown year from `useYearSummary()`.
- **"Posten" and "im Jahr" in German.** "Kosten" has no singular, so the recurring count reads "1 wiederkehrender Posten"; "im Jahr 2026" replaces the anglicism "in 2026".

Details: [Costs page](app-structure.md#costs-page).

### Row actions: edit first, both neutral (#84)

- **Edit before Delete,** as in the BDesktopCosts mock. It is also the keyboard order, so the harmless action comes first.
- **Delete is neutral, not red.** Both buttons are `color="neutral"` ghost icon buttons. The red belongs to the confirmation dialog (#96), where the deletion actually happens.
- **44 px targets.** Both keep the `pill-icon` class (44 px) instead of the mock's 40 px, and their accessible names "Edit <name>" and "Delete <name>".

Details: [Costs page](app-structure.md#costs-page).

### Delete confirmation (#96)

The confirmation follows the BStateDelete and BDarkStateDelete mocks: a red trash icon in a circle, the title, a message with the amount, Delete above Cancel.

- **Buttons side by side from `lg`, source order kept.** The mock shows the two buttons stacked. The author's choice: stacked and full width below `lg`, side by side from `lg`. Delete stays first in the source, on screen and in the keyboard order. `flex-row-reverse` (Cancel first on wide screens) was avoided, so the visual order and the keyboard order always match. The dialog still opens with the focus on Cancel, so Enter does not delete by accident.
- **Lowercase interval, no due month.** The message reads "Rent (€800.00, monthly) …". The interval is lowercased with `toLocaleLowerCase(locale)` because it sits in the middle of a sentence. Only the bare interval is used: lowercasing "Yearly, November" would also lowercase the month name, which is wrong in English. Purchases show their long date instead ("March 14").
- **`alertdialog` through the `content` prop.** `UModal` has no role prop. The role goes in through `:content`, which reka-ui merges over its own `role="dialog"`, so `alertdialog` wins at runtime. The object is a script const (`dialogContent`), because TypeScript's excess-property check rejects `role` in an inline literal for the content props type.

Details: [Costs page](app-structure.md#costs-page).

### One delete request (#7)

- **`loading-auto` instead of an own `deleting` ref.** Nuxt UI disables the Delete button while the `confirmDelete` promise is pending, which is all a double click needs. Less code, and the state cannot get stuck, because `onDelete` catches its own errors.
- **Cancel and Escape are not locked.** The author's choice: they close the dialog during the request, the request still completes and deletes the cost. No second request can start, so nothing is harmed.
- **The add/edit form needs no change.** Its Save button already shows a loading state through `UForm`'s `loadingAuto`; checked in the browser with network throttling.

Details: [Costs page](app-structure.md#costs-page).

## Add/edit form

A modal (`UModal`) with one `CostForm` for both kinds of cost, rendered once by the layout. A modal works better on mobile than a slide-over. Details: [Add and edit dialog](app-structure.md#add-and-edit-dialog).
