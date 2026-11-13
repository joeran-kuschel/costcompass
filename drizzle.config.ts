import { defineConfig } from 'drizzle-kit'
import { existsSync } from 'node:fs'

if (existsSync('.env')) process.loadEnvFile()

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL!,
  },
})
