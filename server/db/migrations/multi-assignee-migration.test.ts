import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('backfills legacy assignees without changing tickets or their history', () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      'server/db/migrations/0006_multi_assignees_github_url.sql',
    ),
    'utf8',
  )
  expect(migration).toContain(
    'SELECT "workspace_id", "id", "assignee_membership_id", 0 FROM "tickets"',
  )
  expect(migration).toContain('PRIMARY KEY ("ticket_id", "membership_id")')
  expect(migration).toContain('FOREIGN KEY ("workspace_id", "membership_id")')
  expect(migration).not.toMatch(
    /(?:DELETE FROM|UPDATE|DROP TABLE)\s+"?(?:tickets|activity_events)"?/i,
  )
})

it('registers the schema required by ticket reads in the migration journal', () => {
  const root = process.cwd()
  const journal = JSON.parse(
    readFileSync(join(root, 'server/db/migrations/meta/_journal.json'), 'utf8'),
  ) as { entries: { idx: number; tag: string }[] }
  const latest = journal.entries.at(-1)
  expect(latest).toEqual(
    expect.objectContaining({ idx: 6, tag: '0006_multi_assignees_github_url' }),
  )
  const sql = readFileSync(
    join(root, 'server/db/migrations/0006_multi_assignees_github_url.sql'),
    'utf8',
  )
  expect(sql).toMatch(/CREATE TABLE "ticket_assignees"/)
  expect(sql).toMatch(/ALTER TABLE "tickets" ADD COLUMN "github_url" text/)
  const repository = readFileSync(
    join(root, 'server/repositories/work-repository.ts'),
    'utf8',
  )
  expect(repository).toContain('from(ticketAssignees)')
  expect(repository).toContain('githubUrl: tickets.githubUrl')
})
