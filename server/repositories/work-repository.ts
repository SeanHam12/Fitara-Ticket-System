import 'server-only'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  isNotNull,
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
  ticketAssignees,
  ticketLabels,
  ticketSequences,
  tickets,
  users,
  workspaces,
} from '@/server/db/schema'
import type { ActorContext } from '@/server/auth/actor'
import type { z } from 'zod'
import type {
  createProjectSchema,
  createTicketSchema,
  updateProjectSchema,
  updateTicketSchema,
} from '@/server/services/schemas'
import { calculateColumnMove } from './ticket-ordering'

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
  position: tickets.position,
  blocked: tickets.blocked,
  acceptanceCriteria: tickets.acceptanceCriteria,
  comments: tickets.comments,
  subtasks: tickets.subtasks,
  dependencies: tickets.dependencies,
  attachments: tickets.attachments,
  githubDevelopment: tickets.githubDevelopment,
  githubUrl: tickets.githubUrl,
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
  position: number
  blocked: boolean
  acceptanceCriteria: string
  comments: string
  subtasks: string
  dependencies: string
  attachments: string
  githubDevelopment: string
  githubUrl: string | null
  dueDate: string | null
  version: number
  updatedAt: Date
}
type CreateInput = z.infer<typeof createTicketSchema>
type CreateProjectInput = z.infer<typeof createProjectSchema>
type UpdateProjectInput = z.infer<typeof updateProjectSchema>
type UpdateInput = z.infer<typeof updateTicketSchema> & {
  title?: string
  description?: string
  type?: 'bug' | 'feature' | 'task' | 'improvement'
  priority?: 'p1' | 'p2' | 'p3' | 'p4'
  statusId?: string
  assigneeMembershipIds?: string[]
  labelIds?: string[]
  dueDate?: string | null
  blocked?: boolean
  acceptanceCriteria?: string
  comments?: string
  subtasks?: string
  dependencies?: string
  attachments?: string
  githubDevelopment?: string
  githubUrl?: string | null
  position?: number
}
type ArchiveInput = {
  ticketIds?: string[]
  all?: true
  expectedCount: number
}

