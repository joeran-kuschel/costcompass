# Colour scheme

How the Cobalt colour scheme is built, how to change a colour and how to check it. Written for: developers. The decision and its status are in [CLAUDE.md](../../CLAUDE.md) ("Colour scheme (#50, steps 1 and 1b)"); this page explains the mechanics. Other conventions of `app/` are in [app-structure.md](app-structure.md).

## Where the scheme comes from

The active design direction is Cobalt, with a light mode and a dark mode ("Cobalt midnight"). The design source is the mocks in `mockups/cobalt`. That folder is git-ignored, so it is not in the repository; the author keeps it locally. The teal direction is parked.

This covers steps 1 and 1b of GitHub issue #50: colours, error and warning colours, and the corner radius. All of it is set in CSS; no template changed.

## How it is built

Everything is in one file, `app/assets/css/main.css`, after the two imports (`tailwindcss` and `@nuxt/ui`). No template or component sets a colour value.

- Nuxt UI colours its components from CSS variables such as `--ui-primary` and `--ui-text`. The file overrides these variables.
- `:root` holds the light values. The `.dark` block holds the dark values. Nuxt UI puts the `dark` class on `<html>` in dark mode.
- The rules are unlayered. Nuxt UI declares its defaults in `@layer theme`, and unlayered CSS wins over layered CSS, so no `!important` is needed.
- Primary is the cobalt scale `--ui-color-primary-50` to `-950`. `--ui-primary` points at a step of it: 500 in light mode, 400 in dark mode (a brighter cobalt on navy).
- Secondary (`--ui-secondary`) is the business orange. It is used by the "Business" badge (`BusinessBadge`, see [Business badge](#business-badge)) and by the household-versus-business bar and its legend (`bg-secondary`) on the dashboard.
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
| `--ui-error` | `#B42318` | `#F97066` | Delete button, error messages |
| `--ui-warning` | `#DC6803` | `#F59E0B` | Warnings |
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
5. If the change is a design decision, update the "Colour scheme" decision in `CLAUDE.md` and the table above.

To colour a new element, use the Nuxt UI colour props (`color="primary"`, `color="secondary"`, `color="neutral"`) or the matching utility classes (`bg-primary`, `text-muted`) instead of hex values, so both modes follow.

## Business badge

Issue #52. `app/components/BusinessBadge.vue` is the one place that renders the "Business" badge. It takes no props and wraps `UBadge` with `variant="soft"`, `color="secondary"`, bold text and the icon `i-lucide-briefcase` at 14 px (`:ui` `leadingIcon: 'size-3.5'`). The soft variant has no border; the earlier `subtle` and `outline` variants had a ring.

- It is used in the "This month" card on the dashboard and in the rows of the month page. No other badge markup for business costs is left.
- The text is the shared key `business.label` ("Business" / "Geschäftlich"). The same key is now the column header of the costs table and the label in the split legend. `costs.columns.business`, `dashboard.split.business`, `dashboard.thisMonth.business` and `month.business` were removed. `form.business` ("Business cost") and `dashboard.summary.business` (read as `dashboard.summary.${key}`) stay.
- The icon is decoration (`aria-hidden`). The word stays as text, so the meaning does not depend on the icon or the colour.
- Test: `tests/nuxt/BusinessBadge.test.ts` (text, German after a language switch, one hidden icon, the icon adds no text).

### Contrast

The soft variant alone (text on `--ui-secondary` at 10 % opacity) depends on the surface behind it: 4.72:1 on a white card, but 4.40:1 on the page background and 4.27:1 on the muted month page rows, below the 4.5:1 that issue #52 requires. So the badge has an opaque fill, the class `business-badge` in `main.css`, which reads the token `--business-tint`: `#FEF0E3` in light mode (4.86:1 with `#B54708`) and `#3A2410` in dark mode (8.6:1 with `#FDBA74`). Both values are the ones of the mocks, and the contrast no longer depends on the surface.

Checked in the browser at a 320 px wide viewport (an iframe of the dev server), in English and German, light and dark: the computed fill and text colours are the values above, there is no ring, and the badge (87 px wide in English, 109 px in German, 24 px high) stays inside the viewport. In German the page itself scrolls sideways by about 5 px at 320 px; the badge is not the cause, the source is not found yet.

## Category badge

Issue #51. `app/components/CategoryBadge.vue` shows a round disc with a white icon for a category. Props: `category` and `size` (`CategorySize`: 28, 32, 36, 40, 44 or 56 px, from `CATEGORY_SIZES` in `app/composables/useCategory.ts`).

- The component is a `span.category-disc` with `aria-hidden="true"` and one `UIcon`. It renders no text. The category name (`category.<id>`) is always shown as text next to it by the parent, so the disc is decoration.
- `useCategory()` holds the lookups: `categoryIcon(category)`, `categoryClass(category)` and `categoryStyle(size)` (sets `--category-size`). The icon map and the class map are `Record<Category, string>`, so TypeScript fails when a category is added to `CATEGORIES` without an entry. The classes are written out in full (`bg-[var(--category-housing)]`), because Tailwind finds classes by scanning for complete strings.
- `.category-disc` in `main.css` draws the round disc of `var(--category-size)` and sets the icon to half that size.
- Used in the "Costs by category" rows on the dashboard (36 px) and in the name cell of the costs table (40 px).

| Category | Icon (Lucide) | Light | Dark |
| --- | --- | --- | --- |
| `housing` | `i-lucide-house` | `#6941C6` | `#7F56D9` |
| `insurance` | `i-lucide-shield-check` | `#344054` | `#667085` |
| `appliances` | `i-lucide-washing-machine` | `#C11574` | `#D21F83` |
| `food` | `i-lucide-shopping-basket` | `#15803D` | `#15803D` |
| `mobility` | `i-lucide-car` | `#0369A1` | `#0284C7` |

The colours are the tokens `--category-<id>` in `main.css` (light in `:root`, dark in `.dark`), taken from the mocks. To change one, edit the token; to add a category, add it to `CATEGORIES`, then to both maps and to both token sets.

Tests: `tests/nuxt/useCategory.test.ts`, `tests/nuxt/CategoryBadge.test.ts`, and new cases in `costs-page.test.ts` and `dashboard-page.test.ts`. The component test relies on the rendered icon class `iconify i-lucide:<name>` (with a colon).

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
4. In both modes look at the dashboard (cards, the "Business" badge, the household-versus-business bar and legend), `/costs` (table, buttons, the form dialog, the delete button and its confirmation) and a month page.
5. Check that text is readable on its background, that links in dark mode are the light cobalt, that error text is the light red and the solid delete button the deep red with white text in dark mode, and that no area stays light or dark in the wrong mode.

## Known limits

Not done yet (later steps of #50). These need template changes, not only CSS:

- Pill-shaped buttons with a height of 44 px.
- Light fields without a border, and the dark field fill of the mocks.
- A white dialog on the grey page.
- The segmented type control and the business row of the form (the category badges are done, see [Category badge](#category-badge)).
- The phone layouts of the mocks.
- The logo and the favicon are done, see [Logo mark](#logo-mark) and [Favicon, app icons and web manifest](#favicon-app-icons-and-web-manifest).
- The font Manrope. CSS can set it, but Nuxt UI's font module would download it from Google at build time. Whether to use it, and how, is undecided.

Also open:

- The corner radii are 18 px and 24 px, not the 16 px and 28 px of the mocks.
- The dimmed-text colours (`--ui-text-dimmed`) and the light accented border (`--ui-border-accented`) are not in the mocks. They were derived from the surrounding colours and may be adjusted.
- No colour-contrast check (WCAG) has been run on the final values.
- The app has no theme switch. The mode follows the system setting.
