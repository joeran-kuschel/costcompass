import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema'

export const db = drizzle(useRuntimeConfig().databaseUrl, { schema })
