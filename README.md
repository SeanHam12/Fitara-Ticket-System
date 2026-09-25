# Fitara Work

Fitara Work is an internal project and ticket-management application built with Next.js 16, React 19, PostgreSQL, Drizzle, Better Auth, and Dnd Kit.

Phase 2 uses temporary MVP username/password authentication. Email is retained only as an internal account field. Public signup, OAuth, MFA, invitations, and email recovery are intentionally deferred. Workspace roles are application data and are not Better Auth administrative roles.

## Local setup

Use Node.js 20+ and an isolated PostgreSQL database. Copy `.env.example` to the ignored `.env.local`, replace every placeholder privately, then run:

```bash
npm install
npm run db:migrate
npm run db:bootstrap-owner
npm run dev
```

Open `http://localhost:3000`. Remove the three `BOOTSTRAP_OWNER_*` values after the idempotent owner bootstrap succeeds. Do not rerun the Phase 1 seed to create authenticated users.

## Environment

| Variable                   | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `DATABASE_URL`             | Pooled PostgreSQL runtime connection; server-only      |
| `DATABASE_MIGRATION_URL`   | Direct migration connection; server-only               |
| `APP_ENV`                  | Application environment                                |
| `NEXT_PUBLIC_APP_ENV`      | Non-sensitive environment label only                   |
| `DEMO_MODE`                | Demo-data guard; never grants identity                 |
| `BETTER_AUTH_SECRET`       | At least 32 random characters; server-only             |
| `BETTER_AUTH_URL`          | Canonical application origin                           |
| `BOOTSTRAP_OWNER_USERNAME` | One-time private owner username                        |
| `BOOTSTRAP_OWNER_EMAIL`    | One-time private internal email                        |
| `BOOTSTRAP_OWNER_PASSWORD` | One-time private owner password, 12–128 characters     |
| `TEST_DATABASE_URL`        | Optional isolated PostgreSQL integration-test database |

No database or authentication credential may use a `NEXT_PUBLIC_*` name.

## Security and behavior

- Better Auth owns credential hashing, generic sign-in failure behavior, HTTP-only cookies, CSRF/origin checks, database sessions, and login rate limiting.
- Usernames are trimmed, normalized to lowercase, compared uniquely without case sensitivity, and limited to 3–32 letters, numbers, periods, underscores, or hyphens.
- The server resolves the current active workspace membership on every protected request. There is no demo-owner fallback.
- Owner, admin, member, and viewer permissions are enforced through reusable server capabilities. Suspension revokes database sessions. The last-owner invariant is locked and checked transactionally.
- Board movement accepts status and neighbor intent—not a client rank—and recalculates spaced integer positions in a transaction. Dnd Kit provides pointer, touch, keyboard, overlay, and reduced-motion behavior; the status menu remains available.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Integration tests skip when `TEST_DATABASE_URL` is absent; they must never use the shared demo database. Builds do not migrate, bootstrap, seed, or deploy.