export class WorkRepository {
  private db = getDb()
  async defaultStatusId(actor: ActorContext) {
    const [status] = await this.db
      .select({ id: statuses.id })
      .from(statuses)
      .where(
        and(
          eq(statuses.workspaceId, actor.workspaceId),
          inArray(statuses.key, ['to_do', 'triage']),
        ),
      )
      .orderBy(asc(statuses.position))
      .limit(1)
    return status?.id
  }
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
          .select({
            id: memberships.id,
            name: users.name,
            jobTitle: memberships.jobTitle,
          })
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
  async listProjects(actor: ActorContext, includeArchived = false) {
    return this.db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, actor.workspaceId),
          ...(includeArchived ? [] : [isNull(projects.archivedAt)]),
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
  async createProject(actor: ActorContext, input: CreateProjectInput) {
    return this.db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ ...input, workspaceId: actor.workspaceId })
        .returning()
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: project.id,
        actorMembershipId: actor.membershipId,
        action: 'project.created',
        metadata: { projectId: project.id },
        correlationId: actor.requestId,
      })
      return project
    })
  }
  async updateProject(
    actor: ActorContext,
    id: string,
    input: UpdateProjectInput,
  ) {
    return this.db.transaction(async (tx) => {
      const { expectedVersion, archived, ...changes } = input
      const [project] = await tx
        .update(projects)
        .set({
          ...changes,
          ...(archived === undefined
            ? {}
            : { archivedAt: archived ? new Date() : null }),
          version: sql`${projects.version}+1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.workspaceId, actor.workspaceId),
            eq(projects.id, id),
            eq(projects.version, expectedVersion),
          ),
        )
        .returning()
      if (!project) {
        const [exists] = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.workspaceId, actor.workspaceId),
              eq(projects.id, id),
            ),
          )
          .limit(1)
        return { kind: exists ? 'conflict' : 'missing' } as const
      }
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: project.id,
        actorMembershipId: actor.membershipId,
        action:
          archived === true
            ? 'project.archived'
            : archived === false
              ? 'project.restored'
              : 'project.updated',
        metadata: { fields: Object.keys(changes) },
        correlationId: actor.requestId,
      })
      return { kind: 'ok', project } as const
    })
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
      conditions.push(
        sql`exists (select 1 from ticket_assignees ta where ta.ticket_id = ${tickets.id} and ta.workspace_id = ${actor.workspaceId} and ta.membership_id = ${f.assignee})`,
      )
    if (f.onlyMine)
      conditions.push(
        sql`exists (select 1 from ticket_assignees ta where ta.ticket_id = ${tickets.id} and ta.workspace_id = ${actor.workspaceId} and ta.membership_id = ${actor.membershipId})`,
      )
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
    const assignments = await this.db
      .select({
        ticketId: ticketAssignees.ticketId,
        membershipId: ticketAssignees.membershipId,
      })
      .from(ticketAssignees)
      .where(
        and(
          eq(ticketAssignees.workspaceId, actor.workspaceId),
          inArray(ticketAssignees.ticketId, ids),
        ),
      )
      .orderBy(asc(ticketAssignees.position))
    return rows.map((r) => ({
      ...r,
      assigneeMembershipIds: assignments
        .filter((a) => a.ticketId === r.id)
        .map((a) => a.membershipId),
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
      if (input.assigneeMembershipIds.length) {
        const found = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              inArray(memberships.id, input.assigneeMembershipIds),
              eq(memberships.state, 'active'),
            ),
          )
          .for('update')
        if (found.length !== input.assigneeMembershipIds.length) return null
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
      const { labelIds, assigneeMembershipIds, ...ticketInput } = input
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
      if (assigneeMembershipIds.length)
        await tx.insert(ticketAssignees).values(
          assigneeMembershipIds.map((membershipId, position) => ({
            workspaceId: actor.workspaceId,
            ticketId: ticket.id,
            membershipId,
            position,
          })),
        )
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
      const { expectedVersion, labelIds, assigneeMembershipIds, ...changes } =
        input
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
      if (assigneeMembershipIds?.length) {
        const found = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              inArray(memberships.id, assigneeMembershipIds),
              eq(memberships.state, 'active'),
            ),
          )
          .for('update')
        if (found.length !== assigneeMembershipIds.length)
          return { kind: 'missing' } as const
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
      if (assigneeMembershipIds) {
        await tx
          .delete(ticketAssignees)
          .where(
            and(
              eq(ticketAssignees.workspaceId, actor.workspaceId),
              eq(ticketAssignees.ticketId, id),
            ),
          )
        if (assigneeMembershipIds.length)
          await tx.insert(ticketAssignees).values(
            assigneeMembershipIds.map((membershipId, position) => ({
              workspaceId: actor.workspaceId,
              ticketId: id,
              membershipId,
              position,
            })),
          )
      }
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
        action: assigneeMembershipIds
          ? 'ticket.assignees_changed'
          : changes.statusId && Object.keys(changes).length <= 2
            ? 'ticket.moved'
            : 'ticket.updated',
        metadata: {
          fields: [
            ...Object.keys(changes),
            ...(assigneeMembershipIds ? ['assigneeMembershipIds'] : []),
          ],
          assigneeMembershipIds,
        },
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
    beforeTicketId?: string | null,
  ) {
    return this.db.transaction(async (tx) => {
      const [moving] = await tx
        .select()
        .from(tickets)
        .where(
          and(eq(tickets.workspaceId, actor.workspaceId), eq(tickets.id, id)),
        )
        .limit(1)
        .for('update')
      if (!moving) return { kind: 'missing' } as const
      if (moving.version !== expectedVersion)
        return { kind: 'conflict' } as const
      const [targetStatus] = await tx
        .select({ id: statuses.id })
        .from(statuses)
        .where(
          and(
            eq(statuses.workspaceId, actor.workspaceId),
            eq(statuses.id, statusId),
          ),
        )
        .limit(1)
      if (!targetStatus) return { kind: 'missing' } as const

      const affectedStatuses =
        moving.statusId === statusId ? [statusId] : [moving.statusId, statusId]
      const rows = await tx
        .select({ id: tickets.id, statusId: tickets.statusId })
        .from(tickets)
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            inArray(tickets.statusId, affectedStatuses),
            isNull(tickets.archivedAt),
          ),
        )
        .orderBy(asc(tickets.position), asc(tickets.id))
        .for('update')
      const order = calculateColumnMove(
        rows,
        id,
        moving.statusId,
        statusId,
        beforeTicketId,
      )
      if (!order) return { kind: 'missing' } as const
      const { source, target } = order

      for (const [index, ticketId] of source.entries())
        await tx
          .update(tickets)
          .set({ position: (index + 1) * 1000 })
          .where(eq(tickets.id, ticketId))
      for (const [index, ticketId] of target.entries())
        await tx
          .update(tickets)
          .set(
            ticketId === id
              ? {
                  statusId,
                  position: (index + 1) * 1000,
                  version: sql`${tickets.version}+1`,
                  updatedAt: new Date(),
                }
              : { position: (index + 1) * 1000 },
          )
          .where(eq(tickets.id, ticketId))
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: moving.projectId,
        ticketId: id,
        actorMembershipId: actor.membershipId,
        action:
          moving.statusId === statusId ? 'ticket.reordered' : 'ticket.moved',
        metadata: { fromStatusId: moving.statusId, toStatusId: statusId },
        correlationId: actor.requestId,
      })
      return { kind: 'ok' } as const
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
  async listTrashedTickets(actor: ActorContext) {
    const selection = {
      id: tickets.id,
      identifier: tickets.identifier,
      title: tickets.title,
      type: tickets.type,
      priority: tickets.priority,
      projectId: tickets.projectId,
      archivedAt: tickets.archivedAt,
      version: tickets.version,
    }
    const [active, trashed] = await Promise.all([
      this.db
        .select(selection)
        .from(tickets)
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            isNull(tickets.archivedAt),
          ),
        )
        .orderBy(asc(tickets.identifier)),
      this.db
        .select(selection)
        .from(tickets)
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            isNotNull(tickets.archivedAt),
          ),
        )
        .orderBy(desc(tickets.archivedAt), asc(tickets.identifier)),
    ])
    return { active, trashed }
  }
  async archiveTickets(actor: ActorContext, input: ArchiveInput) {
    return this.db.transaction(async (tx) => {
      const conditions = [
        eq(tickets.workspaceId, actor.workspaceId),
        isNull(tickets.archivedAt),
      ]
      if (!input.all && input.ticketIds)
        conditions.push(inArray(tickets.id, input.ticketIds))
      const targets = await tx
        .select({ id: tickets.id, projectId: tickets.projectId })
        .from(tickets)
        .where(and(...conditions))
        .orderBy(asc(tickets.id))
        .for('update')
      if (targets.length !== input.expectedCount)
        return { kind: 'conflict', count: targets.length } as const
      if (!targets.length) return { kind: 'ok', count: 0 } as const
      const archivedAt = new Date()
      await tx
        .update(tickets)
        .set({
          archivedAt,
          updatedAt: archivedAt,
          version: sql`${tickets.version}+1`,
        })
        .where(
          inArray(
            tickets.id,
            targets.map((ticket) => ticket.id),
          ),
        )
      await tx.insert(activityEvents).values(
        targets.map((ticket) => ({
          workspaceId: actor.workspaceId,
          projectId: ticket.projectId,
          ticketId: ticket.id,
          actorMembershipId: actor.membershipId,
          action: 'ticket.archived',
          metadata: { bulk: targets.length > 1 },
          correlationId: actor.requestId,
        })),
      )
      return { kind: 'ok', count: targets.length } as const
    })
  }
  async restoreTickets(actor: ActorContext, input: { ticketIds: string[] }) {
    return this.db.transaction(async (tx) => {
      const targets = await tx
        .select({ id: tickets.id, projectId: tickets.projectId })
        .from(tickets)
        .where(
          and(
            eq(tickets.workspaceId, actor.workspaceId),
            isNotNull(tickets.archivedAt),
            inArray(tickets.id, input.ticketIds),
          ),
        )
        .orderBy(asc(tickets.id))
        .for('update')
      if (!targets.length) return { count: 0 }
      const restoredAt = new Date()
      await tx
        .update(tickets)
        .set({
          archivedAt: null,
          updatedAt: restoredAt,
          version: sql`${tickets.version}+1`,
        })
        .where(
          inArray(
            tickets.id,
            targets.map((ticket) => ticket.id),
          ),
        )
      await tx.insert(activityEvents).values(
        targets.map((ticket) => ({
          workspaceId: actor.workspaceId,
          projectId: ticket.projectId,
          ticketId: ticket.id,
          actorMembershipId: actor.membershipId,
          action: 'ticket.restored',
          metadata: { bulk: targets.length > 1 },
          correlationId: actor.requestId,
        })),
      )
      return { count: targets.length }
    })
  }
}
