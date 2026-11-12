import { and, eq, isNull } from 'drizzle-orm'
import type { ActorContext } from '@/server/auth/actor'
import { hasCapability } from '@/server/authorization/capabilities'
import { ticketAssignees, tickets } from '@/server/db/schema'
import { conflict, forbidden } from '@/server/errors'

export function assertCanDeleteMembership(
  actor: Pick<ActorContext, 'membershipId' | 'role'>,
  target: {
    id: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    state: string
  },
  activeOwnerCount: number,
) {
  if (!hasCapability(actor.role, 'membership.manage'))
    throw forbidden('Your workspace role does not permit this action.')
  if (target.id === actor.membershipId)
    throw forbidden('You cannot delete your own workspace membership.')
  if (target.state === 'removed')
    throw conflict('This user is already deleted.')
  if (actor.role === 'admin' && ['owner', 'admin'].includes(target.role))
    throw forbidden('Admins may manage member and viewer accounts only.')
  if (
    target.role === 'owner' &&
    target.state === 'active' &&
    activeOwnerCount <= 1
  )
    throw conflict('The last active owner cannot be deleted.')
}

export function planActiveTicketUnassignment(
  assigned: { id: string }[],
  expectedActiveTicketCount: number,
) {
  if (assigned.length !== expectedActiveTicketCount)
    throw conflict('Assigned tickets changed. Review the count and try again.')
  return assigned.map((ticket) => ticket.id)
}

export function activeAssignmentScope(
  workspaceId: string,
  membershipId: string,
) {
  return and(
    eq(ticketAssignees.workspaceId, workspaceId),
    eq(tickets.workspaceId, workspaceId),
    eq(ticketAssignees.membershipId, membershipId),
    isNull(tickets.archivedAt),
  )
}
