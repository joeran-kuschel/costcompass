import { describe, it, expect } from 'vitest'
import {
  createRecurringCostSchema,
  createPurchaseSchema,
  idParamsSchema,
  monthParamsSchema,
  patchRecurringCostSchema,
  patchPurchaseSchema,
} from '~~/shared/utils/validation'

function input(overrides: Record<string, unknown> = {}) {
  return { name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly', ...overrides }
}

describe('createRecurringCostSchema', () => {
  it('accepts a valid monthly cost', () => {
    expect(createRecurringCostSchema.safeParse(input()).success).toBe(true)
  })
  it('accepts a yearly cost with a due month', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'yearly', dueMonth: 3 })).success).toBe(true)
  })
  it('accepts a quarterly cost with a due month', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'quarterly', dueMonth: 2 })).success).toBe(true)
  })
  it('rejects a yearly cost without a due month', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'yearly' })).success).toBe(false)
  })
  it('rejects a quarterly cost without a due month', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'quarterly' })).success).toBe(false)
  })
  it('rejects a due month outside 1 to 12', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'yearly', dueMonth: 0 })).success).toBe(false)
    expect(createRecurringCostSchema.safeParse(input({ interval: 'yearly', dueMonth: 13 })).success).toBe(false)
    expect(createRecurringCostSchema.safeParse(input({ interval: 'yearly', dueMonth: 2.5 })).success).toBe(false)
  })
  it('drops a due month on a monthly cost', () => {
    const result = createRecurringCostSchema.safeParse(input({ dueMonth: 5 }))
    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty('dueMonth')
  })
  it('rejects an unknown category', () => {
    expect(createRecurringCostSchema.safeParse(input({ category: 'holidays' })).success).toBe(false)
  })
  it('rejects an unknown or missing interval', () => {
    expect(createRecurringCostSchema.safeParse(input({ interval: 'weekly' })).success).toBe(false)
    expect(createRecurringCostSchema.safeParse(input({ interval: undefined })).success).toBe(false)
  })
  it('rejects an amount of 0 or less', () => {
    expect(createRecurringCostSchema.safeParse(input({ amount: 0 })).success).toBe(false)
    expect(createRecurringCostSchema.safeParse(input({ amount: -5 })).success).toBe(false)
  })
  it('rejects an empty name', () => {
    expect(createRecurringCostSchema.safeParse(input({ name: '   ' })).success).toBe(false)
  })
  it('rejects an amount sent as a string', () => {
    expect(createRecurringCostSchema.safeParse(input({ amount: '800' })).success).toBe(false)
  })
})

function purchaseInput(overrides: Record<string, unknown> = {}) {
  return { name: 'Fridge', amount: 499.99, category: 'appliances', business: false, date: '2026-10-29', ...overrides }
}

describe('createPurchaseSchema', () => {
  it('accepts a valid purchase', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput()).success).toBe(true)
  })
  it('rejects a missing date', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput({ date: undefined })).success).toBe(false)
  })
  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput({ date: '29.10.2026' })).success).toBe(false)
  })
  it('rejects a date that does not exist', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput({ date: '2026-02-30' })).success).toBe(false)
    expect(createPurchaseSchema.safeParse(purchaseInput({ date: '2026-13-01' })).success).toBe(false)
  })
  it('rejects an unknown category', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput({ category: 'holidays' })).success).toBe(false)
  })
  it('rejects an amount of 0 or less', () => {
    expect(createPurchaseSchema.safeParse(purchaseInput({ amount: 0 })).success).toBe(false)
    expect(createPurchaseSchema.safeParse(purchaseInput({ amount: -5 })).success).toBe(false)
  })
})

