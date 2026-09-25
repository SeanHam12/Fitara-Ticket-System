# ADR-0009: Deploy on Vercel with Neon PostgreSQL

- Status: Accepted baseline
- Date: 2026-09-24

## Context

The selected deployment target should support Next.js 16, preview environments, managed PostgreSQL, secure secrets, and reversible releases.

## Decision

Deploy the Next.js Node runtime to Vercel and PostgreSQL to Neon. Use environment-isolated databases/branches, pooled runtime connections, direct controlled migration connections, and GitHub Actions for CI. Subject to final owner approval, GitHub Actions orchestrates production build, migration, immutable deploy, and smoke tests while Vercel handles previews.

## Alternatives considered

- Containerized Node service: portable but more operations than currently needed.
- Self-hosted PostgreSQL/application: greater control with substantially more maintenance.
- Static export: incompatible with auth, API, and database requirements.

## Consequences

- Runtime code cannot rely on process-local persistence or filesystem writes.
- Database connections, function duration, preview OAuth callbacks, and Neon plan limits need monitoring.
- Production migrations never run during application startup/build.
- Application rollback uses a prior deployment; database correction is forward-first.

## Open decisions

- Neon region/plan, PITR retention, RPO/RTO.
- Preview database branching.
- Whether GitHub Actions exclusively controls production deployment.

## Security implications
Environments isolate databases and secrets; previews never default to production or migrate it.

## Revisit when
Regional, compliance, connection, or workload constraints exceed the platforms.
