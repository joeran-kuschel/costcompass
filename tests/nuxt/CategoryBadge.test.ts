import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CategoryBadge from '~/components/CategoryBadge.vue'
import { CATEGORIES } from '~~/shared/types/calculation'

const mountBadge = (category: (typeof CATEGORIES)[number], size: (typeof CATEGORY_SIZES)[number] = 40) =>
  mountSuspended(CategoryBadge, { props: { category, size } })

describe('CategoryBadge', () => {
  it('renders one disc with one icon for every category', async () => {
    for (const category of CATEGORIES) {
      const wrapper = await mountBadge(category)
      expect(wrapper.classes(), category).toContain('category-disc')
      expect(wrapper.classes(), category).toContain(`bg-[var(--category-${category})]`)
      expect(wrapper.findAll('.iconify'), category).toHaveLength(1)
      wrapper.unmount()
    }
  })
  it('uses the icon of its category', async () => {
    // The icon is rendered as `iconify i-lucide:car`: a colon after the collection, where the name has a dash.
    for (const category of CATEGORIES) {
      const wrapper = await mountBadge(category)
      const rendered = useCategory().categoryIcon(category).replace('i-lucide-', 'i-lucide:')
      expect(wrapper.find('.iconify').classes(), category).toContain(rendered)
      wrapper.unmount()
    }
  })
  it('hands its size to the CSS as the variable --category-size', async () => {
    for (const size of CATEGORY_SIZES) {
      const wrapper = await mountBadge('housing', size)
      expect(wrapper.attributes('style')).toContain(`--category-size: ${size}px`)
      wrapper.unmount()
    }
  })
  it('is hidden from assistive technology and has no text of its own', async () => {
    for (const category of CATEGORIES) {
      const wrapper = await mountBadge(category)
      expect(wrapper.attributes('aria-hidden'), category).toBe('true')
      expect(wrapper.text(), category).toBe('')
      expect(wrapper.find('.iconify').attributes('aria-hidden'), category).toBe('true')
      wrapper.unmount()
    }
  })
})
