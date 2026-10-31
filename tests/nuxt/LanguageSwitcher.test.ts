import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en')
})

describe('LanguageSwitcher', () => {
  it('is a single combobox with a hidden accessible name', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    const select = wrapper.find('[role="combobox"]')
    expect(wrapper.findAll('[role="combobox"]')).toHaveLength(1)
    expect(select.attributes('aria-label')).toBe('Language')
    // The name is not rendered as visible text.
    expect(wrapper.text()).not.toContain('Language')
  })
  it('shows the current language as its value', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    expect(wrapper.find('[role="combobox"]').text()).toBe('English')
  })
  it('translates its accessible name when the language changes, without a reload', async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)
    await useNuxtApp().$i18n.setLocale('de')
    await vi.waitFor(() => expect(wrapper.find('[role="combobox"]').attributes('aria-label')).toBe('Sprache'))
    expect(wrapper.find('[role="combobox"]').text()).toBe('Deutsch')
  })
})
