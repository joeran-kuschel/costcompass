import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'
import LogoMark from '~/components/LogoMark.vue'

describe('LogoMark', () => {
  it('is a decorative image that is neither read nor focusable', async () => {
    const wrapper = await mountSuspended(LogoMark)
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('focusable')).toBe('false')
    expect(wrapper.text()).toBe('')
  })
  it('takes its colour from the primary colour variable, so it follows light and dark mode', async () => {
    const wrapper = await mountSuspended(LogoMark)
    const fills = wrapper.findAll('circle').map(circle => circle.attributes('fill'))
    expect(fills.filter(fill => fill === 'var(--ui-primary)')).toHaveLength(2)
  })
})

describe('default layout header title', () => {
  const title = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.find('header [data-slot="title"]')
  it('is one link to the dashboard that shows the mark and the app name', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = title(wrapper)
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toBe('Costcompass')
    expect(link.find('svg').exists()).toBe(true)
  })
  it('is named by the app name only, the mark adds nothing', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = title(wrapper)
    expect(link.attributes('aria-label')).toBe('Costcompass')
    expect(link.find('svg').attributes('aria-hidden')).toBe('true')
  })
})

describe('default layout navigation', () => {
  // The links of the header navigation (the desktop one; the mobile menu is not open).
  const navLinks = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.findAll('header nav a')
  const thisMonthPath = () => {
    const { currentYear, currentMonth } = useYear()
    return `/months/${currentYear.value}/${String(currentMonth.value).padStart(2, '0')}`
  }
  it('has Dashboard, Costs and This month, in that order', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(navLinks(wrapper).map(link => link.text())).toEqual(['Dashboard', 'Costs', 'This month'])
  })
  it('links "This month" to the month page of today, with a two-digit month', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = navLinks(wrapper).find(item => item.text() === 'This month')!
    expect(link.attributes('href')).toBe(thisMonthPath())
    expect(link.attributes('href')).toMatch(/^\/months\/\d{4}\/\d{2}$/)
  })
  // Decision for #56: "This month" is the current item only on the page of today's month, not on every month page.
  const currentLinks = async (route: string) => {
    const wrapper = await mountSuspended(DefaultLayout, { route })
    return navLinks(wrapper).filter(link => link.attributes('aria-current') === 'page').map(link => link.text())
  }
  it('marks "This month" as the current item on the month page of today', async () => {
    expect(await currentLinks(thisMonthPath())).toEqual(['This month'])
  })
  it('does not mark "This month" on another month page, and then no item is current', async () => {
    expect(await currentLinks('/months/2020/01')).toEqual([])
  })
  it('does not mark "This month" on the same month of another year', async () => {
    const { currentMonth } = useYear()
    expect(await currentLinks(`/months/2020/${String(currentMonth.value).padStart(2, '0')}`)).toEqual([])
  })
  it('marks Dashboard and Costs on their own pages and not "This month"', async () => {
    expect(await currentLinks('/')).toEqual(['Dashboard'])
    expect(await currentLinks('/costs')).toEqual(['Costs'])
  })
  it('has German names', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await mountSuspended(DefaultLayout)
    expect(navLinks(wrapper).map(link => link.text())).toEqual(['Dashboard', 'Kosten', 'Dieser Monat'])
    await useNuxtApp().$i18n.setLocale('en')
  })
})
