ALTER TABLE "users" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "username" varchar(32);
ALTER TABLE "users" ADD COLUMN "display_username" varchar(32);
ALTER TABLE "users" ADD COLUMN "password_change_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "activity_events" ALTER COLUMN "project_id" DROP NOT NULL;
CREATE UNIQUE INDEX "users_username_unique" ON "users" (lower("username")) WHERE "username" IS NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_username_format" CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9._-]{3,32}$');

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE, "expires_at" timestamptz NOT NULL, "ip_address" text, "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "sessions_user_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_idx" ON "sessions"("expires_at");

CREATE TABLE "accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "account_id" text NOT NULL, "provider_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "access_token" text, "refresh_token" text,
  "id_token" text, "access_token_expires_at" timestamptz, "refresh_token_expires_at" timestamptz, "scope" text,
  "password" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("provider_id", "account_id")
);
CREATE INDEX "accounts_user_idx" ON "accounts"("user_id");

CREATE TABLE "verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "identifier" text NOT NULL, "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");
