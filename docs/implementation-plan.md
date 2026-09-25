# Fitara Work implementation plan

- Status: Proposed
- Delivery model: Small, independently reviewable pull requests
- Package manager: npm only

## Planning rules

- Do not mix phases into one implementation branch.
- Prefer vertical, testable slices inside each phase.
- Migrations are additive/backward-compatible until a later cleanup release.
- Every mutation ships with authorization, validation, failure, and activity behavior.
- Do not implement later-phase placeholders as live production behavior.
- Commands shown are target scripts to add in Phase 0; they do not all exist in the current scaffold.

Every phase is independently reviewable and must record new dependencies, environment variables, authorization work, accessibility requirements, and explicit non-goals even when “none.” This matrix is normative alongside the detailed sections:

| Phase | Dependencies / environment | Authorization and accessibility | Explicit non-goals |
|---|---|---|---|
| 0 | Formatter, test tooling, Zod env schema; example/local/test DB variables | No product auth; establish focus/a11y harness | No product behavior, auth, or schema |
| 1 | Approved UI primitives/icons only; no secrets | Mock permissions; WCAG 2.2 AA shell, focus, keyboard, reduced motion | No auth or persistence |
| 2 | Drizzle/Kit, `pg`, Zod; runtime/direct/local/test DB URLs | Scoped repositories/invariants; accessible status tokens | No OAuth or live user workflows |
| 3 | Better Auth GitHub support; auth secret/URL and per-environment OAuth credentials | Admission, roles, lifecycle, revocation, last-owner; accessible auth/denied states | No public signup/workspace creation or org admission |
| 4 | Approved query library; no secrets | Project/archive and own-pin policy; keyboard pin reorder | No purge or restricted projects |
| 5 | Approved Markdown sanitizer; no secrets | Ticket capability/version rules; labelled drawer/focus restore | No board DnD or comments |
| 6 | `dnd-kit`; no secrets | Scoped move/rank rules; keyboard/non-drag equivalent and announcements | No realtime |
| 7 | No required provider; no secrets | Comment window/moderation and relation cycles; accessible errors | No attachments or raw HTML |
| 8 | No delivery provider; no secrets | Saved-view references and recipient-only notifications; accessible unread state | No email/push/realtime |
| 9 | Approved axe/load/security tooling; rate-store vars only if selected | Full auth audit; automated/manual WCAG gate | No new product scope |
| 10 | Selected observability SDK; deployment/monitoring secrets | Production policy smoke tests and secure previews; a11y gate remains blocking | No preview auto-migration or production-data previews |

Phase 0 also pins supported Node/npm versions, keeps npm exclusive, adds formatting/type-check/test scripts, environment schema and `.env.example`, folder boundaries, CI, local PostgreSQL, clean-install verification, and branch/commit conventions. `npm ci` is a local dependency reset and runs only after the scaffold is safely committed, never during this audit. Each rollback section means disable/redeploy or forward-fix; migrations are not blindly reversed.

## Phase 0: Repository assessment and engineering standards

### Objective

Turn the uncommitted scaffold into a reproducible engineering baseline without implementing product features.

### User-visible outcome

No product functionality. The application still renders a simple branded placeholder, but contributors have reliable setup and checks.

### Dependencies

- Confirm repository ownership/remote and establish the initial commit.
- Confirm Node runtime policy. Recommend current Vercel-supported Node LTS rather than the developer's current Node 24.4.1 until deployment support is verified.
- Confirm GitHub Actions/Vercel/Neon ownership.

### Likely paths

`package.json`, `package-lock.json`, `.nvmrc`, `.env.example`, `.gitignore`, `README.md`, `tsconfig.json`, `eslint.config.mjs`, `prettier.config.mjs`, `lib/env.ts`, `.github/workflows/ci.yml`, test configs.

### Database changes

None. Establish local PostgreSQL/Neon branch instructions only.

### Backend work

- Add Zod environment schema with server/client separation.
- Add `server-only` boundaries.
- Define structured error/logger interfaces without product behavior.
- Select and install only approved dependencies at existing compatible versions.

### Frontend work

- Replace Create Next App metadata/placeholder with a minimal Fitara Work holding page.
- Establish semantic color, spacing, typography, focus, radius, and motion tokens in Tailwind 4/CSS.
- Add theme provider and basic accessible primitives.

