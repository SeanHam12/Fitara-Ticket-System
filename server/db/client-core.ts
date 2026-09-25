import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { getServerEnv } from '@/lib/env'
import * as schema from './schema'

const globalDb = globalThis as unknown as { fitaraPool?: Pool }

export function getDb() {
  const pool =
    globalDb.fitaraPool ??
    new Pool({ connectionString: getServerEnv().DATABASE_URL, max: 5 })
  if (process.env.NODE_ENV !== 'production') globalDb.fitaraPool = pool
  return drizzle(pool, { schema })
}
