# ADR-0001: Use a modular Next.js monolith

- Status: Accepted baseline
- Date: 2026-09-24

## Context

Fitara Work needs frontend and backend behavior, transactional PostgreSQL writes, an internal API, and future integration access. The repository is already a Next.js 16 App Router application. No measured scaling or organizational requirement justifies a separate backend.

## Decision

Build one full-stack Next.js deployment. Use Server Components for initial authorized reads, narrow Client Components for interaction, versioned Route Handlers for HTTP clients, selective Server Actions for form adapters, and domain services/repositories for reusable business logic.

## Alternatives considered

- Separate API service: additional deployment, auth, tracing, and transaction complexity without current benefit.
- Client-only SPA: larger client surface and weaker use of App Router server capabilities.
- Microservices: premature ownership and consistency overhead.

## Consequences

- One repository and deployment keep delivery simple.
- Domain boundaries must be enforced by imports and tests rather than network boundaries.
- Long-running jobs and webhook work may later need a durable worker, but they still call the same domain services.

## Rollback

Extract a domain behind `/api/v1` only after measured runtime, scaling, security, or team-ownership evidence.

## Security implications
All adapters use scoped services and server-only repositories.

## Revisit when
Measured isolation, compliance, scale, or ownership requires extraction.
