import { eq } from 'drizzle-orm'
import { resolveActor } from '@/server/auth/actor'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { handle, ok } from '@/server/http'
export const runtime = 'nodejs'
export function POST(r: Request) {
  return handle(async (id) => {
    const actor = await resolveActor(id, r.headers, {
      allowPasswordChangeRequired: true,
    })
    await getDb()
      .update(users)
      .set({ passwordChangeRequired: false, updatedAt: new Date() })
      .where(eq(users.id, actor.userId))
    return ok({ changed: true }, 200, id)
  })
}
