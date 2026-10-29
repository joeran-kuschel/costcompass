import { describe, it, expect } from 'vitest'
import type { RecurringCost, Purchase, CostItem } from '~~/shared/types/calculation'
import { totalAnnualRecurring, totalAnnualPurchases, filterByBusiness, totalsByCategory } from '~~/shared/utils/costs'

const YEAR = 2026

function purchase(overrides: Partial<Purchase>): Purchase {
  return { name: 'Item', amount: 0, category: 'housing', business: false, date: `${YEAR}-06-15`, ...overrides }
}
function recurring(overrides: Partial<RecurringCost>): RecurringCost {
  return { name: 'Item', amount: 0, category: 'housing', business: false, interval: 'monthly', ...overrides }
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
