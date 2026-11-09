import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { Purchase, RecurringCost, Stored } from '~~/shared/types/calculation'
import CostForm from '~/components/CostForm.vue'

const { addToast, fetchMock } = vi.hoisted(() => ({ addToast: vi.fn(), fetchMock: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: addToast }))
mockNuxtImport('$fetch', () => fetchMock)

const purchase: Stored<Purchase> = {
  id: 5, kind: 'purchase', name: 'Laptop', amount: 1200, category: 'appliances', business: true, date: '2026-03-14',
}
const monthly: Stored<RecurringCost> = {
  id: 3, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly',
}

beforeEach(() => {
  fetchMock.mockReset()
  addToast.mockReset()
})

// UForm validates asynchronously before it emits submit, so tests wait for the outcome with vi.waitFor.
async function submit(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  await wrapper.find('form').trigger('submit')
}
const sent = () => vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
type Wrapper = Awaited<ReturnType<typeof mountSuspended>>
// The amount is a UInputNumber: a text input with inputmode="decimal" and no name; it parses the text when it loses focus.
const amountInput = (wrapper: Wrapper) => wrapper.find('input[inputmode="decimal"]')
async function setAmount(wrapper: Wrapper, text: string) {
  await amountInput(wrapper).setValue(text)
  await amountInput(wrapper).trigger('blur')
}
// Kind, category and interval are all radio groups; each radio carries its value.
const radio = (wrapper: Wrapper, value: string) => wrapper.find(`[role="radio"][value="${value}"]`)
const kindRadios = (wrapper: Wrapper) => [radio(wrapper, 'recurring'), radio(wrapper, 'purchase')]

describe('CostForm in add mode', () => {
  it('starts empty with an enabled kind switch and an "Add cost" button', async () => {
    const wrapper = await mountSuspended(CostForm)
    expect((wrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('')
    const radios = kindRadios(wrapper)
    expect(radios.every(r => r.exists() && r.attributes('disabled') === undefined)).toBe(true)
    expect((amountInput(wrapper).element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Add cost')
  })
  it('does not send anything when the form is invalid', async () => {
    const wrapper = await mountSuspended(CostForm)
    await submit(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(true))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
  })
  it('POSTs a valid purchase to /api/purchases and emits saved', async () => {
    const wrapper = await mountSuspended(CostForm)
    await wrapper.find('input[name="name"]').setValue('Lamp')
    await setAmount(wrapper, '25.5')
    await wrapper.find('input[name="date"]').setValue('2026-04-02')
    await radio(wrapper, 'appliances').trigger('click')
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/purchases', {
      method: 'POST',
      body: expect.objectContaining({ name: 'Lamp', amount: 25.5, category: 'appliances', date: '2026-04-02' }),
    })
    await vi.waitFor(() => expect(wrapper.emitted('saved')).toHaveLength(1))
  })
})

describe('CostForm in edit mode', () => {
  it('pre-fills the fields, locks the kind and says "Save"', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    expect((wrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('Laptop')
    expect((amountInput(wrapper).element as HTMLInputElement).value).toBe('1200.00')
    expect((wrapper.find('input[name="date"]').element as HTMLInputElement).value).toBe('2026-03-14')
    expect(kindRadios(wrapper).every(r => r.attributes('disabled') !== undefined)).toBe(true)
    expect(radio(wrapper, 'appliances').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Save')
  })
  it('shows the fields of the stored kind only', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: monthly } })
    expect(wrapper.find('input[name="date"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Interval')
  })
  it('PATCHes a purchase to /api/purchases/:id and emits saved', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    await wrapper.find('input[name="name"]').setValue('Gaming laptop')
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/purchases/5', {
      method: 'PATCH',
      body: expect.objectContaining({ name: 'Gaming laptop', amount: 1200, date: '2026-03-14' }),
    })
    await vi.waitFor(() => expect(wrapper.emitted('saved')).toHaveLength(1))
  })
  it('PATCHes a recurring cost to /api/recurring-costs/:id', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: monthly } })
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledWith('/api/recurring-costs/3', {
      method: 'PATCH',
      body: expect.objectContaining({ name: 'Rent', interval: 'monthly' }),
    })
  })
  it('sends only the fields the schema knows (no id, no kind)', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    await submit(wrapper)
    await sent()
    const body = fetchMock.mock.calls[0]![1].body
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('kind')
  })
})

