import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { z } from 'zod'
import { loadEnvConfig } from '@next/env'

async function main() {
  loadEnvConfig(process.cwd())
  const url = z
    .string()
    .startsWith('postgresql://')
    .parse(process.env.DATABASE_MIGRATION_URL)
  const pool = new Pool({ connectionString: url, max: 1 })
  await migrate(drizzle(pool), { migrationsFolder: './server/db/migrations' })
  await pool.end()
  console.log('Fitara Work migrations complete.')
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exitCode = 1
})
