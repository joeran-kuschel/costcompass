/**
 * The cost model and the result types of the cost core in `shared/utils/costs.ts`.
 *
 * @remarks
 * Amounts are plain euro numbers (no integer cents), months are 1-12 and dates are ISO strings.
 * The core types carry no `id`; data from the API is typed with {@link Stored}.
 */

/**
 * The fixed list of categories. The ids are English; the display names come from the locale
 * files (`category.<id>`), and the server and the database column validate against this list.
 * Its order is the tie order wherever categories with equal totals are sorted.
 */
export const CATEGORIES = ['housing', 'insurance', 'appliances', 'food', 'mobility'] as const
/** The months of a year, 1 (January) to 12 (December). */
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
/** How often a recurring cost is due. */
export const INTERVALS = ['monthly', 'quarterly', 'yearly'] as const

export type Category = (typeof CATEGORIES)[number]
/** A month number, 1-12; never a 0-based index. */
export type Month = (typeof MONTHS)[number]
export type Interval = (typeof INTERVALS)[number]
/** A recurring cost or a purchase; tell them apart by `kind`. */
export type Cost = RecurringCost | Purchase
/** An item as it comes from the API, with the database `id` that the core types leave out. */
export type Stored<T> = T & { id: number }

/** The fields every cost has. */
export interface CostItem {
    name: string
    /** Euros per interval for a recurring cost, the price for a purchase. */
    amount: number
    category: Category
    /** A flag, not a category: a business cost still has one of the {@link CATEGORIES}. */
    business: boolean
}
/** A cost that repeats, such as rent or insurance. It has no start or end, so it counts in every year. */
export interface RecurringCost extends CostItem {
    kind: 'recurring',
    interval: Interval,
    /**
     * The month a yearly cost is due, or the first of the four months of a quarterly one.
     *
     * @remarks
     * The API requires it for quarterly and yearly costs and stores none for monthly ones. Without
     * it a quarterly or yearly cost appears in no month but still counts in the annual totals.
     * Optional in the type until `RecurringCost` becomes a union per interval.
     */
    dueMonth?: Month
}

/** A one-off cost, such as an appliance; it counts fully in the year it was bought. */
export interface Purchase extends CostItem {
    kind: 'purchase'
    /** The day of purchase as `YYYY-MM-DD`; its year and month are read in UTC. */
    date: string
}
/** The totals of one year, from `annualSummary`, all in euros. */
export interface AnnualSummary {
    total: number,
    /** `total - business`, so household plus business always equals the total. */
    household: number,
    business: number,
    /** `total / 12`, not the mean of the real months. */
    averagePerMonth: number,
}
/** One category of a year, from `categoryBreakdown`. */
export interface CategoryTotal {
    category: Category,
    /** Euros per year. */
    total: number,
    /** The total relative to the largest category, 0-1; no longer read by the dashboard. */
    share: number,
    /** A whole percentage of the year; the percentages of all categories add up to exactly 100. */
    percent: number
}
/** Whole percentages from `splitPercentages`; they add up to 100, or are both 0 when there are no costs. */
export interface SplitPercentages {
    household: number,
    business: number
}
/** One month of a year, from `monthBreakdown`. */
export interface MonthTotal {
    month: Month,
    /** Euros. */
    total: number,
    /** The total relative to the most expensive month of the year, 0-1. */
    share: number
}
/** A month compared with the month before, from `monthChange`. */
export interface MonthChange {
    /** Euros. */
    current: number,
    /** Euros. */
    previous: number,
    /** A whole, signed percentage (negative when the month costs less); `null` when the previous month cost nothing. */
    percent: number | null
}
/** A month of a specific year, as in the month page URL. */
export interface MonthRef {
    year: number,
    month: Month
}
/** The months before and after a month, from `monthNeighbours`; `null` when that month's year is not valid. */
export interface MonthNeighbours {
    previous: MonthRef | null,
    next: MonthRef | null
}
/**
 * A month's costs split by kind, from `groupMonthCosts`; amounts in euros.
 *
 * @typeParam R - The recurring cost type, for example `Stored<RecurringCost>`.
 * @typeParam P - The purchase type, for example `Stored<Purchase>`.
 */
export interface MonthGroups<R, P> {
    recurring: R[],
    purchases: P[],
    recurringTotal: number,
    purchasesTotal: number,
    /** `recurringTotal + purchasesTotal`, the month's total. */
    total: number
}
/** One category of a month, from `monthCategoryTotals`; uses the month's amounts, not annual ones. */
export interface MonthCategoryTotal {
    category: Category,
    /** Euros, always above 0. */
    total: number
}
/**
 * Everything about one month, from `monthSummary`; amounts in euros.
 *
 * @typeParam R - The recurring cost type; stored items keep their `id`.
 * @typeParam P - The purchase type; stored items keep their `id`.
 */
export interface MonthSummary<R, P> {
    /** The month's costs, recurring first, then purchases. */
    costs: (R | P)[],
    count: number,
    businessCount: number,
    groups: MonthGroups<R, P>,
    change: MonthChange,
    /** Up to four of the month's costs, largest first. */
    largest: (R | P)[],
    /** True when the month has no costs at all. */
    empty: boolean,
    /** Categories above 0, largest first. */
    categories: MonthCategoryTotal[],
    businessTotal: number,
    /** `groups.total - businessTotal`. */
    householdTotal: number
}
