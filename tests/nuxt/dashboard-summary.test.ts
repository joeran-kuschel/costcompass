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

describe('dashboard page summary tiles', () => {
  const year = new Date().getUTCFullYear()
  // Annual: 800 x 12 + 1,200 + 300 = 11,100; business 1,200; household 9,900; average 925.
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
  const summarySection = () => wrapper.find('section[aria-labelledby="summary-title"]')
  // label, value and sub line of each tile (spaces normalised: German puts a no-break space before the euro sign and the percent sign)
  const tiles = () => cards().map(item => ({
    label: item.find('dt').text().replace(/\s/g, ' '),
    value: item.findAll('dd')[0]?.text().replace(/\s/g, ' '),
    sub: item.findAll('dd')[1]?.text().replace(/\s/g, ' '),
  }))
  const cards = () => wrapper.findAll('section[aria-labelledby="summary-title"] dl > div')

  it('shows a heading "Your year" for the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(summarySection().find('h2').exists()).toBe(true))
    expect(summarySection().find('h2').text()).toBe(`Your year ${year}`)
  })
  it('labels the summary section with its heading', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(summarySection().find('h2').exists()).toBe(true))
    expect(summarySection().attributes('aria-labelledby')).toBe(summarySection().find('h2').attributes('id'))
  })
  it('puts the four figures in one card, in the order total, average, household, business', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    expect(summarySection().findAll('.card')).toHaveLength(1)
    expect(tiles().map(item => item.label)).toEqual(['Annual total', 'Average', 'Household', 'Business'])
  })
  it('shows the values in whole euros', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    expect(tiles().map(item => item.value)).toEqual(['€11,100', '€925', '€9,900', '€1,200'])
  })
  it('shows a sub line under each figure, with the shares of household and business', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    // 1,200 of 11,100 is 10.8%, so business 11% and household 89%.
    expect(tiles().map(item => item.sub)).toEqual(['per year', 'per month', '89% of the year', '11% of the year'])
  })
  it('makes the two shares add up to 100', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    const [household, business] = tiles().slice(2).map(item => Number(item.sub?.match(/\d+/)?.[0]))
    expect(household! + business!).toBe(100)
  })
  it('hides the coloured dots from assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    const dots = summarySection().findAll('dt span')
    expect(dots).toHaveLength(4)
    for (const dot of dots) {
      expect(dot.attributes('aria-hidden')).toBe('true')
      expect(dot.text()).toBe('')
    }
  })
  it('counts only the purchases of the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    // The 500 from last year would make the total 11,600.
    expect(tiles()[0]!.value).not.toContain('11,600')
  })
  it('has the year select next to the heading, with its visible label', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    const row = summarySection().find('h2').element.parentElement!
    expect(row.querySelector('label')?.textContent).toBe('Year')
    expect(row.querySelector('button, select, [role="combobox"]')).not.toBeNull()
  })
  it('is German with German texts and number formatting when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    expect(summarySection().find('h2').text()).toBe(`Dein Jahr ${year}`)
    expect(tiles()).toEqual([
      { label: 'Jahressumme', value: '11.100 €', sub: 'pro Jahr' },
      { label: 'Durchschnitt', value: '925 €', sub: 'pro Monat' },
      { label: 'Haushalt', value: '9.900 €', sub: '89 % vom Jahr' },
      { label: 'Geschäftlich', value: '1.200 €', sub: '11 % vom Jahr' },
    ])
  })
  it('shows no tiles while the lists are loading', async () => {
    costs()
    api.purchases.delay = 300
    await mountPage()
    expect(cards()).toHaveLength(0)
    await vi.waitFor(() => expect(cards()).toHaveLength(4), { timeout: 2000 })
  })
  it('shows no tiles when loading fails', async () => {
    costs()
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(cards()).toHaveLength(0)
  })
  it('shows no tiles when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(cards()).toHaveLength(0)
  })
})

