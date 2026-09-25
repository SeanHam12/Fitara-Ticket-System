# ADR-0004: Share services across Route Handlers and Server Actions

- Status: Accepted baseline
- Date: 2026-09-24

## Context

Fitara Work needs fast web interaction, form progressive enhancement, and a stable path for future mobile/integration clients. Duplicating authorization and mutation rules across adapters would create security drift.

## Decision

- Put the stable API under `/api/v1`.
- Use Route Handlers for browser server-state operations and future clients.
- Use Server Actions only for selected form/navigation workflows.
- Let Server Components call services directly instead of issuing internal HTTP requests.
- Require all adapters to parse input, resolve actor context, and call the same domain service.
- Keep repositories transport-agnostic and workspace-scoped.

## Alternatives considered

- Server Actions only: rejected because interactive clients and future integrations need stable HTTP contracts.
- Business logic in Route Handlers: rejected because Server Components and Actions would duplicate policy.
- Server Components calling this application's API: rejected absent a concrete network boundary.

## Consequences

- HTTP contracts are reusable.
- Server-rendered reads avoid an extra network hop.
- Some adapter code is repeated deliberately; business policy is not.
- Server Actions receive the same security treatment as public POST endpoints.

## Rollback

An individual form can move between a Server Action and Route Handler without changing its service contract.

## Security implications
Both adapters are public attack surfaces and must authenticate, validate, authorize, and use the same service.

## Revisit when
A separately deployed API needs an independent lifecycle.
