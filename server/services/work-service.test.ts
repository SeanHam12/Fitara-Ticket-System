import { expect, it, vi } from 'vitest'
import type { ActorContext } from '@/server/auth/actor'
import type { WorkRepository } from '@/server/repositories/work-repository'
import { WorkService } from './work-service'

const id = (n: number) => `${n}0000000-0000-4000-8000-000000000001`
const actor = {
  userId: id(1),
  membershipId: id(2),
  workspaceId: id(3),
  role: 'owner',
  membershipState: 'active',
  sessionId: id(4),
  requestId: id(5),
  name: 'Owner',
} as ActorContext

it('uses the existing To Do row when a ticket request omits status', async () => {
  const createTicket = vi.fn().mockResolvedValue({ id: id(6) })
  const repo = {
    defaultStatusId: vi.fn().mockResolvedValue(id(7)),
    createTicket,
    getTicket: vi.fn().mockResolvedValue({ id: id(6), statusId: id(7) }),
    activity: vi.fn().mockResolvedValue([]),
  } as unknown as WorkRepository
  const result = await new WorkService(repo).create(actor, {
    projectId: id(8),
    title: 'New work',
    type: 'task',
    priority: 'p3',
  })
  expect(createTicket).toHaveBeenCalledWith(
    actor,
    expect.objectContaining({ statusId: id(7) }),
  )
  expect(result.statusId).toBe(id(7))
})

it('denies a member assigning another person while allowing self removal', async () => {
  const updateTicket = vi.fn().mockResolvedValue({ kind: 'ok' })
  const repo = {
    getTicket: vi
      .fn()
      .mockResolvedValue({ id: id(6), assigneeMembershipIds: [id(2)] }),
    updateTicket,
    activity: vi.fn().mockResolvedValue([]),
  } as unknown as WorkRepository
  const member = { ...actor, role: 'member' as const }
  await expect(
    new WorkService(repo).update(member, id(6), {
      expectedVersion: 1,
      assigneeMembershipIds: [id(9)],
    }),
  ).rejects.toMatchObject({ status: 403 })
  expect(updateTicket).not.toHaveBeenCalled()
  await new WorkService(repo).update(member, id(6), {
    expectedVersion: 1,
    assigneeMembershipIds: [],
  })
  expect(updateTicket).toHaveBeenCalledWith(
    member,
    id(6),
    expect.objectContaining({ assigneeMembershipIds: [] }),
  )
})
