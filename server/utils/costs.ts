/**
 * Database access for recurring costs and purchases, the only code that queries those tables.
 *
 * @remarks
 * Input arrives already validated by the routes. The returned objects include the row's `id`,
 * although the return types (`RecurringCost`, `Purchase`) do not list it; the UI types them as
 * `Stored<RecurringCost>` and `Stored<Purchase>`. The database stores no `kind`; the mappers add it,
 * and turn a missing `dueMonth` from `null` into `undefined`.
 */
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
/** All recurring costs, ordered by `id`. */
export async function listRecurringCosts(): Promise<RecurringCost[]> {
    const rows = await db.select().from(recurringCosts).orderBy(recurringCosts.id)
    return rows.map(toRecurringCost)
}
/** All purchases, ordered by `id`. */
export async function listPurchases(): Promise<Purchase[]> {
    const rows = await db.select().from(purchases).orderBy(purchases.id)
    return rows.map(toPurchase)
}
/**
 * Inserts a recurring cost.
 *
 * @returns The stored cost with its new `id`.
 * @throws Error if the database returns no row.
 */
export async function createRecurringCost(input: CreateRecurringCost): Promise<RecurringCost> {
    const [row] = await db.insert(recurringCosts).values(input).returning()
    if (!row) throw new Error('Insert returned no row')
    return toRecurringCost(row)
}
/**
 * Inserts a purchase.
 *
 * @returns The stored purchase with its new `id`.
 * @throws Error if the database returns no row.
 */
export async function createPurchase(input: CreatePurchase): Promise<Purchase> {
    const [row] = await db.insert(purchases).values(input).returning()
    if (!row) throw new Error('Insert returned no row')
    return toPurchase(row)
}
/**
 * Applies a patch to a recurring cost.
 *
 * @remarks
 * A patch alone cannot tell whether `interval` and `dueMonth` fit together, so it is merged into
 * the stored row and the result is validated as a whole with `createRecurringCostSchema`. When the
 * result is monthly, `dueMonth` is written as `null`, so a cost changed from yearly to monthly
 * keeps no stale due month.
 *
 * @returns The updated cost, or `undefined` when no cost has this `id` (the route answers 404).
 * @throws An H3 error with status 400 and the Zod issues as `data` when the merged cost is invalid,
 * for example a patch to `yearly` without a `dueMonth` on a monthly cost.
 */
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
/**
 * Applies a patch to a purchase; every field of a purchase is valid on its own, so no merge is needed.
 *
 * @returns The updated purchase, or `undefined` when no purchase has this `id` (the route answers 404).
 */
export async function updatePurchase(id: number, patch: PatchPurchase): Promise<Purchase | undefined> {
    const [row] = await db.update(purchases).set(patch).where(eq(purchases.id, id)).returning()
    return row ? toPurchase(row) : undefined
}
/**
 * Deletes a recurring cost.
 *
 * @returns `false` when no cost has this `id` (the route answers 404).
 */
export async function deleteRecurringCost(id: number): Promise<boolean> {
    const rows = await db.delete(recurringCosts).where(eq(recurringCosts.id, id)).returning({ id: recurringCosts.id})
    return rows.length > 0
}
/**
 * Deletes a purchase.
 *
 * @returns `false` when no purchase has this `id` (the route answers 404).
 */
export async function deletePurchase(id: number): Promise<boolean> {
    const rows = await db.delete(purchases).where(eq(purchases.id, id)).returning({ id: purchases.id})
    return rows.length > 0
}
