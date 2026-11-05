import { createRecurringCostSchema } from "~~/shared/utils/validation"
import { createRecurringCost } from "~~/server/utils/costs"
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, createRecurringCostSchema.parse)
    return await createRecurringCost(body)
}) 
