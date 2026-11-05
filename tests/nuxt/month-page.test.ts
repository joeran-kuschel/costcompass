import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import MonthPage from '~/pages/months/[year]/[month].vue'
import { monthlyTotals } from '~~/shared/utils/costs'

const { showErrorMock } = vi.hoisted(() => ({ showErrorMock: vi.fn() }))
mockNuxtImport('showError', () => showErrorMock)

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

const purchase = { id: 1, kind: 'purchase', name: 'Laptop', amount: 900, category: 'appliances', business: false, date: '2026-10-05' }
const thisYear = new Date().getUTCFullYear()

let wrapper: VueWrapper

async function mountPage(path = '/months/2026/10') {
  wrapper = await mountSuspended(MonthPage, { route: path })
}
async function setLanguage(code: 'en' | 'de') {
  await useNuxtApp().$i18n.setLocale(code)
}
const status = () => wrapper.find('[role="status"]')
const alert = () => wrapper.find('[role="alert"]')
const busy = () => wrapper.find('[aria-busy]').attributes('aria-busy')

beforeEach(() => {
  api.recurring = { delay: 0, fail: false, rows: [] }
  api.purchases = { delay: 0, fail: false, rows: [{ ...purchase }] }
  // useFetch caches by URL; start every test without data from the previous one.
  clearNuxtData()
  clearNuxtState(['year', 'today'])
})
afterEach(async () => {
  wrapper.unmount()
  useCostDialog().close()
  showErrorMock.mockReset()
  await setLanguage('en')
})

describe('month page loading state', () => {
  it('shows the heading at once, from the address', async () => {
    api.recurring.delay = 300
    await mountPage()
    expect(wrapper.find('h1').text()).toBe('October 2026')
  })
  it('announces the loading and marks the region busy', async () => {
    api.recurring.delay = 300
    api.purchases.delay = 300
    await mountPage()
    expect(status().text()).toBe('Loading the costs of October 2026…')
    expect(busy()).toBe('true')
    expect(alert().exists()).toBe(false)
  })
  it('shows skeleton blocks that stop animating for reduced motion', async () => {
    api.recurring.delay = 300
    await mountPage()
    const skeletons = wrapper.findAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    for (const skeleton of skeletons) expect(skeleton.classes()).toContain('motion-reduce:animate-none')
  })
  it('hides the skeletons from assistive technology, so only the loading text is announced', async () => {
    api.recurring.delay = 300
    await mountPage()
    const skeletons = wrapper.findAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    for (const skeleton of skeletons) {
      expect(skeleton.attributes('aria-hidden')).toBe('true')
      expect(skeleton.attributes('role')).toBe('presentation')
    }
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1)
  })
  it('keeps loading until both lists have arrived', async () => {
    api.purchases.delay = 300
    await mountPage()
    await sleep(100)
    expect(status().exists()).toBe(true)
    await vi.waitFor(() => expect(status().exists()).toBe(false), { timeout: 2000 })
    expect(busy()).toBe('false')
    expect(wrapper.findAll('.animate-pulse')).toHaveLength(0)
  })
  it('sets the page title to the month', async () => {
    await mountPage()
    // The page test does not render app.vue, so the title template ("– Costcompass") is not applied here.
    await vi.waitFor(() => expect(document.title).toBe('October 2026'))
  })
  it('does not decide about the year before the lists have arrived', async () => {
    api.purchases.delay = 300
    await mountPage('/months/2020/10')
    await sleep(100)
    expect(showErrorMock).not.toHaveBeenCalled()
    expect(wrapper.find('h1').exists()).toBe(true)
  })
})

