# Colour scheme

How the Cobalt colour scheme is built, how to change a colour and how to check it. Written for: developers. The decision and its status are in [decisions.md](decisions.md#colour-scheme-50-steps-1-to-3); this page explains the mechanics. Other conventions of `app/` are in [app-structure.md](app-structure.md).

## Where the scheme comes from

The active design direction is Cobalt, with a light mode and a dark mode ("Cobalt midnight"). The design source is the mocks in `mockups/cobalt`. That folder is git-ignored, so it is not in the repository; the author keeps it locally. The teal direction is parked.

This page covers the colour part of GitHub issue #50 (step 1: colours, error and warning colours, and the corner radius), set only in CSS. Type and shape (step 2: Manrope, card radius, pill buttons) and the category badges (step 3, see [Category badge](#category-badge)) are done too and are described in [decisions.md](decisions.md#colour-scheme-50-steps-1-to-3) and below. Step 4 (components and layouts per mock) is in progress, and #50 is still open.

## How it is built

Everything is in one file, `app/assets/css/main.css`, after the two imports (`tailwindcss` and `@nuxt/ui`). No template or component sets a colour value.

- Nuxt UI colours its components from CSS variables such as `--ui-primary` and `--ui-text`. The file overrides these variables.
- `:root` holds the light values. The `.dark` block holds the dark values. Nuxt UI puts the `dark` class on `<html>` in dark mode.
- The rules are unlayered. Nuxt UI declares its defaults in `@layer theme`, and unlayered CSS wins over layered CSS, so no `!important` is needed.
- Primary is the cobalt scale `--ui-color-primary-50` to `-950`. `--ui-primary` points at a step of it: 500 in light mode, 400 in dark mode (a brighter cobalt on navy).
- Secondary (`--ui-secondary`) is the business orange. It is used by the "Business" badge (`BusinessBadge`, see [Business badge](#business-badge)) and by the business row of the household-and-business card on the dashboard (icon in `text-secondary`). The ring itself uses `--ui-warning` for business, see [Household and business ring](#household-and-business-ring).
- Greys and borders (`--ui-bg*`, `--ui-text*`, `--ui-border*`) are tinted navy instead of neutral grey.
- Error (`--ui-error`) and warning (`--ui-warning`) follow the states of the mocks. Nuxt UI uses them for the `error` and `warning` colours, for example the delete button and failed-save messages.
- Corners: `--ui-radius` is `0.75rem`. Nuxt UI derives its radii from it: `md` (fields, buttons) is 1.5 times the base, so 18 px, and `lg` (cards) is 2 times, so 24 px. The mocks use 16 px and 28 px, so this is an approximation.
- Dark mode only: `.dark .text-primary` is set to the light cobalt `#AFC0FF` (`#DCE3FB` on hover, active and focus). The action cobalt `#3B5BEB` is too dark for text on navy, so links and the active menu item use this lighter colour. Buttons keep the action cobalt, and `--ui-text-inverted` is white in both modes, so button text is white.
- Dark mode only, for the same reason: `.dark .text-error` is the light red `#FCA5A5`, as in the dark mocks, which use `#F97066` for borders and `#FCA5A5` for error text. `.dark .bg-error` is set back to the deep red `#B42318`, so a solid delete button keeps its deep red with white text, as in the mocks.

## Main variables

| Variable | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--ui-primary` | `#2D4BD8` (primary 500) | `#3B5BEB` (primary 400) | Primary buttons, focus rings, active states |
| `--ui-secondary` | `#B54708` | `#FDBA74` | Business badge, household-versus-business bar |
| `--ui-error` | `#B42318` | `#F97066` | Delete button, the icon circle of the delete confirmation (`bg-error/10` with `text-error`), error messages |
| `--ui-warning` | `#DC6803` | `#F59E0B` | Warnings |
| `--chart-soft` | `#B9C5F6` | `#5B6AC0` | Bars of the months chart other than the current month (see [Months chart colours](#months-chart-colours)) |
| `--ui-radius` | `0.75rem` | `0.75rem` | Base for all corner radii (set in `:root` only) |
| `--ui-bg` | `#F7F7FB` | `#0B0C14` | Page background |
| `--ui-bg-muted` | `#F2F3F8` | `#15172A` | Muted areas |
| `--ui-bg-elevated` | `#FFFFFF` | `#15172A` | Cards, dialogs |
| `--ui-bg-accented` | `#EDF0FD` | `#1E2340` | Hover and selected backgrounds |
| `--ui-bg-inverted` | `#14162B` | `#ECEDF7` | Inverted surfaces |
| `--ui-text` | `#14162B` | `#ECEDF7` | Body text |
| `--ui-text-highlighted` | `#14162B` | `#FFFFFF` | Headings, emphasised text |
| `--ui-text-muted`, `--ui-text-toned` | `#4A4E69` | `#A3A7C2` | Secondary text |
| `--ui-text-dimmed` | `#6B6F8C` | `#8387A6` | Hints, placeholders |
| `--ui-text-inverted` | `#FFFFFF` | `#FFFFFF` | Text on primary buttons |
| `--ui-border`, `--ui-border-muted` | `#ECEDF3` | `#24273D` | Default borders |
| `--ui-border-accented` | `#C9CDE0` | `#666D9C` | Stronger borders |
| `--ui-border-inverted` | `#14162B` | `#ECEDF7` | Borders on inverted surfaces |
| `.dark .text-primary` | - | `#AFC0FF` | Links and active menu item in dark mode |
| `.dark .text-error` | - | `#FCA5A5` | Error text in dark mode |
| `.dark .bg-error` | - | `#B42318` | Solid delete button in dark mode |

The cobalt scale (light, set in `:root` only; the dark mode reuses it):

| Step | Value | Step | Value |
| --- | --- | --- | --- |
| 50 | `#EDF0FD` | 600 | `#2238B0` |
| 100 | `#DCE3FB` | 700 | `#1B2C8C` |
| 200 | `#B9C5F6` | 800 | `#162369` |
| 300 | `#8EA2F0` | 900 | `#111B4F` |
| 400 | `#3B5BEB` | 950 | `#0B1136` |
| 500 | `#2D4BD8` | | |

## Change a colour

1. Open `app/assets/css/main.css`.
2. Edit the value in `:root` for light mode and, if it differs, in `.dark` for dark mode. To change the primary colour as a whole, edit the `--ui-color-primary-*` steps and keep `--ui-primary` pointing at them.
3. Save. The dev server (`pnpm dev`) reloads the page.
4. Check both modes (next section).
5. If the change is a design decision, update the "Colour scheme" decision in [decisions.md](decisions.md) and the table above.

To colour a new element, use the Nuxt UI colour props (`color="primary"`, `color="secondary"`, `color="neutral"`) or the matching utility classes (`bg-primary`, `text-muted`) instead of hex values, so both modes follow.

## Business badge

Issue #52. `app/components/BusinessBadge.vue` is the one place that renders the "Business" badge. It takes no props and wraps `UBadge` with `variant="soft"`, `color="secondary"`, bold text and the icon `i-lucide-briefcase` at 14 px (`:ui` `leadingIcon: 'size-3.5'`). The soft variant has no border; the earlier `subtle` and `outline` variants had a ring.

- It is used in the "This month" card on the dashboard and in the rows of the month page. No other badge markup for business costs is left.
- The text is the shared key `business.label` ("Business" / "Geschäftlich"). The same key is the label of the business row in the split card (the costs table had it as a column header until #84 removed the Business column). `costs.columns.business`, `dashboard.split.business`, `dashboard.thisMonth.business` and `month.business` were removed. `form.business` ("Business cost") stays. `dashboard.summary.business` was removed later too, because the summary tile reads `business.label`.
- The icon is decoration (`aria-hidden`). The word stays as text, so the meaning does not depend on the icon or the colour.
- Test: `tests/nuxt/BusinessBadge.test.ts` (text, German after a language switch, one hidden icon, the icon adds no text).

### Contrast

The soft variant alone (text on `--ui-secondary` at 10 % opacity) depends on the surface behind it: 4.72:1 on a white card, but 4.40:1 on the page background and 4.27:1 on the muted month page rows, below the 4.5:1 that issue #52 requires. So the badge has an opaque fill, the class `business-badge` in `main.css`, which reads the token `--business-tint`: `#FEF0E3` in light mode (4.86:1 with `#B54708`) and `#3A2410` in dark mode (8.6:1 with `#FDBA74`). Both values are the ones of the mocks, and the contrast no longer depends on the surface.

Checked in the browser at a 320 px wide viewport (an iframe of the dev server), in English and German, light and dark: the computed fill and text colours are the values above, there is no ring, and the badge (87 px wide in English, 109 px in German, 24 px high) stays inside the viewport. In German the page itself scrolls sideways by about 5 px at 320 px; the badge is not the cause, the source is not found yet.

## Months chart colours

Issue #69. The bar of the current month in the shown year is `bg-primary` (cobalt). The other eleven use the token `--chart-soft` (`#B9C5F6` light, `#5B6AC0` dark, "Chart soft" of the mocks), set in `main.css` next to `--business-tint`.

Contrast against the card (`bg-elevated`), computed from the colours, not measured in the browser:

| Mode | `--chart-soft` | Current month (primary) |
| --- | --- | --- |
| Light | 1.70:1 | cobalt `#2D4BD8` |
| Dark | 3.59:1 | cobalt `#3B5BEB` |

Decision: #69 asks for at least 3:1 between bar and background. The light value does not meet it. The author keeps the colour of the mock, because every amount is also text (the short value above the bar and the full text of the link; the bar is `aria-hidden`) and the highlight does not rely on colour: the current month's label and value are bold. A colour with 3:1 in light mode would be about `#7488E4` (3.29:1), but only 2.05:1 against the cobalt of the current month, which would weaken the highlight. The same kind of decision was taken for dark-mode mobility, see [Contrast (decision)](#contrast-decision).

## Household and business ring

Issue #67. The ring on the dashboard is one `conic-gradient` (computed `splitRing` in `index.vue`). It uses three tokens:

| Part | Token | Contrast against the card surface (computed) |
| --- | --- | --- |
| Household | `--ui-primary` | 6.75:1 light, 3.27:1 dark |
| Business | `--ui-warning` (the mock's `#DC6803`, `#F59E0B` in dark) | 3.49:1 light, 8.23:1 dark |
| Gaps, and the hole in the middle | `--ui-bg-elevated` (the card surface) | - |
| Empty year | `--ui-bg-accented` | - |

- The ring uses `--ui-warning`, not `--ui-secondary`, because it is a graphic and needs only 3:1; the orange text token `--ui-secondary` (5.43:1 light, 10.48:1 dark) is kept for the icon of the business row. In dark mode the cobalt has little room above 3:1.
- The gaps are in the surface colour and centred on the two boundaries, half a gap (0.3% of the ring) on each side. The gap does not eat into one colour only, and a share of 1% keeps a thin but visible segment. The first and last 0.3% are also surface colour, so the boundary at the top is a gap too.
- Special cases: 100% household or 100% business draws one full ring in one colour without a gap; a year without costs (total 0) draws an empty ring in `--ui-bg-accented`.
- The figures are computed from the tokens, not measured in the browser. jsdom cannot draw the gradient, so the tests only check the style string.

## Flush card and divided tiles

Issue #64. The class `card-flush` is used together with `card` (`.card.card-flush > [data-slot="body"] { padding: 0 }` in `main.css`) for a card whose content brings its own padding. The dashboard's summary card uses it: a `dl` grid with `gap-px bg-default`, so the 1 px gaps show the grid background as dividers, and tiles with an opaque `bg-elevated` fill. The tile dots use the tokens `bg-inverted`, `bg-accented`, `bg-primary` and `bg-secondary`. Contrast of the muted tile text is not measured. Details: [app-structure.md](app-structure.md#summary-card).

## Hero card

Issue #60. The "This month" card on the dashboard is a solid cobalt card, `class="card card-hero"` in `app/pages/index.vue`. The month page's total card uses the same class.

- `.card-hero` is a flex column and its body (`[data-slot="body"]`) is a flex column that fills the card (`flex: 1`, `align-items: flex-start`), so the dashboard hero's bottom row can sit at the bottom of a card that a row has stretched (issue #111, see [Equal heights in a row](app-structure.md#equal-heights-in-a-row)). The month page's total card shares this; its two-column row stays at the top.
- Background: `var(--ui-color-primary-500)` (`#2D4BD8`). The `.dark` block does not change this variable, so the card looks the same in light and dark mode.
- `.card-hero` sets `position: relative`, `overflow: hidden` and `isolation: isolate`, so the ring is clipped by the card and sits behind the text (`z-index: -1`).
- Text: white. The heading and the subtotal labels (`dt`) use the light tint `#dce2fb`, the subtotal amounts (`dd`) white.
- The big number is the rule `.card-hero .hero-total`, not `.card-hero p`, so other text in the card keeps its size. The element needs the class: `index.vue` and `pages/months/[year]/[month].vue` both set `class="hero-total"` on the total. Size is `clamp(2.25rem, 12vw, 3.5rem)`, weight 800, tabular numerals.
- `.card-hero .hero-ring`: a decorative ring (15 rem, border 2.25 rem in white at 8% opacity) in the top right corner, `pointer-events: none`. Both heroes have it (the month page since #73).
- `.card-hero .hero-cents`: the cents of the month page's total (`useMoneyParts()`), at `0.43em` of the big number (about 24 px next to 56 px, as in the mocks) in the soft tint `#c9d2f8`.
- `.card-hero .hero-pill`: the comparison pill of both heroes. An inline flex row with a 4 px gap, fully rounded, 12 px bold text and small padding; from 40 rem (640 px, the `sm` breakpoint) a 6 px gap, more padding and 14 px text. Background white at 16% opacity in light mode, `#2840BC` (the darker cobalt of the dark mocks) in dark mode. It replaced the dashboard's `bg-white/15` pill.
- `.card-hero .hero-meta`: the month page's counts line ("5 costs · 2 business"), 14 px, `#dce2fb` in light mode and `#f2f4ff` in dark mode.
- Contrast, computed (not measured in a tool), on `#2D4BD8`: white 6.75:1, `#dce2fb` 5.25:1, `#c9d2f8` (cents) 4.52:1, `#f2f4ff` (counts, dark mode) 6.16:1. White text on the pill: 4.81:1 on the 16% white tint in light mode, 8.24:1 on `#2840BC` in dark mode. Not measured: the "View" and "Add cost" buttons on the cobalt and the white focus outline. Not checked in a browser: the month hero in light mode and at 320 px.

## Category badge

Issue #51. `app/components/CategoryBadge.vue` shows a round disc with a white icon for a category. Props: `category` and `size` (`CategorySize`: 28, 32, 36, 40, 44 or 56 px, from `CATEGORY_SIZES` in `app/composables/useCategory.ts`).

- The component is a `span.category-disc` with `aria-hidden="true"` and one `UIcon`. It renders no text. The category name (`category.<id>`) is always shown as text next to it by the parent, so the disc is decoration.
- `useCategory()` holds the lookups: `categoryIcon(category)`, `categoryClass(category)` and `categoryStyle(size)` (sets `--category-size`). The icon map and the class map are `Record<Category, string>`, so TypeScript fails when a category is added to `CATEGORIES` without an entry. The classes are written out in full (`bg-[var(--category-housing)]`), because Tailwind finds classes by scanning for complete strings.
- `.category-disc` in `main.css` draws the round disc of `var(--category-size)` and sets the icon to half that size.
- Used in the "Where your money goes" rows on the dashboard (36 px) and in the name cell of the costs table (40 px).

| Category | Icon (Lucide) | Light | Dark |
| --- | --- | --- | --- |
| `housing` | `i-lucide-house` | `#6941C6` | `#7F56D9` |
| `insurance` | `i-lucide-shield-check` | `#344054` | `#667085` |
| `appliances` | `i-lucide-washing-machine` | `#C11574` | `#D21F83` |
| `food` | `i-lucide-shopping-basket` | `#15803D` | `#15803D` |
| `mobility` | `i-lucide-car` | `#0369A1` | `#0284C7` |

The colours are the tokens `--category-<id>` in `main.css` (light in `:root`, dark in `.dark`), taken from the mocks. The dashboard's stacked bar above the category list (#66) uses the same tokens through `categoryClass()` for its segments. To change one, edit the token; to add a category, add it to `CATEGORIES`, then to both maps and to both token sets.

Tests: `tests/nuxt/useCategory.test.ts`, `tests/nuxt/CategoryBadge.test.ts`, and new cases in `costs-page.test.ts` and the dashboard tests (`dashboard-*.test.ts`). The component test relies on the rendered icon class `iconify i-lucide:<name>` (with a colon).

### Contrast (decision)

White on the disc, ratio per category:

| Mode | housing | insurance | appliances | food | mobility |
| --- | --- | --- | --- | --- | --- |
| Light | 6.62 | 10.46 | 5.79 | 5.02 | 5.93 |
| Dark | 4.96 | 4.97 | 4.92 | 5.02 | 4.10 |

The acceptance criteria of #51 ask for 4.5:1 between icon and disc in both modes, but the "Always" section of the issue asks only 3:1 for icons. Dark-mode mobility (`#0284C7`) is 4.10:1. The author decided to keep the colour of the mock: the icon is purely decorative, because the category name is always text, so the 3:1 for non-text content applies, and 4.10:1 meets it.

### Checked and not checked

- Checked in the browser (dev server): disc and icon sizes for all six sizes, and the five colours in light and dark mode.
- Not checked: the costs table at the 40 px row height, 320 px screens, German.
- Not verified: the icons come from Lucide through Nuxt Icon. Lucide is not installed as its own package, and the generated server bundle fetches the collection remotely. Whether the production build or the cluster needs internet access to show the icons is open; check it in roadmap steps 7 and 8 (Docker, Kubernetes) *(to verify)*.
- Open: the costs table still has its own Category and Business columns. Whether they go away is not decided.

## Logo mark

Issue #57. `app/components/LogoMark.vue` shows the Costcompass mark next to the name at the top of the sidebar: a disc, a ring and a compass needle. It takes no props.

- It is an inline SVG with `viewBox="0 0 64 64"` and no fixed width or height. The parent sets the size with a class; the sidebar uses `size-9` (36 px) and `shrink-0`.
- The SVG has `aria-hidden="true"` and `focusable="false"`. The name stays real text: the title slot of `USidebar` in `app/layouts/default.vue` holds one `NuxtLink` to `/` with the mark and `t('app.name')`. The link has no `aria-label`; its name is the text, "Costcompass", and the mark adds nothing.
- The disc and the centre dot use `fill="var(--ui-primary)"`, so the mark is `#2D4BD8` in light mode and `#3B5BEB` in dark mode without extra CSS. The ring and the needle are white.
- It is an inline component and not an image file, because an image cannot read the theme variable.
- Only the mark is used. The wordmark files of the brand folder (`logo.svg`, `logo-dark.svg`, text converted to outlines) are not, because the name stays text. The mark was taken from `mockups/cobalt/brand/` (git-ignored); the embedded C2PA content-credentials metadata of the source SVG was dropped.
- Test: `tests/nuxt/DefaultLayout.test.ts` (the mark is hidden and not focusable, its two fills use the primary variable, the title is one link to `/` showing mark and name, and it is named by the app name only).

Checked in the browser (dev server): the link goes to `/`, its `aria-label` is "Costcompass", the mark is 36 x 36 px, the fill is `rgb(45, 75, 216)` in light mode and `rgb(59, 91, 235)` in dark mode, and the ring and needle are visible at 36 px. The brand README says the mark with the ring is meant for 48 px and up, while the mock uses 36 px; it was looked at only at 1x.

Not checked: crispness at 2x, 320 px screens, German. Below `lg` the sidebar, and with it the mark, is not shown (see [Sidebar navigation](app-structure.md#sidebar-navigation)).

## Favicon, app icons and web manifest

Issue #58. The browser tab, the home screen and the browser bar use the Cobalt icon set. Everything is static: files in `public/`, links and colours in `nuxt.config.ts`.

| File in `public/` | Use |
| --- | --- |
| `favicon.ico` | Fallback tab icon, 16 and 32 px images (replaces the default Nuxt icon) |
| `favicon.svg` | Tab icon for browsers that support SVG. It has no compass ring, so it stays readable at 16 px, and a `prefers-color-scheme` rule inside the SVG gives it a dark-mode colour |
| `apple-touch-icon.png` | Apple home screen icon, 180 px |
| `icon-192.png`, `icon-512.png` | Manifest icons |
| `icon-maskable-512.png` | Manifest icon for adaptive (masked) shapes |
| `manifest.webmanifest` | The web manifest |

The manifest has `name` and `short_name` "Costcompass", `start_url` `/`, `theme_color` `#2D4BD8`, `background_color` `#F7F7FB` and the three icons. A manifest holds only one colour, so both are the light values. It has no `display` field on purpose.

`app.head` in `nuxt.config.ts` links `favicon.ico` (with `sizes` `48x48`), `favicon.svg`, `apple-touch-icon.png` and the manifest, and sets two `theme-color` metas: `#2D4BD8` for `(prefers-color-scheme: light)` and `#3B5BEB` for `(prefers-color-scheme: dark)`.

Decisions:

- The `theme-color` follows the system colour scheme through the media queries, not the app's own light and dark mode (the `.dark` class). Someone who toggles the app against the system setting gets the system colour in the browser bar.
- The manifest is static, with no module and no service worker. A manifest alone does not make an installable app; that is a separate decision (see #58 and #97).
- One name for both languages, because a static file cannot be translated.
- The head tags are in `nuxt.config.ts` and not in `useAppHead()`, which is for things that change at runtime, such as the language and the title.
- The six icon files were copied from `mockups/cobalt/brand` (git-ignored), so they now live only in `public/`. The embedded C2PA content-credentials data was removed: the metadata block of `favicon.svg` (8,192 to 419 bytes) and the 5,758-byte `caBX` chunk of the four PNGs. The other PNG chunks are unchanged byte for byte. `favicon.ico` had none. The images were not compared pixel by pixel with the originals, but the PNGs still decode at their sizes.

To replace an icon, put the new file in `public/` under the same name. Keep the sizes, and check a new file for embedded metadata.

Test: `tests/nuxt/manifest.test.ts` (the name equals `app.name` in English and German, the three icons are listed and exist, the colours, no `display` field, `start_url`, the files named in the head exist, and none of the six icon files contains C2PA markers).

Checked against the dev server: the head contains the four links and both `theme-color` metas, and the six icon files and the manifest return 200 with the right content types (the manifest as `application/manifest+json`).

Not checked: how the favicon looks in a browser tab (especially at 16 px), the Apple icon on a real device, install behaviour on Android, the maskable icon in a real adaptive shape.

## Check it in the browser

1. Run `pnpm dev` and open the app.
2. Light mode: set the system or browser theme to light, or remove the `dark` class from `<html>` in the browser's developer tools.
3. Dark mode: set the system theme to dark, or add the class `dark` to `<html>` in the developer tools. The Chromium developer tools can also emulate it (Rendering tab, "Emulate CSS media feature prefers-color-scheme").
4. In both modes look at the dashboard (cards, the "Business" badge, the household-and-business ring and its rows), `/costs` (table, buttons, the form dialog, the delete button and its confirmation) and a month page.
5. Check that text is readable on its background, that links in dark mode are the light cobalt, that error text is the light red and the solid delete button the deep red with white text in dark mode, and that no area stays light or dark in the wrong mode.

## Known limits

Done from the former list (steps 2 and 3 of #50 and later work): pill buttons of at least 44 px (`pill`, `pill-icon` in `main.css`), light fields filled with `bg-muted` without a visible ring (`:ui` on every `UInput` and `USelect`), the dialogs with `bg-elevated` and 32 px corners, the font Manrope (`--font-sans` in `main.css`, downloaded at build time by Nuxt UI's font module and served from our own server), the category badges, the logo and favicon, the hero card, and the phone navigation (tab bar, round add button, compact language button).

Not done yet (step 4 of #50). These need template changes, not only CSS:

- The segmented type control and the business row of the form: `CostForm.vue` still uses a `URadioGroup` for the kind and a `UCheckbox` for the business flag.
- The phone layouts of the costs list and the add cost sheet from the mocks: `costs.vue` has no responsive classes of its own, and the add form is a modal, not a sheet.
- Whether the dark field fill matches the dark mock in every detail. The fields use `dark:bg-accented dark:ring-accented`; the mocks are not in the repository, so this was not compared *(to verify)*.

Also open:

- The corner radii are 18 px and 24 px, not the 16 px and 28 px of the mocks (fields and buttons are set to 16 px with a class where it matters, cards to 28 px with `card`; the variable-based radii stay approximate).
- The dimmed-text colours (`--ui-text-dimmed`) and the light accented border (`--ui-border-accented`) are not in the mocks. They were derived from the surrounding colours and may be adjusted.
- No full colour-contrast check (WCAG) has been run on the final values. Single figures in this page are computed, not measured.
- The app has no theme switch. The mode follows the system setting.
