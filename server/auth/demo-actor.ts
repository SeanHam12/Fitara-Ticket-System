import 'server-only'
import { and, eq } from 'drizzle-orm'
import { getServerEnv } from '@/lib/env'
import { getDb } from '@/server/db/client'
import { memberships, users, workspaces } from '@/server/db/schema'
import { forbidden, notFound } from '@/server/errors'

export type ActorContext = {
  userId: string
  membershipId: string
  workspaceId: string
  role: 'owner'
  requestId: string
  name: string
}
export async function resolveDemoActor(
  requestId: string,
): Promise<ActorContext> {
  if (!getServerEnv().DEMO_MODE) throw forbidden('Demo identity is disabled.')
  const [row] = await getDb()
    .select({
      userId: users.id,
      name: users.name,
      membershipId: memberships.id,
      workspaceId: workspaces.id,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(
      and(eq(workspaces.slug, 'fitara-demo'), eq(memberships.state, 'active')),
    )
    .limit(1)
  if (!row || row.role !== 'owner')
    throw notFound('Demo actor has not been seeded.')
  return { ...row, role: 'owner', requestId }
}
