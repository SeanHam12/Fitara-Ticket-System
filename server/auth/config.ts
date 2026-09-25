import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'
import { getServerEnv } from '@/lib/env'
import { getDb } from '@/server/db/client-core'
import { accounts, sessions, users, verifications } from '@/server/db/schema'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'
import { devLoginBypassPlugin } from '@/server/auth/dev-login-bypass-plugin'

const reserved = new Set(['admin', 'api', 'root', 'support', 'system'])

export function createAuth(allowSignUp = false) {
  const env = getServerEnv()
  const devBypassEnabled = Boolean(getDevLoginBypassConfig())
  return betterAuth({
    appName: 'Fitara Work',
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 30 },
    rateLimit: { enabled: true, window: 60, max: 10 },
    advanced: { database: { generateId: 'uuid' } },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 32,
        usernameValidator: (value) =>
          /^[a-zA-Z0-9._-]+$/.test(value) && !reserved.has(value.toLowerCase()),
        usernameNormalization: (value) => value.trim().toLowerCase(),
      }),
      ...(devBypassEnabled ? [devLoginBypassPlugin()] : []),
    ],
    disabledPaths: allowSignUp
      ? ['/sign-in/email', '/is-username-available']
      : ['/sign-up/email', '/sign-in/email', '/is-username-available'],
  })
}
