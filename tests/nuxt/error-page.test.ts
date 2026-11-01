import { describe, it, expect, vi, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ErrorPage from '~/error.vue'

const { clearErrorMock } = vi.hoisted(() => ({ clearErrorMock: vi.fn() }))
mockNuxtImport('clearError', () => clearErrorMock)

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

async function mountError(error: Record<string, unknown>) {
  wrapper = await mountSuspended(ErrorPage, { props: { error } })
}
const notFound = { status: 404, statusText: 'Not Found', message: 'Page not found: /foo' }
const failure = { status: 500, statusText: 'Server Error', message: 'ECONNREFUSED 10.0.0.5:5432 secret detail' }
const invalidMonth = { status: 404, statusText: 'Not Found', message: 'Page not found: /months/2026/13', data: { reason: 'month' } }
const goToLink = () => wrapper.findAll('a').find(link => link.attributes('href')?.startsWith('/months/'))
const backButton = () => wrapper.findAll('button').find(button => ['Back to dashboard', 'Zurück zum Dashboard'].includes(button.text()))

afterEach(async () => {
  vi.useRealTimers()
  clearNuxtState(['today'])
  wrapper.unmount()
  clearErrorMock.mockReset()
  await useNuxtApp().$i18n.setLocale('en')
})

describe('error page for a page that does not exist', () => {
  it('has a translated heading as the only h1, a hint and a way back', async () => {
    await mountError(notFound)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('h1').text()).toBe('Page not found')
    expect(wrapper.text()).toContain('This address does not lead to a page in Budgetly.')
    expect(backButton()).toBeTruthy()
  })
  it('has its own title, with the app name', async () => {
    await mountError(notFound)
    await vi.waitFor(() => expect(document.title).toBe('Page not found – Budgetly'))
  })
  it('is shown inside the layout, with the header and the language switcher', async () => {
    await mountError(notFound)
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('header [role="combobox"]').exists()).toBe(true)
  })
  it('announces the page to screen readers', async () => {
    await mountError(notFound)
    expect(wrapper.find('.nuxt-route-announcer [aria-live="polite"]').text()).toBe('Page not found – Budgetly')
  })
  it('sets the language of the document', async () => {
    await mountError(notFound)
    await vi.waitFor(() => expect(document.documentElement.lang).toBe('en'))
    expect(document.documentElement.dir).toBe('ltr')
  })
  it('clears the error and goes to the dashboard when the way back is chosen', async () => {
    await mountError(notFound)
    await backButton()!.trigger('click')
    expect(clearErrorMock).toHaveBeenCalledTimes(1)
    expect(clearErrorMock).toHaveBeenCalledWith({ redirect: '/' })
  })
})

describe('error page for a month that does not exist', () => {
  it('has its own heading as the only h1, a hint and both ways out', async () => {
    await mountError(invalidMonth)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('h1').text()).toBe("That month doesn't exist")
    expect(wrapper.text()).toContain('The address has a month outside 1 to 12 or a year that is not valid.')
    expect(goToLink()).toBeTruthy()
    expect(backButton()).toBeTruthy()
  })
  it('has its own title and announces it', async () => {
    await mountError(invalidMonth)
    await vi.waitFor(() => expect(document.title).toBe("That month doesn't exist – Budgetly"))
    expect(wrapper.find('.nuxt-route-announcer [aria-live="polite"]').text()).toBe("That month doesn't exist – Budgetly")
  })
  it('links to the real current month with a padded path', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-15T12:00:00Z') })
    clearNuxtState(['today'])
    await mountError(invalidMonth)
    expect(goToLink()!.text()).toBe('Go to March 2026')
    expect(goToLink()!.attributes('href')).toBe('/months/2026/03')
  })
  it('keeps a two-digit month as it is', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-01T12:00:00Z') })
    clearNuxtState(['today'])
    await mountError(invalidMonth)
    expect(goToLink()!.attributes('href')).toBe('/months/2026/11')
  })
  it('still clears the error and goes to the dashboard from the way back', async () => {
    await mountError(invalidMonth)
    await backButton()!.trigger('click')
    expect(clearErrorMock).toHaveBeenCalledWith({ redirect: '/' })
  })
  it('has German texts', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-15T12:00:00Z') })
    clearNuxtState(['today'])
    await useNuxtApp().$i18n.setLocale('de')
    await mountError(invalidMonth)
    expect(wrapper.find('h1').text()).toBe('Diesen Monat gibt es nicht')
    expect(goToLink()!.text()).toBe('Weiter zu März 2026')
  })
  it('does not show the month texts for another reason or none', async () => {
    await mountError({ ...notFound, data: { reason: 'other' } })
    expect(wrapper.find('h1').text()).toBe('Page not found')
    expect(goToLink()).toBeUndefined()
  })
})

describe('error page for any other error', () => {
  it('shows a generic message and no technical details', async () => {
    await mountError(failure)
    expect(wrapper.find('h1').text()).toBe('Something went wrong')
    expect(wrapper.text()).toContain('Please go back to the dashboard and try again.')
    expect(wrapper.text()).not.toContain('ECONNREFUSED')
    expect(wrapper.text()).not.toContain('secret detail')
    expect(wrapper.text()).not.toContain('500')
    expect(goToLink()).toBeUndefined()
  })
  it('has its own title', async () => {
    await mountError(failure)
    await vi.waitFor(() => expect(document.title).toBe('Something went wrong – Budgetly'))
  })
  it('treats an error without a status as a generic error', async () => {
    await mountError({ message: 'boom' })
    expect(wrapper.find('h1').text()).toBe('Something went wrong')
  })
  it('offers the way back and clears the error', async () => {
    await mountError(failure)
    await backButton()!.trigger('click')
    expect(clearErrorMock).toHaveBeenCalledWith({ redirect: '/' })
  })
})

describe('error page in German', () => {
  it('has German texts, title and document language', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    await mountError(notFound)
    expect(wrapper.find('h1').text()).toBe('Seite nicht gefunden')
    expect(wrapper.text()).toContain('Diese Adresse führt zu keiner Seite in Budgetly.')
    expect(backButton()!.text()).toBe('Zurück zum Dashboard')
    await vi.waitFor(() => expect(document.title).toBe('Seite nicht gefunden – Budgetly'))
    expect(document.documentElement.lang).toBe('de')
  })
  it('has the German generic message', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    await mountError(failure)
    expect(wrapper.find('h1').text()).toBe('Etwas ist schiefgelaufen')
    expect(wrapper.text()).toContain('Gehe zurück zum Dashboard und versuche es erneut.')
  })
  it('follows a language switch without a reload', async () => {
    await mountError(notFound)
    await useNuxtApp().$i18n.setLocale('de')
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Seite nicht gefunden'))
  })
})
