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
  useCostDialog().close()
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
  it('puts edit before delete in every row, both as neutral icon buttons', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    for (const row of wrapper.findAll('tbody tr')) {
      const labels = row.findAll('td').at(-1)!.findAll('button').map(button => button.attributes('aria-label'))
      expect(labels).toHaveLength(2)
      expect(labels[0]).toMatch(/^Edit /)
      expect(labels[1]).toMatch(/^Delete /)
    }
    // The red of a delete action belongs to the confirmation dialog, not to the row (BDesktopCosts mock).
    // Both buttons get the same look, so the classes of the two are the same.
    const classesOf = (label: string) => wrapper.find(`button[aria-label="${label}"]`).classes().sort()
    expect(classesOf('Delete Rent')).toEqual(classesOf('Edit Rent'))
  })
  it('gives every row an edit and a delete button named after the cost', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    for (const name of ['Rent', 'Liability insurance', 'Laptop']) {
      expect(wrapper.find(`button[aria-label="Edit ${name}"]`).exists()).toBe(true)
      expect(wrapper.find(`button[aria-label="Delete ${name}"]`).exists()).toBe(true)
    }
  })
})

describe('costs page name column', () => {
  // Rows are sorted by name: Laptop, Liability insurance, Rent.
  const nameCell = (index: number) => wrapper.findAll('tbody tr')[index]!.findAll('td')[0]!
  it('shows a hidden category badge, the name and the category as a caption', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    const cell = nameCell(2)
    expect(cell.find('.category-disc').attributes('aria-hidden')).toBe('true')
    expect(cell.find('.category-disc').attributes('style')).toContain('--category-size: 40px')
    expect(cell.find('p').text()).toBe('Rent')
    expect(cell.findAll('p')[1]!.text()).toBe('Housing')
  })
  it('lets the name and the business badge wrap, so long names do not widen the table', async () => {
    // jsdom has no layout: this checks the classes; the widths are checked in the browser.
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    const cell = nameCell(1)
    expect(cell.find('div').classes()).toContain('whitespace-normal')
    expect(cell.find('p').classes()).toContain('flex-wrap')
    const whenCell = wrapper.findAll('tbody tr')[1]!.findAll('td')[2]!
    expect(whenCell.find('span').classes()).toContain('whitespace-normal')
  })
  it('marks business costs with the business badge and no other row', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    expect(nameCell(0).find('p').text()).toContain('Business')
    expect(nameCell(1).find('p').text()).toContain('Business')
    expect(nameCell(2).text()).not.toContain('Business')
  })
})

describe('costs page kind column', () => {
  // Rows are sorted by name: Laptop (purchase), Liability insurance and Rent (recurring). Kind is the second column.
  const kindCell = (index: number) => wrapper.findAll('tbody tr')[index]!.findAll('td')[1]!
  const iconIn = (cell: ReturnType<typeof kindCell>, icon: string) => cell.find(`[class*="i-lucide:${icon}"], [class*="i-lucide-${icon}"]`)

  it('shows the repeat icon for recurring costs and the shopping bag for purchases', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    expect(iconIn(kindCell(0), 'shopping-bag').exists()).toBe(true)
    expect(iconIn(kindCell(1), 'repeat').exists()).toBe(true)
    expect(iconIn(kindCell(2), 'repeat').exists()).toBe(true)
    expect(iconIn(kindCell(0), 'repeat').exists()).toBe(false)
  })
  it('keeps the icon decorative and the kind as text', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    expect(iconIn(kindCell(0), 'shopping-bag').attributes('aria-hidden')).toBe('true')
    expect(iconIn(kindCell(2), 'repeat').attributes('aria-hidden')).toBe('true')
    expect(kindCell(0).text()).toBe('Purchase')
    expect(kindCell(2).text()).toBe('Recurring')
  })
  it('uses the same icons as the month page', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    const { kindIcon } = useKind()
    expect(kindCell(0).find(`[class*="${kindIcon('purchase').replace('i-lucide-', '')}"]`).exists()).toBe(true)
    expect(kindCell(2).find(`[class*="${kindIcon('recurring').replace('i-lucide-', '')}"]`).exists()).toBe(true)
  })
  it('has German kind names next to the icons', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await useNuxtApp().$i18n.setLocale('de')
    try {
      // German sorts the same way here: Laptop, Liability insurance, Rent.
      await vi.waitFor(() => expect(kindCell(0).text()).toBe('Anschaffung'))
      expect(kindCell(2).text()).toBe('Wiederkehrend')
      expect(iconIn(kindCell(0), 'shopping-bag').exists()).toBe(true)
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
})

describe('costs page add and edit', () => {
  // The dialog itself lives in the layout (see CostDialog.test.ts); the page only asks for it.
  const dialogState = () => {
    const { open, cost, month } = useCostDialog()
    return { open: open.value, cost: cost.value, month: month.value }
  }
  const addButton = () => wrapper.findAll('button').find(b => b.text() === 'Add cost')
  it('does not ask for the dialog until a button is pressed', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    expect(dialogState().open).toBe(false)
  })
  it('has no "Add cost" button of its own, the sidebar of the layout has it', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    expect(addButton()).toBeUndefined()
  })
  it('asks for the edit dialog with the stored cost of the row when a row is edited', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await wrapper.find('button[aria-label="Edit Laptop"]').trigger('click')
    const { open, cost } = dialogState()
    expect(open).toBe(true)
    expect(cost).toMatchObject({ id: 2, kind: 'purchase', name: 'Laptop', amount: 1200.5 })
  })
  it('does not send anything when a dialog is asked for', async () => {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await wrapper.find('button[aria-label="Edit Rent"]').trigger('click')
    expect(deleteCalls).toEqual([])
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
