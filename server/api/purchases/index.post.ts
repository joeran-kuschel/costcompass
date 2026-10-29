import { createPurchaseSchema } from "~~/shared/utils/validation"
import { createPurchase } from "~~/server/utils/costs"
export default defineEventHandler(async (event) => {
    const body = await readValidatedBody(event, createPurchaseSchema.parse)
    return await createPurchase(body)
}) 