describe('month page error state', () => {
  it('shows an announced error with the month and a retry button when the purchases fail', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain("Couldn't load the costs of October")
    expect(alert().text()).toContain('Your data has not changed. Please try again.')
    expect(alert().find('button').text()).toBe('Try again')
    expect(status().exists()).toBe(false)
  })
  it('shows the error when the recurring costs fail', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
  })
  it('keeps the heading, never shows a total of zero and hides technical details', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(wrapper.find('h1').text()).toBe('October 2026')
    expect(wrapper.text()).not.toContain('€')
    expect(wrapper.text()).not.toContain('boom')
  })
  it('hides the costs of an earlier load when a refresh fails, so old numbers are not shown next to the error', async () => {
    await mountOctober()
    expect(rowsOf('recurring').length).toBeGreaterThan(0)
    api.purchases.fail = true
    await refreshNuxtData()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(section('recurring').exists()).toBe(false)
    expect(section('purchases').exists()).toBe(false)
    expect(totalCard().exists()).toBe(false)
    expect(wrapper.text()).not.toContain('€')
  })
  it('does not judge the year when the load failed', async () => {
    api.purchases.fail = true
    await mountPage('/months/2020/10')
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(showErrorMock).not.toHaveBeenCalled()
  })
  it('loads again and recovers when "Try again" is pressed', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.purchases.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(alert().exists()).toBe(false))
    expect(busy()).toBe('false')
  })
  it('moves the focus to the heading after a successful retry, so it is not lost', async () => {
    api.purchases.fail = true
    // The page has to be in the document, otherwise nothing can have the focus.
    wrapper = await mountSuspended(MonthPage, { route: '/months/2026/10', attachTo: document.body })
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.purchases.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(alert().exists()).toBe(false))
    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.find('h1').element))
  })
  it('does not move the focus when the retry fails again', async () => {
    api.purchases.fail = true
    wrapper = await mountSuspended(MonthPage, { route: '/months/2026/10', attachTo: document.body })
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    await alert().find('button').trigger('click')
    await sleep(100)
    expect(alert().exists()).toBe(true)
    expect(document.activeElement).not.toBe(wrapper.find('h1').element)
  })
  it('stays in the error state while the retry fails again', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    await alert().find('button').trigger('click')
    await sleep(100)
    expect(alert().exists()).toBe(true)
  })
})

describe('month page year check', () => {
  it('accepts a year with purchases', async () => {
    await mountPage('/months/2026/10')
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(showErrorMock).not.toHaveBeenCalled()
  })
  it('accepts the current year even without purchases', async () => {
    api.purchases.rows = []
    await mountPage(`/months/${thisYear}/03`)
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(showErrorMock).not.toHaveBeenCalled()
  })
  it('shows the not-found error for a year without purchases once the lists have loaded', async () => {
    await mountPage('/months/2020/10')
    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledTimes(1))
    expect(showErrorMock.mock.calls[0]![0]).toMatchObject({ status: 404, fatal: true, data: { reason: 'month' } })
  })
})

