import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { monthlyTotals } from '~~/shared/utils/costs'

// What each fake API endpoint does; reset before every test.
const api = {
  recurring: { delay: 0, fail: false, rows: [] as unknown[] },
  purchases: { delay: 0, fail: false, rows: [] as unknown[] },
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const respond = (endpoint: keyof typeof api) => async () => {
  await sleep(api[endpoint].delay)
  if (api[endpoint].fail) throw new Error('boom')
  return api[endpoint].rows
}
registerEndpoint('/api/recurring-costs', respond('recurring'))
registerEndpoint('/api/purchases', respond('purchases'))

const rent = { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' }

let wrapper: VueWrapper

async function mountPage() {
  wrapper = await mountSuspended(DashboardPage)
}
async function setLanguage(code: 'en' | 'de') {
  await useNuxtApp().$i18n.setLocale(code)
}
const status = () => wrapper.find('[role="status"]')
const alert = () => wrapper.find('[role="alert"]')

beforeEach(() => {
  api.recurring = { delay: 0, fail: false, rows: [] }
  api.purchases = { delay: 0, fail: false, rows: [] }
  // useFetch caches by URL; start every test without data from the previous one.
  clearNuxtData()
  // The selected year is shared state: every test starts on the current year.
  clearNuxtState(['year', 'today'])
})
afterEach(async () => {
  wrapper.unmount()
  useCostDialog().close()
  await setLanguage('en')
})

describe('dashboard page loading state', () => {
  it('shows an announced loading message while the lists load', async () => {
    api.recurring.delay = 300
    api.purchases.delay = 300
    await mountPage()
    expect(status().text()).toBe('Loading your costs…')
    expect(alert().exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No costs yet')
    await vi.waitFor(() => expect(status().exists()).toBe(false), { timeout: 2000 })
  })
  it('keeps loading until both lists have arrived', async () => {
    api.purchases.delay = 300
    await mountPage()
    await sleep(100)
    expect(status().exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No costs yet')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'), { timeout: 2000 })
  })
  it('always shows the page heading', async () => {
    api.recurring.delay = 300
    await mountPage()
    expect(wrapper.find('h1').text()).toBe('Dashboard')
  })
})

describe('dashboard page empty state', () => {
  it('explains that there are no costs and links to the costs page', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(wrapper.text()).toContain('Add a recurring cost or a purchase to see your totals here.')
    const add = wrapper.find('a[href="/costs"]')
    expect(add.exists()).toBe(true)
    expect(add.text()).toBe('Add cost')
    expect(status().exists()).toBe(false)
    expect(alert().exists()).toBe(false)
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Noch keine Kosten'))
    expect(wrapper.find('a[href="/costs"]').text()).toBe('Kosten hinzufügen')
  })
  it('does not show up once there are costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(wrapper.text()).not.toContain('No costs yet')
    expect(alert().exists()).toBe(false)
  })
  it('does not show up when only purchases exist', async () => {
    api.purchases.rows = [{ id: 2, kind: 'purchase', name: 'Laptop', amount: 1200, category: 'appliances', business: true, date: '2026-03-14' }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(wrapper.text()).not.toContain('No costs yet')
  })
})

describe('dashboard page error state', () => {
  it('shows an announced error with a retry button when the recurring costs fail', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Could not load your costs.')
    expect(alert().find('button').text()).toBe('Try again')
    expect(status().exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No costs yet')
  })
  it('shows the error when only the purchases fail', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Could not load your costs.')
  })
  it('loads again and recovers when "Try again" is pressed', async () => {
    api.recurring.fail = true
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.recurring.fail = false
    api.purchases.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(alert().exists()).toBe(false), { timeout: 2000 })
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
  })
  it('stays in the error state while the retry fails again', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    await alert().find('button').trigger('click')
    await sleep(100)
    expect(alert().exists()).toBe(true)
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Die Kosten konnten nicht geladen werden.')
    expect(alert().find('button').text()).toBe('Erneut versuchen')
  })
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
  const cards = () => wrapper.findAll('section[aria-labelledby="summary-title"] [data-slot="root"]').map(card => card.text().replace(/\u00A0/g, ' '))
  const tile = (label: string) => cards().find(text => text.startsWith(label))

  it('shows a summary heading for the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(wrapper.find('section[aria-labelledby="summary-title"] h2').exists()).toBe(true))
    expect(wrapper.find('section[aria-labelledby="summary-title"] h2').text()).toBe(`Summary for ${year}`)
  })
  it('labels the summary section with its heading', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(wrapper.find('section[aria-labelledby="summary-title"] h2').exists()).toBe(true))
    const section = wrapper.find('section[aria-labelledby="summary-title"]')
    expect(section.attributes('aria-labelledby')).toBe(wrapper.find('section[aria-labelledby="summary-title"] h2').attributes('id'))
  })
  it('shows the four tiles with the right values in whole euros', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    expect(tile('Annual total')).toContain('€11,100')
    expect(tile('Household')).toContain('€9,900')
    expect(tile('Business')).toContain('€1,200')
    expect(tile('Average per month')).toContain('€925')
  })
  it('counts only the purchases of the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    // The 500 from last year would make the total 11,600.
    expect(tile('Annual total')).not.toContain('11,600')
  })
  it('is German with German number formatting when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(cards()).toHaveLength(4))
    expect(wrapper.find('section[aria-labelledby="summary-title"] h2').text()).toBe(`Übersicht ${year}`)
    expect(tile('Jahressumme')).toContain('11.100 €')
    expect(tile('Haushalt')).toContain('9.900 €')
    expect(tile('Geschäftlich')).toContain('1.200 €')
    expect(tile('Durchschnitt pro Monat')).toContain('925 €')
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
  const rowTexts = () => rows().map(row => plain(row.text()))
  const widths = () => rows().map(row => /width:\s*([0-9.]+%)/.exec(row.find('span[style*="width"]').attributes('style') ?? '')?.[1])

  it('has a heading for the current year that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const heading = section().find('h2')
    expect(heading.text()).toBe(`Costs by category in ${year}`)
    expect(section().attributes('aria-labelledby')).toBe(heading.attributes('id'))
  })
  it('shows one row per category, the largest first, with name and amount in whole euros', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(rowTexts()).toEqual(['Housing€9,600', 'Insurance€1,200', 'Appliances€300', 'Food€0', 'Mobility€0'])
  })
  it('sizes every bar relative to the largest category', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    expect(widths()).toEqual(['100%', '12.5%', '3.125%', '0%', '0%'])
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
    expect(rowTexts()).toContain('Appliances€300')
    expect(rowTexts()).not.toContain('Appliances€800')
  })
  it('hides the bars from assistive technology, so a row reads as name and amount', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(rows()).toHaveLength(5))
    for (const row of rows()) {
      expect(row.find('[aria-hidden="true"]').exists()).toBe(true)
      expect(plain(row.find('[aria-hidden="true"]').text())).toBe('')
    }
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
    expect(section().find('h2').text()).toBe(`Kosten nach Kategorie ${year}`)
    expect(rowTexts()).toEqual(['Wohnen9.600 €', 'Versicherung1.200 €', 'Geräte300 €', 'Essen0 €', 'Mobilität0 €'])
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
  const bar = () => section().find('[role="img"]')
  const widths = () => bar().findAll('div').map(segment => /width:\s*([0-9.]+%)/.exec(segment.attributes('style') ?? '')?.[1])
  const legend = () => section().findAll('li').map(item => item.text().replace(/\s+/g, ' ').trim())

  it('has a heading for the current year that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`Household versus business in ${year}`)
    expect(section().attributes('aria-labelledby')).toBe(section().find('h2').attributes('id'))
  })
  it('gives the bar a text alternative with both percentages', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(bar().attributes('aria-label')).toBe('Household 89 percent, business 11 percent')
  })
  it('states the shares as text in the legend, so colour is not the only carrier', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(legend()).toHaveLength(2))
    expect(legend()).toEqual(['Household 89%', 'Business 11%'])
  })
  it('sizes the two bar segments by their percentages', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(widths()).toEqual(['89%', '11%'])
  })
  it('hides the colour swatches of the legend from assistive technology', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(legend()).toHaveLength(2))
    for (const item of section().findAll('li')) {
      expect(item.find('[aria-hidden="true"]').exists()).toBe(true)
    }
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`Haushalt und Geschäftliches ${year}`)
    expect(bar().attributes('aria-label')).toBe('Haushalt 89 Prozent, Geschäftlich 11 Prozent')
    expect(legend()).toEqual(['Haushalt 89%', 'Geschäftlich 11%'])
  })
  it('shows only a household segment when there are no business costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(widths()).toEqual(['100%'])
    expect(legend()).toEqual(['Household 100%', 'Business 0%'])
  })
  it('shows only a business segment when every cost is a business cost', async () => {
    api.recurring.rows = [{ ...rent, business: true }]
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(widths()).toEqual(['100%'])
    expect(legend()).toEqual(['Household 0%', 'Business 100%'])
  })
  it('shows an empty bar with 0 percent when the year has no costs', async () => {
    // Only a purchase of last year: the lists are not empty, but this year's total is 0.
    api.purchases.rows = [{ id: 4, kind: 'purchase', name: 'Old laptop', amount: 500, category: 'appliances', business: true, date: `${year - 1}-03-15` }]
    await mountPage()
    await vi.waitFor(() => expect(bar().exists()).toBe(true))
    expect(bar().findAll('div')).toHaveLength(0)
    expect(bar().attributes('aria-label')).toBe('Household 0 percent, business 0 percent')
    expect(legend()).toEqual(['Household 0%', 'Business 0%'])
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

  it('has a heading for the current year that labels the section', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`Costs per month in ${year}`)
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
    expect(hidden).toHaveLength(2)
    expect(hidden[1]!.text()).toBe('Jan')
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
    expect(section().find('h2').text()).toBe(`Kosten pro Monat ${year}`)
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

describe('dashboard page this month card', () => {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const previousYear = month === 1 ? year - 1 : year
  const previousMonth = month === 1 ? 12 : month - 1
  const dateIn = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-15`
  const monthName = (locale: string, m: number) => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 1)))
  const lamp = (id: number, amount: number, date: string) => ({ id, kind: 'purchase', name: 'Lamp', amount, category: 'appliances', business: false, date })
  const section = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  const comparison = () => section().findAll('p')[1]!.text().replace(/\s+/g, ' ').trim()

  it('has a heading with the current month and year that labels the section', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`This month · ${monthName('en', month)} ${year}`)
  })
  it('shows the total of the current month in whole euros', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().text()).toContain('€1,100')
  })
  it('says in words that the month costs more than the previous month', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 400, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    // 1,200 against 800
    expect(comparison()).toBe(`50% more than ${monthName('en', previousMonth)}`)
  })
  it('says in words that the month costs less than the previous month', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 800, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    // 800 against 1,600
    expect(comparison()).toBe(`50% less than ${monthName('en', previousMonth)}`)
  })
  it('says the month is the same when both months cost the same', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(comparison()).toBe(`Same as ${monthName('en', previousMonth)}`)
  })
  it('shows a neutral text and no percentage when the previous month cost nothing', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(comparison()).toBe(`No costs in ${monthName('en', previousMonth)} to compare with`)
    expect(section().text()).not.toContain('%')
    expect(section().text()).not.toContain('NaN')
    expect(section().text()).not.toContain('Infinity')
  })
  it('hides the comparison icon from assistive technology', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 400, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const icon = section().find('[class*="trending"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('aria-hidden')).toBe('true')
    expect(icon.classes().join(' ')).toContain('trending-up')
  })
  it('hides the decorative ring from assistive technology and gives it no text', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const ring = section().find('.hero-ring')
    expect(ring.exists()).toBe(true)
    expect(ring.attributes('aria-hidden')).toBe('true')
    expect(ring.text()).toBe('')
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 400, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`Dieser Monat · ${monthName('de', month)} ${year}`)
    expect(comparison()).toBe(`50 % mehr als im ${monthName('de', previousMonth)}`)
  })
  it('shows no card while the lists are loading', async () => {
    api.recurring.rows = [rent]
    api.purchases.delay = 300
    await mountPage()
    expect(section().exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no card when loading fails', async () => {
    api.recurring.rows = [rent]
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(section().exists()).toBe(false)
  })
  it('shows no card when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(section().exists()).toBe(false)
  })
})

describe('dashboard page this month card empty month', () => {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const previousYear = month === 1 ? year - 1 : year
  const previousMonth = month === 1 ? 12 : month - 1
  const dateIn = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-15`
  const lamp = (id: number, date: string) => ({ id, kind: 'purchase', name: 'Lamp', amount: 300, category: 'appliances', business: false, date })
  const card = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  const dialogState = () => {
    const { open, cost, month } = useCostDialog()
    return { open: open.value, cost: cost.value, month: month.value }
  }

  it('shows a short text and an "Add cost" button when the month has no costs', async () => {
    api.purchases.rows = [lamp(2, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(card().exists()).toBe(true))
    expect(card().text()).toContain('No costs this month yet.')
    expect(card().find('button').text()).toBe('Add cost')
  })
  it('asks for an empty add dialog when the button is pressed', async () => {
    api.purchases.rows = [lamp(2, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(card().find('button').exists()).toBe(true))
    expect(dialogState().open).toBe(false)
    await card().find('button').trigger('click')
    expect(dialogState()).toEqual({ open: true, cost: null, month: null })
  })
  it('keeps the link to the month page next to the button', async () => {
    api.purchases.rows = [lamp(2, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(card().exists()).toBe(true))
    expect(card().findAll('a').some(anchor => anchor.attributes('href')?.startsWith('/months/'))).toBe(true)
  })
  it('shows neither the text nor the button when the month has costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(card().exists()).toBe(true))
    expect(card().text()).not.toContain('No costs this month yet.')
    expect(card().find('button').exists()).toBe(false)
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    api.purchases.rows = [lamp(2, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(card().exists()).toBe(true))
    expect(card().text()).toContain('In diesem Monat gibt es noch keine Kosten.')
    expect(card().find('button').text()).toBe('Kosten hinzufügen')
  })
})

describe('dashboard page this month subtotals', () => {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const dateIn = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-15`
  const lamp = (id: number, amount: number, date: string) => ({ id, kind: 'purchase', name: 'Lamp', amount, category: 'appliances', business: false, date })
  const insurance = { id: 3, kind: 'recurring', name: 'Insurance', amount: 19.99, category: 'insurance', business: false, interval: 'monthly' }
  const section = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  // Each pair of the description list as label: amount. Spaces are normalised, because German puts a no-break space before the euro sign.
  const subtotals = () => Object.fromEntries(section().findAll('dl > div').map(pair => [
    pair.find('dt').text(),
    pair.find('dd').text().replace(/\s/g, ' '),
  ]))
  const amountOf = (text: string) => Number(text.replace(/[^\d.]/g, ''))

  it('shows the recurring and the purchases subtotal with their labels, in cents', async () => {
    api.recurring.rows = [rent, insurance]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€819.99', Purchases: '€300.50' })
  })
  it('counts only the purchases of the current month', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [
      lamp(2, 300, dateIn(year, month)),
      lamp(3, 999, dateIn(year - 1, month)),
    ]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€800.00', Purchases: '€300.00' })
  })
  it('adds up to the total of the month from monthlyTotals', async () => {
    api.recurring.rows = [rent, insurance]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const { Recurring, Purchases } = subtotals()
    const expected = monthlyTotals(api.recurring.rows as never, api.purchases.rows as never, year)[month - 1]!
    expect(amountOf(Recurring!) + amountOf(Purchases!)).toBeCloseTo(expected, 2)
  })
  it('shows a group without costs as zero, not as nothing', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€800.00', Purchases: '€0.00' })
  })
  it('shows zero for both groups in a month without costs', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(year - 1, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€0.00', Purchases: '€0.00' })
  })
  it('has the labels as real terms of a description list', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().findAll('dl dt').map(term => term.text())).toEqual(['Recurring', 'Purchases'])
    expect(section().findAll('dl dd')).toHaveLength(2)
  })
  it('is German with German labels and amounts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent, insurance]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Wiederkehrend: '819,99 €', Anschaffungen: '300,50 €' })
  })
  it('shows no subtotals while the lists are loading', async () => {
    api.recurring.rows = [rent]
    api.purchases.delay = 300
    await mountPage()
    expect(wrapper.find('dl').exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
})

describe('dashboard page largest this month', () => {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const previousYear = month === 1 ? year - 1 : year
  const previousMonth = month === 1 ? 12 : month - 1
  const dateIn = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-15`
  const shortDate = (locale: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(dateIn(year, month)))
  const lamp = (id: number, amount: number, date: string, business = false, name = 'Lamp') => ({ id, kind: 'purchase', name, amount, category: 'appliances', business, date })
  const section = () => wrapper.find('section[aria-labelledby="largest-title"]')
  const list = () => section().find('ul')
  const summaryTotal = () => wrapper.find('section[aria-labelledby="summary-title"]').text()
  // name, subline and amount of each row, with spaces normalised (German puts a no-break space before the euro sign)
  const rows = () => section().findAll('li').map(item => ({
    name: item.find('p').text().replace(/\s+/g, ' '),
    subline: item.find('.text-muted').text().replace(/\s+/g, ' '),
    amount: item.findAll('p').at(-1)!.text().replace(/\s/g, ' '),
  }))

  it('has a heading that names the list', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(section().find('h2').text()).toBe('Largest this month')
    expect(section().find('h2').attributes('id')).toBe('largest-title')
    expect(list().attributes('aria-labelledby')).toBe('largest-title')
  })
  it('lists the costs of the month by amount with category, interval or date, and cents', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toEqual([
      { name: 'Rent', subline: 'Housing · Monthly', amount: '€800.00' },
      { name: 'Lamp', subline: `Appliances · ${shortDate('en')}`, amount: '€300.50' },
    ])
  })
  it('shows the four largest costs and leaves out the rest', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [
      lamp(2, 500, dateIn(year, month), false, 'Desk'),
      lamp(3, 400, dateIn(year, month), false, 'Chair'),
      lamp(4, 300, dateIn(year, month), false, 'Lamp'),
      lamp(5, 10, dateIn(year, month), false, 'Pen'),
    ]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows().map(row => row.name)).toEqual(['Rent', 'Desk', 'Chair', 'Lamp'])
  })
  it('puts a recurring cost before a purchase of the same amount', async () => {
    api.recurring.rows = [{ ...rent, name: 'Zebra', amount: 100 }]
    api.purchases.rows = [lamp(2, 100, dateIn(year, month), false, 'Aardvark')]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows().map(row => row.name)).toEqual(['Zebra', 'Aardvark'])
  })
  it('lists only the costs of the current month', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [
      lamp(2, 300, dateIn(year, month)),
      lamp(3, 999, dateIn(previousYear, previousMonth)),
      lamp(4, 999, dateIn(year - 1, month)),
    ]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toHaveLength(2)
    expect(section().text()).not.toContain('999')
  })
  it('lists a recurring cost and a purchase with the same id', async () => {
    api.recurring.rows = [{ ...rent, id: 5 }]
    api.purchases.rows = [lamp(5, 300, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toHaveLength(2)
  })
  it('gives every row a category badge and marks business costs with a text badge', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month), true)]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(section().findAll('.category-disc')).toHaveLength(2)
    const items = section().findAll('li')
    expect(items[0]!.text()).not.toContain('Business')
    expect(items[1]!.text()).toContain('Business')
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month), true)]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(section().find('h2').text()).toBe('Größte Kosten diesen Monat')
    expect(rows()[0]).toEqual({ name: 'Rent', subline: 'Wohnen · Monatlich', amount: '800,00 €' })
    expect(rows()[1]!.subline).toBe(`Geräte · ${shortDate('de')}`)
  })
  it('shows a short text instead of an empty list when the month has no costs', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(list().exists()).toBe(false)
    expect(section().text()).toContain('No costs this month yet.')
    expect(section().find('button').exists()).toBe(false)
  })
  it('German empty state', async () => {
    await setLanguage('de')
    api.purchases.rows = [lamp(2, 300, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().text()).toContain('In diesem Monat gibt es noch keine Kosten.')
  })
  it('shows the new rows when the lists are refreshed, as the layout does after a save', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(summaryTotal()).toContain('€9,600')
    api.recurring.rows = [rent, { ...rent, id: 2, name: 'Gym', amount: 100 }]
    await refreshNuxtData()
    await vi.waitFor(() => expect(rows().map(row => row.name)).toEqual(['Rent', 'Gym']))
    expect(summaryTotal()).toContain('€10,800')
  })
  it('shows no card while the lists are loading, after an error or without any costs', async () => {
    api.recurring.rows = [rent]
    api.purchases.delay = 300
    await mountPage()
    expect(section().exists()).toBe(false)
    await vi.waitFor(() => expect(section().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no card when loading fails', async () => {
    api.recurring.rows = [rent]
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
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
  it('gives every column at least 24 px and lets the chart scroll sideways when they do not fit', async () => {
    await mountWithCosts()
    const list = section().find('ol')
    expect(list.classes()).toContain('grid-cols-[repeat(12,minmax(1.5rem,1fr))]')
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

describe('dashboard page "View month" link', () => {
  // A fixed "today" in a month with one digit, so the padding of the address is checked too.
  async function mountOn(date: string) {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(`${date}T12:00:00Z`) })
    clearNuxtState(['today', 'year'])
    await mountPage()
    await vi.waitFor(() => expect(card().exists()).toBe(true))
  }
  const card = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  const link = () => card().findAll('a').find(anchor => anchor.attributes('href')?.startsWith('/months/'))
  const lamp = (id: number, date: string) => ({ id, kind: 'purchase', name: 'Lamp', amount: 300, category: 'appliances', business: false, date })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('links the card to the month page of the current month, with a two-digit month', async () => {
    api.recurring.rows = [rent]
    await mountOn('2026-03-15')
    expect(link()!.attributes('href')).toBe('/months/2026/03')
  })
  it('names the month in the link', async () => {
    api.recurring.rows = [rent]
    await mountOn('2026-03-15')
    expect(link()!.text()).toBe('View March 2026')
  })
  it('has a German link text', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent]
    await mountOn('2026-03-15')
    expect(link()!.text()).toBe('März 2026 ansehen')
  })
  it('is a real link, so it works with the keyboard and without JavaScript', async () => {
    api.recurring.rows = [rent]
    await mountOn('2026-03-15')
    expect(link()!.element.tagName).toBe('A')
  })
  it('keeps leading to today\'s month when another year is selected', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, '2025-03-15')]
    await mountOn('2026-03-15')
    const { year } = useYear()
    year.value = 2025
    await vi.waitFor(() => expect(wrapper.find('section[aria-labelledby="summary-title"]').text()).toContain('2025'))
    expect(link()!.attributes('href')).toBe('/months/2026/03')
    expect(link()!.text()).toBe('View March 2026')
  })
  it('is also there when the month has no costs', async () => {
    api.purchases.rows = [lamp(2, '2026-01-15')]
    await mountOn('2026-03-15')
    expect(link()!.attributes('href')).toBe('/months/2026/03')
  })
  it('is not shown while the lists load or when loading fails', async () => {
    api.recurring.rows = [rent]
    api.purchases.delay = 300
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-15T12:00:00Z') })
    clearNuxtState(['today', 'year'])
    await mountPage()
    expect(card().exists()).toBe(false)
    wrapper.unmount()
    api.purchases.delay = 0
    api.recurring.fail = true
    clearNuxtData()
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(card().exists()).toBe(false)
  })
})

