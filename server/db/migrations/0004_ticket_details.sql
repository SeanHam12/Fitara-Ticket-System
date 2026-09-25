ALTER TABLE "tickets"
  ADD COLUMN "acceptance_criteria" text NOT NULL DEFAULT '',
  ADD COLUMN "comments" text NOT NULL DEFAULT '',
  ADD COLUMN "subtasks" text NOT NULL DEFAULT '',
  ADD COLUMN "dependencies" text NOT NULL DEFAULT '',
  ADD COLUMN "attachments" text NOT NULL DEFAULT '',
  ADD COLUMN "github_development" text NOT NULL DEFAULT '';
