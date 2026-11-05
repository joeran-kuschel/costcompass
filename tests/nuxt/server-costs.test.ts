import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ db }))

import {
  listRecurringCosts,
  listPurchases,
  createRecurringCost,
  createPurchase,
  deleteRecurringCost,
  deletePurchase,
  updateRecurringCost,
  updatePurchase,
} from '../../server/utils/costs'

// A stand-in for a Drizzle query: every builder method returns the same object,
// and awaiting it resolves to the rows the test hands in.
function query(rows: unknown[]) {
  const q: Record<string, unknown> = {}
  for (const method of ['from', 'where', 'orderBy', 'set', 'values', 'returning']) {
    q[method] = vi.fn(() => q)
  }
  q.then = (resolve: (value: unknown[]) => unknown) => resolve(rows)
  return q as Record<string, ReturnType<typeof vi.fn>> & { then: unknown }
}

function recurringRow(overrides: Record<string, unknown> = {}) {
  return { id: 1, name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly', dueMonth: null, ...overrides }
}
function purchaseRow(overrides: Record<string, unknown> = {}) {
  return { id: 2, name: 'Laptop', amount: 1200, category: 'appliances', business: true, date: '2026-03-14', ...overrides }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listRecurringCosts', () => {
  it('maps rows to recurring costs and turns a null due month into undefined', async () => {
    db.select.mockReturnValueOnce(query([recurringRow(), recurringRow({ id: 3, interval: 'yearly', dueMonth: 5 })]))
    const result = await listRecurringCosts()
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 1, kind: 'recurring', dueMonth: undefined })
    expect(result[1]).toMatchObject({ id: 3, kind: 'recurring', dueMonth: 5 })
  })
  it('orders the rows by id', async () => {
    const q = query([])
    db.select.mockReturnValueOnce(q)
    await listRecurringCosts()
    expect(q.orderBy).toHaveBeenCalledTimes(1)
  })
})

describe('listPurchases', () => {
  it('maps rows to purchases', async () => {
    db.select.mockReturnValueOnce(query([purchaseRow()]))
    expect(await listPurchases()).toEqual([{ ...purchaseRow(), kind: 'purchase' }])
  })
  it('orders the rows by id', async () => {
    const q = query([])
    db.select.mockReturnValueOnce(q)
    await listPurchases()
    expect(q.orderBy).toHaveBeenCalledTimes(1)
  })
})

describe('createRecurringCost', () => {
  const input = { name: 'Rent', amount: 800, category: 'housing', business: false, interval: 'monthly' } as const
  it('returns the stored row as a recurring cost', async () => {
    const q = query([recurringRow()])
    db.insert.mockReturnValueOnce(q)
    const result = await createRecurringCost(input)
    expect(q.values).toHaveBeenCalledWith(input)
    expect(result).toMatchObject({ id: 1, kind: 'recurring', name: 'Rent' })
  })
  it('throws when the insert returns no row', async () => {
    db.insert.mockReturnValueOnce(query([]))
    await expect(createRecurringCost(input)).rejects.toThrow('Insert returned no row')
  })
})

describe('createPurchase', () => {
  const input = { name: 'Laptop', amount: 1200, category: 'appliances', business: true, date: '2026-03-14' } as const
  it('returns the stored row as a purchase', async () => {
    const q = query([purchaseRow()])
    db.insert.mockReturnValueOnce(q)
    const result = await createPurchase(input)
    expect(q.values).toHaveBeenCalledWith(input)
    expect(result).toMatchObject({ id: 2, kind: 'purchase', name: 'Laptop' })
  })
  it('throws when the insert returns no row', async () => {
    db.insert.mockReturnValueOnce(query([]))
    await expect(createPurchase(input)).rejects.toThrow('Insert returned no row')
  })
})

describe('deleteRecurringCost', () => {
  it('returns true when a row was deleted', async () => {
    db.delete.mockReturnValueOnce(query([{ id: 1 }]))
    expect(await deleteRecurringCost(1)).toBe(true)
  })
  it('returns false for an unknown id', async () => {
    db.delete.mockReturnValueOnce(query([]))
    expect(await deleteRecurringCost(99)).toBe(false)
  })
})

