import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DefaultLayout from '~/layouts/default.vue'
import LogoMark from '~/components/LogoMark.vue'

describe('LogoMark', () => {
  it('is a decorative image that is neither read nor focusable', async () => {
    const wrapper = await mountSuspended(LogoMark)
    const svg = wrapper.find('svg')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('focusable')).toBe('false')
    expect(wrapper.text()).toBe('')
  })
  it('takes its colour from the primary colour variable, so it follows light and dark mode', async () => {
    const wrapper = await mountSuspended(LogoMark)
    const fills = wrapper.findAll('circle').map(circle => circle.attributes('fill'))
    expect(fills.filter(fill => fill === 'var(--ui-primary)')).toHaveLength(2)
  })
})

describe('default layout header title', () => {
  const title = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.find('header [data-slot="title"]')
  it('is one link to the dashboard that shows the mark and the app name', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = title(wrapper)
    expect(link.element.tagName).toBe('A')
    expect(link.attributes('href')).toBe('/')
    expect(link.text()).toBe('Costcompass')
    expect(link.find('svg').exists()).toBe(true)
  })
  it('is named by the app name only, the mark adds nothing', async () => {
    const wrapper = await mountSuspended(DefaultLayout)
    const link = title(wrapper)
    expect(link.attributes('aria-label')).toBe('Costcompass')
    expect(link.find('svg').attributes('aria-hidden')).toBe('true')
  })
})
