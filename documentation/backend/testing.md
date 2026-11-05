# Testing

How tests are organised and the conventions to follow. Written for: developers.

## Run the tests

```bash
pnpm test          # watch mode
pnpm vitest run    # single run
```

The setup is Vitest with `@nuxt/test-utils`, environment `nuxt` (`vitest.config.ts`), `happy-dom`, and `@vue/test-utils` (a dev dependency that `mountSuspended` needs). Tests are in `tests/nuxt/` (the folder the Nuxt TypeScript config includes) and end in `.test.ts`. At the time of writing: 28 files, 630 tests, all passing, about 10 to 15 seconds. No database is needed.

## Conventions

- One `describe` per function.
- Test data comes from small helper functions with defaults (`recurring()`, `purchase()`) and a `YEAR` constant, so each test states only what it cares about.
- Components and pages are mounted with `mountSuspended` from `@nuxt/test-utils/runtime`.
- In this project `$fetch` is an auto-import. Mock it with `mockNuxtImport('$fetch', ...)`; `vi.stubGlobal` has no effect.
- That mock also replaces what `useFetch` uses. Page tests therefore register fake API endpoints with `registerEndpoint` (they can be slow or fail).
- `useFetch` caches by URL, so page tests call `clearNuxtData()` before each test. Tests for `useState` call `clearNuxtState()`.
- Modal content is teleported to `document.body`; query it there. `YearSelect` items are chosen with a `pointerup` event, not a click.
- `UForm` validates asynchronously; wait with `vi.waitFor`.
- A page test does not render `app.vue`, so titles have no "– Costcompass" suffix.

## What is covered

| Area | Files |
| --- | --- |
| Calculation core, dates, Zod schemas | `costs.test.ts`, `dates.test.ts`, `validation.test.ts` |
| Server functions on a mocked `db` (`vi.mock`): the logic between the Drizzle calls, such as the PATCH merge, not the SQL | `server-costs.test.ts` |
| Pages | `dashboard-states.test.ts`, `dashboard-summary.test.ts`, `dashboard-months.test.ts`, `dashboard-month-cards.test.ts`, `costs-page.test.ts`, `costs-page-sorting.test.ts`, `month-page.test.ts`, `error-page.test.ts` |
| Components | `CostForm.test.ts`, `LanguageSwitcher.test.ts`, `YearSelect.test.ts` |
| Composables | `useMoney.test.ts`, `useMonth.test.ts`, `useYear.test.ts` |
| App level | `app-locale.test.ts` (built-in texts, `<html lang>`, `dir`, titles), `route-announcer.test.ts` |

### Core and server tests

- `costs.test.ts`: the calculation core, one `describe` per function (see [calculation-core.md](calculation-core.md)).
- `dates.test.ts`: `monthDateRange`.
- `validation.test.ts`: the Zod schemas.
- `server-costs.test.ts`: `db` is replaced with `vi.mock`, so the tests check the logic between the Drizzle calls, such as the PATCH merge, not the SQL.

The component, page, composable and app-level tests, and how each is set up, are described in [the frontend testing page](../frontend/testing.md).

## Not covered

- The API routes and the real SQL (ordering, `returning`). This would need a test PostgreSQL. They were checked by hand.
- A real unknown URL giving status 404 was checked by hand with `curl -H "Accept: text/html"`, because component tests do not go through Nuxt's error handling.

## Good to know

- `useMonth.test.ts` has a time zone check that only fails west of UTC. Run `TZ=America/Los_Angeles pnpm vitest run tests/nuxt/useMonth.test.ts` to see it. *(Command taken from `CLAUDE.md`; not run for this page.)*
- `costs-page-sorting.test.ts` switches the locale with `useNuxtApp().$i18n.setLocale` and resets it after each test.