describe('deletePurchase', () => {
  it('returns true when a row was deleted', async () => {
    db.delete.mockReturnValueOnce(query([{ id: 2 }]))
    expect(await deletePurchase(2)).toBe(true)
  })
  it('returns false for an unknown id', async () => {
    db.delete.mockReturnValueOnce(query([]))
    expect(await deletePurchase(99)).toBe(false)
  })
})

describe('updateRecurringCost', () => {
  it('returns undefined for an unknown id and writes nothing', async () => {
    db.select.mockReturnValueOnce(query([]))
    expect(await updateRecurringCost(99, { name: 'Flat' })).toBeUndefined()
    expect(db.update).not.toHaveBeenCalled()
  })
  it('merges the patch into the stored row', async () => {
    db.select.mockReturnValueOnce(query([recurringRow()]))
    const q = query([recurringRow({ amount: 900 })])
    db.update.mockReturnValueOnce(q)
    const result = await updateRecurringCost(1, { amount: 900 })
    expect(q.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rent', amount: 900, interval: 'monthly' }))
    expect(result).toMatchObject({ id: 1, kind: 'recurring', amount: 900 })
  })
  it('never writes the id back into the row', async () => {
    db.select.mockReturnValueOnce(query([recurringRow()]))
    const q = query([recurringRow()])
    db.update.mockReturnValueOnce(q)
    await updateRecurringCost(1, { name: 'Flat' })
    expect(q.set.mock.calls[0]![0]).not.toHaveProperty('id')
  })
  it('keeps the stored due month when the patch does not touch it', async () => {
    db.select.mockReturnValueOnce(query([recurringRow({ interval: 'yearly', dueMonth: 3 })]))
    const q = query([recurringRow({ interval: 'yearly', dueMonth: 3, name: 'Flat' })])
    db.update.mockReturnValueOnce(q)
    await updateRecurringCost(1, { name: 'Flat' })
    expect(q.set).toHaveBeenCalledWith(expect.objectContaining({ interval: 'yearly', dueMonth: 3 }))
  })
  it('writes a null due month when the cost becomes monthly', async () => {
    db.select.mockReturnValueOnce(query([recurringRow({ interval: 'yearly', dueMonth: 3 })]))
    const q = query([recurringRow()])
    db.update.mockReturnValueOnce(q)
    await updateRecurringCost(1, { interval: 'monthly' })
    expect(q.set).toHaveBeenCalledWith(expect.objectContaining({ interval: 'monthly', dueMonth: null }))
  })
  it('lets the patch set a due month together with a new interval', async () => {
    db.select.mockReturnValueOnce(query([recurringRow()]))
    const q = query([recurringRow({ interval: 'quarterly', dueMonth: 2 })])
    db.update.mockReturnValueOnce(q)
    await updateRecurringCost(1, { interval: 'quarterly', dueMonth: 2 })
    expect(q.set).toHaveBeenCalledWith(expect.objectContaining({ interval: 'quarterly', dueMonth: 2 }))
  })
  it('rejects with a 400 when the merged cost is invalid, and writes nothing', async () => {
    db.select.mockReturnValueOnce(query([recurringRow()]))
    await expect(updateRecurringCost(1, { interval: 'yearly' })).rejects.toMatchObject({ statusCode: 400 })
    expect(db.update).not.toHaveBeenCalled()
  })
  it('throws when the update returns no row', async () => {
    db.select.mockReturnValueOnce(query([recurringRow()]))
    db.update.mockReturnValueOnce(query([]))
    await expect(updateRecurringCost(1, { name: 'Flat' })).rejects.toThrow('Update returned no row')
  })
})

describe('updatePurchase', () => {
  it('returns the updated purchase', async () => {
    const q = query([purchaseRow({ amount: 999 })])
    db.update.mockReturnValueOnce(q)
    const result = await updatePurchase(2, { amount: 999 })
    expect(q.set).toHaveBeenCalledWith({ amount: 999 })
    expect(result).toMatchObject({ id: 2, kind: 'purchase', amount: 999 })
  })
  it('returns undefined for an unknown id', async () => {
    db.update.mockReturnValueOnce(query([]))
    expect(await updatePurchase(99, { amount: 999 })).toBeUndefined()
  })
})
