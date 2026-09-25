import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { loadEnvConfig } from '@next/env'
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
} from '../schema'

async function main() {
  loadEnvConfig(process.cwd())
  if (
    process.env.DEMO_MODE !== 'true' ||
    !['development', 'demo'].includes(process.env.APP_ENV ?? '')
  )
    throw new Error(
      'Seed refused: DEMO_MODE=true and APP_ENV=development|demo required',
    )
  const url = process.env.DATABASE_URL ?? ''
  if (!url || /prod(uction)?/i.test(url))
    throw new Error('Seed refused: missing or production-like DATABASE_URL')
  const pool = new Pool({ connectionString: url, max: 1 })
  const db = drizzle(pool)
  const ids = {
    workspace: '10000000-0000-4000-8000-000000000001',
    user: '20000000-0000-4000-8000-000000000001',
    member: '30000000-0000-4000-8000-000000000001',
    projects: [
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
    ],
    statuses: [
      '50000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000002',
      '50000000-0000-4000-8000-000000000003',
      '50000000-0000-4000-8000-000000000004',
    ],
    labels: [
      '60000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000002',
      '60000000-0000-4000-8000-000000000003',
    ],
  }
  await db
    .insert(workspaces)
    .values({ id: ids.workspace, name: 'Fitara Demo', slug: 'fitara-demo' })
    .onConflictDoNothing()
  await db
    .insert(users)
    .values({
      id: ids.user,
      name: 'Alex Morgan',
      email: 'alex@example.invalid',
    })
    .onConflictDoNothing()
  await db
    .insert(memberships)
    .values({
      id: ids.member,
      workspaceId: ids.workspace,
      userId: ids.user,
      role: 'owner',
    })
    .onConflictDoNothing()
  await db
    .insert(projects)
    .values([
      {
        id: ids.projects[0],
        workspaceId: ids.workspace,
        name: 'Fitara Work',
        slug: 'fitara-work',
        key: 'FIT',
        description: 'Core product delivery',
      },
      {
        id: ids.projects[1],
        workspaceId: ids.workspace,
        name: 'Platform',
        slug: 'platform',
        key: 'PLAT',
        description: 'Developer experience and reliability',
      },
    ])
    .onConflictDoNothing()
  await db
    .insert(statuses)
    .values(
      ['Triage', 'In Progress', 'Review', 'Done'].map((name, i) => ({
        id: ids.statuses[i],
        workspaceId: ids.workspace,
        name,
        key: ['triage', 'in_progress', 'review', 'done'][i],
        position: i,
      })),
    )
    .onConflictDoNothing()
  await db
    .insert(labels)
    .values([
      {
        id: ids.labels[0],
        workspaceId: ids.workspace,
        name: 'Frontend',
        color: 'violet',
      },
      {
        id: ids.labels[1],
        workspaceId: ids.workspace,
        name: 'Backend',
        color: 'blue',
      },
      {
        id: ids.labels[2],
        workspaceId: ids.workspace,
        name: 'Quality',
        color: 'amber',
      },
    ])
    .onConflictDoNothing()
  const names = [
    'Design responsive project shell',
    'Add ticket creation validation',
    'Harden workspace query scoping',
    'Polish dark theme contrast',
    'Create migration release checklist',
    'Improve board keyboard controls',
    'Handle optimistic version conflicts',
    'Instrument API correlation IDs',
    'Review empty-state copy',
    'Optimize ticket search query',
    'Document demo deployment',
    'Verify mobile ticket drawer',
  ]
  for (let i = 0; i < names.length; i++) {
    const projectId = ids.projects[i % 2],
      sequence = Math.floor(i / 2) + 1,
      ticketId = `70000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    const [inserted] = await db
      .insert(tickets)
      .values({
        id: ticketId,
        workspaceId: ids.workspace,
        projectId,
        sequenceNumber: sequence,
        identifier: `${i % 2 ? 'PLAT' : 'FIT'}-${sequence}`,
        title: names[i],
        description: `Demo-ready work item for ${names[i].toLowerCase()}.`,
        type: ['feature', 'task', 'bug', 'improvement'][i % 4] as 'feature',
        priority: ['p1', 'p2', 'p3', 'p4'][i % 4] as 'p1',
        statusId: ids.statuses[i % 4],
        reporterMembershipId: ids.member,
        assigneeMembershipId: i % 3 === 0 ? null : ids.member,
        position: (i + 1) * 1000,
        blocked: i === 6,
        dueDate: i === 1 ? '2026-10-10' : null,
      })
      .onConflictDoNothing()
      .returning({ id: tickets.id })
    if (!inserted) continue
    await db
      .insert(ticketLabels)
      .values({
        workspaceId: ids.workspace,
        ticketId,
        labelId: ids.labels[i % 3],
      })
      .onConflictDoNothing()
    await db
      .insert(activityEvents)
      .values({
        workspaceId: ids.workspace,
        projectId,
        ticketId,
        actorMembershipId: ids.member,
        action: 'ticket.created',
        metadata: { seeded: true },
      })
      .onConflictDoNothing()
  }
  for (const projectId of ids.projects) {
    const rows = await db
      .select()
      .from(tickets)
      .where(eq(tickets.projectId, projectId))
    await db
      .insert(ticketSequences)
      .values({
        projectId,
        workspaceId: ids.workspace,
        currentValue: Math.max(...rows.map((r) => r.sequenceNumber), 0),
      })
      .onConflictDoUpdate({
        target: ticketSequences.projectId,
        set: {
          currentValue: Math.max(...rows.map((r) => r.sequenceNumber), 0),
          updatedAt: new Date(),
        },
      })
  }
  console.log('Fitara Work demo seed complete (idempotent).')
  await pool.end()
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed')
  process.exitCode = 1
})
