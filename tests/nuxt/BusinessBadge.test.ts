import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BusinessBadge from '~/components/BusinessBadge.vue'

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale('en')
})

describe('BusinessBadge', () => {
  it('shows the word "Business" as text', async () => {
    const wrapper = await mountSuspended(BusinessBadge)
    expect(wrapper.text()).toBe('Business')
  })
  it('translates the word when the language changes, without a reload', async () => {
    const wrapper = await mountSuspended(BusinessBadge)
    await useNuxtApp().$i18n.setLocale('de')
    await vi.waitFor(() => expect(wrapper.text()).toBe('Geschäftlich'))
  })
  it('has one briefcase icon that is hidden from assistive technology', async () => {
    const wrapper = await mountSuspended(BusinessBadge)
    const icons = wrapper.findAll('[class*="briefcase"]')
    expect(icons).toHaveLength(1)
    expect(icons[0]!.attributes('aria-hidden')).toBe('true')
  })
  it('has no text other than the word, so the icon adds nothing to the name', async () => {
    const wrapper = await mountSuspended(BusinessBadge)
    expect(wrapper.find('[class*="briefcase"]').text()).toBe('')
  })
})
