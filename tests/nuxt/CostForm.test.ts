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

describe('CostForm in add mode', () => {
  it('starts empty with an enabled kind switch and an "Add cost" button', async () => {
    const wrapper = await mountSuspended(CostForm)
    expect((wrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios).toHaveLength(2)
    expect(radios.every(radio => radio.attributes('disabled') === undefined)).toBe(true)
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
    await wrapper.find('input[name="amount"]').setValue('25.5')
    await wrapper.find('input[name="date"]').setValue('2026-04-02')
    // the category is a USelect; set it through the form state instead of the popup
    ;(wrapper.vm as unknown as { state: { category: string } }).state.category = 'appliances'
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
    expect((wrapper.find('input[name="amount"]').element as HTMLInputElement).value).toBe('1200')
    expect((wrapper.find('input[name="date"]').element as HTMLInputElement).value).toBe('2026-03-14')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.every(radio => radio.attributes('disabled') !== undefined)).toBe(true)
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
  it('shows an error toast and does not emit saved when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    await submit(wrapper)
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' })))
    expect(wrapper.emitted('saved')).toBeUndefined()
  })
  it('emits cancel and sends nothing when Cancel is clicked', async () => {
    const wrapper = await mountSuspended(CostForm, { props: { cost: purchase } })
    const cancel = wrapper.findAll('button').find(button => button.text() === 'Cancel')
    await cancel!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
