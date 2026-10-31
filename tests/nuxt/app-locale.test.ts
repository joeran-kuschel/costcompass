import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import type { DOMWrapper } from '@vue/test-utils'

registerEndpoint('/api/recurring-costs', () => [])
registerEndpoint('/api/purchases', () => [])

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

async function mountApp(route: string) {
  wrapper = await mountSuspended(App, { route })
}
async function setLanguage(code: 'en' | 'de') {
  await useNuxtApp().$i18n.setLocale(code)
}
async function openAddModal() {
  const add = wrapper.findAll('button').find((button: DOMWrapper<Element>) => ['Add cost', 'Kosten hinzufügen'].includes(button.text()))
  expect(add).toBeTruthy()
  add!.element.click()
}
// The close button of the modal is rendered by Nuxt UI itself and only has an aria-label.
const modalCloseLabel = () =>
  document.body.querySelector('[role="dialog"] button[aria-label]')?.getAttribute('aria-label')

afterEach(async () => {
  wrapper.unmount()
  await setLanguage('en')
})

describe('built-in Nuxt UI texts follow the language', () => {
  it('are English by default: modal close button and empty table', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toBe('No data'))
    await openAddModal()
    await vi.waitFor(() => expect(modalCloseLabel()).toBe('Close'))
  })
  it('are German when the language is German', async () => {
    await setLanguage('de')
    await mountApp('/costs')
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toBe('Keine Daten'))
    await openAddModal()
    await vi.waitFor(() => expect(modalCloseLabel()).toBe('Schließen'))
  })
  it('change when the language is switched, without a reload', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toBe('No data'))
    await openAddModal()
    await vi.waitFor(() => expect(modalCloseLabel()).toBe('Close'))
    await setLanguage('de')
    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toBe('Keine Daten'))
    await vi.waitFor(() => expect(modalCloseLabel()).toBe('Schließen'))
  })
})

describe('html lang and dir', () => {
  it('are set from the active language', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(document.documentElement.dir).toBe('ltr')
  })
  it('follow the language when it is switched', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('en'))
    await setLanguage('de')
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('de'))
    expect(document.documentElement.dir).toBe('ltr')
  })
})

describe('page titles', () => {
  it('differ per page and end with the app name', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(document.title).toBe('Costs – Budgetly'))
    wrapper.unmount()
    await mountApp('/')
    await vi.waitFor(() => expect(document.title).toBe('Dashboard – Budgetly'))
  })
  it('are translated', async () => {
    await setLanguage('de')
    await mountApp('/costs')
    await vi.waitFor(() => expect(document.title).toBe('Kosten – Budgetly'))
  })
  it('change when the language is switched, without a reload', async () => {
    await mountApp('/costs')
    await vi.waitFor(() => expect(document.title).toBe('Costs – Budgetly'))
    await setLanguage('de')
    await vi.waitFor(() => expect(document.title).toBe('Kosten – Budgetly'))
    await setLanguage('en')
    await vi.waitFor(() => expect(document.title).toBe('Costs – Budgetly'))
  })
})
