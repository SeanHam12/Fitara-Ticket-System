import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dbCredentials: { url: process.env.DATABASE_MIGRATION_URL ?? '' },
  strict: true,
  verbose: true,
})
