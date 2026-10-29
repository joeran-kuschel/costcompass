import { z } from 'zod'
import { CATEGORIES, INTERVALS } from '~~/shared/types/calculation'
const monthSchema = z.number().int().min(1).max(12)
const baseFields = {
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  category: z.enum(CATEGORIES),
  business: z.boolean(),
}
export const createRecurringCostSchema = z.discriminatedUnion('interval', [
  z.object({ ...baseFields, interval: z.literal('monthly') }),
  z.object({ ...baseFields, interval: z.literal('quarterly'), dueMonth: monthSchema }),
  z.object({ ...baseFields, interval: z.literal('yearly'), dueMonth: monthSchema }),
])
export type CreateRecurringCost = z.infer<typeof createRecurringCostSchema>

export const createPurchaseSchema = z.object({
  ...baseFields,
  date: z.iso.date(),
})
export type CreatePurchase = z.infer<typeof createPurchaseSchema>
export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
})
const notEmpty = (o: object) => Object.keys(o).length > 0

export const patchRecurringCostSchema = z.object({
  ...baseFields,
  interval: z.enum(INTERVALS),
  dueMonth: monthSchema,
}).partial().refine(notEmpty, 'Empty patch')

export const patchPurchaseSchema = createPurchaseSchema.partial().refine(notEmpty, 'Empty patch')

export type PatchRecurringCost = z.infer<typeof patchRecurringCostSchema>
export type PatchPurchase = z.infer<typeof patchPurchaseSchema>

