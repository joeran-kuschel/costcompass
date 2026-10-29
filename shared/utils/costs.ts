import { CATEGORIES, type CostItem, type Purchase, type RecurringCost, type Category, type Interval } from '~~/shared/types/calculation'
const PERIODS_PER_YEAR: Record<Interval, number> = {
  monthly: 12,
  yearly: 1,
}
export function annualAmount (item: RecurringCost): number {
    return item.amount * PERIODS_PER_YEAR[item.interval]
}
export function totalAnnualRecurring(items: RecurringCost[]): number {
    let total = 0
    items.forEach((item) => total += annualAmount(item))
    return total;
}
export function totalAnnualPurchases(items: Purchase[], year: number): number {
    const inYear = items.filter((item) => new Date(item.date).getUTCFullYear() === year)
    return inYear.reduce((sum, item) => sum + item.amount, 0)
}
export function totalAnnualCost(recurring: RecurringCost[], purchases: Purchase[], year: number): number {
    return totalAnnualRecurring(recurring) + totalAnnualPurchases(purchases, year)
}
export function filterByBusiness<T extends CostItem>(items: T[], business: boolean): T[] {
    return items.filter((item) => item.business === business)
}
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
