CREATE TABLE "ticket_assignees" (
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id"),
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id"),
  "membership_id" uuid NOT NULL REFERENCES "workspace_memberships"("id"),
  "position" integer NOT NULL,
  FOREIGN KEY ("workspace_id", "ticket_id") REFERENCES "tickets"("workspace_id", "id"),
  FOREIGN KEY ("workspace_id", "membership_id") REFERENCES "workspace_memberships"("workspace_id", "id"),
  PRIMARY KEY ("ticket_id", "membership_id"),
  UNIQUE ("ticket_id", "position")
);
CREATE INDEX "ticket_assignees_member_idx" ON "ticket_assignees"("workspace_id", "membership_id");
-- Historical single assignments become the first assignment. The legacy column
-- remains for rollback compatibility but is never read or written by new code.
INSERT INTO "ticket_assignees" ("workspace_id", "ticket_id", "membership_id", "position")
SELECT "workspace_id", "id", "assignee_membership_id", 0 FROM "tickets"
WHERE "assignee_membership_id" IS NOT NULL;
ALTER TABLE "tickets" ADD COLUMN "github_url" text;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_github_url_valid"
  CHECK ("github_url" IS NULL OR "github_url" ~ '^https://github[.]com/[^/?#]+/[^/?#]+(/(issues|pull)/[0-9]+)?/?$');
