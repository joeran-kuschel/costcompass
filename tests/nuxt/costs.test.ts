import { describe, it, expect } from 'vitest'
import type { RecurringCost, Purchase, CostItem, Month } from '~~/shared/types/calculation'
import { totalAnnualRecurring, totalAnnualPurchases, totalAnnualCost, filterByBusiness, totalsByCategory, occursInMonth, totalMonthlyCost, monthlyTotals, costsInMonth, annualSummary } from '~~/shared/utils/costs'

const YEAR = 2026

function purchase(overrides: Partial<Purchase>): Purchase {
  return { name: 'Item', kind: 'purchase', amount: 0, category: 'housing', business: false, date: `${YEAR}-06-15`, ...overrides }
}
function recurring(overrides: Partial<RecurringCost>): RecurringCost {
  return { name: 'Item', kind: 'recurring', amount: 0, category: 'housing', business: false, interval: 'monthly', ...overrides }
}

describe('totalAnnualRecurring', () => {
  it('sums monthly and yearly items per year', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, interval: 'yearly' })
    ]
    expect(totalAnnualRecurring(items)).toBe(1800)
  })
  it('returns 0 for an empty list', () => {
    const items: RecurringCost[] = []
    expect (totalAnnualRecurring(items)).toBe(0)
  })
  it('sums only monthly items', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 200 })
    ]
    expect(totalAnnualRecurring(items)).toBe(3600)
  })
  it('sums only yearly items', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100, interval: 'yearly' }),
      recurring({ amount: 200, interval: 'yearly' })
    ]
    expect(totalAnnualRecurring(items)).toBe(300)
  })
  it('handles decimal amounts', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 19.99 })
    ]
    expect(totalAnnualRecurring(items)).toBeCloseTo(239.88, 2)
  })
  it('handles a single item', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 50, interval: 'yearly' })
    ]
    expect(totalAnnualRecurring(items)).toBe(50)
  })
  it('ignores items with an amount of 0', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 0 }),
      recurring({ amount: 100, interval: 'yearly' })
    ]
    expect(totalAnnualRecurring(items)).toBe(100)
  })
  it('counts a quarterly item four times a year', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100, interval: 'quarterly', dueMonth: 2 })
    ]
    expect(totalAnnualRecurring(items)).toBe(400)
  })
  it('sums monthly, quarterly and yearly items', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 50, interval: 'quarterly', dueMonth: 1 }),
      recurring({ amount: 600, interval: 'yearly', dueMonth: 6 })
    ]
    // 1200 + 200 + 600
    expect(totalAnnualRecurring(items)).toBe(2000)
  })
  it('does not change the annual amount through the due month', () => {
    const early = recurring({ amount: 600, interval: 'yearly', dueMonth: 1 })
    const late = recurring({ amount: 600, interval: 'yearly', dueMonth: 12 })
    expect(totalAnnualRecurring([early])).toBe(totalAnnualRecurring([late]))
  })
})
describe('totalAnnualPurchases', () => {
  it('sums purchases for a year', () => {
    const items: Purchase[] = [
      purchase({ amount: 1000, date: `${YEAR - 1}-11-11` }),
      purchase({ amount: 600 }),
      purchase({ amount: 1500})
    ]
    expect(totalAnnualPurchases(items, YEAR)).toBe(2100)
  })
  it('returns 0 for list of purchases from another year', () => {
    const items: Purchase[] = [
      purchase({ amount: 1000, date: `${YEAR - 1}-11-11` }),
      purchase({ amount: 600, date: `${YEAR - 1}-11-11` }),
      purchase({ amount: 1500, date: `${YEAR - 1}-11-11` })
    ]
    expect (totalAnnualPurchases(items, YEAR)).toBe(0)
  })
  it('returns 0 for an empty list', () => {
    const items: Purchase[] = []
    expect (totalAnnualPurchases(items, YEAR)).toBe(0)
  })
  it('adds a purchase on Jan 1st to the given year', () => {
    const items: Purchase[] = [
      purchase({ amount: 1000, date: `${YEAR}-01-01` }),
      purchase({ amount: 600, date: `${YEAR - 1}-11-11` }),
      purchase({ amount: 1500, date: `${YEAR}-11-11` })
    ]
    expect(totalAnnualPurchases(items, YEAR)).toBe(2500)
  })
})
describe('totalAnnualCost', () => {
  it('sums purchases and recurring for a year', () => {
    const purchases: Purchase[] = [
      purchase({ amount: 1500})
    ]
    const recurringCosts: RecurringCost[] = [
      recurring({ amount: 100 })
    ]
    expect(totalAnnualCost(recurringCosts, purchases, YEAR)).toBe(2700)
  })
  it('does not add a purchase from another year', () => {
    const purchases: Purchase[] = [
      purchase({ amount: 1000, date: `${YEAR - 1}-11-11` })
    ]
    const recurringCosts: RecurringCost[] = [
      recurring({ amount: 100 })
    ]
    expect(totalAnnualCost(recurringCosts, purchases, YEAR)).toBe(1200)
  })
})
describe('filterByBusiness', () => {
  it('filters costs by business', () => {
    const costItems: CostItem[] = [
      purchase({ name: 'Laptop', business: true }),
      purchase({}),
      recurring({ name:'test', business: true })
    ]
    const business = filterByBusiness(costItems, true)
    expect(business).toHaveLength(2)
    expect(business.map((i) => i.name)).toEqual(['Laptop', 'test'])

    const household = filterByBusiness(costItems, false)
    expect(household).toHaveLength(1);
    expect(household.map((i) => i.name)).toEqual(['Item'])
  })
  it('returns an empty list for an empty list', () => {
    expect(filterByBusiness([], true)).toEqual([])
    expect(filterByBusiness([], false)).toEqual([])
  })
  it('keeps the specific type of the items', () => {
    const items: RecurringCost[] = [
      recurring({ amount: 100, business: true }),
      recurring({ amount: 50, interval: 'yearly' })
    ]
    // compiles only if the result is still a RecurringCost[]
    expect(totalAnnualRecurring(filterByBusiness(items, true))).toBe(1200)
    expect(totalAnnualRecurring(filterByBusiness(items, false))).toBe(50)
  })
})
describe('totalsByCategory', () => {
  it('gives the right sums per category', () => {
    const purchasesItems: Purchase[] = [
      purchase({ amount: 200}),
      purchase({ amount: 50, category: 'food'})
    ]
     const recurringItems: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, category: 'food' })
    ]
    const categoryTotals = totalsByCategory(recurringItems, purchasesItems, YEAR);
    expect(categoryTotals.housing).toEqual(1400)
    expect(categoryTotals.food).toEqual(7250)
  })
  it('an empty category stays 0', () => {
    const purchasesItems: Purchase[] = [
      purchase({ amount: 200}),
      purchase({ amount: 50, category: 'food'})
    ]
     const recurringItems: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, category: 'food' })
    ]
    const categoryTotals = totalsByCategory(recurringItems, purchasesItems, YEAR);
    expect(categoryTotals.insurance).toEqual(0)
  })
  it('a purchase from another year is ignored', () => {
    const purchasesItems: Purchase[] = [
      purchase({ amount: 50, category: 'food', date: '2025-01-23'})
    ]
     const recurringItems: RecurringCost[] = [
      recurring({ amount: 600, category: 'food' })
    ]
    const categoryTotals = totalsByCategory(recurringItems, purchasesItems, YEAR);
    expect(categoryTotals.food).toEqual(7200)
  })
  it('adds up to the total annual cost', () => {
    const purchases: Purchase[] = [
      purchase({ amount: 200 }),
      purchase({ amount: 50, category: 'food' })
    ]
    const recurringItems: RecurringCost[] = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, category: 'food', interval: 'yearly' })
    ]

    const byCategory = totalsByCategory(recurringItems, purchases, YEAR)
    const sum = Object.values(byCategory).reduce((total, value) => total + value, 0)

    expect(sum).toBe(totalAnnualCost(recurringItems, purchases, YEAR))
  })
})
describe('occursInMonth', () => {
  it('a monthly cost occurs in every month', () => {
    const item = recurring({ interval: 'monthly' })
    expect(occursInMonth(item, 1)).toBe(true)
    expect(occursInMonth(item, 7)).toBe(true)
    expect(occursInMonth(item, 12)).toBe(true)
  })
  it('a yearly cost occurs only in its due month', () => {
    const item = recurring({ interval: 'yearly', dueMonth: 6 })
    expect(occursInMonth(item, 6)).toBe(true)
    expect(occursInMonth(item, 7)).toBe(false)
  })
  it('a quarterly cost occurs every three months from its due month', () => {
    const item = recurring({ interval: 'quarterly', dueMonth: 2 })
    expect([2, 5, 8, 11].every((month) => occursInMonth(item, month as Month))).toBe(true)
    expect(occursInMonth(item, 3)).toBe(false)
    expect(occursInMonth(item, 1)).toBe(false)
  })
  it('a yearly or quarterly cost without a due month does not occur', () => {
    expect(occursInMonth(recurring({ interval: 'yearly' }), 6)).toBe(false)
    expect(occursInMonth(recurring({ interval: 'quarterly' }), 6)).toBe(false)
  })
})
describe('totalMonthlyCost', () => {
  it('a monthly cost counts in any month', () => {
    const items = [recurring({ amount: 100 })]
    expect(totalMonthlyCost(items, [], YEAR, 1)).toBe(100)
    expect(totalMonthlyCost(items, [], YEAR, 9)).toBe(100)
  })
  it('a purchase counts only in its own month and year', () => {
    const items = [purchase({ amount: 500, date: `${YEAR}-03-15` })]
    expect(totalMonthlyCost([], items, YEAR, 3)).toBe(500)
    expect(totalMonthlyCost([], items, YEAR, 4)).toBe(0)
    expect(totalMonthlyCost([], items, YEAR + 1, 3)).toBe(0)
  })
  it('a yearly cost counts only in its due month', () => {
    const items = [recurring({ amount: 600, interval: 'yearly', dueMonth: 6 })]
    expect(totalMonthlyCost(items, [], YEAR, 6)).toBe(600)
    expect(totalMonthlyCost(items, [], YEAR, 7)).toBe(0)
  })
  it('adds recurring costs and purchases', () => {
    const recurringItems = [recurring({ amount: 100 })]
    const purchases = [purchase({ amount: 500, date: `${YEAR}-03-15` })]
    expect(totalMonthlyCost(recurringItems, purchases, YEAR, 3)).toBe(600)
    expect(totalMonthlyCost(recurringItems, purchases, YEAR, 4)).toBe(100)
  })
  it('returns 0 for empty lists', () => {
    expect(totalMonthlyCost([], [], YEAR, 1)).toBe(0)
  })
})
describe('monthlyTotals', () => {
  it('returns a result with 12 entries', () => {
    const items = [recurring({ amount: 100 })]
    expect(monthlyTotals(items, [], YEAR).length).toEqual(12)
  })
  it('a monthly cost of 100 gives 12 100s', () => {
    const items = [recurring({ amount: 100 })]
    expect(monthlyTotals(items, [], YEAR)).toEqual(Array(12).fill(100))
  })
  it('a March purchase of 500 € lands only at index 2', () => {
    const purchases = [purchase({ amount: 500, date: `${YEAR}-03-15` })]
    const expected = Array(12).fill(0)
    expected[2] = 500
    expect(monthlyTotals([], purchases, YEAR)).toEqual(expected)
  })
  it('the monthly values add up to the yearly total', () => {
    const recurringCosts = [
      recurring({ amount: 100 }),
      recurring({ amount: 5000, interval: 'yearly', dueMonth: 6}),
      recurring({ amount: 200, interval: 'quarterly', dueMonth: 2 }),
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-03-15` }),
      purchase({ amount: 500, date: `${YEAR}-03-15` }),
    ]
    expect(monthlyTotals(recurringCosts, purchases, YEAR).reduce((total, value) => total + value, 0)).toEqual(totalAnnualCost(recurringCosts, purchases, YEAR))
  })
})
describe('costsInMonth', () => {
  it('a monthly cost and a purchase in the same month returns both values', () => {
    const recurringCosts = [
      recurring({ amount: 100 })
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-03-15` })
    ]
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3).length).toEqual(2)
  })
  it('a purchase in another month is not returned', () => {
    const recurringCosts = [
      recurring({ amount: 100 })
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-04-15` })
    ]
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3)).toHaveLength(1)
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3)[0]?.kind).toBe('recurring')
  })
  it('a purchase in another year is not returned', () => {
    const recurringCosts = [
      recurring({ amount: 100 })
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR + 1}-03-15` })
    ]
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3)).toHaveLength(1)
  })
  it('a yearly cost is returned only for the month it is due', () => {
    const recurringCosts = [
      recurring({ amount: 100, interval: 'yearly', dueMonth: 3 })
    ]
    expect(costsInMonth(recurringCosts, [], YEAR, 3)).toHaveLength(1)
    expect(costsInMonth(recurringCosts, [], YEAR, 2)).toHaveLength(0)
    expect(costsInMonth(recurringCosts, [], YEAR, 7)).toHaveLength(0)
  })
  it('an empty input returns 0', () => {
    const recurringCosts: RecurringCost[] = []
    const purchases: Purchase[] = []
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3)).toHaveLength(0)
  })
  it('a purchase and a recurring in a month have the proper kind', () => {
    const recurringCosts = [
      recurring({ amount: 100, kind: 'recurring' })
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-03-15`, kind: 'purchase' })
    ]
    const kinds = costsInMonth(recurringCosts, purchases, YEAR, 3).map((cost) => cost.kind)
    expect(kinds).toHaveLength(2)
    expect(kinds).toContain('recurring')
    expect(kinds).toContain('purchase')
  })
  it('the listed amounts add up to the monthly total', () => {
    const recurringCosts = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, interval: 'yearly', dueMonth: 3 }),
      recurring({ amount: 50, interval: 'yearly', dueMonth: 9 })
    ]
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-03-15` }),
      purchase({ amount: 70, date: `${YEAR}-04-02` })
    ]
    const list = costsInMonth(recurringCosts, purchases, YEAR, 3)
    const sum = list.reduce((total, cost) => total + cost.amount, 0)

    expect(list).toHaveLength(3)
    expect(sum).toBe(1200)
    expect(sum).toBe(totalMonthlyCost(recurringCosts, purchases, YEAR, 3))
  })
})

