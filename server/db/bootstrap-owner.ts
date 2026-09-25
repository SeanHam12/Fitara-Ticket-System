import { loadEnvConfig } from '@next/env'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

async function main() {
  loadEnvConfig(process.cwd())
  const config = z
    .object({
      APP_ENV: z.enum(['development', 'demo']),
      DEMO_MODE: z.literal('true'),
      DATABASE_URL: z
        .string()
        .url()
        .refine((value) => {
          const url = new URL(value)
          return (
            url.protocol.startsWith('postgres') &&
            url.hostname.endsWith('.neon.tech') &&
            url.pathname === '/neondb'
          )
        }, 'Bootstrap refused: expected the identified Neon demo database.'),
      BOOTSTRAP_OWNER_USERNAME: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(32)
        .regex(/^[a-z0-9._-]+$/),
      BOOTSTRAP_OWNER_EMAIL: z.email().max(320),
      BOOTSTRAP_OWNER_PASSWORD: z.string().min(12).max(128),
    })
    .parse(process.env)
  const [{ createAuth }, { getDb }, schema] = await Promise.all([
    import('@/server/auth/config'),
    import('@/server/db/client-core'),
    import('@/server/db/schema'),
  ])
  const db = getDb()
  const [existing] = await db
    .select({ userId: schema.users.id, membershipId: schema.memberships.id })
    .from(schema.users)
    .innerJoin(
      schema.memberships,
      eq(schema.memberships.userId, schema.users.id),
    )
    .where(
      and(
        eq(schema.users.username, config.BOOTSTRAP_OWNER_USERNAME),
        eq(schema.memberships.role, 'owner'),
        eq(schema.memberships.state, 'active'),
      ),
    )
    .limit(1)
  if (existing) {
    console.log('Owner bootstrap already complete.')
    return
  }
  const result = await createAuth(true).api.signUpEmail({
    body: {
      name: config.BOOTSTRAP_OWNER_USERNAME,
      username: config.BOOTSTRAP_OWNER_USERNAME,
      displayUsername: config.BOOTSTRAP_OWNER_USERNAME,
      email: config.BOOTSTRAP_OWNER_EMAIL.toLowerCase(),
      password: config.BOOTSTRAP_OWNER_PASSWORD,
    },
  })
  if (!result?.user?.id) throw new Error('Owner account creation failed.')
  const [workspace] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, 'fitara-demo'))
    .limit(1)
  if (!workspace)
    throw new Error('Bootstrap refused: demo workspace was not found.')
  await db.transaction(async (tx) => {
    const [membership] = await tx
      .insert(schema.memberships)
      .values({
        workspaceId: workspace.id,
        userId: result.user.id,
        role: 'owner',
        state: 'active',
      })
      .onConflictDoNothing()
      .returning()
    if (membership)
      await tx.insert(schema.activityEvents).values({
        workspaceId: workspace.id,
        projectId: null,
        actorMembershipId: membership.id,
        action: 'account.created',
        metadata: { role: 'owner', bootstrap: true },
        correlationId: crypto.randomUUID(),
      })
  })
  console.log(
    'Owner bootstrap complete. Remove the bootstrap credential variables.',
  )
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Owner bootstrap failed.',
  )
  process.exitCode = 1
})
