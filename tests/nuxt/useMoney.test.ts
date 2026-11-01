import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'

// useMoney needs the i18n context of a component, so it is called from the setup of a small probe component.
let euros: (value: number) => string
let exact: (value: number) => string
const Probe = defineComponent({
  setup() {
    euros = useMoney()
    exact = useMoney({ cents: true })
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

describe('useMoney with cents in English', () => {
  it('always shows two decimals', () => {
    expect(exact(89.99)).toBe('€89.99')
    expect(exact(2300)).toBe('€2,300.00')
    expect(exact(1234.5)).toBe('€1,234.50')
    expect(exact(0)).toBe('€0.00')
  })
  it('rounds to the nearest cent', () => {
    expect(exact(10.126)).toBe('€10.13')
    expect(exact(10.124)).toBe('€10.12')
  })
  it('uses a thousands separator for large amounts', () => {
    expect(exact(1234567.89)).toBe('€1,234,567.89')
  })
  it('does not change the whole-euro formatter that was created next to it', () => {
    expect(euros(89.99)).toBe('€90')
    expect(exact(89.99)).toBe('€89.99')
  })
})

describe('useMoney with cents in German', () => {
  it('shows a comma before the cents, a dot as thousands separator and the sign behind', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    expect(plain(exact(89.99))).toBe('89,99 €')
    expect(plain(exact(2300))).toBe('2.300,00 €')
  })
  it('follows the language when it is switched after the formatter was created', async () => {
    expect(exact(5000)).toBe('€5,000.00')
    await useNuxtApp().$i18n.setLocale('de')
    expect(plain(exact(5000))).toBe('5.000,00 €')
  })
})
