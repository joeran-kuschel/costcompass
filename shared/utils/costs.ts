import type { CostItem, Purchase, RecurringCost } from '~~/shared/types/calculation'

export function totalAnnualRecurring(items: RecurringCost[]): number {
    let total = 0
    items.forEach((item) => {
        if (item.interval === 'monthly') {
            total += item.amount*12
        } else {
            total += item.amount
        }
    })
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
