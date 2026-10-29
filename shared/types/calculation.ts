export const CATEGORIES = ['housing', 'insurance', 'appliances', 'food', 'mobility'] as const
export type Category = (typeof CATEGORIES)[number]
export type Interval = 'monthly' | 'yearly';

export interface CostItem {
    name: string
    amount: number
    category: Category
    business: boolean
}
export interface RecurringCost extends CostItem {
    interval: Interval
}

export interface Purchase extends CostItem {
    date: string
}