describe('annualSummary', () => {
  it('reports the total and splits it into household and business', () => {
    const recurringCosts = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, interval: 'yearly', dueMonth: 3, business: true })
    ]
    const purchases = [
      purchase({ amount: 300, business: true }),
      purchase({ amount: 200 })
    ]
    const summary = annualSummary(recurringCosts, purchases, YEAR)
    expect(summary.total).toBe(2300)
    expect(summary.business).toBe(900)
    expect(summary.household).toBe(1400)
  })
  it('household plus business equals the total, also with decimal amounts', () => {
    const recurringCosts = [
      recurring({ amount: 0.1, business: true }),
      recurring({ amount: 0.2 })
    ]
    const purchases = [purchase({ amount: 19.99 }), purchase({ amount: 0.07, business: true })]
    const summary = annualSummary(recurringCosts, purchases, YEAR)
    expect(summary.household + summary.business).toBeCloseTo(summary.total, 10)
  })
  it('equals totalAnnualCost for the total', () => {
    const recurringCosts = [recurring({ amount: 80 }), recurring({ amount: 90, interval: 'yearly', dueMonth: 5 })]
    const purchases = [purchase({ amount: 400, date: `${YEAR}-02-01` })]
    expect(annualSummary(recurringCosts, purchases, YEAR).total).toBe(totalAnnualCost(recurringCosts, purchases, YEAR))
  })
  it('counts only the purchases of the given year', () => {
    const purchases = [
      purchase({ amount: 500, date: `${YEAR}-03-01` }),
      purchase({ amount: 700, date: `${YEAR - 1}-12-31` }),
      purchase({ amount: 900, date: `${YEAR + 1}-01-01` })
    ]
    expect(annualSummary([], purchases, YEAR).total).toBe(500)
  })
  it('counts recurring costs in every year', () => {
    const recurringCosts = [recurring({ amount: 100 })]
    expect(annualSummary(recurringCosts, [], YEAR).total).toBe(1200)
    expect(annualSummary(recurringCosts, [], YEAR + 1).total).toBe(1200)
  })
  it('averages over twelve months: a monthly cost counts twelve times, a yearly cost once', () => {
    const recurringCosts = [
      recurring({ amount: 100 }),
      recurring({ amount: 1200, interval: 'yearly', dueMonth: 7 })
    ]
    const summary = annualSummary(recurringCosts, [], YEAR)
    expect(summary.total).toBe(2400)
    expect(summary.averagePerMonth).toBe(200)
  })
  it('the average is the total divided by 12, not rounded', () => {
    const summary = annualSummary([], [purchase({ amount: 100 })], YEAR)
    expect(summary.averagePerMonth).toBeCloseTo(100 / 12, 10)
  })
  it('puts everything into household when no cost is a business cost', () => {
    const summary = annualSummary([recurring({ amount: 50 })], [purchase({ amount: 40 })], YEAR)
    expect(summary.business).toBe(0)
    expect(summary.household).toBe(summary.total)
  })
  it('puts everything into business when every cost is a business cost', () => {
    const summary = annualSummary([recurring({ amount: 50, business: true })], [purchase({ amount: 40, business: true })], YEAR)
    expect(summary.household).toBe(0)
    expect(summary.business).toBe(summary.total)
  })
  it('returns zeros when there are no costs', () => {
    expect(annualSummary([], [], YEAR)).toEqual({ total: 0, household: 0, business: 0, averagePerMonth: 0 })
  })
})
