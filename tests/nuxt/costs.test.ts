import { describe, it, expect } from 'vitest'
import type { CostItem } from '~~/shared/types/calculation'
import { totalAnnualCost } from '~~/shared/utils/costs'

describe('totalAnnualCost', () => {
  it('sums monthly and yearly items per year', () => {
    const items: CostItem[] = [
      { name: 'Software', amount: 100, interval: 'monthly' },
      { name: 'Insurance', amount: 600, interval: 'yearly' },
    ]

    expect(totalAnnualCost(items)).toBe(1800)
  })
  it ('returns 0 for an empty list', () => {
    const items: CostItem[] = []
    expect (totalAnnualCost(items)).toBe(0)
  })
  it ('sums only monthly items', () => {
    const items: CostItem[] = [
      { name: 'Software', amount: 100, interval: 'monthly' },
      { name: 'Insurance', amount: 200, interval: 'monthly' },
    ]

    expect(totalAnnualCost(items)).toBe(3600)
  })
  it ('sums only yearly items', () => {
    const items: CostItem[] = [
      { name: 'Software', amount: 100, interval: 'yearly' },
      { name: 'Insurance', amount: 200, interval: 'yearly' },
    ]

    expect(totalAnnualCost(items)).toBe(300)
  })
})
