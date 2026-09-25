# ADR-0005: Use server-first reads and TanStack Query for interaction

- Status: Accepted baseline
- Date: 2026-09-24

## Context

Boards, lists, drawers, comments, and pins need optimistic updates and coordinated invalidation. Initial pages benefit from Server Components. The repository does not enable Next.js Cache Components.

## Decision

- Load initial authorized data in Server Components through services.
- Hydrate TanStack Query only around interactive regions.
- Use URL search parameters for shareable filters.
- Use local React state for ephemeral UI.
- Default authenticated APIs to `private, no-store`.
- Use React `cache()` only for request-local deduplication.
- Do not use shared Next.js caching for workspace data in MVP.

## Alternatives considered

- Server Actions/useOptimistic only: insufficient coordination for board/list/detail copies.
- Global client store: duplicates server-state cache and adds invalidation burden.
- Shared Next cache: higher isolation/staleness risk before a proven need.

## Consequences

- Query keys and invalidation must always include workspace scope.
- Optimistic mutations require snapshots, rollback, server reconciliation, and version conflicts.
- Enabling Cache Components or remote caching later requires a new decision.

## Security implications
Private data is no-store and scoped query keys never replace database authorization.

## Revisit when
Measured load justifies proven tenant-safe caching or realtime delivery.