// A month with both kinds of costs: October 2026. The yearly cost in March and the purchase in September do not belong to it.
const rent = { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' }
const liability = { id: 2, kind: 'recurring', name: 'Liability insurance', amount: 120.5, category: 'insurance', business: true, interval: 'yearly', dueMonth: 10 }
const phone = { id: 3, kind: 'recurring', name: 'Phone', amount: 30.25, category: 'housing', business: false, interval: 'quarterly', dueMonth: 1 }
const taxAdvice = { id: 4, kind: 'recurring', name: 'Tax advice', amount: 300, category: 'insurance', business: false, interval: 'yearly', dueMonth: 3 }
const laptop = { id: 1, kind: 'purchase', name: 'Laptop', amount: 899.99, category: 'appliances', business: true, date: '2026-10-05' }
const book = { id: 2, kind: 'purchase', name: 'Book', amount: 12.5, category: 'appliances', business: false, date: '2026-10-20' }
const bike = { id: 3, kind: 'purchase', name: 'Bike', amount: 480, category: 'appliances', business: false, date: '2026-09-02' }
const october = { recurring: [rent, liability, phone, taxAdvice], purchases: [laptop, book, bike] }

// Reads the text of an element with all white space (also the no-break space of the German amounts) as single spaces.
const textOf = (element: { text: () => string }) => element.text().replace(/\s+/g, ' ').trim()
// Only for English amounts such as "€1,863.24".
const amountOf = (text: string) => Number(text.replace(/[^\d.-]/g, ''))
const section = (id: 'recurring' | 'purchases') => wrapper.find(`section[aria-labelledby="${id}-title"]`)
const rowsOf = (id: 'recurring' | 'purchases') => section(id).findAll('li')
const subtotalOf = (id: 'recurring' | 'purchases') => textOf(section(id).find('div > p'))
const totalCard = () => wrapper.find('[aria-labelledby="month-total-title"]')

async function mountOctober(path = '/months/2026/10') {
  api.recurring.rows = october.recurring.map(row => ({ ...row }))
  api.purchases.rows = october.purchases.map(row => ({ ...row }))
  await mountPage(path)
  await vi.waitFor(() => expect(status().exists()).toBe(false))
}

describe('month page content', () => {
  it('shows the total of the month in a card named after the month', async () => {
    await mountOctober()
    expect(totalCard().find('h2').text()).toBe('Total for October')
    expect(textOf(totalCard())).toContain('€1,863.24')
  })
  it('lists recurring costs and purchases in separate groups, each with a heading and a subtotal', async () => {
    await mountOctober()
    expect(section('recurring').find('h2').text()).toBe('Recurring')
    expect(section('purchases').find('h2').text()).toBe('Purchases')
    expect(subtotalOf('recurring')).toBe('€950.75')
    expect(subtotalOf('purchases')).toBe('€912.49')
  })
  it('puts a decorative kind icon in each group heading, so the heading text stays the same', async () => {
    await mountOctober()
    for (const [id, icon, text] of [['recurring', 'repeat', 'Recurring'], ['purchases', 'shopping-bag', 'Purchases']] as const) {
      const heading = section(id).find('h2')
      const iconElement = heading.find(`[class*="i-lucide:${icon}"], [class*="i-lucide-${icon}"]`)
      expect(iconElement.exists(), id).toBe(true)
      expect(iconElement.attributes('aria-hidden'), id).toBe('true')
      expect(heading.text()).toBe(text)
    }
  })
  it('shows only the costs that fall in the month', async () => {
    await mountOctober()
    const names = (id: 'recurring' | 'purchases') => rowsOf(id).map(row => row.find('p').text())
    expect(names('recurring').join('|')).toContain('Rent')
    expect(names('recurring').join('|')).toContain('Liability insurance')
    expect(names('recurring').join('|')).toContain('Phone')
    expect(names('recurring').join('|')).not.toContain('Tax advice')
    expect(rowsOf('recurring')).toHaveLength(3)
    expect(rowsOf('purchases')).toHaveLength(2)
    expect(section('purchases').text()).not.toContain('Bike')
  })
  it('shows the category and the interval under a recurring cost, and the category and the full date under a purchase', async () => {
    await mountOctober()
    const rentRow = textOf(rowsOf('recurring').find(row => row.text().includes('Rent'))!)
    expect(rentRow).toContain('Housing · Monthly')
    expect(rentRow).toContain('€800.00')
    const phoneRow = textOf(rowsOf('recurring').find(row => row.text().includes('Phone'))!)
    expect(phoneRow).toContain('Housing · Quarterly')
    expect(phoneRow).toContain('€30.25')
    const bookRow = textOf(rowsOf('purchases').find(row => row.text().includes('Book'))!)
    expect(bookRow).toContain('Appliances · October 20')
    expect(bookRow).toContain('€12.50')
  })
  it('starts every row with a 40 px badge of its own category, hidden from screen readers', async () => {
    await mountOctober()
    const expected: Record<string, string> = { 'Rent': 'housing', 'Liability insurance': 'insurance', 'Phone': 'housing', 'Laptop': 'appliances', 'Book': 'appliances' }
    const rows = [...rowsOf('recurring'), ...rowsOf('purchases')]
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      const name = row.find('p').text().replace('Business', '').trim()
      const badge = row.element.firstElementChild!
      expect(badge.classList.contains('category-disc'), name).toBe(true)
      expect(badge.classList.contains(`bg-[var(--category-${expected[name]})]`), name).toBe(true)
      expect(badge.getAttribute('style'), name).toContain('--category-size: 40px')
      expect(badge.getAttribute('aria-hidden'), name).toBe('true')
    }
  })
  it('adds the due month to a yearly cost, not to a quarterly or monthly one', async () => {
    await mountOctober()
    const liabilityRow = textOf(rowsOf('recurring').find(row => row.text().includes('Liability insurance'))!)
    expect(liabilityRow).toContain('Insurance · Yearly, October')
    const phoneRow = textOf(rowsOf('recurring').find(row => row.text().includes('Phone'))!)
    expect(phoneRow).toContain('Housing · Quarterly')
    expect(phoneRow).not.toContain('Quarterly,')
    const rentRow = textOf(rowsOf('recurring').find(row => row.text().includes('Rent'))!)
    expect(rentRow).toContain('Housing · Monthly')
    expect(rentRow).not.toContain('Monthly,')
  })
  it('adds up: each subtotal is the sum of its rows and the total is the sum of both subtotals', async () => {
    await mountOctober()
    const sum = (id: 'recurring' | 'purchases') => rowsOf(id).reduce((total, row) => total + amountOf(textOf(row.findAll('p').at(-1)!)), 0)
    expect(sum('recurring')).toBeCloseTo(amountOf(subtotalOf('recurring')), 2)
    expect(sum('purchases')).toBeCloseTo(amountOf(subtotalOf('purchases')), 2)
    const total = amountOf(textOf(totalCard().find('p')))
    expect(total).toBeCloseTo(amountOf(subtotalOf('recurring')) + amountOf(subtotalOf('purchases')), 2)
  })
  it('shows the same total as the monthly totals of the core', async () => {
    await mountOctober()
    const expected = monthlyTotals(october.recurring as never, october.purchases as never, 2026)[9]!
    expect(amountOf(textOf(totalCard().find('p')))).toBeCloseTo(expected, 2)
  })
  it('marks business costs with a text badge and no other row', async () => {
    await mountOctober()
    const badges = wrapper.findAll('li').filter(row => row.text().includes('Business'))
    expect(badges).toHaveLength(2)
    expect(badges.map(row => row.text()).join('|')).toContain('Liability insurance')
    expect(badges.map(row => row.text()).join('|')).toContain('Laptop')
    expect(rowsOf('recurring').find(row => row.text().includes('Rent'))!.text()).not.toContain('Business')
  })
  it('does not show a group without entries', async () => {
    await mountOctober('/months/2026/11')
    expect(section('purchases').exists()).toBe(false)
    expect(section('recurring').exists()).toBe(true)
  })
  it('shows only the purchases group when a month has no recurring costs', async () => {
    api.recurring.rows = []
    api.purchases.rows = [{ ...book }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(section('recurring').exists()).toBe(false)
    expect(section('purchases').exists()).toBe(true)
  })
  it('has one h1, the groups as lists with a heading each, and nothing in the lists but the rows', async () => {
    await mountOctober()
    expect(wrapper.findAll('h1')).toHaveLength(1)
    // Three lists: the two groups and the "By category" card.
    expect(wrapper.findAll('ul')).toHaveLength(3)
    expect(section('recurring').find('ul').exists()).toBe(true)
    expect(section('purchases').find('ul').exists()).toBe(true)
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual(['Total for October', 'Recurring', 'Purchases', 'By category'])
  })
})

describe('month page empty state', () => {
  // Only a yearly cost in March and a purchase in September: October 2026 has nothing.
  async function mountEmpty(path = '/months/2026/10') {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    await mountPage(path)
    await vi.waitFor(() => expect(status().exists()).toBe(false))
  }
  const emptyCard = () => wrapper.findAll('div').find(card => card.find('h2').exists() && card.find('h2').text() === 'No costs in October' && card.find('p').exists())

  it('shows a total of zero in the money format', async () => {
    await mountEmpty()
    expect(totalCard().find('h2').text()).toBe('Total for October')
    expect(textOf(totalCard())).toContain('€0.00')
  })
  it('names the month and explains what to do, instead of the groups', async () => {
    await mountEmpty()
    expect(wrapper.findAll('h2').map(heading => heading.text())).toEqual(['Total for October', 'No costs in October'])
    expect(wrapper.text()).toContain('Add a cost that falls in this month to see it here.')
    expect(section('recurring').exists()).toBe(false)
    expect(section('purchases').exists()).toBe(false)
    expect(wrapper.findAll('ul')).toHaveLength(0)
  })
  it('keeps the icon decorative, so the text carries the message', async () => {
    await mountEmpty()
    expect(emptyCard()).toBeTruthy()
    expect(wrapper.find('[aria-hidden="true"].size-8, .size-8[aria-hidden="true"]').exists()).toBe(true)
  })
  it('is not shown for a month with costs', async () => {
    await mountOctober()
    expect(wrapper.text()).not.toContain('No costs in October')
    expect(wrapper.text()).not.toContain('Add a cost that falls in this month')
  })
  it('is not shown while the lists load', async () => {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    api.purchases.delay = 300
    await mountPage()
    expect(status().exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No costs in October')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs in October'), { timeout: 2000 })
  })
  it('is not shown after a failed load, where the error is shown instead', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(wrapper.text()).not.toContain('No costs in October')
    expect(wrapper.text()).not.toContain('€')
  })
  it('is shown again when a retry loads a month without costs', async () => {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.purchases.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs in October'))
  })
  it('has German texts and a German zero', async () => {
    await setLanguage('de')
    await mountEmpty()
    expect(totalCard().find('h2').text()).toBe('Summe für Oktober')
    expect(textOf(totalCard())).toContain('0,00 €')
    expect(wrapper.text()).toContain('Keine Kosten im Oktober')
    expect(wrapper.text()).toContain('Füge Kosten hinzu, die in diesen Monat fallen, um sie hier zu sehen.')
  })
})

