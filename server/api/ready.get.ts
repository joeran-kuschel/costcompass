import { sql } from 'drizzle-orm'
export default defineEventHandler(async () => {
    try {
        await db.execute(sql`select 1`)
    } catch {
        throw createError({ statusCode: 503, statusMessage: 'Database not reachable' })
    }
    return { status: 'ok' }
})
