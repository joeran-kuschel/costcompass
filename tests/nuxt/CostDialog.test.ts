import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DefaultLayout from '~/layouts/default.vue'
import CostForm from '~/components/CostForm.vue'

// The add and edit dialog lives in the layout; pages ask for it through useCostDialog().
const lists = { recurringCalls: 0, purchaseCalls: 0 }
registerEndpoint('/api/recurring-costs', () => {
  lists.recurringCalls++
  return []
})
registerEndpoint('/api/purchases', () => {
  lists.purchaseCalls++
  return []
})

const laptop = { id: 2, kind: 'purchase', name: 'Laptop', amount: 1200.5, category: 'appliances', business: true, date: '2026-03-14' } as const
const october = { year: 2026, month: 10 } as const

let wrapper: VueWrapper

beforeEach(async () => {
  lists.recurringCalls = 0
  lists.purchaseCalls = 0
  clearNuxtData()
  // attachTo: the focus tests need real elements in the document.
  wrapper = await mountSuspended(DefaultLayout, { attachTo: document.body })
})
afterEach(async () => {
  wrapper.unmount()
  useCostDialog().close()
  await useNuxtApp().$i18n.setLocale('en')
})

// The dialog is teleported to the body, so its content is not inside the wrapper.
const dialog = () => document.body.querySelector('[role="dialog"]')
const nameInput = () => document.body.querySelector<HTMLInputElement>('input[name="name"]')
const amountInput = () => document.body.querySelector<HTMLInputElement>('input[name="amount"]')
const dateInput = () => document.body.querySelector<HTMLInputElement>('input[name="date"]')
const button = (text: string) => [...document.body.querySelectorAll('button')].find(b => b.textContent?.trim() === text)
const closeButton = () => document.body.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Close"]')
const state = () => {
  const { open, cost, month } = useCostDialog()
  return { open: open.value, cost: cost.value, month: month.value }
}
async function opened(action: () => void) {
  action()
  await vi.waitFor(() => expect(nameInput()).toBeTruthy())
}

describe('cost dialog in the layout', () => {
  it('is not open and has no trigger button of its own', () => {
    expect(dialog()).toBeNull()
    expect(wrapper.findAll('button').filter(b => b.text() === 'Add cost')).toHaveLength(0)
  })
  it('opens an empty form titled "Add cost"', async () => {
    await opened(() => useCostDialog().openAdd())
    expect(dialog()!.textContent).toContain('Add cost')
    expect(nameInput()!.value).toBe('')
    expect(button('Cancel')).toBeTruthy()
  })
  it('opens the form pre-filled and titled with the name when a cost is edited', async () => {
    await opened(() => useCostDialog().openEdit({ ...laptop }))
    expect(dialog()!.textContent).toContain('Edit Laptop')
    expect(nameInput()!.value).toBe('Laptop')
    expect(amountInput()!.value).toBe('1200.5')
    expect(button('Save')).toBeTruthy()
  })
  it('starts a purchase on the first day of the month it is opened for and limits the date to that month', async () => {
    await opened(() => useCostDialog().openAdd({ ...october }))
    expect(dialog()!.textContent).toContain('Add cost')
    expect(dateInput()!.value).toBe('2026-10-01')
    expect(dateInput()!.min).toBe('2026-10-01')
    expect(dateInput()!.max).toBe('2026-10-31')
    expect(dialog()!.textContent).toContain('Pre-filled with October 2026. Pick the day.')
  })
})

describe('cost dialog closing', () => {
  it('closes on Cancel and forgets the cost and the month', async () => {
    await opened(() => useCostDialog().openEdit({ ...laptop }))
    button('Cancel')!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    expect(state()).toEqual({ open: false, cost: null, month: null })
  })
  it('closes with the close button and forgets the cost and the month as well', async () => {
    await opened(() => useCostDialog().openAdd({ ...october }))
    closeButton()!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    expect(state()).toEqual({ open: false, cost: null, month: null })
  })
  it('starts empty again after an edit, with no cost left over', async () => {
    await opened(() => useCostDialog().openEdit({ ...laptop }))
    button('Cancel')!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    await opened(() => useCostDialog().openAdd())
    expect(nameInput()!.value).toBe('')
    expect(dialog()!.textContent).not.toContain('Edit')
  })
  it('starts with the defaults again after text was typed and cancelled', async () => {
    await opened(() => useCostDialog().openAdd({ ...october }))
    nameInput()!.value = 'Half typed'
    nameInput()!.dispatchEvent(new Event('input'))
    button('Cancel')!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    await opened(() => useCostDialog().openAdd({ ...october }))
    expect(nameInput()!.value).toBe('')
    expect(dateInput()!.value).toBe('2026-10-01')
  })
  it('does not keep a month from an earlier dialog when an add dialog is opened without one', async () => {
    await opened(() => useCostDialog().openAdd({ ...october }))
    button('Cancel')!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    await opened(() => useCostDialog().openAdd())
    expect(dialog()!.textContent).not.toContain('Pre-filled with')
  })
  it('gives the focus back to the element that was focused when it opened', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    await opened(() => useCostDialog().openAdd())
    button('Cancel')!.click()
    await vi.waitFor(() => expect(dialog()).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(opener))
    opener.remove()
  })
})

describe('cost dialog after a save', () => {
  it('loads both lists again and closes', async () => {
    await vi.waitFor(() => expect(lists.recurringCalls).toBeGreaterThan(0))
    await opened(() => useCostDialog().openAdd())
    const before = { recurring: lists.recurringCalls, purchases: lists.purchaseCalls }
    wrapper.findComponent(CostForm).vm.$emit('saved')
    await vi.waitFor(() => expect(dialog()).toBeNull())
    expect(lists.recurringCalls).toBeGreaterThan(before.recurring)
    expect(lists.purchaseCalls).toBeGreaterThan(before.purchases)
    expect(state()).toEqual({ open: false, cost: null, month: null })
  })
})

describe('cost dialog in German', () => {
  it('has the German title and hint', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    await opened(() => useCostDialog().openAdd({ ...october }))
    expect(dialog()!.textContent).toContain('Kosten hinzufügen')
    expect(dialog()!.textContent).toContain('Vorbelegt mit Oktober 2026. Wähle den Tag.')
  })
  it('has the German title with the name when a cost is edited', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    await opened(() => useCostDialog().openEdit({ ...laptop }))
    expect(dialog()!.textContent).toContain('Laptop')
    expect(dialog()!.textContent).not.toContain('Edit')
  })
})
