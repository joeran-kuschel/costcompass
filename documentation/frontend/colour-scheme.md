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
- The category badges.
- The phone layouts of the mocks.
- The logo and favicon (`mockups/cobalt/brand`).
- The font Manrope. CSS can set it, but Nuxt UI's font module would download it from Google at build time. Whether to use it, and how, is undecided.

Also open:

- The corner radii are 18 px and 24 px, not the 16 px and 28 px of the mocks.
- The dimmed-text colours (`--ui-text-dimmed`) and the light accented border (`--ui-border-accented`) are not in the mocks. They were derived from the surrounding colours and may be adjusted.
- No colour-contrast check (WCAG) has been run on the final values.
- The app has no theme switch. The mode follows the system setting.
