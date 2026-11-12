import { expect, it } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { demoPersonSchema } from './person-schema'
import {
  assertCanDeleteMembership,
  activeAssignmentScope,
  planActiveTicketUnassignment,
} from './membership-deletion'

it('accepts only three descriptive demo person fields and normalizes usernames', () => {
  expect(
    demoPersonSchema.parse({
      username: ' Taylor ',
      name: ' Taylor Kim ',
      function: ' Design ',
    }),
  ).toEqual({
    username: 'taylor',
    name: 'Taylor Kim',
    function: 'Design',
  })
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: 'Taylor Kim',
      function: 'Design',
      role: 'owner',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: null,
      function: 'Design',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'taylor',
      name: 'Taylor Kim',
      function: '',
    }),
  ).toThrow()
  expect(() =>
    demoPersonSchema.parse({
      username: 'ADMIN',
      name: 'Admin',
      function: 'IT',
    }),
  ).toThrow()
})

it('scopes active ticket impact to the same workspace and membership', () => {
  const query = new PgDialect().sqlToQuery(
    activeAssignmentScope('workspace-a', 'member-b')!,
  )
  expect(query.sql).toContain('"ticket_assignees"."workspace_id"')
  expect(query.sql).toContain('"tickets"."workspace_id"')
  expect(query.sql).toContain('"ticket_assignees"."membership_id"')
  expect(query.sql).toContain('"tickets"."archived_at" is null')
  expect(query.params).toEqual(['workspace-a', 'workspace-a', 'member-b'])
})

it('enforces delete permissions, self protection, and last-owner protection', () => {
  const target = { id: 'other', role: 'member' as const, state: 'active' }
  expect(() =>
    assertCanDeleteMembership(
      { membershipId: 'me', role: 'viewer' },
      target,
      2,
    ),
  ).toThrow()
  expect(() =>
    assertCanDeleteMembership(
      { membershipId: 'other', role: 'owner' },
      target,
      2,
    ),
  ).toThrow(/own/)
  expect(() =>
    assertCanDeleteMembership(
      { membershipId: 'me', role: 'admin' },
      { ...target, role: 'owner' },
      2,
    ),
  ).toThrow(/Admins/)
  expect(() =>
    assertCanDeleteMembership(
      { membershipId: 'me', role: 'owner' },
      { ...target, role: 'owner' },
      1,
    ),
  ).toThrow(/last active owner/)
  expect(() =>
    assertCanDeleteMembership(
      { membershipId: 'me', role: 'owner' },
      { ...target, state: 'removed' },
      2,
    ),
  ).toThrow(/already deleted/)
  expect(() =>
    assertCanDeleteMembership({ membershipId: 'me', role: 'admin' }, target, 2),
  ).not.toThrow()
})

it('requires the confirmed active ticket count before detaching assignments', () => {
  expect(planActiveTicketUnassignment([{ id: 'a' }, { id: 'b' }], 2)).toEqual([
    'a',
    'b',
  ])
  expect(() => planActiveTicketUnassignment([{ id: 'a' }], 2)).toThrow(
    /Assigned tickets changed/,
  )
})
