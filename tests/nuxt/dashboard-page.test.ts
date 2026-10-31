import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'

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
})
afterEach(async () => {
  wrapper.unmount()
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
  const widths = () => rows().map(row => /width:\s*([0-9.]+%)/.exec(row.find('[style]').attributes('style') ?? '')?.[1])

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
    expect(section().find('h2').text()).toBe(`This month, ${monthName('en', month)} ${year}`)
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
    const icon = section().find('[aria-hidden="true"]')
    expect(icon.exists()).toBe(true)
    expect(icon.classes().join(' ')).toContain('trending-up')
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 400, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().find('h2').text()).toBe(`Dieser Monat, ${monthName('de', month)} ${year}`)
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

describe('dashboard page this month cost list', () => {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const previousYear = month === 1 ? year - 1 : year
  const previousMonth = month === 1 ? 12 : month - 1
  const dateIn = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-15`
  const monthName = (locale: string) => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month - 1, 1)))
  const lamp = (id: number, amount: number, date: string, business = false) => ({ id, kind: 'purchase', name: 'Lamp', amount, category: 'appliances', business, date })
  const section = () => wrapper.find('section[aria-labelledby="this-month-title"]')
  const list = () => section().find('ul')
  // The parts of a row are flex items without whitespace between them: join them with a space.
  const rows = () => section().findAll('li').map(item => Array.from(item.element.children).map(part => part.textContent?.trim()).join(' '))

  it('lists the costs of the month with name, kind and amount, recurring costs first', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(year, month))]
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toEqual(['Rent Recurring €800', 'Lamp Purchase €300'])
  })
  it('gives the list an accessible name with the month', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(list().attributes('aria-label')).toBe(`Costs in ${monthName('en')}`)
  })
  it('marks business costs with a text badge and no other cost', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month), true)]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toEqual(['Rent Recurring €800', 'Lamp Purchase Business €300'])
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
    expect(section().text()).not.toContain('€999')
  })
  it('lists a recurring cost and a purchase with the same id', async () => {
    api.recurring.rows = [{ ...rent, id: 5 }]
    api.purchases.rows = [lamp(5, 300, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(rows()).toHaveLength(2)
  })
  it('adds up to the total of the card', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(section().text()).toContain('€1,100')
  })
  it('shows an empty state with an add action when the month has no costs', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(list().exists()).toBe(false)
    expect(section().text()).toContain('No costs this month yet.')
    const add = section().find('a')
    expect(add.text()).toBe('Add cost')
    expect(add.attributes('href')).toBe('/costs')
  })
  it('shows no empty state while the month has costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(section().text()).not.toContain('No costs this month yet.')
    expect(section().find('a').exists()).toBe(false)
  })
  it('is German with German texts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent]
    api.purchases.rows = [lamp(2, 300, dateIn(year, month), true)]
    await mountPage()
    await vi.waitFor(() => expect(list().exists()).toBe(true))
    expect(list().attributes('aria-label')).toBe(`Kosten im ${monthName('de')}`)
    expect(rows()[0]).toMatch(/^Rent Wiederkehrend 800\s€$/)
    expect(rows()[1]?.replace(/\s/g, ' ')).toBe('Lamp Anschaffung Geschäftlich 300 €')
  })
  it('German empty state', async () => {
    await setLanguage('de')
    api.purchases.rows = [lamp(2, 300, dateIn(previousYear, previousMonth))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().text()).toContain('In diesem Monat gibt es noch keine Kosten.')
    expect(section().find('a').text()).toBe('Kosten hinzufügen')
  })
})
