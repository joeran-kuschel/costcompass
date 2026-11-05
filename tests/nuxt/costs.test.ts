import { describe, it, expect } from 'vitest'
import type { RecurringCost, Purchase, CostItem, Month, AnnualSummary, Stored } from '~~/shared/types/calculation'
import { CATEGORIES } from '~~/shared/types/calculation'
import { totalAnnualRecurring, totalAnnualPurchases, totalAnnualCost, filterByBusiness, totalsByCategory, occursInMonth, totalMonthlyCost, monthlyTotals, costsInMonth, annualSummary, categoryBreakdown, splitPercentages, monthBreakdown, monthChange, availableYears, monthNeighbours, groupMonthCosts, largestCosts, monthCategoryTotals, monthSummary } from '~~/shared/utils/costs'

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

describe('categoryBreakdown', () => {
  const costs = () => ({
    recurringCosts: [
      recurring({ amount: 100, category: 'housing' }),
      recurring({ amount: 50, category: 'insurance', business: true })
    ],
    purchases: [purchase({ amount: 300, category: 'appliances' })]
  })

  it('returns one entry for every category, also those without costs', () => {
    const { recurringCosts, purchases } = costs()
    const result = categoryBreakdown(recurringCosts, purchases, YEAR)
    expect(result).toHaveLength(CATEGORIES.length)
    expect(result.map((entry) => entry.category).sort()).toEqual([...CATEGORIES].sort())
  })
  it('sorts the categories by total, largest first', () => {
    const { recurringCosts, purchases } = costs()
    const result = categoryBreakdown(recurringCosts, purchases, YEAR)
    expect(result.map((entry) => entry.category).slice(0, 3)).toEqual(['housing', 'insurance', 'appliances'])
    expect(result.map((entry) => entry.total).slice(0, 3)).toEqual([1200, 600, 300])
  })
  it('sorts by total even when the largest category comes last in the category list', () => {
    const purchases = [
      purchase({ amount: 100, category: 'appliances' }),
      purchase({ amount: 300, category: 'food' }),
      purchase({ amount: 500, category: 'mobility' })
    ]
    const result = categoryBreakdown([], purchases, YEAR)
    expect(result.map((entry) => entry.category)).toEqual(['mobility', 'food', 'appliances', 'housing', 'insurance'])
    expect(result.map((entry) => entry.share)).toEqual([1, 0.6, 0.2, 0, 0])
  })
  it('gives the largest category a share of 1 and the others their part of it', () => {
    const { recurringCosts, purchases } = costs()
    const result = categoryBreakdown(recurringCosts, purchases, YEAR)
    expect(result.map((entry) => entry.share)).toEqual([1, 0.5, 0.25, 0, 0])
  })
  it('gives categories without costs a total and a share of 0', () => {
    const { recurringCosts, purchases } = costs()
    const result = categoryBreakdown(recurringCosts, purchases, YEAR)
    const empty = result.filter((entry) => entry.total === 0)
    expect(empty.map((entry) => entry.category)).toEqual(['food', 'mobility'])
    expect(empty.every((entry) => entry.share === 0)).toBe(true)
  })
  it('keeps the order of the category list when totals are equal', () => {
    const purchases = [
      purchase({ amount: 100, category: 'mobility' }),
      purchase({ amount: 100, category: 'food' })
    ]
    const result = categoryBreakdown([], purchases, YEAR)
    expect(result.map((entry) => entry.category)).toEqual(['food', 'mobility', 'housing', 'insurance', 'appliances'])
  })
  it('adds recurring costs and purchases of the same category', () => {
    const recurringCosts = [recurring({ amount: 10, category: 'food' })]
    const purchases = [purchase({ amount: 30, category: 'food' })]
    const food = categoryBreakdown(recurringCosts, purchases, YEAR).find((entry) => entry.category === 'food')
    expect(food?.total).toBe(150)
  })
  it('counts business and household costs alike', () => {
    const recurringCosts = [
      recurring({ amount: 10, category: 'food', business: true }),
      recurring({ amount: 10, category: 'food' })
    ]
    const food = categoryBreakdown(recurringCosts, [], YEAR).find((entry) => entry.category === 'food')
    expect(food?.total).toBe(240)
  })
  it('counts only the purchases of the given year', () => {
    const purchases = [
      purchase({ amount: 100, category: 'food', date: `${YEAR}-02-01` }),
      purchase({ amount: 900, category: 'food', date: `${YEAR - 1}-02-01` })
    ]
    const food = categoryBreakdown([], purchases, YEAR).find((entry) => entry.category === 'food')
    expect(food?.total).toBe(100)
  })
  it('adds up to the annual total', () => {
    const { recurringCosts, purchases } = costs()
    const sum = categoryBreakdown(recurringCosts, purchases, YEAR).reduce((total, entry) => total + entry.total, 0)
    expect(sum).toBeCloseTo(annualSummary(recurringCosts, purchases, YEAR).total, 10)
  })
  it('returns zeros, not NaN, when there are no costs', () => {
    const result = categoryBreakdown([], [], YEAR)
    expect(result).toHaveLength(CATEGORIES.length)
    expect(result.every((entry) => entry.total === 0 && entry.share === 0)).toBe(true)
  })
})

