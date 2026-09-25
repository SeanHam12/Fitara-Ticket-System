import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { ActorContext } from '@/server/auth/actor'
import { requireCapability } from '@/server/authorization/capabilities'
import { getDb } from '@/server/db/client'
import {
  activityEvents,
  workspaces,
  workspaceTaxonomyItems,
} from '@/server/db/schema'
import { conflict, notFound } from '@/server/errors'

const taxonomyType = z.enum(['role', 'job_category', 'job_function'])
const workspaceUpdate = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  })
  .strict()
const taxonomyInput = z
  .object({
    type: taxonomyType,
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).default(''),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default('#6957e8'),
  })
  .strict()

export class WorkspaceService {
  private db = getDb()

  async get(actor: ActorContext) {
    requireCapability(actor, 'workspace.read')
    const [workspace, taxonomy] = await Promise.all([
      this.db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, actor.workspaceId))
        .then((rows) => rows[0]),
      this.db
        .select()
        .from(workspaceTaxonomyItems)
        .where(eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId))
        .orderBy(
          asc(workspaceTaxonomyItems.type),
          asc(workspaceTaxonomyItems.name),
        ),
    ])
    if (!workspace) throw notFound('Workspace not found.')
    return { workspace, taxonomy }
  }

  async update(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'workspace.manage')
    const input = workspaceUpdate.parse(body)
    const duplicate = await this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, input.slug))
      .then((rows) => rows.find((row) => row.id !== actor.workspaceId))
    if (duplicate) throw conflict('That workspace slug is already in use.')
    const [workspace] = await this.db
      .update(workspaces)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(workspaces.id, actor.workspaceId))
      .returning()
    await this.audit(actor, 'workspace.updated', input)
    return workspace
  }

  async createTaxonomy(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'taxonomy.manage')
    const input = taxonomyInput.parse(body)
    const [existing] = await this.db
      .select({ id: workspaceTaxonomyItems.id })
      .from(workspaceTaxonomyItems)
      .where(
        and(
          eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
          eq(workspaceTaxonomyItems.type, input.type),
          eq(workspaceTaxonomyItems.name, input.name),
        ),
      )
      .limit(1)
    if (existing) throw conflict('That workspace item already exists.')
    const [item] = await this.db
      .insert(workspaceTaxonomyItems)
      .values({ ...input, workspaceId: actor.workspaceId })
      .returning()
    await this.audit(actor, 'workspace.taxonomy_created', {
      taxonomyId: item.id,
      type: item.type,
    })
    return item
  }

  async deleteTaxonomy(actor: ActorContext, typeValue: string, id: string) {
    requireCapability(actor, 'taxonomy.manage')
    const type = taxonomyType.parse(typeValue)
    const [item] = await this.db
      .delete(workspaceTaxonomyItems)
      .where(
        and(
          eq(workspaceTaxonomyItems.id, z.uuid().parse(id)),
          eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
          eq(workspaceTaxonomyItems.type, type),
        ),
      )
      .returning()
    if (!item) throw notFound('Workspace item not found.')
    await this.audit(actor, 'workspace.taxonomy_deleted', {
      taxonomyId: item.id,
      type,
    })
    return item
  }

  private async audit(
    actor: ActorContext,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.db.insert(activityEvents).values({
      workspaceId: actor.workspaceId,
      projectId: null,
      actorMembershipId: actor.membershipId,
      action,
      metadata,
      correlationId: actor.requestId,
    })
  }
}
