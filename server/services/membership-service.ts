import 'server-only'
import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { ActorContext } from '@/server/auth/actor'
import { createAuth } from '@/server/auth/auth'
import { requireCapability } from '@/server/authorization/capabilities'
import { getDb } from '@/server/db/client'
import {
  accounts,
  activityEvents,
  memberships,
  sessions,
  users,
} from '@/server/db/schema'
import { conflict, forbidden, notFound } from '@/server/errors'

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9._-]+$/)
const createSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    username,
    email: z.email().max(320),
    password: z.string().min(12).max(128),
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
  })
  .strict()
const updateSchema = z
  .object({
    role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
    state: z.enum(['active', 'suspended']).optional(),
    temporaryPassword: z.string().min(12).max(128).optional(),
  })
  .strict()
  .refine((value) => value.role || value.state || value.temporaryPassword)

export class MembershipService {
  private db = getDb()
  async list(actor: ActorContext) {
    requireCapability(actor, 'membership.manage')
    return this.db
      .select({
        id: memberships.id,
        userId: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: memberships.role,
        state: memberships.state,
        createdAt: memberships.createdAt,
        lastActiveAt: sql<Date | null>`max(${sessions.updatedAt})`,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .leftJoin(sessions, eq(sessions.userId, users.id))
      .where(eq(memberships.workspaceId, actor.workspaceId))
      .groupBy(memberships.id, users.id)
      .orderBy(asc(users.name))
  }
  async create(actor: ActorContext, body: unknown) {
    requireCapability(actor, 'membership.create')
    const input = createSchema.parse(body)
    if (actor.role === 'admin' && !['member', 'viewer'].includes(input.role))
      throw forbidden('Admins may create member or viewer accounts only.')
    const result = await createAuth(true).api.signUpEmail({
      body: {
        name: input.name,
        email: input.email.toLowerCase(),
        username: input.username,
        displayUsername: input.username,
        password: input.password,
      },
    })
    if (!result?.user?.id) throw conflict('The account could not be created.')
    return this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordChangeRequired: true })
        .where(eq(users.id, result.user.id))
      await tx.delete(sessions).where(eq(sessions.userId, result.user.id))
      const [membership] = await tx
        .insert(memberships)
        .values({
          workspaceId: actor.workspaceId,
          userId: result.user.id,
          role: input.role,
          state: 'active',
        })
        .returning()
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: null,
        actorMembershipId: actor.membershipId,
        action: 'account.created',
        metadata: { membershipId: membership.id, role: input.role },
        correlationId: actor.requestId,
      })
      return {
        ...membership,
        name: input.name,
        username: input.username,
        email: input.email,
      }
    })
  }
  async update(actor: ActorContext, membershipId: string, body: unknown) {
    requireCapability(actor, 'membership.manage')
    const input = updateSchema.parse(body)
    const passwordHash = input.temporaryPassword
      ? await (
          await createAuth(false).$context
        ).password.hash(input.temporaryPassword)
      : undefined
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.id, membershipId),
            eq(memberships.workspaceId, actor.workspaceId),
          ),
        )
        .limit(1)
        .for('update')
      if (!target) throw notFound('Membership not found.')
      if (
        actor.role === 'admin' &&
        (target.role === 'owner' ||
          (input.role && !['member', 'viewer'].includes(input.role)))
      )
        throw forbidden('Admins may manage member and viewer roles only.')
      const removesOwner =
        target.role === 'owner' &&
        ((input.role && input.role !== 'owner') || input.state === 'suspended')
      if (removesOwner) {
        const owners = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.workspaceId, actor.workspaceId),
              eq(memberships.role, 'owner'),
              eq(memberships.state, 'active'),
            ),
          )
          .for('update')
        if (owners.length <= 1)
          throw conflict(
            'The last active owner cannot be demoted or suspended.',
          )
      }
      const [updated] = await tx
        .update(memberships)
        .set({ role: input.role, state: input.state, updatedAt: new Date() })
        .where(eq(memberships.id, membershipId))
        .returning()
      if (input.state === 'suspended')
        await tx.delete(sessions).where(eq(sessions.userId, target.userId))
      if (passwordHash) {
        const [credential] = await tx
          .update(accounts)
          .set({ password: passwordHash, updatedAt: new Date() })
          .where(
            and(
              eq(accounts.userId, target.userId),
              eq(accounts.providerId, 'credential'),
            ),
          )
          .returning({ id: accounts.id })
        if (!credential) throw notFound('Credential account not found.')
        await tx
          .update(users)
          .set({ passwordChangeRequired: true, updatedAt: new Date() })
          .where(eq(users.id, target.userId))
        await tx.delete(sessions).where(eq(sessions.userId, target.userId))
      }
      await tx.insert(activityEvents).values({
        workspaceId: actor.workspaceId,
        projectId: null,
        actorMembershipId: actor.membershipId,
        action: passwordHash
          ? 'account.temporary_password_issued'
          : input.role
            ? 'membership.role_changed'
            : input.state === 'suspended'
              ? 'membership.suspended'
              : 'membership.restored',
        metadata: { membershipId, role: input.role, state: input.state },
        correlationId: actor.requestId,
      })
      return updated
    })
  }
}
