# ADR-0007: Enforce workspace isolation in services, repositories, and constraints

- Status: Accepted baseline
- Date: 2026-09-24

## Context

All projects, tickets, preferences, and history are workspace-owned. A valid object ID must never bypass tenant scope.

## Decision

Resolve an active membership into an immutable request context. Require `workspaceId` in service/repository signatures, include `workspace_id` in every query predicate, and use composite uniqueness/foreign keys where practical. Cross-workspace resources return `404`.

PostgreSQL row-level security is deferred until transaction-local context and Neon pooled connection behavior are proven.

## Alternatives considered

- URL/layout checks only: not a security boundary.
- RLS as the sole control: does not replace application authorization and adds unproven pooled-session complexity.
- Separate database per workspace: excessive operational overhead for the initial product.

## Consequences

- Some denormalized workspace columns and explicit query predicates are intentional.
- Authorization matrix integration tests are mandatory.
- RLS may later be added as defense in depth via a separate ADR.

## Security implications
Client workspace IDs are hints; membership, scoped loads, capabilities, invariants, and constraints enforce isolation.

## Revisit when
Restricted projects are approved or proven RLS safely adds defense.
