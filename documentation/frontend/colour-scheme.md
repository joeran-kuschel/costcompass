# Colour scheme

How the Cobalt colour scheme is built, how to change a colour and how to check it. Written for: developers. The decision and its status are in [CLAUDE.md](../../CLAUDE.md) ("Colour scheme (#50, step 1)"); this page explains the mechanics. Other conventions of `app/` are in [app-structure.md](app-structure.md).

## Where the scheme comes from

The active design direction is Cobalt, with a light mode and a dark mode ("Cobalt midnight"). The design source is the mocks in `mockups/cobalt`. That folder is git-ignored, so it is not in the repository; the author keeps it locally. The teal direction is parked.

This is step 1 of GitHub issue #50: colours only.

## How it is built

Everything is in one file, `app/assets/css/main.css`, after the two imports (`tailwindcss` and `@nuxt/ui`). No template or component sets a colour value.

- Nuxt UI colours its components from CSS variables such as `--ui-primary` and `--ui-text`. The file overrides these variables.
- `:root` holds the light values. The `.dark` block holds the dark values. Nuxt UI puts the `dark` class on `<html>` in dark mode.
- The rules are unlayered. Nuxt UI declares its defaults in `@layer theme`, and unlayered CSS wins over layered CSS, so no `!important` is needed.
- Primary is the cobalt scale `--ui-color-primary-50` to `-950`. `--ui-primary` points at a step of it: 500 in light mode, 400 in dark mode (a brighter cobalt on navy).
- Secondary (`--ui-secondary`) is the business orange. It is used by the "Business" badge (`UBadge color="secondary"`) and by the household-versus-business bar and its legend (`bg-secondary`) on the dashboard.
- Greys and borders (`--ui-bg*`, `--ui-text*`, `--ui-border*`) are tinted navy instead of neutral grey.
- Dark mode only: `.dark .text-primary` is set to the light cobalt `#AFC0FF` (`#DCE3FB` on hover, active and focus). The action cobalt `#3B5BEB` is too dark for text on navy, so links and the active menu item use this lighter colour. Buttons keep the action cobalt, and `--ui-text-inverted` is white in both modes, so button text is white.

## Main variables

| Variable | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--ui-primary` | `#2D4BD8` (primary 500) | `#3B5BEB` (primary 400) | Primary buttons, focus rings, active states |
| `--ui-secondary` | `#B54708` | `#FDBA74` | Business badge, household-versus-business bar |
| `--ui-bg` | `#F7F7FB` | `#0B0C14` | Page background |
| `--ui-bg-muted` | `#F0F1F8` | `#15172A` | Muted areas |
| `--ui-bg-elevated` | `#FFFFFF` | `#15172A` | Cards, dialogs |
| `--ui-bg-accented` | `#EDF0FD` | `#1E2340` | Hover and selected backgrounds |
| `--ui-bg-inverted` | `#14162B` | `#ECEDF7` | Inverted surfaces |
| `--ui-text` | `#14162B` | `#ECEDF7` | Body text |
| `--ui-text-highlighted` | `#14162B` | `#FFFFFF` | Headings, emphasised text |
| `--ui-text-muted`, `--ui-text-toned` | `#4A4E69` | `#A3A7C2` | Secondary text |
| `--ui-text-dimmed` | `#6B6F8C` | `#8387A6` | Hints, placeholders |
| `--ui-text-inverted` | `#FFFFFF` | `#FFFFFF` | Text on primary buttons |
| `--ui-border`, `--ui-border-muted` | `#E2E4F0` | `#1E2340` | Default borders |
| `--ui-border-accented` | `#C9CDE0` | `#666D9C` | Stronger borders |
| `--ui-border-inverted` | `#14162B` | `#ECEDF7` | Borders on inverted surfaces |
| `.dark .text-primary` | - | `#AFC0FF` | Links and active menu item in dark mode |

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

## Check it in the browser

1. Run `pnpm dev` and open the app.
2. Light mode: set the system or browser theme to light, or remove the `dark` class from `<html>` in the browser's developer tools.
3. Dark mode: set the system theme to dark, or add the class `dark` to `<html>` in the developer tools. The Chromium developer tools can also emulate it (Rendering tab, "Emulate CSS media feature prefers-color-scheme").
4. In both modes look at the dashboard (cards, the "Business" badge, the household-versus-business bar and legend), `/costs` (table, buttons, the form dialog) and a month page.
5. Check that text is readable on its background, that links in dark mode are the light cobalt, and that no area stays light or dark in the wrong mode.

## Known limits

Not done yet (later steps of #50):

- The font Manrope, 24 px card corners, pill-shaped buttons, the category badges and the layouts of the mocks.
- The delete red and the input border of the mocks are not applied; the app still uses Nuxt UI's `error` colour and default input borders.
- The dimmed-text colours (`--ui-text-dimmed`) and the light-mode borders are not in the mocks. They were derived from the surrounding colours and may be adjusted.
- No colour-contrast check (WCAG) has been run on the final values.
- The app has no theme switch. The mode follows the system setting.
