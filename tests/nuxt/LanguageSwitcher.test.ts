import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en')
})

describe('LanguageSwitcher', () => {
  it('is a single combobox named by a visible label', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    const select = wrapper.find('[role="combobox"]')
    const label = wrapper.find('label')
    expect(wrapper.findAll('[role="combobox"]')).toHaveLength(1)
    expect(label.text()).toBe('Language')
    // The label is wired to the select, so the visible text is also its accessible name.
    expect(label.attributes('for')).toBe(select.attributes('id'))
    expect(select.attributes('aria-label')).toBeUndefined()
  })
  it('shows the current language as its value', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    expect(wrapper.find('[role="combobox"]').text()).toBe('English')
  })
  it('translates its label when the language changes, without a reload', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    await useNuxtApp().$i18n.setLocale('de')
    await vi.waitFor(() => expect(wrapper.find('label').text()).toBe('Sprache'))
    expect(wrapper.find('[role="combobox"]').text()).toBe('Deutsch')
  })
})

describe('LanguageSwitcher compact (phones)', () => {
  const compact = () => mountSuspended(LanguageSwitcher, { props: { compact: true }, attachTo: document.body })
  // The menu is teleported to the body. It is opened with the keyboard (Enter), as a keyboard user does; the test environment
  // does not open it from a simulated pointer event.
  const open = async (wrapper: Awaited<ReturnType<typeof compact>>) => {
    await wrapper.find('button').trigger('keydown', { key: 'Enter' })
    await vi.waitFor(() => expect(document.body.querySelector('[role="menu"]')).toBeTruthy())
  }
  const menuItems = () => [...document.body.querySelectorAll('[role="menu"] [role="menuitemcheckbox"]')] as HTMLElement[]

  it('is one round button with the code of the active language, not a select', async () => {
    const wrapper = await compact()
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)
    expect(wrapper.find('button').text()).toBe('EN')
    wrapper.unmount()
  })
  it('is named "Language: English", the code is not its name', async () => {
    const wrapper = await compact()
    expect(wrapper.find('button').attributes('aria-label')).toBe('Language: English')
    wrapper.unmount()
  })
  it('has the compact look: its class sets the 44 px target', async () => {
    const wrapper = await compact()
    expect(wrapper.find('button').classes()).toContain('language-compact')
    wrapper.unmount()
  })
  it('opens a menu with both languages and marks the active one', async () => {
    const wrapper = await compact()
    await open(wrapper)
    expect(menuItems().map(item => item.textContent?.trim())).toEqual(['English', 'Deutsch'])
    expect(menuItems().map(item => item.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    wrapper.unmount()
  })
  it('switches the language without a reload: the code and the name follow', async () => {
    const wrapper = await compact()
    await open(wrapper)
    menuItems()[1]!.click()
    await vi.waitFor(() => expect(wrapper.find('button').text()).toBe('DE'))
    expect(wrapper.find('button').attributes('aria-label')).toBe('Sprache: Deutsch')
    expect(useNuxtApp().$i18n.locale.value).toBe('de')
    wrapper.unmount()
  })
  it('switches back to English from German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await compact()
    await open(wrapper)
    expect(menuItems().map(item => item.getAttribute('aria-checked'))).toEqual(['false', 'true'])
    menuItems()[0]!.click()
    await vi.waitFor(() => expect(wrapper.find('button').text()).toBe('EN'))
    expect(wrapper.find('button').attributes('aria-label')).toBe('Language: English')
    wrapper.unmount()
  })
})

