-- Demo people can be assigned work without a credential account. Authenticated
-- users retain their email and Better Auth credential records.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Keep the status ID, ticket foreign keys, positions, and historical events.
UPDATE "workflow_statuses"
SET "name" = 'To Do', "key" = 'to_do'
WHERE "key" = 'triage';