describe('month page add cost', () => {
  // The dialog itself lives in the layout (see CostDialog.test.ts); the page only asks for it, with its month.
  const dialogState = () => {
    const { open, cost, month } = useCostDialog()
    return { open: open.value, cost: cost.value, month: month.value }
  }
  // The only "Add cost" button of the page is the one of the empty month; otherwise the sidebar and the phone button of the layout have it.
  const addButtons = (text = 'Add cost') => wrapper.findAll('button').filter(button => button.text() === text)
  const total = () => textOf(totalCard())

  it('has no "Add cost" button next to the heading: the sidebar and the phone button of the layout have it', async () => {
    await mountOctober()
    expect(addButtons()).toHaveLength(0)
  })
  it('has no button while the lists load or after a failure', async () => {
    api.purchases.delay = 300
    await mountPage()
    expect(wrapper.findAll('button').some(button => button.text() === 'Add cost')).toBe(false)
    wrapper.unmount()
    api.purchases.delay = 0
    api.purchases.fail = true
    clearNuxtData()
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(wrapper.findAll('button').some(button => button.text() === 'Add cost')).toBe(false)
  })
  it('does not ask for the dialog until the button is pressed', async () => {
    await mountOctober()
    expect(dialogState().open).toBe(false)
  })
  it('uses the month of the address, not the current month, in the dialog it asks for', async () => {
    api.recurring.rows = []
    api.purchases.rows = [{ ...bike, date: '2025-06-01' }]
    await mountPage('/months/2025/02')
    await vi.waitFor(() => expect(addButtons()).toHaveLength(1))
    await addButtons()[0]!.trigger('click')
    expect(dialogState().month).toEqual({ year: 2025, month: 2 })
  })
  it('asks for the same dialog, with the month, from the button of an empty month', async () => {
    api.recurring.rows = []
    api.purchases.rows = [{ ...bike }]
    await mountPage('/months/2026/10')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs in October'))
    expect(addButtons()).toHaveLength(1)
    await addButtons()[0]!.trigger('click')
    expect(dialogState()).toEqual({ open: true, cost: null, month: { year: 2026, month: 10 } })
  })
  it('refreshes the subtotals and the total when the lists are refreshed, as the layout does after a save', async () => {
    await mountOctober()
    expect(total()).toContain('€1,863.24')
    // what the API will return once a new purchase was saved
    api.purchases.rows = [...october.purchases, { id: 7, kind: 'purchase', name: 'Lamp', amount: 36.76, category: 'appliances', business: false, date: '2026-10-09' }]
    await refreshNuxtData()
    await vi.waitFor(() => expect(total()).toContain('€1,900.00'))
    expect(subtotalOf('purchases')).toBe('€949.25')
    expect(section('purchases').text()).toContain('Lamp')
  })
  it('keeps the page and does not show the loading state while the lists refresh', async () => {
    await mountOctober()
    api.purchases.delay = 200
    const refreshing = refreshNuxtData()
    await sleep(50)
    expect(status().exists()).toBe(false)
    expect(totalCard().exists()).toBe(true)
    await refreshing
  })
  it('has a German button in the empty month', async () => {
    await setLanguage('de')
    api.recurring.rows = []
    api.purchases.rows = [{ ...bike }]
    await mountPage('/months/2026/10')
    await vi.waitFor(() => expect(addButtons('Kosten hinzufügen')).toHaveLength(1))
  })
})