describe('CostForm errors and cancel', () => {
  it('shows no save banner when the form opens', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
  it('shows a save banner, keeps the input and does not emit saved when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    await submit(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    const banner = wrapper.find('[role="alert"]')
    expect(banner.text()).toContain('Could not save the cost.')
    expect(banner.text()).toContain('Please try again. What you entered is still here.')
    expect(banner.text()).not.toContain('boom')
    expect((wrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('Laptop')
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(addToast).not.toHaveBeenCalled()
  })
  it('hides the save banner when the next submit succeeds', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({})
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    await submit(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    await submit(wrapper)
    await vi.waitFor(() => expect(wrapper.emitted('saved')).toHaveLength(1))
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
  it('shows the save banner in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      fetchMock.mockRejectedValueOnce(new Error('boom'))
      const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
      await submit(wrapper)
      await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
      const banner = wrapper.find('[role="alert"]')
      expect(banner.text()).toContain('Die Kosten konnten nicht gespeichert werden.')
      expect(banner.text()).toContain('Bitte versuche es erneut. Deine Eingaben sind noch da.')
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('emits cancel and sends nothing when Cancel is clicked', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    const cancel = wrapper.findAll('button').find(button => button.text() === 'Cancel')
    await cancel!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// The form can be opened for a month (the month page): a purchase starts in that month and a yearly or quarterly cost gets it as due month.
describe('CostForm for a month', () => {
  const october = { year: 2026, month: 10 }
  type FormVm = { state: { date: string, dueMonth?: number, interval: string, name: string, amount?: number, category?: string }, kind: string }
  const vm = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.vm as unknown as FormVm
  const dateInput = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.find('input[name="date"]')

  it('starts a purchase on the first day of the month and limits the date to that month', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    const input = dateInput(wrapper)
    expect((input.element as HTMLInputElement).value).toBe('2026-10-01')
    expect(input.attributes('min')).toBe('2026-10-01')
    expect(input.attributes('max')).toBe('2026-10-31')
  })
  it('names the month in a hint next to the date', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    expect(wrapper.text()).toContain('Pre-filled with October 2026. Pick the day.')
  })
  it('limits the date to the real length of the month, also in a leap year', async () => {
    const leap = await mountSuspended(CostForm, { props: { month: { year: 2028, month: 2 } } })
    expect(dateInput(leap).attributes('max')).toBe('2028-02-29')
    const normal = await mountSuspended(CostForm, { props: { month: { year: 2026, month: 2 } } })
    expect(dateInput(normal).attributes('max')).toBe('2026-02-28')
  })
  it('has German text for the hint', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    expect(wrapper.text()).toContain('Vorbelegt mit Oktober 2026. Wähle den Tag.')
    await useNuxtApp().$i18n.setLocale('en')
  })
  it('preselects the month as due month of a yearly cost, and shows it', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    vm(wrapper).kind = 'recurring'
    vm(wrapper).state.interval = 'yearly'
    await vi.waitFor(() => expect(wrapper.text()).toContain('Due month'))
    expect(vm(wrapper).state.dueMonth).toBe(10)
    expect(wrapper.text()).toContain('October')
  })
  it('preselects the month as due month of a quarterly cost', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: { year: 2026, month: 3 } } })
    vm(wrapper).kind = 'recurring'
    vm(wrapper).state.interval = 'quarterly'
    await vi.waitFor(() => expect(wrapper.text()).toContain('Due month'))
    expect(vm(wrapper).state.dueMonth).toBe(3)
  })
  it('shows no due month for a monthly cost', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    vm(wrapper).kind = 'recurring'
    await vi.waitFor(() => expect(wrapper.find('input[name="date"]').exists()).toBe(false))
    expect(wrapper.text()).not.toContain('Due month')
  })
  it('keeps the due month free to change', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    vm(wrapper).kind = 'recurring'
    vm(wrapper).state.interval = 'yearly'
    vm(wrapper).state.dueMonth = 3
    vm(wrapper).state.name = 'Insurance'
    vm(wrapper).state.amount = 120
    vm(wrapper).state.category = 'insurance'
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledWith('/api/recurring-costs', {
      method: 'POST',
      body: expect.objectContaining({ interval: 'yearly', dueMonth: 3 }),
    })
  })
  it('sends the preselected due month when the cost is saved untouched', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    vm(wrapper).kind = 'recurring'
    vm(wrapper).state.interval = 'yearly'
    vm(wrapper).state.name = 'Insurance'
    vm(wrapper).state.amount = 120
    vm(wrapper).state.category = 'insurance'
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledWith('/api/recurring-costs', {
      method: 'POST',
      body: expect.objectContaining({ interval: 'yearly', dueMonth: 10 }),
    })
  })
  it('sends the preselected date when a purchase is saved untouched', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: october } })
    vm(wrapper).state.name = 'Lamp'
    vm(wrapper).state.amount = 25
    vm(wrapper).state.category = 'appliances'
    await submit(wrapper)
    await sent()
    expect(fetchMock).toHaveBeenCalledWith('/api/purchases', {
      method: 'POST',
      body: expect.objectContaining({ date: '2026-10-01' }),
    })
  })
  it('does not change anything without a month', async () => {
    const wrapper = await mountSuspended(CostForm)
    const input = dateInput(wrapper)
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(input.attributes('min')).toBeUndefined()
    expect(input.attributes('max')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Pre-filled with')
    expect(vm(wrapper).state.dueMonth).toBeUndefined()
  })
  it('keeps the values of a stored cost when it is edited', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase, month: october } })
    expect((dateInput(wrapper).element as HTMLInputElement).value).toBe('2026-03-14')
  })
})

