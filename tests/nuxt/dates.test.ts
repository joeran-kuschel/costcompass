import { describe, it, expect } from 'vitest'
import type { Month } from '~~/shared/types/calculation'
import { MONTHS } from '~~/shared/types/calculation'
import { monthDateRange } from '~~/shared/utils/dates'

describe('monthDateRange', () => {
  it('returns the first and the last day of a month with 31 days', () => {
    expect(monthDateRange({ year: 2026, month: 10 })).toEqual({ first: '2026-10-01', last: '2026-10-31' })
  })
  it('returns the last day of a month with 30 days', () => {
    expect(monthDateRange({ year: 2026, month: 4 }).last).toBe('2026-04-30')
    expect(monthDateRange({ year: 2026, month: 11 }).last).toBe('2026-11-30')
  })
  it('pads a single-digit month', () => {
    expect(monthDateRange({ year: 2026, month: 3 })).toEqual({ first: '2026-03-01', last: '2026-03-31' })
  })
  it('handles the first and the last month of the year', () => {
    expect(monthDateRange({ year: 2026, month: 1 })).toEqual({ first: '2026-01-01', last: '2026-01-31' })
    expect(monthDateRange({ year: 2026, month: 12 })).toEqual({ first: '2026-12-01', last: '2026-12-31' })
  })
  it('gives February 28 days in a normal year', () => {
    expect(monthDateRange({ year: 2026, month: 2 }).last).toBe('2026-02-28')
  })
  it('gives February 29 days in a leap year', () => {
    expect(monthDateRange({ year: 2028, month: 2 }).last).toBe('2028-02-29')
  })
  it('follows the century rule for leap years', () => {
    expect(monthDateRange({ year: 2100, month: 2 }).last).toBe('2100-02-28')
    expect(monthDateRange({ year: 2000, month: 2 }).last).toBe('2000-02-29')
  })
  it('always starts on the first day', () => {
    for (const month of MONTHS) expect(monthDateRange({ year: 2026, month }).first).toBe(`2026-${String(month).padStart(2, '0')}-01`)
  })
  it('ends on the day before the first of the next month, for every month and across years', () => {
    for (const year of [2025, 2026, 2028]) {
      for (const month of MONTHS) {
        const next = new Date(Date.UTC(year, month, 1))
        const dayBefore = new Date(next.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        expect(monthDateRange({ year, month: month as Month }).last).toBe(dayBefore)
      }
    }
  })
})
