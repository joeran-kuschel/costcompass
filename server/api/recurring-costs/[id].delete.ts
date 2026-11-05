import { idParamsSchema } from "~~/shared/utils/validation"
export default defineEventHandler(async (event) => {
    const { id } = await getValidatedRouterParams(event, idParamsSchema.parse)

    if (!(await deleteRecurringCost(id))) {
        throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    setResponseStatus(event, 204)
}) 
