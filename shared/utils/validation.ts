import { z } from 'zod'
import { CATEGORIES } from '~~/shared/types/calculation'
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
