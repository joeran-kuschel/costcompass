import { describe, it, expect, vi, afterEach } from 'vitest'
import type { DOMWrapper } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import CostsPage from '~/pages/costs.vue'

registerEndpoint('/api/recurring-costs', () => [
  { id: 1, kind: 'recurring', name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' },
  { id: 4, kind: 'recurring', name: 'Liability insurance', amount: 90, category: 'insurance', business: true, interval: 'yearly', dueMonth: 3 },
])
registerEndpoint('/api/purchases', () => [
  { id: 2, kind: 'purchase', name: 'Laptop', amount: 1200.5, category: 'appliances', business: true, date: '2026-03-14' },
  { id: 3, kind: 'purchase', name: 'Äpfel', amount: 3, category: 'food', business: false, date: '2026-03-15' },
])

// Column positions in the table.
const NAME = 0
const CATEGORY = 1
const KIND = 2
const WHEN = 3
const AMOUNT = 4
const BUSINESS = 5
const ACTIONS = 6

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

async function mountTable() {
  wrapper = await mountSuspended(CostsPage)
  await vi.waitFor(() => expect(wrapper.findAll('tbody tr')).toHaveLength(4))
}
const column = (index: number) => wrapper.findAll('tbody tr').map((row: DOMWrapper<Element>) => row.findAll('td')[index]!.text())
// The name cell holds a badge, the name with an optional "Business" badge, and the category as a caption.
// Only the name itself is read: the text nodes of its paragraph, without the business badge.
const names = () => wrapper.findAll('tbody tr').map((row: DOMWrapper<Element>) =>
  [...row.findAll('td')[NAME]!.find('p').element.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent)
    .join('')
    .trim())
const headerCell = (index: number) =>wrapper.findAll('thead th')[index]!
const headerButton = (index: number) => headerCell(index).find('button')
async function clickHeader(index: number) {
  await headerButton(index).trigger('click')
}
async function setLanguage(code: 'en' | 'de') {
  await useNuxtApp().$i18n.setLocale(code)
}

afterEach(async () => {
  wrapper.unmount()
  await setLanguage('en')
})

describe('costs table default order', () => {
  it('is sorted by name, ignoring case and treating umlauts as their base letter', async () => {
    await mountTable()
    expect(names()).toEqual(['Äpfel', 'Laptop', 'Liability insurance', 'Rent'])
  })
})

describe('costs table sort buttons', () => {
  it('sorts by name ascending, then descending', async () => {
    await mountTable()
    await clickHeader(NAME)
    await vi.waitFor(() => expect(names()).toEqual(['Äpfel', 'Laptop', 'Liability insurance', 'Rent']))
    await clickHeader(NAME)
    await vi.waitFor(() => expect(names()).toEqual(['Rent', 'Liability insurance', 'Laptop', 'Äpfel']))
  })
  it('sorts amounts numerically, not as text', async () => {
    await mountTable()
    await clickHeader(AMOUNT)
    await vi.waitFor(() => expect(column(AMOUNT)).toEqual(['€3.00', '€90.00', '€800.00', '€1,200.50']))
    await clickHeader(AMOUNT)
    await vi.waitFor(() => expect(column(AMOUNT)).toEqual(['€1,200.50', '€800.00', '€90.00', '€3.00']))
  })
  it('sorts categories by the text shown in English', async () => {
    await mountTable()
    await clickHeader(CATEGORY)
    await vi.waitFor(() => expect(column(CATEGORY)).toEqual(['Appliances', 'Food', 'Housing', 'Insurance']))
  })
  it('sorts categories by the text shown in German, not by the stored id', async () => {
    await setLanguage('de')
    await mountTable()
    await clickHeader(CATEGORY)
    // By id the order would be appliances, food, housing, insurance, so "Geräte" would come first.
    await vi.waitFor(() => expect(column(CATEGORY)).toEqual(['Essen', 'Geräte', 'Versicherung', 'Wohnen']))
    await clickHeader(CATEGORY)
    await vi.waitFor(() => expect(column(CATEGORY)).toEqual(['Wohnen', 'Versicherung', 'Geräte', 'Essen']))
  })
  it('sorts kinds by the text shown', async () => {
    await mountTable()
    await clickHeader(KIND)
    await vi.waitFor(() => expect(column(KIND)).toEqual(['Purchase', 'Purchase', 'Recurring', 'Recurring']))
    await clickHeader(KIND)
    await vi.waitFor(() => expect(column(KIND)).toEqual(['Recurring', 'Recurring', 'Purchase', 'Purchase']))
  })
  it('sorts the business flag with "No" before "Yes"', async () => {
    await mountTable()
    await clickHeader(BUSINESS)
    await vi.waitFor(() => expect(column(BUSINESS)).toEqual(['No', 'No', 'Yes', 'Yes']))
    await clickHeader(BUSINESS)
    await vi.waitFor(() => expect(column(BUSINESS)).toEqual(['Yes', 'Yes', 'No', 'No']))
  })
  it('keeps a row\'s data together when the order changes', async () => {
    await mountTable()
    await clickHeader(AMOUNT)
    await vi.waitFor(() => expect(column(AMOUNT)[0]).toBe('€3.00'))
    const firstRow = wrapper.findAll('tbody tr')[0]!.text()
    expect(firstRow).toContain('Äpfel')
    expect(firstRow).toContain('Food')
  })
  it('has no sort button on the "When" and actions columns', async () => {
    await mountTable()
    expect(headerButton(WHEN).exists()).toBe(false)
    expect(headerButton(ACTIONS).exists()).toBe(false)
    expect(headerCell(WHEN).text()).toBe('When')
  })
})

describe('costs table sort button names', () => {
  it('announces the sort state in the accessible name while the visible text stays the same', async () => {
    await mountTable()
    expect(headerButton(NAME).attributes('aria-label')).toBe('Sort by Name')
    await clickHeader(NAME)
    await vi.waitFor(() => expect(headerButton(NAME).attributes('aria-label')).toBe('Name, sorted ascending'))
    await clickHeader(NAME)
    await vi.waitFor(() => expect(headerButton(NAME).attributes('aria-label')).toBe('Name, sorted descending'))
    expect(headerButton(NAME).text()).toBe('Name')
  })
  it('always contains the visible column text', async () => {
    await mountTable()
    for (const index of [NAME, CATEGORY, KIND, AMOUNT, BUSINESS]) {
      expect(headerButton(index).attributes('aria-label')).toContain(headerButton(index).text())
    }
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    await mountTable()
    expect(headerButton(CATEGORY).attributes('aria-label')).toBe('Nach Kategorie sortieren')
    await clickHeader(CATEGORY)
    await vi.waitFor(() => expect(headerButton(CATEGORY).attributes('aria-label')).toBe('Kategorie, aufsteigend sortiert'))
    await clickHeader(CATEGORY)
    await vi.waitFor(() => expect(headerButton(CATEGORY).attributes('aria-label')).toBe('Kategorie, absteigend sortiert'))
  })
})
