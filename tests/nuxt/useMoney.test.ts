import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

// useMoney needs the i18n context of a component, so it is called from the setup of a small probe component.
let euros: (value: number) => string
const Probe = defineComponent({
  setup() {
    euros = useMoney()
    return () => null
  },
})

let wrapper: Awaited<ReturnType<typeof mountSuspended>>
// German puts a no-break space between the number and the euro sign.
const plain = (text: string) => text.replace(/ /g, ' ')

beforeEach(async () => {
  wrapper = await mountSuspended(Probe)
})
afterEach(async () => {
  wrapper.unmount()
  await useNuxtApp().$i18n.setLocale('en')
})

describe('useMoney in English', () => {
  it('formats whole euros with the sign in front and a thousands separator', () => {
    expect(euros(31840)).toBe('€31,840')
  })
  it('shows no cents', () => {
    expect(euros(1234.5)).toBe('€1,235')
    expect(euros(19.99)).toBe('€20')
  })
  it('rounds to the nearest euro', () => {
    expect(euros(2074.4)).toBe('€2,074')
    expect(euros(2074.6)).toBe('€2,075')
  })
  it('formats zero', () => {
    expect(euros(0)).toBe('€0')
  })
  it('formats large amounts', () => {
    expect(euros(1234567)).toBe('€1,234,567')
  })
})

describe('useMoney in German', () => {
  it('formats whole euros with the sign behind and a dot as thousands separator', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(plain(euros(31840))).toBe('31.840 €')
    expect(euros(31840)).toContain(' ')
  })
  it('shows no cents', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(plain(euros(1234.5))).toBe('1.235 €')
  })
  it('follows the language when it is switched after the formatter was created', async () => {
    expect(euros(5000)).toBe('€5,000')
    await useNuxtApp().$i18n.setLocale('de')
    expect(plain(euros(5000))).toBe('5.000 €')
    await useNuxtApp().$i18n.setLocale('en')
    expect(euros(5000)).toBe('€5,000')
  })
})