describe('month page "This month" marker', () => {
  it('is shown, as text, for the real current month', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-15T12:00:00Z') })
    clearNuxtState(['today'])
    await mountOctober('/months/2026/10')
    expect(wrapper.find('h1').element.parentElement!.textContent).toContain('This month')
  })
  it('is not shown for another month', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-15T12:00:00Z') })
    clearNuxtState(['today'])
    await mountOctober('/months/2026/09')
    expect(wrapper.text()).not.toContain('This month')
  })
  it('is not shown for the same month in another year', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-15T12:00:00Z') })
    clearNuxtState(['today'])
    await mountOctober('/months/2025/10')
    expect(wrapper.text()).not.toContain('This month')
  })
})

describe('month page content in German', () => {
  it('has German headings, labels, amounts and dates', async () => {
    await setLanguage('de')
    await mountOctober()
    expect(wrapper.find('h1').text()).toBe('Oktober 2026')
    expect(totalCard().find('h2').text()).toBe('Summe für Oktober')
    expect(section('recurring').find('h2').text()).toBe('Wiederkehrend')
    expect(section('purchases').find('h2').text()).toBe('Anschaffungen')
    expect(subtotalOf('recurring')).toBe('950,75 €')
    const rentRow = textOf(rowsOf('recurring').find(row => row.text().includes('Rent'))!)
    expect(rentRow).toContain('Wohnen · Monatlich')
    const bookRow = textOf(rowsOf('purchases').find(row => row.text().includes('Book'))!)
    expect(bookRow).toContain('Geräte · 20. Oktober')
    const liabilityRow = textOf(rowsOf('recurring').find(row => row.text().includes('Liability insurance'))!)
    expect(liabilityRow).toContain('Versicherung · Jährlich, Oktober')
    expect(wrapper.text()).toContain('Geschäftlich')
  })
})

