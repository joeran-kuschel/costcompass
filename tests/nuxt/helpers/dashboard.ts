import { registerEndpoint } from '@nuxt/test-utils/runtime'

// What each fake API endpoint does; reset before every test.
export const api = {
  recurring: { delay: 0, fail: false, rows: [] as unknown[] },
  purchases: { delay: 0, fail: false, rows: [] as unknown[] },
}
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const respond = (endpoint: keyof typeof api) => async () => {
  await sleep(api[endpoint].delay)
  if (api[endpoint].fail) throw new Error('boom')
  return api[endpoint].rows
}

export const rent = { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' }

// Call once at the top of a test file.
export function registerDashboardEndpoints() {
  registerEndpoint('/api/recurring-costs', respond('recurring'))
  registerEndpoint('/api/purchases', respond('purchases'))
}

// Call in `beforeEach`.
export function resetDashboardState() {
  api.recurring = { delay: 0, fail: false, rows: [] }
  api.purchases = { delay: 0, fail: false, rows: [] }
  // useFetch caches by URL; start every test without data from the previous one.
  clearNuxtData()
  // The selected year is shared state: every test starts on the current year.
  clearNuxtState(['year', 'today'])
}

export async function setLanguage(code: 'en' | 'de') {
  await useNuxtApp().$i18n.setLocale(code)
}