describe('dashboard page category rows', () => {
  const year = new Date().getUTCFullYear()
  // housing 800 x 12 = 9,600; insurance 1,200; appliances 300 (last year's 500 does not count); food and mobility 0.
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
  const section = () => wrapper.find('section[aria-labelledby="categories-title"]')
  const rows = () => section().findAll('li')
  const plain = (text: string) => text.replace(/\u00A0/g, ' ')
  // name, amount and percentage of each row, spaces normalised (German puts a no-break space before the euro and the percent sign)
  const parts = () => rows().map(row => ({
    name: plain(row.find('span.flex-1').text()),
    amount: plain(row.find('b').text()),
    percent: plain(row.find('span.text-muted').text()),
  }))

  it('has the heading "Where your money goes" that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const heading = section().find('h2')
    expect(heading.text()).toBe('Where your money goes')
    expect(section().attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })
  it('shows one row per category, the largest first, with name and amount in whole euros', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(parts().map(row => [row.name, row.amount])).toEqual([['Housing', '€9,600'], ['Insurance', '€1,200'], ['Appliances', '€300'], ['Food', '€0'], ['Mobility', '€0']])
  })
  it('shows the share of the total under the amount, adding up to 100%', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    // 9,600 / 1,200 / 300 of 11,100 are 86.49%, 10.81% and 2.70%: rounded down 86 + 10 + 2 = 98, the two points go to the largest remainders
    expect(parts().map(row => row.percent)).toEqual(['86%', '11%', '3%', '0%', '0%'])
    expect(parts().reduce((total, row) => total + parseInt(row.percent), 0)).toBe(100)
  })
  it('has no bar per row any more', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    for (const row of rows()) expect(row.find('[style*="width"]').exists()).toBe(false)
  })
  it('shows a hidden category badge of 36 px in every row', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    for (const row of rows()) {
      const badge = row.find('.category-disc')
      expect(badge.attributes('aria-hidden')).toBe('true')
      expect(badge.attributes('style')).toContain('--category-size: 36px')
    }
  })
  it('counts only the purchases of the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    // Last year's 500 must not count: it would make the appliances 800.
    expect(parts().find(row => row.name === 'Appliances')?.amount).toBe('€300')
  })
  // The bar above the list: one segment per category, hidden when the category is 0%.
  const bar = () => section().find('div[aria-hidden="true"]')
  const segments = () => Array.from(bar().element.children) as HTMLElement[]
  const visibleSegments = () => segments().filter(segment => segment.style.display !== 'none')

  it('shows a decorative bar above the list, without any text', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(bar().exists()).toBe(true)
    expect(bar().text()).toBe('')
    expect(bar().element.compareDocumentPosition(section().find('ul').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('sizes the segments by the share of the total, in the order of the list', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    // 86%, 11% and 3% as in the list below
    expect(visibleSegments().map(segment => segment.style.width)).toEqual(['86%', '11%', '3%'])
  })
  it('colours every segment with the colour token of its category', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(visibleSegments().map(segment => segment.className)).toEqual([
      'bg-[var(--category-housing)]',
      'bg-[var(--category-insurance)]',
      'bg-[var(--category-appliances)]',
    ])
  })
  it('has no visible segment for a category with 0%', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(segments()).toHaveLength(5)
    expect(visibleSegments()).toHaveLength(3)
  })
  it('shows an empty track when the year has no costs', async () => {
    // only a purchase of last year: the current year has no costs
    api.purchases.rows = [{ id: 4, kind: 'purchase', name: 'Old laptop', amount: 500, category: 'appliances', business: true, date: `${year - 1}-03-15` }]
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(bar().exists()).toBe(true)
    expect(visibleSegments()).toHaveLength(0)
  })
  it('lists the rows in a list', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(section().find('ul').exists()).toBe(true)
  })
  it('is German with German names and number formatting when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(section().find('h2').text()).toBe('Wo Dein Geld hin geht')
    expect(parts()).toEqual([
      { name: 'Wohnen', amount: '9.600 €', percent: '86 %' },
      { name: 'Versicherung', amount: '1.200 €', percent: '11 %' },
      { name: 'Geräte', amount: '300 €', percent: '3 %' },
      { name: 'Essen', amount: '0 €', percent: '0 %' },
      { name: 'Mobilität', amount: '0 €', percent: '0 %' },
    ])
  })
  it('shows no category section while the lists are loading', async () => {
    costs()
    api.purchases.delay = 300
    await mountPage()
    expect(section().exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no category section when loading fails', async () => {
    costs()
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(section().exists()).toBe(false)
  })
  it('shows no category section when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(section().exists()).toBe(false)
  })
})

