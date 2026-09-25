# ADR-0002: Use PostgreSQL and Drizzle ORM

- Status: Accepted baseline
- Date: 2026-09-24

## Context

The domain needs transactions, relational constraints, concurrent ticket sequencing, partial/compound indexes, full-text search, JSONB configuration, and immutable activity. The target deployment is Neon.

## Decision

Use PostgreSQL as the source of truth and Drizzle for schema, typed queries, and checked-in generated SQL migrations. Runtime uses a pooled PostgreSQL connection; controlled migration jobs use the direct connection when required.

## Alternatives considered

- Prisma: productive, but adds generator/runtime machinery and less direct SQL control for this constraint-heavy model.
- Query builder/raw SQL only: maximum control but more mapping/type maintenance.
- Document database: weaker fit for the relationship and transaction model.

## Consequences

- SQL remains inspectable and advanced PostgreSQL features are available.
- Generated migrations require human review.
- Raw SQL may be used inside repositories for atomic sequence/rank/index operations.
- Better Auth's generated schema must be reconciled with the Drizzle migration history.

## Rollback

An ORM change would retain PostgreSQL and migrate repositories incrementally; schema/migrations stay authoritative.

## Security implications
Composite constraints and explicit DTO selects enforce tenant integrity; migrations use a separate credential.

## Revisit when
PostgreSQL or Drizzle cannot meet measured safety, scale, or compliance needs.
