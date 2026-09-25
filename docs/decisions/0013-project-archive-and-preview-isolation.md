# ADR-0013: Archive projects and isolate preview data

- Status: Accepted

## Context
Routine deletion conflicts with history; production-connected previews risk disclosure and mutation.

## Decision
MVP supports archive/restore only. Future purge is a distinct retention workflow. Each preview uses an isolated database/branch, preview secrets and synthetic seeds, cleanup, no production OAuth secrets, and no production migration.

## Alternatives considered
Owner hard-delete endpoints and production-connected previews are rejected.

## Consequences
Storage grows until retention is approved; preview provisioning requires automation.

## Security implications
History remains attributable and previews cannot reach production records or credentials.

## Revisit when
A written purge design exists or platform isolation materially changes.
