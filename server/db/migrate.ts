import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.NUXT_DATABASE_URL })

try {
    await migrate(drizzle(pool), {
        migrationsFolder: 'server/db/migrations'
    })
} catch (error) {
    console.error(error)
    process.exitCode = 1
} finally {
    await pool.end()
}
