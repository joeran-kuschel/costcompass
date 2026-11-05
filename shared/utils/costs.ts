import { CATEGORIES, MONTHS } from '~~/shared/types/calculation'
import type { Cost, CostItem, Purchase, RecurringCost, Category, Interval, Month, AnnualSummary, CategoryTotal, SplitPercentages, MonthTotal, MonthChange, MonthRef, MonthNeighbours, MonthGroups } from '~~/shared/types/calculation'

const PERIODS_PER_YEAR: Record<Interval, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
}
// Annual functions
export function annualAmount(item: RecurringCost): number {
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
export function costsInMonth<R extends RecurringCost, P extends Purchase>(recurring: R[], purchases: P[], year: number, month: Month): (R | P)[] {
    const fromRecurring = recurring.filter(item => occursInMonth(item, month))
    const fromPurchases = purchases.filter(item => purchasedIn(item, year, month))
    return [...fromRecurring, ...fromPurchases]
}
// Dashboard functions
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
export function categoryBreakDown(recurring: RecurringCost[], purchases: Purchase[], year: number): CategoryTotal[] {
    const totals = totalsByCategory(recurring, purchases, year)
    const largest = Math.max(...CATEGORIES.map(category => totals[category]))
    const sum = CATEGORIES.reduce((acc, c) => acc + totals[c], 0)
    const exact = CATEGORIES.map(c => sum > 0 ? totals[c] / sum * 100 : 0)
    const floors = exact.map(Math.floor)
    let leftover = sum > 0 ? 100 - floors.reduce((a, b) => a + b, 0) : 0
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
export function splitPercentages(summary: AnnualSummary): SplitPercentages {
    if (summary.total === 0) return { household: 0, business: 0 }
    const business = Math.round(summary.business / summary.total * 100)
    return { household: 100 - business, business }
}
export function monthBreakdown(recurring: RecurringCost[], purchases: Purchase[], year: number): MonthTotal[] {
    const totals = monthlyTotals(recurring, purchases, year)
    const largest = Math.max(...totals)
    return MONTHS.map((month, index) => ({ month, total: totals[index] ?? 0, share: largest > 0 ? (totals[index] ?? 0) / largest : 0 }))
}
export function monthChange(recurring: RecurringCost[], purchases: Purchase[], year: number, month: Month): MonthChange {
    const previousYear = month === 1 ? year - 1 : year
    const previousMonth = (month === 1 ? 12 : month - 1) as Month
    const current = totalMonthlyCost(recurring, purchases, year, month)
    const previous = totalMonthlyCost(recurring, purchases, previousYear, previousMonth)
    return { current, previous, percent: previous === 0 ? null : Math.round((current - previous) / previous * 100) }
}
export function availableYears(purchases: Purchase[], currentYear: number): number[] {
    const years = new Set(purchases.map(purchase => new Date(purchase.date).getUTCFullYear()))
    years.add(currentYear)
    return [...years].sort((a, b) => b - a)
}
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
export function monthNeighbours(current: MonthRef, validYears: number[]): MonthNeighbours {
    const previous: MonthRef = current.month === 1 ? { year: current.year - 1, month: 12 } : { year: current.year, month: (current.month - 1) as Month }
    const next: MonthRef = current.month === 12 ? { year: current.year + 1, month: 1 } : { year: current.year, month: (current.month + 1) as Month }
    return {
        previous: validYears.includes(previous.year) ? previous : null,
        next: validYears.includes(next.year) ? next : null
    }
}
export function groupMonthCosts<R extends RecurringCost, P extends Purchase>(costs: (R | P)[]): MonthGroups<R, P> {
    const recurring = costs.filter((cost): cost is R => cost.kind === 'recurring')
    const purchases = costs.filter((cost): cost is P => cost.kind === 'purchase')
    const recurringTotal = recurring.reduce((sum, cost) => sum + cost.amount, 0)
    const purchasesTotal = purchases.reduce((sum, cost) => sum + cost.amount, 0)
    return { recurring, purchases, recurringTotal, purchasesTotal, total: recurringTotal + purchasesTotal }
}
