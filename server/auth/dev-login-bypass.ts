import { z } from 'zod'

const schema = z.object({
  APP_ENV: z.literal('development'),
  DEMO_MODE: z.literal('true'),
  DEV_LOGIN_BYPASS: z.literal('true'),
  BETTER_AUTH_URL: z.string().url(),
})

export function getDevLoginBypassConfig() {
  const result = schema.safeParse(process.env)
  if (!result.success) return null
  const hostname = new URL(result.data.BETTER_AUTH_URL).hostname
  return isLoopbackHostname(hostname) ? { enabled: true as const } : null
}

export function isLoopbackHostname(hostname: string) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(
    hostname.toLowerCase(),
  )
}
