import 'server-only'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  activityEvents,
  labels,
  memberships,
  projects,
  statuses,
  ticketLabels,
  ticketSequences,
  tickets,
  users,
  workspaces,
} from '@/server/db/schema'
import type { ActorContext } from '@/server/auth/demo-actor'
import type { z } from 'zod'
import type {
  createTicketSchema,
  updateTicketSchema,
} from '@/server/services/schemas'

export type TicketFilters = {
  projectId?: string
  statusId?: string
  priority?: 'p1' | 'p2' | 'p3' | 'p4'
  assignee?: string
  onlyMine?: boolean
  search?: string
  sort: 'updated' | 'priority' | 'identifier'
}
const summarySelect = {
  id: tickets.id,
  identifier: tickets.identifier,
  title: tickets.title,
  description: tickets.description,
  type: tickets.type,
  priority: tickets.priority,
  statusId: tickets.statusId,
  projectId: tickets.projectId,
  reporterMembershipId: tickets.reporterMembershipId,
  assigneeMembershipId: tickets.assigneeMembershipId,
  position: tickets.position,
  blocked: tickets.blocked,
  dueDate: tickets.dueDate,
  version: tickets.version,
  updatedAt: tickets.updatedAt,
}
type Summary = {
  id: string
  identifier: string
  title: string
  description: string
  type: 'bug' | 'feature' | 'task' | 'improvement'
  priority: 'p1' | 'p2' | 'p3' | 'p4'
  statusId: string
  projectId: string
  reporterMembershipId: string
  assigneeMembershipId: string | null
  position: number
  blocked: boolean
  dueDate: string | null
  version: number
  updatedAt: Date
}
type CreateInput = z.infer<typeof createTicketSchema>
type UpdateInput = z.infer<typeof updateTicketSchema> & {
  title?: string
  description?: string
  type?: 'bug' | 'feature' | 'task' | 'improvement'
  priority?: 'p1' | 'p2' | 'p3' | 'p4'
  statusId?: string
  assigneeMembershipId?: string | null
  labelIds?: string[]
  dueDate?: string | null
  blocked?: boolean
  position?: number
}