// The redesigned controls: kind and interval as segmented radio groups, category chips, the formatted amount and the business row.
describe('CostForm controls', () => {
  const state = (wrapper: Wrapper) => (wrapper.vm as unknown as { state: { amount?: number, category?: string, dueMonth?: number, interval: string, business: boolean } }).state

  it('switches to a recurring cost through the kind radio', async () => {
    const wrapper = await mountSuspended(CostForm)
    await radio(wrapper, 'recurring').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('input[name="date"]').exists()).toBe(false))
    expect(radio(wrapper, 'monthly').attributes('aria-checked')).toBe('true')
  })
  it('names the kind and the category groups for screen readers', async () => {
    const wrapper = await mountSuspended(CostForm)
    const legends = wrapper.findAll('legend').map(legend => legend.text())
    expect(legends).toContain('Type')
    expect(legends).toContain('Category')
  })
  it('offers one chip per category, none picked at first', async () => {
    const wrapper = await mountSuspended(CostForm)
    const chips = CATEGORIES.map(category => radio(wrapper, category))
    expect(chips.every(chip => chip.exists() && chip.attributes('aria-checked') === 'false')).toBe(true)
    expect(wrapper.text()).toContain('Housing')
    expect(wrapper.text()).toContain('Mobility')
  })
  it('marks the category group invalid and links its error after an empty submit', async () => {
    const wrapper = await mountSuspended(CostForm)
    await submit(wrapper)
    const group = () => wrapper.find('fieldset:has([role="radio"][value="housing"])')
    await vi.waitFor(() => expect(group().attributes('aria-invalid')).toBe('true'))
    const errorId = group().attributes('aria-describedby')
    expect(errorId).toBeTruthy()
    expect(wrapper.find(`[id="${errorId}"]`).text()).not.toBe('')
  })
  it('picks a category with a click', async () => {
    const wrapper = await mountSuspended(CostForm)
    await radio(wrapper, 'food').trigger('click')
    await vi.waitFor(() => expect(state(wrapper).category).toBe('food'))
    expect(radio(wrapper, 'food').attributes('aria-checked')).toBe('true')
  })
  it('moves the category with the arrow keys and keeps the chips one tab stop', async () => {
    const wrapper = await mountSuspended(CostForm, { attachTo: document.body })
    await radio(wrapper, 'housing').trigger('click')
    await vi.waitFor(() => expect(state(wrapper).category).toBe('housing'))
    const tabStops = () => CATEGORIES.filter(category => radio(wrapper, category).attributes('tabindex') === '0')
    ;(radio(wrapper, 'housing').element as HTMLElement).focus()
    await vi.waitFor(() => expect(tabStops()).toEqual(['housing']))
    await radio(wrapper, 'housing').trigger('keydown', { key: 'ArrowRight' })
    await vi.waitFor(() => expect(state(wrapper).category).toBe('insurance'))
    expect(radio(wrapper, 'insurance').attributes('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(radio(wrapper, 'insurance').element)
    expect(tabStops()).toEqual(['insurance'])
    wrapper.unmount()
  })
  it('shows the due month only for a quarterly or yearly cost', async () => {
    const wrapper = await mountSuspended(CostForm)
    await radio(wrapper, 'recurring').trigger('click')
    await vi.waitFor(() => expect(radio(wrapper, 'quarterly').exists()).toBe(true))
    expect(wrapper.text()).not.toContain('Due month')
    await radio(wrapper, 'quarterly').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Due month'))
  })
  it('defaults the due month to the current month when there is no month page', async () => {
    const wrapper = await mountSuspended(CostForm)
    await radio(wrapper, 'recurring').trigger('click')
    await vi.waitFor(() => expect(radio(wrapper, 'yearly').exists()).toBe(true))
    await radio(wrapper, 'yearly').trigger('click')
    await vi.waitFor(() => expect(state(wrapper).dueMonth).toBe(useYear().currentMonth.value))
  })
  it('names the repeat months under the due month and links them to the select', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { month: { year: 2026, month: 11 } } })
    await radio(wrapper, 'recurring').trigger('click')
    await vi.waitFor(() => expect(radio(wrapper, 'quarterly').exists()).toBe(true))
    await radio(wrapper, 'quarterly').trigger('click')
    const helpId = () => wrapper.find('[role="combobox"]').attributes('aria-describedby')?.split(' ').find(id => id.endsWith('-help'))
    const hint = () => wrapper.find(`[id="${helpId()}"]`)
    await vi.waitFor(() => expect(hint().text()).toBe('Repeats in February, May, August, and November.'))
    await radio(wrapper, 'yearly').trigger('click')
    await vi.waitFor(() => expect(hint().text()).toBe('Repeats every year in November.'))
  })
  it('names the repeat months in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      const wrapper = await mountSuspended(CostForm, { props: { month: { year: 2026, month: 11 } } })
      await radio(wrapper, 'recurring').trigger('click')
      await vi.waitFor(() => expect(radio(wrapper, 'quarterly').exists()).toBe(true))
      await radio(wrapper, 'quarterly').trigger('click')
      await vi.waitFor(() => expect(wrapper.text()).toContain('Fällig im Februar, Mai, August und November.'))
      await radio(wrapper, 'yearly').trigger('click')
      await vi.waitFor(() => expect(wrapper.text()).toContain('Fällig jedes Jahr im November.'))
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('reads the amount as a number and shows it with two decimals', async () => {
    const wrapper = await mountSuspended(CostForm)
    await setAmount(wrapper, '25.5')
    await vi.waitFor(() => expect(state(wrapper).amount).toBe(25.5))
    expect((amountInput(wrapper).element as HTMLInputElement).value).toBe('25.50')
  })
  it('rounds the amount to cents', async () => {
    const wrapper = await mountSuspended(CostForm)
    await setAmount(wrapper, '12.345')
    await vi.waitFor(() => expect(state(wrapper).amount).toBe(12.35))
  })
  it('shows large amounts without a thousands separator, so they fit the field', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: { ...purchase, amount: 9999.99 } } })
    expect((amountInput(wrapper).element as HTMLInputElement).value).toBe('9999.99')
  })
  it('uses the decimal comma in German, for showing and for typing', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      const shown = await mountSuspended(CostForm, { props: { cost: purchase } })
      expect((amountInput(shown).element as HTMLInputElement).value).toBe('1200,00')
      const typed = await mountSuspended(CostForm)
      await setAmount(typed, '25,5')
      await vi.waitFor(() => expect(state(typed).amount).toBe(25.5))
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('explains the business flag and toggles it', async () => {
    const wrapper = await mountSuspended(CostForm)
    expect(wrapper.text()).toContain('Business cost')
    expect(wrapper.text()).toContain('Counted apart from household costs')
    await wrapper.find('[role="checkbox"]').trigger('click')
    await vi.waitFor(() => expect(state(wrapper).business).toBe(true))
  })
  it('has German text for the business hint', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      const wrapper = await mountSuspended(CostForm)
      expect(wrapper.text()).toContain('Getrennt von den Haushaltskosten gezählt')
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
})

