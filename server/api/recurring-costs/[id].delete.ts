export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, 'id'))
        if (!Number.isInteger(id) || id <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
    }
    if (!(await deleteRecurringCosts(id))) {
        throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    setResponseStatus(event, 204)
}) 
