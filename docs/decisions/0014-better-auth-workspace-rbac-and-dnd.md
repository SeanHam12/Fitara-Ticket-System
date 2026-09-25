# ADR 0014: Better Auth, workspace RBAC, and server-authoritative Dnd Kit

Status: accepted

Supersedes ADR-0003 for the Phase 2 authentication mechanism. GitHub OAuth remains deferred.

Fitara Work uses Better Auth username credentials with database sessions and the existing UUID user table. Lowercase-trimmed usernames are unique under a database expression index. Email remains internal. Public signup, email sign-in, OAuth, MFA, and recovery are deferred.

Authentication-library identity is intentionally separate from workspace authorization. Each request reloads an active membership and services require named capabilities. Account creation uses Better Auth's server API behind those capabilities. Last-owner changes lock all active-owner membership rows transactionally.

Dnd Kit provides accessible input handling and presentation. The server accepts target status plus an optional before-ticket neighbor and expected version, locks affected tickets, then normalizes each affected small-board column to integers spaced by 1000. A future high-scale implementation can replace normalization with fractional or lexicographic ranks without changing the intent contract.