### Tests

- Render smoke test.
- Environment parser unit tests.
- Playwright public-page smoke.
- CI test that lockfile is unchanged after `npm ci`.

### Acceptance criteria

- `npm ci` works from a clean checkout.
- npm is the only documented package manager.
- Scripts exist for format check, lint, typecheck, unit, integration, E2E, build, and CI.
- Missing/invalid environment values fail with actionable messages.
- The existing `npm run lint` baseline stays green.
- README no longer recommends Yarn/pnpm/Bun.
- Seven currently reported extraneous optional/WASM packages are investigated with clean `npm ci`; any remaining result is documented rather than manually deleting files.

### Verification commands

```bash
node --version
npm --version
npm ci
npm ls --depth=0
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
```

### Risks

Next 16/React 19 incompatibility in selected libraries; accidental upgrades; `.env.example` ignored by the current `.env*` rule; overbuilding a design system.

### Rollback

Revert configuration/dependency commits while preserving the npm lockfile and assessment docs.

### Definition of done

A clean checkout passes baseline CI, setup is documented, environment boundaries are tested, and no product/domain feature has been added.

## Phase 1: Design system and static application shell

### Objective

Validate information architecture, responsive shell, themes, and accessibility before connecting data.

### User-visible outcome

A static but realistic Fitara Work shell with workspace navigation, My Work, Triage, Active Work, customizable Pinned Work presentation, board/list switch, ticket cards, and drawer prototype.

### Dependencies

Phase 0; approved product terminology and visual direction.

### Likely paths

`app/(workspace)/`, `components/ui/`, `components/app-shell/`, `features/tickets/{board,list,detail}/`, `app/globals.css`, Storybook only if separately justified.

### Database changes

None; typed fixture objects only.

### Backend work

Define client-safe DTO TypeScript/Zod shapes with fixtures. No API/database.

### Frontend work

- Build shell, mobile navigation, breadcrumb, toolbar, board/list, cards, table, filters, drawer, forms, feedback states.
- Use native controls and selected Radix primitives.
- Add light/dark/system themes.
- Add keyboard shortcut help and non-drag move controls.
- Implement loading, empty, error, conflict, archived, and denied visual states.

### Tests

- RTL interaction/semantic tests for controls, drawer focus, themes, and navigation.
- Playwright static desktop/mobile/keyboard paths.
- Automated accessibility scan and manual keyboard checklist.

### Acceptance criteria

- UI matches the required navigation and card/detail information.
- Sidebar remove/archive/delete language cannot be confused.
- Board is usable without drag.
- No state relies solely on color.
- Drawer restores focus and preserves the underlying static view.
- Layout is usable at 320 px width and 200% zoom.

### Verification commands

```bash
npm run test:run -- shell board drawer
npm run test:e2e -- static-shell
npm run test:a11y
npm run build
```

### Risks

Static fixture shapes drifting from backend DTOs; too many client boundaries; visual polish delaying data foundations.

### Rollback

Keep tokens/primitives and revert incomplete screens independently.

### Definition of done

Approved shell and core screen prototypes pass responsive, theme, keyboard, and accessibility review with no production data behavior.

## Phase 2: Database, migrations, seed data, and domain model

### Objective

Create the PostgreSQL foundation and prove all durable invariants.

### User-visible outcome

No authenticated feature yet; developers can migrate and seed realistic demonstration data.

### Dependencies

Phases 0–1; accepted data-model and ORM ADRs; isolated Neon/local PostgreSQL.

### Likely paths

`drizzle.config.ts`, `db/client.ts`, `db/schema/*.ts`, `db/migrations/`, `db/seed/*.ts`, `server/*/repository.ts`, `tests/integration/db/`.

### Database changes

- Better Auth-compatible identity/session tables.
- Workspace, membership, invitation.
- Workflow/status, ticket type, project, sequence.
- Ticket, assignee, labels, criteria, relations, comments, activity.
- Saved views, sidebar preferences/pins.
- Notification schema reserved for Phase 8.
- Constraints, versions, ranks, archival fields, indexes, activity immutability.

### Backend work

- Central pooled client and transaction helpers.
- Domain types and repository skeletons.
- Idempotent local seed.
- Migration and schema-drift scripts.

