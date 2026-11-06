/**
 * The cost core: pure functions from recurring costs and purchases to totals per year, month and category.
 *
 * @remarks
 * All amounts are plain euro numbers, never rounded here; rounding is left to the display.
 * Years and months are passed in, never read from "today". Months are 1-12. Years of purchase
 * dates are read in UTC. A recurring cost has no start or end, so it counts the same in every year.
 *
 * @see documentation/backend/calculation-core.md for the full behaviour and edge cases.
 */
import { CATEGORIES, MONTHS } from '~~/shared/types/calculation'
import type { Cost, CostItem, Purchase, RecurringCost, Category, Interval, Month, AnnualSummary, CategoryTotal, SplitPercentages, MonthTotal, MonthChange, MonthRef, MonthNeighbours, MonthGroups, MonthSummary, MonthCategoryTotal } from '~~/shared/types/calculation'

const PERIODS_PER_YEAR: Record<Interval, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}
// Annual functions

/**
 * The amount a recurring cost adds up to over one year.
 *
 * @param item - The amount is per interval (per month, quarter or year).
 * @returns Euros per year; counts the full year even when a quarterly or yearly cost has no `dueMonth`.
 *
 * @example
 * ```ts
 * annualAmount({ ...rent, amount: 800, interval: 'monthly' }) // 9600
 * ```
 */
export function annualAmount(item: RecurringCost): number {
    return item.amount * PERIODS_PER_YEAR[item.interval]
}
/**
 * The sum of {@link annualAmount} over all recurring costs.
 *
 * @returns Euros per year; 0 for an empty list.
 */
export function totalAnnualRecurring(items: RecurringCost[]): number {
    let total = 0
    items.forEach((item) => total += annualAmount(item))
    return total;
}
/**
 * The sum of the purchases bought in one year.
 *
 * @remarks
 * A purchase counts fully in the year of its date; spreading it over a lifespan is parked.
 *
 * @param year - Compared with the UTC year of each `date`.
 * @returns Euros; 0 when nothing was bought that year.
 */
export function totalAnnualPurchases(items: Purchase[], year: number): number {
    const inYear = items.filter((item) => new Date(item.date).getUTCFullYear() === year)
    return inYear.reduce((sum, item) => sum + item.amount, 0)
}
/**
 * All costs of one year: every recurring cost for the full year plus the purchases of that year.
 *
 * @returns Euros per year.
 */
export function totalAnnualCost(recurring: RecurringCost[], purchases: Purchase[], year: number): number {
    return totalAnnualRecurring(recurring) + totalAnnualPurchases(purchases, year)
}
// Monthly functions

/**
 * Whether a recurring cost is due in a month.
 *
 * @remarks
 * A quarterly cost is due in its `dueMonth` and every third month from there (for March: March,
 * June, September, December). A quarterly or yearly cost without `dueMonth` is due in no month,
 * although it still counts in the annual totals.
 *
 * @param month - 1-12.
 */
export function occursInMonth(item: RecurringCost, month: Month): boolean {
    switch (item.interval) {
        case 'quarterly':
            return item.dueMonth !== undefined && (item.dueMonth - month) % 3 === 0
        case 'yearly':
            return item.dueMonth === month
        case 'monthly':
            return true;
    }
}
/**
 * Whether a purchase was bought in a month of a year, read in UTC.
 *
 * @param month - 1-12.
 */
export function purchasedIn(purchase: Purchase, year: number, month: Month): boolean {
    return new Date(purchase.date).getUTCFullYear() === year && new Date(purchase.date).getUTCMonth() + 1 === month
}
/**
 * The true cost of one month: the full amount of every recurring cost due that month plus the purchases bought in it.
 *
 * @remarks
 * Not an average: a yearly cost adds its whole amount to its due month and nothing to the others.
 *
 * @param month - 1-12.
 * @returns Euros.
 */
export function totalMonthlyCost(recurring: RecurringCost[], purchases: Purchase[], year: number, month: Month): number {
    let total = 0
    total += recurring.filter(item => occursInMonth(item, month)).reduce((sum: number, item) => sum + item.amount, 0)
    total += purchases.filter(item => purchasedIn(item, year, month)).reduce((sum: number, item) => sum + item.amount, 0)
    return total;
}
/**
 * {@link totalMonthlyCost} for each month of a year.
 *
 * @returns 12 totals in euros; index 0 is January.
 */
export function monthlyTotals(recurring: RecurringCost[], purchases: Purchase[], year: number): number[] {
    return MONTHS.map((month) => totalMonthlyCost(recurring, purchases, year, month))
}
/**
 * The costs that fall in one month, recurring costs first, then purchases, each in input order.
 *
 * @remarks
 * Generic, so stored items keep their `id` and other extra fields. The month's total is the sum of this list.
 *
 * @typeParam R - The recurring cost type, for example `Stored<RecurringCost>`.
 * @typeParam P - The purchase type, for example `Stored<Purchase>`.
 * @param month - 1-12.
 */
