import { db } from './db'
import { recurringCosts, purchases } from '../db/schema'
import type { Month, Purchase, RecurringCost } from '~~/shared/types/calculation'

export async function listRecurringCosts(): Promise<RecurringCost[]> {
    const rows = await db.select().from(recurringCosts)
    return rows.map((row) => ({
        ...row,
        kind: 'recurring' as const,
        dueMonth: (row.dueMonth ?? undefined) as Month | undefined
    }))
}
export async function listPurchases(): Promise<Purchase[]> {
    const rows = await db.select().from(purchases)
    return rows.map((row) => ({
        ...row,
        kind: 'purchase' as const
    }))
}
