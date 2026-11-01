import { describe, it, expect, beforeEach } from 'vitest'

// useState keeps its values for the whole test run: start every test from a fresh state.
beforeEach(() => {
  clearNuxtState(['year', 'currentYear'])
})

describe('useYear', () => {
  it('knows the current year', () => {
    const { currentYear } = useYear()
    expect(currentYear.value).toBe(new Date().getUTCFullYear())
  })
  it('selects the current year by default', () => {
    const { year, currentYear } = useYear()
    expect(year.value).toBe(currentYear.value)
  })
  it('changes the selected year without changing the current year', () => {
    const { year, currentYear } = useYear()
    const today = currentYear.value
    year.value = 2024
    expect(year.value).toBe(2024)
    expect(currentYear.value).toBe(today)
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
})