export function costsInMonth<R extends RecurringCost, P extends Purchase>(recurring: R[], purchases: P[], year: number, month: Month): (R | P)[] {
    const fromRecurring = recurring.filter(item => occursInMonth(item, month))
    const fromPurchases = purchases.filter(item => purchasedIn(item, year, month))
    return [...fromRecurring, ...fromPurchases]
}
// Dashboard functions

/**
 * The items whose business flag equals `business`.
 *
 * @param business - `true` for business costs, `false` for household costs.
 */
export function filterByBusiness<T extends CostItem>(items: T[], business: boolean): T[] {
    return items.filter((item) => item.business === business)
}
/**
 * The annual total of every category, with 0 for a category without costs.
 *
 * @remarks
 * Recurring costs count with their {@link annualAmount}, purchases only in the year they were bought.
 * For the costs of a single month use {@link monthCategoryTotals} instead.
 *
 * @returns Euros per year, one entry for every category in `CATEGORIES`.
 */
export function totalsByCategory(recurring: RecurringCost[], purchases: Purchase[], year: number): Record<Category, number> {
    const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
    recurring.forEach((item) => {
        totals[item.category] += annualAmount(item)
    })
    purchases.forEach((item) => {
        if (new Date(item.date).getUTCFullYear() === year) totals[item.category] += item.amount
    })
    return totals
}
/**
 * The totals of one year, split into household and business.
 *
 * @remarks
 * `household` is computed as `total - business`, so household plus business equals the total by construction.
 *
 * @returns Euros; `averagePerMonth` is the total divided by 12, not the mean of the real months.
 */
export function annualSummary(recurring: RecurringCost[], purchases: Purchase[], year: number): AnnualSummary {
    const total = totalAnnualCost(recurring, purchases, year)
    const business = totalAnnualCost(filterByBusiness(recurring, true), filterByBusiness(purchases, true), year)
    return { total, household: total - business, business, averagePerMonth: total / 12 }
}
/**
 * One entry per category for the year, largest total first.
 *
 * @remarks
 * `percent` uses largest-remainder rounding: every category gets the whole part of its exact share,
 * and the points left to 100 go to the largest remainders, so the percentages add up to exactly 100.
 * Categories with equal totals keep their `CATEGORIES` order.
 *
 * @returns Every category, including those at 0. `share` is the total relative to the largest
 * category (0-1, no longer read by the dashboard); `percent` is a whole number 0-100. With no costs at all,
 * every `share` and `percent` is 0.
 */
export function categoryBreakdown(recurring: RecurringCost[], purchases: Purchase[], year: number): CategoryTotal[] {
    const totals = totalsByCategory(recurring, purchases, year)
    const largest = Math.max(...CATEGORIES.map(category => totals[category]))
    const sum = CATEGORIES.reduce((acc, c) => acc + totals[c], 0)
    const exact = CATEGORIES.map(c => sum > 0 ? totals[c] / sum * 100 : 0)
    const floors = exact.map(Math.floor)
    const leftover = sum > 0 ? 100 - floors.reduce((a, b) => a + b, 0) : 0
    const order = exact.map((_, i) => i).sort((a, b) => (exact[b]! - floors[b]!) - (exact[a]! - floors[a]!))
    const percents = [...floors]
    for (const index of order.slice(0, leftover)) percents[index]! += 1

    return CATEGORIES.map((category, index) => ({
        category,
        total: totals[category],
        share: largest > 0 ? totals[category] / largest : 0,
        percent: percents[index]!
    }))
        .sort((a, b) => b.total - a.total)
}
/**
 * Whole percentages for household and business that always add up to 100.
 *
 * @remarks
 * Business is rounded, household is the rest, so a split like 50.5 / 49.5 never shows as 51 / 51.
 *
 * @returns 0 and 0 when the total is 0.
 */
export function splitPercentages(summary: AnnualSummary): SplitPercentages {
    if (summary.total === 0) return { household: 0, business: 0 }
    const business = Math.round(summary.business / summary.total * 100)
    return { household: 100 - business, business }
}
/**
 * One entry per month of the year, in calendar order, for the months chart.
 *
 * @returns `total` in euros and `share` relative to the most expensive month (0-1, that month is 1);
 * every `share` is 0 when the whole year costs nothing.
 */
export function monthBreakdown(recurring: RecurringCost[], purchases: Purchase[], year: number): MonthTotal[] {
    const totals = monthlyTotals(recurring, purchases, year)
    const largest = Math.max(...totals)
    return MONTHS.map((month, index) => ({ month, total: totals[index] ?? 0, share: largest > 0 ? (totals[index] ?? 0) / largest : 0 }))
}
/**
 * How a month compares with the month before it; January compares with December of the previous year.
 *
 * @param month - 1-12; for "This month" the caller passes today's month, which is never read here.
 * @returns The two totals in euros and the change as a whole, signed percentage (negative when
 * the month costs less); `percent` is `null` when the previous month cost nothing.
 */
