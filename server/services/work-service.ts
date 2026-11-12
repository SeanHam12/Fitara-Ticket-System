import 'server-only'
import type { ActorContext } from '@/server/auth/actor'
import { requireCapability } from '@/server/authorization/capabilities'
import {
  WorkRepository,
  type TicketFilters,
} from '@/server/repositories/work-repository'
import { conflict, forbidden, notFound } from '@/server/errors'
import {
  createProjectSchema,
  createTicketSchema,
  moveTicketSchema,
  restoreTicketsSchema,
  trashTicketsSchema,
  updateProjectSchema,
  updateTicketSchema,
} from './schemas'

export class WorkService {
  constructor(private repo = new WorkRepository()) {}
  bootstrap(actor: ActorContext) {
    requireCapability(actor, 'workspace.read')
    return this.repo.bootstrap(actor)
  }
  projects(actor: ActorContext, includeArchived = false) {
    requireCapability(actor, 'workspace.read')
    if (includeArchived) requireCapability(actor, 'project.update')
    return this.repo.listProjects(actor, includeArchived)
  }
  async project(actor: ActorContext, id: string) {
    requireCapability(actor, 'workspace.read')
    const p = await this.repo.getProject(actor, id)
    if (!p) throw notFound('Project not found.')
    return p
  }
  createProject(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'project.create')
    return this.repo.createProject(actor, createProjectSchema.parse(body))
  }
  async updateProject(actor: ActorContext, id: string, body: unknown) {
    requireCapability(actor, 'project.update')
    const input = updateProjectSchema.parse(body)
    if (input.archived !== undefined)
      requireCapability(actor, 'project.archive')
    const result = await this.repo.updateProject(actor, id, input)
    if (result.kind === 'missing') throw notFound('Project not found.')
    if (result.kind === 'conflict') throw conflict()
    return result.project
  }
  tickets(actor: ActorContext, filters: TicketFilters) {
    requireCapability(actor, 'workspace.read')
    return this.repo.listTickets(actor, filters)
  }
  async ticket(actor: ActorContext, id: string) {
    requireCapability(actor, 'workspace.read')
    const ticket = await this.repo.getTicket(actor, id)
    if (!ticket) throw notFound('Ticket not found.')
    return { ...ticket, activity: await this.repo.activity(actor, id) }
  }
  async create(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'ticket.create')
    const payload =
      body && typeof body === 'object' && !('statusId' in body)
        ? { ...body, statusId: await this.repo.defaultStatusId(actor) }
        : body
    const input = createTicketSchema.parse(payload)
    if (
      actor.role === 'member' &&
      input.assigneeMembershipIds.some((id) => id !== actor.membershipId)
    )
      throw forbidden('Members may assign new tickets only to themselves.')
    const ticket = await this.repo.createTicket(actor, input)
    if (!ticket)
      throw notFound('A selected project, status, or assignee is unavailable.')
    return this.ticket(actor, ticket.id)
  }
  async update(actor: ActorContext, id: string, body: unknown) {
    requireCapability(actor, 'ticket.update')
    if (
      typeof body === 'object' &&
      body !== null &&
      'assigneeMembershipIds' in body
    )
      requireCapability(actor, 'ticket.assign')
    if (
      actor.role === 'member' &&
      typeof body === 'object' &&
      body !== null &&
      'assigneeMembershipIds' in body
    ) {
      const current = await this.repo.getTicket(actor, id)
      if (!current) throw notFound('Ticket not found.')
      const next = body.assigneeMembershipIds
      const others = current.assigneeMembershipIds.filter(
        (id) => id !== actor.membershipId,
      )
      const allowed =
        Array.isArray(next) &&
        others.length ===
          next.filter((id) => id !== actor.membershipId).length &&
        others.every((id) => next.includes(id)) &&
        !(
          others.length &&
          !current.assigneeMembershipIds.includes(actor.membershipId) &&
          next.includes(actor.membershipId)
        )
      if (!allowed)
        throw forbidden(
          'Members may only claim unassigned work or unassign themselves.',
        )
    }
    const result = await this.repo.updateTicket(
      actor,
      id,
      updateTicketSchema.parse(body),
    )
    if (result.kind === 'missing') throw notFound('Ticket not found.')
    if (result.kind === 'conflict') throw conflict()
    return this.ticket(actor, id)
  }
  async move(actor: ActorContext, id: string, body: unknown) {
    requireCapability(actor, 'ticket.move')
    const input = moveTicketSchema.parse(body)
    const result = await this.repo.moveTicket(
      actor,
      id,
      input.statusId,
      input.expectedVersion,
      input.beforeTicketId,
    )
    if (result.kind === 'missing') throw notFound('Ticket or status not found.')
    if (result.kind === 'conflict') throw conflict()
    return this.ticket(actor, id)
  }
  trash(actor: ActorContext) {
    requireCapability(actor, 'ticket.archive')
    return this.repo.listTrashedTickets(actor)
  }
  async archive(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'ticket.archive')
    const input = trashTicketsSchema.parse(body)
    const result = await this.repo.archiveTickets(actor, input)
    if (result.kind === 'conflict')
      throw conflict(
        'The ticket count changed. Review the list and confirm again.',
      )
    return result
  }
  restore(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'ticket.archive')
    return this.repo.restoreTickets(actor, restoreTicketsSchema.parse(body))
  }
}