describe('month page comparison with the month before', () => {
  // The pill holds two texts: the short one is seen on phones, the long one is seen from sm and is always what a screen reader reads.
  const pill = () => totalCard().find('.hero-pill')
  const shortText = () => pill().find('.sm\\:hidden')
  const longText = () => pill().find('.sr-only')

  it('says how much more the month cost, in a long and a short form', async () => {
    // October 1,863.24 against September 1,280 (rent and the bike): 46% more.
    await mountOctober()
    expect(textOf(longText())).toBe('46% more than September')
    expect(textOf(shortText())).toBe('46% more')
  })
  it('says how much less the month cost', async () => {
    // November 800 (rent only) against October 1,863.24: 57% less.
    await mountOctober('/months/2026/11')
    expect(textOf(longText())).toBe('57% less than October')
    expect(textOf(shortText())).toBe('57% less')
  })
  it('says when the month cost the same', async () => {
    api.recurring.rows = [{ ...rent }]
    api.purchases.rows = []
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(textOf(longText())).toBe('Same as September')
    expect(textOf(shortText())).toBe('Same as before')
  })
  it('has a neutral text when the month before cost nothing', async () => {
    // Only the laptop in October 2026: September cost nothing.
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(textOf(longText())).toBe('No costs in September to compare with')
    expect(textOf(shortText())).toBe('No comparison')
  })
  it('hides the short text and the icon from screen readers, so only the full sentence is read', async () => {
    await mountOctober()
    expect(shortText().attributes('aria-hidden')).toBe('true')
    expect(longText().attributes('aria-hidden')).toBeUndefined()
    expect(pill().find('.iconify, svg').attributes('aria-hidden')).toBe('true')
  })
  it('is not shown while the lists load', async () => {
    api.recurring.delay = 300
    await mountPage()
    expect(wrapper.find('.hero-pill').exists()).toBe(false)
  })
  it('is not shown in a month without costs, where the empty card explains it', async () => {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(totalCard().exists()).toBe(true)
    expect(pill().exists()).toBe(false)
  })
  it('is not shown after a failed load', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(wrapper.find('.hero-pill').exists()).toBe(false)
  })
  it('has German texts', async () => {
    await setLanguage('de')
    await mountOctober()
    expect(textOf(longText())).toBe('46 % mehr als im September')
    expect(textOf(shortText())).toBe('46 % mehr')
  })
})

