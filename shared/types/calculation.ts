export const CATEGORIES = ['housing', 'insurance', 'appliances', 'food', 'mobility'] as const
export type Category = (typeof CATEGORIES)[number]
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export type Month = (typeof MONTHS)[number]
export const INTERVALS = ['monthly', 'quarterly', 'yearly'] as const
export type Interval = (typeof INTERVALS)[number]
export type Cost = RecurringCost | Purchase
export type Stored<T> = T & { id: number }

export interface CostItem {
    name: string
    amount: number
    category: Category
    business: boolean
}
export interface RecurringCost extends CostItem {
    kind: 'recurring',
    interval: Interval,
    dueMonth?: Month
}

export interface Purchase extends CostItem {
    kind: 'purchase'
    date: string
}
export interface AnnualSummary {
    total: number,
    household: number,
    business: number,
    averagePerMonth: number,
}
export interface CategoryTotal {
    category: Category,
    total: number,
    share: number
}
export interface SplitPercentages {
    household: number,
    business: number
}
export interface MonthTotal {
    month: Month,
    total: number,
    share: number
}
export interface MonthChange {
    current: number,
    previous: number,
    percent: number | null
}
export interface MonthRef {
    year: number,
    month: Month
}
export interface MonthNeighbours {
    previous: MonthRef | null,
    next: MonthRef | null
}
export interface MonthGroups<R, P> {
    recurring: R[],
    purchases: P[],
    recurringTotal: number,
    purchasesTotal: number,
    total: number
}
