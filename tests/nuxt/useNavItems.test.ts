import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

// useNavItems needs the i18n context of a component, so it is called from the setup of a small probe component.
let items: ReturnType<typeof useNavItems>['items']
const Probe = defineComponent({
  setup() {
    ({ items } = useNavItems())
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

describe('useNavItems', () => {
  it('has Dashboard, Costs and This month, in that order', () => {
    expect(items.value.map(item => item.label)).toEqual(['Dashboard', 'Costs', 'This month'])
  })
  it('has a short label for the tab bar, which is only shorter for the month', () => {
    expect(items.value.map(item => item.shortLabel)).toEqual(['Dashboard', 'Costs', 'Month'])
  })
  it('links to the dashboard, the costs page and the month page of today with a two-digit month', () => {
    const { currentYear, currentMonth } = useYear()
    const path = `/months/${currentYear.value}/${String(currentMonth.value).padStart(2, '0')}`
    expect(items.value.map(item => item.to)).toEqual(['/', '/costs', path])
  })
  it('gives every item its own Lucide icon', () => {
    const icons = items.value.map(item => item.icon)
    for (const icon of icons) expect(icon).toMatch(/^i-lucide-[a-z-]+$/)
    expect(new Set(icons).size).toBe(icons.length)
  })
  it('has German labels that follow a language switch, without a reload', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(items.value.map(item => item.label)).toEqual(['Dashboard', 'Kosten', 'Dieser Monat'])
    expect(items.value.map(item => item.shortLabel)).toEqual(['Dashboard', 'Kosten', 'Monat'])
  })
})
