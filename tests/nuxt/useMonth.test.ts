import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

// useMonth needs the i18n context of a component, so it is called from the setup of a small probe component.
let monthName: ReturnType<typeof useMonth>['monthName']
let monthYear: ReturnType<typeof useMonth>['monthYear']
let monthPath: ReturnType<typeof useMonth>['monthPath']
const Probe = defineComponent({
  setup() {
    ({ monthName, monthYear, monthPath } = useMonth())
    return () => null
  },
})

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

beforeEach(async () => {
  wrapper = await mountSuspended(Probe)
})
afterEach(async () => {
  wrapper.unmount()
  await useNuxtApp().$i18n.setLocale('en')
})

describe('monthName in English', () => {
  it('returns the full name by default', () => {
    expect(monthName(1)).toBe('January')
    expect(monthName(10)).toBe('October')
    expect(monthName(12)).toBe('December')
  })
  it('returns the short name on request', () => {
    expect(monthName(1, 'short')).toBe('Jan')
    expect(monthName(9, 'short')).toBe('Sep')
  })
  it('names all twelve months without repeating one', () => {
    const names = Array.from({ length: 12 }, (_, index) => monthName(index + 1))
    expect(new Set(names).size).toBe(12)
  })
})

describe('monthName in German', () => {
  it('returns German names, including the umlaut', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(monthName(1)).toBe('Januar')
    expect(monthName(3)).toBe('März')
    expect(monthName(10)).toBe('Oktober')
  })
  it('follows the language when it is switched after the helper was created', async () => {
    expect(monthName(3)).toBe('March')
    await useNuxtApp().$i18n.setLocale('de')
    expect(monthName(3)).toBe('März')
    await useNuxtApp().$i18n.setLocale('en')
    expect(monthName(3)).toBe('March')
  })
})

describe('monthYear', () => {
  it('returns the month and the year in English', () => {
    expect(monthYear(2026, 10)).toBe('October 2026')
  })
  it('returns the month and the year in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(monthYear(2026, 10)).toBe('Oktober 2026')
  })
  // Only a time zone west of UTC can shift the first of a month back; run with TZ=America/Los_Angeles to see it.
  it('keeps the first of a month in that month', () => {
    expect(monthYear(2026, 1)).toBe('January 2026')
    expect(monthYear(2026, 12)).toBe('December 2026')
  })
  it('uses the given year', () => {
    expect(monthYear(2025, 12)).toBe('December 2025')
    expect(monthYear(2027, 1)).toBe('January 2027')
  })
})

describe('monthPath', () => {
  it('pads a single-digit month to two digits', () => {
    expect(monthPath(2026, 3)).toBe('/months/2026/03')
    expect(monthPath(2026, 1)).toBe('/months/2026/01')
  })
  it('keeps a two-digit month as it is', () => {
    expect(monthPath(2026, 11)).toBe('/months/2026/11')
    expect(monthPath(2026, 12)).toBe('/months/2026/12')
  })
  it('uses the given year', () => {
    expect(monthPath(2025, 9)).toBe('/months/2025/09')
  })
})
