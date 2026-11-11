import { describe, expect, it } from 'vitest'
import { hasCapability, type Capability } from './capabilities'
import type { WorkspaceRole } from '@/server/auth/actor'

const matrix: Record<WorkspaceRole, Record<Capability, boolean>> = {
  owner: {
    'workspace.read': true,
    'workspace.manage': true,
    'taxonomy.manage': true,
    'membership.create': true,
    'membership.manage': true,
    'membership.changeRole': true,
    'project.create': true,
    'project.update': true,
    'project.archive': true,
    'ticket.create': true,
    'ticket.update': true,
    'ticket.assign': true,
    'ticket.move': true,
    'ticket.archive': true,
  },
  admin: {
    'workspace.read': true,
    'workspace.manage': false,
    'taxonomy.manage': true,
    'membership.create': true,
    'membership.manage': true,
    'membership.changeRole': true,
    'project.create': true,
    'project.update': true,
    'project.archive': true,
    'ticket.create': true,
    'ticket.update': true,
    'ticket.assign': true,
    'ticket.move': true,
    'ticket.archive': true,
  },
  member: {
    'workspace.read': true,
    'workspace.manage': false,
    'taxonomy.manage': false,
    'membership.create': false,
    'membership.manage': false,
    'membership.changeRole': false,
    'project.create': false,
    'project.update': false,
    'project.archive': false,
    'ticket.create': true,
    'ticket.update': true,
    'ticket.assign': true,
    'ticket.move': true,
    'ticket.archive': false,
  },
  viewer: {
    'workspace.read': true,
    'workspace.manage': false,
    'taxonomy.manage': false,
    'membership.create': false,
    'membership.manage': false,
    'membership.changeRole': false,
    'project.create': false,
    'project.update': false,
    'project.archive': false,
    'ticket.create': false,
    'ticket.update': false,
    'ticket.assign': false,
    'ticket.move': false,
    'ticket.archive': false,
  },
}
describe('workspace capability matrix', () => {
  for (const [role, expectations] of Object.entries(matrix))
    for (const [capability, expected] of Object.entries(expectations))
      it(`${role} ${expected ? 'can' : 'cannot'} ${capability}`, () =>
        expect(
          hasCapability(role as WorkspaceRole, capability as Capability),
        ).toBe(expected))
})
