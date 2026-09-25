# ADR-0006: Use dnd-kit with equivalent non-drag controls

- Status: Accepted baseline
- Date: 2026-09-24

## Context

The board needs pointer and keyboard movement, optimistic feedback, accessible announcements, and a small client boundary.

## Decision

Use dnd-kit core/sortable utilities. Configure pointer and keyboard sensors, movement announcements, focus restoration, reduced motion, and a menu-based move/status/reorder path with equivalent capability.

The API accepts neighboring ticket IDs and expected version. The server computes canonical rank and status transactionally.

## Alternatives considered

- Native HTML drag-and-drop: inconsistent touch/keyboard accessibility.
- Custom pointer implementation: high accessibility and edge-case cost.
- Drag-only UI: violates accessibility and mobile requirements.

## Consequences

- Board code is a Client Component island.
- Ordering algorithms and concurrent moves require separate unit/integration tests.
- Drag can be disabled without losing ticket movement because menu controls remain.

## Security implications
Neighbor IDs are untrusted; the service reloads them in scope and commits status, rank, version, and activity atomically.

## Revisit when
Compatibility or accessibility acceptance fails.
