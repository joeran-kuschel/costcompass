# Frontend documentation

For end users and for developers working on `app/`. For the server, database and calculation logic see [the backend documentation](../backend/index.md).

| Page | Audience | What it covers |
| --- | --- | --- |
| [user-guide.md](user-guide.md) | End users | Track costs, read the dashboard, open a month from it, use the menu and the language list on a phone, change the language |
| [app-structure.md](app-structure.md) | Developers | Pages (dashboard sections and states, month page, costs page, error page), dashboard links to month pages, the sidebar and bottom tab bar, the central add and edit dialog and the cost form, components, composables, i18n, page titles and accessibility conventions of `app/` |
| [colour-scheme.md](colour-scheme.md) | Developers | How the Cobalt colour scheme is built in `main.css`, the main variables in light and dark, the hero card, how to change a colour and check it in both modes, the logo mark, the favicon, app icons and web manifest, known limits |
| [decisions.md](decisions.md) | Developers, contributors | Design and dashboard decisions with their reasons: money and year, colour scheme, category badge, months chart colours, favicon and manifest, hand-built charts |
| [testing.md](testing.md) | Developers | What the page, component, composable and app-level tests check and how each is set up |
| [design-system/](design-system/README.md) | Developers, designers | Snapshot of the design system: usage rules in the README and the colour, type, spacing and radius tokens in `tokens.json`. The CSS in `app/assets/css/main.css` stays the source of truth |
