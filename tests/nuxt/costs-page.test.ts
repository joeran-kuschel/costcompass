import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import CostsPage from '~/pages/costs.vue'

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: addToast }))

// The page talks to the real $fetch; the endpoints below stand in for the API and record what arrives.
const deleteCalls: string[] = []
let failDelete = false
for (const url of ['/api/recurring-costs/1', '/api/purchases/2']) {
  registerEndpoint(url, {
    method: 'DELETE',
    handler: () => {
      deleteCalls.push(url)
      if (failDelete) throw new Error('boom')
      return ''
    },
  })
}

registerEndpoint('/api/recurring-costs', () => [
  { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' },
  { id: 4, kind: 'recurring', name: 'Liability insurance', amount: 90, category: 'insurance', business: true, interval: 'yearly', dueMonth: 3 },
])
registerEndpoint('/api/purchases', () => [
  { id: 2, kind: 'purchase', name: 'Laptop', amount: 1200.5, category: 'appliances', business: true, date: '2026-03-14' },
])

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

beforeEach(async () => {
  deleteCalls.length = 0
  failDelete = false
  addToast.mockReset()
  wrapper = await mountSuspended(CostsPage)
})
afterEach(() => {
  wrapper.unmount()
})

// Modals are teleported to the body, so their content is not inside the wrapper.
const body = () => document.body
const button = (text: string) =>
  [...body().querySelectorAll('button')].find(b => b.textContent?.trim() === text)
const input = (name: string) => body().querySelector<HTMLInputElement>(`input[name="${name}"]`)
const click = async (element: Element | null | undefined) => {
  expect(element).toBeTruthy()
  ;(element as HTMLElement).click()
  await nextTick()
}

describe('costs page table', () => {
  it('lists recurring costs and purchases together', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    const text = wrapper.find('tbody').text()
    expect(text).toContain('Rent')
    expect(text).toContain('Liability insurance')
    expect(text).toContain('Laptop')
  })
  it('formats the amount as euros and describes when each cost falls', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    const text = wrapper.find('tbody').text()
    expect(text).toContain('€800.00')
    expect(text).toContain('€1,200.50')
    expect(text).toContain('Yearly, March')
    expect(text).toMatch(/3\/14\/2026/)
  })
  it('gives every row an edit and a delete button named after the cost', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    for (const name of ['Rent', 'Liability insurance', 'Laptop']) {
      expect(wrapper.find(`button[aria-label="Edit ${name}"]`).exists()).toBe(true)
      expect(wrapper.find(`button[aria-label="Delete ${name}"]`).exists()).toBe(true)
    }
  })
})

describe('costs page add and edit', () => {
  it('opens an empty form titled "Add cost"', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.findAll('button').find(b => b.text() === 'Add cost')?.element)
    await vi.waitFor(() => expect(input('name')).toBeTruthy())
    expect(input('name')!.value).toBe('')
    expect(body().textContent).toContain('Add cost')
  })
  it('opens the form pre-filled and titled with the name when a row is edited', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Edit Laptop"]').element)
    await vi.waitFor(() => expect(input('name')).toBeTruthy())
    expect(input('name')!.value).toBe('Laptop')
    expect(input('amount')!.value).toBe('1200.5')
    expect(body().textContent).toContain('Edit Laptop')
    expect(button('Save')).toBeTruthy()
  })
  it('closes the form on Cancel without sending anything', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Edit Rent"]').element)
    await vi.waitFor(() => expect(input('name')).toBeTruthy())
    await click(button('Cancel'))
    await vi.waitFor(() => expect(input('name')).toBeNull())
    expect(deleteCalls).toEqual([])
  })
  it('does not keep the edited cost around: the next "Add cost" starts empty', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Edit Rent"]').element)
    await vi.waitFor(() => expect(input('name')).toBeTruthy())
    await click(button('Cancel'))
    await vi.waitFor(() => expect(input('name')).toBeNull())
    await click(wrapper.findAll('button').find(b => b.text() === 'Add cost')?.element)
    await vi.waitFor(() => expect(input('name')).toBeTruthy())
    expect(input('name')!.value).toBe('')
  })
})

describe('costs page delete', () => {
  it('asks for confirmation first and sends nothing yet', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Delete Rent"]').element)
    await vi.waitFor(() => expect(body().textContent).toContain('Delete cost?'))
    expect(body().textContent).toContain('Rent')
    expect(deleteCalls).toEqual([])
  })
  it('does nothing when the confirmation is cancelled', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Delete Rent"]').element)
    await vi.waitFor(() => expect(body().textContent).toContain('Delete cost?'))
    await click(button('Cancel'))
    await vi.waitFor(() => expect(body().textContent).not.toContain('Delete cost?'))
    expect(deleteCalls).toEqual([])
  })
  it('DELETEs a recurring cost from /api/recurring-costs/:id after confirmation', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Delete Rent"]').element)
    await vi.waitFor(() => expect(button('Delete')).toBeTruthy())
    await click(button('Delete'))
    await vi.waitFor(() => expect(deleteCalls).toEqual(['/api/recurring-costs/1']))
    expect(addToast).not.toHaveBeenCalled()
  })
  it('DELETEs a purchase from /api/purchases/:id after confirmation', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Delete Laptop"]').element)
    await vi.waitFor(() => expect(button('Delete')).toBeTruthy())
    await click(button('Delete'))
    await vi.waitFor(() => expect(deleteCalls).toEqual(['/api/purchases/2']))
  })
  it('shows an error toast when the delete fails', async () => {
    failDelete = true
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find('button[aria-label="Delete Rent"]').element)
    await vi.waitFor(() => expect(button('Delete')).toBeTruthy())
    await click(button('Delete'))
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' })))
  })
})