describe('idParamsSchema', () => {
  it('converts a numeric string to a number', () => {
    const result = idParamsSchema.safeParse({ id: '6' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 6 })
  })
  it('rejects zero and negative ids', () => {
    expect(idParamsSchema.safeParse({ id: '0' }).success).toBe(false)
    expect(idParamsSchema.safeParse({ id: '-3' }).success).toBe(false)
  })
  it('rejects non-numeric and fractional ids', () => {
    expect(idParamsSchema.safeParse({ id: 'abc' }).success).toBe(false)
    expect(idParamsSchema.safeParse({ id: '1.5' }).success).toBe(false)
  })
  it('rejects a missing id', () => {
    expect(idParamsSchema.safeParse({}).success).toBe(false)
  })
})

describe('patchRecurringCostSchema', () => {
  it('accepts a single field', () => {
    expect(patchRecurringCostSchema.safeParse({ amount: 15 }).success).toBe(true)
  })
  it('accepts interval and due month together', () => {
    expect(patchRecurringCostSchema.safeParse({ interval: 'yearly', dueMonth: 4 }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(patchRecurringCostSchema.safeParse({}).success).toBe(false)
  })
  it('rejects invalid values', () => {
    expect(patchRecurringCostSchema.safeParse({ amount: -1 }).success).toBe(false)
    expect(patchRecurringCostSchema.safeParse({ category: 'holidays' }).success).toBe(false)
    expect(patchRecurringCostSchema.safeParse({ interval: 'weekly' }).success).toBe(false)
    expect(patchRecurringCostSchema.safeParse({ dueMonth: 13 }).success).toBe(false)
  })
  it('does not check the interval and due month rule on its own', () => {
    // the rule is enforced after merging with the stored row (updateRecurringCost)
    expect(patchRecurringCostSchema.safeParse({ interval: 'yearly' }).success).toBe(true)
  })
})

describe('patchPurchaseSchema', () => {
  it('accepts a single field', () => {
    expect(patchPurchaseSchema.safeParse({ name: 'Renamed' }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(patchPurchaseSchema.safeParse({}).success).toBe(false)
  })
  it('rejects invalid values', () => {
    expect(patchPurchaseSchema.safeParse({ date: '2026-13-01' }).success).toBe(false)
    expect(patchPurchaseSchema.safeParse({ amount: 0 }).success).toBe(false)
  })
})

describe('monthParamsSchema', () => {
  it('accepts a valid month and year and returns them as numbers', () => {
    expect(monthParamsSchema.parse({ year: '2026', month: '03' })).toEqual({ year: 2026, month: 3 })
    expect(monthParamsSchema.parse({ year: '2026', month: '10' })).toEqual({ year: 2026, month: 10 })
  })
  it('accepts the first and the last month', () => {
    expect(monthParamsSchema.safeParse({ year: '2026', month: '01' }).success).toBe(true)
    expect(monthParamsSchema.safeParse({ year: '2026', month: '12' }).success).toBe(true)
  })
  it('rejects a month outside 1 to 12', () => {
    expect(monthParamsSchema.safeParse({ year: '2026', month: '00' }).success).toBe(false)
    expect(monthParamsSchema.safeParse({ year: '2026', month: '13' }).success).toBe(false)
  })
  it('rejects a month without the leading zero, so each month has one address', () => {
    expect(monthParamsSchema.safeParse({ year: '2026', month: '0' }).success).toBe(false)
    expect(monthParamsSchema.safeParse({ year: '2026', month: '3' }).success).toBe(false)
  })
  it('rejects a month that is not a plain number', () => {
    for (const month of ['abc', '', ' 3', '3.5', '-1', '1e0', '003']) {
      expect(monthParamsSchema.safeParse({ year: '2026', month }).success).toBe(false)
    }
  })
  it('rejects a year that is not four digits', () => {
    for (const year of ['abc', '', '26', '20266', '-2026', '2026.5', ' 2026']) {
      expect(monthParamsSchema.safeParse({ year, month: '03' }).success).toBe(false)
    }
  })
  it('rejects missing params', () => {
    expect(monthParamsSchema.safeParse({ year: '2026' }).success).toBe(false)
    expect(monthParamsSchema.safeParse({ month: '03' }).success).toBe(false)
  })
})
