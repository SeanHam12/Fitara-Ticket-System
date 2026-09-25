CREATE TYPE "workspace_taxonomy_type" AS ENUM ('role', 'job_category', 'job_function');

CREATE TABLE "workspace_taxonomy_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "type" "workspace_taxonomy_type" NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "color" varchar(7) NOT NULL DEFAULT '#6957e8',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("workspace_id", "type", "name")
);

ALTER TABLE "workspace_memberships"
  ADD COLUMN "team_role_id" uuid REFERENCES "workspace_taxonomy_items"("id") ON DELETE SET NULL,
  ADD COLUMN "job_category_id" uuid REFERENCES "workspace_taxonomy_items"("id") ON DELETE SET NULL,
  ADD COLUMN "job_function_id" uuid REFERENCES "workspace_taxonomy_items"("id") ON DELETE SET NULL;
