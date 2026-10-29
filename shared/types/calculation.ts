export const CATEGORIES = ['housing', 'insurance', 'appliances', 'food', 'mobility'] as const
export type Category = (typeof CATEGORIES)[number]
export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const
export type Month = (typeof MONTHS)[number]
export type Interval = 'monthly' | 'yearly' | 'quarterly';

export interface CostItem {
    name: string
    amount: number
    category: Category
    business: boolean
}
export interface RecurringCost extends CostItem {
    interval: Interval,
    dueMonth?: Month
}

export interface Purchase extends CostItem {
    date: string
}
