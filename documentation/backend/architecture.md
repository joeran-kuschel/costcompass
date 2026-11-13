# Architecture

What the layers are, where code lives and why. Written for: developers and contributors. Decisions with their reasons are in [decisions.md](decisions.md).

## Layers

| Layer | Folder | Job |
| --- | --- | --- |
| Calculation core | `shared/` | Pure TypeScript functions and types. No database, no Vue state. Runs on client and server. |
| Frontend | `app/` | Collects input, shows results, talks to the API. |
| API | `server/api/` | Nitro routes. Validate input, call a function in `server/utils/`. |
| Data access | `server/utils/`, `server/db/` | The only code that touches PostgreSQL (through Drizzle). |

Data flows one way: the browser calls `/api/...`, the route validates with a Zod schema from `shared/utils/validation.ts`, `server/utils/costs.ts` runs the query, and the page computes totals by passing the fetched lists to the core in `shared/`. The server does not compute totals; there is no API route for them.

## Folder structure

```
app/            pages, components, composables, layouts, error.vue, app.vue
server/api/     recurring-costs/ and purchases/ (index.get/post, [id].patch/delete), health.get.ts, ready.get.ts
server/db/      schema.ts and migrations/
server/utils/   db.ts (client), costs.ts (queries and row mappers)
shared/types/   calculation.ts (types and the CATEGORIES, MONTHS, INTERVALS lists)
shared/utils/   costs.ts, dates.ts, validation.ts
i18n/locales/   en.json, de.json
tests/nuxt/     Vitest tests
```

## Import rules

- Inside `app/` use `~/...`. For files outside `app/` (such as `shared/`) use `~~/...`.
- Only the top level of `shared/types/` and `shared/utils/` is auto-imported, not subfolders.
- Files in `shared/utils/` import their types explicitly (`import type { ... } from '~~/shared/types/calculation'`), because the editor's generated types can lag behind.
- After you add an auto-imported file, restart the TypeScript server or run `pnpm dlx nuxt prepare`.

## Data model in the code

- `Cost = RecurringCost | Purchase`. Both extend `CostItem` (`name`, `amount`, `category`, `business`) and carry a `kind` (`'recurring'` or `'purchase'`).
- `RecurringCost` has an `interval` (`monthly`, `quarterly`, `yearly`) and an optional `dueMonth` (1 to 12). `Purchase` has a `date` (`YYYY-MM-DD`).
- The core types have no `id`. The API adds it, and the UI types fetched rows as `Stored<T>` (`T & { id: number }`).
- Categories are the fixed list `housing`, `insurance`, `appliances`, `food`, `mobility`. Display names come from the locale files.
- Money is a plain euro number, no integer cents. The database column is `numeric(10, 2)`.

The types in `shared/types/calculation.ts`, the schemas in `shared/utils/validation.ts` and the functions in `server/utils/costs.ts` have TSDoc comments: what each schema enforces, why `updateRecurringCost` validates the merged row, and which return values the routes turn into a 404. Keep them in step with the code.

## Configuration

| Setting | Where | Notes |
| --- | --- | --- |
| `NUXT_DATABASE_URL` | environment or `.env` | Overrides `runtimeConfig.databaseUrl` (default empty). The same image can run locally and in a cluster. |

There are no other settings. Nuxt reads `.env` in development; in production set the variable in the environment.

## Internationalisation

`@nuxtjs/i18n` with `en` (default) and `de`, strategy `no_prefix`, so the URL does not change with the language. The browser language is detected on the first visit (fallback `en`), a manual choice is stored in the `i18n_redirected` cookie. All UI text lives in `i18n/locales/*.json`. The module does not set the document language; `useAppHead()` sets `<html lang>` and `dir="ltr"`. Details for the UI: [frontend app structure](../frontend/app-structure.md).

## Planned

Kubernetes manifests, the migration Job (the migration image exists, see [docker.md](docker.md#migrations)), the rate calculator. None of these exist yet.
