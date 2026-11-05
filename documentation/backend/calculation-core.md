# Calculation core

Reference for the pure functions in `shared/utils/costs.ts` and `shared/utils/dates.ts`. Written for: developers who call or extend them.

The functions take lists and a year (and month) and return numbers or small objects. They never read "today", touch the database or use Vue state, so they run on client and server and are easy to test. Years of ISO dates are read in UTC, so results do not depend on the time zone. All functions are auto-imported; the types are in `shared/types/calculation.ts`.

Terms used below:

- **Recurring cost**: an amount repeated at an `interval` (`monthly`, `quarterly`, `yearly`).
- **Purchase**: a one-off cost with a date. It counts fully in its year and month.
- **`month`**: 1 to 12 (type `Month`). The one exception is the array returned by `monthlyTotals`, where index 0 is January.

## Annual totals

| Function | Returns | Behaviour |
| --- | --- | --- |
| `annualAmount(item)` | number | Amount times periods per year: monthly 12, quarterly 4, yearly 1. |
| `totalAnnualRecurring(items)` | number | Sum of `annualAmount`. Takes no year: recurring costs have no start or end date. |
| `totalAnnualPurchases(items, year)` | number | Sum of the purchases dated in `year`. |
| `totalAnnualCost(recurring, purchases, year)` | number | The two sums added. |

Example: rent `950` monthly gives `11400` a year; a laptop of `1200` bought in 2026 adds `1200` to 2026 only.

## Monthly views

| Function | Returns | Behaviour |
| --- | --- | --- |
| `occursInMonth(item, month)` | boolean | Monthly: always. Yearly: when `dueMonth === month`. Quarterly: when `dueMonth` and `month` differ by a multiple of 3 (`dueMonth: 2` gives Feb, May, Aug, Nov). |
| `purchasedIn(purchase, year, month)` | boolean | The purchase date is in that year and month. |
| `totalMonthlyCost(recurring, purchases, year, month)` | number | Sum of what occurs in that month. The real cost of the month, not an average. |
| `monthlyTotals(recurring, purchases, year)` | number[12] | `totalMonthlyCost` for each month; index 0 is January. |
| `costsInMonth(recurring, purchases, year, month)` | list | The items of that month, recurring first, then purchases. Generic: stored items keep their `id`. |

Edge case: a yearly or quarterly cost without `dueMonth` (untyped input, old rows) never occurs in a month, but still counts in the annual totals. The API prevents such rows; see [api.md](api.md).

`totalMonthlyCost` and `monthlyTotals` agree with `costsInMonth`: a month's total is the sum of its list. `costsInMonth` is generic, so stored items keep their `id` (rows need a key), and the UI can show recurring costs and purchases clearly apart.

`monthlyTotals` returns the true cost of each of the 12 months, not an average: purchases land in the month of their date, monthly recurring costs count in every month.

## Filter and category totals

| Function | Returns | Behaviour |
| --- | --- | --- |
| `filterByBusiness(items, business)` | list | Items whose `business` flag equals the argument. |
| `totalsByCategory(recurring, purchases, year)` | `Record<Category, number>` | Annual total per category. Every category is present, with `0` if empty. |

## Dashboard functions

| Function | Returns | Behaviour |
| --- | --- | --- |
| `annualSummary(recurring, purchases, year)` | `{ total, household, business, averagePerMonth }` | `business` is the total of business costs; `household` is `total - business`, so the two always add up. `averagePerMonth` is `total / 12`, not rounded. |
| `categoryBreakdown(recurring, purchases, year)` | `{ category, total, share, percent }[]` | One entry per category, largest total first. `share` is relative to the largest category (0 to 1); the dashboard no longer reads it, it stays in the core for now. `percent` is the category's share of the year's total as a whole percentage, and all percentages add up to exactly 100 (see below). Categories without costs are included with 0. Equal totals keep the order of `CATEGORIES`. With no costs, every share and percent is 0. |
| `splitPercentages(summary)` | `{ household, business }` | Whole percentages. `business` is rounded, `household` is `100 - business`, so they add up to 100. A total of 0 gives 0 and 0. |
| `monthBreakdown(recurring, purchases, year)` | `{ month, total, share }[12]` | January to December, not sorted. `share` is relative to the largest month; with no costs every share is 0. |
| `monthChange(recurring, purchases, year, month)` | `{ current, previous, percent }` | Totals of the month and the one before. January compares with December of the previous year, which matters for purchases. "Today" is not read in the core; the caller passes year and month. `percent` is the signed whole-number change (negative means less) and `null` when the previous month cost nothing. |
| `availableYears(purchases, currentYear)` | number[] | The current year plus every year with a purchase, newest first, no duplicates. |

### Rounding of `percent`

Rounding each category on its own can give 99 or 101. `categoryBreakdown` uses the largest-remainder method: every percentage is rounded down first, then the missing points go one by one to the categories with the largest remainders. Ties between equal remainders go to the category earlier in `CATEGORIES`. The result always adds up to 100, so the percentages on the dashboard do not contradict each other. With no costs there is nothing to share and every percent is 0.

## Month page functions

| Function | Returns | Behaviour |
| --- | --- | --- |
| `monthNeighbours({ year, month }, validYears)` | `{ previous, next }` | The adjacent months as `{ year, month }`. January goes back to December of the previous year, December on to January of the next. A neighbour whose year is not in `validYears` is `null`, so the month page can hide that link; the valid years are the years with data plus the current year (`availableYears`). It does not bridge gaps between valid years. |
| `groupMonthCosts(costs)` | `{ recurring, purchases, recurringTotal, purchasesTotal, total }` | Splits the output of `costsInMonth` by `kind`. A group without entries is an empty list with subtotal 0. `total` is added in the same order as `totalMonthlyCost`, so it equals the matching entry of `monthlyTotals`. Generic (`MonthGroups<R, P>`), so `id` survives. |
| `largestCosts(costs, n = 4)` | The first `n` of the costs | Sorts by amount, largest first. Ties: recurring before purchase, then by name (`localeCompare` with the fixed locale `en`, so the result does not depend on the runtime locale). Fewer than `n` costs gives all of them, none gives an empty list. Does not change its input. Generic, so `id` survives. Takes the output of `costsInMonth`. |
| `monthSummary(recurring, purchases, year, month)` | `{ costs, groups, change, largest, empty, count, businessCount }` (`MonthSummary<R, P>`) | Everything about one month in one call: `costs` from `costsInMonth`, `groups` from `groupMonthCosts` on that list, `change` from `monthChange`, `largest` from `largestCosts` (the four largest). `empty` is true when the month has no costs; `count` is the number of costs, `businessCount` the number of business costs among them (both kinds). Generic, so `id` survives. Does not change its input. The UI reads it through `useMonthSummary()`. |

## Dates

`monthDateRange({ year, month })` in `shared/utils/dates.ts` returns `{ first, last }` as `YYYY-MM-DD` strings, in UTC, leap years included. `monthDateRange({ year: 2028, month: 2 })` gives `{ first: '2028-02-01', last: '2028-02-29' }`. The cost form uses it to limit the date field to a month.

## Validation schemas

`shared/utils/validation.ts` also holds the Zod schemas for the API (see [api.md](api.md)) and `monthParamsSchema` for the month page address: `year` is four digits, `month` is `01` to `12`; both are converted to numbers.

## Known limits

- Recurring costs have no start or end date, so a past year shows today's recurring costs (issue #23).
- `RecurringCost.dueMonth` is still optional in the type; the planned union type would make it required for yearly and quarterly costs and absent for monthly ones.
- Amounts are not rounded in the core; the UI rounds for display.