### Frontend work

None beyond keeping fixture DTOs aligned.

### Tests

- Migrate empty database and rerun seed.
- Constraint and composite workspace FK tests.
- Concurrent sequence allocation.
- Version conflict and rank/rebalance tests.
- Activity update/delete rejection.
- Query-plan smoke on representative seed volume.

### Acceptance criteria

- Empty database migrates to current.
- Seed reruns without duplication.
- Concurrent creates produce unique project-local identifiers.
- Cross-workspace references fail.
- Activity is append-only at DB boundary.
- No production workflow uses `drizzle-kit push`.

### Verification commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:check
npm run test:integration -- database
```

### Risks

Better Auth ID mismatch; migration drift; unsafe locks; connection pooling errors; over-modeling later features.

### Rollback

Recreate disposable development databases. Shared environments use forward corrective migrations, never destructive reset.

### Definition of done

Schema, SQL migrations, seed, constraints, indexes, and concurrency tests are reviewed and reproducible.

## Phase 3: Authentication, workspaces, memberships, and permissions

### Objective

Deliver invite-only GitHub sign-in and centralized workspace RBAC.

### User-visible outcome

Invited users sign in, switch authorized workspaces, sign out, and see correct access-denied states. Owners/admins manage invitations and roles.

### Dependencies

Phase 2; GitHub OAuth apps; approved email matching/session/invitation policy.

### Likely paths

`server/auth/`, `server/authorization/`, `server/workspaces/`, `app/api/auth/[...all]/route.ts`, `app/api/v1/workspaces/`, `app/(auth)/`, `app/(workspace)/w/[workspaceSlug]/layout.tsx`, `proxy.ts`.

### Database changes

Finalize Better Auth migrations, invitations, memberships, session indexes, last-owner constraints/service locks.

### Backend work

- Configure Better Auth GitHub/database sessions.
- Implement invitation callback policy and idempotency.
- Add `requireSession`, `requireWorkspace`, capabilities, DTOs.
- Implement workspace/member/invitation services and API.
- Verify origin/cookies/trusted hosts.

### Frontend work

Sign-in, invitation variants, workspace switcher, membership admin, session expiry, forbidden/not-found states.

### Tests

- Mock provider boundary; no live GitHub in CI.
- Invitation expiry/revoke/mismatch/retry.
- Session expiry/sign-out/suspension.
- Full role matrix and cross-workspace IDOR tests.
- Last-owner and ownership-transfer transaction tests.
- Auth E2E through production-safe fixtures.

### Acceptance criteria

- Uninvited GitHub identity cannot gain workspace access.
- Protected data always resolves active membership near the service.
- Viewer cannot mutate.
- Cross-workspace resources do not disclose existence.
- OAuth/session secrets never reach client/logs.

### Verification commands

```bash
npm run test:run -- auth authorization
npm run test:integration -- auth workspace
npm run test:e2e -- authentication
npm run build
```

### Risks

Open signup, callback mismatch, hidden GitHub email, layout-only auth, overbroad OAuth scopes.

### Rollback

Disable sign-in/invitation entry points and promote prior deployment; preserve auth/membership data.

### Definition of done

Authentication, invitations, sessions, workspace isolation, roles, and all failure paths pass automated and manual security review.

## Phase 4: Projects and customizable sidebar

### Objective

Implement project lifecycle and personal pinned work.

### User-visible outcome

Owners/admins create, edit, archive, restore, and exceptionally delete projects. All users pin/unpin/reorder projects and saved views without affecting shared data.

### Dependencies

Phase 3.

### Likely paths

`server/projects/`, `server/saved-views/`, `features/projects/`, `features/sidebar/`, `app/api/v1/workspaces/[workspaceId]/{projects,sidebar-pins,saved-views}/`, workspace project/settings routes.

### Database changes

Project/workflow/sequence, saved-view, preference/pin tables and final indexes.

### Backend work

- Project create/read/update plus archive/restore; no delete service.
- Default workflow/type association.
- Pin and saved-view services with fixed-width hexadecimal numeric-gap ordering.
- Project key immutability after first ticket.
- Activity for project lifecycle.

### Frontend work

Project directory/forms/settings, active/archived states, pinned-work editor, optimistic pin operations, clear confirmation copy.

### Tests

Role matrix, duplicate key, archived-state, absence of delete routes, personal pin isolation, reorder conflict/rebalance, accessible forms/navigation.

### Acceptance criteria

- Sidebar removal never archives/deletes.
- Archived project leaves history/links intact and rejects new active work.
- No ordinary hard-delete endpoint or service exists; future purge remains out of scope.
- Pins persist per membership and can be restored.

### Verification commands

```bash
npm run test:run -- projects sidebar saved-views
npm run test:integration -- projects sidebar
npm run test:e2e -- project-lifecycle
```

### Risks

URL churn, accidental cascade deletion, rank conflicts, shared/personal state confusion.

### Rollback

Disable mutations independently; preserve read-only project/pin data. Never reverse archival by deleting data.

### Definition of done

Project and personal-navigation lifecycles meet the three-operation semantics and pass authorization/concurrency/accessibility tests.

## Phase 5: Ticket CRUD and ticket detail experience

### Objective

Implement core ticket creation, editing, detail, criteria, labels, assignment, archival, and restoration.

### User-visible outcome

Members create and manage typed/prioritized tickets in a drawer or canonical page with stable identifiers.

### Dependencies

Phase 4; approved assignment/archive/comment policies.

### Likely paths

`server/tickets/`, `features/tickets/{forms,detail}/`, `app/api/v1/workspaces/[workspaceId]/tickets/`, project list route, canonical ticket route, intercepted drawer route.

### Database changes

Finalize ticket, assignee, label, criterion, version, search columns/indexes.

### Backend work

- Atomic ticket sequence + ticket + initial activity.
- Strict create/patch/assign/criteria/archive services.
- Explicit DTO summaries/details.
- Markdown sanitization.
- Idempotency and `If-Match`.

### Frontend work

Create/edit forms, detail drawer/page, inline field controls, labels/assignee/criteria, pending/conflict/permission states, deep-link behavior.

### Tests

Concurrent sequence, validation limits, assignment protection, stale edits, XSS/sanitization, atomic activity, drawer focus/direct URL, mobile detail.

### Acceptance criteria

- Identifiers remain stable and unique.
- General patch cannot mass-assign restricted fields.
- Drawer preserves board/list location.
- Canonical route works independently.
- Every meaningful successful mutation writes one activity; failure writes none.

### Verification commands

```bash
npm run test:run -- tickets
npm run test:integration -- ticket-crud ticket-sequence
npm run test:e2e -- ticket-detail
```

### Risks

Mass assignment, stored XSS, duplicate IDs, over-fetching detail, stale overwrite.

### Rollback

Make mutation controls read-only and restore prior deployment; retain all rows/events.

### Definition of done

Core ticket lifecycle, direct links, drawer, authorization, validation, concurrency, and activity pass all test layers.

## Phase 6: Board/list views, filtering, and drag-and-drop

### Objective

Deliver fast project/cross-project work views and accessible ordering/status movement.

### User-visible outcome

Users switch board/list, search/filter, view result counts, and move tickets by pointer, keyboard, or menu with rollback.

### Dependencies

Phase 5.

### Likely paths

`features/tickets/{board,list,filters,queries}/`, `server/tickets/search.ts`, `server/tickets/ordering.ts`, move Route Handler, workspace My Work/Triage/Active routes.

### Database changes

Finalize search vector/trigram indexes after representative `EXPLAIN`; rank indexes and rebalance support.

### Backend work

- Validated URL filters and cursor pagination.
- Board/list summary queries without N+1.
- Conditional move transaction.
- Search, “only mine,” project/status/priority/type/label/assignee filters.

### Frontend work

TanStack hydration/query keys, board/list, dnd-kit, menu movement, optimistic snapshots, filter URL state, counts, loading/empty/conflict states.

### Tests

Filter parser, query plans, tenant isolation, rank algorithm, concurrent moves, cache rollback/invalidation, pointer/keyboard/menu E2E, mobile board/list.

### Acceptance criteria

- Shared URLs restore filters/view.
- Pointer and keyboard moves persist.
- Failed/stale moves roll back and announce.
- Search never leaks workspace data.
- Representative board/list queries meet an approved latency budget.

### Verification commands

```bash
npm run test:run -- filters ordering board
npm run test:integration -- ticket-search ticket-move
npm run test:e2e -- board list filtering
```

### Risks

Rank exhaustion, slow filters/counts, URL/cache divergence, inaccessible drag, excessive client bundle.

### Rollback

Disable drag and expensive search independently; keep menu movement and basic server lists.

### Definition of done

All views, filters, ordering, rollback, accessibility, and measured query behavior are stable.

## Phase 7: Comments, activity, subtasks, and dependencies

### Objective

Complete ticket collaboration, hierarchy, blocking relationships, and auditable timelines.

### User-visible outcome

Users comment, review immutable history, manage parent/subtasks, and identify blocking/blocked-by work.

### Dependencies

Phase 6.

### Likely paths

`server/{comments,activity}/`, ticket relationship services, `features/{comments,activity}/`, ticket criteria/relations/comments API routes.

### Database changes

Finalize comments, parent FKs, relations, activity indexes/immutability and optional idempotency index.

### Backend work

- Comment create/edit/redact.
- Cursor-paginated comments/activity.
- Parent cycle and blocking cycle prevention.
- Canonical symmetric relationships.
- Activity allowlists for all meaningful actions.

### Frontend work

Comment composer/retry, timeline, criteria, subtask creation/list, relation picker, blocked indicators, relationship empty/error states.

### Tests

Sanitization, author/moderator policy, pagination stability, activity immutability, parent/blocking cycles, cross-workspace relations, optimistic comment retry.

### Acceptance criteria

- Timeline accurately reflects committed actions.
- Activity cannot be changed by application role.
- Hierarchy/relations cannot self-reference/cycle/cross workspace.
- Comment failures preserve draft.
- Blocked cards communicate without relying on color.

### Verification commands

```bash
npm run test:run -- comments activity relations
npm run test:integration -- collaboration audit
npm run test:e2e -- comments subtasks blockers
```

### Risks

Stored XSS, sensitive activity payloads, unbounded timelines, graph query cost.

### Rollback

Disable collaboration/relationship mutations while preserving read-only timelines and existing records.

### Definition of done

Collaboration, audit, hierarchy, dependencies, safety limits, and cursor behavior pass tests.

## Phase 8: Saved views and notifications

### Objective

Add useful in-app notifications without realtime infrastructure.

### User-visible outcome

Users receive and clear notifications for approved events such as assignment, mention (if implemented), comment, blocker, and review transition.

### Dependencies

Phase 7; approved notification event list and retention.

### Likely paths

`server/notifications/`, `features/notifications/`, notification API routes, shell notification menu, optional outbox processor.

### Database changes

Notification rows/indexes and, if delivery requires async durability, a transactional outbox table.

### Backend work

- Event-to-recipient policy.
- Idempotent generation.
- Read/read-all and cursor pagination.
- Bounded focus refresh/polling.
- No email/push in MVP.

### Frontend work

Notification menu/page, unread count, mark read, links, empty/error/loading states, accessible announcements that avoid noise.

### Tests

Recipient privacy, idempotency, unread counts, pagination, actor exclusion rules, no duplicate notifications, focus refresh.

### Acceptance criteria

- Users see only their notifications.
- Meaningful events generate at most one notification per recipient.
- Product remains usable if notification processing fails.
- No WebSocket/realtime dependency is introduced.

### Verification commands

```bash
npm run test:run -- notifications
npm run test:integration -- notification-delivery
npm run test:e2e -- notifications
```

### Risks

Notification fatigue, duplicates, sensitive payload snapshots, coupling mutation success to delivery.

### Rollback

Disable generation/polling; core ticket mutation remains independent. Preserve rows for diagnosis.

### Definition of done

Approved notification cases, privacy, idempotency, degradation, and UX pass tests.

## Phase 9: Testing, security hardening, accessibility, and performance

### Objective

Harden the complete MVP before production data.

### User-visible outcome

Consistent errors, accessible workflows, safer sessions/mutations, and responsive performance.

### Dependencies

Phases 0–8 feature complete.

### Likely paths

`next.config.ts`, `proxy.ts`, `lib/{errors,logger,rate-limit}.ts`, `app/*error.tsx`, security/accessibility/performance tests and runbooks.

### Database changes

Index changes from measured plans; retention/cleanup jobs; constraint validation; no destructive contraction.

### Backend work

- Threat-model every endpoint.
- CSRF/origin, payload limits, rate limits, secure headers/CSP.
- Log redaction and correlation.
- Audit authorization coverage.
- Timeouts and bounded retries.
- Dependency vulnerability triage.

### Frontend work

- Complete all loading/empty/error/conflict/denied states.
- Manual keyboard/screen-reader/zoom/reduced-motion review.
- Bundle and rendering profiling.

### Tests

IDOR, privilege escalation, mass assignment, XSS, CSRF, stale writes, oversized payloads, rate limits, full browser/a11y suite, representative load/query plans.

### Acceptance criteria

- Security/authorization matrix is complete.
- WCAG 2.2 AA issues on critical paths are resolved.
- Logs expose no secrets or user-authored bodies.
- Approved latency/bundle budgets pass.
- High/critical dependency findings are fixed or explicitly risk-accepted.

### Verification commands

```bash
npm run ci
npm run test:security
npm run test:a11y
npm run test:e2e:all
npm audit
npm run build
```

### Risks

Late architectural findings, false confidence from automated scans, rate-limit lockout, noisy CSP.

### Rollback

Roll back individual controls causing availability issues, but never remove data-layer authorization or validation.

### Definition of done

Threat model, tests, accessibility audit, performance evidence, and dependency triage are reviewed with no unresolved launch blocker.

## Phase 10: CI, deployment, monitoring, and production readiness

### Objective

Make production releases observable, recoverable, and reversible.

### User-visible outcome

Fitara Work is available at its production domain with protected data and operational support.

### Dependencies

Phase 9; owner-approved Vercel/Neon/GitHub settings, RPO/RTO, domain, and incident roles.

### Likely paths

`.github/workflows/{ci,preview,release}.yml`, `app/api/health/route.ts`, `scripts/smoke.mjs`, `docs/runbooks/`.

### Database changes

Production branch, least-privilege roles, rehearsed migration, PITR/backups, restore evidence. Seed only system defaults.

### Backend work

Health/readiness endpoints, telemetry, release/migration IDs, production migration job, smoke account/process.

### Frontend work

Production auth/error/support links and final metadata/icons.

### Tests

Clean production-like migration, prior-version migration, production build, browser smoke, rollback drill, backup restore drill, OAuth callback verification.

### Acceptance criteria

- Required checks protect `main`.
- Preview/CI cannot access production data.
- Migration runs once before compatible deployment.
- Previous Vercel deployment can be promoted.
- Backup restoration meets approved RPO/RTO.
- Alerts have owners and runbooks.

### Verification commands

```bash
npm run ci
npm run db:check
npm run db:migrate
npx vercel build --prod
npx vercel deploy --prebuilt --prod
npm run smoke -- "$PRODUCTION_URL"
```

### Risks

Migration/deploy race, missing OAuth callback, untested backup, alert gaps, preview production access.

### Rollback

Promote prior immutable Vercel deployment. Use a forward database fix; restore/PITR only under incident authority. No destructive down migration.

### Definition of done

Launch checklist, CI, migration, smoke, monitoring, rollback, restore, and incident ownership are signed and evidenced.

## Later phases

### GitHub integration

Separate GitHub App; repository links; signature-verified/idempotent webhooks; durable async processing; PR/commit/branch development events; least privilege; kill switch.

### Automations

Transactional outbox; versioned trigger/condition/action DSL; dry-run; automation principal; idempotency; quotas; recursion/loop limits; execution history.

### External intake and SLAs

Separate requester identity/visibility, abuse controls, attachment scanning, queues, SLA calendars, notifications, and customer-safe DTOs.

### Attachments

Private object storage, direct signed upload, MIME/size/checksum validation, malware scan, authorized download, retention.

### Reporting and realtime

Add only after measured need. Reporting uses read models/materialized views. Realtime uses a managed channel/outbox design and never replaces authoritative fetch/reconciliation.

Also outside MVP: email notifications, public API tokens, native mobile clients, project hard-purge workflows, and AI functionality.

## Recommended first implementation

Implement **Phase 0 only**. It removes repository/runtime uncertainty and creates the checks needed to review all later phases safely. Do not begin the application shell or install domain dependencies until the Phase 0 PR scope and product-owner decisions are approved.