describe('dashboard page household versus business split', () => {
  const year = new Date().getUTCFullYear()
  // total 11,100, business 1,200: 10.8% business, so 89% household and 11% business.
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
  const section = () => wrapper.find('section[aria-labelledby="split-title"]')
  const ring = () => section().find('[role="img"]')
  const ringStyle = () => ring().attributes('style') ?? ''
  const centre = () => ring().findAll('span').map(span => span.text())
  // name and amount of each row, spaces normalised (German puts a no-break space before the euro sign)
  const rows = () => section().findAll('li').map(item => item.findAll('span').map(span => span.text().replace(/\s+/g, ' ').trim()).filter(Boolean).join(' '))

  it('has the heading "Household and business" that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe('Household and business')
    expect(section().attributes('aria-labelledby')).toBe(section().find('h2').attributes('id'))
  })
  it('gives the ring a text alternative with both percentages', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ring().attributes('aria-label')).toBe('Household 89 percent, business 11 percent')
  })
  it('shows the household percentage and the word in the middle of the ring', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(centre()).toEqual(['89%', 'Household'])
  })
  it('lists household and business with their amounts in euros', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(2))
    // 11,100 in total, 1,200 of it business
    expect(rows()).toEqual(['Household €9,900', 'Business €1,200'])
  })
  it('hides the icons of the rows from assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(2))
    const icons = section().findAll('li [class*="lucide"]')
    expect(icons).toHaveLength(2)
    for (const icon of icons) expect(icon.attributes('aria-hidden')).toBe('true')
  })
  it('paints the ring with the household and the business colour and a gap between them', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ringStyle()).toContain('conic-gradient')
    expect(ringStyle()).toContain('var(--ui-primary)')
    expect(ringStyle()).toContain('var(--ui-warning)')
    expect(ringStyle()).toContain('var(--ui-bg-elevated)')
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(section().find('h2').text()).toBe('Haushalt und Geschäftliches')
    expect(ring().attributes('aria-label')).toBe('Haushalt 89 Prozent, Geschäftlich 11 Prozent')
    expect(centre()).toEqual(['89%', 'Haushalt'])
    expect(rows()).toEqual(['Haushalt 9.900 €', 'Geschäftlich 1.200 €'])
  })
  it('draws a full household ring without a gap when there are no business costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ringStyle()).toContain('var(--ui-primary)')
    expect(ringStyle()).not.toContain('var(--ui-warning)')
    expect(ringStyle()).not.toContain('var(--ui-bg-elevated)')
    expect(centre()[0]).toBe('100%')
    expect(rows()).toEqual(['Household €9,600', 'Business €0'])
  })
  it('draws a full business ring without a gap when every cost is a business cost', async () => {
    api.recurring.rows = [{ ...rent, business: true }]
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ringStyle()).toContain('var(--ui-warning)')
    expect(ringStyle()).not.toContain('var(--ui-primary)')
    expect(ringStyle()).not.toContain('var(--ui-bg-elevated)')
    expect(centre()[0]).toBe('0%')
    expect(rows()).toEqual(['Household €0', 'Business €9,600'])
  })
  it('draws an empty ring and 0 percent when the year has no costs', async () => {
    // Only a purchase of last year: the lists are not empty, but this year's total is 0.
    api.purchases.rows = [{ id: 4, kind: 'purchase', name: 'Old laptop', amount: 500, category: 'appliances', business: true, date: `${year - 1}-03-15` }]
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ringStyle()).toContain('var(--ui-bg-accented)')
    expect(ringStyle()).not.toContain('var(--ui-primary)')
    expect(ringStyle()).not.toContain('var(--ui-warning)')
    expect(ring().attributes('aria-label')).toBe('Household 0 percent, business 0 percent')
    expect(centre()[0]).toBe('0%')
    expect(rows()).toEqual(['Household €0', 'Business €0'])
  })
  it('keeps both colours in the ring when one share is only 1 percent', async () => {
    // 1 of 100 is business: the gaps must not swallow the thin segment
    api.recurring.rows = [
      { ...rent, amount: 99 / 12 },
      { ...rent, id: 5, amount: 1 / 12, business: true },
    ]
    await mountPage()
    await vi.waitFor(() => expect(ring().exists()).toBe(true))
    expect(ring().attributes('aria-label')).toBe('Household 99 percent, business 1 percent')
    expect(ringStyle()).toContain('var(--ui-primary)')
    expect(ringStyle()).toContain('var(--ui-warning)')
  })
  it('shows no split section while the lists are loading', async () => {
    costs()
    api.purchases.delay = 300
    await mountPage()
    expect(section().exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no split section when loading fails', async () => {
    costs()
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(section().exists()).toBe(false)
  })
  it('shows no split section when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(section().exists()).toBe(false)
  })
})
