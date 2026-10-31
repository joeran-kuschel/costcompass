import { CATEGORIES, MONTHS, type CostItem, type Purchase, type RecurringCost, type Category, type Interval, type Month, type Cost, type AnnualSummary } from '~~/shared/types/calculation'
const PERIODS_PER_YEAR: Record<Interval, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}
// Annual functions
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
// Monthly functions
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
export function purchasedIn(purchase: Purchase, year: number, month: Month): boolean {
    return new Date(purchase.date).getUTCFullYear() === year && new Date(purchase.date).getUTCMonth() + 1 === month
}
export function totalMonthlyCost(recurring: RecurringCost[], purchases: Purchase[], year: number, month: Month): number {
    let total = 0
    total += recurring.filter(item => occursInMonth(item, month)).reduce((sum: number, item) => sum + item.amount, 0)
    total += purchases.filter(item => purchasedIn(item, year, month)).reduce((sum: number, item) => sum + item.amount, 0)
    return total;
}
export function monthlyTotals(recurring: RecurringCost[], purchases: Purchase[], year: number): number[] {
    return MONTHS.map((month) => totalMonthlyCost(recurring, purchases, year, month))
}
export function costsInMonth(recurring: RecurringCost[], purchases: Purchase[], year: number, month: Month): Cost[] {
    const fromRecurring = recurring.filter(item => occursInMonth(item, month))
    const fromPurchases = purchases.filter(item => purchasedIn(item, year, month))
    return [...fromRecurring, ...fromPurchases]
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
export function annualSummary(recurring: RecurringCost[], purchases: Purchase[], year: number): AnnualSummary {
    const total = totalAnnualCost(recurring, purchases, year)
    const business = totalAnnualCost(filterByBusiness(recurring, true), filterByBusiness(purchases, true), year)
    return { total, household: total - business, business, averagePerMonth: total / 12 }
}
