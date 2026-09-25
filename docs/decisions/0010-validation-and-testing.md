# ADR-0010: Use Zod, Vitest, PostgreSQL integration tests, and Playwright

- Status: Accepted baseline
- Date: 2026-09-24

## Context

TypeScript cannot validate runtime input. Next.js async Server Components, client interactions, database invariants, and workspace authorization need different test layers.

## Decision

- Use strict Zod schemas at all untrusted boundaries and for environment validation.
- Use Vitest for pure code/services and React Testing Library for Client Components.
- Test migrations, repositories, transactions, concurrency, and authorization against isolated real PostgreSQL.
- Use Playwright against a production build for async Server Components and critical journeys.
- Run lint, typecheck, unit/component, integration, build, and critical E2E as CI gates.

## Alternatives considered

- TypeScript-only validation: no runtime protection.
- Jest: viable, but Vitest aligns with the current Next.js guidance and fast TypeScript workflow.
- Mocked database-only tests: cannot prove constraints, SQL, transaction, or isolation behavior.
- Cypress: viable; Playwright is selected for browser coverage and production-server workflow.

## Consequences

- CI needs PostgreSQL and browser infrastructure.
- Routine CI uses controlled auth fixtures, not live GitHub.
- Async Server Component confidence comes mainly from integration/E2E tests.

## Security implications
Schemas prevent mass assignment but do not sanitize/authorize; real PostgreSQL tests verify tenant and concurrency controls.

## Revisit when
Replacement tools demonstrate equal coverage and compatibility.
