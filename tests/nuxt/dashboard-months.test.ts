import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { api, registerDashboardEndpoints, rent, resetDashboardState, setLanguage } from './helpers/dashboard'

registerDashboardEndpoints()

let wrapper: VueWrapper

async function mountPage() {
  wrapper = await mountSuspended(DashboardPage)
}
const status = () => wrapper.find('[role="status"]')
const alert = () => wrapper.find('[role="alert"]')

beforeEach(resetDashboardState)
afterEach(async () => {
  wrapper.unmount()
  useCostDialog().close()
  await setLanguage('en')
})

describe('dashboard page costs per month', () => {
  const year = new Date().getUTCFullYear()
  // 800 rent in every month, March also has the 1,200 insurance and the 300 lamp: 2,300.
  const costs = () => {
    api.recurring.rows = [
      rent,
      { id: 3, kind: 'recurring', name: 'Insurance', amount: 1200, category: 'insurance', business: true, interval: 'yearly', dueMonth: 3 },
    ]
    api.purchases.rows = [
      { id: 2, kind: 'purchase', name: 'Lamp', amount: 300, category: 'appliances', business: false, date: `${year}-03-15` },
      { id: 4, kind: 'purchase', name: 'Old laptop', amount: 500, category: 'appliances', business: true, date: `${year - 1}-03-15` },
    ]
  }
  const section = () => wrapper.find('section[aria-labelledby="months-title"]')
  const items = () => section().findAll('li')
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim()
  const spoken = () => items().map(item => clean(item.find('.sr-only').text()))
  const heights = () => items().map(item => /height:\s*([0-9.]+%)/.exec(item.find('[style]').attributes('style') ?? '')?.[1])

  it('has the heading "Month by month" that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe('Month by month')
  })
  it('lists twelve months in calendar order', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const spokenMonths = spoken().map(text => text.split(':')[0])
    expect(spokenMonths[0]).toBe('January')
    expect(spokenMonths[11]).toBe('December')
  })
  it('gives every month its total as text for assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(spoken()[0]).toBe('January: €800')
    expect(spoken()[2]).toBe('March: €2,300')
  })
  it('sizes the bars relative to the largest month', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const expected = `${(800 / 2300) * 100}%`
    expect(heights()[2]).toBe('100%')
    expect(heights()[0]).toBe(expected)
  })
  it('hides the bars and the short labels from assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const hidden = items()[0]!.findAll('[aria-hidden="true"]')
    // the short value, the bar and the month label
    expect(hidden).toHaveLength(3)
    expect(hidden[0]!.text()).toBe('800')
    expect(hidden[2]!.text()).toBe('Jan')
  })
  // the short value above each bar
  const values = () => items().map(item => item.find('span.tabular-nums').text())

  it('shows a short value above every bar, whole euros below 1,000 and thousands with a k', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    // January 800, March 2,300
    expect(values()[0]).toBe('800')
    expect(values()[2]).toBe('2.3k')
  })
  it('keeps the full amount in the hidden text of the link, so the short value adds nothing for assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(spoken()[2]).toBe('March: €2,300')
    expect(items()[2]!.find('.sr-only').text()).not.toContain('2.3k')
    expect(items()[2]!.find('span.tabular-nums').attributes('aria-hidden')).toBe('true')
  })
  it('shows whole thousands without a decimal and rounds to one decimal', async () => {
    api.purchases.rows = [
      { id: 2, kind: 'purchase', name: 'Desk', amount: 2000, category: 'appliances', business: false, date: `${year}-03-15` },
      { id: 3, kind: 'purchase', name: 'Chair', amount: 12640, category: 'appliances', business: false, date: `${year}-04-15` },
      { id: 4, kind: 'purchase', name: 'Lamp', amount: 999.6, category: 'appliances', business: false, date: `${year}-05-15` },
    ]
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(values()[2]).toBe('2k')
    expect(values()[3]).toBe('12.6k')
    // 999.6 rounds up to 1,000: it must read 1k, not 1,000
    expect(values()[4]).toBe('1k')
  })
  it('shows 0 for a month without costs and keeps its baseline', async () => {
    api.purchases.rows = [{ id: 2, kind: 'purchase', name: 'Desk', amount: 2000, category: 'appliances', business: false, date: `${year}-03-15` }]
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(values()[0]).toBe('0')
    expect(items()[0]!.find('.min-h-0\\.5').exists()).toBe(true)
  })
  it('writes the short values the German way, with a decimal comma', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(values()[0]).toBe('800')
    expect(values()[2]).toBe('2,3k')
  })
  it('shows the hint under the heading, translated', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(section().text()).toContain('Select a month to open it')
  })
  // the bar of each month: a 32 px pill
  const bars = () => items().map(item => item.find('[style*="height"]'))

  it('draws the bars as 32 px pills', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    for (const bar of bars()) {
      expect(bar.classes()).toContain('w-8')
      expect(bar.classes()).toContain('rounded-full')
    }
  })
  it('colours the current month cobalt and the other months with the soft chart colour', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const current = new Date().getUTCMonth()
    bars().forEach((bar, index) => {
      expect(bar.classes().includes('bg-primary'), `month ${index + 1}`).toBe(index === current)
      expect(bar.classes().includes('bg-[var(--chart-soft)]'), `month ${index + 1}`).toBe(index !== current)
    })
  })
  it('does not highlight the current month by colour alone: its label and value are bold', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const current = items()[new Date().getUTCMonth()]!
    expect(current.find('span.tabular-nums').classes()).toContain('font-bold')
    expect(current.findAll('span.text-xs').at(-1)!.classes()).toContain('font-bold')
  })
  it('puts the short value of the current month in bold and the others in the muted colour', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const current = new Date().getUTCMonth()
    items().forEach((item, index) => {
      const value = item.find('span.tabular-nums')
      expect(value.classes().includes('font-bold'), `month ${index + 1}`).toBe(index === current)
      expect(value.classes().includes('text-muted'), `month ${index + 1}`).toBe(index !== current)
    })
  })
  it('marks the current month in bold, not by colour alone', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    const bold = items().flatMap((item, index) => item.find('.font-bold').exists() ? [index] : [])
    expect(bold).toEqual([new Date().getUTCMonth()])
  })
  it('shows a thin baseline for a month without costs', async () => {
    api.purchases.rows = [
      { id: 2, kind: 'purchase', name: 'Lamp', amount: 300, category: 'appliances', business: false, date: `${year}-03-15` },
    ]
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(heights()[0]).toBe('0%')
    expect(items()[0]!.find('[style]').classes()).toContain('min-h-0.5')
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(items()).toHaveLength(12))
    expect(section().find('h2').text()).toBe('Monat für Monat')
    expect(section().text()).toContain('Monat auswählen, um ihn zu öffnen')
    expect(spoken()[0]).toBe('Januar: 800 €')
    expect(spoken()[2]).toBe('März: 2.300 €')
  })
  it('shows no month section while the lists are loading', async () => {
    costs()
    api.purchases.delay = 300
    await mountPage()
    expect(section().exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no month section when loading fails', async () => {
    costs()
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(section().exists()).toBe(false)
  })
  it('shows no month section when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(section().exists()).toBe(false)
  })
})

