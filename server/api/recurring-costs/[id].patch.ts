import { idParamsSchema, patchRecurringCostSchema } from "~~/shared/utils/validation"
import { updateRecurringCost } from "~~/server/utils/costs"
export default defineEventHandler(async (event) => {
    const { id } = await getValidatedRouterParams(event, idParamsSchema.parse)
    const body = await readValidatedBody(event, patchRecurringCostSchema.parse)
    const updated = await updateRecurringCost(id, body)
    if (!updated) {
        throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    return updated
})
