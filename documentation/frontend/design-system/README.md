Costcompass is a household cost tracker built on Nuxt UI 4 and Tailwind 4, themed in CSS only: a cobalt primary, an orange for business costs and navy-tinted greys, in a light theme and a dark one called Cobalt midnight. Build new screens from Nuxt UI components and these tokens; change colors by setting Nuxt UI's variables, not by restyling components.

## Content fundamentals

- Sentence case everywhere, no trailing periods on labels, buttons or titles. Buttons are verb plus object: "Add cost", "Delete". Row actions name the row: "Edit {name}", "Delete {name}".
- Neutral, direct copy. Errors say what failed and what to do: "Could not save the cost. Please try again."
- Direction and state are in words, never only color or an icon: "50% more than September", "Business".
- No emoji. All text lives in the locale files (`en`, `de`); category and interval names are keyed by id.
- Money is whole euros on the dashboard and cents in tables and month pages.

## Visual foundations

- **Color:** `bg` is the page and `bg-elevated` the card on it; separate them with `shadow-card`, not borders. Text is `text`, headings `text-highlighted`, helper text `text-muted`. `primary` fills the one main action and the focus ring; for primary-colored text and links use `primary-text`, which is lighter in the dark theme. `secondary` means business, always with the word. `error` for failures and destructive actions, `error-solid` with `text-inverted` for a solid delete button, `error-text` for error copy.
- **Contrast:** every text pair meets 4.5:1 in both themes. Known gap: `border-accented` is 1.5:1 in the light theme, below 3:1 for field outlines. Primary as a thin mark on `bg` is only 3.6:1 in dark.
- **Type:** Manrope, loaded by Nuxt UI's font module (no local font file). Headings are weight 800 with tight tracking (`h1` 30px, `h2` 18px), labels 13px weight 800 in `text-muted`, buttons weight 700, body 14px.
- **Spacing:** 4px scale. Content sits in a `container` (1160px) with `page-top` above and `page-bottom` below; sections are `space-6` apart; card padding is `card-padding` (20px on phones).
- **Radius:** `--ui-radius` is `radius-base`, so fields are `radius-md`, modals `radius-lg`, cards `radius-card`. Buttons are pills (`radius-pill`, `tap-target` high); icon buttons are 44px circles.
- **Charts:** bars are hand-built, real text for every value, the 12 month columns are links; household uses `primary`, business `secondary`.
- **Layout:** a sidebar from 1024 px up (logo, add button, navigation, language select) and a bottom tab bar with a round add button and a compact language button below that; the dashboard is flex rows (this month beside the largest costs, categories beside the household and business split) that wrap on narrow screens and are as tall as their tallest section; add and edit happen in a modal.

## Iconography

Lucide via Nuxt UI's `i-lucide-*` names, inheriting `currentColor`: `i-lucide-trash-2` (delete), `i-lucide-pencil` (edit), trending and arrow icons as decoration (`aria-hidden`). Icon-only buttons always have an `aria-label` naming the target. No logo file exists yet; the name is set in plain type.

## Not yet built

Light fields without a border, a white dialog on the grey page, dark field fill, category badges, phone layouts and the logo and favicon are still to do.
