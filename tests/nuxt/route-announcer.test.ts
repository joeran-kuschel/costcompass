import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'

registerEndpoint('/api/recurring-costs', () => [])
registerEndpoint('/api/purchases', () => [])

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

// The announcer is a visually hidden live region that holds the title of the page after each navigation.
const announcer = () => wrapper.find('.nuxt-route-announcer [aria-live]')
const announced = () => announcer().text()

afterEach(async () => {
  wrapper.unmount()
  await useNuxtApp().$i18n.setLocale('en')
})

describe('route announcer', () => {
  it('is a single polite live region with the role status', async () => {
    wrapper = await mountSuspended(App, { route: '/' })
    expect(wrapper.findAll('.nuxt-route-announcer')).toHaveLength(1)
    expect(announcer().attributes('role')).toBe('status')
    expect(announcer().attributes('aria-live')).toBe('polite')
  })
  it('announces the title of the new page after a navigation', async () => {
    wrapper = await mountSuspended(App, { route: '/' })
    await navigateTo('/costs')
    await vi.waitFor(() => expect(announced()).toBe('Costs – Budgetly'))
    await navigateTo('/')
    await vi.waitFor(() => expect(announced()).toBe('Dashboard – Budgetly'))
  })
  it('announces the title in German when the language is German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    wrapper = await mountSuspended(App, { route: '/' })
    await navigateTo('/costs')
    await vi.waitFor(() => expect(announced()).toBe('Kosten – Budgetly'))
  })
})
