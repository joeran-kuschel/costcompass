import { describe, it, expect, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CostGroups from '~/components/CostGroups.vue'

const YEAR = 2026

function recurring(overrides: Partial<Stored<RecurringCost>> = {}): Stored<RecurringCost> {
  return { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly', ...overrides }
}
function purchase(overrides: Partial<Stored<Purchase>> = {}): Stored<Purchase> {
  return { id: 2, kind: 'purchase', name: 'Laptop', amount: 1200.5, category: 'appliances', business: true, date: '2026-03-14', ...overrides }
}

const COSTS: Stored<Cost>[] = [
  recurring(),
  purchase(),
  recurring({ id: 4, name: 'Liability insurance', amount: 90, category: 'insurance', interval: 'yearly', dueMonth: 3 }),
]

let wrapper: Awaited<ReturnType<typeof mountSuspended>>
const mount = async (costs: Stored<Cost>[] = COSTS, year = YEAR) => {
  wrapper = await mountSuspended(CostGroups, { props: { costs, year } })
  return wrapper
}
afterEach(() => wrapper?.unmount())

type MenuItem = { label: string, onSelect: () => void }
// The menu content is only rendered once it is open; the items handed to it are what the user can pick.
const menus = () => wrapper.findAllComponents({ name: 'UDropdownMenu' })
const items = (index: number) => menus()[index]!.props('items') as MenuItem[]
// Choosing an item only takes effect once the menu has closed; Reka then sends closeAutoFocus.
const choose = (index: number, item: number) => {
  items(index)[item]!.onSelect()
  ;(menus()[index]!.props('content') as { onCloseAutoFocus: () => void }).onCloseAutoFocus()
}

describe('CostGroups sections', () => {
  it('shows recurring costs first, then purchases, each heading with its count', async () => {
    await mount()
    const headings = wrapper.findAll('section h2').map(h => h.text())
    expect(headings).toHaveLength(2)
    expect(headings[0]).toMatch(/· 2$/)
    expect(headings[1]).toMatch(/· 1$/)
  })
  it('labels each section by its heading', async () => {
    await mount()
    for (const section of wrapper.findAll('section')) {
      const id = section.attributes('aria-labelledby')
      expect(section.find(`h2#${id}`).exists()).toBe(true)
    }
  })
  it('keeps the input order inside a section', async () => {
    await mount()
    const names = wrapper.findAll('section')[0]!.findAll('li').map(li => li.text())
    expect(names[0]).toContain('Rent')
    expect(names[1]).toContain('Liability insurance')
  })
  it('totals the recurring costs per year and the purchases of the given year', async () => {
    await mount()
    const totals = wrapper.findAll('section').map(s => s.find('div > p').text())
    expect(totals).toEqual(['€9,690 per year', '€1,201 in 2026'])
  })
  it('counts only purchases of the given year in the purchases total', async () => {
    await mount(COSTS, 2025)
    expect(wrapper.findAll('section')[1]!.find('div > p').text()).toBe('€0 in 2025')
  })
  it('adds the period to each total as text for screen readers only', async () => {
    await mount()
    const periods = wrapper.findAll('section').map(s => s.find('div > p span'))
    expect(periods.map(p => p.text())).toEqual(['per year', 'in 2026'])
    for (const period of periods) expect(period.classes()).toContain('sr-only')
  })
  it('translates the period of the totals', async () => {
    await mount()
    await useNuxtApp().$i18n.setLocale('de')
    try {
      await nextTick()
      const periods = wrapper.findAll('section').map(s => s.find('div > p span').text())
      expect(periods).toEqual(['pro Jahr', 'in 2026'])
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('leaves out a section without costs', async () => {
    await mount([purchase()])
    const sections = wrapper.findAll('section')
    expect(sections).toHaveLength(1)
    expect(sections[0]!.attributes('aria-labelledby')).toBe('purchases-title')
  })
  it('renders nothing when there are no costs', async () => {
    await mount([])
    expect(wrapper.findAll('section')).toHaveLength(0)
  })
  it('moves the amount under the name below 400 px', async () => {
    await mount()
    const amount = wrapper.find('li > p')
    expect(amount.text()).toBe('€800.00')
    expect(amount.classes()).toEqual(expect.arrayContaining(['col-start-2', 'row-start-2', 'min-[400px]:col-start-auto', 'min-[400px]:row-start-auto']))
  })
  it('marks business costs with the badge', async () => {
    await mount()
    const laptop = wrapper.findAll('li').find(li => li.text().includes('Laptop'))!
    const rent = wrapper.findAll('li').find(li => li.text().includes('Rent'))!
    expect(laptop.findComponent({ name: 'BusinessBadge' }).exists()).toBe(true)
    expect(rent.findComponent({ name: 'BusinessBadge' }).exists()).toBe(false)
  })
})

describe('CostGroups actions', () => {
  it('gives every row one actions button named after the cost', async () => {
    await mount()
    const labels = wrapper.findAll('li button').map(b => b.attributes('aria-label'))
    expect(labels).toEqual(['Actions for Rent', 'Actions for Liability insurance', 'Actions for Laptop'])
  })
  it('offers Edit before Delete', async () => {
    await mount()
    expect(items(0).map(item => item.label)).toEqual(['Edit', 'Delete'])
  })
  it('emits edit with the cost of the row', async () => {
    await mount()
    choose(2, 0)
    expect(wrapper.emitted('edit')).toEqual([[COSTS[1]]])
    expect(wrapper.emitted('delete')).toBeUndefined()
  })
  it('emits delete with the cost of the row', async () => {
    await mount()
    choose(1, 1)
    expect(wrapper.emitted('delete')).toEqual([[COSTS[2]]])
    expect(wrapper.emitted('edit')).toBeUndefined()
  })
  it('waits with the action until the menu has closed', async () => {
    await mount()
    items(0)[0]!.onSelect()
    expect(wrapper.emitted('edit')).toBeUndefined()
  })
  it('puts the focus back on the row button before the dialog opens', async () => {
    wrapper = await mountSuspended(CostGroups, { props: { costs: COSTS, year: YEAR }, attachTo: document.body })
    choose(2, 1)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Actions for Laptop')
    expect(wrapper.emitted('delete')).toEqual([[COSTS[1]]])
  })
  it('shows a primary focus ring on the row button', async () => {
    await mount()
    expect(wrapper.find('li button').classes()).toEqual(expect.arrayContaining(['focus-visible:outline-2', 'focus-visible:outline-primary']))
  })
  it('translates the actions', async () => {
    await mount()
    await useNuxtApp().$i18n.setLocale('de')
    try {
      await nextTick()
      expect(wrapper.find('li button').attributes('aria-label')).toBe('Aktionen für Rent')
      expect(items(0).map(item => item.label)).toEqual(['Editieren', 'Löschen'])
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
})
