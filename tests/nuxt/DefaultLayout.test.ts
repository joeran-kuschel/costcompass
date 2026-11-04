import { describe, it, expect, afterEach } from 'vitest'
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

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en')
})

// The sidebar replaces the header: logo and name, the add button, the navigation and the language select.
type Mounted = Awaited<ReturnType<typeof mountSuspended>>
const sidebar = (wrapper: Mounted) => wrapper.find('[data-slot="root"][data-variant="sidebar"]')

describe('default layout sidebar title', () => {
  const title = (wrapper: Mounted) => sidebar(wrapper).find('[data-slot="title"] a')
  it('is one link to the dashboard that shows the mark and the app name', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = title(wrapper)
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toBe('Costcompass')
    expect(link.find('svg').exists()).toBe(true)
  })
  it('is named by the app name only, the mark adds nothing', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(title(wrapper).find('svg').attributes('aria-hidden')).toBe('true')
    expect(title(wrapper).text()).toBe('Costcompass')
  })
})

describe('default layout navigation', () => {
  // The sidebar's navigation; the tab bar for phones has its own (see MobileBar.test.ts).
  const nav = (wrapper: Mounted) => sidebar(wrapper).find('nav')
  const navLinks = (wrapper: Mounted) => sidebar(wrapper).findAll('nav a')
  const thisMonthPath = () => {
    const { currentYear, currentMonth } = useYear()
    return `/months/${currentYear.value}/${String(currentMonth.value).padStart(2, '0')}`
  }
  it('has a navigation with an accessible name in the sidebar', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(nav(wrapper).attributes('aria-label')).toBe('Main nav')
  })
  it('has a second navigation for phones, the tab bar, with the same name: only one of the two is shown at a time', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const navs = wrapper.findAll('nav')
    expect(navs).toHaveLength(2)
    expect(navs.map(item => item.attributes('aria-label'))).toEqual(['Main nav', 'Main nav'])
  })
  it('shows the sidebar from the lg breakpoint up and the tab bar below it', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(sidebar(wrapper).classes()).toEqual(expect.arrayContaining(['hidden', 'lg:block']))
    const bar = wrapper.findAll('nav').find(item => item.classes().includes('mobile-tabs'))!
    expect(bar.element.parentElement!.classList.contains('lg:hidden')).toBe(true)
  })
  it('has Dashboard, Costs and This month, in that order, each with a hidden icon', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(navLinks(wrapper).map(link => link.text())).toEqual(['Dashboard', 'Costs', 'This month'])
    for (const link of navLinks(wrapper)) {
      expect(link.find('.iconify').attributes('aria-hidden'), link.text()).toBe('true')
    }
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
    expect(nav(wrapper).attributes('aria-label')).toBe('Hauptnavigation')
    await useNuxtApp().$i18n.setLocale('en')
  })
})

describe('default layout add cost button', () => {
  const addButton = (wrapper: Mounted) => sidebar(wrapper).findAll('button').find(button => button.text() === 'Add cost')!
  it('is in the sidebar, above the navigation, with a hidden plus icon', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const html = sidebar(wrapper).html()
    expect(addButton(wrapper)).toBeTruthy()
    expect(html.indexOf('Add cost')).toBeLessThan(html.indexOf('<nav'))
    expect(addButton(wrapper).find('.iconify').attributes('aria-hidden')).toBe('true')
  })
  it('asks for an empty add dialog when it is pressed', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    await addButton(wrapper).trigger('click')
    const { open, cost, month } = useCostDialog()
    expect({ open: open.value, cost: cost.value, month: month.value }).toEqual({ open: true, cost: null, month: null })
    useCostDialog().close()
  })
  it('has a German name', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await mountSuspended(DefaultLayout)
    expect(sidebar(wrapper).findAll('button').some(button => button.text() === 'Kosten hinzufügen')).toBe(true)
    await useNuxtApp().$i18n.setLocale('en')
  })
})

describe('default layout skip link and main area', () => {
  it('has a skip link to the main area as the very first element', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const first = wrapper.find('a')
    expect(first.attributes('href')).toBe('#main')
    expect(first.text()).toBe('Skip to content')
    expect(wrapper.find('main').attributes('id')).toBe('main')
  })
  it('hides the skip link until it has focus', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    expect(wrapper.find('a[href="#main"]').classes()).toContain('sr-only')
  })
  it('has a German skip link', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await mountSuspended(DefaultLayout)
    expect(wrapper.find('a[href="#main"]').text()).toBe('Zum Inhalt springen')
    await useNuxtApp().$i18n.setLocale('en')
  })
  it('keeps the keyboard order: skip link, logo, add cost, navigation, language, then the page', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const order = wrapper.findAll('a, button, [role="combobox"]').map(item => item.text())
    expect(order.slice(0, 7)).toEqual(['Skip to content', 'Costcompass', 'Add cost', 'Dashboard', 'Costs', 'This month', 'English'])
  })
})

describe('default layout language select', () => {
  it('is at the bottom of the sidebar with a visible label', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const footer = sidebar(wrapper).find('[data-slot="footer"]')
    expect(footer.find('label').text()).toBe('Language')
    expect(footer.find('[role="combobox"]').exists()).toBe(true)
  })
})