describe('month page counts', () => {
  const counts = () => totalCard().find('.hero-meta')

  it('counts all costs of the month and the business ones among them', async () => {
    // October: rent, liability, phone, laptop and book; liability and laptop are business.
    await mountOctober()
    expect(textOf(counts())).toBe('5 costs · 2 business')
  })
  it('matches the rows in the lists below', async () => {
    await mountOctober()
    const rows = [...rowsOf('recurring'), ...rowsOf('purchases')]
    const business = rows.filter(row => row.text().includes('Business'))
    expect(textOf(counts())).toBe(`${rows.length} costs · ${business.length} business`)
  })
  it('uses the singular for one cost', async () => {
    // Only the laptop in October, not a business cost.
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(textOf(counts())).toBe('1 cost · 0 business')
  })
  it('is hidden in a month without costs, where the empty card explains it', async () => {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(counts().exists()).toBe(false)
    expect(wrapper.text()).toContain('No costs in October')
  })
  it('has German texts', async () => {
    await setLanguage('de')
    await mountOctober()
    expect(textOf(counts())).toBe('5 Kosten · 2 geschäftlich')
  })
})

describe('month page "By category" card', () => {
  const card = () => wrapper.find('aside[aria-labelledby="categories-title"]')
  // Name and amount of each row; the amount is the bold text on the right.
  const cardRows = () => card().findAll('li').map(row => [textOf(row.find('span.font-bold')), textOf(row.find('b'))])

  it('is an aside named by its heading "By category"', async () => {
    await mountOctober()
    expect(card().exists()).toBe(true)
    expect(card().find('h2#categories-title').text()).toBe('By category')
  })
  it('lists the categories of the month with their totals in cents, the largest first', async () => {
    // October: laptop and book are appliances, rent and the quarterly phone are housing, liability is insurance.
    await mountOctober()
    expect(cardRows()).toEqual([['Appliances', '€912.49'], ['Housing', '€830.25'], ['Insurance', '€120.50']])
  })
  it('leaves out categories without costs in the month', async () => {
    await mountOctober()
    expect(card().text()).not.toContain('Food')
    expect(card().text()).not.toContain('Mobility')
  })
  it('adds up to the total of the month', async () => {
    await mountOctober()
    const sum = cardRows().reduce((acc, [, amount]) => acc + amountOf(amount!), 0)
    expect(sum).toBeCloseTo(monthlyTotals(october.recurring as never, october.purchases as never, 2026)[9]!, 2)
  })
  it('starts every row with a 36 px badge of its category, hidden from screen readers', async () => {
    await mountOctober()
    const badges = card().findAll('li').map(row => row.find('[aria-hidden="true"]'))
    expect(badges.every(badge => badge.exists())).toBe(true)
    expect(badges.map(badge => badge.attributes('style'))).toSatisfy((styles: (string | undefined)[]) => styles.every(style => style?.includes('36px')))
  })
  it('is not shown in a month without costs', async () => {
    api.recurring.rows = [{ ...taxAdvice }]
    api.purchases.rows = [{ ...bike }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(card().exists()).toBe(false)
  })
  it('is not shown while the lists load', async () => {
    api.purchases.delay = 300
    await mountPage()
    expect(status().exists()).toBe(true)
    expect(card().exists()).toBe(false)
  })
  it('is not shown after a failed load', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(card().exists()).toBe(false)
  })
  it('has a German heading, German names and German amounts', async () => {
    await setLanguage('de')
    await mountOctober()
    expect(card().find('h2').text()).toBe('Nach Kategorie')
    expect(cardRows()).toEqual([['Geräte', '912,49 €'], ['Wohnen', '830,25 €'], ['Versicherung', '120,50 €']])
  })
})

