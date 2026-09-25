# Fitara Work — demo vertical slice

Fitara Work is an internal project and ticket-management experience built with Next.js 16, React 19, PostgreSQL, Drizzle, and Tailwind CSS 4. This branch is a **demo environment**, not production authentication or authorization.

## Requirements

- Node.js 20 LTS or a Vercel-supported later LTS
- npm 10+
- An isolated PostgreSQL database (local or disposable Neon branch)

## Local setup

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Seed is explicit and idempotent. It refuses unless `DEMO_MODE=true`, `APP_ENV` is `development` or `demo`, and the URL does not look like production.

## Environment

| Variable                 | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `DATABASE_URL`           | Pooled PostgreSQL runtime connection; server-only         |
| `DATABASE_MIGRATION_URL` | Direct/admin migration connection; server-only            |
| `APP_ENV`                | `development`, `test`, `preview`, `demo`, or `production` |
| `NEXT_PUBLIC_APP_ENV`    | Non-sensitive environment label                           |
| `DEMO_MODE`              | Must be `true` for the seeded server-side demo owner      |

Never use production data or credentials. The browser cannot select identity, workspace, or role. `DEMO_MODE=false` fails closed instead of granting a demo owner.

## Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Vercel + Neon demo deployment

1. Create a disposable Neon development/demo project or branch in the same region as Vercel.
2. Copy its pooled URL to Vercel `DATABASE_URL` and direct URL to `DATABASE_MIGRATION_URL`; scope both only to the demo environment.
3. Set `APP_ENV=demo`, `NEXT_PUBLIC_APP_ENV=demo`, and `DEMO_MODE=true`.
4. Run `npm run db:migrate` and `npm run db:seed` manually from a trusted workstation or protected release job.
5. Import the repository in Vercel and deploy. Builds never migrate or seed.
6. Enable Vercel deployment protection for any publicly addressable demo.

To disable demo identity, set `DEMO_MODE=false` and redeploy. The application then denies access until Phase 2 replaces `server/auth/demo-actor.ts` with Better Auth and invitation-backed membership resolution.

## Limitations

The demo has one server-selected owner and workspace. It does not implement OAuth, invitations, full RBAC, comments, notifications, attachments, integrations, drag-and-drop, or production rate limiting. Status movement uses safe integer append positions as a temporary Phase 1 strategy. See `docs/` for the production architecture.
