import { z } from 'zod'

const schema = z.object({
  APP_ENV: z.literal('development'),
  DEMO_MODE: z.literal('true'),
  DEV_LOGIN_BYPASS: z.literal('true'),
  BETTER_AUTH_URL: z.string().url(),
})

export function getDevLoginBypassConfig() {
  if (process.env.NODE_ENV === 'production') return null
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

export function isLocalDemoRequest(request: Request) {
  if (!getDevLoginBypassConfig()) return false
  try {
    const requestHost = new URL(request.url).hostname
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedFor = request.headers.get('x-forwarded-for')
    return (
      isLoopbackHostname(requestHost) &&
      (!forwardedHost ||
        isLoopbackHostname(new URL(`http://${forwardedHost}`).hostname)) &&
      (!forwardedFor ||
        forwardedFor
          .split(',')
          .every((address) => isLoopbackHostname(address.trim())))
    )
  } catch {
    return false
  }
}
