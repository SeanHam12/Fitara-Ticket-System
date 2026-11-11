import type { ActorContext, WorkspaceRole } from '@/server/auth/actor'
import { forbidden } from '@/server/errors'

export type Capability =
  | 'workspace.read'
  | 'workspace.manage'
  | 'taxonomy.manage'
  | 'membership.create'
  | 'membership.manage'
  | 'membership.changeRole'
  | 'project.create'
  | 'project.update'
  | 'project.archive'
  | 'ticket.create'
  | 'ticket.update'
  | 'ticket.assign'
  | 'ticket.move'
  | 'ticket.archive'

const grants: Record<WorkspaceRole, readonly Capability[]> = {
  owner: [
    'workspace.read',
    'workspace.manage',
    'taxonomy.manage',
    'membership.create',
    'membership.manage',
    'membership.changeRole',
    'project.create',
    'project.update',
    'project.archive',
    'ticket.create',
    'ticket.update',
    'ticket.assign',
    'ticket.move',
    'ticket.archive',
  ],
  admin: [
    'workspace.read',
    'taxonomy.manage',
    'membership.create',
    'membership.manage',
    'membership.changeRole',
    'project.create',
    'project.update',
    'project.archive',
    'ticket.create',
    'ticket.update',
    'ticket.assign',
    'ticket.move',
    'ticket.archive',
  ],
  member: [
    'workspace.read',
    'ticket.create',
    'ticket.update',
    'ticket.assign',
    'ticket.move',
  ],
  viewer: ['workspace.read'],
}

export function hasCapability(role: WorkspaceRole, capability: Capability) {
  return grants[role].includes(capability)
}

export function requireCapability(actor: ActorContext, capability: Capability) {
  if (!hasCapability(actor.role, capability))
    throw forbidden('Your workspace role does not permit this action.')
}
