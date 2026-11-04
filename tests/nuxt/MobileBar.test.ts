import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MobileBar from '~/components/MobileBar.vue'

type Mounted = Awaited<ReturnType<typeof mountSuspended>>

afterEach(async () => {
  useCostDialog().close()
  await useNuxtApp().$i18n.setLocale('en')
})

const thisMonthPath = () => {
  const { currentYear, currentMonth } = useYear()
  return `/months/${currentYear.value}/${String(currentMonth.value).padStart(2, '0')}`
}
const bar = (route = '/') => mountSuspended(MobileBar, { route })
const tabs = (wrapper: Mounted) => wrapper.findAll('nav a')

describe('MobileBar', () => {
  it('is one navigation with an accessible name', async () => {
    const wrapper = await bar()
    expect(wrapper.findAll('nav')).toHaveLength(1)
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Main nav')
  })
  it('has three tabs: Dashboard, Costs and Month, in that order', async () => {
    expect(tabs(await bar()).map(tab => tab.text())).toEqual(['Dashboard', 'Costs', 'Month'])
  })
  it('makes every tab a real link', async () => {
    const wrapper = await bar()
    expect(tabs(wrapper).map(tab => tab.element.tagName)).toEqual(['A', 'A', 'A'])
    expect(tabs(wrapper).map(tab => tab.attributes('href'))).toEqual(['/', '/costs', thisMonthPath()])
  })
  it('gives every tab an icon that is hidden from assistive technology', async () => {
    for (const tab of tabs(await bar())) {
      expect(tab.find('.iconify').attributes('aria-hidden'), tab.text()).toBe('true')
    }
  })
  it('has German tab names', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await bar()
    expect(tabs(wrapper).map(tab => tab.text())).toEqual(['Dashboard', 'Kosten', 'Monat'])
    expect(wrapper.find('nav').attributes('aria-label')).toBe('Hauptnavigation')
  })
  it('is fixed at the bottom and hidden from the lg breakpoint up, where the sidebar takes over', async () => {
    const wrapper = await bar()
    const row = wrapper.find('nav').element.parentElement!
    expect(row.classList.contains('fixed')).toBe(true)
    expect(row.classList.contains('lg:hidden')).toBe(true)
  })
})

describe('MobileBar add button', () => {
  const addButton = (wrapper: Mounted) => wrapper.find('button.mobile-add')
  const dialogState = () => {
    const { open, cost, month } = useCostDialog()
    return { open: open.value, cost: cost.value, month: month.value }
  }

  it('is a round icon button next to the tabs, named "Add cost", with a hidden plus icon', async () => {
    const wrapper = await bar('/costs')
    expect(addButton(wrapper).exists()).toBe(true)
    expect(addButton(wrapper).attributes('aria-label')).toBe('Add cost')
    expect(addButton(wrapper).text()).toBe('')
    expect(addButton(wrapper).find('.iconify').attributes('aria-hidden')).toBe('true')
  })
  it('is named after the month on a month page', async () => {
    const wrapper = await bar('/months/2026/11')
    expect(addButton(wrapper).attributes('aria-label')).toBe('Add cost to November 2026')
  })
  it('keeps the plain name on the pages that are not a month page', async () => {
    expect(await addButton(await bar('/')).attributes('aria-label')).toBe('Add cost')
    expect(await addButton(await bar('/costs')).attributes('aria-label')).toBe('Add cost')
  })
  it('has German names, with the month in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(addButton(await bar('/costs')).attributes('aria-label')).toBe('Kosten hinzufügen')
    expect(addButton(await bar('/months/2026/03')).attributes('aria-label')).toBe('Kosten zu März 2026 hinzufügen')
  })
  it('asks for an empty add dialog on a page that is not a month page', async () => {
    const wrapper = await bar('/costs')
    await addButton(wrapper).trigger('click')
    expect(dialogState()).toEqual({ open: true, cost: null, month: null })
  })
  it('asks for an add dialog for the shown month on a month page', async () => {
    const wrapper = await bar('/months/2026/11')
    await addButton(wrapper).trigger('click')
    expect(dialogState()).toEqual({ open: true, cost: null, month: { year: 2026, month: 11 } })
  })
  it('is not there while the dialog is open and comes back when it closes', async () => {
    const wrapper = await bar('/costs')
    useCostDialog().openAdd()
    await nextTick()
    expect(addButton(wrapper).exists()).toBe(false)
    useCostDialog().close()
    await nextTick()
    expect(addButton(wrapper).exists()).toBe(true)
  })
  it('does not hide the tabs while the dialog is open', async () => {
    const wrapper = await bar('/costs')
    useCostDialog().openAdd()
    await nextTick()
    expect(tabs(wrapper)).toHaveLength(3)
  })
})

// The current tab (`aria-current="page"`, set by NuxtLink) is not tested here: the router of the test environment does not
// report a link as active, not even after a push. It was checked in the browser: Costs is current on /costs, Month on
// the page of today's month, and no tab on another month page (the same rule as the sidebar, see DefaultLayout.test.ts).
