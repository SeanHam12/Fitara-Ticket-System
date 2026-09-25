# ADR-0008: Make audit writes atomic and mutations concurrency-safe

- Status: Accepted baseline
- Date: 2026-09-24

## Context

Ticket identifiers must be unique under concurrency, activity must accurately describe committed changes, and optimistic UI must not overwrite newer work.

## Decision

- Allocate ticket numbers through an atomic per-project `TicketSequence` update inside ticket creation.
- Use unique `(project_id, sequence_number)`.
- Add integer versions and conditional updates to mutable resources.
- Require `If-Match` for lost-update-sensitive mutations.
- Store server-generated fixed-width hexadecimal numeric-gap ranks for ordered tickets/pins, with midpoint insertion and locked rebalance.
- Insert allowlisted, append-only `ActivityEvent` rows in the same transaction as meaningful changes.
- Deny activity update/delete to the application database role and add trigger defense.

## Alternatives considered

- `MAX(number)+1`: races.
- Global PostgreSQL sequence: safe but not project-local without a mapping layer.
- Last-write-wins: loses user work.
- Audit after commit: can diverge from domain state.

## Consequences

- Gaps in identifiers are acceptable and numbers are never reused.
- Clients must handle `409` rollback/reapply.
- Rank lists need bounded rebalance.
- Maintenance tooling needs an explicitly privileged path for exceptional audit operations.

## Security implications
Allowlisted append-only events avoid secret leakage; versions and transactions prevent lost/forged changes.

## Revisit when
Contention, retention, or event-sourcing requirements materially change.
