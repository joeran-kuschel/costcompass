import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import MonthPage from '~/pages/months/[year]/[month].vue'

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
    // The page test does not render app.vue, so the title template ("– Budgetly") is not applied here.
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
