# ADR-0003: Use Better Auth with invite-only GitHub OAuth

- Status: Accepted baseline; policy details proposed
- Date: 2026-09-24

## Context

Initial users are Fitara developers and product leadership. GitHub identity is convenient, but Fitara Work still needs revocable sessions, invitation enforcement, workspace membership, and role authorization.

## Decision

Use Better Auth with GitHub OAuth and PostgreSQL database sessions. Disable public signup. Application-owned invitation/allowlist policy grants workspace membership only after a verified GitHub email matches an active invitation.

Authentication and workspace authorization remain separate. Login OAuth tokens are never reused for future repository integration.

## Alternatives considered

- Custom auth: unnecessary security risk and maintenance.
- Email/password: more credential/reset/MFA responsibility and not needed initially.
- Hosted enterprise identity provider: useful later if Fitara adopts corporate SSO.
- Auth.js: viable, but Better Auth is selected for the planned database-session and Next.js integration.

## Consequences

- Separate OAuth applications/callbacks are required by environment.
- GitHub availability affects new login, not existing domain data.
- Email matching, invitation expiry, account linking, session duration, and deprovisioning require explicit policy.
- Better Auth tables and upgrades enter reviewed migrations.

## Open product decisions

- Match any verified GitHub email or only primary verified email.
- Session maximum/idle duration.
- Workspace bootstrap and invitation administration policy.

## Security implications
OAuth authenticates only; exact verified-email admission, membership checks, session revocation, and disabled cookie cache authorize access.

## Revisit when
Organization admission, enterprise SSO, or another provider is approved.
