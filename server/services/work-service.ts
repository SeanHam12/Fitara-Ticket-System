import 'server-only'
import type { ActorContext } from '@/server/auth/actor'
import { requireCapability } from '@/server/authorization/capabilities'
import {
  WorkRepository,
  type TicketFilters,
} from '@/server/repositories/work-repository'
import { conflict, notFound } from '@/server/errors'
import {
  createProjectSchema,
  createTicketSchema,
  moveTicketSchema,
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
    const input = createTicketSchema.parse(body)
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
      'assigneeMembershipId' in body
    )
      requireCapability(actor, 'ticket.assign')
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
}
