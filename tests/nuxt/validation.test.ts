import { describe, it, expect } from 'vitest'
import { createRecurringCostSchema } from '~~/shared/utils/validation'

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
