import { eq } from 'drizzle-orm'
import { resolveActor } from '@/server/auth/actor'
import { auth } from '@/server/auth/auth'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { handle, ok, requireSameOrigin } from '@/server/http'
import { z } from 'zod'
export const runtime = 'nodejs'
export function POST(r: Request) {
  return handle(async (id) => {
    requireSameOrigin(r)
    const actor = await resolveActor(id, r.headers, {
      allowPasswordChangeRequired: true,
    })
    const body = z
      .object({
        currentPassword: z.string().min(12).max(128),
        newPassword: z.string().min(12).max(128),
      })
      .strict()
      .parse(await r.json())
    await auth.api.changePassword({
      headers: r.headers,
      body: { ...body, revokeOtherSessions: true },
    })
    await getDb()
      .update(users)
      .set({ passwordChangeRequired: false, updatedAt: new Date() })
      .where(eq(users.id, actor.userId))
    return ok({ changed: true }, 200, id)
  })
}
