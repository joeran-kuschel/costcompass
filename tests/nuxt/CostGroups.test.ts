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
    expect(totals).toEqual(['€9,690', '€1,201'])
  })
  it('counts only purchases of the given year in the purchases total', async () => {
    await mount(COSTS, 2025)
    expect(wrapper.findAll('section')[1]!.find('div > p').text()).toBe('€0')
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
    items(2)[0]!.onSelect()
    expect(wrapper.emitted('edit')).toEqual([[COSTS[1]]])
    expect(wrapper.emitted('delete')).toBeUndefined()
  })
  it('emits delete with the cost of the row', async () => {
    await mount()
    items(1)[1]!.onSelect()
    expect(wrapper.emitted('delete')).toEqual([[COSTS[2]]])
    expect(wrapper.emitted('edit')).toBeUndefined()
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