describe('dashboard page month bar links', () => {
  const year = new Date().getUTCFullYear()
  const costs = () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [
      { id: 2, kind: 'purchase', name: 'Lamp', amount: 300, category: 'appliances', business: false, date: `${year}-03-15` },
      { id: 4, kind: 'purchase', name: 'Old laptop', amount: 500, category: 'appliances', business: true, date: `${year - 1}-03-15` },
    ]
  }
  const section = () => wrapper.find('section[aria-labelledby="months-title"]')
  const items = () => section().findAll('li')
  const links = () => section().findAll('li a')
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim()
  const pad = (month: number) => String(month).padStart(2, '0')
  async function mountWithCosts() {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
  }

  it('makes every one of the twelve bars a link to its month page, with a two-digit month', async () => {
    await mountWithCosts()
    expect(links()).toHaveLength(12)
    expect(links().map(link => link.attributes('href'))).toEqual(
      Array.from({ length: 12 }, (_, index) => `/months/${year}/${pad(index + 1)}`),
    )
  })
  it('uses real links, one in each list item', async () => {
    await mountWithCosts()
    expect(items()).toHaveLength(12)
    for (const item of items()) {
      expect(item.findAll('a')).toHaveLength(1)
      expect(item.find('a').element.tagName).toBe('A')
    }
  })
  it('names each link after the month and its amount, and hides the bar and the short label', async () => {
    await mountWithCosts()
    const march = links()[2]!
    // 800 rent plus the 300 lamp
    expect(clean(march.find('.sr-only').text())).toBe('March: €1,100')
    expect(march.findAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2)
    expect(links()[0]!.find('.sr-only').text()).toContain('January')
  })
  it('links to the months of the selected year', async () => {
    await mountWithCosts()
    const { year: selected } = useYear()
    selected.value = year - 1
    await vi.waitFor(() => expect(links()[0]!.attributes('href')).toBe(`/months/${year - 1}/01`))
    expect(links()[11]!.attributes('href')).toBe(`/months/${year - 1}/12`)
  })
  it('names the month in German', async () => {
    await setLanguage('de')
    await mountWithCosts()
    expect(clean(links()[2]!.find('.sr-only').text())).toContain('März')
    expect(links()[2]!.attributes('href')).toBe(`/months/${year}/03`)
  })
  it('shows a visible focus indicator on keyboard focus', async () => {
    await mountWithCosts()
    for (const link of links()) expect(link.classes()).toEqual(expect.arrayContaining(['focus-visible:outline-2', 'focus-visible:outline-primary']))
  })
  // jsdom has no layout, so the 24 px target can only be checked through the classes that create it.
  it('gives every column at least 44 px and lets the chart scroll sideways when they do not fit', async () => {
    await mountWithCosts()
    const list = section().find('ol')
    expect(list.classes()).toContain('grid-cols-[repeat(12,minmax(2.75rem,1fr))]')
    expect(list.element.parentElement!.classList.contains('overflow-x-auto')).toBe(true)
  })
  it('lets the link fill its column, so the bars keep their width', async () => {
    await mountWithCosts()
    for (const item of items()) {
      expect(item.classes()).not.toContain('flex')
      expect(item.find('a').classes()).toContain('flex')
    }
  })
})
