import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}

export const roleEnum = pgEnum('workspace_role', [
  'owner',
  'admin',
  'member',
  'viewer',
])
export const membershipStateEnum = pgEnum('membership_state', [
  'active',
  'suspended',
  'removed',
])
export const ticketTypeEnum = pgEnum('ticket_type', [
  'bug',
  'feature',
  'task',
  'improvement',
])
export const priorityEnum = pgEnum('ticket_priority', ['p1', 'p2', 'p3', 'p4'])

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 63 }).notNull().unique(),
  ...timestamps,
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('avatar_url'),
    username: varchar('username', { length: 32 }),
    displayUsername: varchar('display_username', { length: 32 }),
    passwordChangeRequired: boolean('password_change_required')
      .notNull()
      .default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('users_username_unique')
      .on(sql`lower(${t.username})`)
      .where(sql`${t.username} is not null`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    index('sessions_expires_idx').on(t.expiresAt),
  ],
)

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (t) => [
    unique().on(t.providerId, t.accountId),
    index('accounts_user_idx').on(t.userId),
  ],
)

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
)

export const memberships = pgTable(
  'workspace_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: roleEnum('role').notNull(),
    state: membershipStateEnum('state').notNull().default('active'),
    ...timestamps,
  },
  (t) => [
    unique().on(t.workspaceId, t.userId),
    unique().on(t.workspaceId, t.id),
  ],
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    key: varchar('key', { length: 10 }).notNull(),
    description: text('description').notNull().default(''),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    ...timestamps,
  },
  (t) => [
    unique().on(t.workspaceId, t.key),
    unique().on(t.workspaceId, t.slug),
    unique().on(t.workspaceId, t.id),
  ],
)

export const statuses = pgTable(
  'workflow_statuses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 50 }).notNull(),
    key: varchar('key', { length: 30 }).notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.key), unique().on(t.workspaceId, t.id)],
)

export const ticketSequences = pgTable('ticket_sequences', {
  projectId: uuid('project_id')
    .primaryKey()
    .references(() => projects.id),
  workspaceId: uuid('workspace_id').notNull(),
  currentValue: integer('current_value').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    sequenceNumber: integer('sequence_number').notNull(),
    identifier: varchar('identifier', { length: 30 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    type: ticketTypeEnum('type').notNull(),
    priority: priorityEnum('priority').notNull(),
    statusId: uuid('status_id')
      .notNull()
      .references(() => statuses.id),
    reporterMembershipId: uuid('reporter_membership_id')
      .notNull()
      .references(() => memberships.id),
    assigneeMembershipId: uuid('assignee_membership_id').references(
      () => memberships.id,
    ),
    position: integer('position').notNull().default(1000),
    blocked: boolean('blocked').notNull().default(false),
    dueDate: date('due_date'),
    version: integer('version').notNull().default(1),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique().on(t.projectId, t.sequenceNumber),
    unique().on(t.workspaceId, t.identifier),
    unique().on(t.workspaceId, t.id),
    index('tickets_board_idx').on(t.workspaceId, t.statusId, t.position),
  ],
)

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.name), unique().on(t.workspaceId, t.id)],
)

export const ticketLabels = pgTable(
  'ticket_labels',
  {
    workspaceId: uuid('workspace_id').notNull(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    labelId: uuid('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.ticketId, t.labelId] })],
)

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    projectId: uuid('project_id').references(() => projects.id),
    ticketId: uuid('ticket_id').references(() => tickets.id),
    actorMembershipId: uuid('actor_membership_id')
      .notNull()
      .references(() => memberships.id),
    action: varchar('action', { length: 100 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    correlationId: varchar('correlation_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('activity_ticket_idx').on(t.workspaceId, t.ticketId, t.createdAt),
  ],
)
