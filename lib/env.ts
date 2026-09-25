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
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
})

export function getServerEnv() {
  return schema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
    APP_ENV: process.env.APP_ENV,
    DEMO_MODE: process.env.DEMO_MODE,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  })
}
