import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// useState keeps its values for the whole test run: start every test from a fresh state.
beforeEach(() => {
  clearNuxtState(['year', 'today'])
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useYear', () => {
  it('knows the current year', () => {
    const { currentYear } = useYear()
    expect(currentYear.value).toBe(new Date().getUTCFullYear())
  })
  it('knows the current month as a number from 1 to 12', () => {
    const { currentMonth } = useYear()
    expect(currentMonth.value).toBe(new Date().getUTCMonth() + 1)
    expect(currentMonth.value).toBeGreaterThanOrEqual(1)
    expect(currentMonth.value).toBeLessThanOrEqual(12)
  })
  it('selects the current year by default', () => {
    const { year, currentYear } = useYear()
    expect(year.value).toBe(currentYear.value)
  })
  it('changes the selected year without changing the current year or month', () => {
    const { year, currentYear, currentMonth } = useYear()
    const today = { year: currentYear.value, month: currentMonth.value }
    year.value = 2024
    expect(year.value).toBe(2024)
    expect(currentYear.value).toBe(today.year)
    expect(currentMonth.value).toBe(today.month)
  })
  it('shares the selected year between callers, so it survives a page change', () => {
    useYear().year.value = 2025
    expect(useYear().year.value).toBe(2025)
  })
  it('starts from the current year again once the state is cleared', () => {
    useYear().year.value = 2025
    clearNuxtState('year')
    expect(useYear().year.value).toBe(new Date().getUTCFullYear())
  })
  it('takes year and month from the same moment, so New Year cannot split them', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T23:59:59.999Z'))
    const first = useYear()
    expect([first.currentYear.value, first.currentMonth.value]).toEqual([2026, 12])
    // a moment later it is already 2027, but "today" was read once and stays consistent
    vi.setSystemTime(new Date('2027-01-01T00:00:00.001Z'))
    const second = useYear()
    expect([second.currentYear.value, second.currentMonth.value]).toEqual([2026, 12])
  })
  it('reads the month in UTC, like the year', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-31T23:30:00.000Z'))
    expect(useYear().currentMonth.value).toBe(3)
  })
})