describe('CostForm error messages', () => {
  // The message a field points to with aria-describedby; the amount has no name and the category is a fieldset.
  const fields: Record<string, (wrapper: Wrapper) => ReturnType<Wrapper['find']>> = {
    amount: amountInput,
    name: wrapper => wrapper.find('input[name="name"]'),
    category: wrapper => wrapper.find('fieldset:has([role="radio"][value="housing"])'),
    date: wrapper => wrapper.find('input[name="date"]'),
    dueMonth: wrapper => wrapper.find('[role="combobox"]'),
  }
  // aria-describedby can also name the help text (due month), so only the id ending in -error counts.
  const errorText = (wrapper: Wrapper, field: string) => {
    const id = fields[field]!(wrapper).attributes('aria-describedby')?.split(' ').find(id => id.endsWith('-error'))
    return id ? wrapper.find(`[id="${id}"]`).text() : ''
  }
  // A recurring yearly cost without a due month; the form fills one in by default, so the test clears it.
  async function yearlyWithoutDueMonth(wrapper: Wrapper) {
    await radio(wrapper, 'recurring').trigger('click')
    await vi.waitFor(() => expect(radio(wrapper, 'yearly').exists()).toBe(true))
    await radio(wrapper, 'yearly').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="combobox"]').exists()).toBe(true))
    ;(wrapper.vm as unknown as { state: { dueMonth?: number } }).state.dueMonth = undefined
    await submit(wrapper)
  }

  it('shows no error message when the form opens', async () => {
    const wrapper = await mountSuspended(CostForm)
    expect(wrapper.findAll('[data-slot="error"]').map(error => error.text()).join('')).toBe('')
    expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(false)
  })
  it('shows a short message per field after an empty submit', async () => {
    const wrapper = await mountSuspended(CostForm)
    await submit(wrapper)
    await vi.waitFor(() => expect(errorText(wrapper, 'name')).toBe('Enter a name, for example "Rent".'))
    expect(errorText(wrapper, 'amount')).toBe('Enter an amount greater than €0.')
    expect(errorText(wrapper, 'category')).toBe('Pick a category for the cost.')
    expect(errorText(wrapper, 'date')).toBe('Enter the date of purchase.')
  })
  it('shows the messages in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      const wrapper = await mountSuspended(CostForm)
      await submit(wrapper)
      await vi.waitFor(() => expect(errorText(wrapper, 'name')).toBe('Gib einen Namen ein, zum Beispiel "Miete".'))
      expect(errorText(wrapper, 'amount')).toBe('Gib einen Betrag größer als €0 ein.')
      expect(errorText(wrapper, 'category')).toBe('Wähle eine Kategorie für die Kosten.')
      expect(errorText(wrapper, 'date')).toBe('Gib das Kaufdatum ein.')
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('shows the due month message', async () => {
    const wrapper = await mountSuspended(CostForm)
    await yearlyWithoutDueMonth(wrapper)
    await vi.waitFor(() => expect(errorText(wrapper, 'dueMonth')).toBe('Pick the month the cost is due.'))
  })
  it('shows the due month message in German', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      const wrapper = await mountSuspended(CostForm)
      await yearlyWithoutDueMonth(wrapper)
      await vi.waitFor(() => expect(errorText(wrapper, 'dueMonth')).toBe('Wähle den Monat, in dem die Kosten fällig sind.'))
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
  it('removes the message once the field is valid', async () => {
    const wrapper = await mountSuspended(CostForm)
    await submit(wrapper)
    await vi.waitFor(() => expect(errorText(wrapper, 'name')).not.toBe(''))
    await wrapper.find('input[name="name"]').setValue('Lamp')
    await wrapper.find('input[name="name"]').trigger('blur')
    await vi.waitFor(() => expect(errorText(wrapper, 'name')).toBe(''))
  })
})
