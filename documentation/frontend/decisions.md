# Frontend decisions

The design and dashboard decisions of the app, with their reasons. Written for: developers and contributors. They moved here from [`CLAUDE.md`](../../CLAUDE.md), which keeps only the architecture and data decisions (see [the backend decisions](../backend/decisions.md)). The mechanics of the colours are in [colour-scheme.md](colour-scheme.md), the pages in [app-structure.md](app-structure.md).

Where a decision is also described in one of those pages, the page has the detail and this page has the decision as it was recorded.

## Dashboard money and year

Amounts on the dashboard are shown in whole euros (`useMoney()`), while the costs table keeps cents. The two subtotals of the "This month" card (#61) also use cents (the author's decision, as in the mock), so they can differ from the whole-euro total next to them by rounding (819.99 + 300.50 = 1,120.49, total shown as €1,120). The calculation stays exact and only the display is rounded, so household plus business can differ from the total by 1 on screen.

Today's year and month are read once in `useYear()` (one `Date`, in UTC) and kept in `useState`, so the server and the browser agree about them around New Year and the two can never come from different moments (`currentYear`, `currentMonth`).

Month names and labels such as "October 2026" come from `useMonth()` (`Intl`, UTC dates), not from copies in the pages.

The selected year (`year`) is shared state too, so it survives navigation and a later costs page (#10) can read the same value. `YearSelect` (a `v-model` component with a translated, visible label to the left of the select) offers `availableYears(purchases, currentYear)`: the current year plus the years of all purchases, newest first.

Known limits:

- Recurring costs have no start or end date, so a past year shows today's recurring costs until price history exists (#23).
- A stored year that is no longer in the list (for example after deleting the last purchase of that year) falls back to the current year (#30). The dashboard computes `shownYear` (`years.includes(year) ? year : currentYear`) and uses it for the select, the sections, the month links and the headings, while the stored year stays unchanged. It returns by itself when purchases of that year exist again, and a list that is still loading does not reset it. Details: [Year fallback on the dashboard](app-structure.md#year-fallback-on-the-dashboard).

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

Not done yet, because they need new elements (later steps of #50): the category badges with icons, the segmented type control, the business row of the form, the cobalt hero card, the phone layouts, the logo and favicon (`mockups/cobalt/brand`) and the dark field fill details. The delete red and the input border of the mocks are not applied outside the variables above.

Note: this list is the status as recorded in `CLAUDE.md`. Some of these items were done later (the category badges, the hero card, the phone layouts, the logo and the favicon, see [colour-scheme.md](colour-scheme.md)). The "Known limits" in [colour-scheme.md](colour-scheme.md#known-limits) is older still and differs in places (for example on pill buttons and the font). The code was not re-checked for this move *(to verify)*.

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
