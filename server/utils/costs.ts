import { db } from './db'
import { eq } from 'drizzle-orm'
import { recurringCosts, purchases } from '../db/schema'
import type { Month, Purchase, RecurringCost } from '~~/shared/types/calculation'
import type { CreateRecurringCost, CreatePurchase, PatchRecurringCost, PatchPurchase} from '~~/shared/utils/validation'
import { createRecurringCostSchema } from '~~/shared/utils/validation'

function toRecurringCost(row: typeof recurringCosts.$inferSelect): RecurringCost {
  return { ...row, kind: 'recurring', dueMonth: (row.dueMonth ?? undefined) as Month | undefined }
}
function toPurchase(row: typeof purchases.$inferSelect): Purchase {
  return { ...row, kind: 'purchase'}
}
export async function listRecurringCosts(): Promise<RecurringCost[]> {
    const rows = await db.select().from(recurringCosts).orderBy(recurringCosts.id)
    return rows.map(toRecurringCost)
}
export async function listPurchases(): Promise<Purchase[]> {
    const rows = await db.select().from(purchases).orderBy(purchases.id)
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
export async function updateRecurringCost(id: number, patch: PatchRecurringCost): Promise<RecurringCost | undefined> {
    const [existing] = await db.select().from(recurringCosts).where(eq(recurringCosts.id, id))
    if (!existing) return undefined
    const merged = { ...existing, dueMonth: existing.dueMonth ?? undefined, ...patch }
    const result = createRecurringCostSchema.safeParse(merged)
    if (!result.success) {
        throw createError({ statusCode: 400, statusMessage: 'Validation Error', data: result.error.issues })
    }
    const [row] = await db.update(recurringCosts)
    .set({ ...result.data, dueMonth: 'dueMonth' in result.data ? result.data.dueMonth : null })
    .where(eq(recurringCosts.id, id))
    .returning()
    if (!row) throw new Error('Update returned no row')
    return toRecurringCost(row)
}
export async function updatePurchase(id: number, patch: PatchPurchase): Promise<Purchase | undefined> {
    const [row] = await db.update(purchases).set(patch).where(eq(purchases.id, id)).returning()
    return row ? toPurchase(row) : undefined
}
export async function deleteRecurringCosts(id: number): Promise<boolean> {
    const rows = await db.delete(recurringCosts).where(eq(recurringCosts.id, id)).returning({ id: recurringCosts.id})
    return rows.length > 0
}
export async function deletePurchase(id: number): Promise<boolean> {
    const rows = await db.delete(purchases).where(eq(purchases.id, id)).returning({ id: purchases.id})
    return rows.length > 0
}
