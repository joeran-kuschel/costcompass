import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import YearSelect from '~/components/YearSelect.vue'

let wrapper: Awaited<ReturnType<typeof mountSuspended>>

async function mountSelect(modelValue = 2026, years = [2026, 2025, 2024]) {
  wrapper = await mountSuspended(YearSelect, { props: { modelValue, years } })
}
afterEach(async () => {
  wrapper.unmount()
  await useNuxtApp().$i18n.setLocale('en')
})

// The options are teleported to the body, so they are not inside the wrapper.
const combobox = () => wrapper.find('[role="combobox"]')
const options = () => [...document.body.querySelectorAll('[role="option"]')]
async function openList() {
  await combobox().trigger('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse' })
  await vi.waitFor(() => expect(options().length).toBeGreaterThan(0))
}

describe('YearSelect', () => {
  it('is a single combobox with a visible label', async () => {
    await mountSelect()
    expect(wrapper.findAll('[role="combobox"]')).toHaveLength(1)
    expect(wrapper.find('label').text()).toBe('Year')
  })
  it('ties the label to the combobox, so the combobox is announced as "Year"', async () => {
    await mountSelect()
    const label = wrapper.find('label')
    expect(label.attributes('for')).toBeTruthy()
    expect(label.attributes('for')).toBe(combobox().attributes('id'))
  })
  it('shows the selected year as its value', async () => {
    await mountSelect(2025)
    expect(combobox().text()).toBe('2025')
  })
  it('lists the given years in the given order', async () => {
    await mountSelect()
    await openList()
    expect(options().map(option => option.textContent?.trim())).toEqual(['2026', '2025', '2024'])
  })
  it('emits the chosen year as a number', async () => {
    await mountSelect(2026)
    await openList()
    // The list selects an item on pointerup (mouse) or Enter (keyboard), not on click.
    options()[1]!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }))
    await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')).toBeTruthy())
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([2025])
  })
  it('translates its label when the language changes, without a reload', async () => {
    await mountSelect()
    await useNuxtApp().$i18n.setLocale('de')
    await vi.waitFor(() => expect(wrapper.find('label').text()).toBe('Jahr'))
  })
})
