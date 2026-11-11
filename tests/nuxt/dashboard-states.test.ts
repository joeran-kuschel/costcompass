import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import DashboardPage from '~/pages/index.vue'
import { api, registerDashboardEndpoints, rent, resetDashboardState, setLanguage, sleep } from './helpers/dashboard'

registerDashboardEndpoints()

let wrapper: VueWrapper

async function mountPage() {
  wrapper = await mountSuspended(DashboardPage)
}
const status = () => wrapper.find('[role="status"]')
const alert = () => wrapper.find('[role="alert"]')

beforeEach(resetDashboardState)
afterEach(async () => {
  wrapper.unmount()
  useCostDialog().close()
  await setLanguage('en')
})

describe('dashboard page loading state', () => {
  it('shows an announced loading message while the lists load', async () => {
    api.recurring.delay = 300
    api.purchases.delay = 300
    await mountPage()
    expect(status().text()).toBe('Loading your costs…')
    expect(alert().exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No costs yet')
    await vi.waitFor(() => expect(status().exists()).toBe(false), { timeout: 2000 })
  })
  it('keeps loading until both lists have arrived', async () => {
    api.purchases.delay = 300
    await mountPage()
    await sleep(100)
    expect(status().exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No costs yet')
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'), { timeout: 2000 })
  })
  describe('skeleton', () => {
    const busy = () => wrapper.find('[aria-busy="true"]')
    const skeleton = () => busy().find('[aria-hidden="true"]')

    it('is a busy region that holds the status text and the hidden skeleton', async () => {
      api.recurring.delay = 300
      await mountPage()
      expect(busy().exists()).toBe(true)
      expect(busy().find('[role="status"]').exists()).toBe(true)
      expect(skeleton().exists()).toBe(true)
    })
    it('keeps the status text visually hidden', async () => {
      api.recurring.delay = 300
      await mountPage()
      expect(status().classes()).toContain('sr-only')
    })
    it('is not announced: hidden from assistive technology and no alert inside', async () => {
      api.recurring.delay = 300
      await mountPage()
      expect(skeleton().findAll('[role="alert"]')).toHaveLength(0)
      expect(skeleton().text()).toBe('')
      expect(skeleton().findAll('[role="presentation"]').length).toBeGreaterThan(0)
    })
    it('has the hero, the tiles and the list as three cards', async () => {
      api.recurring.delay = 300
      await mountPage()
      expect(skeleton().findAll('.card')).toHaveLength(3)
      expect(skeleton().find('.card-hero').exists()).toBe(true)
    })
    it('stops animating for people who prefer reduced motion', async () => {
      api.recurring.delay = 300
      await mountPage()
      const blocks = skeleton().findAll('[role="presentation"]')
      expect(blocks.every(block => block.classes().includes('motion-reduce:animate-none'))).toBe(true)
    })
    it('is gone when the lists have arrived', async () => {
      api.recurring.delay = 300
      await mountPage()
      await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'), { timeout: 2000 })
      expect(busy().exists()).toBe(false)
      expect(wrapper.find('[role="presentation"]').exists()).toBe(false)
    })
    it('is gone after an error', async () => {
      api.recurring.fail = true
      await mountPage()
      await vi.waitFor(() => expect(alert().exists()).toBe(true))
      expect(busy().exists()).toBe(false)
    })
    it('has a German status text when the language is German', async () => {
      await setLanguage('de')
      api.recurring.delay = 300
      await mountPage()
      expect(status().text()).toBe('Kosten werden geladen …')
    })
  })
  it('always shows the page heading', async () => {
    api.recurring.delay = 300
    await mountPage()
    expect(wrapper.find('h1').text()).toBe('Dashboard')
  })
})

describe('dashboard page empty state', () => {
  const card = () => wrapper.find('h2').element.closest('.card-state')!
  const addButton = () => wrapper.findAll('button').find(button => button.text() === 'Add your first cost')!
  const dialogState = () => {
    const { open, cost, month } = useCostDialog()
    return { open: open.value, cost: cost.value, month: month.value }
  }

  it('explains that there are no costs and offers the first cost', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    expect(wrapper.find('h2').text()).toBe('No costs yet')
    expect(wrapper.text()).toContain('Add a recurring or a one-off cost to see your totals here.')
    expect(wrapper.text()).toContain('Tip: start with something monthly, like rent.')
    expect(addButton().exists()).toBe(true)
    expect(status().exists()).toBe(false)
    expect(alert().exists()).toBe(false)
  })
  it('shows four decorative category badges', async () => {
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
    const row = card().querySelector('[aria-hidden="true"]')!
    const badges = [...row.querySelectorAll('.category-disc')]
    expect(badges).toHaveLength(4)
    const classes = badges.map(badge => [...badge.classList].join(' '))
    expect(new Set(classes).size).toBe(4)
    expect(row.textContent?.trim()).toBe('')
  })
  it('opens the empty add dialog instead of linking to the costs page', async () => {
    await mountPage()
    await vi.waitFor(() => expect(addButton()).toBeDefined())
    expect(wrapper.find('a[href="/costs"]').exists()).toBe(false)
    expect(dialogState().open).toBe(false)
    await addButton().trigger('click')
    expect(dialogState()).toEqual({ open: true, cost: null, month: null })
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Noch keine Kosten'))
    expect(wrapper.text()).toContain('Erste Kosten hinzufügen')
    expect(wrapper.text()).toContain('Tipp: Fange mit monatlichen Kosten an')
  })
  it('does not show up once there are costs', async () => {
    api.recurring.rows = [rent]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(wrapper.text()).not.toContain('No costs yet')
    expect(alert().exists()).toBe(false)
  })
  it('does not show up when only purchases exist', async () => {
    api.purchases.rows = [{ id: 2, kind: 'purchase', name: 'Laptop', amount: 1200, category: 'appliances', business: true, date: '2026-03-14' }]
    await mountPage()
    await vi.waitFor(() => expect(status().exists()).toBe(false))
    expect(wrapper.text()).not.toContain('No costs yet')
  })
})

describe('dashboard page error state', () => {
  it('shows an announced error with a retry button when the recurring costs fail', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Could not load your costs.')
    expect(alert().find('button').text()).toBe('Try again')
    expect(status().exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No costs yet')
  })
  it('is a card with a heading, an explanation and a decorative icon', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().find('h2').text()).toBe('Could not load your costs.')
    expect(alert().text()).toContain('Your data has not changed. Check your connection and try again.')
    expect(alert().find('[aria-hidden="true"]').exists()).toBe(true)
    expect(alert().classes()).toContain('card')
  })
  it('does not show the message of the failed request', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).not.toContain('boom')
  })
  it('shows the error when only the purchases fail', async () => {
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().text()).toContain('Could not load your costs.')
  })
  it('loads again and recovers when "Try again" is pressed', async () => {
    api.recurring.fail = true
    api.purchases.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.recurring.fail = false
    api.purchases.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(alert().exists()).toBe(false), { timeout: 2000 })
    await vi.waitFor(() => expect(wrapper.text()).toContain('No costs yet'))
  })
  it('stays in the error state while the retry fails again', async () => {
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    await alert().find('button').trigger('click')
    await sleep(100)
    expect(alert().exists()).toBe(true)
  })
  it('moves the focus to the heading after a successful retry, so it is not lost', async () => {
    api.recurring.fail = true
    // The page has to be in the document, otherwise nothing can have the focus.
    wrapper = await mountSuspended(DashboardPage, { attachTo: document.body })
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    api.recurring.fail = false
    await alert().find('button').trigger('click')
    await vi.waitFor(() => expect(alert().exists()).toBe(false))
    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.find('h1').element))
  })
  it('does not move the focus when the retry fails again', async () => {
    api.recurring.fail = true
    wrapper = await mountSuspended(DashboardPage, { attachTo: document.body })
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    await alert().find('button').trigger('click')
    await sleep(100)
    expect(alert().exists()).toBe(true)
    expect(document.activeElement).not.toBe(wrapper.find('h1').element)
  })
  it('is German when the language is German', async () => {
    await setLanguage('de')
    api.recurring.fail = true
    await mountPage()
    await vi.waitFor(() => expect(alert().exists()).toBe(true))
    expect(alert().find('h2').text()).toBe('Die Kosten konnten nicht geladen werden.')
    expect(alert().text()).toContain('Deine Daten haben sich nicht verändert.')
    expect(alert().find('button').text()).toBe('Erneut versuchen')
  })
})
