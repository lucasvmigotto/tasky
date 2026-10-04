# ADR-006: Single dev-only compose; Java 25; PG18; mock OIDC

- Context: dual compose files, Java 21, PG16, Google-only implicit auth.
- Options: keep matrix vs consolidate dev and defer prod.
- Decision: one dev-only `docker-compose.yml` (api/app/db/redis/
  mock-oauth2; production uses a separate approach); Java 25 + Gradle 9;
  PostgreSQL 18 (parent-dir mount keeps the PG19 `pg_upgrade` path);
  generic OIDC (Google + Entra + mock tenants via mock-oauth2-server).
- Consequences: digests re-pinned per arch; mock issuers are env-configured
  (browser-facing vs in-cluster forms differ by design).
- Revisit when: PG19 GA matures (upgrade runbook) or real Entra IDs arrive.
