import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import CostsPage from '~/pages/costs.vue'

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: addToast }))

// The page talks to the real $fetch; the endpoints below stand in for the API and record what arrives.
const deleteCalls: string[] = []
let failDelete = false
// When set, a DELETE waits for this promise, so a test can act while the request is in flight.
let holdDelete: Promise<void> | null = null
for (const url of ['/api/recurring-costs/1', '/api/purchases/2']) {
  registerEndpoint(url, {
    method: 'DELETE',
    handler: async () => {
      deleteCalls.push(url)
      if (holdDelete) await holdDelete
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
  holdDelete = null
  addToast.mockReset()
  wrapper = await mountSuspended(CostsPage)
})
afterEach(() => {
  wrapper.unmount()
  useCostDialog().close()
  // The summary tests change the selected year and the cached lists; start the next test without them.
  clearNuxtState(['year'])
  clearNuxtData()
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

describe('costs page summary line', () => {
  // Rent (800 a month) and liability insurance (90 a year) recur; the laptop (1,200.50) was bought in 2026.
  // The total is shown in whole euros: 9,600 + 90 + 1,200.50 = 10,890.50, so "€10,891".
  const line = () => wrapper.find('header p')
  async function showYear(year: number) {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    useYear().year.value = year
    await nextTick()
  }

  it('counts the recurring costs and purchases and names the total of the year', async () => {
    await showYear(2026)
    expect(line().text().replace(/\s+/g, ' ')).toBe('2 recurring costs and 1 purchase · €10,891 in 2026')
  })
  it('sets only the amount in bold', async () => {
    await showYear(2026)
    expect(line().find('b').text()).toBe('€10,891')
    expect(line().find('b').classes()).toContain('font-extrabold')
  })
  it('sits in the page header, below the heading', async () => {
    await showYear(2026)
    expect(wrapper.find('header h1').text()).toBe('Costs')
    expect(wrapper.find('header h1 + p').exists()).toBe(true)
  })
  it('counts all costs, but adds up only the purchases of the year it names', async () => {
    // 2025 is no year with data here, so it falls back to the current year, like the dashboard.
    useYear().year.value = 2025
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await nextTick()
    const current = new Date().getUTCFullYear()
    expect(line().text()).toContain(`in ${current}`)
    expect(line().text()).toContain('2 recurring costs and 1 purchase')
  })
  it('updates when the lists change', async () => {
    await showYear(2026)
    const { recurring } = useCostLists()
    recurring.value = recurring.value!.filter(cost => cost.name !== 'Rent')
    await nextTick()
    expect(line().text().replace(/\s+/g, ' ')).toBe('1 recurring cost and 1 purchase · €1,291 in 2026')
  })
  it('uses the singular, the plural and the plural for zero', () => {
    const { t } = useNuxtApp().$i18n
    expect([0, 1, 2].map(n => t('costs.summary.recurring', n))).toEqual(['0 recurring costs', '1 recurring cost', '2 recurring costs'])
    expect([0, 1, 2].map(n => t('costs.summary.purchases', n))).toEqual(['0 purchases', '1 purchase', '2 purchases'])
  })
  it('has German forms with a singular that reads right', async () => {
    const { t, setLocale } = useNuxtApp().$i18n
    await setLocale('de')
    try {
      expect([0, 1, 2].map(n => t('costs.summary.recurring', n))).toEqual(['0 wiederkehrende Posten', '1 wiederkehrender Posten', '2 wiederkehrende Posten'])
      expect([0, 1, 2].map(n => t('costs.summary.purchases', n))).toEqual(['0 Anschaffungen', '1 Anschaffung', '2 Anschaffungen'])
      await showYear(2026)
      expect(line().text().replace(/\s+/g, ' ')).toBe('2 wiederkehrende Posten und 1 Anschaffung · 10.891 € im Jahr 2026')
    } finally {
      await setLocale('en')
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

describe('costs page kind filter', () => {
  // Two recurring costs (Liability insurance, Rent) and one purchase (Laptop); rows are sorted by name.
  const group = () => wrapper.find('[role="group"]')
  const chips = () => group().findAll('button')
  const chip = (label: string) => chips().find(c => c.text() === label)
  // The name is the first text in the cell; the business badge follows it.
  const names = () => wrapper.findAll('tbody tr').map(row => row.find('td p').element.firstChild!.textContent!.trim())
  const status = () => wrapper.find('[role="status"]')
  async function loaded() {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
  }

  it('is a group labelled "Show" with three chips and their counts', async () => {
    await loaded()
    expect(group().attributes('aria-label')).toBe('Show')
    expect(chips().map(c => c.text())).toEqual(['All 3', 'Recurring 2', 'Purchases 1'])
  })
  it('selects "All" by default and shows every cost', async () => {
    await loaded()
    expect(chips().map(c => c.attributes('aria-pressed'))).toEqual(['true', 'false', 'false'])
    expect(names()).toEqual(['Laptop', 'Liability insurance', 'Rent'])
  })
  it('shows only the recurring costs', async () => {
    await loaded()
    await chip('Recurring 2')!.trigger('click')
    expect(names()).toEqual(['Liability insurance', 'Rent'])
  })
  it('shows only the purchases', async () => {
    await loaded()
    await chip('Purchases 1')!.trigger('click')
    expect(names()).toEqual(['Laptop'])
  })
  it('shows every cost again after "All"', async () => {
    await loaded()
    await chip('Purchases 1')!.trigger('click')
    await chip('All 3')!.trigger('click')
    expect(names()).toEqual(['Laptop', 'Liability insurance', 'Rent'])
  })
  it('presses exactly one chip at a time and marks it with a check icon, not by colour alone', async () => {
    await loaded()
    await chip('Recurring 2')!.trigger('click')
    expect(chips().map(c => c.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(chips().map(c => c.find('[class*="check"]').exists())).toEqual([false, true, false])
  })
  it('gives every chip a primary focus outline', async () => {
    await loaded()
    for (const c of chips()) {
      expect(c.classes()).toContain('focus-visible:outline-primary')
    }
  })
  it('keeps the counts of all costs whatever chip is pressed', async () => {
    await loaded()
    await chip('Purchases 1')!.trigger('click')
    expect(chips().map(c => c.text())).toEqual(['All 3', 'Recurring 2', 'Purchases 1'])
  })
  it('announces how many costs are shown', async () => {
    await loaded()
    expect(status().text()).toBe('3 costs shown')
    await chip('Purchases 1')!.trigger('click')
    expect(status().text()).toBe('1 cost shown')
  })
  it('keeps the sort of the table when the filter changes', async () => {
    await loaded()
    await wrapper.find('th button').trigger('click')
    await wrapper.find('th button').trigger('click')
    expect(names()).toEqual(['Rent', 'Liability insurance', 'Laptop'])
    await chip('Recurring 2')!.trigger('click')
    expect(names()).toEqual(['Rent', 'Liability insurance'])
  })
  it('has German labels and counts', async () => {
    await loaded()
    await useNuxtApp().$i18n.setLocale('de')
    try {
      await vi.waitFor(() => expect(group().attributes('aria-label')).toBe('Anzeigen'))
      expect(chips().map(c => c.text())).toEqual(['Alle 3', 'Wiederkehrend 2', 'Anschaffung 1'])
      expect(status().text()).toBe('3 Posten angezeigt')
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

describe('costs page delete in flight', () => {
  let release: () => void
  beforeEach(() => {
    holdDelete = new Promise(resolve => { release = resolve })
  })
  async function startDelete(label: string) {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find(`button[aria-label="${label}"]`).element)
    await vi.waitFor(() => expect(button('Delete')).toBeTruthy())
    await click(button('Delete'))
    await vi.waitFor(() => expect(deleteCalls).toHaveLength(1))
  }

  it('disables the Delete button while the request runs', async () => {
    await startDelete('Delete Rent')
    expect(button('Delete')?.disabled).toBe(true)
    release()
    await vi.waitFor(() => expect(button('Delete')).toBeUndefined())
  })
  it('sends exactly one DELETE when Delete is clicked twice', async () => {
    await startDelete('Delete Rent')
    // Like a double click: the second click comes before the first request has answered.
    button('Delete')?.click()
    await nextTick()
    release()
    await vi.waitFor(() => expect(button('Delete')).toBeUndefined())
    expect(deleteCalls).toEqual(['/api/recurring-costs/1'])
    expect(addToast).not.toHaveBeenCalled()
  })
  it('lets the user try again after a failed delete', async () => {
    failDelete = true
    await startDelete('Delete Rent')
    release()
    await vi.waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' })))
    holdDelete = null
    await click(wrapper.find('button[aria-label="Delete Rent"]').element)
    await vi.waitFor(() => expect(button('Delete')).toBeTruthy())
    expect(button('Delete')?.disabled).toBe(false)
    await click(button('Delete'))
    await vi.waitFor(() => expect(deleteCalls).toHaveLength(2))
  })
})

describe('costs page delete confirmation', () => {
  const dialog = () => body().querySelector<HTMLElement>('[role="alertdialog"]')
  // The delete button is named "Delete <name>" in English and "<name> löschen" in German.
  async function openFor(name: string, label = `Delete ${name}`) {
    await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(3))
    await click(wrapper.find(`button[aria-label="${label}"]`).element)
    await vi.waitFor(() => expect(dialog()).not.toBeNull())
  }
  const byId = (id: string | null | undefined) => (id ? document.getElementById(id) : null)
  // German amounts have a non-breaking space before the euro sign; compare with plain spaces.
  const textOf = (element: Element) => (element.textContent ?? '').replace(/\u00a0/g, ' ')

  it('is an alert dialog named by its title and described by its message', async () => {
    await openFor('Rent')
    expect(byId(dialog()!.getAttribute('aria-labelledby'))?.textContent?.trim()).toBe('Delete cost?')
    expect(byId(dialog()!.getAttribute('aria-describedby'))?.textContent?.trim()).toBe('Rent (€800.00, monthly) will be permanently deleted.')
  })
  it('names the amount with cents and the interval of a recurring cost, without the due month', async () => {
    await openFor('Liability insurance')
    expect(dialog()!.textContent).toContain('Liability insurance (€90.00, yearly) will be permanently deleted.')
  })
  it('names the amount and the long date of a purchase', async () => {
    await openFor('Laptop')
    expect(dialog()!.textContent).toContain('Laptop (€1,200.50, March 14) will be permanently deleted.')
  })
  it('shows a decorative trash icon in the title and no close button', async () => {
    await openFor('Rent')
    const title = byId(dialog()!.getAttribute('aria-labelledby'))!
    const icon = title.querySelector('[aria-hidden="true"]')
    expect(icon).not.toBeNull()
    expect(icon!.querySelector('[class*="trash"]')).not.toBeNull()
    expect([...dialog()!.querySelectorAll('button')].map(b => b.textContent?.trim())).toEqual(['Delete', 'Cancel'])
  })
  it('puts the focus on Cancel, not on Delete', async () => {
    await openFor('Rent')
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Cancel'))
  })
  it('has German texts', async () => {
    await useNuxtApp().$i18n.setLocale('de')
    try {
      await openFor('Rent', 'Rent löschen')
      expect(byId(dialog()!.getAttribute('aria-labelledby'))?.textContent?.trim()).toBe('Kosten löschen?')
      expect(textOf(dialog()!)).toContain('Rent (800,00 €, monatlich) wird endgültig gelöscht.')
      await click(button('Abbrechen'))
      await vi.waitFor(() => expect(dialog()).toBeNull())
      await openFor('Laptop', 'Laptop löschen')
      expect(textOf(dialog()!)).toContain('Laptop (1.200,50 €, 14. März) wird endgültig gelöscht.')
    } finally {
      await useNuxtApp().$i18n.setLocale('en')
    }
  })
})
