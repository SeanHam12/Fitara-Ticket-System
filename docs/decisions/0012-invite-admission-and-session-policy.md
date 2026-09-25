# ADR-0012: Use verified-email invitation admission and revocable sessions

- Status: Accepted for MVP planning; durations require owner confirmation

## Context
GitHub OAuth does not grant workspace access, and stale claims can outlive membership changes.

## Decision
Match an exact normalized verified GitHub email to a pending invitation; transactionally consume it, create/link identity and membership, and append activity before session creation. Bootstrap the first owner administratively. Use 12-hour absolute/30-minute rolling-idle database sessions, recent authentication for destructive administration, disabled cookie session cache, and revocation on suspension/removal.

## Alternatives considered
Organization admission or both methods are deferred; unverified-email and OAuth-only admission are rejected.

## Consequences
Users need a matching verified email and administrators need recovery procedures.

## Security implications
Only token digests persist; admission is single-use and important mutations reload current membership.

## Revisit when
Organization SSO/admission is approved or measured friction warrants another verified method.