describe('categoryBreakdown percentages', () => {
  // One purchase per category and amount, in the order of CATEGORIES: housing, insurance, appliances, food, mobility.
  const purchasesOf = (amounts: number[]) => amounts.map((amount, index) => purchase({ amount, category: CATEGORIES[index]! }))
  const percents = (amounts: number[]) => categoryBreakdown([], purchasesOf(amounts), YEAR).map((entry) => entry.percent)
  const byCategory = (amounts: number[]) => Object.fromEntries(categoryBreakdown([], purchasesOf(amounts), YEAR).map((entry) => [entry.category, entry.percent]))
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  it('gives every category its share of the total as a percentage', () => {
    // 600 of 1,200 is exactly 50%
    expect(byCategory([600, 300, 300, 0, 0])).toEqual({ housing: 50, insurance: 25, appliances: 25, food: 0, mobility: 0 })
  })
  it('gives a single category 100% and the others 0', () => {
    expect(byCategory([0, 0, 0, 40, 0])).toEqual({ housing: 0, insurance: 0, appliances: 0, food: 100, mobility: 0 })
  })
  it('gives the remaining point to the category with the largest remainder', () => {
    // 1,200 / 600 / 300 of 2,100 are 57.14%, 28.57% and 14.29%: rounded down 57 + 28 + 14 = 99, and the 28.57 has the largest remainder
    expect(byCategory([1200, 600, 300, 0, 0])).toEqual({ housing: 57, insurance: 29, appliances: 14, food: 0, mobility: 0 })
  })
  it('gives the extra point of equal remainders to the first category of the category list', () => {
    // three equal thirds: 33.33% each, so one of them gets 34
    expect(byCategory([100, 100, 100, 0, 0])).toEqual({ housing: 34, insurance: 33, appliances: 33, food: 0, mobility: 0 })
  })
  it('gives two points when two remainders are left over', () => {
    // 1, 1, 1, 1 and 3 of 7 are 14.29% four times and 42.86%: rounded down 14 x 4 + 42 = 98, so two points are left over
    const result = byCategory([1, 1, 1, 1, 3])
    expect(sum(Object.values(result))).toBe(100)
    // the 42.86 has the largest remainder, then the first of the equal ones
    expect(result).toEqual({ housing: 15, insurance: 14, appliances: 14, food: 14, mobility: 43 })
  })
  it('adds up to exactly 100 for any mix of amounts', () => {
    const cases = [
      [1, 1, 1, 1, 1],
      [1, 2, 3, 4, 5],
      [7, 11, 13, 17, 19],
      [333, 333, 334, 0, 0],
      [0.01, 0.02, 0.03, 0.04, 0.05],
      [1000000, 1, 1, 1, 1],
      [99, 1, 0, 0, 0],
    ]
    for (const amounts of cases) {
      expect(sum(percents(amounts)), JSON.stringify(amounts)).toBe(100)
    }
  })
  it('returns whole numbers', () => {
    for (const value of percents([7, 11, 13, 17, 19])) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })
  it('returns 0 for every category when the year has no costs', () => {
    expect(percents([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0])
    expect(percents([0, 0, 0, 0, 0]).some(Number.isNaN)).toBe(false)
  })
  it('returns 0 for every category without any costs at all', () => {
    const result = categoryBreakdown([], [], YEAR)
    expect(result.map((entry) => entry.percent)).toEqual([0, 0, 0, 0, 0])
  })
  it('keeps the categories sorted by total, largest first', () => {
    const result = categoryBreakdown([], purchasesOf([300, 100, 500, 0, 200]), YEAR)
    expect(result.map((entry) => entry.category)).toEqual(['appliances', 'housing', 'mobility', 'insurance', 'food'])
    // 500 / 300 / 200 / 100 of 1,100: 45.45%, 27.27%, 18.18%, 9.09% round down to 45 + 27 + 18 + 9 = 99; the 45.45 has the largest remainder
    expect(result.map((entry) => entry.percent)).toEqual([46, 27, 18, 9, 0])
  })
  it('never gives a smaller category a bigger percentage than a larger one', () => {
    const result = categoryBreakdown([], purchasesOf([7, 11, 13, 17, 19]), YEAR).map((entry) => entry.percent)
    expect(result).toEqual([...result].sort((a, b) => b - a))
  })
  it('counts only the costs of the given year', () => {
    const purchases = [
      purchase({ amount: 100, category: 'housing' }),
      purchase({ amount: 300, category: 'food', date: `${YEAR - 1}-06-15` }),
    ]
    const result = categoryBreakdown([], purchases, YEAR)
    expect(result.find((entry) => entry.category === 'housing')?.percent).toBe(100)
    expect(result.find((entry) => entry.category === 'food')?.percent).toBe(0)
  })
  it('counts recurring costs and purchases together', () => {
    const recurringCosts = [recurring({ amount: 10, category: 'housing' })]
    const purchases = [purchase({ amount: 120, category: 'food' })]
    // 120 a year for housing and 120 for food
    expect(categoryBreakdown(recurringCosts, purchases, YEAR).filter((entry) => entry.total > 0).map((entry) => entry.percent)).toEqual([50, 50])
  })
})

describe('splitPercentages', () => {
  const summary = (total: number, business: number): AnnualSummary =>
    ({ total, household: total - business, business, averagePerMonth: total / 12 })

  it('splits the total into whole percentages for household and business', () => {
    expect(splitPercentages(summary(1000, 250))).toEqual({ household: 75, business: 25 })
  })
  it('rounds the business share to the nearest whole percent', () => {
    expect(splitPercentages(summary(10000, 2425)).business).toBe(24)
    expect(splitPercentages(summary(200, 49)).business).toBe(25)
    expect(splitPercentages(summary(1000, 6)).business).toBe(1)
  })
  it('makes the two percentages add up to exactly 100 even when both would round up', () => {
    // 1 of 8 is 12.5% business and 87.5% household: rounding both separately would give 13 + 88.
    const result = splitPercentages(summary(8, 1))
    expect(result.household + result.business).toBe(100)
    expect(result).toEqual({ household: 87, business: 13 })
  })
  it('adds up to 100 for any share', () => {
    for (let business = 0; business <= 1000; business += 7) {
      const result = splitPercentages(summary(1000, business))
      expect(result.household + result.business).toBe(100)
      expect(result.household).toBeGreaterThanOrEqual(0)
      expect(result.business).toBeGreaterThanOrEqual(0)
    }
  })
  it('gives household 100 and business 0 when there are no business costs', () => {
    expect(splitPercentages(summary(500, 0))).toEqual({ household: 100, business: 0 })
  })
  it('gives business 100 and household 0 when every cost is a business cost', () => {
    expect(splitPercentages(summary(500, 500))).toEqual({ household: 0, business: 100 })
  })
  it('returns 0 and 0, not NaN, when the total is 0', () => {
    expect(splitPercentages(summary(0, 0))).toEqual({ household: 0, business: 0 })
  })
  it('rounds a tiny business share down to 0 percent', () => {
    expect(splitPercentages(summary(1000, 4))).toEqual({ household: 100, business: 0 })
  })
  it('works with the summary of real costs', () => {
    const recurringCosts = [
      recurring({ amount: 100 }),
      recurring({ amount: 600, interval: 'yearly', dueMonth: 3, business: true })
    ]
    const purchases = [purchase({ amount: 300, business: true }), purchase({ amount: 200 })]
    // total 2,300, business 900: 39.13% business
    expect(splitPercentages(annualSummary(recurringCosts, purchases, YEAR))).toEqual({ household: 61, business: 39 })
  })
})

describe('monthBreakdown', () => {
  const recurringCosts = [
    recurring({ amount: 100 }),
    recurring({ amount: 600, interval: 'yearly', dueMonth: 3 })
  ]
  const purchases = [purchase({ amount: 300, date: `${YEAR}-06-15` })]

  it('returns 12 entries in calendar order', () => {
    const result = monthBreakdown(recurringCosts, purchases, YEAR)
    expect(result.map(row => row.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
  it('takes the totals from monthlyTotals', () => {
    const result = monthBreakdown(recurringCosts, purchases, YEAR)
    expect(result.map(row => row.total)).toEqual(monthlyTotals(recurringCosts, purchases, YEAR))
  })
  it('gives the largest month a share of 1 and the others a share relative to it', () => {
    const result = monthBreakdown(recurringCosts, purchases, YEAR)
    // March 700 (largest), June 400, all other months 100
    expect(result[2]).toEqual({ month: 3, total: 700, share: 1 })
    expect(result[5]?.share).toBeCloseTo(400 / 700)
    expect(result[0]?.share).toBeCloseTo(100 / 700)
  })
  it('gives a month without costs a share of 0', () => {
    const result = monthBreakdown([], [purchase({ amount: 50 })], YEAR)
    expect(result[0]).toEqual({ month: 1, total: 0, share: 0 })
    expect(result[5]?.share).toBe(1)
  })
  it('returns 12 entries with share 0, not NaN, when there are no costs', () => {
    const result = monthBreakdown([], [], YEAR)
    expect(result).toHaveLength(12)
    expect(result.every(row => row.total === 0 && row.share === 0)).toBe(true)
  })
  it('ignores purchases from other years', () => {
    const result = monthBreakdown([], [purchase({ amount: 50, date: `${YEAR - 1}-06-15` })], YEAR)
    expect(result.every(row => row.total === 0)).toBe(true)
  })
})

describe('monthChange', () => {
  const rent = recurring({ amount: 100 })

  it('returns the totals of both months', () => {
    const purchases = [purchase({ amount: 300, date: `${YEAR}-06-15` }), purchase({ amount: 50, date: `${YEAR}-05-10` })]
    const result = monthChange([rent], purchases, YEAR, 6)
    expect(result.current).toBe(400)
    expect(result.previous).toBe(150)
  })
  it('gives a positive percentage when the month costs more', () => {
    const purchases = [purchase({ amount: 100, date: `${YEAR}-06-15` })]
    // 200 against 100: 100 percent more
    expect(monthChange([rent], purchases, YEAR, 6).percent).toBe(100)
  })
  it('gives a negative percentage when the month costs less', () => {
    const purchases = [purchase({ amount: 100, date: `${YEAR}-05-15` })]
    // 100 against 200: 50 percent less
    expect(monthChange([rent], purchases, YEAR, 6).percent).toBe(-50)
  })
  it('gives 0 when both months cost the same', () => {
    expect(monthChange([rent], [], YEAR, 6).percent).toBe(0)
  })
  it('rounds the percentage to whole numbers', () => {
    const purchases = [purchase({ amount: 200, date: `${YEAR}-05-15` }), purchase({ amount: 210, date: `${YEAR}-06-15` })]
    // 210 against 200: 5 percent more
    expect(monthChange([], purchases, YEAR, 6).percent).toBe(5)
    // 2 against 3: 33.33 percent less
    const small = [purchase({ amount: 3, date: `${YEAR}-05-15` }), purchase({ amount: 2, date: `${YEAR}-06-15` })]
    expect(monthChange([], small, YEAR, 6).percent).toBe(-33)
  })
  it('returns null, not Infinity or NaN, when the previous month cost nothing', () => {
    const purchases = [purchase({ amount: 100, date: `${YEAR}-06-15` })]
    const result = monthChange([], purchases, YEAR, 6)
    expect(result.previous).toBe(0)
    expect(result.percent).toBeNull()
  })
  it('returns null when both months cost nothing', () => {
    expect(monthChange([], [], YEAR, 6).percent).toBeNull()
  })
  it('compares January with December of the previous year', () => {
    const purchases = [
      purchase({ amount: 200, date: `${YEAR - 1}-12-20` }),
      purchase({ amount: 100, date: `${YEAR}-01-10` }),
      // same month number in the wrong year must not count
      purchase({ amount: 999, date: `${YEAR}-12-20` })
    ]
    const result = monthChange([], purchases, YEAR, 1)
    expect(result.previous).toBe(200)
    expect(result.percent).toBe(-50)
  })
  it('does not look into the previous year for other months', () => {
    const purchases = [purchase({ amount: 999, date: `${YEAR - 1}-05-15` }), purchase({ amount: 100, date: `${YEAR}-06-15` })]
    expect(monthChange([], purchases, YEAR, 6).previous).toBe(0)
  })
})

describe('costsInMonth with stored items', () => {
  it('keeps the id of every returned item', () => {
    const recurringCosts: Stored<RecurringCost>[] = [{ ...recurring({ amount: 100 }), id: 7 }]
    const purchases: Stored<Purchase>[] = [{ ...purchase({ amount: 500, date: `${YEAR}-03-15` }), id: 9 }]
    const result = costsInMonth(recurringCosts, purchases, YEAR, 3)
    expect(result.map(item => item.id)).toEqual([7, 9])
  })
  it('lists recurring costs first and then purchases', () => {
    const recurringCosts = [recurring({ name: 'Rent', amount: 100 })]
    const purchases = [purchase({ name: 'Lamp', amount: 500, date: `${YEAR}-03-15` })]
    expect(costsInMonth(recurringCosts, purchases, YEAR, 3).map(item => item.name)).toEqual(['Rent', 'Lamp'])
  })
})

describe('availableYears', () => {
  it('always contains the current year, even without purchases', () => {
    expect(availableYears([], YEAR)).toEqual([YEAR])
  })
  it('adds the years of the purchases, newest first', () => {
    const purchases = [purchase({ date: '2024-02-10' }), purchase({ date: '2025-11-03' })]
    expect(availableYears(purchases, YEAR)).toEqual([YEAR, 2025, 2024])
  })
  it('lists a year only once', () => {
    const purchases = [purchase({ date: '2025-01-10' }), purchase({ date: '2025-12-31' }), purchase({ date: `${YEAR}-03-01` })]
    expect(availableYears(purchases, YEAR)).toEqual([YEAR, 2025])
  })
  it('sorts by year whatever order the purchases come in', () => {
    const purchases = [purchase({ date: '2023-06-01' }), purchase({ date: '2025-06-01' }), purchase({ date: '2024-06-01' })]
    expect(availableYears(purchases, YEAR)).toEqual([YEAR, 2025, 2024, 2023])
  })
  it('includes a year after the current one when a purchase is dated then', () => {
    expect(availableYears([purchase({ date: `${YEAR + 1}-01-05` })], YEAR)).toEqual([YEAR + 1, YEAR])
  })
  it('takes the year from the date in UTC, so New Year is not shifted by a time zone', () => {
    expect(availableYears([purchase({ date: '2025-12-31' }), purchase({ date: '2026-01-01' })], 2030)).toEqual([2030, 2026, 2025])
  })
})

describe('monthNeighbours', () => {
  const years = [2025, 2026, 2027]

  it('returns the months before and after in the same year for a month in the middle', () => {
    expect(monthNeighbours({ year: 2026, month: 10 }, years)).toEqual({
      previous: { year: 2026, month: 9 },
      next: { year: 2026, month: 11 },
    })
  })
  it('goes from January back to December of the previous year', () => {
    expect(monthNeighbours({ year: 2026, month: 1 }, years)).toEqual({
      previous: { year: 2025, month: 12 },
      next: { year: 2026, month: 2 },
    })
  })
  it('goes from December on to January of the next year', () => {
    expect(monthNeighbours({ year: 2026, month: 12 }, years)).toEqual({
      previous: { year: 2026, month: 11 },
      next: { year: 2027, month: 1 },
    })
  })
  it('has no previous month in January of the oldest valid year', () => {
    expect(monthNeighbours({ year: 2025, month: 1 }, years).previous).toBeNull()
    expect(monthNeighbours({ year: 2025, month: 1 }, years).next).toEqual({ year: 2025, month: 2 })
  })
  it('has no next month in December of the newest valid year', () => {
    expect(monthNeighbours({ year: 2027, month: 12 }, years).next).toBeNull()
    expect(monthNeighbours({ year: 2027, month: 12 }, years).previous).toEqual({ year: 2027, month: 11 })
  })
  it('keeps both neighbours inside a single valid year, except at the year boundaries', () => {
    expect(monthNeighbours({ year: 2026, month: 6 }, [2026])).toEqual({
      previous: { year: 2026, month: 5 },
      next: { year: 2026, month: 7 },
    })
    expect(monthNeighbours({ year: 2026, month: 1 }, [2026]).previous).toBeNull()
    expect(monthNeighbours({ year: 2026, month: 12 }, [2026]).next).toBeNull()
  })
  it('hides a link into a year that has a gap before it', () => {
    // 2025 has no data: the years 2024 and 2026 are not linked to each other
    expect(monthNeighbours({ year: 2026, month: 1 }, [2024, 2026]).previous).toBeNull()
    expect(monthNeighbours({ year: 2024, month: 12 }, [2024, 2026]).next).toBeNull()
  })
  it('does not depend on the order of the valid years', () => {
    expect(monthNeighbours({ year: 2026, month: 1 }, [2027, 2025, 2026]).previous).toEqual({ year: 2025, month: 12 })
  })
  it('returns no neighbours at all for a year that is not valid', () => {
    expect(monthNeighbours({ year: 2030, month: 6 }, years)).toEqual({ previous: null, next: null })
  })
})

describe('groupMonthCosts', () => {
  const rent = recurring({ name: 'Rent', amount: 1200 })
  const gym = recurring({ name: 'Gym', amount: 30 })
  const lamp = purchase({ name: 'Lamp', amount: 90, date: `${YEAR}-03-15` })

  it('splits the costs by kind and keeps their order', () => {
    const result = groupMonthCosts([rent, lamp, gym])
    expect(result.recurring.map(cost => cost.name)).toEqual(['Rent', 'Gym'])
    expect(result.purchases.map(cost => cost.name)).toEqual(['Lamp'])
  })
  it('gives each group a subtotal that equals the sum of its rows', () => {
    const result = groupMonthCosts([rent, gym, lamp, purchase({ name: 'Desk', amount: 210, date: `${YEAR}-03-20` })])
    expect(result.recurringTotal).toBe(1230)
    expect(result.purchasesTotal).toBe(300)
  })
  it('makes the total the sum of both subtotals', () => {
    const result = groupMonthCosts([rent, gym, lamp])
    expect(result.total).toBe(result.recurringTotal + result.purchasesTotal)
    expect(result.total).toBe(1320)
  })
  it('returns an empty list and a subtotal of 0 for a group without entries', () => {
    const onlyRecurring = groupMonthCosts([rent])
    expect(onlyRecurring.purchases).toEqual([])
    expect(onlyRecurring.purchasesTotal).toBe(0)
    const onlyPurchases = groupMonthCosts([lamp])
    expect(onlyPurchases.recurring).toEqual([])
    expect(onlyPurchases.recurringTotal).toBe(0)
  })
  it('returns two empty groups and a total of 0 for no costs', () => {
    expect(groupMonthCosts([])).toEqual({ recurring: [], purchases: [], recurringTotal: 0, purchasesTotal: 0, total: 0 })
  })
  it('keeps the id of stored items', () => {
    const storedRent: Stored<RecurringCost> = { ...rent, id: 4 }
    const storedLamp: Stored<Purchase> = { ...lamp, id: 4 }
    const result = groupMonthCosts([storedRent, storedLamp])
    expect(result.recurring[0]?.id).toBe(4)
    expect(result.purchases[0]?.id).toBe(4)
  })
  it('does not change the list it is given', () => {
    const costs = [rent, lamp, gym]
    groupMonthCosts(costs)
    expect(costs.map(cost => cost.name)).toEqual(['Rent', 'Lamp', 'Gym'])
  })
  it('adds amounts with cents the same way as the monthly total, so the two are equal', () => {
    const recurringCosts = [recurring({ amount: 10.1 }), recurring({ amount: 20.2 })]
    const purchases = [purchase({ amount: 0.1, date: `${YEAR}-03-15` }), purchase({ amount: 0.2, date: `${YEAR}-03-16` })]
    const grouped = groupMonthCosts(costsInMonth(recurringCosts, purchases, YEAR, 3))
    expect(grouped.total).toBe(monthlyTotals(recurringCosts, purchases, YEAR)[2])
  })
  it('equals the matching entry of monthlyTotals for a month with a yearly cost', () => {
    const recurringCosts = [recurring({ amount: 100 }), recurring({ amount: 600, interval: 'yearly', dueMonth: 3 })]
    const purchases = [purchase({ amount: 300, date: `${YEAR}-03-15` }), purchase({ amount: 999, date: `${YEAR}-04-15` })]
    const grouped = groupMonthCosts(costsInMonth(recurringCosts, purchases, YEAR, 3))
    expect(grouped.recurringTotal).toBe(700)
    expect(grouped.purchasesTotal).toBe(300)
    expect(grouped.total).toBe(monthlyTotals(recurringCosts, purchases, YEAR)[2])
  })
})

describe('monthCategoryTotals', () => {
  const rent = recurring({ name: 'Rent', amount: 1200, category: 'housing' })
  const power = recurring({ name: 'Power', amount: 80.5, category: 'housing' })
  const groceries = purchase({ name: 'Groceries', amount: 310.25, category: 'food' })
  const ticket = recurring({ name: 'Ticket', amount: 49, category: 'mobility' })

  it('adds up the amounts of each category', () => {
    expect(monthCategoryTotals([rent, groceries, power])).toEqual([
      { category: 'housing', total: 1280.5 },
      { category: 'food', total: 310.25 }
    ])
  })
  it('leaves out categories without costs', () => {
    const categories = monthCategoryTotals([rent, ticket]).map(entry => entry.category)
    expect(categories).toEqual(['housing', 'mobility'])
    expect(categories).not.toContain('insurance')
  })
  it('sorts the categories by total, largest first', () => {
    const categories = monthCategoryTotals([ticket, groceries, rent]).map(entry => entry.category)
    expect(categories).toEqual(['housing', 'food', 'mobility'])
  })
  it('keeps the order of CATEGORIES for equal totals', () => {
    const insurance = recurring({ amount: 50, category: 'insurance' })
    const food = purchase({ amount: 50, category: 'food' })
    const appliances = purchase({ amount: 50, category: 'appliances' })
    const expected = CATEGORIES.filter(category => ['insurance', 'food', 'appliances'].includes(category))
    expect(monthCategoryTotals([appliances, insurance, food]).map(entry => entry.category)).toEqual(expected)
  })
  it('returns an empty list for a month without costs', () => {
    expect(monthCategoryTotals([])).toEqual([])
  })
  it('adds up to the month total from monthlyTotals', () => {
    const recurringCosts = [
      recurring({ amount: 10.1, category: 'housing' }),
      recurring({ amount: 600.3, category: 'insurance', interval: 'yearly', dueMonth: 3 }),
      recurring({ amount: 90.2, category: 'mobility', interval: 'quarterly', dueMonth: 1 })
    ]
    const purchases = [
      purchase({ amount: 0.1, category: 'food', date: `${YEAR}-03-15` }),
      purchase({ amount: 0.2, category: 'housing', date: `${YEAR}-03-16` }),
      purchase({ amount: 999, category: 'appliances', date: `${YEAR}-04-15` })
    ]
    const totals = monthCategoryTotals(costsInMonth(recurringCosts, purchases, YEAR, 3))
    const sum = totals.reduce((acc, entry) => acc + entry.total, 0)
    // The sums are added in a different order than in monthlyTotals, so they can differ below a cent.
    expect(sum).toBeCloseTo(monthlyTotals(recurringCosts, purchases, YEAR)[2]!, 2)
    expect(totals.map(entry => entry.category)).not.toContain('appliances')
  })
  it('does not change the list it is given', () => {
    const costs = [ticket, rent, groceries]
    monthCategoryTotals(costs)
    expect(costs.map(cost => cost.name)).toEqual(['Ticket', 'Rent', 'Groceries'])
  })
})

describe('largestCosts', () => {
  const names = (costs: { name: string }[]) => costs.map(cost => cost.name)
  const five = [
    recurring({ name: 'Gym', amount: 30 }),
    purchase({ name: 'Desk', amount: 210 }),
    recurring({ name: 'Rent', amount: 1200 }),
    purchase({ name: 'Lamp', amount: 90 }),
    recurring({ name: 'Phone', amount: 25 }),
  ]

  it('sorts by amount, largest first', () => {
    expect(names(largestCosts(five))).toEqual(['Rent', 'Desk', 'Lamp', 'Gym'])
  })
  it('returns four costs by default and drops the smallest', () => {
    const result = largestCosts(five)
    expect(result).toHaveLength(4)
    expect(names(result)).not.toContain('Phone')
  })
  it('returns the number of costs that is asked for', () => {
    expect(names(largestCosts(five, 2))).toEqual(['Rent', 'Desk'])
    expect(largestCosts(five, 5)).toHaveLength(5)
  })
  it('returns all costs, sorted, when there are fewer than n', () => {
    expect(names(largestCosts([five[0]!, five[2]!]))).toEqual(['Rent', 'Gym'])
    expect(largestCosts(five, 10)).toHaveLength(5)
  })
  it('returns an empty list for no costs', () => {
    expect(largestCosts([])).toEqual([])
  })
  it('puts a recurring cost before a purchase of the same amount', () => {
    const tie = [
      purchase({ name: 'Aardvark', amount: 100 }),
      recurring({ name: 'Zebra', amount: 100 }),
    ]
    expect(names(largestCosts(tie))).toEqual(['Zebra', 'Aardvark'])
  })
  it('sorts costs of the same amount and kind by name', () => {
    const tie = [
      recurring({ name: 'Water', amount: 50 }),
      recurring({ name: 'Gas', amount: 50 }),
      recurring({ name: 'Electricity', amount: 50 }),
    ]
    expect(names(largestCosts(tie))).toEqual(['Electricity', 'Gas', 'Water'])
  })
  it('lets the amount decide before the kind and the name', () => {
    const mixed = [
      recurring({ name: 'Zebra', amount: 10 }),
      purchase({ name: 'Aardvark', amount: 20 }),
    ]
    expect(names(largestCosts(mixed))).toEqual(['Aardvark', 'Zebra'])
  })
  it('sorts the names the same way whatever the order of the input', () => {
    const tie = [
      recurring({ name: 'b', amount: 5 }),
      recurring({ name: 'a', amount: 5 }),
      recurring({ name: 'c', amount: 5 }),
    ]
    expect(names(largestCosts(tie))).toEqual(names(largestCosts([...tie].reverse())))
  })
  it('keeps the id of stored items', () => {
    const stored: Stored<RecurringCost>[] = [{ ...recurring({ name: 'Rent', amount: 1200 }), id: 7 }]
    expect(largestCosts(stored)[0]?.id).toBe(7)
  })
  it('does not change the list it is given', () => {
    const costs = [...five]
    largestCosts(costs)
    expect(names(costs)).toEqual(['Gym', 'Desk', 'Rent', 'Lamp', 'Phone'])
  })
})

describe('monthSummary', () => {
  const rent = recurring({ name: 'Rent', amount: 1200 })
  const gym = recurring({ name: 'Gym', amount: 30 })
  const lamp = purchase({ name: 'Lamp', amount: 90, date: `${YEAR}-03-15` })
  const desk = purchase({ name: 'Desk', amount: 210, date: `${YEAR}-03-20` })
  const march = 3 as Month

  it('lists the costs of the month like costsInMonth', () => {
    const result = monthSummary([rent, gym], [lamp, desk], YEAR, march)
    expect(result.costs).toEqual(costsInMonth([rent, gym], [lamp, desk], YEAR, march))
  })
  it('groups the same list by kind and its total equals the matching entry of monthlyTotals', () => {
    const result = monthSummary([rent, gym], [lamp, desk], YEAR, march)
    expect(result.groups).toEqual(groupMonthCosts(result.costs))
    expect(result.groups.total).toBe(monthlyTotals([rent, gym], [lamp, desk], YEAR)[2])
  })
  it('compares with the month before like monthChange', () => {
    const february = purchase({ name: 'Heater', amount: 500, date: `${YEAR}-02-10` })
    const result = monthSummary([rent], [lamp, february], YEAR, march)
    expect(result.change).toEqual(monthChange([rent], [lamp, february], YEAR, march))
    expect(result.change.previous).toBe(1700)
  })
  it('compares January with December of the year before', () => {
    const december = purchase({ name: 'Gift', amount: 400, date: `${YEAR - 1}-12-20` })
    const result = monthSummary([], [december], YEAR, 1)
    expect(result.change.previous).toBe(400)
    expect(result.change.current).toBe(0)
  })
  it('has no percentage when the month before cost nothing', () => {
    expect(monthSummary([], [lamp], YEAR, march).change.percent).toBeNull()
  })
  it('returns the four largest costs of the month like largestCosts', () => {
    const extra = [1, 2, 3].map(index => purchase({ name: `Extra ${index}`, amount: index, date: `${YEAR}-03-0${index}` }))
    const result = monthSummary([rent, gym], [lamp, desk, ...extra], YEAR, march)
    expect(result.largest).toEqual(largestCosts(result.costs))
    expect(result.largest).toHaveLength(4)
    expect(result.largest.map(cost => cost.name)).toEqual(['Rent', 'Desk', 'Lamp', 'Gym'])
  })
  it('is empty for a month without costs, and not empty otherwise', () => {
    const empty = monthSummary([], [lamp], YEAR, 5)
    expect(empty.empty).toBe(true)
    expect(empty.costs).toEqual([])
    expect(empty.largest).toEqual([])
    expect(empty.groups.total).toBe(0)
    expect(monthSummary([], [lamp], YEAR, march).empty).toBe(false)
  })
  it('keeps the id of stored items', () => {
    const storedRent: Stored<RecurringCost> = { ...rent, id: 7 }
    const storedLamp: Stored<Purchase> = { ...lamp, id: 8 }
    const result = monthSummary([storedRent], [storedLamp], YEAR, march)
    expect(result.groups.recurring[0]?.id).toBe(7)
    expect(result.groups.purchases[0]?.id).toBe(8)
    expect(result.largest.map(cost => cost.id)).toEqual([7, 8])
  })
  it('counts the costs of the month, recurring and purchases together', () => {
    const result = monthSummary([rent, gym], [lamp, desk], YEAR, march)
    expect(result.count).toBe(4)
    expect(result.count).toBe(result.costs.length)
  })
  it('counts business costs of both kinds', () => {
    const businessGym = recurring({ name: 'Gym', amount: 30, business: true })
    const businessDesk = purchase({ name: 'Desk', amount: 210, date: `${YEAR}-03-20`, business: true })
    const result = monthSummary([rent, businessGym], [lamp, businessDesk], YEAR, march)
    expect(result.count).toBe(4)
    expect(result.businessCount).toBe(2)
  })
  it('counts only business costs that fall in the month', () => {
    const businessFebruary = purchase({ name: 'Printer', amount: 150, date: `${YEAR}-02-10`, business: true })
    const businessYearly = recurring({ name: 'Domain', amount: 20, interval: 'yearly', dueMonth: 6, business: true })
    const result = monthSummary([rent, businessYearly], [lamp, businessFebruary], YEAR, march)
    expect(result.count).toBe(2)
    expect(result.businessCount).toBe(0)
  })
  it('counts zero costs and zero business costs for an empty month', () => {
    const result = monthSummary([], [lamp], YEAR, 5)
    expect(result.count).toBe(0)
    expect(result.businessCount).toBe(0)
  })
  it('totals the costs of the month per category like monthCategoryTotals', () => {
    const ticket = recurring({ name: 'Ticket', amount: 49, category: 'mobility' })
    const result = monthSummary([rent, ticket], [lamp, desk], YEAR, march)
    expect(result.categories).toEqual(monthCategoryTotals(result.costs))
    expect(result.categories).toEqual([{ category: 'housing', total: 1500 }, { category: 'mobility', total: 49 }])
  })
  it('has no category totals for an empty month', () => {
    expect(monthSummary([], [lamp], YEAR, 5).categories).toEqual([])
  })
  it('does not change its input', () => {
    const recurringList = [rent, gym]
    const purchaseList = [lamp, desk]
    monthSummary(recurringList, purchaseList, YEAR, march)
    expect(recurringList).toEqual([rent, gym])
    expect(purchaseList).toEqual([lamp, desk])
  })
})