export function monthChange(recurring: RecurringCost[], purchases: Purchase[], year: number, month: Month): MonthChange {
    const previousYear = month === 1 ? year - 1 : year
    const previousMonth = (month === 1 ? 12 : month - 1) as Month
    const current = totalMonthlyCost(recurring, purchases, year, month)
    const previous = totalMonthlyCost(recurring, purchases, previousYear, previousMonth)
    return { current, previous, percent: previous === 0 ? null : Math.round((current - previous) / previous * 100) }
}
/**
 * The years that can be shown: every year with a purchase plus the current year.
 *
 * @remarks
 * Recurring costs have no dates, so they add no years.
 *
 * @param currentYear - Passed in by the caller, so the result never depends on the clock.
 * @returns Distinct years, newest first; never empty.
 */
export function availableYears(purchases: Purchase[], currentYear: number): number[] {
    const years = new Set(purchases.map(purchase => new Date(purchase.date).getUTCFullYear()))
    years.add(currentYear)
    return [...years].sort((a, b) => b - a)
}
/**
 * The `n` largest costs, largest amount first.
 *
 * @remarks
 * Equal amounts have a fixed order: recurring before purchase, then by name in English collation.
 * The input is copied, not sorted in place.
 *
 * @typeParam T - Any cost type; stored items keep their `id`.
 * @param n - How many to return; fewer when the list is shorter.
 */
export function largestCosts<T extends Cost>(costs: T[], n = 4): T[] {
    return [...costs]
        .sort((a, b) =>
            b.amount - a.amount
            || (a.kind === b.kind ? 0 : a.kind === 'recurring' ? -1 : 1)
            || a.name.localeCompare(b.name, 'en')
        )
        .slice(0, n)
}
// Month page functions

/**
 * The months before and after `current`, across year boundaries.
 *
 * @remarks
 * Only the year is checked, not whether the neighbour has costs.
 *
 * @param validYears - Usually {@link availableYears}.
 * @returns A neighbour is `null` when its year is not in `validYears`.
 */
export function monthNeighbours(current: MonthRef, validYears: number[]): MonthNeighbours {
    const previous: MonthRef = current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: (current.month - 1) as Month }
    const next: MonthRef = current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: (current.month + 1) as Month }
    return {
        previous: validYears.includes(previous.year) ? previous : null,
        next: validYears.includes(next.year) ? next : null
    }
}
/**
 * Splits a month's list from {@link costsInMonth} into recurring costs and purchases, with subtotals.
 *
 * @typeParam R - The recurring cost type; stored items keep their `id`.
 * @typeParam P - The purchase type; stored items keep their `id`.
 * @returns Both lists in input order, their subtotals and `total`, all in euros.
 */
export function groupMonthCosts<R extends RecurringCost, P extends Purchase>(costs: (R | P)[]): MonthGroups<R, P> {
    const recurring = costs.filter((cost): cost is R => cost.kind === 'recurring')
    const purchases = costs.filter((cost): cost is P => cost.kind === 'purchase')
    const recurringTotal = recurring.reduce((sum, cost) => sum + cost.amount, 0)
    const purchasesTotal = purchases.reduce((sum, cost) => sum + cost.amount, 0)
    return { recurring, purchases, recurringTotal, purchasesTotal, total: recurringTotal + purchasesTotal }
}
/**
 * The total per category of a month's list from {@link costsInMonth}.
 *
 * @remarks
 * Uses the amounts as they fall in the month, unlike {@link totalsByCategory} and
 * {@link categoryBreakdown}, which use annual amounts.
 *
 * @returns Only categories above 0, largest first; equal totals keep their `CATEGORIES` order.
 */
export function monthCategoryTotals<T extends Cost>(costs: T[]): MonthCategoryTotal[] {
    return CATEGORIES.map((category) => ({category, total: costs.filter(cost => cost.category === category).reduce((sum, cost) => sum + cost.amount, 0)}))
        .filter(entry => entry.total > 0)
        .sort((a,b) => b.total - a.total)
}
/**
 * Everything the month page and the "This month" cards need for one month, in one call.
 *
 * @remarks
 * `householdTotal` is the total minus `businessTotal`, as in {@link annualSummary}. The UI reads
 * this through `useMonthSummary()`.
 *
 * @typeParam R - The recurring cost type; stored items keep their `id`.
 * @typeParam P - The purchase type; stored items keep their `id`.
 * @param month - 1-12.
 */
export function monthSummary<R extends RecurringCost, P extends Purchase>(recurring: R[], purchases: P[], year: number, month: Month): MonthSummary<R, P> {
    const costs = costsInMonth(recurring, purchases, year, month)
    const businessTotal = costs.filter(cost => cost.business).reduce((sum, cost) => sum + cost.amount, 0)
    const groups = groupMonthCosts<R, P>(costs)
    return {
        costs,
        groups,
        change: monthChange(recurring, purchases, year, month),
        largest: largestCosts(costs),
        empty: costs.length === 0,
        count: costs.length,
        businessTotal,
        householdTotal: groups.total - businessTotal,
        businessCount: costs.filter(cost => cost.business).length,
        categories: monthCategoryTotals(costs)
    }
}
