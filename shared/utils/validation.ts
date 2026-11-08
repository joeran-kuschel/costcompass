/**
 * The Zod schemas for API input and route params, shared by the server routes and the cost form.
 *
 * @remarks
 * Zod strips keys a schema does not name, so a monthly cost loses a `dueMonth` sent with it.
 */
import { z } from 'zod'
import { CATEGORIES, INTERVALS } from '~~/shared/types/calculation'

const monthSchema = z.number().int().min(1).max(12)
const notEmpty = (o: object) => Object.keys(o).length > 0
// In the order of the cost form: its first error is the first invalid field on screen, which gets the focus.
const baseFields = {
  amount: z.number().positive(),
  name: z.string().trim().min(1).max(200),
  category: z.enum(CATEGORIES),
  business: z.boolean(),
}

// Create

/**
 * A new recurring cost.
 *
 * @remarks
 * Split by `interval`, so `dueMonth` (1-12) is required for quarterly and yearly costs and dropped
 * for monthly ones. The name is trimmed and 1-200 characters long; the amount is above 0 euros.
 */
export const createRecurringCostSchema = z.discriminatedUnion('interval', [
  z.object({ ...baseFields, interval: z.literal('monthly') }),
  z.object({ ...baseFields, interval: z.literal('quarterly'), dueMonth: monthSchema }),
  z.object({ ...baseFields, interval: z.literal('yearly'), dueMonth: monthSchema }),
])
export type CreateRecurringCost = z.infer<typeof createRecurringCostSchema>

/** A new purchase; `date` must be a real calendar day as `YYYY-MM-DD`. */
export const createPurchaseSchema = z.object({
  ...baseFields,
  date: z.iso.date(),
})
export type CreatePurchase = z.infer<typeof createPurchaseSchema>

// Patch

/**
 * A change to a recurring cost: any of the create fields, but at least one.
 *
 * @remarks
 * This schema checks each field on its own, not whether `interval` and `dueMonth` fit together;
 * `updateRecurringCost` validates the merged result with {@link createRecurringCostSchema}.
 */
export const patchRecurringCostSchema = z.object({
  ...baseFields,
  interval: z.enum(INTERVALS),
  dueMonth: monthSchema,
}).partial().refine(notEmpty, 'Empty patch')
export type PatchRecurringCost = z.infer<typeof patchRecurringCostSchema>

/** A change to a purchase: any of the create fields, but at least one. */
export const patchPurchaseSchema = createPurchaseSchema.partial().refine(notEmpty, 'Empty patch')
export type PatchPurchase = z.infer<typeof patchPurchaseSchema>

// Params

/** The `[id]` route param, a positive whole number (the URL string is coerced). */
export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

/**
 * The params of `/months/[year]/[month]`, checked before any data is requested.
 *
 * @remarks
 * The year has exactly four digits and the month exactly two (`03`, not `3`); anything else is
 * the month 404. Whether the year has data is checked later by the page, against `availableYears`.
 * Both come out as numbers.
 */
export const monthParamsSchema = z.object({
    year: z.string().regex(/^\d{4}$/).transform(Number),
    month: z.string().regex(/^(0[1-9]|1[0-2])$/).transform(Number)
})
