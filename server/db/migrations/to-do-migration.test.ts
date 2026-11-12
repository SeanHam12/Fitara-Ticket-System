import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

it('renames the existing workflow row without replacing ticket references or audit events', () => {
  const sql = readFileSync(
    join(process.cwd(), 'server/db/migrations/0005_demo_people_and_to_do.sql'),
    'utf8',
  )
  expect(sql).toMatch(
    /UPDATE "workflow_statuses"[\s\S]*"name" = 'To Do', "key" = 'to_do'[\s\S]*WHERE "key" = 'triage'/,
  )
  expect(sql).not.toMatch(
    /(?:UPDATE|DELETE FROM|TRUNCATE)\s+"?(?:tickets|activity_events)"?/i,
  )
  expect(sql).toMatch(/ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL/)
})
