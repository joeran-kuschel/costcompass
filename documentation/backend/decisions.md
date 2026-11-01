# Decisions

A short log of what was decided and why. Written for: developers and contributors. The full working agreement is [`CLAUDE.md`](../../CLAUDE.md); this page summarizes it.

## Decided

| Topic | Decision | Why |
| --- | --- | --- |
| Cost model | `CostItem` base; `RecurringCost` adds `interval`, `Purchase` adds `date`; both carry a `kind` | One list can hold both; the UI tells them apart without a separate entry type |
| Categories | Fixed `CATEGORIES` array, English ids, names from locale files | One list for type, validation and database enum. User-defined categories would need a table. |
| Business | A boolean flag on an item, not a category | A cost can be both "insurance" and business |
| Money | Plain euro numbers, no integer cents | Simplicity; the database stores `numeric(10, 2)` |
| Dates | Years passed as parameters; ISO dates read in UTC | Results do not depend on time zone or the clock |
| Purchases | Count fully in the year of purchase | How a household thinks; depreciation is parked |
| Recurring due month | Yearly and quarterly costs carry `dueMonth` (1 to 12); quarterly repeats every 3 months | Months, not full dates, are enough |
| Database access | Drizzle with `drizzle-kit` migrations | TypeScript schema, no code generation |
| API | REST per resource; `GET`/`POST` on the list, `PATCH`/`DELETE` on `[id]`; thin routes, Zod validation | Logic stays testable in `server/utils` |
| Status codes | 400 invalid, 404 unknown id, 204 for delete, 200 for `PATCH` | See [api.md](api.md) |
| PATCH on recurring costs | Merge patch into the stored row, validate the result, write `dueMonth: null` for monthly | No stale month stays behind |
| Row ids | `Stored<T> = T & { id: number }` in the UI, core types without `id` | Core and its tests stay id-free |
| i18n | `@nuxtjs/i18n`, `en` default and `de`, strategy `no_prefix`, cookie for a manual choice | URL does not change with the language |
| Dashboard money | Whole euros on the dashboard, cents in tables and on the month page | Display is rounded, the calculation is exact; household plus business can differ from the total by 1 on screen |
| Today | Read once in `useYear()` (UTC) and stored with `useState` | Server and browser agree around New Year |
| Charts | Hand-built bars with real text, no chart library for now | Every value must be text, month bars must be links, works without JavaScript |
| Month pages | Year and month are in the URL (`/months/2026/03`), month always two digits | Bookmarkable, back button works, one address per month |
| Add/edit form | A modal (`UModal`) with one `CostForm` for both kinds | Better on mobile than a slide-over |

## Open

- Depreciation: optional lifespan for purchases (parked).
- Start and end dates for recurring costs: direction is a price history per cost plus an optional end month (issue #23).
- Time handling: months are 1 to 12 in the API, index 0 is January in `monthlyTotals`.
- Currency: euro only, or configurable.
- State handling: plain composables or Pinia.
- Postgres in Kubernetes: own StatefulSet, Helm chart or an operator.
- Manifest management: plain YAML, Kustomize or Helm.
- Costs table and year: should the table follow the selected year?

## Planned

Rate calculator (required annual revenue and minimum hourly rate), the real income tax tariff (§32a EStG), Docker and Kubernetes setup. These are not built.
