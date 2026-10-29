import { idParamsSchema, patchPurchaseSchema } from "~~/shared/utils/validation"
import { updatePurchase } from "~~/server/utils/costs"
export default defineEventHandler(async (event) => {
    const { id } = await getValidatedRouterParams(event, idParamsSchema.parse)
    const body = await readValidatedBody(event, patchPurchaseSchema.parse)
    const updated = await updatePurchase(id, body)
    if (!updated) {
        throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    return updated
}) 