describe('month page navigation', () => {
  // Valid years: 2025 and 2026 (purchases) and the current year, which is fixed to 2026 here.
  const oldBike = { ...bike, id: 9, date: '2025-09-02' }
  const link = (label: 'Previous month' | 'Next month' | 'Vorheriger Monat' | 'Nächster Monat') =>
    wrapper.findAll('a').find(anchor => (anchor.attributes('aria-label') ?? '').startsWith(label))
  async function mountAt(path: string) {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-15T12:00:00Z') })
    clearNuxtState(['today'])
    api.purchases.rows = [{ ...laptop }, { ...oldBike }]
    await mountPage(path)
    await vi.waitFor(() => expect(status().exists()).toBe(false))
  }

  it('links to the previous and the next month in the middle of a year', async () => {
    await mountAt('/months/2026/06')
    expect(link('Previous month')!.attributes('href')).toBe('/months/2026/05')
    expect(link('Next month')!.attributes('href')).toBe('/months/2026/07')
  })
  it('names the target month, with the year, in the link', async () => {
    await mountAt('/months/2026/06')
    expect(link('Previous month')!.attributes('aria-label')).toBe('Previous month, May 2026')
    expect(link('Next month')!.attributes('aria-label')).toBe('Next month, July 2026')
  })
  it('pads the month in the link target', async () => {
    await mountAt('/months/2026/03')
    expect(link('Previous month')!.attributes('href')).toBe('/months/2026/02')
    expect(link('Next month')!.attributes('href')).toBe('/months/2026/04')
  })
  it('goes back to December of the previous year from January', async () => {
    await mountAt('/months/2026/01')
    expect(link('Previous month')!.attributes('href')).toBe('/months/2025/12')
    expect(link('Previous month')!.attributes('aria-label')).toBe('Previous month, December 2025')
    expect(link('Next month')!.attributes('href')).toBe('/months/2026/02')
  })
  it('goes on to January of the next year from December', async () => {
    await mountAt('/months/2025/12')
    expect(link('Next month')!.attributes('href')).toBe('/months/2026/01')
    expect(link('Next month')!.attributes('aria-label')).toBe('Next month, January 2026')
  })
  it('hides the next link where the next year has no data', async () => {
    await mountAt('/months/2026/12')
    expect(link('Next month')).toBeUndefined()
    expect(link('Previous month')!.attributes('href')).toBe('/months/2026/11')
  })
  it('hides the previous link where the previous year has no data', async () => {
    await mountAt('/months/2025/01')
    expect(link('Previous month')).toBeUndefined()
    expect(link('Next month')!.attributes('href')).toBe('/months/2025/02')
  })
  it('uses real links that are big enough to hit', async () => {
    await mountAt('/months/2026/06')
    for (const label of ['Previous month', 'Next month'] as const) {
      expect(link(label)!.element.tagName).toBe('A')
      // `pill-icon` (main.css) makes the link 44 px square; jsdom has no layout, so the class is what we can check.
      expect(link(label)!.classes()).toContain('pill-icon')
    }
  })
  it('leads back to the dashboard with a link', async () => {
    await mountAt('/months/2026/06')
    const back = wrapper.findAll('a').find(anchor => anchor.attributes('href') === '/')
    expect(back).toBeTruthy()
    expect(back!.text()).toBe('Dashboard')
  })
  it('puts the links in a sensible keyboard order: dashboard, previous, next', async () => {
    await mountAt('/months/2026/06')
    const hrefs = wrapper.findAll('a').map(anchor => anchor.attributes('href'))
    expect(hrefs.slice(0, 3)).toEqual(['/', '/months/2026/05', '/months/2026/07'])
  })
  it('shows the links inside the year while the lists are still loading', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-15T12:00:00Z') })
    clearNuxtState(['today'])
    api.purchases.delay = 300
    await mountPage('/months/2026/06')
    expect(status().exists()).toBe(true)
    expect(link('Previous month')!.attributes('href')).toBe('/months/2026/05')
    expect(link('Next month')!.attributes('href')).toBe('/months/2026/07')
  })
  it('has German link names', async () => {
    await setLanguage('de')
    await mountAt('/months/2026/06')
    expect(link('Vorheriger Monat')!.attributes('aria-label')).toBe('Vorheriger Monat, Mai 2026')
    expect(link('Nächster Monat')!.attributes('aria-label')).toBe('Nächster Monat, Juli 2026')
  })
})

describe('month page in German', () => {
  it('has the German loading text', async () => {
    await setLanguage('de')
    api.recurring.delay = 300
    await mountPage()
    expect(wrapper.find('h1').text()).toBe('Oktober 2026')
    expect(status().text()).toBe('Kosten für Oktober 2026 werden geladen …')
  })
  it('has the German error text', async () => {
    await setLanguage('de')
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Die Kosten für Oktober konnten nicht geladen werden')
    expect(alert().find('button').text()).toBe('Erneut versuchen')
  })
})