export class WorkRepository {
  private db = getDb()
  async bootstrap(actor: ActorContext) {
    const [[workspace], projectRows, statusRows, labelRows, people] =
      await Promise.all([
        this.db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, actor.workspaceId)),
        this.db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.workspaceId, actor.workspaceId),
              isNull(projects.archivedAt),
            ),
          )
          .orderBy(asc(projects.name)),
        this.db
          .select()
          .from(statuses)
          .where(eq(statuses.workspaceId, actor.workspaceId))
          .orderBy(asc(statuses.position)),
        this.db
          .select()
          .from(labels)
          .where(eq(labels.workspaceId, actor.workspaceId))
          .orderBy(asc(labels.name)),
        this.db
          .select({ id: memberships.id, name: users.name })
          .from(memberships)
          .innerJoin(users, eq(users.id, memberships.userId))
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              eq(memberships.state, 'active'),
            ),
          ),
      ])
    return {
      workspace,
      projects: projectRows,
      statuses: statusRows,
      labels: labelRows,
      members: people,
    }
  }
  async listProjects(actor: ActorContext) {
    return this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, actor.workspaceId),
          isNull(projects.archivedAt),
        ),
      )
      .orderBy(asc(projects.name))
  }
  async getProject(actor: ActorContext, id: string) {
    return (
      await this.db
        .select()
        .from(projects)
        .where(
          and(eq(projects.workspaceId, actor.workspaceId), eq(projects.id, id)),
        )
        .limit(1)
    )[0]
  }
  async listTickets(actor: ActorContext, f: TicketFilters) {
    const conditions = [
      eq(tickets.workspaceId, actor.workspaceId),
      isNull(tickets.archivedAt),
    ]
    if (f.projectId) conditions.push(eq(tickets.projectId, f.projectId))
    if (f.statusId) conditions.push(eq(tickets.statusId, f.statusId))
    if (f.priority) conditions.push(eq(tickets.priority, f.priority))
    if (f.assignee)
      conditions.push(eq(tickets.assigneeMembershipId, f.assignee))
    if (f.onlyMine)
      conditions.push(eq(tickets.assigneeMembershipId, actor.membershipId))
    if (f.search)
      conditions.push(
        or(
          ilike(tickets.identifier, `%${f.search}%`),
          ilike(tickets.title, `%${f.search}%`),
          ilike(tickets.description, `%${f.search}%`),
        )!,
      )
    const order =
      f.sort === 'identifier'
        ? asc(tickets.identifier)
        : f.sort === 'priority'
          ? asc(tickets.priority)
          : desc(tickets.updatedAt)
    const rows = await this.db
      .select(summarySelect)
      .from(tickets)
      .where(and(...conditions))
      .orderBy(order, asc(tickets.id))
      .limit(200)
    return this.enrich(actor, rows)
  }
  async getTicket(actor: ActorContext, id: string) {
    const rows = await this.db
      .select(summarySelect)
      .from(tickets)
      .where(
        and(eq(tickets.workspaceId, actor.workspaceId), eq(tickets.id, id)),
      )
      .limit(1)
    return (await this.enrich(actor, rows))[0]
  }
  private async enrich(actor: ActorContext, rows: Summary[]) {
    if (!rows.length) return []
    const ids = rows.map((r) => r.id)
    const links = await this.db
      .select({
        ticketId: ticketLabels.ticketId,
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(ticketLabels)
      .innerJoin(
        labels,
        and(
          eq(labels.id, ticketLabels.labelId),
          eq(labels.workspaceId, actor.workspaceId),
        ),
      )
      .where(
        and(
          eq(ticketLabels.workspaceId, actor.workspaceId),
          inArray(ticketLabels.ticketId, ids),
        ),
      )
    return rows.map((r) => ({
      ...r,
      labels: links
        .filter((x) => x.ticketId === r.id)
        .map((link) => ({ id: link.id, name: link.name, color: link.color })),
    }))
  }
  async createTicket(actor: ActorContext, input: CreateInput) {
    return this.db.transaction(async (tx) => {
      const [project] = await tx
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.workspaceId, actor.workspaceId),
            eq(projects.id, input.projectId),
            isNull(projects.archivedAt),
          ),
        )
        .limit(1)
      if (!project) return null
      const [status] = await tx
        .select()
        .from(statuses)
        .where(
          and(
            eq(statuses.workspaceId, actor.workspaceId),
            eq(statuses.id, input.statusId),
          ),
        )
        .limit(1)
      if (!status) return null
      if (input.assigneeMembershipId) {
        const [m] = await tx
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              eq(memberships.id, input.assigneeMembershipId),
              eq(memberships.state, 'active'),
            ),
          )
        if (!m) return null
      }
      if (input.labelIds.length) {
        const valid = await tx
          .select({ id: labels.id })
          .from(labels)
          .where(
            and(
              eq(labels.workspaceId, actor.workspaceId),
              inArray(labels.id, input.labelIds),
            ),
          )
        if (valid.length !== new Set(input.labelIds).size) return null
      }
      const [{ currentValue }] = await tx
        .insert(ticketSequences)
        .values({
          projectId: project.id,
          workspaceId: actor.workspaceId,
          currentValue: 1,
        })
        .onConflictDoUpdate({
          target: ticketSequences.projectId,
          set: {
            currentValue: sql`${ticketSequences.currentValue}+1`,
            updatedAt: new Date(),
          },
        })
        .returning({ currentValue: ticketSequences.currentValue })
      const { labelIds, ...ticketInput } = input
      const [ticket] = await tx
        .insert(tickets)
        .values({
          ...ticketInput,
          workspaceId: actor.workspaceId,
          sequenceNumber: currentValue,
          identifier: `${project.key}-${currentValue}`,
          reporterMembershipId: actor.membershipId,
          position: currentValue * 1000,
        })
        .returning()
      if (labelIds.length)
        await tx.insert(ticketLabels).values(
          labelIds.map((labelId: string) => ({
            workspaceId: actor.workspaceId,
            ticketId: ticket.id,
            labelId,
          })),
        )
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: project.id,
        ticketId: ticket.id,
        actorMembershipId: actor.membershipId,
        action: 'ticket.created',
        metadata: { identifier: ticket.identifier },
        correlationId: actor.requestId,
      })
      return ticket
    })
  }
  async updateTicket(actor: ActorContext, id: string, input: UpdateInput) {
    return this.db.transaction(async (tx) => {
      const { expectedVersion, labelIds, ...changes } = input
      const [old] = await tx
        .select()
        .from(tickets)
        .where(
          and(eq(tickets.workspaceId, actor.workspaceId), eq(tickets.id, id)),
        )
        .limit(1)
      if (!old) return { kind: 'missing' } as const
      if (changes.statusId) {
        const [s] = await tx
          .select()
          .from(statuses)
          .where(
            and(
              eq(statuses.workspaceId, actor.workspaceId),
              eq(statuses.id, changes.statusId),
            ),
          )
        if (!s) return { kind: 'missing' } as const
      }
      if (changes.assigneeMembershipId) {
        const [m] = await tx
          .select()
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              eq(memberships.id, changes.assigneeMembershipId),
              eq(memberships.state, 'active'),
            ),
          )
        if (!m) return { kind: 'missing' } as const
      }
      if (labelIds?.length) {
        const valid = await tx
          .select({ id: labels.id })
          .from(labels)
          .where(
            and(
              eq(labels.workspaceId, actor.workspaceId),
              inArray(labels.id, labelIds),
            ),
          )
        if (valid.length !== new Set(labelIds).size)
          return { kind: 'missing' } as const
      }
      const [updated] = await tx
        .update(tickets)
        .set({
          ...changes,
          updatedAt: new Date(),
          version: sql`${tickets.version}+1`,
        })
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            eq(tickets.id, id),
            eq(tickets.version, expectedVersion),
          ),
        )
        .returning()
      if (!updated) return { kind: 'conflict' } as const
      if (labelIds) {
        await tx
          .delete(ticketLabels)
          .where(
            and(
              eq(ticketLabels.workspaceId, actor.workspaceId),
              eq(ticketLabels.ticketId, id),
            ),
          )
        if (labelIds.length)
          await tx.insert(ticketLabels).values(
            labelIds.map((labelId: string) => ({
              workspaceId: actor.workspaceId,
              ticketId: id,
              labelId,
            })),
          )
      }
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: old.projectId,
        ticketId: id,
        actorMembershipId: actor.membershipId,
        action:
          changes.statusId && Object.keys(changes).length <= 2
            ? 'ticket.moved'
            : 'ticket.updated',
        metadata: { fields: Object.keys(changes) },
        correlationId: actor.requestId,
      })
      return { kind: 'ok', ticket: updated } as const
    })
  }
  async moveTicket(
    actor: ActorContext,
    id: string,
    statusId: string,
    expectedVersion: number,
  ) {
    const max = (
      await this.db
        .select({ max: sql<number>`coalesce(max(${tickets.position}),0)` })
        .from(tickets)
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            eq(tickets.statusId, statusId),
          ),
        )
    )[0].max
    return this.updateTicket(actor, id, {
      expectedVersion,
      statusId,
      position: Number(max) + 1000,
    })
  }
  async activity(actor: ActorContext, ticketId: string) {
    return this.db
      .select({
        id: activityEvents.id,
        action: activityEvents.action,
        createdAt: activityEvents.createdAt,
        metadata: activityEvents.metadata,
      })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.workspaceId, actor.workspaceId),
          eq(activityEvents.ticketId, ticketId),
        ),
      )
      .orderBy(desc(activityEvents.createdAt))
      .limit(8)
  }
}