describe('dashboard page year selector', () => {
  const year = new Date().getUTCFullYear()
  const today = new Date()
  const month = today.getUTCMonth() + 1
  const lamp = (id: number, amount: number, date: string) => ({ id, kind: 'purchase', name: 'Lamp', amount, category: 'appliances', business: false, date })
  // Current year: 800 x 12 + 300 = 9,900. Previous year: 800 x 12 + 500 = 10,100.
  const costs = () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, `${year}-03-15`), lamp(3, 500, `${year - 1}-03-15`)]
  }
  const combobox = () => wrapper.find('[role="combobox"]')
  const options = () => [...document.body.querySelectorAll('[role="option"]')]
  const summary = () => wrapper.find('section[aria-labelledby="summary-title"]')
  const card = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  const months = () => wrapper.find('section[aria-labelledby="months-title"]')
  async function pickYear(value: number) {
    await combobox().trigger('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse' })
    await vi.waitFor(() => expect(options().length).toBeGreaterThan(0))
    options().find(option => option.textContent?.trim() === String(value))!
      .dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await vi.waitFor(() => expect(summary().find('h2').text()).toContain(String(value)))
  }

  it('has a labelled year selector that starts on the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    expect(wrapper.find('label').text()).toBe('Year')
    expect(combobox().text()).toBe(String(year))
    expect(summary().find('h2').text()).toBe(`Summary for ${year}`)
  })
  it('offers the current year and the years of the purchases, newest first', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    await combobox().trigger('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse' })
    await vi.waitFor(() => expect(options().length).toBeGreaterThan(0))
    expect(options().map(option => option.textContent?.trim())).toEqual([String(year), String(year - 1)])
  })
  it('offers only the current year when there are no purchases of other years', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    await combobox().trigger('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse' })
    await vi.waitFor(() => expect(options().length).toBeGreaterThan(0))
    expect(options().map(option => option.textContent?.trim())).toEqual([String(year)])
  })
  it('updates the year sections when another year is chosen', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    expect(summary().text()).toContain('€9,900')
    await pickYear(year - 1)
    expect(summary().find('h2').text()).toBe(`Summary for ${year - 1}`)
    expect(summary().text()).toContain('€10,100')
    expect(wrapper.find('section[aria-labelledby="categories-title"] h2').text()).toBe(`Costs by category in ${year - 1}`)
    expect(wrapper.find('section[aria-labelledby="split-title"] h2').text()).toBe(`Household versus business in ${year - 1}`)
    expect(months().find('h2').text()).toBe(`Costs per month in ${year - 1}`)
  })
  it('keeps the this-month card on today when another year is chosen', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    const heading = card().find('h2').text()
    const total = card().find('p').text()
    await pickYear(year - 1)
    expect(card().find('h2').text()).toBe(heading)
    expect(heading).toContain(String(year))
    expect(card().find('p').text()).toBe(total)
  })
  it('marks the current month in the chart only for the current year', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    const boldMonths = () => months().findAll('li').flatMap((item, index) => item.find('.font-bold').exists() ? [index] : [])
    expect(boldMonths()).toEqual([month - 1])
    await pickYear(year - 1)
    expect(boldMonths()).toEqual([])
  })
  it('keeps the chosen year when the page is opened again', async () => {
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    await pickYear(year - 1)
    wrapper.unmount()
    await mountPage()
    await vi.waitFor(() => expect(summary().exists()).toBe(true))
    expect(combobox().text()).toBe(String(year - 1))
    expect(summary().find('h2').text()).toBe(`Summary for ${year - 1}`)
  })
  it('is German with a German label when the language is German', async () => {
    await setLanguage('de')
    costs()
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    expect(wrapper.find('label').text()).toBe('Jahr')
  })
  it('shows no selector while the lists are loading', async () => {
    costs()
    api.purchases.delay = 300
    await mountPage()
    expect(combobox().exists()).toBe(false)
    await vi.waitFor(() => expect(combobox().exists()).toBe(true), { timeout: 2000 })
  })
  it('shows no selector when loading fails', async () => {
    costs()
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(combobox().exists()).toBe(false)
  })
  it('shows no selector when there are no costs at all', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(combobox().exists()).toBe(false)
  })
  it('falls back to the current year when the stored year has no purchases', async () => {
    costs()
    useState('year').value = year - 5
    await mountPage()
    await vi.waitFor(() => expect(combobox().exists()).toBe(true))
    expect(combobox().text()).toBe(String(year))
    expect(summary().find('h2').text()).toBe(`Summary for ${year}`)
    expect(summary().text()).toContain('€9,900')
  })
  it('keeps a stored year that is in the list', async () => {
      costs()
      useState('year').value = year - 1
      await mountPage()
      await vi.waitFor(() => expect(combobox().exists()).toBe(true))
      expect(combobox().text()).toBe(String(year - 1))
      expect(summary().text()).toContain('€10,100')
  })
  it('falls back to the current year when the purchases of the selected year are deleted', async () => {
      costs()
      await mountPage()
      await vi.waitFor(() => expect(combobox().exists()).toBe(true))
      await pickYear(year - 1)
      api.purchases.rows = [lamp(2, 300, `${year}-03-15`)]
      await refreshNuxtData()
      await vi.waitFor(() => expect(combobox().text()).toBe(String(year)))
      expect(summary().find('h2').text()).toBe(`Summary for ${year}`)
  })
})
