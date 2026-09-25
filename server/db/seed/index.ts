import { and, eq, isNull, sql } from 'drizzle-orm'
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
  workspaceTaxonomyItems,
} from '../schema'

type TicketSeed = {
  project: 0 | 1
  sequence: number
  title: string
  description: string
  assignee: number
  status: number
  type: 'bug' | 'feature' | 'task' | 'improvement'
  priority: 'p1' | 'p2' | 'p3' | 'p4'
  label: number
  blocked?: boolean
  dueDate: string
}

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
    users: [
      '20000000-0000-4000-8000-000000000001',
      '',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
      '20000000-0000-4000-8000-000000000004',
    ],
    members: [
      '30000000-0000-4000-8000-000000000001',
      '',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003',
      '30000000-0000-4000-8000-000000000004',
    ],
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
      '60000000-0000-4000-8000-000000000004',
      '60000000-0000-4000-8000-000000000005',
      '60000000-0000-4000-8000-000000000006',
    ],
    taxonomy: {
      roles: [
        '80000000-0000-4000-8000-000000000001',
        '80000000-0000-4000-8000-000000000002',
        '80000000-0000-4000-8000-000000000003',
        '80000000-0000-4000-8000-000000000004',
      ],
      categories: [
        '81000000-0000-4000-8000-000000000001',
        '81000000-0000-4000-8000-000000000002',
        '81000000-0000-4000-8000-000000000003',
      ],
      functions: [
        '82000000-0000-4000-8000-000000000001',
        '82000000-0000-4000-8000-000000000002',
        '82000000-0000-4000-8000-000000000003',
        '82000000-0000-4000-8000-000000000004',
        '82000000-0000-4000-8000-000000000005',
      ],
    },
  }

  await db
    .insert(workspaces)
    .values({ id: ids.workspace, name: 'Fitara Demo', slug: 'fitara-demo' })
    .onConflictDoNothing()

  await db
    .insert(workspaceTaxonomyItems)
    .values([
      {
        id: ids.taxonomy.roles[0],
        workspaceId: ids.workspace,
        type: 'role',
        name: 'Engineering Lead',
        description:
          'Owns technical direction, delivery, and engineering standards.',
        color: '#7c5ce7',
      },
      {
        id: ids.taxonomy.roles[1],
        workspaceId: ids.workspace,
        type: 'role',
        name: 'Product Owner',
        description:
          'Owns product outcomes, prioritization, and stakeholder alignment.',
        color: '#d88937',
      },
      {
        id: ids.taxonomy.roles[2],
        workspaceId: ids.workspace,
        type: 'role',
        name: 'Software Engineer',
        description:
          'Designs, builds, reviews, and operates product capabilities.',
        color: '#3b82d0',
      },
      {
        id: ids.taxonomy.roles[3],
        workspaceId: ids.workspace,
        type: 'role',
        name: 'Quality Lead',
        description:
          'Owns test strategy, release confidence, and quality practices.',
        color: '#319b65',
      },
      {
        id: ids.taxonomy.categories[0],
        workspaceId: ids.workspace,
        type: 'job_category',
        name: 'Leadership',
        description: 'Technical and product leadership roles.',
        color: '#7c5ce7',
      },
      {
        id: ids.taxonomy.categories[1],
        workspaceId: ids.workspace,
        type: 'job_category',
        name: 'Engineering',
        description: 'Software design, development, and operations.',
        color: '#3b82d0',
      },
      {
        id: ids.taxonomy.categories[2],
        workspaceId: ids.workspace,
        type: 'job_category',
        name: 'Quality Engineering',
        description: 'Automation, validation, and release quality.',
        color: '#319b65',
      },
      {
        id: ids.taxonomy.functions[0],
        workspaceId: ids.workspace,
        type: 'job_function',
        name: 'Engineering Management',
        description: 'Delivery planning, coaching, and technical governance.',
        color: '#7c5ce7',
      },
      {
        id: ids.taxonomy.functions[1],
        workspaceId: ids.workspace,
        type: 'job_function',
        name: 'Full-Stack Development',
        description: 'End-to-end product and platform implementation.',
        color: '#d88937',
      },
      {
        id: ids.taxonomy.functions[2],
        workspaceId: ids.workspace,
        type: 'job_function',
        name: 'Frontend Development',
        description: 'Accessible, responsive user interface engineering.',
        color: '#ad55c5',
      },
      {
        id: ids.taxonomy.functions[3],
        workspaceId: ids.workspace,
        type: 'job_function',
        name: 'Backend Development',
        description: 'APIs, data modeling, performance, and integrations.',
        color: '#3b82d0',
      },
      {
        id: ids.taxonomy.functions[4],
        workspaceId: ids.workspace,
        type: 'job_function',
        name: 'QA & DevOps',
        description:
          'Test automation, CI/CD, reliability, and release operations.',
        color: '#319b65',
      },
    ])
    .onConflictDoNothing()

  const seededPeople = [
    {
      id: ids.users[0],
      membershipId: ids.members[0],
      name: 'Alex Morgan',
      email: 'alex@example.invalid',
      jobTitle: 'Engineering Lead',
      role: 'owner' as const,
      teamRoleId: ids.taxonomy.roles[0],
      jobCategoryId: ids.taxonomy.categories[0],
      jobFunctionId: ids.taxonomy.functions[0],
    },
    {
      id: ids.users[2],
      membershipId: ids.members[2],
      name: 'Maya Chen',
      email: 'maya.chen@example.invalid',
      jobTitle: 'Frontend Engineer',
      role: 'member' as const,
      teamRoleId: ids.taxonomy.roles[2],
      jobCategoryId: ids.taxonomy.categories[1],
      jobFunctionId: ids.taxonomy.functions[2],
    },
    {
      id: ids.users[3],
      membershipId: ids.members[3],
      name: 'Marcus Johnson',
      email: 'marcus.johnson@example.invalid',
      jobTitle: 'Backend Engineer',
      role: 'member' as const,
      teamRoleId: ids.taxonomy.roles[2],
      jobCategoryId: ids.taxonomy.categories[1],
      jobFunctionId: ids.taxonomy.functions[3],
    },
    {
      id: ids.users[4],
      membershipId: ids.members[4],
      name: 'Priya Shah',
      email: 'priya.shah@example.invalid',
      jobTitle: 'QA Automation & DevOps Engineer',
      role: 'admin' as const,
      teamRoleId: ids.taxonomy.roles[3],
      jobCategoryId: ids.taxonomy.categories[2],
      jobFunctionId: ids.taxonomy.functions[4],
    },
  ]
  for (const person of seededPeople) {
    await db
      .insert(users)
      .values({ id: person.id, name: person.name, email: person.email })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: person.name, updatedAt: new Date() },
      })
    await db
      .insert(memberships)
      .values({
        id: person.membershipId,
        workspaceId: ids.workspace,
        userId: person.id,
        role: person.role,
        state: 'active',
        jobTitle: person.jobTitle,
        teamRoleId: person.teamRoleId,
        jobCategoryId: person.jobCategoryId,
        jobFunctionId: person.jobFunctionId,
      })
      .onConflictDoUpdate({
        target: [memberships.workspaceId, memberships.userId],
        set: {
          role: person.role,
          state: 'active',
          jobTitle: person.jobTitle,
          teamRoleId: person.teamRoleId,
          jobCategoryId: person.jobCategoryId,
          jobFunctionId: person.jobFunctionId,
          updatedAt: new Date(),
        },
      })
  }

  const [sean] = await db
    .select({ userId: users.id, membershipId: memberships.id })
    .from(users)
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, users.id),
        eq(memberships.workspaceId, ids.workspace),
      ),
    )
    .where(eq(users.username, 'seanham12'))
    .limit(1)
  if (!sean)
    throw new Error(
      'Team seed requires the authenticated SeanHam12 owner account.',
    )
  ids.users[1] = sean.userId
  ids.members[1] = sean.membershipId
  await db
    .update(users)
    .set({
      name: 'SeanHam12',
      displayUsername: 'SeanHam12',
      updatedAt: new Date(),
    })
    .where(eq(users.id, sean.userId))
  await db
    .update(memberships)
    .set({
      role: 'owner',
      state: 'active',
      jobTitle: 'Full-Stack Developer & Product Owner',
      teamRoleId: ids.taxonomy.roles[1],
      jobCategoryId: ids.taxonomy.categories[0],
      jobFunctionId: ids.taxonomy.functions[1],
      updatedAt: new Date(),
    })
    .where(eq(memberships.id, sean.membershipId))

  await db
    .insert(projects)
    .values([
      {
        id: ids.projects[0],
        workspaceId: ids.workspace,
        name: 'Fitara Work',
        slug: 'fitara-work',
        key: 'FIT',
        description: 'Customer-facing ticket and workflow experience',
      },
      {
        id: ids.projects[1],
        workspaceId: ids.workspace,
        name: 'Platform',
        slug: 'platform',
        key: 'PLAT',
        description: 'Developer experience, APIs, security, and reliability',
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
      {
        id: ids.labels[3],
        workspaceId: ids.workspace,
        name: 'Security',
        color: 'red',
      },
      {
        id: ids.labels[4],
        workspaceId: ids.workspace,
        name: 'DevOps',
        color: 'green',
      },
      {
        id: ids.labels[5],
        workspaceId: ids.workspace,
        name: 'UX',
        color: 'pink',
      },
    ])
    .onConflictDoNothing()

  const ticketSeeds: TicketSeed[] = [
    {
      project: 0,
      sequence: 1,
      title: 'Build customer issue intake dashboard',
      description:
        'Create a unified dashboard for new customer issues with SLA, severity, account tier, and ownership signals.',
      assignee: 1,
      status: 1,
      type: 'feature',
      priority: 'p1',
      label: 0,
      dueDate: '2026-10-02',
    },
    {
      project: 1,
      sequence: 1,
      title: 'Define service ownership and escalation paths',
      description:
        'Document service owners, on-call escalation paths, and decision points for production incidents.',
      assignee: 0,
      status: 2,
      type: 'task',
      priority: 'p2',
      label: 4,
      dueDate: '2026-10-03',
    },
    {
      project: 0,
      sequence: 2,
      title: 'Implement responsive ticket detail drawer',
      description:
        'Deliver a keyboard-accessible responsive drawer for ticket context, activity, and editing workflows.',
      assignee: 2,
      status: 1,
      type: 'feature',
      priority: 'p2',
      label: 0,
      dueDate: '2026-10-05',
    },
    {
      project: 1,
      sequence: 2,
      title: 'Add cursor pagination to the ticket API',
      description:
        'Replace offset pagination with stable cursor pagination and document the response contract.',
      assignee: 3,
      status: 2,
      type: 'improvement',
      priority: 'p2',
      label: 1,
      dueDate: '2026-10-06',
    },
    {
      project: 0,
      sequence: 3,
      title: 'Automate critical workflow regression suite',
      description:
        'Cover ticket creation, assignment, status changes, permissions, and optimistic conflicts in CI.',
      assignee: 4,
      status: 1,
      type: 'task',
      priority: 'p1',
      label: 2,
      dueDate: '2026-10-07',
    },
    {
      project: 1,
      sequence: 3,
      title: 'Add workspace-wide command palette',
      description:
        'Provide fast keyboard navigation for tickets, projects, members, and common actions.',
      assignee: 1,
      status: 0,
      type: 'feature',
      priority: 'p3',
      label: 5,
      dueDate: '2026-10-12',
    },
    {
      project: 0,
      sequence: 4,
      title: 'Review Q4 reliability roadmap',
      description:
        'Prioritize reliability investments using incident frequency, customer impact, and engineering effort.',
      assignee: 0,
      status: 1,
      type: 'task',
      priority: 'p2',
      label: 4,
      dueDate: '2026-10-09',
    },
    {
      project: 1,
      sequence: 4,
      title: 'Build accessible board drag indicators',
      description:
        'Add clear drop targets, keyboard announcements, focus states, and reduced-motion behavior.',
      assignee: 2,
      status: 2,
      type: 'improvement',
      priority: 'p2',
      label: 5,
      dueDate: '2026-10-10',
    },
    {
      project: 0,
      sequence: 5,
      title: 'Optimize filtered ticket query indexes',
      description:
        'Measure query plans and add indexes for workspace, status, assignee, priority, and updated-time filters.',
      assignee: 3,
      status: 1,
      type: 'improvement',
      priority: 'p1',
      label: 1,
      dueDate: '2026-10-08',
    },
    {
      project: 1,
      sequence: 5,
      title: 'Add API contract tests for role permissions',
      description:
        'Verify owner, admin, member, and viewer behavior across every mutation endpoint.',
      assignee: 4,
      status: 2,
      type: 'task',
      priority: 'p1',
      label: 2,
      dueDate: '2026-10-11',
    },
    {
      project: 0,
      sequence: 6,
      title: 'Implement saved ticket filters',
      description:
        'Let users save and restore common project, status, priority, and assignee filter combinations.',
      assignee: 1,
      status: 0,
      type: 'feature',
      priority: 'p3',
      label: 0,
      dueDate: '2026-10-16',
    },
    {
      project: 1,
      sequence: 6,
      title: 'Coordinate authentication threat-model review',
      description:
        'Review session handling, forced password changes, CSRF boundaries, and local bypass safeguards.',
      assignee: 0,
      status: 2,
      type: 'task',
      priority: 'p1',
      label: 3,
      blocked: true,
      dueDate: '2026-10-13',
    },
    {
      project: 0,
      sequence: 7,
      title: 'Improve mobile board navigation',
      description:
        'Make horizontal board navigation predictable on touch devices without accidental ticket drags.',
      assignee: 2,
      status: 1,
      type: 'improvement',
      priority: 'p2',
      label: 0,
      dueDate: '2026-10-14',
    },
    {
      project: 1,
      sequence: 7,
      title: 'Add idempotency keys to ticket creation',
      description:
        'Prevent duplicate tickets when clients retry timed-out create requests.',
      assignee: 3,
      status: 0,
      type: 'feature',
      priority: 'p2',
      label: 1,
      dueDate: '2026-10-15',
    },
    {
      project: 0,
      sequence: 8,
      title: 'Validate cross-browser drag-and-drop behavior',
      description:
        'Exercise pointer, touch, and keyboard movement in Chrome, Firefox, Safari, and Edge.',
      assignee: 4,
      status: 2,
      type: 'task',
      priority: 'p2',
      label: 2,
      dueDate: '2026-10-16',
    },
    {
      project: 1,
      sequence: 8,
      title: 'Build notification preference settings',
      description:
        'Add per-user controls for assignment, mention, status, and due-date notifications.',
      assignee: 1,
      status: 0,
      type: 'feature',
      priority: 'p3',
      label: 0,
      dueDate: '2026-10-22',
    },
    {
      project: 0,
      sequence: 9,
      title: 'Define incident severity and response targets',
      description:
        'Set SEV definitions, response-time targets, communication owners, and review expectations.',
      assignee: 0,
      status: 3,
      type: 'task',
      priority: 'p1',
      label: 4,
      dueDate: '2026-10-01',
    },
    {
      project: 1,
      sequence: 9,
      title: 'Create reusable empty and loading states',
      description:
        'Standardize accessible skeletons, empty-state guidance, and recoverable error patterns.',
      assignee: 2,
      status: 1,
      type: 'improvement',
      priority: 'p3',
      label: 5,
      dueDate: '2026-10-20',
    },
    {
      project: 0,
      sequence: 10,
      title: 'Add structured audit event queries',
      description:
        'Expose workspace-scoped audit filters for actor, action, ticket, and date range.',
      assignee: 3,
      status: 1,
      type: 'feature',
      priority: 'p2',
      label: 1,
      dueDate: '2026-10-21',
    },
    {
      project: 1,
      sequence: 10,
      title: 'Configure PostgreSQL integration fixtures',
      description:
        'Provision repeatable isolated fixtures for concurrency, scoping, and transaction tests.',
      assignee: 4,
      status: 0,
      type: 'task',
      priority: 'p2',
      label: 2,
      blocked: true,
      dueDate: '2026-10-19',
    },
    {
      project: 0,
      sequence: 11,
      title: 'Implement bulk ticket assignment',
      description:
        'Support selecting multiple tickets and assigning them in one audited operation.',
      assignee: 1,
      status: 0,
      type: 'feature',
      priority: 'p3',
      label: 0,
      dueDate: '2026-10-28',
    },
    {
      project: 1,
      sequence: 11,
      title: 'Plan zero-downtime migration rollout',
      description:
        'Define expand-and-contract steps, validation queries, rollback criteria, and ownership.',
      assignee: 0,
      status: 1,
      type: 'task',
      priority: 'p1',
      label: 4,
      dueDate: '2026-10-23',
    },
    {
      project: 0,
      sequence: 12,
      title: 'Improve theme contrast and focus states',
      description:
        'Validate custom theme colors against contrast targets and strengthen visible focus treatment.',
      assignee: 2,
      status: 2,
      type: 'improvement',
      priority: 'p2',
      label: 5,
      dueDate: '2026-10-24',
    },
    {
      project: 1,
      sequence: 12,
      title: 'Add request tracing across service boundaries',
      description:
        'Propagate correlation IDs through HTTP, database, and activity-event logging paths.',
      assignee: 3,
      status: 1,
      type: 'improvement',
      priority: 'p2',
      label: 1,
      dueDate: '2026-10-26',
    },
    {
      project: 0,
      sequence: 13,
      title: 'Create release smoke-test checklist',
      description:
        'Document the minimum login, permissions, ticket, board, and deployment checks for every release.',
      assignee: 4,
      status: 3,
      type: 'task',
      priority: 'p2',
      label: 2,
      dueDate: '2026-10-27',
    },
  ]

  const positions = [0, 0, 0, 0]
  for (let i = 0; i < ticketSeeds.length; i++) {
    const seed = ticketSeeds[i]
    const projectId = ids.projects[seed.project]
    const key = seed.project === 0 ? 'FIT' : 'PLAT'
    const identifier = `${key}-${seed.sequence}`
    positions[seed.status] += 1000
    const hasDetails = i < 13
    const detailSlug = seed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const details = {
      acceptanceCriteria: hasDetails
        ? `The ${seed.title.toLowerCase()} workflow is available to authorized workspace members.\nPrimary, empty, loading, and failure states are covered.\nAutomated checks pass and the change meets accessibility requirements.`
        : '',
      comments: hasDetails
        ? `Discovery is complete and the implementation approach was reviewed by ${['Alex', 'Sean', 'Maya', 'Marcus', 'Priya'][seed.assignee]}.\nNext update is expected after the current review cycle.`
        : '',
      subtasks: hasDetails
        ? `Confirm requirements and edge cases\nImplement ${seed.title.toLowerCase()}\nAdd unit and integration coverage\nUpdate release notes`
        : '',
      dependencies: hasDetails
        ? `${seed.project === 0 ? 'Fitara Work design tokens and ticket API' : 'Platform authentication and observability services'}\nRequires the current workspace schema migration.`
        : '',
      attachments: hasDetails
        ? `Technical brief: https://docs.fitara.invalid/tickets/${identifier}\nQA evidence: https://files.fitara.invalid/${identifier.toLowerCase()}/test-plan`
        : '',
      githubDevelopment: hasDetails
        ? `Repository: fitara/work\nBranch: feature/${detailSlug}\nPull request: fitara/work#${201 + i}`
        : '',
    }
    const values = {
      workspaceId: ids.workspace,
      projectId,
      sequenceNumber: seed.sequence,
      identifier,
      title: seed.title,
      description: seed.description,
      type: seed.type,
      priority: seed.priority,
      statusId: ids.statuses[seed.status],
      reporterMembershipId: ids.members[i % ids.members.length],
      assigneeMembershipId: ids.members[seed.assignee],
      position: positions[seed.status],
      blocked: seed.blocked ?? false,
      ...details,
      dueDate: seed.dueDate,
      archivedAt: null,
      updatedAt: new Date(),
    }
    const [existing] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.workspaceId, ids.workspace),
          eq(tickets.identifier, identifier),
        ),
      )
      .limit(1)
    let ticketId = existing?.id
    if (ticketId) {
      await db.update(tickets).set(values).where(eq(tickets.id, ticketId))
    } else {
      ticketId = `70000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
      await db.insert(tickets).values({ id: ticketId, ...values })
      await db.insert(activityEvents).values({
        workspaceId: ids.workspace,
        projectId,
        ticketId,
        actorMembershipId: ids.members[seed.assignee],
        action: 'ticket.created',
        metadata: { seeded: true, teamDataset: true },
      })
    }
    await db.delete(ticketLabels).where(eq(ticketLabels.ticketId, ticketId))
    await db.insert(ticketLabels).values({
      workspaceId: ids.workspace,
      ticketId,
      labelId: ids.labels[seed.label],
    })
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
        currentValue: Math.max(...rows.map((row) => row.sequenceNumber), 0),
      })
      .onConflictDoUpdate({
        target: ticketSequences.projectId,
        set: {
          currentValue: Math.max(...rows.map((row) => row.sequenceNumber), 0),
          updatedAt: new Date(),
        },
      })
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(
      and(eq(tickets.workspaceId, ids.workspace), isNull(tickets.archivedAt)),
    )
  console.log(`Fitara Work team seed complete (${count} active tickets).`)
  await pool.end()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Seed failed')
  process.exitCode = 1
})
