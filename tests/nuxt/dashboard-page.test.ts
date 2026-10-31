import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
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

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

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
