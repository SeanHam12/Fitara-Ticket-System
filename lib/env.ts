import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  DATABASE_MIGRATION_URL: z
    .string()
    .url()
    .startsWith('postgresql://')
    .optional(),
  APP_ENV: z.enum(['development', 'test', 'preview', 'demo', 'production']),
  DEMO_MODE: z.enum(['true', 'false']).transform((v) => v === 'true'),
})

export function getServerEnv() {
  return schema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
    APP_ENV: process.env.APP_ENV,
    DEMO_MODE: process.env.DEMO_MODE,
  })
}
