import type { Purchase, RecurringCost } from '~~/shared/types/calculation'

export function totalAnnualCost(items: RecurringCost[]): number {
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
