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
