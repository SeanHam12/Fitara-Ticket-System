import 'server-only'
import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { isAPIError } from 'better-auth/api'
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
  workspaceTaxonomyItems,
} from '@/server/db/schema'
import { AppError, conflict, forbidden, notFound } from '@/server/errors'
import { demoPersonSchema, usernameSchema } from './person-schema'

const optionalTaxonomyId = z.preprocess(
  (value) => (value === '' ? null : value),
  z.uuid().nullable(),
)
const createSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    username: usernameSchema,
    email: z.email().max(320),
    password: z.string().min(12).max(128),
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
    jobTitle: z.string().trim().min(2).max(100),
    function: z.string().trim().min(1).max(100).optional(),
    teamRoleId: optionalTaxonomyId.optional(),
    jobCategoryId: optionalTaxonomyId.optional(),
    jobFunctionId: optionalTaxonomyId.optional(),
  })
  .strict()
const updateSchema = z
  .object({
    role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
    state: z.enum(['active', 'suspended']).optional(),
    temporaryPassword: z.string().min(12).max(128).optional(),
    jobTitle: z.string().trim().min(2).max(100).optional(),
    teamRoleId: optionalTaxonomyId.optional(),
    jobCategoryId: optionalTaxonomyId.optional(),
    jobFunctionId: optionalTaxonomyId.optional(),
    name: z.string().trim().min(1).max(100).optional(),
    jobFunction: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined))

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
        jobTitle: memberships.jobTitle,
        teamRoleId: memberships.teamRoleId,
        jobCategoryId: memberships.jobCategoryId,
        jobFunctionId: memberships.jobFunctionId,
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
  async create(actor: ActorContext, body: unknown, localDemo = false) {
    requireCapability(actor, 'membership.create')
    if (
      body &&
      typeof body === 'object' &&
      !('email' in body) &&
      !('password' in body)
    ) {
      if (!localDemo)
        throw forbidden(
          'Three-field people are available only in the local demo.',
        )
      const person = demoPersonSchema.parse(body)
      try {
        return await this.db.transaction(async (tx) => {
          const [existing] = await tx
            .select({ id: users.id })
            .from(users)
            .where(ilike(users.username, person.username))
            .limit(1)
          if (existing) throw conflict('That username is already in use.')
          const [user] = await tx
            .insert(users)
            .values({
              username: person.username,
              displayUsername: person.username,
              name: person.name,
              email: null,
            })
            .returning({ id: users.id })
          const [existingFunction] = await tx
            .select({ id: workspaceTaxonomyItems.id })
            .from(workspaceTaxonomyItems)
            .where(
              and(
                eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
                eq(workspaceTaxonomyItems.type, 'job_function'),
                ilike(workspaceTaxonomyItems.name, person.function),
              ),
            )
            .limit(1)
          const [newFunction] = existingFunction
            ? []
            : await tx
                .insert(workspaceTaxonomyItems)
                .values({
                  workspaceId: actor.workspaceId,
                  type: 'job_function',
                  name: person.function,
                })
                .onConflictDoNothing()
                .returning({ id: workspaceTaxonomyItems.id })
          const [membership] = await tx
            .insert(memberships)
            .values({
              workspaceId: actor.workspaceId,
              userId: user.id,
              role: 'member',
              jobTitle: person.function,
              jobFunctionId: existingFunction?.id ?? newFunction?.id,
              state: 'active',
            })
            .returning()
          await tx.insert(activityEvents).values({
            workspaceId: actor.workspaceId,
            actorMembershipId: actor.membershipId,
            action: 'account.demo_person_created',
            metadata: { membershipId: membership.id, role: 'member' },
            correlationId: actor.requestId,
          })
          return { ...membership, name: person.name, username: person.username }
        })
      } catch (cause) {
        if (
          cause &&
          typeof cause === 'object' &&
          'code' in cause &&
          cause.code === '23505'
        )
          throw conflict('That username is already in use.')
        throw cause
      }
    }
    const input = createSchema.parse(body)
    if (actor.role === 'admin' && !['member', 'viewer'].includes(input.role))
      throw forbidden('Admins may create member or viewer accounts only.')
    await this.validateTaxonomy(actor, input)
    let result
    try {
      result = await createAuth(true).api.signUpEmail({
        body: {
          name: input.name,
          email: input.email.toLowerCase(),
          username: input.username,
          displayUsername: input.username,
          password: input.password,
        },
      })
    } catch (cause) {
      if (isAPIError(cause)) {
        if (cause.body?.code === 'USERNAME_IS_ALREADY_TAKEN')
          throw conflict('That username is already in use.')
        if (cause.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')
          throw conflict('That email is already in use.')
        if (cause.statusCode === 400 || cause.statusCode === 422)
          throw new AppError(
            422,
            'VALIDATION_FAILED',
            'Check the account details and try again.',
          )
      }
      throw cause
    }
    if (!result?.user?.id) throw conflict('The account could not be created.')
    return this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordChangeRequired: true })
        .where(eq(users.id, result.user.id))
      await tx.delete(sessions).where(eq(sessions.userId, result.user.id))
      const [existingFunction] = input.function
        ? await tx
            .select({ id: workspaceTaxonomyItems.id })
            .from(workspaceTaxonomyItems)
            .where(
              and(
                eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
                eq(workspaceTaxonomyItems.type, 'job_function'),
                ilike(workspaceTaxonomyItems.name, input.function),
              ),
            )
            .limit(1)
        : []
      const [newFunction] =
        input.function && !existingFunction
          ? await tx
              .insert(workspaceTaxonomyItems)
              .values({
                workspaceId: actor.workspaceId,
                type: 'job_function',
                name: input.function,
              })
              .onConflictDoNothing()
              .returning({ id: workspaceTaxonomyItems.id })
          : []
      const [membership] = await tx
        .insert(memberships)
        .values({
          workspaceId: actor.workspaceId,
          userId: result.user.id,
          role: input.role,
          jobTitle: input.jobTitle,
          teamRoleId: input.teamRoleId,
          jobCategoryId: input.jobCategoryId,
          jobFunctionId:
            existingFunction?.id ?? newFunction?.id ?? input.jobFunctionId,
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
    await this.validateTaxonomy(actor, input)
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
        (['owner', 'admin'].includes(target.role) ||
          (input.role && !['member', 'viewer'].includes(input.role)))
      )
        throw forbidden('Admins may manage member and viewer accounts only.')
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
        .set({
          role: input.role,
          state: input.state,
          jobTitle: input.jobFunction ?? input.jobTitle,
          teamRoleId: input.teamRoleId,
          jobCategoryId: input.jobCategoryId,
          jobFunctionId: input.jobFunctionId,
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, membershipId))
        .returning()
      if (input.name)
        await tx
          .update(users)
          .set({ name: input.name, updatedAt: new Date() })
          .where(eq(users.id, target.userId))
      if (input.jobFunction) {
        const [existingFunction] = await tx
          .select({ id: workspaceTaxonomyItems.id })
          .from(workspaceTaxonomyItems)
          .where(
            and(
              eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
              eq(workspaceTaxonomyItems.type, 'job_function'),
              ilike(workspaceTaxonomyItems.name, input.jobFunction),
            ),
          )
          .limit(1)
        const [newFunction] = existingFunction
          ? []
          : await tx
              .insert(workspaceTaxonomyItems)
              .values({
                workspaceId: actor.workspaceId,
                type: 'job_function',
                name: input.jobFunction,
              })
              .onConflictDoNothing()
              .returning({ id: workspaceTaxonomyItems.id })
        await tx
          .update(memberships)
          .set({ jobFunctionId: existingFunction?.id ?? newFunction?.id })
          .where(eq(memberships.id, membershipId))
      }
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
              : input.state === 'active'
                ? 'membership.restored'
                : 'membership.profile_updated',
        metadata: { membershipId, role: input.role, state: input.state },
        correlationId: actor.requestId,
      })
      return updated
    })
  }

  private async validateTaxonomy(
    actor: ActorContext,
    input: {
      teamRoleId?: string | null
      jobCategoryId?: string | null
      jobFunctionId?: string | null
    },
  ) {
    const checks = [
      [input.teamRoleId, 'role'],
      [input.jobCategoryId, 'job_category'],
      [input.jobFunctionId, 'job_function'],
    ] as const
    for (const [id, type] of checks) {
      if (!id) continue
      const [item] = await this.db
        .select({ id: workspaceTaxonomyItems.id })
        .from(workspaceTaxonomyItems)
        .where(
          and(
            eq(workspaceTaxonomyItems.id, id),
            eq(workspaceTaxonomyItems.workspaceId, actor.workspaceId),
            eq(workspaceTaxonomyItems.type, type),
          ),
        )
        .limit(1)
      if (!item) throw notFound('Workspace classification not found.')
    }
  }
}
