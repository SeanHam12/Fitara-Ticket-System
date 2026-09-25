import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { auth } from '@/server/auth/auth'
import { getDb } from '@/server/db/client'
import { memberships, users } from '@/server/db/schema'
import { forbidden, unauthorized } from '@/server/errors'
import { AppError } from '@/server/errors'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'
export type ActorContext = {
  userId: string
  membershipId: string
  workspaceId: string
  role: WorkspaceRole
  requestId: string
  name: string
  passwordChangeRequired?: boolean
  membershipState: 'active'
  sessionId: string
}

export async function resolveActor(
  requestId: string,
  headers: Headers,
  options: { allowPasswordChangeRequired?: boolean } = {},
): Promise<ActorContext> {
  const session = await auth.api.getSession({ headers })
  if (!session) throw unauthorized()
  const [row] = await getDb()
    .select({
      userId: users.id,
      name: users.name,
      passwordChangeRequired: users.passwordChangeRequired,
      membershipId: memberships.id,
      workspaceId: memberships.workspaceId,
      role: memberships.role,
      membershipState: memberships.state,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(users.id, session.user.id), eq(memberships.state, 'active')))
    .orderBy(asc(memberships.createdAt))
    .limit(1)
  if (!row) throw forbidden('Your workspace membership is not active.')
  if (row.passwordChangeRequired && !options.allowPasswordChangeRequired)
    throw new AppError(
      403,
      'PASSWORD_CHANGE_REQUIRED',
      'Change your temporary password to continue.',
    )
  return {
    ...row,
    membershipState: 'active',
    sessionId: session.session.id,
    requestId,
  }
}
