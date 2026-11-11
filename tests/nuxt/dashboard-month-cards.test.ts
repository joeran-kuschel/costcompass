import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { monthlyTotals } from '~~/shared/utils/costs'
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
    expect(subtotals()).toEqual({ Recurring: '€819.99', 'One-off': '€300.50' })
  })
  it('counts only the purchases of the current month', async () => {
    api.recurring.rows = [rent]
    api.purchases.rows = [
      lamp(2, 300, dateIn(year, month)),
      lamp(3, 999, dateIn(year - 1, month)),
    ]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€800.00', 'One-off': '€300.00' })
  })
  it('adds up to the total of the month from monthlyTotals', async () => {
    api.recurring.rows = [rent, insurance]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    const { Recurring, 'One-off': oneOff } = subtotals()
    const expected = monthlyTotals(api.recurring.rows as never, api.purchases.rows as never, year)[month - 1]!
    expect(amountOf(Recurring!) + amountOf(oneOff!)).toBeCloseTo(expected, 2)
  })
  it('shows a group without costs as zero, not as nothing', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€800.00', 'One-off': '€0.00' })
  })
  it('shows zero for both groups in a month without costs', async () => {
    api.purchases.rows = [lamp(2, 300, dateIn(year - 1, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Recurring: '€0.00', 'One-off': '€0.00' })
  })
  it('has the labels as real terms of a description list', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(section().findAll('dl dt').map(term => term.text())).toEqual(['Recurring', 'One-off'])
    expect(section().findAll('dl dd')).toHaveLength(2)
  })
  it('is German with German labels and amounts when the language is German', async () => {
    await setLanguage('de')
    api.recurring.rows = [rent, insurance]
    api.purchases.rows = [lamp(2, 300.5, dateIn(year, month))]
    await mountPage()
    await vi.waitFor(() => expect(section().exists()).toBe(true))
    expect(subtotals()).toEqual({ Wiederkehrend: '819,99 €', Einmalig: '300,50 €' })
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
    expect(summary().find('h2').text()).toBe(`Your year ${year}`)
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
    expect(summary().find('h2').text()).toBe(`Your year ${year - 1}`)
    expect(summary().text()).toContain('€10,100')
    // the categories follow the year: the appliances were 300 this year and 500 last year
    expect(wrapper.find('section[aria-labelledby="categories-title"]').text()).toContain('€500')
    expect(wrapper.find('section[aria-labelledby="categories-title"]').text()).not.toContain('€300')
    // the split follows the year: 300 + 800 x 12 = 9,900 this year, 10,100 last year, business 0 in both
    expect(wrapper.find('section[aria-labelledby="split-title"] [role="img"]').attributes('aria-label')).toBe('Household 100 percent, business 0 percent')
    // the bars link to the chosen year
    expect(months().find('a').attributes('href')).toBe(`/months/${year - 1}/01`)
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
    expect(summary().find('h2').text()).toBe(`Your year ${year - 1}`)
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
    expect(summary().find('h2').text()).toBe(`Your year ${year}`)
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
      expect(summary().find('h2').text()).toBe(`Your year ${year}`)
  })
})
