import { db } from './db'
import { eq } from 'drizzle-orm'
import { recurringCosts, purchases } from '../db/schema'
import type { Month, Purchase, RecurringCost } from '~~/shared/types/calculation'
import type { CreateRecurringCost, CreatePurchase } from '~~/shared/utils/validation'

function toRecurringCost(row: typeof recurringCosts.$inferSelect): RecurringCost {
  return { ...row, kind: 'recurring', dueMonth: (row.dueMonth ?? undefined) as Month | undefined }
}
function toPurchase(row: typeof purchases.$inferSelect): Purchase {
  return { ...row, kind: 'purchase'}
}
export async function listRecurringCosts(): Promise<RecurringCost[]> {
    const rows = await db.select().from(recurringCosts)
    return rows.map(toRecurringCost)
}
export async function listPurchases(): Promise<Purchase[]> {
    const rows = await db.select().from(purchases)
    return rows.map(toPurchase)
}
export async function createRecurringCosts(input: CreateRecurringCost): Promise<RecurringCost> {
    const [row] = await db.insert(recurringCosts).values(input).returning()
    if (!row) throw new Error('Insert returned no row')
    return toRecurringCost(row)
}
export async function createPurchase(input: CreatePurchase): Promise<Purchase> {
    const [row] = await db.insert(purchases).values(input).returning()
    if (!row) throw new Error('Insert returned no row')
    return toPurchase(row)
}
export async function deleteRecurringCosts(id: number): Promise<boolean> {
    const rows = await db.delete(recurringCosts).where(eq(recurringCosts.id, id)).returning({ id: recurringCosts.id})
    return rows.length > 0
}
export async function deletePurchase(id: number): Promise<boolean> {
    const rows = await db.delete(purchases).where(eq(purchases.id, id)).returning({ id: purchases.id})
    return rows.length > 0
}
