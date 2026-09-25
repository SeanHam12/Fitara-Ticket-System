import 'server-only'
import type { ActorContext } from '@/server/auth/demo-actor'
import {
  WorkRepository,
  type TicketFilters,
} from '@/server/repositories/work-repository'
import { conflict, notFound } from '@/server/errors'
import {
  createTicketSchema,
  moveTicketSchema,
  updateTicketSchema,
} from './schemas'

export class WorkService {
  constructor(private repo = new WorkRepository()) {}
  bootstrap(actor: ActorContext) {
    return this.repo.bootstrap(actor)
  }
  projects(actor: ActorContext) {
    return this.repo.listProjects(actor)
  }
  async project(actor: ActorContext, id: string) {
    const p = await this.repo.getProject(actor, id)
    if (!p) throw notFound('Project not found.')
    return p
  }
  tickets(actor: ActorContext, filters: TicketFilters) {
    return this.repo.listTickets(actor, filters)
  }
  async ticket(actor: ActorContext, id: string) {
    const ticket = await this.repo.getTicket(actor, id)
    if (!ticket) throw notFound('Ticket not found.')
    return { ...ticket, activity: await this.repo.activity(actor, id) }
  }
  async create(actor: ActorContext, body: unknown) {
    const input = createTicketSchema.parse(body)
    const ticket = await this.repo.createTicket(actor, input)
    if (!ticket)
      throw notFound('A selected project, status, or assignee is unavailable.')
    return this.ticket(actor, ticket.id)
  }
  async update(actor: ActorContext, id: string, body: unknown) {
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
    const input = moveTicketSchema.parse(body)
    const result = await this.repo.moveTicket(
      actor,
      id,
      input.statusId,
      input.expectedVersion,
    )
    if (result.kind === 'missing') throw notFound('Ticket or status not found.')
    if (result.kind === 'conflict') throw conflict()
    return this.ticket(actor, id)
  }
}
