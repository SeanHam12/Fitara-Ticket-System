import { z } from 'zod'

const schema = z.object({
  APP_ENV: z.literal('development'),
  DEMO_MODE: z.literal('true'),
  DEV_LOGIN_BYPASS: z.literal('true'),
})

export function getDevLoginBypassConfig() {
  const result = schema.safeParse(process.env)
  return result.success ? { enabled: true as const } : null
}
