# ADR-0011: Use node-postgres for Neon runtime transactions

- Status: Accepted for implementation planning

## Context
Core invariants require interactive multi-statement transactions in Vercel functions.

## Decision
Use `drizzle-orm/node-postgres` with `pg`, Neon's pooled runtime URL, and Node.js runtime. Use a direct administrative URL for controlled migrations and separate local/test URLs.

## Alternatives considered
Neon HTTP queries and Edge runtime are deferred because equivalent transaction semantics are not assumed.

## Consequences
Connection limits need monitoring; row locks, rollback, conditional writes, and bounded retries have one coherent implementation.

## Security implications
Runtime and migration credentials are separate; authorization-sensitive invariants commit atomically.

## Revisit when
Support changes, connection pressure is measured, or another mode proves equivalent semantics.
