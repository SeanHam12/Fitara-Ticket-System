import { and, eq, isNotNull } from 'drizzle-orm'
import { createAuthEndpoint } from '@better-auth/core/api'
import { setSessionCookie } from 'better-auth/cookies'
import { getDevLoginBypassConfig } from '@/server/auth/dev-login-bypass'
import { isLoopbackHostname } from '@/server/auth/dev-login-bypass'
import { getDb } from '@/server/db/client-core'
import { memberships, users } from '@/server/db/schema'

export function devLoginBypassPlugin() {
  return {
    id: 'fitara-dev-login-bypass',
    endpoints: {
      devLoginBypass: createAuthEndpoint(
        '/dev-login-bypass',
        { method: 'POST' },
        async (ctx) => {
          const config = getDevLoginBypassConfig()
          if (!config) return ctx.json({ enabled: false }, { status: 404 })
          const requestUrl = ctx.request ? new URL(ctx.request.url) : null
          const forwardedHost = ctx.request?.headers.get('x-forwarded-host')
          const requestHost =
            forwardedHost?.split(':')[0] ?? requestUrl?.hostname
          if (!requestHost || !isLoopbackHostname(requestHost))
            return ctx.json({ enabled: false }, { status: 404 })

          const [record] = await getDb()
            .select({ id: users.id })
            .from(users)
            .innerJoin(
              memberships,
              and(
                eq(memberships.userId, users.id),
                eq(memberships.state, 'active'),
                eq(memberships.role, 'owner'),
              ),
            )
            .where(isNotNull(users.username))
            .limit(1)

          if (!record)
            return ctx.json(
              { enabled: true, userFound: false },
              { status: 404 },
            )

          const user = await ctx.context.internalAdapter.findUserById(record.id)
          const session = await ctx.context.internalAdapter.createSession(
            record.id,
          )
          if (!user || !session)
            return ctx.json(
              { enabled: true, sessionCreated: false },
              { status: 500 },
            )

          await setSessionCookie(ctx, { user, session })
          return ctx.json({ ok: true })
        },
      ),
    },
  }
}
