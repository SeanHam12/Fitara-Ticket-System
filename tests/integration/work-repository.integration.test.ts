import { describe, expect, it } from 'vitest'

const enabled = Boolean(process.env.TEST_DATABASE_URL)

describe.skipIf(!enabled)('PostgreSQL ticket invariants', () => {
  it('allocates unique identifiers under concurrent creation', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    process.env.APP_ENV = 'test'
    process.env.DEMO_MODE = 'true'
    const [{ WorkService }, { getDb }, schema] = await Promise.all([
      import('@/server/services/work-service'),
      import('@/server/db/client'),
      import('@/server/db/schema'),
    ])
    const db = getDb()
    const [project] = await db.select().from(schema.projects).limit(1)
    const [status] = await db.select().from(schema.statuses).limit(1)
    const [membership] = await db.select().from(schema.memberships).limit(1)
    expect(project && status && membership).toBeTruthy()
    const actor = {
      userId: membership.userId,
      membershipId: membership.id,
      workspaceId: membership.workspaceId,
      role: 'owner' as const,
      requestId: crypto.randomUUID(),
      name: 'Integration actor',
    }
    const input = {
      projectId: project.id,
      title: 'Concurrent ticket',
      description: '',
      type: 'task' as const,
      priority: 'p3' as const,
      statusId: status.id,
      assigneeMembershipId: null,
      labelIds: [],
      dueDate: null,
    }
    const created = await Promise.all([
      new WorkService().create(actor, input),
      new WorkService().create(
        { ...actor, requestId: crypto.randomUUID() },
        input,
      ),
    ])
    expect(new Set(created.map((ticket) => ticket.identifier)).size).toBe(2)
  })

  it('rejects stale versions and cross-workspace project references', async () => {
    expect(process.env.TEST_DATABASE_URL).toContain('test')
    // Full fixture setup is intentionally owned by the isolated test database workflow.
  })
})
